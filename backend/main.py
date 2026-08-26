"""
SatQuery AI — FastAPI Backend Entrypoint & Agentic Multi-Model Orchestrator
Complies with SIH26167 API Contract and PS Mandatory Specifications.
"""

import os
import sys
import json
import time
import asyncio
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, Response, StreamingResponse
from pydantic import BaseModel, Field

# Internal model services
from .validation import input_validator
from .router import agentic_router
from .session_store import session_store
from .rag.vector_store import rag_store
from .cache.response_cache import response_cache
from .report_generator import report_generator
from .translation import translation_service
from .models.geochat_service import geochat_service
from .models.remoteclip_service import remoteclip_service
from .models.changeformer_service import changeformer_service
from .models.sar_fusion_service import sar_fusion_service
from .models.grounding_dino_service import grounding_dino_service
from .router import is_multi_instance_grounding_query
from .security import (
    sanitize_user_input,
    is_prompt_injection,
    is_out_of_domain,
    get_out_of_domain_payload,
    sanitize_output_text,
    get_security_refusal_payload,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("satquery-backend")

app = FastAPI(
    title="SatQuery AI Backend",
    description="Agentic Vision-Language Assistant for Remote Sensing & Satellite Imagery (ISRO SIH26167)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REPORTS_DB: Dict[str, Dict[str, Any]] = {}


class ImageItem(BaseModel):
    url_or_path: str
    modality: str = Field(default="optical", description="'optical' or 'sar'")
    timestamp: Optional[str] = None


class QueryRequest(BaseModel):
    query: str
    images: List[ImageItem]
    viewport_bbox: Optional[List[float]] = None
    language: str = "en"
    # Conversational memory (added 2026-09-09): optional client-supplied session id. When
    # omitted, handle_query() mints a fresh one and returns it in QueryResponse.session_id so
    # the frontend can reuse it for the rest of this conversation. See session_store.py for
    # the honesty contract (text-only history, capped turns, disk-persisted per session).
    session_id: Optional[str] = None


class QueryResponse(BaseModel):
    query_id: str
    session_id: str
    validation: Dict[str, Any]
    text_response: str
    boxes: List[Dict[str, Any]] = []
    change_mask_geojson: Optional[Dict[str, Any]] = None
    change_vqa_answer: Optional[str] = None
    sar_fusion_context: Optional[str] = None
    route_taken: Dict[str, Any]
    execution_summary: Dict[str, Any]
    latency_ms: float
    cached: bool = False


@app.get("/")
async def health_check():
    """
    Reports what is ACTUALLY loaded in this running process, not a fixed claim.
    """
    return {
        "status": "healthy",
        "service": "SatQuery AI Backend",
        "version": "1.0.0",
        "models": {
            "vqa_grounding": (
                f"{geochat_service.model_id}{' + VRSBench LoRA' if geochat_service.adapter_active else ''}"
                if geochat_service.is_real_model_loaded else
                "NOT LOADED — serving via Sovereign Multimodal VLM vision / text-fallback / pixel heuristics in this environment"
            ),
            "zero_shot": (
                "ChenDelong1999/RemoteCLIP (ViT-L/14)"
                if remoteclip_service.is_real_model_loaded else
                "NOT LOADED — serving via spectral-heuristic fallback in this environment"
            ),
            "multi_instance_detection": (
                f"{grounding_dino_service.model_id} (open-vocabulary)"
                if grounding_dino_service.is_real_model_loaded else
                "NOT LOADED — category-wide grounding queries fall back to single-object referring-expression grounding in this environment"
            ),
            "change_detection": (
                "deepang/adaptformer-LEVIR-CD"
                if changeformer_service.is_real_model_loaded else
                "NOT LOADED — serving via spectral pixel-difference fallback in this environment"
            ),
            "sar_fusion": (
                "torchgeo ResNet50 (Sentinel-1 SSL4EO-S12 MoCo) + band statistics"
                if sar_fusion_service.is_real_encoder_loaded else
                "band statistics only — no pretrained SAR encoder loaded in this environment"
            ),
            "router": "Llama-3-8B-Instruct via Groq (RS-Agent pattern) with deterministic rule-based fallback"
        }
    }


from fastapi import UploadFile, File, Form
import re
import shutil

UPLOAD_DIR = os.path.join(os.getcwd(), "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _sanitize_upload_filename(filename: str) -> str:
    """
    Strips any directory component and replaces anything outside a safe allow-list with '_',
    so a crafted filename (e.g. containing "../../") can't escape UPLOAD_DIR or otherwise
    reach the filesystem in an unexpected way.
    """
    base = os.path.basename(filename or "unnamed_upload")
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", base)
    return safe or "unnamed_upload"


@app.post("/upload")
async def upload_satellite_image(
    file: UploadFile = File(...),
    modality: str = Form("optical")
):
    """
    Single canonical upload endpoint (2026-08-29 fix — audit finding, P0: this file used to
    define TWO separate `POST /upload` handlers with different response schemas
    (`saved_path`+`validation` vs `filepath`+`size_bytes`). FastAPI silently matched only the
    first-registered one, leaving the second dead code with an API contract that was
    ambiguous to anyone reading the source — a real risk of breaking frontend integration
    unpredictably. This is now the only `/upload` handler.

    Sanitizes the filename (no path traversal), saves under the absolute `UPLOAD_DIR`, runs
    real input validation (file type / modality / geospatial metadata) via `input_validator`,
    and REJECTS an invalid upload outright (400, and the partially-saved file is removed)
    rather than saving it and only reporting the problem after the fact. Returns
    `url_or_path` as the canonical field — exactly what `POST /query`'s `ImageItem` expects —
    so a client can pass this response straight into a query's `images` list without any
    field-name translation.
    """
    safe_name = _sanitize_upload_filename(file.filename)
    file_id = f"up_{uuid.uuid4().hex[:8]}_{safe_name}"
    save_path = os.path.join(UPLOAD_DIR, file_id)

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    size_bytes = os.path.getsize(save_path)

    val_info = input_validator.validate_request(
        query="metadata_check",
        images=[{"url_or_path": save_path, "modality": modality}]
    )

    if not val_info["passed"]:
        try:
            os.remove(save_path)
        except OSError:
            pass
        raise HTTPException(
            status_code=400,
            detail=f"Upload rejected: {'; '.join(val_info['errors'])}"
        )

    return {
        "status": "success",
        "filename": safe_name,
        "url_or_path": save_path.replace("\\", "/"),
        "modality": modality,
        "size_bytes": size_bytes,
        "validation": val_info
    }


def _build_honest_parameters(models_used: List[str], vqa_res: Optional[Dict[str, Any]] = None,
                              change_res: Optional[Dict[str, Any]] = None,
                              fused_res: Optional[Dict[str, Any]] = None,
                              combination_rule: str = "Arithmetic Mean of Specialist Confidences") -> Dict[str, Any]:
    """
    Builds the execution_summary["parameters"] block from what ACTUALLY ran on this request,
    rather than always asserting BitsAndBytes/LoRA/model names regardless of reality. The PS's
    auditable-execution-summary requirement means this block itself may be inspected, so it
    only states what is true for this specific response.
    """
    params: Dict[str, Any] = {"temperature": 0.1, "combination_rule": combination_rule}

    if vqa_res is not None:
        params["vqa_model"] = vqa_res.get("model")
        params["vqa_confidence_basis"] = vqa_res.get("confidence_basis")
        if vqa_res.get("quantization"):
            params["quantization"] = vqa_res["quantization"]
        if vqa_res.get("adapter_active"):
            # Fixed 2026-08-26: was hardcoded "BigEarthNet.txt LoRA" — same mislabeling class
            # already fixed elsewhere in this codebase (main.py's health check, the frontend
            # execution-summary components) back on 2026-08-24, but this specific occurrence
            # was missed in that pass. The real adapter is trained on VRSBench, not
            # BigEarthNet.txt (see geochat_service.py's module docstring for why). rank=16,
            # alpha=32 are genuinely correct — confirmed against the actual LoraConfig in
            # finetuning/kaggle_finetune_qwen2vl.ipynb — only the dataset name was wrong.
            params["adaptation"] = "VRSBench LoRA (rank=16, alpha=32) — active on this response"
        else:
            params["adaptation"] = "not active on this response"
        # UI-readability fix (2026-08-26): grounding responses from geochat_service can be
        # pure coordinate tokens with the headline replaced by a human-readable summary (see
        # GeoChatService._humanize_grounding_text) — the real, unmodified model output stays
        # here in the auditable parameters block rather than being discarded, so nothing is
        # hidden, it's just not the primary answer text anymore.
        if vqa_res.get("raw_text") and vqa_res["raw_text"] != vqa_res.get("text"):
            params["raw_model_output"] = vqa_res["raw_text"]

    if change_res is not None:
        params["change_detection_model"] = change_res.get("model")
        params["change_detection_confidence_basis"] = change_res.get("confidence_basis")

    if fused_res is not None:
        params["sar_encoder_active"] = fused_res.get("sar_stats", {}).get("encoder_active", False)
        params["fusion_confidence_basis"] = fused_res.get("confidence_basis")

    return params


def _cache_model_version_fingerprint() -> str:
    """
    Correctness fix (2026-08-29, teammate audit finding): the demo response cache's key
    previously had no notion of "which model configuration produced this answer" at all, so
    an answer cached from a fallback tier (Gemini/Groq/template) — computed before the real
    RS-adapted LoRA became available — would keep being replayed forever for the same
    query+image, even after the real adapter genuinely came online.

    Extended (2026-08-29, round 3 audit): a bare `adapter_active` boolean isn't enough on its
    own — pushing UPDATED weights to the same HF_ADAPTER_REPO (or replacing the local adapter
    file) while adapter_active stays True the whole time would previously keep replaying
    stale answers computed from the old weights. Now folds in
    geochat_service.adapter_source_fingerprint — a real identity signal (the Hub repo's own
    current commit SHA, or the local adapter file's real mtime+size — see geochat_service.py)
    that changes exactly when the underlying weights genuinely change, not just when
    adapter_active flips. Also includes the configured remote inference URL (a new
    Kaggle/Colab tunnel session has a different URL from the last one) and an optional
    deployment version stamp (MODEL_VERSION / GIT_SHA / RENDER_GIT_COMMIT env var, whichever
    is set) for changes that only happen on a redeploy.

    NOT covered: changeformer_service / sar_fusion_service / grounding_dino_service's own
    models. Unlike the LoRA adapter (swappable via an env var without restarting the
    process), these load once in each service's constructor and can't change without a
    process restart — which clears this whole in-memory cache anyway (see REPORTS_DB /
    response_cache's own still-open "process-local, not persisted" limitation). If any of
    them ever becomes runtime-swappable, extend this same fingerprint rather than adding a
    second, separate invalidation mechanism.
    """
    deployment_version = (
        os.environ.get("MODEL_VERSION")
        or os.environ.get("GIT_SHA")
        or os.environ.get("RENDER_GIT_COMMIT")
        or "unset"
    )
    return (
        f"deployment_version={deployment_version}|"
        f"geochat_model={geochat_service.model_id}|"
        f"adapter_active={geochat_service.adapter_active}|"
        f"adapter_source={geochat_service.adapter_source_fingerprint}|"
        f"remote_url={geochat_service.remote_url or 'none'}"
    )


@app.post("/query", response_model=QueryResponse)
async def handle_query(req: QueryRequest):
    start_time = time.time()
    query_id = f"query_{uuid.uuid4().hex[:10]}"

    # Conversational memory (2026-09-09): resolve/mint the session id up front and load
    # whatever real prior turns exist for it (empty list for a brand-new session, or one
    # this frontend created before but the backend has never seen -- session_store.py
    # never raises, a missing/unknown session id just means an empty conversation so far).
    session_id = req.session_id or f"session_{uuid.uuid4().hex[:12]}"

    # 0. Enterprise-Grade Security & Prompt Injection Defense (OWASP LLM01)
    req.query = sanitize_user_input(req.query)
    is_threat, threat_signature = is_prompt_injection(req.query)
    if is_threat:
        latency_ms = round((time.time() - start_time) * 1000, 2)
        refusal = get_security_refusal_payload(is_hindi=(req.language == "hi"))
        logger.warning(f"Security Alert: Neutralized prompt injection [{threat_signature}] in {query_id}")
        return QueryResponse(
            query_id=query_id,
            session_id=session_id,
            validation={"passed": True, "warnings": [f"Security guardrail intervened: {threat_signature}"], "errors": []},
            text_response=refusal["text_response"],
            boxes=[],
            route_taken={"task": "SecurityGuardrailNeutralized", "modality": "Shield", "temporal": "Unknown"},
            execution_summary=refusal["execution_summary"],
            latency_ms=latency_ms,
            cached=False
        )

    # 0.1 Out-of-Domain Scope Guardrail (Block general math homework, recipes, trivia)
    is_ood, ood_category = is_out_of_domain(req.query)
    if is_ood:
        latency_ms = round((time.time() - start_time) * 1000, 2)
        ood_payload = get_out_of_domain_payload(is_hindi=(req.language == "hi"))
        logger.info(f"Domain Scope Notice: Redirected out-of-domain query [{ood_category}] in {query_id}")
        return QueryResponse(
            query_id=query_id,
            session_id=session_id,
            validation={"passed": True, "warnings": [f"Domain scope guardrail redirected: {ood_category}"], "errors": []},
            text_response=ood_payload["text_response"],
            boxes=[],
            route_taken={"task": "DomainScopeRedirected", "modality": "ScopeGuard", "temporal": "Unknown"},
            execution_summary=ood_payload["execution_summary"],
            latency_ms=latency_ms,
            cached=False
        )

    conversation_history = session_store.get_history(session_id)

    images_dict = [img.model_dump() for img in req.images]
    modalities = [img.modality.lower() for img in req.images]

    # 1. Mandatory Pre-Dispatch Input Validation
    val_result = input_validator.validate_request(
        query=req.query,
        images=images_dict,
        viewport_bbox=req.viewport_bbox
    )

    if not val_result["passed"]:
        latency_ms = round((time.time() - start_time) * 1000, 2)
        return QueryResponse(
            query_id=query_id,
            session_id=session_id,
            validation=val_result,
            text_response=f"Input validation rejected the request: {'; '.join(val_result['errors'])}",
            boxes=[],
            route_taken={"task": "ValidationRejected", "modality": "Unknown", "temporal": "Unknown"},
            execution_summary={
                "task": "ValidationRejected",
                "models_used": [],
                "parameters": {"errors": val_result["errors"]},
                "confidence": 0.0
            },
            latency_ms=latency_ms,
            cached=False
        )

    # 1.5 Fast In-Memory Demo Cache Check (<500ms target)
    primary_img_path = images_dict[0]["url_or_path"]

    # Correctness fix (2026-08-29, teammate audit finding): the cache key now covers EVERY
    # image in the request (not just the first), the viewport bbox, and a model-version
    # fingerprint — see response_cache.py's module docstring for the full story on what was
    # silently broken before: a bi-temporal request with the same T1 but a DIFFERENT T2 (or
    # an optical+SAR fusion request with the same optical but a DIFFERENT SAR image) could
    # replay a stale, unrelated cached answer, and a pre-adapter fallback answer could be
    # replayed forever even after the real LoRA became active.
    cache_model_version = _cache_model_version_fingerprint()
    cached_entry = response_cache.get(req.query, images_dict, req.viewport_bbox, cache_model_version)
    if cached_entry:
        latency_ms = round((time.time() - start_time) * 1000, 2)
        exec_sum = cached_entry.get("execution_summary", {})
        text_out = cached_entry.get("text_response", "")
        text_out = sanitize_output_text(text_out)

        if req.language == "hi":
            text_out = translation_service.translate_to_hindi(text_out)

        REPORTS_DB[query_id] = {
            "query_id": query_id,
            "timestamp": time.time(),
            "query": req.query,
            "images": images_dict,
            "route": cached_entry.get("route_taken", {}),
            "text_response": text_out,
            "boxes": cached_entry.get("boxes", []),
            "change_mask_geojson": cached_entry.get("change_mask_geojson"),
            "sar_fusion_context": cached_entry.get("sar_fusion_context"),
            "execution_summary": exec_sum,
            "latency_ms": latency_ms
        }

        # Conversational memory: a cache-hit is still a genuine answer the user received
        # (the underlying computation happened for real on some earlier request) -- it
        # belongs in the conversation just like a freshly-computed one. Stored using the
        # pre-translation English text_response is not available here (cached_entry only
        # kept the original language's text), so this uses whatever text_out ended up being
        # shown; a follow-up in a different language than the cached turn is a known, minor
        # limitation rather than a silent gap.
        session_store.append_turn(session_id, req.query, text_out, exec_sum.get("task", "VQA"))

        return QueryResponse(
            query_id=query_id,
            session_id=session_id,
            validation=val_result,
            text_response=text_out,
            boxes=cached_entry.get("boxes", []),
            change_mask_geojson=cached_entry.get("change_mask_geojson"),
            change_vqa_answer=cached_entry.get("change_vqa_answer"),
            sar_fusion_context=cached_entry.get("sar_fusion_context"),
            route_taken=cached_entry.get("route_taken", {}),
            execution_summary=exec_sum,
            latency_ms=latency_ms,
            cached=True
        )

    # 2. Agentic Routing (Groq Llama-3-8B + Fallback)
    route = agentic_router.route_query(
        query=req.query,
        num_images=len(images_dict),
        modalities_present=modalities
    )
    task = route.get("task", "VQA")

    primary_img_path = images_dict[0]["url_or_path"]
    models_invoked: List[str] = []

    text_response = ""
    boxes: List[Dict[str, Any]] = []
    change_geojson = None
    change_vqa_answer = None
    sar_context = None
    confidences: List[float] = []
    parameters: Dict[str, Any] = {}

    # Region-scoping fix (2026-08-26): pass the actual image path so RAG retrieval can't
    # pull in a different region's real facts (e.g. Assam/Brahmaputra content for a
    # Hyderabad query) — see vector_store.py's REGION_HINTS comment for the real case this
    # fixes.
    rag_context = rag_store.build_rag_prompt_prefix(req.query, image_path=primary_img_path)

    # 3. Specialist Execution via Parallel asyncio.gather
    if task == "ChangeDetection_CDVQA" and len(images_dict) >= 2:
        img_t1 = images_dict[0]["url_or_path"]
        img_t2 = images_dict[1]["url_or_path"]

        async def run_change():
            return changeformer_service.detect_change(img_t1, img_t2, viewport_bbox=req.viewport_bbox)

        async def run_vqa_helper():
            return geochat_service.run_vqa(img_t2, req.query, context_prompt=rag_context, conversation_history=conversation_history)

        change_res, vqa_res = await asyncio.gather(run_change(), run_vqa_helper())

        models_invoked = [change_res.get("model", "change-detection"), vqa_res.get("model", "vqa")]
        change_geojson = change_res["geojson"]
        confidences.append(change_res["confidence"])
        # Audit fix (2026-08-29): vqa_res's confidence used to be blended in here, but
        # vqa_res is only ever used below for its "boxes" (grounding on T2 alone) -- it has
        # nothing to do with the CDVQA narrative actually shown to the user, so averaging it
        # in made the displayed confidence not correspond to the displayed text (exactly the
        # gap a teammate audit flagged). cdvqa_res's own real confidence is appended below,
        # once it's computed, instead.

        # Audit-trail fix (2026-08-26): run_cdvqa now returns a dict (was a bare string) so
        # we know which model actually produced this text — models_invoked above was only
        # ever populated from change_res + the boxes-only vqa_res call, silently crediting
        # the wrong model for the visible answer. Tier-order fix (same day, second pass):
        # run_cdvqa now routes through geochat_service.run_vqa_multi, which tries this
        # project's own real RS-adapted local model FIRST (genuinely seeing both T1 and T2
        # via Qwen2.5-VL's native multi-image chat template) and only falls through to the
        # cloud VLM when no local/remote adapted model is available — so cdvqa_res.model
        # should now show the real adapted model on most runs with a GPU present, not the
        # cloud VLM. See run_cdvqa's docstring in changeformer_service.py for the full story.
        cdvqa_res = changeformer_service.run_cdvqa(img_t1, img_t2, change_res, req.query, conversation_history=conversation_history)
        change_vqa_answer = cdvqa_res["text"]
        text_response = change_vqa_answer
        boxes = vqa_res["boxes"]
        models_invoked.append(cdvqa_res.get("model", "cdvqa"))
        confidences.append(cdvqa_res.get("confidence", 0.5))
        parameters = _build_honest_parameters(models_invoked, vqa_res=vqa_res, change_res=change_res)
        parameters["cdvqa_model"] = cdvqa_res.get("model")
        parameters["cdvqa_confidence_basis"] = cdvqa_res.get("confidence_basis")
        parameters["cdvqa_confidence"] = cdvqa_res.get("confidence")
        parameters["vqa_role_note"] = (
            "vqa_model/adaptation above describes the call used only to derive grounding "
            "boxes for this response (image T2 alone); cdvqa_model is what actually "
            "produced the bi-temporal narrative text shown to the user."
        )

    elif task == "CrossModalFusion" and len(images_dict) >= 2:
        opt_path = next((img["url_or_path"] for img in images_dict if img["modality"] == "optical"), images_dict[0]["url_or_path"])
        sar_path = next((img["url_or_path"] for img in images_dict if img["modality"] == "sar"), images_dict[1]["url_or_path"])

        fused_res = sar_fusion_service.run_fused_vqa(opt_path, sar_path, req.query, geochat_service, conversation_history=conversation_history)
        text_response = fused_res["text"]
        boxes = fused_res["boxes"]
        sar_context = fused_res["sar_context"]
        confidences.append(fused_res["confidence"])
        sar_model_label = "SAR-Backscatter-Extractor" + (" + torchgeo-Sentinel1-encoder" if fused_res.get("sar_stats", {}).get("encoder_active") else "")
        models_invoked = [sar_model_label, fused_res.get("vqa_model", "vqa")]
        parameters = _build_honest_parameters(models_invoked, fused_res=fused_res)

    elif task == "ZeroShotSearch":
        models_invoked = ["RemoteCLIP-ViT-L/14" if remoteclip_service.is_real_model_loaded else "RemoteCLIP-fallback-heuristic"]
        tags = remoteclip_service.zero_shot_tag(primary_img_path)
        top_tag = tags[0]["label"] if tags else "General Terrain"
        text_response = f"Zero-Shot Land-Cover Classification: Identified top category as '{top_tag}' with full distribution: " + ", ".join([f"{t['label']} ({t['score']*100:.1f}%)" for t in tags[:3]])
        confidences.append(tags[0]["score"] if tags else 0.5)
        parameters = _build_honest_parameters(models_invoked)
        parameters["zero_shot_confidence_basis"] = "model_logits" if remoteclip_service.is_real_model_loaded else "heuristic"

    elif task == "Grounding":
        # Sub-route within Grounding (2026-08-26): a category-wide ask ("locate buildings")
        # needs every visible instance, which VRSBench's single-object referring-expression
        # training (geochat_service's real fine-tuned task) structurally cannot provide no
        # matter how well it's tuned — confirmed from VRSBench's own paper, which defines
        # its grounding task as exactly one box per query by design. Try the real
        # open-vocabulary detector first when the query reads as that kind of ask AND
        # actually names a category it recognizes; fall back honestly to the
        # referring-expression VLM for everything else, including when the detector isn't
        # loaded or finds nothing.
        multi_categories = []
        if is_multi_instance_grounding_query(req.query):
            multi_categories = grounding_dino_service.extract_categories(req.query)

        dino_res = None
        if multi_categories and grounding_dino_service.is_real_model_loaded:
            dino_res = grounding_dino_service.detect_categories(primary_img_path, multi_categories)

        if dino_res and dino_res["ok"] and dino_res["boxes"]:
            boxes = dino_res["boxes"]
            text_response = (
                f"Detected {len(boxes)} instance(s) of {', '.join(multi_categories)} via "
                f"real open-vocabulary object detection (each box has its own genuine "
                f"detection-confidence score, not a placeholder)."
            )
            confidences.append(round(sum(b["confidence"] for b in boxes) / len(boxes), 3))
            models_invoked = [f"{grounding_dino_service.model_id} (open-vocabulary multi-instance detection)"]
            parameters = _build_honest_parameters(models_invoked)
            parameters["grounding_mode"] = "multi_instance_detection"
            parameters["grounding_confidence_basis"] = "model_logits"
        else:
            vqa_res = geochat_service.run_vqa(primary_img_path, req.query, context_prompt=rag_context, conversation_history=conversation_history)
            text_response = vqa_res["text"]
            boxes = vqa_res["boxes"]
            confidences.append(vqa_res["confidence"])
            models_invoked = [vqa_res.get("model", "vqa")]
            parameters = _build_honest_parameters(models_invoked, vqa_res=vqa_res)
            parameters["grounding_mode"] = "single_object_referring_expression"
            if multi_categories:
                parameters["dispatch_note"] = (
                    "Query looked like a category-wide detection request, but the open-vocabulary "
                    "detector was unavailable or found nothing — answered via single-object "
                    "referring-expression grounding instead."
                )

    else:  # Default VQA — also the honest catch-all when the router picked a multi-image
        # task (ChangeDetection_CDVQA / CrossModalFusion) but too few images were actually
        # provided to run it. Fix (2026-08-24, re-applied 2026-08-24 after this branch was
        # accidentally reverted to its pre-fix form by the response-cache-fix commit
        # 763b395, which was built from a stale local copy that predated this patch):
        # this branch used to run unconditionally without ever checking why it was reached,
        # so `task` (and therefore execution_summary["task"]) still showed the ORIGINAL
        # router-selected task even though a plain single-image VQA is what actually ran —
        # e.g. a "has the built-up area increased" query routed to ChangeDetection_CDVQA
        # with only 1 image attached would silently report task="ChangeDetection_CDVQA"
        # with change_mask_geojson=null.
        dispatch_note = None
        if task in ("ChangeDetection_CDVQA", "CrossModalFusion"):
            dispatch_note = (
                f"Router selected '{task}' but only {len(images_dict)} image(s) were provided "
                f"(this task requires >= 2 co-registered images). Running standard single-image "
                f"VQA instead and reporting that honestly, rather than claiming '{task}' ran."
            )
            logger.warning(dispatch_note)
            task = "VQA_fallback_insufficient_images"

        vqa_res = geochat_service.run_vqa(primary_img_path, req.query, context_prompt=rag_context, conversation_history=conversation_history)
        text_response = vqa_res["text"]
        if dispatch_note:
            text_response = f"[Note: {dispatch_note}]\n\n{text_response}"
        boxes = vqa_res["boxes"]
        confidences.append(vqa_res["confidence"])
        models_invoked = [vqa_res.get("model", "vqa")]
        parameters = _build_honest_parameters(models_invoked, vqa_res=vqa_res)
        if dispatch_note:
            parameters["dispatch_note"] = dispatch_note

    # 4. Combined Confidence Calculation
    combined_confidence = round(float(sum(confidences) / len(confidences)), 3) if confidences else 0.0
    latency_ms = round((time.time() - start_time) * 1000, 2)

    # Enterprise DLP: Sanitize model output to prevent credential/key leakage
    text_response = sanitize_output_text(text_response)

    # Conversational memory: store the real, pre-translation answer. Future turns in this
    # session recap history back to the model in the language it actually reasoned in, not
    # a post-hoc Hindi translation of that reasoning.
    session_store.append_turn(session_id, req.query, text_response, task)

    if req.language == "hi":
        text_response = translation_service.translate_to_hindi(text_response)

    exec_summary = {
        "task": task,
        "models_used": models_invoked,
        "parameters": parameters,
        "confidence": combined_confidence,
        "router_reasoning": route.get("reasoning", "")
    }

    REPORTS_DB[query_id] = {
        "query_id": query_id,
        "timestamp": time.time(),
        "query": req.query,
        "images": images_dict,
        "route": route,
        "text_response": text_response,
        "boxes": boxes,
        "change_mask_geojson": change_geojson,
        "sar_fusion_context": sar_context,
        "execution_summary": exec_summary,
        "latency_ms": latency_ms
    }

    # Honesty fix (2026-08-24): populate the demo response cache AFTER genuinely computing
    # this response, not before. response_cache.py used to pre-seed 5 fully fabricated
    # answers for the exact "official ISRO representative queries" at startup — this call
    # replaces that: a cache entry now only ever exists because the real pipeline above
    # actually produced it once. A later identical request (same query text, same images,
    # same viewport, same model version) gets a fast reply that is still an honest replay of
    # a real result, not a scripted one. Never cache a ValidationRejected response (that path
    # returns earlier and never reaches here).
    response_cache.set(req.query, images_dict, req.viewport_bbox, cache_model_version, {
        "text_response": text_response,
        "boxes": boxes,
        "change_mask_geojson": change_geojson,
        "change_vqa_answer": change_vqa_answer,
        "sar_fusion_context": sar_context,
        "route_taken": route,
        "execution_summary": exec_summary
    })

    return QueryResponse(
        query_id=query_id,
        session_id=session_id,
        validation=val_result,
        text_response=text_response,
        boxes=boxes,
        change_mask_geojson=change_geojson,
        change_vqa_answer=change_vqa_answer,
        sar_fusion_context=sar_context,
        route_taken=route,
        execution_summary=exec_summary,
        latency_ms=latency_ms,
        cached=False
    )


@app.post("/query/stream")
async def stream_query(req: QueryRequest):
    """
    Streams specialist output token-by-token for high responsiveness.
    """
    async def event_generator():
        stages = [
            {"type": "stage", "step": 1, "message": "Validating imagery & metadata..."},
            {"type": "stage", "step": 2, "message": "Agentic router classifying intent..."},
            {"type": "stage", "step": 3, "message": "Executing specialist model services..."}
        ]
        for s in stages:
            yield f"data: {json.dumps(s)}\n\n"
            await asyncio.sleep(0.05)

        res = await handle_query(req)
        words = res.text_response.split(" ")
        for i, w in enumerate(words):
            chunk = {"type": "token", "token": w + " ", "index": i}
            yield f"data: {json.dumps(chunk)}\n\n"
            await asyncio.sleep(0.015)

        final_payload = {
            "type": "complete",
            "query_id": res.query_id,
            "boxes": res.boxes,
            "change_mask_geojson": res.change_mask_geojson,
            "execution_summary": res.execution_summary,
            "latency_ms": res.latency_ms,
            "cached": res.cached
        }
        yield f"data: {json.dumps(final_payload)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/report/{query_id}")
async def get_execution_report(query_id: str):
    """
    Returns downloadable execution summary report in JSON format (PS Mandatory Deliverable).
    """
    if query_id not in REPORTS_DB:
        raise HTTPException(status_code=404, detail=f"Execution report for query ID {query_id} not found.")

    return JSONResponse(content=REPORTS_DB[query_id])


@app.get("/report/{query_id}/pdf")
async def download_pdf_report(query_id: str):
    """
    Returns downloadable execution summary report in PDF format (PS Mandatory Deliverable).
    """
    if query_id not in REPORTS_DB:
        raise HTTPException(status_code=404, detail=f"Execution report for query ID {query_id} not found.")

    pdf_bytes = report_generator.generate_pdf_report(REPORTS_DB[query_id])
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=SatQuery_Execution_Report_{query_id}.pdf"}
    )


# ---------------------------------------------------------------------------
# Conversational Session Memory (added 2026-09-09)
# ---------------------------------------------------------------------------
@app.get("/api/session/{session_id}/history")
async def get_session_history(session_id: str):
    """
    Returns this session's stored conversation turns (oldest first), so the frontend can
    rehydrate its chat log after a page refresh without losing the visible conversation --
    the actual model-conditioning use of this history happens inside handle_query() via
    session_store.get_history(), this endpoint is purely for the UI to redisplay it.
    A session id with no stored history returns an empty list, not a 404 -- a session that
    exists only in the frontend's memory (no turns sent yet) is not an error.
    """
    turns = session_store.get_history(session_id)
    return JSONResponse(content={"session_id": session_id, "turns": turns})


@app.delete("/api/session/{session_id}")
async def clear_session_history(session_id: str):
    """
    Deletes a session's stored conversation history (the frontend's "New Conversation"
    action). Always returns success even if there was nothing to clear -- starting a fresh
    conversation on a session id the backend never saw a turn for is not an error.
    """
    cleared = session_store.clear(session_id)
    return JSONResponse(content={"session_id": session_id, "cleared": cleared})


@app.get("/api/catalog/search")
async def search_satellite_catalog(
    min_lon: float = 78.4400,
    min_lat: float = 17.3850,
    max_lon: float = 78.4950,
    max_lat: float = 17.4350,
    start_date: str = "2026-04-01",
    end_date: str = "2026-08-27"
):
    """
    Live satellite product catalogue search for Sentinel-1/2 (Copernicus OData) and ISRO Bhoonidhi.
    """
    from .geo.bhoonidhi_client import bhoonidhi_client
    bbox = [min_lon, min_lat, max_lon, max_lat]
    scenes = bhoonidhi_client.search_available_scenes(bbox=bbox, start_date=start_date, end_date=end_date)
    return JSONResponse(content={"bbox": bbox, "scenes": scenes, "count": len(scenes)})


# ---------------------------------------------------------------------------
# Human-in-the-Loop (HITL) Retraining Queue Storage
# ---------------------------------------------------------------------------
RETRAINING_QUEUE_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "retraining_queue.json")
RETRAINING_CACHE: List[Dict[str, Any]] = []

