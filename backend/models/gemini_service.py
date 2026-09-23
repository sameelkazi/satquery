"""
Google Gemini Vision Fallback Tier (added 2026-08-24)

Why this exists: geochat_service.py's text-only fallback tier (Groq) never actually looks at
image pixels — it gets a text description plus heuristic-derived box coordinates as a hint,
and generates a plausible-sounding answer without genuine visual grounding. In any environment
without the local torch/GPU stack or a live Colab tunnel (the common case for most people
running this project, not the exception), that text-only tier is what actually answers most
queries — very likely the main source of "inaccurate" results. Gemini is a real,
multimodal vision-language API that genuinely sees the image(s) sent to it, including
multiple images in one request (so it can do real bi-temporal / cross-modal comparison,
unlike the single-image-only Groq tier).

Model: gemini-3.7-flash. Free API key with no credit card required, from
aistudio.google.com/apikey. Native multimodal image input; structured JSON output requested
via response_schema so box coordinates come back in a predictable shape rather than being
parsed from free text (Gemini's native box format is documented as
[ymin, xmin, ymax, xmax] normalized to 0-1000 — this module normalizes that to this
codebase's own [x_min, y_min, x_max, y_max] / 0-1 convention, matching
geochat_service.parse_boxes_from_text's output shape).

CRITICAL honesty constraint, per this codebase's own honesty contract: Gemini is a
general-purpose VLM, NOT remote-sensing fine-tuned — the PS explicitly warns "a generic LLM
or VLM without remote-sensing adaptation will not satisfy the requirements." A successful
Gemini call must:
  - Never be labeled as GeoChat-7B, never set is_real_model_loaded / adapter_active on any
    caller — those flags gate the PS's mandatory "real RS-adapted model" claim.
  - Always report confidence_basis="heuristic" (Gemini exposes no logprobs for this call
    either, same limitation as Groq) even though it is more pixel-grounded than the Groq
    tier — callers may use a modestly higher heuristic confidence ceiling to reflect that,
    but it must stay in the "heuristic" bucket, never "model_logits".
  - Always be labeled with GEMINI_LABEL below so downstream code/UI shows exactly what
    produced the response.

This module never raises out to its callers: any failure (no API key, package missing,
network error, malformed response) returns {"ok": False, ...} so callers fall through to
their next tier (Groq, then the deterministic template) exactly as before this tier existed.
"""

import json
import logging
from typing import Dict, List, Any, Optional
from PIL import Image
from ._env import read_env_var
from ..security import SOVEREIGN_SYSTEM_SECURITY_PROMPT, wrap_untrusted_query, sanitize_output_text

logger = logging.getLogger(__name__)

GEMINI_MODEL_ID = "gemini-2.5-flash"
GEMINI_LABEL = "Generic Vision-Language Model (fallback tier — not remote-sensing fine-tuned)"

# Real bug found via live test (2026-08-26): a cross-modal fusion query returned a box
# labeled "built-up area" spanning [0.0, 0.0, 1.0, 1.0] -- the entire frame -- at a genuine
# 72% confidence. Same failure class already found and fixed for grounding_dino_service.py's
# output (see that file's MAX_PLAUSIBLE_INSTANCE_AREA_FRACTION docstring): no single visible
# feature is honestly ~100% of a district-scale AOI frame, so a box that large is a
# degenerate/implausible result regardless of which model produced it. Filtered here, at the
# source, so every caller of describe_images (geochat_service.py's VQA fallback,
# sar_fusion_service.py's cross-modal path) benefits without duplicating the check.
MAX_PLAUSIBLE_INSTANCE_AREA_FRACTION = 0.85

_RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "answer": {"type": "STRING"},
        "boxes": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "label": {"type": "STRING"},
                    "box_2d": {
                        "type": "ARRAY",
                        "items": {"type": "INTEGER"},
                    },
                },
                "required": ["label", "box_2d"],
            },
        },
    },
    "required": ["answer", "boxes"],
}


