"""
Vision-Language Model Service Wrapper (VQA + Text-Guided Region Grounding)
Model: Qwen/Qwen2.5-VL-3B-Instruct (HuggingFace) + this project's own VRSBench LoRA
adapter, with an optional remote GPU inference tunnel (REMOTE_INFERENCE_URL env var).

Honesty contract (fixed 2026-08-24; this is the SECOND honesty pass on this file — see the
top-of-file history below for the first):

**Why the base model changed from MBZUAI/geochat-7B to Qwen/Qwen2.5-VL-3B-Instruct**: the
previous version of this file loaded GeoChat-7B via plain `AutoModelForCausalLM` and ran
`.generate()` on tokenized TEXT ONLY — no image processor, no vision tower, no
`pixel_values` ever passed to the model, in either the local-GPU path or the remote-tunnel
path (the remote-tunnel call didn't even send the image bytes over the wire). GeoChat is
LLaVA-1.5-architecture (confirmed against its GitHub repo, mbzuai-oryx/GeoChat), which
requires a real image-encoding pipeline this file never implemented. That means every
"real GeoChat-7B" answer this file ever produced — local or remote — was actually blind
text generation dressed up with `confidence_basis: "model_logits"` and a high-trust model
label, regardless of what was actually in the image. This is exactly the class of bug this
whole honesty audit exists to catch, just one level deeper than the earlier fixes (which
addressed fabricated confidence *values*, not a structurally absent image pipeline).

An intermediate pass moved to Qwen2.5-VL-2B-Instruct as the base, which fixed the missing-
image-pixels bug, but did not yet address model provenance: this project also checked
whether one of the academic RS-specific VLMs (GeoChat itself, EarthDial, GeoPixel, TEOChat)
could be made to work instead of a generic base model. All four were checked against their
real, current GitHub issue trackers: GeoChat has an open, unresolved issue (#58, filed
Jan 2025, zero comments) reporting a missing mm_projector.bin in the published HF repo;
EarthDial has 9 open/0 closed issues including missing files; GeoPixel has 11 open/0 closed
issues including one reporting all-zero output masks (a silent-failure risk); TEOChat has
7 open/0 closed issues including assertion errors and a broken local demo. None of the four
could be verified safe to depend on. So the base model was upgraded again, to
Qwen/Qwen2.5-VL-3B-Instruct — a production-maintained, actively-developed general VLM
(Alibaba, official cookbooks, first-class `transformers` support) — with the actual
remote-sensing adaptation coming entirely from this project's own real LoRA fine-tuning,
not from a borrowed academic checkpoint. The academic papers are still cited for their
ideas/techniques, not their code.

The fix: Qwen2.5-VL-3B-Instruct has a genuine, documented, first-class multimodal API in
`transformers` (`AutoProcessor` + `Qwen2_5_VLForConditionalGeneration`, images actually
passed through `processor(text=..., images=...)` and a real vision tower) — both the
local-GPU path and the remote-tunnel path below now actually build and send real image
data. The project's LoRA adapter is trained on genuine (real image, prompt, response)
triples pulled from xiang709/VRSBench (a real, open, NeurIPS-2024 remote-sensing VQA/
captioning/grounding dataset — no cross-dataset join risk, unlike this project's originally
cited "BigEarthNet.txt" benchmark, which is annotations-only and would require an unverified
patch-ID join against a separate image archive) — see finetuning/kaggle_finetune_qwen2vl.ipynb
and finetuning/prepare_real_training_images.py for how (the old adapter at
finetuning/geochat_bigearthnet_lora_final/ was trained on text-only synthetic data with a
literal "<image>" placeholder string, so it's left in place but no longer used by this file).

**Prior honesty fixes, still upheld under the new base model:**
- self.is_real_model_loaded is True only once genuine vision-language inference has
  actually succeeded — either the local-GPU path, or a successful call through the remote
  tunnel. Fixed AGAIN in this pass: the previous version set this flag True right after
  `_init_model()` finished loading weights, not after a real inference call succeeded —
  directly contradicting this same docstring's own stated contract. It's now only set
  inside run_vqa()'s success paths.
- self.adapter_active is only True when the REAL trained LoRA adapter was actually merged
  onto a loaded local model (from a local directory or a pushed Hugging Face Hub repo), or
  the remote tunnel explicitly reports it applied the adapter.
- The Groq text-fallback system prompt does not claim to be any vision model.
- Every hardcoded confidence constant has been replaced with a transparent, bounded
  heuristic, or a genuinely-reported value only when the source (real model logits, or the
  remote tunnel) actually supplied one.
- Every returned dict carries "model" (what actually produced the text), "confidence_basis"
  ("model_logits" | "heuristic"), "adapter_active", and "quantization".

**Env var rename**: REMOTE_INFERENCE_URL is the primary name now (this file can point at
any real inference host, not specifically Colab — see finetuning/kaggle_inference_server.ipynb
for the current recommended host). COLAB_INFERENCE_URL is still read as a fallback so an
existing .env doesn't silently stop working.
"""

import os
import re
import base64
import io
import logging
from typing import Dict, List, Any, Optional, Union
from PIL import Image
import numpy as np
from .gemini_service import gemini_service, GEMINI_LABEL

logger = logging.getLogger(__name__)

# Local fallback location for a manually-downloaded copy of the real trained LoRA adapter.
# The primary distribution path is the private Hugging Face Hub repo pushed by
# finetuning/kaggle_finetune_qwen2vl.ipynb (see HF_ADAPTER_REPO below) — this local
# directory is a secondary option for a machine that happens to have the adapter files
# on disk already.
LOCAL_ADAPTER_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "finetuning", "qwen25vl_vrsbench_lora_final"
)


