"""
Agentic Router Module (RS-Agent Architecture Template, arXiv:2406.07089)
Uses: Llama-3-8B-Instruct via Groq API with structured JSON schema output & robust rule-based fallback.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
from groq import Groq

logger = logging.getLogger(__name__)

VALID_TASKS = {"VQA", "Grounding", "ChangeDetection_CDVQA", "ZeroShotSearch", "CrossModalFusion"}
VALID_MODALITIES = {"Optical", "SAR", "Fused"}
VALID_TEMPORAL = {"single", "bi-temporal"}

# Shared classification keyword sets (2026-08-24 fix): these used to be duplicated
# independently in backend/validation.py with a narrower, drifted subset of keywords
# (missing "increase", "decrease", "remained", "before and after", "dates", "microwave",
# "backscatter"), which meant a query the router would classify as ChangeDetection_CDVQA or
# CrossModalFusion could sail through validation.py's pre-dispatch check unrecognized as
# either — the root cause of a dispatch/validation mismatch bug. There is now exactly one
# source of truth for "what kind of query is this," exported here and imported by
# validation.py, so the two files can no longer silently diverge.
FUSION_KEYWORDS = ["sar", "radar", "fused", "microwave", "optical and sar", "together", "backscatter"]
CHANGE_KEYWORDS = ["change", "between", "difference", "increase", "decrease", "remained", "before and after", "dates"]
GROUNDING_KEYWORDS = ["locate", "find", "highlight", "box", "where is", "where are", "boundary", "bounding"]
ZERO_SHOT_KEYWORDS = ["tag", "tags", "categories", "zero-shot", "classify", "classes present"]

# Sub-classification within Grounding (2026-08-26 fix): a grounding query can ask for ONE
# specific object via a distinguishing referring expression ("the building next to the
# lake") or for EVERY instance of a whole category ("locate buildings"). These need
# different models — see grounding_dino_service.py's module docstring for the full
# reasoning (VRSBench's referring-expression training task is structurally single-object,
# confirmed from its own paper, so it can't honestly answer the second kind of question with
# more than one box no matter how it's fine-tuned). This keyword list is the "specific
# object" signal; its absence is one half of the multi-instance signal (the other half —
# whether the query actually names a category grounding_dino_service.py knows about — is
# checked separately via GroundingDinoService.extract_categories, since that vocabulary
# lives with the service that consumes it, not here).
DISTINGUISHING_REFERRING_KEYWORDS = [
    "near", "next to", "closest", "close to", "adjacent", "beside", "between",
    "left", "right", "top", "bottom", "center", "corner",
    "largest", "biggest", "tallest", "smallest",
    "this building", "this road", "this vehicle", "this car", "this tree",
    "this ship", "this boat", "this lake", "this river", "this bridge", "this field",
    "that building", "that road", "that vehicle", "that car", "that tree",
    "that ship", "that boat", "that lake", "that river", "that bridge", "that field",
]
# Honesty note (2026-08-26, same-day fix): the first version of this list used bare "this "
# / "that " as substring markers, meant to catch "this building" as a specific-object signal.
# Real bug, caught from a live test: "locate buildings in this image" also contains "this "
# (from "in this image" — an extremely common, generic phrase with no relation to singling
# out one object), so it was being misclassified as a specific referring expression and
# skipping the multi-instance detector entirely. Scoped to "this/that <category noun>" pairs
# instead, which only matches when genuinely pointing at one object.


def is_multi_instance_grounding_query(query: str) -> bool:
    """
    True if a grounding query reads as a category-wide ask ("locate buildings") rather than
    a specific single-object referring expression ("the building next to the lake"). Only
    checks the "no distinguishing language" half of the signal — callers must separately
    confirm the query actually names a known category before routing to the multi-instance
    detector, since a bare "locate it" with no distinguishing words and no recognized
    category is neither kind of usable multi-instance query.
    """
    q = (query or "").lower()
    return not any(w in q for w in DISTINGUISHING_REFERRING_KEYWORDS)


def is_fusion_query(query: str) -> bool:
    """True if the query TEXT itself asks for optical+SAR fusion (independent of what
    images were actually provided — callers check image modalities separately)."""
    q = (query or "").lower()
    return any(w in q for w in FUSION_KEYWORDS)


def is_change_query(query: str) -> bool:
    """True if the query TEXT itself asks for bi-temporal / change comparison."""
    q = (query or "").lower()
    return any(w in q for w in CHANGE_KEYWORDS)


def is_grounding_query(query: str) -> bool:
    q = (query or "").lower()
    return any(w in q for w in GROUNDING_KEYWORDS)


def is_zero_shot_query(query: str) -> bool:
    q = (query or "").lower()
    return any(w in q for w in ZERO_SHOT_KEYWORDS)

class AgenticRouter:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GROQ_API_KEY", "")
        if not self.api_key and os.path.exists(".env"):
            try:
                with open(".env", "r") as f:
                    for line in f:
                        if line.startswith("GROQ_API_KEY="):
                            self.api_key = line.strip().split("=", 1)[1]
            except Exception:
                pass

        self.client = None
        if self.api_key:
            try:
                self.client = Groq(api_key=self.api_key)
                logger.info("Groq Agentic Router initialized with active API key.")
            except Exception as e:
                logger.warning(f"Could not initialize Groq client: {e}")

    def route_query(self, query: str, num_images: int = 1, modalities_present: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Classifies incoming query into task, modality, and temporal dimensions.
        """
        modalities = modalities_present or ["optical"]
        
        # Try LLM router via Groq API if available
        if self.client is not None and self.api_key:
            try:
                system_prompt = (
                    "You are the central controller of SatQuery AI, an agentic remote-sensing assistant. "
                    "Analyze the user query and image configuration, then output ONLY a valid JSON object matching this schema:\n"
                    "{\n"
                    '  "task": "VQA" | "Grounding" | "ChangeDetection_CDVQA" | "ZeroShotSearch" | "CrossModalFusion",\n'
                    '  "modality": "Optical" | "SAR" | "Fused",\n'
                    '  "temporal": "single" | "bi-temporal",\n'
                    '  "reasoning": "brief explanation"\n'
                    "}\n"
                    "Rules:\n"
                    "- If query asks to locate/highlight/bound objects -> Grounding\n"
                    "- If query asks about changes between dates or before/after -> ChangeDetection_CDVQA\n"
                    "- If query asks to use optical and SAR or radar together -> CrossModalFusion\n"
                    "- If query asks to classify or list zero-shot tag categories -> ZeroShotSearch\n"
                    "- If query asks to describe, assess, or answer questions about a scene, crops, or land-cover -> VQA\n"
                    "- Otherwise -> VQA"
                )
                user_msg = f"Query: '{query}'. Images provided: {num_images}, Modalities: {modalities}"

                avail_models = [
                    "allam-2-7b",
                    "groq/compound-mini",
                    "openai/gpt-oss-20b"
                ]
                selected_model = "allam-2-7b"
                try:
                    account_models = [m.id for m in self.client.models.list().data]
                    for m in avail_models:
                        if m in account_models:
                            selected_model = m
                            break
                except Exception:
                    pass

                response = self.client.chat.completions.create(
                    model=selected_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_msg}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.1,
                    max_tokens=256
                )
                raw_json = response.choices[0].message.content
                # Parse JSON with regex fallback if needed
                parsed = json.loads(raw_json)

                # Schema verification
                if (parsed.get("task") in VALID_TASKS and
                    parsed.get("modality") in VALID_MODALITIES and
                    parsed.get("temporal") in VALID_TEMPORAL):
                    # Multi-image physical constraint: bi-temporal change detection requires at least 2 images
                    if num_images < 2 and parsed.get("task") == "ChangeDetection_CDVQA":
                        parsed["task"] = "VQA"
                        parsed["temporal"] = "single"
                        parsed["reasoning"] = (parsed.get("reasoning", "") + " (single-image input adjusted to VQA)").strip()
                    logger.info(f"Groq ({selected_model}) successfully classified: {parsed['task']}")
                    return parsed
            except Exception as e:
                logger.warning(f"Groq LLM router failed or returned invalid JSON ({e}). Falling back to rule classifier.")

        # Deterministic, robust rule-based router fallback
        return self._rule_based_routing(query, num_images, modalities)

    def _rule_based_routing(self, query: str, num_images: int, modalities: List[str]) -> Dict[str, Any]:
        """
        Deterministic remote-sensing intent classifier.

        Honesty/accuracy fix (2026-08-24): every branch below used to hardcode
        "modality": "Optical" regardless of what was actually sent — so a single SAR image
        with a query like "locate buildings in this image" (no "sar"/"radar" keyword in the
        query TEXT itself) was reported in the auditable execution summary as an Optical
        request even though a SAR image was the one actually processed. The PS explicitly
        requires the execution summary to be auditable, so the reported modality now reflects
        the actual input images (`modalities`), not just keyword-matching on the query string.
        """
        has_sar = "sar" in modalities
        has_optical = "optical" in modalities
        # Best-effort honest label for the actual images provided, used as the default for
        # every branch below unless that branch has its own more specific reason to differ.
        actual_modality = "Fused" if (has_sar and has_optical) else ("SAR" if has_sar else "Optical")

        # 1. Cross-Modal Fusion — either both modalities were actually provided, or the query
        # text explicitly asks for SAR/radar fusion even though only one image was attached
        # (in which case we can't literally fuse, but flag the mismatch in the reasoning).
        if (has_sar and has_optical) or is_fusion_query(query):
            if has_sar and has_optical:
                reasoning = "Query and/or input images indicate optical+SAR cross-modal fusion; both modalities were actually provided."
            else:
                reasoning = "Query text mentions SAR/radar fusion, but only one image modality was actually provided — routing to CrossModalFusion regardless of that mismatch."
            return {
                "task": "CrossModalFusion",
                "modality": "Fused" if (has_sar and has_optical) else actual_modality,
                "temporal": "single",
                "reasoning": reasoning
            }

        # 2. Bi-temporal Change Detection / CDVQA
        if num_images >= 2 or is_change_query(query):
            return {
                "task": "ChangeDetection_CDVQA",
                "modality": actual_modality,
                "temporal": "bi-temporal",
                "reasoning": "Query requires multi-temporal comparison or multiple timestamps provided."
            }

        # 3. Grounding / Localization
        if is_grounding_query(query):
            return {
                "task": "Grounding",
                "modality": actual_modality,
                "temporal": "single",
                "reasoning": "Query requests spatial localization and bounding-box coordinates."
            }

        # 4. Zero-Shot Tagging / Search
        if is_zero_shot_query(query):
            return {
                "task": "ZeroShotSearch",
                "modality": actual_modality,
                "temporal": "single",
                "reasoning": "Query requests multi-class scene tagging."
            }

        # 5. Default single-image VQA
        return {
            "task": "VQA",
            "modality": actual_modality,
            "temporal": "single",
            "reasoning": "Standard single-image visual question answering."
        }

# Global singleton
agentic_router = AgenticRouter()