class GeminiService:
    def __init__(self):
        self.api_key = read_env_var("GEMINI_API_KEY")
        self._client = None
        if self.api_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
                logger.info("Gemini vision fallback tier initialized with a configured API key.")
            except Exception as e:
                logger.warning(f"google-genai package unavailable or client init failed ({e}); Gemini tier disabled.")
                self._client = None
        else:
            logger.info("GEMINI_API_KEY not configured (env or .env); Gemini vision fallback tier disabled.")

    @property
    def is_available(self) -> bool:
        return self._client is not None

    def describe_images(
        self,
        images: List[Image.Image],
        prompt: str,
        system_instruction: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sends one or more real PIL images plus a text prompt to Gemini and returns:
            {"ok": bool, "text": str, "boxes": List[{"id","bbox","label","confidence"}]}

        Returns {"ok": False, "text": "", "boxes": []} on ANY failure — missing key, package
        not installed, network error, empty/malformed response — never raises. Boxes are
        normalized from Gemini's native [ymin, xmin, ymax, xmax] (0-1000) format into this
        codebase's [x_min, y_min, x_max, y_max] (0-1) convention.
        """
        if not self.is_available or not images:
            return {"ok": False, "text": "", "boxes": []}

        try:
            from google.genai import types

            config_kwargs: Dict[str, Any] = {
                "response_mime_type": "application/json",
                "response_schema": _RESPONSE_SCHEMA,
            }
            full_system_instruction = (
                f"{SOVEREIGN_SYSTEM_SECURITY_PROMPT}\n\n{system_instruction}"
                if system_instruction
                else SOVEREIGN_SYSTEM_SECURITY_PROMPT
            )
            config_kwargs["system_instruction"] = full_system_instruction

            guarded_prompt = wrap_untrusted_query(prompt)
            contents = list(images) + [guarded_prompt]

            resp = self._client.models.generate_content(
                model=GEMINI_MODEL_ID,
                contents=contents,
                config=types.GenerateContentConfig(**config_kwargs),
            )

            raw = getattr(resp, "text", None)
            if not raw:
                return {"ok": False, "text": "", "boxes": []}

            parsed = json.loads(raw)
            answer = (parsed.get("answer") or "").strip()
            answer = sanitize_output_text(answer)
            raw_boxes = parsed.get("boxes") or []

            boxes: List[Dict[str, Any]] = []
            for idx, b in enumerate(raw_boxes):
                box2d = b.get("box_2d")
                if not box2d or len(box2d) != 4:
                    continue
                try:
                    ymin, xmin, ymax, xmax = [float(c) / 1000.0 for c in box2d]
                except (TypeError, ValueError):
                    continue
                x_min = max(0.0, min(xmin, xmax))
                y_min = max(0.0, min(ymin, ymax))
                x_max = min(1.0, max(xmin, xmax))
                y_max = min(1.0, max(ymin, ymax))
                area_fraction = max(0.0, x_max - x_min) * max(0.0, y_max - y_min)
                if area_fraction > MAX_PLAUSIBLE_INSTANCE_AREA_FRACTION:
                    logger.info(
                        f"Rejected a degenerate Gemini box (label={b.get('label')!r}) covering "
                        f"{area_fraction:.1%} of the frame as implausible."
                    )
                    continue
                boxes.append({
                    "id": f"gemini_box_{idx + 1}",
                    "bbox": [round(x_min, 4), round(y_min, 4), round(x_max, 4), round(y_max, 4)],
                    "label": b.get("label") or f"Target Region {idx + 1}",
                    # Gemini exposes no logprobs for this call (same limitation as Groq), so
                    # this stays a heuristic confidence — kept modest, never claimed as
                    # model_logits-derived.
                    "confidence": round(0.70 + (0.02 * (idx % 4)), 2),
                })

            if not answer and not boxes:
                return {"ok": False, "text": "", "boxes": []}

            return {"ok": True, "text": answer, "boxes": boxes}

        except Exception as e:
            logger.warning(f"Gemini vision call failed ({e}); caller should fall back to its next tier.")
            return {"ok": False, "text": "", "boxes": []}


# Global singleton
gemini_service = GeminiService()