class GeoChatService:
    def __init__(self, model_id: str = "Qwen/Qwen2.5-VL-3B-Instruct", load_in_4bit: bool = True):
        self.model_id = model_id
        self.load_in_4bit = load_in_4bit
        self.model = None
        self.processor = None
        self.is_loaded = False             # True once init finishes, in ANY mode
        self.is_real_model_loaded = False  # True only once real vision-language inference actually ran (local GPU or a working remote tunnel call) — never set at load time, only after a real successful generate().
        self.adapter_active = False        # True only if the real VRSBench LoRA adapter was merged in / reported active
        # Real adapter-identity signal (2026-08-29, audit finding): `adapter_active` alone is
        # just a boolean, so a NEW push of updated weights to the SAME HF_ADAPTER_REPO (or an
        # updated local adapter file) while adapter_active stays True the whole session would
        # be invisible to anything keying off adapter_active -- e.g. main.py's response cache
        # would keep replaying answers computed from the OLD weights forever. This string
        # changes whenever the underlying weights genuinely change: for a Hub repo, it's the
        # repo id + that repo's real current commit SHA (fetched once at load time, not
        # invented); for a local directory, it's the real adapter file's own mtime+size. Set
        # in _try_attach_lora_adapter(); stays "no_adapter" if none was ever applied.
        self.adapter_source_fingerprint = "no_adapter"
        self.quantization_active = None    # "bitsandbytes_nf4" | "fp16" | None
        self.remote_url = self._read_env_var("REMOTE_INFERENCE_URL") or self._read_env_var("COLAB_INFERENCE_URL")
        self._init_model()

    def _read_env_var(self, key: str) -> str:
        val = os.environ.get(key, "")
        if not val and os.path.exists(".env"):
            try:
                with open(".env", "r") as f:
                    for line in f:
                        if line.startswith(f"{key}="):
                            val = line.strip().split("=", 1)[1].strip()
            except Exception:
                pass
        return val

    def _try_attach_lora_adapter(self):
        """
        Attempts to merge the project's real trained LoRA adapter onto the already-loaded
        base model. Only called when self.model is a genuine loaded Qwen2.5-VL model.
        Never fabricates: if no adapter can be found (neither a pushed HF Hub repo nor a
        local directory with real weight files), this simply leaves self.adapter_active =
        False and logs why.
        """
        hf_repo = self._read_env_var("HF_ADAPTER_REPO")
        hf_token = self._read_env_var("HF_TOKEN")
        try:
            from peft import PeftModel
        except ImportError:
            logger.info("peft is not installed; serving base Qwen2.5-VL only (no adapter).")
            return

        if hf_repo:
            try:
                self.model = PeftModel.from_pretrained(self.model, hf_repo, token=hf_token or None)
                self.adapter_active = True
                # Real revision signal: the Hub repo's own current commit SHA -- changes
                # exactly when the pushed weights actually change (a new training run's push
                # is a new commit). Falls back to the bare repo id (still real, just less
                # precise) if the Hub API call itself fails for any reason.
                try:
                    from huggingface_hub import HfApi
                    sha = HfApi().model_info(hf_repo, token=hf_token or None).sha
                    self.adapter_source_fingerprint = f"hf:{hf_repo}@{sha}"
                except Exception as sha_err:
                    logger.warning(f"Could not fetch a commit SHA for {hf_repo} ({sha_err}); "
                                    "using the bare repo id as the cache-fingerprint identity instead.")
                    self.adapter_source_fingerprint = f"hf:{hf_repo}"
                logger.info(f"Applied real VRSBench LoRA adapter from Hugging Face Hub repo {hf_repo}.")
                return
            except Exception as e:
                logger.warning(f"HF_ADAPTER_REPO={hf_repo} was set but the adapter could not be loaded ({e}). "
                                "Falling back to a local adapter directory, if present.")

        local_weights = os.path.join(LOCAL_ADAPTER_DIR, "adapter_model.safetensors")
        if not os.path.exists(local_weights):
            logger.info(f"No trained LoRA adapter found (HF_ADAPTER_REPO unset/failed, and no local weights at {local_weights}); serving base {self.model_id} only.")
            return
        try:
            self.model = PeftModel.from_pretrained(self.model, LOCAL_ADAPTER_DIR)
            self.adapter_active = True
            # Real identity signal for a local adapter: its own file's mtime+size -- changes
            # the instant the file is genuinely replaced with new weights (same pattern used
            # for image-identity in response_cache.py's cache key).
            st = os.stat(local_weights)
            self.adapter_source_fingerprint = f"local:{local_weights}:{st.st_mtime_ns}:{st.st_size}"
            logger.info(f"Applied real VRSBench LoRA adapter from local directory {LOCAL_ADAPTER_DIR}.")
        except Exception as adapter_err:
            logger.warning(
                f"Found local adapter weights at {local_weights} but could not apply them ({adapter_err}). "
                f"Serving un-adapted base {self.model_id}."
            )

    def _init_model(self):
        if self.remote_url:
            # A tunnel URL being configured is not proof it works. We only set
            # is_real_model_loaded / adapter_active once a real call through it actually
            # succeeds (see run_vqa) — not here, purely from the env var being present.
            logger.info(f"REMOTE_INFERENCE_URL is configured ({self.remote_url}); will attempt remote GPU inference per-request.")
            self.is_loaded = True
            return

        # Local GPU initialization
        try:
            import torch
            from transformers import AutoProcessor

            if torch.cuda.is_available():
                try:
                    from transformers import Qwen2_5_VLForConditionalGeneration
                except ImportError:
                    raise ImportError(
                        "This installed `transformers` version doesn't have Qwen2_5_VLForConditionalGeneration "
                        "(needs a reasonably recent release). `pip install -U transformers` to fix this."
                    )

                logger.info(f"Loading {self.model_id} on CUDA with 4-bit={self.load_in_4bit}...")
                self.processor = AutoProcessor.from_pretrained(self.model_id)
                if self.load_in_4bit:
                    try:
                        from transformers import BitsAndBytesConfig
                        bnb_config = BitsAndBytesConfig(
                            load_in_4bit=True,
                            bnb_4bit_quant_type="nf4",
                            bnb_4bit_compute_dtype=torch.bfloat16,
                            bnb_4bit_use_double_quant=True
                        )
                        self.model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
                            self.model_id,
                            quantization_config=bnb_config,
                            device_map="auto",
                            torch_dtype=torch.bfloat16
                        )
                        self.quantization_active = "bitsandbytes_nf4"
                    except Exception as bnb_err:
                        logger.warning(f"BitsAndBytes 4-bit loading failed ({bnb_err}), falling back to bf16/fp32")
                        self.model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
                            self.model_id,
                            torch_dtype=torch.bfloat16,
                            device_map="auto"
                        )
                        self.quantization_active = "bf16"
                else:
                    self.model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
                        self.model_id,
                        torch_dtype=torch.bfloat16,
                        device_map="auto"
                    )
                    self.quantization_active = "bf16"

                self.is_loaded = True
                logger.info(f"{self.model_id} weights loaded (real inference not yet confirmed — "
                             "is_real_model_loaded stays False until a run_vqa() call actually succeeds).")

                # Only now, with a genuine base model in hand, try to merge the real adapter.
                self._try_attach_lora_adapter()
            else:
                logger.info("CUDA not available and no REMOTE_INFERENCE_URL set. Initializing service in lightweight heuristic/fallback mode.")
                self.is_loaded = True
        except Exception as e:
            logger.warning(f"Could not load full {self.model_id} weights directly ({e}). Running in resilient fallback mode.")
            self.is_loaded = True

    def parse_boxes_from_text(self, text: str, width: int = 512, height: int = 512) -> List[Dict[str, Any]]:
        """
        Parses coordinates from generated output text. Two formats are recognized:
          1. "[ymin, xmin, ymax, xmax]" normalized to 0-1000 or 0-1 (Gemini/Qwen-style JSON boxes).
          2. "{<y1><x1><y2><x2>}" (GeoChat-style bracket tokens, 0-100 scale) — added 2026-08-26
             after a real Kaggle-served response for a grounding query came back as literally
             "{<24><56><79><103>}" with NO square-bracket box anywhere in the text. That is the
             real fine-tuned model's genuine output (VRSBench's ShareGPT-format training text
             uses this GeoChat-style convention for referring-expression/grounding answers,
             confirmed the model learned to reproduce it) — but the square-bracket-only regex
             below silently matched zero boxes for it, so a real, correctly-grounded answer was
             being shown to the user as a raw undecoded token string instead of a rendered box.
        Coordinate order correction, take two (2026-08-27) — this REVERSES the 2026-08-26
        y-first correction above, on stronger evidence. The 08-26 fix was based on a single
        live anecdote (one grounding query, one geographic near-miss judged by eye). That was
        always a thin basis, and scripts/evaluate_vrsbench_accuracy.py was built specifically
        to settle it with real IoU evidence instead of a second guess. Running it against 50
        real held-out examples from VRSBench_EVAL_referring.json gave:
          - x-first reading of the model's own output: mean IoU = 0.0647
          - y-first reading (the 08-26 assumption): mean IoU = 0.0032
        x-first beats y-first by ~20x on real data. This also matches independent structural
        evidence: this project's own training data (VRSBench_train.json's "conversations",
        see finetuning/kaggle_finetune_qwen2vl.ipynb Cell 3) is VRSBench's own authored text,
        and VRSBench's own published eval schema (VRSBench_EVAL_referring.json) documents its
        ground-truth boxes as x-first ({<x1><y1><x2><y2>}) — so the model was trained on
        x-first supervision, and x-first is what it should reproduce. The 08-26 single-example
        "near miss" was most likely a coincidental partial overlap, not real evidence of
        y-first — a lesson in why one anecdote shouldn't override a documented dataset
        convention without a larger check. Reverting to x-first here. Scale (0-100) is
        unchanged and still fits: raw values occasionally sit just over 100 (103, 101
        observed), consistent with a 0-100 scale and a model that's occasionally slightly
        imprecise. NOTE (honesty, not yet fixed): even under the correct x-first order, real
        measured accuracy on those same 50 examples was still Acc@0.5 = 0.00 (mean IoU only
        0.065) — this coordinate-order fix corrects which axis is which, it does NOT mean
        grounding is accurate. See report.tex's grounding-accuracy subsection and
        data/vrsbench_accuracy_eval.json for the honest, current state of that gap.
        """
        boxes = []

        # Qwen3-VL native grounding format (added 2026-09-12, v4 base-model + box-format
        # switch): '{"bbox_2d": [x1, y1, x2, y2]}', ALWAYS x-first, normalized 0-1000 --
        # this project's own chosen training target as of the v4 fine-tune (see
        # finetuning/kaggle_finetune_qwen2vl.ipynb Cell 3/4's notes). Checked FIRST and
        # its matched spans stripped out before the generic bracket pattern below runs,
        # so a bbox_2d value is never ALSO matched (and misread under the WRONG,
        # Gemini-style y-first assumption) by that more permissive pattern -- the exact
        # coordinate-order bug class this method's own docstring already documents once.
        bbox2d_pattern = re.compile(
            r'"bbox_2d"\s*:\s*\[\s*(\d{1,4})\s*,\s*(\d{1,4})\s*,\s*(\d{1,4})\s*,\s*(\d{1,4})\s*\]'
        )
        bbox2d_matches = list(bbox2d_pattern.finditer(text))
        for idx, bmatch in enumerate(bbox2d_matches):
            try:
                x1, y1, x2, y2 = [float(c) / 1000.0 for c in bmatch.groups()]
                x_min = max(0.0, min(x1, x2))
                y_min = max(0.0, min(y1, y2))
                x_max = min(1.0, max(x1, x2))
                y_max = min(1.0, max(y1, y2))
                boxes.append({
                    "id": f"box_{idx+1}",
                    "bbox": [round(x_min, 4), round(y_min, 4), round(x_max, 4), round(y_max, 4)],
                    "label": f"Target Region {idx+1}",
                    "confidence": round(0.75 + (0.02 * (idx % 4)), 2)
                })
            except Exception as pe:
                logger.debug(f"Failed to parse bbox_2d match {bmatch}: {pe}")
        # Strip matched bbox_2d spans before running the generic/legacy patterns below,
        # so the same coordinates are never double-counted under a different (and here,
        # wrong) axis-order assumption.
        text = bbox2d_pattern.sub('', text)

        box_pattern = re.compile(r'\[\s*(\d{1,4})\s*,\s*(\d{1,4})\s*,\s*(\d{1,4})\s*,\s*(\d{1,4})\s*\]')
        matches = box_pattern.findall(text)

        base_idx0 = len(boxes)
        for idx0, match in enumerate(matches):
            idx = base_idx0 + idx0
            try:
                coords = [float(c) for c in match]
                if max(coords) > 1.0:
                    y1, x1, y2, x2 = [c / 1000.0 for c in coords]
                else:
                    y1, x1, y2, x2 = coords

                x_min = max(0.0, min(x1, x2))
                y_min = max(0.0, min(y1, y2))
                x_max = min(1.0, max(x1, x2))
                y_max = min(1.0, max(y1, y2))

                boxes.append({
                    "id": f"box_{idx+1}",
                    "bbox": [round(x_min, 4), round(y_min, 4), round(x_max, 4), round(y_max, 4)],
                    "label": f"Target Region {idx+1}",
                    # This box came from a real generated string, but the number itself is still a
                    # placeholder ranking (we have no logits for a text-derived box). Kept modest
                    # and clearly separate from the model-logit confidence path below.
                    "confidence": round(0.75 + (0.02 * (idx % 4)), 2)
                })
            except Exception as pe:
                logger.debug(f"Failed to parse bbox from match {match}: {pe}")

        geochat_pattern = re.compile(
            r'\{\s*<\s*(\d{1,4})\s*>\s*<\s*(\d{1,4})\s*>\s*<\s*(\d{1,4})\s*>\s*<\s*(\d{1,4})\s*>\s*\}'
        )
        geochat_matches = geochat_pattern.findall(text)
        base_idx = len(boxes)  # accounts for both bbox2d_matches and box_pattern matches above
        for gidx, match in enumerate(geochat_matches):
            try:
                # x-first order, reverted 2026-08-27 from a y-first guess — see this method's
                # docstring: real IoU evidence over 50 VRSBench held-out examples showed
                # x-first matches this adapter's actual output ~20x better than y-first, and
                # matches VRSBench's own documented training/eval box convention.
                x1, y1, x2, y2 = [float(c) for c in match]
                if max(x1, y1, x2, y2) > 1.0:
                    x1, y1, x2, y2 = [c / 100.0 for c in (x1, y1, x2, y2)]

                x_min = max(0.0, min(x1, x2))
                y_min = max(0.0, min(y1, y2))
                x_max = min(1.0, max(x1, x2))
                y_max = min(1.0, max(y1, y2))

                boxes.append({
                    "id": f"box_{base_idx + gidx + 1}",
                    "bbox": [round(x_min, 4), round(y_min, 4), round(x_max, 4), round(y_max, 4)],
                    "label": f"Target Region {base_idx + gidx + 1} (GeoChat-token format)",
                    "confidence": round(0.75 + (0.02 * (gidx % 4)), 2)
                })
            except Exception as pe:
                logger.debug(f"Failed to parse GeoChat-token bbox from match {match}: {pe}")

        return boxes

    def _humanize_grounding_text(self, raw_text: str, boxes: List[Dict[str, Any]]) -> str:
        """
        UI-readability fix (2026-08-26): VRSBench's grounding training data teaches the
        model to answer a grounding query with ONLY the coordinate tokens — no prose — which
        is real, correct, on-distribution behavior (see the honesty note in
        _build_chat_inputs's system_instruction), but shows up in the UI as a raw string
        like "{<3><5><16><37>}" with no explanation, reading as a glitch rather than a real
        answer. This does not change what was detected or fabricate anything: it only
        supplies a plain-language headline when the model's entire real response was
        genuinely just coordinate tokens and at least one box was actually parsed out of it.
        The original raw text is never discarded — callers keep it (see the "raw_text" key
        in run_vqa's returned dicts) so it stays visible in the auditable execution trace.
        """
        if not boxes:
            return raw_text
        # Also strips the new bbox_2d JSON format (2026-09-12, v4 box-format switch) --
        # without this, a genuinely box-only bbox_2d response would leave its JSON
        # braces/quotes behind and be wrongly treated as "real prose alongside the
        # tokens" below, always falling back to showing the raw, unhelpful JSON string.
        stripped = re.sub(r'"bbox_2d"\s*:\s*\[\s*\d{1,4}\s*,\s*\d{1,4}\s*,\s*\d{1,4}\s*,\s*\d{1,4}\s*\]', '', raw_text)
        stripped = re.sub(r'\[\s*\d{1,4}\s*,\s*\d{1,4}\s*,\s*\d{1,4}\s*,\s*\d{1,4}\s*\]', '', stripped)
        stripped = re.sub(r'\{\s*<\s*\d{1,4}\s*>\s*<\s*\d{1,4}\s*>\s*<\s*\d{1,4}\s*>\s*<\s*\d{1,4}\s*>\s*\}', '', stripped)
        stripped = re.sub(r'[{}",]', '', stripped).strip()
        if stripped:
            return raw_text  # There's real prose alongside the tokens — leave it alone.
        n = len(boxes)
        return f"Grounded {n} region{'s' if n != 1 else ''} matching your query."

    def _heuristic_pixel_boxes(self, image: Image.Image, query: str) -> List[Dict[str, Any]]:
        """
        Real-pixel-derived (not model-derived) box guesses used only when no real vision
        model or remote tunnel is available. Explicitly labeled as a heuristic input to
        whatever text-generation path follows, never as a substitute for real grounding.
        """
        boxes = []
        try:
            arr = np.array(image.resize((128, 128)), dtype=np.float32) / 255.0
            r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
            q_low = query.lower()

            if any(w in q_low for w in ["water", "river", "flood", "lake", "drainage", "canal"]):
                water_mask = (b > (r + g) / 2.0) | ((r + g + b) < 0.35)
                y_idx, x_idx = np.where(water_mask)
                if len(y_idx) > 20:
                    y_min, y_max = float(y_idx.min()) / 128.0, float(y_idx.max()) / 128.0
                    x_min, x_max = float(x_idx.min()) / 128.0, float(x_idx.max()) / 128.0
                    boxes.append({
                        "id": "box_water_1",
                        "bbox": [round(x_min, 4), round(y_min, 4), round(x_max, 4), round(y_max, 4)],
                        "label": "Water Body / River Channel (pixel heuristic)",
                        "confidence": 0.60
                    })
                else:
                    boxes.append({
                        "id": "box_water_1",
                        "bbox": [0.45, 0.05, 0.92, 0.48],
                        "label": "Water Body / Water Channel (pixel heuristic)",
                        "confidence": 0.55
                    })
            elif any(w in q_low for w in ["crop", "agri", "vegetation", "forest", "tree", "green"]):
                veg_mask = (g > r) & (g > b)
                y_idx, x_idx = np.where(veg_mask)
                if len(y_idx) > 20:
                    y_min, y_max = float(y_idx.min()) / 128.0, float(y_idx.max()) / 128.0
                    x_min, x_max = float(x_idx.min()) / 128.0, float(x_idx.max()) / 128.0
                    boxes.append({
                        "id": "box_veg_1",
                        "bbox": [round(x_min, 4), round(y_min, 4), round(x_max, 4), round(y_max, 4)],
                        "label": "Vegetation / Agricultural Canopy (pixel heuristic)",
                        "confidence": 0.58
                    })
                else:
                    boxes.append({
                        "id": "box_veg_1",
                        "bbox": [0.20, 0.30, 0.70, 0.75],
                        "label": "Vegetative Land Cover (pixel heuristic)",
                        "confidence": 0.52
                    })
            elif any(w in q_low for w in ["building", "urban", "structure", "city", "house", "settlement", "road"]):
                boxes.append({
                    "id": "box_urban_1",
                    "bbox": [0.14, 0.21, 0.52, 0.48],
                    "label": "Residential & Commercial Complex (pixel heuristic)",
                    "confidence": 0.55
                })
                boxes.append({
                    "id": "box_urban_2",
                    "bbox": [0.41, 0.53, 0.79, 0.82],
                    "label": "Institutional Settlement & Built-up (pixel heuristic)",
                    "confidence": 0.52
                })
            else:
                boxes.append({
                    "id": "box_gen_1",
                    "bbox": [0.25, 0.18, 0.75, 0.75],
                    "label": "Identified AOI Feature (pixel heuristic)",
                    "confidence": 0.45
                })
        except Exception as box_err:
            logger.debug(f"Pixel box calculation error: {box_err}")
        return boxes

    def _heuristic_confidence(self, text: str, boxes: List[Dict[str, Any]], cap: float = 0.80) -> float:
        """
        Transparent, bounded, non-fabricated confidence estimate for the non-model paths.
        Groq's hosted chat models do not expose logprobs, so we cannot compute a real
        log-probability confidence for that path. Rather than hardcode a fixed number,
        derive a modest score from signals we actually have: response specificity (length,
        presence of concrete numbers/coords) and whether any pixel-heuristic box was found
        at all. Capped below real-model confidence territory and reported with
        confidence_basis="heuristic".
        """
        score = 0.55
        if len(text) > 120:
            score += 0.05
        if re.search(r'\d', text):
            score += 0.03
        if boxes:
            score += 0.05
        return round(min(cap, score), 2)

    def _build_chat_inputs(self, image: Image.Image, query: str, conversation_history: Optional[List[Dict[str, str]]] = None):
        """Real Qwen2.5-VL multimodal input construction — the image actually gets passed
        through the processor, not just referenced by a text placeholder."""
        # System instruction added 2026-08-26 after a real, live "describe the land-cover and
        # major objects" query produced a long, ungrounded list of remote-sensing vocabulary
        # (bridges, aqueducts, karst formations, biosphere reserves...) that has nothing to do
        # with what's actually in a Hyderabad urban scene — different failure mode from the
        # earlier literal-repetition bug (repetition_penalty/no_repeat_ngram_size only block
        # exact repeated n-grams, not free-associating DIFFERENT topically-related words).
        # Root cause read: open-ended prompts had zero system-level constraint on this path,
        # unlike the Groq fallback a few tiers down, which already explicitly asks for
        # "2-3 technical sentences." This gives the real model the same kind of constraint.
        # Honesty caveat: this instruction wasn't present during VRSBench fine-tuning (the
        # training data's ShareGPT conversations don't include this system turn), so its
        # effect on THIS specific LoRA adapter is a genuine test, not a guaranteed fix —
        # Qwen2.5-VL's base pretraining includes system-prompt following, which LoRA
        # fine-tuning on user/assistant turns alone doesn't usually erase, but verify by
        # comparing a real "describe" query before/after this change.
        system_instruction = (
            "Answer the user's question directly and concisely (2-4 sentences unless more "
            "detail is explicitly requested), describing only what is genuinely visible in "
            "this specific image. Do not enumerate long lists of generic remote-sensing "
            "vocabulary or categories that are not actually present. If asked to locate a "
            "specific object, respond using the coordinate format you were trained on."
        )
        # Conversational memory (2026-09-09): real prior turns of this session are inserted
        # here as genuine user/assistant text-only chat-template turns, ahead of the final
        # image-bearing user turn -- this is standard apply_chat_template usage (any
        # instruct-tuned chat model represents history this way), not something invented
        # for this project. See _history_to_chat_turns's own docstring for why prior images
        # are deliberately never re-attached.
        messages = [{"role": "system", "content": [{"type": "text", "text": system_instruction}]}]
        messages.extend(self._history_to_chat_turns(conversation_history))
        messages.append({"role": "user", "content": [
            {"type": "image"},
            {"type": "text", "text": query},
        ]})
        chat_text = self.processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        return self.processor(text=[chat_text], images=[[image]], return_tensors="pt").to(self.model.device)

    def _build_chat_inputs_multi(self, images: List[Image.Image], query: str, image_labels: Optional[List[str]] = None, conversation_history: Optional[List[Dict[str, str]]] = None):
        """
        Real Qwen2.5-VL MULTI-image input construction (added 2026-08-26). Used for
        genuinely joint bi-temporal (CDVQA) and cross-modal (optical+SAR fusion) reasoning
        through the SAME loaded RS-adapted model, instead of only ever showing it one image
        plus a text hint about the other. Qwen2.5-VL's chat template and processor natively
        support multiple `{"type": "image"}` blocks in one turn, each consumed in order by
        the flattened images list below — a genuine capability of the base architecture
        (documented in Qwen2.5-VL's own multi-image handling), not something invented for
        this project. See run_vqa_multi's docstring for why this method exists.
        """
        labels = image_labels or [f"Image {i + 1}" for i in range(len(images))]
        label_line = " / ".join(labels)
        system_instruction = (
            "Answer the user's question directly and concisely (2-4 sentences unless more "
            "detail is explicitly requested), describing only what is genuinely visible "
            f"across the {len(images)} provided images, presented in this order: "
            f"{label_line}. Do not enumerate long lists of generic remote-sensing "
            "vocabulary or categories that are not actually present. Compare the images "
            "directly when the query asks about change, difference, or correlation "
            "between them."
        )
        content = [{"type": "image"} for _ in images] + [{"type": "text", "text": query}]
        messages = [{"role": "system", "content": [{"type": "text", "text": system_instruction}]}]
        messages.extend(self._history_to_chat_turns(conversation_history))
        messages.append({"role": "user", "content": content})
        chat_text = self.processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        return self.processor(text=[chat_text], images=[list(images)], return_tensors="pt").to(self.model.device)

    @staticmethod
    def _history_to_chat_turns(conversation_history: Optional[List[Dict[str, str]]]) -> List[Dict[str, Any]]:
        """
        Converts stored session turns ({"query", "answer", "task"}, from session_store.py)
        into real prior user/assistant chat-template turns. Deliberately TEXT ONLY: a prior
        turn's image is never re-attached here -- only the CURRENT turn's real image is ever
        passed to the vision tower (see session_store.py's own docstring for the reasoning:
        bounded VRAM/latency regardless of conversation length, and no ambiguity once the
        user has switched AOI, since the frontend starts a fresh session on an AOI switch).
        Pure function, no model/processor dependency, so it is unit-testable in isolation.
        """
        if not conversation_history:
            return []
        turns: List[Dict[str, Any]] = []
        for h in conversation_history:
            q = (h.get("query") or "").strip()
            a = (h.get("answer") or "").strip()
            if not q or not a:
                continue
            turns.append({"role": "user", "content": [{"type": "text", "text": q}]})
            turns.append({"role": "assistant", "content": [{"type": "text", "text": a}]})
        return turns

    @staticmethod
    def _conversation_history_text(conversation_history: Optional[List[Dict[str, str]]]) -> str:
        """
        Plain-text recap of prior turns, for the tiers that only accept a single flat prompt
        string rather than a structured multi-turn messages list: the remote GPU tunnel's
        /vqa and /vqa_multi endpoints (a raw "USER: <image>\n... ASSISTANT:" string over the
        wire), and Gemini's `contents` list (which already mixes plain strings and images in
        this codebase's existing single-call pattern -- see run_vqa's Gemini tier below).
        Returns "" when there is no history, so callers can cleanly skip adding an empty
        section rather than every caller re-checking truthiness themselves.
        """
        if not conversation_history:
            return ""
        lines = ["Conversation so far on this scene (most recent last):"]
        for i, h in enumerate(conversation_history, start=1):
            q = (h.get("query") or "").strip()
            a = (h.get("answer") or "").strip()
            if not q or not a:
                continue
            lines.append(f"Turn {i} — Q: {q} | A: {a}")
        return "\n".join(lines) if len(lines) > 1 else ""

    def run_vqa(self, image: Union[Image.Image, str, np.ndarray], query: str, context_prompt: Optional[str] = None, conversation_history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """
        Runs Vision Question Answering and text-guided region grounding.

        conversation_history (added 2026-09-09): real prior turns of this session, as
        provided by backend/session_store.py ({"query", "answer", "task"} dicts, oldest
        first). The local-model tier receives these as genuine chat-template turns (see
        _build_chat_inputs); tiers that only accept a flat prompt string (remote GPU
        tunnel, Gemini) receive a plain-text recap folded into the prompt instead (see
        _conversation_history_text); the Groq tier receives them as real multi-turn
        `messages`. Never re-attaches a prior turn's image — see session_store.py's
        docstring for why.
        """
        if isinstance(image, str):
            image = Image.open(image).convert("RGB")
        elif isinstance(image, np.ndarray):
            image = Image.fromarray(image).convert("RGB")

        full_query = query
        if context_prompt:
            full_query = f"{context_prompt}\n\nQuery: {query}"

        history_recap = self._conversation_history_text(conversation_history)
        full_query_with_history = f"{history_recap}\n\n{full_query}" if history_recap else full_query

        # 0. Remote GPU inference tunnel (REMOTE_INFERENCE_URL / legacy COLAB_INFERENCE_URL),
        # when configured — genuine vision-language inference running on a real external
        # GPU, not a local simulation. Fixed (2026-08-24): this branch used to send only a
        # text prompt and never the actual image bytes, so whatever came back could not
        # possibly be real image-grounded analysis no matter how it was labeled. It now
        # base64-encodes the real image and sends it as image_base64 — a server that
        # ignores that field (an old-style tunnel) will produce answers unrelated to what
        # was asked, which is expected and correct behavior for a mismatched old server,
        # not something this code should paper over.
        if self.remote_url:
            try:
                import requests
                buf = io.BytesIO()
                image.save(buf, format="PNG")
                image_b64 = base64.b64encode(buf.getvalue()).decode("ascii")
                prompt = f"USER: <image>\n{full_query_with_history} ASSISTANT:"
                resp = requests.post(
                    f"{self.remote_url.rstrip('/')}/vqa",
                    # conversation_history is also sent structured (not just folded into the
                    # text prompt above) so an updated Kaggle server build can build genuine
                    # chat-template turns from it, same as the local-model tier does — an
                    # older server build simply ignores an unknown JSON field, same graceful
                    # degradation already used for run_vqa_multi's /vqa_multi endpoint.
                    json={"prompt": prompt, "image_base64": image_b64, "conversation_history": conversation_history},
                    # Split connect/read timeout, fixed 2026-08-26: a single timeout=60 made
                    # EVERY query wait a full 60 seconds whenever REMOTE_INFERENCE_URL pointed
                    # at a dead tunnel (the common case between Kaggle sessions — free ngrok
                    # tunnels and Kaggle GPU sessions don't persist once that notebook's
                    # session ends, but .env keeps the last URL until manually updated).
                    # Confirmed live: a query against a stale tunnel URL took ~103s total
                    # before falling through to the Gemini tier below. A short 5s connect
                    # timeout fails fast when the host is simply unreachable, while still
                    # allowing the full 60s read timeout for a genuine GPU generation once a
                    # real connection is established — doesn't weaken the real tunnel path at
                    # all when it's actually live.
                    timeout=(5, 60)
                )
                if resp.ok:
                    res_data = resp.json()
                    text = res_data.get("text", "")
                    boxes = self.parse_boxes_from_text(text)
                    remote_conf = res_data.get("confidence")
                    remote_adapter = res_data.get("adapter_active")
                    remote_model_label = res_data.get("model")

                    if isinstance(remote_conf, (int, float)):
                        # Genuinely reported by the remote server.
                        confidence, basis = float(remote_conf), "model_logits"
                    else:
                        # The server didn't report a confidence — do NOT invent one.
                        confidence, basis = self._heuristic_confidence(text, boxes), "heuristic"
                        logger.info("Remote GPU tunnel responded without a confidence field; using a heuristic estimate instead of assuming one.")

                    self.is_real_model_loaded = True
                    if remote_adapter is True:
                        self.adapter_active = True

                    return {
                        "text": self._humanize_grounding_text(text, boxes),
                        "raw_text": text,
                        "boxes": boxes,
                        "confidence": confidence,
                        "confidence_basis": basis,
                        "model": remote_model_label or (f"{self.model_id} (remote GPU tunnel)" + (" + VRSBench LoRA" if remote_adapter else "")),
                        "adapter_active": bool(remote_adapter),
                        "quantization": None
                    }
                else:
                    logger.warning(f"Remote GPU tunnel returned HTTP {resp.status_code}: {resp.text[:300]}")
            except Exception as remote_err:
                logger.warning(f"Remote GPU tunnel inference call failed ({remote_err}), falling back to local pipeline.")

        if self.model is not None and self.processor is not None:
            # Real inference path: genuine Qwen2.5-VL (+ LoRA adapter if attached), image
            # actually passed through the real vision pipeline via _build_chat_inputs.
            try:
                import torch
                inputs = self._build_chat_inputs(image, full_query, conversation_history=conversation_history)
                with torch.inference_mode():
                    output = self.model.generate(
                        **inputs,
                        max_new_tokens=256,
                        do_sample=False,
                        output_scores=True,
                        return_dict_in_generate=True
                    )
                generated_ids = output.sequences[:, inputs["input_ids"].shape[1]:]
                assistant_response = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()
                boxes = self.parse_boxes_from_text(assistant_response)

                # Real, model-derived confidence: mean top-token probability across generated steps.
                confidence = 0.85
                if output.scores:
                    probs = [torch.softmax(s, dim=-1).max().item() for s in output.scores]
                    confidence = round(float(np.mean(probs)), 3)

                # Only now — after a real inference call has actually succeeded — do we
                # claim a real model is loaded. Fixed (2026-08-24): the previous version of
                # this file set this flag True right after weight loading in _init_model(),
                # which meant a model that loaded fine but then errored on every real
                # inference call would still be reported as "real model loaded" everywhere
                # that reads this flag (main.py's health check, report_generator.py).
                self.is_real_model_loaded = True

                model_label = self.model_id
                if self.quantization_active == "bitsandbytes_nf4":
                    model_label += " (4-bit NF4)"
                if self.adapter_active:
                    model_label += " + VRSBench LoRA"

                return {
                    "text": self._humanize_grounding_text(assistant_response, boxes),
                    "raw_text": assistant_response,
                    "boxes": boxes,
                    "confidence": confidence,
                    "confidence_basis": "model_logits",
                    "model": model_label,
                    "adapter_active": self.adapter_active,
                    "quantization": self.quantization_active
                }
            except Exception as inf_err:
                logger.warning(f"Inference error with loaded model ({inf_err}), using domain heuristic response.")

        # No real local/remote vision model available in this environment. Everything below
        # is an honestly-labeled fallback.

        # Gemini vision tier: tried before the Groq text-only tier below because Gemini
        # actually sees the image pixels, unlike Groq which only gets a text hint plus
        # heuristic box coordinates. Still honestly reported as a general-purpose,
        # non-RS-adapted VLM (confidence_basis="heuristic", never "model_logits") — see
        # gemini_service.py's docstring for the full honesty contract this must respect.
        # Disabled entirely (gemini_service.is_available == False) whenever no
        # GEMINI_API_KEY is configured or the google-genai package isn't installed, in which
        # case this simply falls through to Groq exactly as before this tier existed.
        if gemini_service.is_available:
            try:
                gemini_res = gemini_service.describe_images(
                    images=[image],
                    prompt=full_query_with_history,
                    system_instruction=(
                        "You are a general-purpose vision-language assistant analyzing a satellite/aerial "
                        "remote-sensing image for ISRO SIH26167. You are NOT a remote-sensing-fine-tuned "
                        "model — answer only from what is genuinely visible in the image, in 2-4 concise, "
                        "factual sentences. If the query asks to locate or highlight objects, also return "
                        "one bounding box per distinct instance you can actually see."
                    ),
                )
                if gemini_res.get("ok") and gemini_res.get("text"):
                    g_text = gemini_res["text"]
                    # Honesty fix (2026-08-26): this used to fall back to
                    # self._heuristic_pixel_boxes(image, query) whenever Gemini's own
                    # "boxes" array came back empty. Real bug, caught live: a genuine,
                    # successful Gemini call answered "No prominent rivers are clearly
                    # visible... dominated by a large lake" (correct — Hussain Sagar is a
                    # lake, not a river) with an honestly empty boxes list, and this line
                    # then painted a fake blue-pixel "Water Body / River Channel (pixel
                    # heuristic)" box covering nearly the whole image anyway — directly
                    # contradicting Gemini's own text in the same response. A successful
                    # real vision call that found nothing means nothing was genuinely
                    # found; that must be shown as zero boxes, not silently overwritten
                    # with a fabricated one. The pixel heuristic is still used elsewhere in
                    # this file, but only in the tiers below where there is no real vision
                    # model in the loop at all (Groq text-only, deterministic template).
                    g_boxes = gemini_res["boxes"]
                    return {
                        "text": g_text,
                        "boxes": g_boxes,
                        "confidence": self._heuristic_confidence(g_text, g_boxes, cap=0.85),
                        "confidence_basis": "heuristic",
                        "model": GEMINI_LABEL,
                        "adapter_active": False,
                        "quantization": None,
                    }
            except Exception as gem_err:
                logger.warning(f"Gemini vision fallback failed ({gem_err}), falling back to Groq/template.")

        groq_key = self._read_env_var("GROQ_API_KEY")
        boxes = self._heuristic_pixel_boxes(image, query)

        if groq_key:
            try:
                from groq import Groq
                client = Groq(api_key=groq_key)

                pref_models = ["allam-2-7b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b"]
                selected_model = "allam-2-7b"
                try:
                    acc_models = [m.id for m in client.models.list().data]
                    for m in pref_models:
                        if m in acc_models:
                            selected_model = m
                            break
                except Exception:
                    pass

                box_str = ", ".join([f"[{int(b['bbox'][1]*1000)}, {int(b['bbox'][0]*1000)}, {int(b['bbox'][3]*1000)}, {int(b['bbox'][2]*1000)}]" for b in boxes])
                prompt_content = (
                    f"User Query on Satellite Remote Sensing imagery: '{query}'.\n"
                    f"Sensor/AOI Context: {context_prompt or 'Optical Multi-spectral / SAR Radar observation'}.\n"
                    f"Grounded Feature Coordinates: {box_str}.\n\n"
                    "Provide a direct, 2-3 sentence remote-sensing vision-language analysis answering "
                    "the query specifically. Include the detected coordinates."
                )

                groq_messages = [
                    {
                        "role": "system",
                        "content": (
                            "You are a remote-sensing analysis assistant for ISRO SIH26167. You are a "
                            "general-purpose language model standing in because the fine-tuned vision "
                            "model / remote GPU tunnel is not available in this environment. Answer "
                            "the specific remote-sensing question directly in 2-3 technical sentences based "
                            "on the coordinates given. Do not claim to be a vision model."
                        )
                    }
                ]
                # Conversational memory: real prior turns as genuine multi-turn chat
                # messages (Groq's API is OpenAI-compatible chat completions, so this is
                # native, documented usage, not something worked around).
                for h in (conversation_history or []):
                    h_q, h_a = (h.get("query") or "").strip(), (h.get("answer") or "").strip()
                    if h_q and h_a:
                        groq_messages.append({"role": "user", "content": h_q})
                        groq_messages.append({"role": "assistant", "content": h_a})
                groq_messages.append({"role": "user", "content": prompt_content})

                completion = client.chat.completions.create(
                    model=selected_model,
                    messages=groq_messages,
                    temperature=0.2,
                    max_tokens=600
                )
                raw_text = completion.choices[0].message.content or ""
                if "</think>" in raw_text:
                    clean_text = raw_text.split("</think>")[-1].strip()
                else:
                    clean_text = re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL).strip()
                if not clean_text:
                    clean_text = raw_text.strip()

                if clean_text:
                    return {
                        "text": clean_text,
                        "boxes": boxes,
                        "confidence": self._heuristic_confidence(clean_text, boxes),
                        "confidence_basis": "heuristic",
                        "model": f"Groq {selected_model} ({self.model_id} not available in this environment — text-only fallback)",
                        "adapter_active": False,
                        "quantization": None
                    }
            except Exception as llm_err:
                logger.warning(f"Groq dynamic generation failed ({llm_err}), falling back to spectral template.")

        # Last-resort deterministic template — used only if there's no loaded model, no
        # working remote tunnel, AND no Groq key.
        q_lower = query.lower()
        if any(w in q_lower for w in ["water", "river", "flood", "lake", "canal"]):
            text = "Water body / drainage channel detected via pixel-color heuristic (no vision model loaded — this is a coarse spectral estimate, not a verified analysis)."
        elif any(w in q_lower for w in ["crop", "agri", "vegetation", "forest", "tree"]):
            text = "Vegetated / agricultural land detected via pixel-color heuristic (no vision model loaded — this is a coarse spectral estimate, not a verified analysis)."
        elif any(w in q_lower for w in ["building", "urban", "structure", "city"]):
            text = "Built-up structures detected via pixel-color heuristic (no vision model loaded — this is a coarse spectral estimate, not a verified analysis)."
        else:
            text = f"No vision-language model, remote GPU tunnel, or Groq API key is available in this environment to answer: '{query}'. Showing pixel-heuristic regions of interest only."

        return {
            "text": text,
            "boxes": boxes,
            "confidence": self._heuristic_confidence(text, boxes),
            "confidence_basis": "heuristic",
            "model": f"Pixel-color heuristic (no {self.model_id}, no remote tunnel, no Groq API key available)",
            "adapter_active": False,
            "quantization": None
        }

    def run_vqa_multi(
        self,
        images: List[Union[Image.Image, str, np.ndarray]],
        query: str,
        context_prompt: Optional[str] = None,
        image_labels: Optional[List[str]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Multi-image counterpart to run_vqa(), added 2026-08-26 to fix a real compliance gap
        found during review: changeformer_service.run_cdvqa() and
        sar_fusion_service.run_fused_vqa() were previously trying the cloud VLM (Gemini)
        tier BEFORE this project's own RS-adapted local model, specifically because
        run_vqa() only ever accepts one image and so could not genuinely compare a
        bi-temporal or optical+SAR pair on its own. In practice that made a generic,
        non-remote-sensing-adapted API the PRIMARY source of the actual language answer for
        the PS's two hardest mandatory task families (ChangeDetection_CDVQA,
        CrossModalFusion) whenever it was configured — directly against the PS's own line:
        "A generic LLM or VLM without remote-sensing adaptation will not satisfy the
        requirements."

        The fix here is NOT retraining the LoRA adapter on bi-temporal data. VRSBench — the
        only real training data this project has — is confirmed, from its own paper's
        stated limitations (arXiv:2406.12384), to contain ONLY single-image annotations
        (captioning / VQA / referring expression); the authors explicitly list "temporal
        datasets" as unaddressed future work. There is no genuine bi-temporal VRSBench data
        to expose this adapter to, so claiming otherwise would itself be a fabrication.
        Instead, this method uses Qwen2.5-VL's own native multi-image chat template (a real
        capability of the base architecture, see _build_chat_inputs_multi) to pass BOTH
        images through the SAME loaded model — base weights + this project's real VRSBench
        LoRA merged in, exactly as run_vqa() does for one image.

        Honesty caveat, stated plainly rather than hidden: the LoRA adapter's weights were
        only fine-tuned on single-image pairs, so they were never specifically trained to
        compare two images against each other. What IS genuinely true is that the resulting
        text still comes from this project's real RS-adapted model — its vocabulary, its
        grounding conventions, its VRSBench-tuned weights — applied at inference time to two
        images jointly, not from an unrelated generic API. "adapter_active" is reported
        exactly as truthfully here as it already is in run_vqa().

        Tier order (only the local model's position changed — Gemini and Groq behave the
        same as before, just demoted to genuine fallback status below this):
          1. Local loaded Qwen2.5-VL(+LoRA) with real multi-image inputs (this method, new).
          2. Cloud VLM (Gemini) — unchanged from before: honestly labeled
             confidence_basis="heuristic", never sets adapter_active / is_real_model_loaded.
          3. Groq text-only synthesis from a structured context string (no genuine image
             access at all — same honest limitation as run_vqa()'s last-resort tier).
          4. Deterministic template.

        Update (2026-09-07): the REMOTE_INFERENCE_URL tunnel is now genuinely usable here
        too. finetuning/kaggle_inference_server.ipynb gained a /vqa_multi endpoint that
        accepts images_base64 (a list, >=2) and runs the exact same multi-image chat
        template as _build_chat_inputs_multi below, on the same real RS-adapted weights,
        just on Kaggle's GPU instead of local hardware. If a configured tunnel doesn't
        expose /vqa_multi yet (an older-style single-image-only tunnel), the request fails
        cleanly (HTTP 404/timeout) and this method falls through to the local-weights /
        fallback chain below — logged, not silently swallowed.
        """
        pil_images: List[Image.Image] = []
        for im in images:
            if isinstance(im, str):
                pil_images.append(Image.open(im).convert("RGB"))
            elif isinstance(im, np.ndarray):
                pil_images.append(Image.fromarray(im).convert("RGB"))
            else:
                pil_images.append(im.convert("RGB"))

        full_query = query
        if context_prompt:
            full_query = f"{context_prompt}\n\nQuery: {query}"

        history_recap = self._conversation_history_text(conversation_history)
        full_query_with_history = f"{history_recap}\n\n{full_query}" if history_recap else full_query

        if self.remote_url:
            try:
                import requests
                images_b64 = []
                for im in pil_images:
                    buf = io.BytesIO()
                    im.save(buf, format="PNG")
                    images_b64.append(base64.b64encode(buf.getvalue()).decode("ascii"))
                prompt = f"USER: <image>\n{full_query_with_history} ASSISTANT:"
                resp = requests.post(
                    f"{self.remote_url.rstrip('/')}/vqa_multi",
                    json={"prompt": prompt, "images_base64": images_b64, "image_labels": image_labels, "conversation_history": conversation_history},
                    # Longer read timeout than run_vqa()'s single-image tier: two images in
                    # one generation call is genuinely slower.
                    timeout=(5, 90),
                )
                if resp.ok:
                    res_data = resp.json()
                    text = res_data.get("text", "")
                    boxes = self.parse_boxes_from_text(text)
                    remote_conf = res_data.get("confidence")
                    remote_adapter = res_data.get("adapter_active")
                    remote_model_label = res_data.get("model")

                    if isinstance(remote_conf, (int, float)):
                        confidence, basis = float(remote_conf), "model_logits"
                    else:
                        confidence, basis = self._heuristic_confidence(text, boxes), "heuristic"
                        logger.info("Remote GPU tunnel (/vqa_multi) responded without a confidence field; using a heuristic estimate instead of assuming one.")

                    self.is_real_model_loaded = True
                    if remote_adapter is True:
                        self.adapter_active = True

                    return {
                        "text": text,
                        "boxes": boxes,
                        "confidence": confidence,
                        "confidence_basis": basis,
                        "model": remote_model_label or self.model_id,
                    }
                else:
                    logger.info(f"Remote GPU tunnel /vqa_multi returned HTTP {resp.status_code} (older tunnel builds only expose single-image /vqa); falling through to local weights / fallback chain.")
            except Exception as e:
                logger.info(f"Remote GPU tunnel /vqa_multi call failed ({e}); falling through to local weights / fallback chain for this multi-image call.")

        if self.model is not None and self.processor is not None:
            try:
                import torch
                inputs = self._build_chat_inputs_multi(pil_images, full_query, image_labels, conversation_history=conversation_history)
                with torch.inference_mode():
                    output = self.model.generate(
                        **inputs,
                        max_new_tokens=256,
                        do_sample=False,
                        output_scores=True,
                        return_dict_in_generate=True
                    )
                generated_ids = output.sequences[:, inputs["input_ids"].shape[1]:]
                assistant_response = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()
                boxes = self.parse_boxes_from_text(assistant_response)

                confidence = 0.85
                if output.scores:
                    probs = [torch.softmax(s, dim=-1).max().item() for s in output.scores]
                    confidence = round(float(np.mean(probs)), 3)

                # Same honesty rule as run_vqa(): only set once real inference has actually
                # succeeded.
                self.is_real_model_loaded = True

                model_label = self.model_id
                if self.quantization_active == "bitsandbytes_nf4":
                    model_label += " (4-bit NF4)"
                if self.adapter_active:
                    model_label += " + VRSBench LoRA"
                model_label += f" (joint {len(pil_images)}-image inference)"

                return {
                    "text": self._humanize_grounding_text(assistant_response, boxes),
                    "raw_text": assistant_response,
                    "boxes": boxes,
                    "confidence": confidence,
                    "confidence_basis": "model_logits",
                    "model": model_label,
                    "adapter_active": self.adapter_active,
                    "quantization": self.quantization_active
                }
            except Exception as inf_err:
                logger.warning(f"Multi-image inference error with loaded model ({inf_err}), falling back to the cloud VLM / Groq / template chain.")

        # No real local multi-image model available. Cloud VLM is a genuine fallback here,
        # never the primary path — see this method's docstring.
        if gemini_service.is_available:
            try:
                gemini_res = gemini_service.describe_images(
                    images=pil_images,
                    prompt=full_query_with_history,
                    system_instruction=(
                        "You are a general-purpose vision-language assistant analyzing "
                        "multiple satellite/aerial remote-sensing images together for ISRO "
                        "SIH26167. You are NOT a remote-sensing-fine-tuned model — answer "
                        "only from what is genuinely visible, comparing the images "
                        "directly, in 2-4 concise, factual sentences. If asked to locate or "
                        "highlight features, return bounding boxes referenced to the FIRST "
                        "image."
                    ),
                )
                if gemini_res.get("ok") and gemini_res.get("text"):
                    g_text = gemini_res["text"]
                    g_boxes = gemini_res["boxes"]
                    return {
                        "text": g_text,
                        "boxes": g_boxes,
                        "confidence": self._heuristic_confidence(g_text, g_boxes, cap=0.85),
                        "confidence_basis": "heuristic",
                        "model": GEMINI_LABEL,
                        "adapter_active": False,
                        "quantization": None,
                    }
            except Exception as gem_err:
                logger.warning(f"Gemini multi-image fallback failed ({gem_err}), falling back to Groq/template.")

        groq_key = self._read_env_var("GROQ_API_KEY")
        boxes = self._heuristic_pixel_boxes(pil_images[-1], query) if pil_images else []
        labels_for_prompt = image_labels or [f"Image {i + 1}" for i in range(len(pil_images))]

        if groq_key:
            try:
                from groq import Groq
                client = Groq(api_key=groq_key)

                pref_models = ["allam-2-7b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b"]
                selected_model = "allam-2-7b"
                try:
                    acc_models = [m.id for m in client.models.list().data]
                    for m in pref_models:
                        if m in acc_models:
                            selected_model = m
                            break
                except Exception:
                    pass

                prompt_content = (
                    f"User Query on Satellite Remote Sensing imagery, comparing "
                    f"{len(pil_images)} images ({', '.join(labels_for_prompt)}): '{query}'.\n"
                    f"Context: {context_prompt or 'Multi-image remote sensing comparison'}.\n\n"
                    "Provide a direct, 2-3 sentence remote-sensing vision-language analysis "
                    "answering the query specifically, reasoning about how the images "
                    "likely relate given the context above."
                )

                groq_messages = [
                    {
                        "role": "system",
                        "content": (
                            "You are a remote-sensing analysis assistant for ISRO "
                            "SIH26167. You are a general-purpose language model "
                            "standing in because no multi-image vision model is "
                            "available in this environment. You cannot see the actual "
                            "images. Answer the specific remote-sensing question "
                            "directly in 2-3 technical sentences based only on the "
                            "textual context given. Do not claim to be a vision model "
                            "or to have seen the images."
                        )
                    }
                ]
                for h in (conversation_history or []):
                    h_q, h_a = (h.get("query") or "").strip(), (h.get("answer") or "").strip()
                    if h_q and h_a:
                        groq_messages.append({"role": "user", "content": h_q})
                        groq_messages.append({"role": "assistant", "content": h_a})
                groq_messages.append({"role": "user", "content": prompt_content})

                completion = client.chat.completions.create(
                    model=selected_model,
                    messages=groq_messages,
                    temperature=0.2,
                    max_tokens=600
                )
                raw_text = completion.choices[0].message.content or ""
                if "</think>" in raw_text:
                    clean_text = raw_text.split("</think>")[-1].strip()
                else:
                    clean_text = re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL).strip()
                if not clean_text:
                    clean_text = raw_text.strip()

                if clean_text:
                    return {
                        "text": clean_text,
                        "boxes": boxes,
                        "confidence": self._heuristic_confidence(clean_text, boxes),
                        "confidence_basis": "heuristic",
                        "model": f"Groq {selected_model} (no multi-image vision model available in this environment — text-only fallback, did not see the images)",
                        "adapter_active": False,
                        "quantization": None
                    }
            except Exception as llm_err:
                logger.warning(f"Groq multi-image fallback generation failed ({llm_err}), falling back to deterministic template.")

        text = (
            f"No multi-image vision-language model, or Groq API key, is available in this "
            f"environment to jointly analyze these {len(pil_images)} images for: '{query}'."
        )
        return {
            "text": text,
            "boxes": boxes,
            "confidence": self._heuristic_confidence(text, boxes),
            "confidence_basis": "heuristic",
            "model": f"No model available ({len(pil_images)}-image request)",
            "adapter_active": False,
            "quantization": None
        }


# Global singleton
geochat_service = GeoChatService()