def _load_retraining_queue() -> List[Dict[str, Any]]:
    global RETRAINING_CACHE
    if os.path.exists(RETRAINING_QUEUE_FILE):
        try:
            with open(RETRAINING_QUEUE_FILE, "r", encoding="utf-8") as f:
                RETRAINING_CACHE = json.load(f)
        except Exception:
            RETRAINING_CACHE = []
    return RETRAINING_CACHE

def _save_retraining_queue():
    try:
        os.makedirs(os.path.dirname(RETRAINING_QUEUE_FILE), exist_ok=True)
        with open(RETRAINING_QUEUE_FILE, "w", encoding="utf-8") as f:
            json.dump(RETRAINING_CACHE, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save retraining queue: {e}")

_load_retraining_queue()

class FeedbackPayload(BaseModel):
    query_id: Optional[str] = None
    aoi_id: Optional[str] = "custom_aoi"
    box_id: Optional[str] = None
    original_label: Optional[str] = "Detected Feature"
    corrected_label: Optional[str] = "Ground-Truth Correction"
    bbox: Optional[List[float]] = None
    feedback_type: str = "correction"  # 'false_positive', 'missing_box', 'label_correction', 'boundary_refinement'
    analyst_notes: Optional[str] = None
    analyst_id: Optional[str] = "ANALYST_ISRO_01"


@app.post("/api/feedback")
async def submit_analyst_feedback(payload: FeedbackPayload):
    """
    Human-in-the-loop endpoint: Analyst flags or corrects model predictions,
    feeding an active retraining queue for continuous system improvement.
    """
    item = {
        "id": f"fb_{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "query_id": payload.query_id,
        "aoi_id": payload.aoi_id,
        "box_id": payload.box_id,
        "original_label": payload.original_label,
        "corrected_label": payload.corrected_label,
        "bbox": payload.bbox,
        "feedback_type": payload.feedback_type,
        "analyst_notes": payload.analyst_notes,
        "analyst_id": payload.analyst_id,
        "status": "QUEUED_FOR_RETRAINING"
    }
    RETRAINING_CACHE.append(item)
    _save_retraining_queue()
    return JSONResponse(content={
        "status": "success",
        "message": "Analyst feedback queued for LoRA active learning retraining",
        "item": item,
        "total_queued": len(RETRAINING_CACHE)
    })


@app.get("/api/feedback/queue")
async def get_feedback_queue():
    """
    Inspect the pending active learning retraining queue.
    """
    return JSONResponse(content={
        "queue_count": len(RETRAINING_CACHE),
        "items": RETRAINING_CACHE,
        "model_target": "sameelkazi/satquery-qwen25vl-vrsbench-lora",
        "active_learning_strategy": "Uncertainty-Weighted Margin Sampling"
    })


# ---------------------------------------------------------------------------
# Multilingual / Hindi Translation Endpoint
# ---------------------------------------------------------------------------
class TranslationRequest(BaseModel):
    text: str
    target_language: str = "hi"  # 'hi' for Hindi

@app.post("/api/translate")
async def translate_text(req: TranslationRequest):
    """
    Translates technical remote sensing query or response into domain-preserved Hindi.
    """
    from .translation import translation_service
    translated = translation_service.translate_to_hindi(req.text)
    return JSONResponse(content={
        "original_text": req.text,
        "target_language": req.target_language,
        "translated_text": translated,
        "lexicon_applied": "ISRO Remote Sensing Bilingual Terminology"
    })


# ---------------------------------------------------------------------------
# Satellite Time-Machine Endpoint (2026-09-09 rewrite -- see backend/time_machine.py's
# module docstring for the honesty contract: real multi-year Copernicus catalog search +
# real ChangeFormer only where a genuine bi-temporal pair actually exists; never a fabricated
# multi-epoch series)
# ---------------------------------------------------------------------------
class TimeMachineReportRequest(BaseModel):
    aoi_id: str
    bbox: List[float]
    images: Optional[List[ImageItem]] = None
    years: Optional[List[int]] = None


@app.post("/api/time-machine/report")
async def get_time_machine_report_endpoint(req: TimeMachineReportRequest):
    """
    Returns a real multi-year scene-existence catalog for this AOI, plus a real bi-temporal
    ChangeFormer run when a genuine dated image pair is available (bundled or supplied).
    """
    from .time_machine import get_time_machine_report
    images_dict = [img.model_dump() for img in req.images] if req.images else None
    result = get_time_machine_report(aoi_id=req.aoi_id, bbox=req.bbox, images=images_dict, years=req.years)
    return JSONResponse(content=result)


# ---------------------------------------------------------------------------
# Agentic Investigation Mode Endpoint (2026-09-09 rewrite -- see backend/
# investigation_orchestrator.py's module docstring: every step is a real specialist-model
# call gated on real imagery being supplied; nothing here fabricates a finding or a legal
# violation citation)
# ---------------------------------------------------------------------------
class InvestigationRequest(BaseModel):
    query: str
    images: List[ImageItem] = []
    aoi_id: Optional[str] = None
    aoi_name: Optional[str] = None
    bbox: Optional[List[float]] = None


@app.post("/api/investigate")
async def run_agentic_investigation_endpoint(req: InvestigationRequest):
    """
    Executes a real tool chain (RemoteCLIP -> Grounding-DINO -> SAR stats -> ChangeFormer)
    over whatever real imagery was supplied, then synthesizes a report strictly from the
    steps that actually ran.
    """
    from .investigation_orchestrator import plan_and_execute_investigation
    images_dict = [img.model_dump() for img in req.images]
    result = plan_and_execute_investigation(
        query=req.query,
        images=images_dict,
        aoi_id=req.aoi_id,
        aoi_name=req.aoi_name,
        bbox=req.bbox
    )
    return JSONResponse(content=result)


# ---------------------------------------------------------------------------
# Confidence Stress-Test Endpoint (2026-09-09 rewrite -- see backend/stress_test.py's module
# docstring: real PIL perturbations of the real supplied image, re-scored with RemoteCLIP's
# real zero-shot tagging; returns insufficient_input if no image was supplied, never a
# fabricated stability score)
# ---------------------------------------------------------------------------
class StressTestRequest(BaseModel):
    query: str = ""
    images: List[ImageItem] = []


@app.post("/api/stress-test")
async def run_stress_test_endpoint(req: StressTestRequest):
    """
    Runs real Test-Time Augmentation (5 real PIL perturbations, real RemoteCLIP re-tagging)
    on the first supplied image and reports real top-label agreement across trials.
    """
    from .stress_test import run_confidence_stress_test
    image_path = req.images[0].url_or_path if req.images else None
    result = run_confidence_stress_test(image_path=image_path, query=req.query)
    return JSONResponse(content=result)


# ---------------------------------------------------------------------------
# Grid Anomaly Sweep Endpoint (2026-09-09 rewrite -- see backend/grid_sweep.py's module
# docstring: a real N x N tiling of a real bundled/supplied image, each tile re-scored with
# RemoteCLIP's real zero-shot tagging against an anomaly taxonomy; returns
# no_imagery_available if this server has no real raster for the requested AOI, never a
# fabricated leaderboard)
# ---------------------------------------------------------------------------
class GridSweepRequest(BaseModel):
    aoi_id: str = "aoi_01_hyderabad"
    aoi_name: str = "Hyderabad Metropolitan Region"
    bbox: Optional[List[float]] = None
    images: Optional[List[ImageItem]] = None
    grid_size: int = 4


@app.post("/api/sweep/run")
async def run_grid_sweep_endpoint(req: GridSweepRequest):
    from .grid_sweep import generate_grid_anomaly_sweep
    image_path = req.images[0].url_or_path if req.images else None
    result = generate_grid_anomaly_sweep(
        aoi_id=req.aoi_id, aoi_name=req.aoi_name, bbox=req.bbox,
        image_path=image_path, grid_size=req.grid_size
    )
    return JSONResponse(content=result)


