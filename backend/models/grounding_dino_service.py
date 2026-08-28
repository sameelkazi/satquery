"""
Open-Vocabulary Multi-Instance Detection Service Wrapper
Model: IDEA-Research/grounding-dino-tiny (apache-2.0, ~0.2B params)

Why this file exists (2026-08-26): the existing grounding path (geochat_service.py, the
fine-tuned Qwen2.5-VL + VRSBench LoRA) is architecturally a REFERRING-EXPRESSION model —
VRSBench's own grounding task is documented as producing exactly one bounding box per query,
because each referring sentence is written to "unambiguously identify" a single object
(confirmed from the VRSBench paper, arXiv:2406.12384). That's the right tool for "the
building next to the lake," and the wrong tool for "locate buildings" — a category-wide,
plural query where the honest answer is every visible instance, not one box. No amount of
retraining on VRSBench fixes this, because VRSBench never defines a multi-instance detection
task at all.

This service is the real fix for that: a genuine open-vocabulary object detector that takes a
list of text categories and returns every instance it finds, each with its own real
detection-derived confidence score.

Model choice honesty note: the initial ask was LAE-DINO ("Locate Anything on Earth,"
AAAI'25), a remote-sensing-specialized Grounding DINO variant. It was NOT used here because
its pinned install requirements (torch==1.10.0+cu113, MMDetection, mim/mmcv) directly
conflict with the modern torch/transformers stack this project's Qwen2.5-VL pipeline already
depends on, and installing it would risk breaking the already-working Kaggle inference
server. grounding-dino-tiny is the base architecture LAE-DINO was built on, loads through the
transformers version this project already requires (>=4.46.0, no new dependency), and is not
remote-sensing-specialized — a real, honestly-disclosed accuracy tradeoff for common visual
categories (buildings, roads, vehicles, water bodies) that still have distinguishable shapes
from above, versus a dedicated RS-tuned detector.

Runs in the main backend process (CPU-capable, GPU-accelerated if available), NOT the Kaggle
remote tunnel — decoupled from the Kaggle single-GPU-session constraint, so this tier keeps
working even when the Kaggle inference server isn't up.

SAHI tiling, added 2026-08-29, CORRECTED same day: the real bug documented just above this
paragraph (a whole-frame degenerate box on a dense urban scene) is the textbook failure mode
SAHI (Slicing Aided Hyper Inference, Akyon et al. 2022, github.com/obss/sahi) exists to fix —
grounding-dino-tiny's native input resolution loses small/dense objects when a full
district-scale AOI is downsampled into one forward pass. The FIRST version of this fix hand-
rolled its own tiling loop and fused results with the `ensemble-boxes` package, on the
(unverified, wrong) assumption that the real `sahi` library didn't support a zero-shot,
text-prompted detector like Grounding DINO. A direct check of the current obss/sahi source
(sahi/models/huggingface.py, sahi v0.12.6) the same day showed that assumption was false: SAHI
has an official `HuggingfaceDetectionModel` wrapper that explicitly supports GroundingDINO's
`text_prompt`/`text_labels` zero-shot API, accepts an already-loaded model+processor instance
(no re-downloading our already-loaded weights), and internally calls the exact same
`processor.post_process_grounded_object_detection` this service always called directly. This
version uses that real, official wrapper (`sahi.AutoDetectionModel` + `sahi.predict.
get_sliced_prediction`) instead of the hand-rolled version — the actual upstream library doing
the slicing, the full-frame+tiled combination, and the merge (SAHI's own GREEDYNMM postprocess,
not WBF — SAHI does not ship WBF as a postprocess option, so this version no longer uses
`ensemble-boxes` either). Small images still skip tiling entirely (same threshold, same
rationale: no benefit, extra latency) and behave exactly as before any of this existed. If
`sahi` isn't installed, this degrades gracefully to the original single-full-pass behavior —
never crashes, never fabricates a sliced/fused result it didn't actually compute.
"""

import logging
from typing import Any, Dict, List

from PIL import Image

logger = logging.getLogger(__name__)

try:
    from sahi import AutoDetectionModel
    from sahi.predict import get_sliced_prediction
    _SAHI_AVAILABLE = True
except Exception as _sahi_import_err:
    AutoDetectionModel = None
    get_sliced_prediction = None
    _SAHI_AVAILABLE = False
    logger.warning(
        f"sahi not installed ({_sahi_import_err}); large-image detection will fall back to "
        "single full-pass inference (the original, pre-2026-08-29 behavior)."
    )

MODEL_ID = "IDEA-Research/grounding-dino-tiny"

# SAHI tiling only pays off on imagery large enough that a single forward pass genuinely loses
# detail — below this, tiling just adds latency for no real benefit, and the original
# single-pass behavior is kept exactly as it was.
SAHI_TILE_THRESHOLD_PX = 800
SAHI_TILE_SIZE_PX = 640
SAHI_TILE_OVERLAP_RATIO = 0.2

# Real bug found via live test (2026-08-26): "locate buildings in this image" on the
# Hyderabad AOI returned exactly one box, [0.0001, 0.0002, 1.0, 1.0] — i.e. essentially the
# entire frame — labeled "a building" at a genuine 78% detection-head confidence. This is a
# real model failure, not a code bug: grounding-dino-tiny is trained on natural photos, not
# top-down aerial/satellite imagery, and on at least this image it apparently interpreted
# the whole dense urban texture as one giant "building" rather than recognizing individual
# structures. No single instance of any category this service knows about (a building, a
# road, a car, a tree, a boat, a lake, a river, a bridge, a field) is honestly ~100% of the
# frame in this project's district-scale AOI views, so a box that large is filtered out as a
# degenerate detection before being shown to the user, rather than presented as if it were
# real, precise localization. This is a generic, non-per-category sanity check — not a
# fabrication of any kind, purely a rejection of an implausible result the model itself
# produced. Deliberately conservative (0.85, not 0.5) so it only catches near-total-frame
# degenerate boxes and doesn't suppress a genuinely large real detection (e.g. a big field
# or lake covering most of a tightly-cropped AOI).
MAX_PLAUSIBLE_INSTANCE_AREA_FRACTION = 0.85

# Category vocabulary this service knows how to phrase for Grounding DINO's text-prompt
# format ("a cat. a remote control."). Maps a plural/bare query term to the singular noun
# phrase Grounding DINO expects. Extend this list as real query patterns show more categories
# are needed — kept intentionally short and remote-sensing-relevant rather than a huge
# generic vocabulary, since accuracy on unfamiliar categories is unverified.
CATEGORY_VOCAB = {
    "building": "a building", "buildings": "a building",
    "road": "a road", "roads": "a road",
    "vehicle": "a car", "vehicles": "a car", "car": "a car", "cars": "a car",
    "tree": "a tree", "trees": "a tree",
    "ship": "a boat", "ships": "a boat", "boat": "a boat", "boats": "a boat",
    "water body": "a lake", "water bodies": "a lake", "lake": "a lake", "lakes": "a lake",
    "river": "a river", "rivers": "a river", "canal": "a canal", "canals": "a canal",
    "bridge": "a bridge", "bridges": "a bridge",
    "field": "a field", "fields": "a field", "crop": "a field", "crops": "a field",
}


class GroundingDinoService:
    def __init__(self, model_id: str = MODEL_ID):
        self.model_id = model_id
        self.model = None
        self.processor = None
        self.sahi_model = None
        self.is_loaded = False
        self.is_real_model_loaded = False
        self._init_model()

    def _init_model(self):
        try:
            import torch
            from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection

            logger.info(f"Loading open-vocabulary detector {self.model_id}...")
            self.processor = AutoProcessor.from_pretrained(self.model_id)
            self.model = AutoModelForZeroShotObjectDetection.from_pretrained(self.model_id)

            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            self.model = self.model.to(self.device).eval()

            self.is_loaded = True
            self.is_real_model_loaded = True
            logger.info(f"Loaded real {self.model_id} weights on {self.device}.")
        except Exception as e:
            # Honest degrade: never fabricate a detection result if the real detector
            # couldn't load. Callers must check is_real_model_loaded before use.
            logger.warning(f"Could not load {self.model_id} ({e}). Multi-instance detection tier disabled.")
            self.is_loaded = False
            self.is_real_model_loaded = False
            return

        if _SAHI_AVAILABLE:
            try:
                # Wraps the SAME already-loaded model/processor instances above — SAHI's
                # `set_model` path is used here (model is truthy), not `load_model`, so this
                # does NOT re-download or duplicate the weights already in memory.
                self.sahi_model = AutoDetectionModel.from_pretrained(
                    model_type="huggingface",
                    model=self.model,
                    processor=self.processor,
                    confidence_threshold=0.30,
                    device=self.device,
                )
                logger.info("SAHI wrapper initialized around the already-loaded Grounding DINO model (no reload).")
            except Exception as e:
                logger.warning(f"Could not initialize SAHI wrapper ({e}); large images will use a single full-frame pass only.")
                self.sahi_model = None

    def extract_categories(self, query: str) -> List[str]:
        """
        Pulls known category nouns out of a query string. Returns a de-duplicated list of
        Grounding DINO-format phrases (e.g. ["a building"]), or [] if nothing recognized.
        """
        q = (query or "").lower()
        found = []
        for term, phrase in CATEGORY_VOCAB.items():
            if term in q and phrase not in found:
                found.append(phrase)
        return found

    def _run_single_pass(self, image: Image.Image, categories: List[str],
                          box_threshold: float, text_threshold: float) -> List[Dict[str, Any]]:
        """
        The original (pre-SAHI), single full-frame forward pass — unchanged from before this
        fix. Used directly for images at/below SAHI_TILE_THRESHOLD_PX, and as the fallback when
        the real `sahi` package isn't installed. Returns raw detections with pixel coordinates
        in `image`'s own frame — [{"x1","y1","x2","y2","score","label"}].
        """
        import torch

        width, height = image.size
        text_prompt = ". ".join(categories) + "."

        inputs = self.processor(images=image, text=text_prompt, return_tensors="pt").to(self.device)
        with torch.inference_mode():
            outputs = self.model(**inputs)

        try:
            results = self.processor.post_process_grounded_object_detection(
                outputs, inputs.input_ids,
                threshold=box_threshold, text_threshold=text_threshold,
                target_sizes=[(height, width)]
            )[0]
        except TypeError:
            results = self.processor.post_process_grounded_object_detection(
                outputs, inputs.input_ids,
                box_threshold=box_threshold, text_threshold=text_threshold,
                target_sizes=[(height, width)]
            )[0]

        labels_list = results.get("text_labels") if "text_labels" in results and results["text_labels"] else results.get("labels", [])
        raw = []
        for box, score, label in zip(results["boxes"], results["scores"], labels_list):
            x1, y1, x2, y2 = [float(v) for v in box.tolist()]
            raw.append({"x1": x1, "y1": y1, "x2": x2, "y2": y2, "score": float(score), "label": str(label)})
        return raw

    def _run_sahi_sliced_pass(self, image: Image.Image, categories: List[str],
                               box_threshold: float, text_threshold: float) -> List[Dict[str, Any]]:
        """
        Real SAHI sliced inference: runs the detector on overlapping tiles AND a full-frame
        pass (`perform_standard_pred=True`), then merges them with SAHI's own GREEDYNMM
        postprocessing — the actual upstream obss/sahi library doing the slicing and merging,
        not a reimplementation. Returns detections in the same raw pixel-coordinate shape as
        `_run_single_pass` so both feed the same downstream normalization/filtering code.
        """
        text_prompt = ". ".join(categories) + "."
        # text_threshold isn't a get_sliced_prediction() kwarg -- it's specific to the
        # HuggingFace zero-shot wrapper, so it's set directly on the model instance.
        self.sahi_model.text_prompt = text_prompt
        self.sahi_model.text_labels = None
        self.sahi_model.text_threshold = text_threshold

        result = get_sliced_prediction(
            image=image,
            detection_model=self.sahi_model,
            slice_height=SAHI_TILE_SIZE_PX,
            slice_width=SAHI_TILE_SIZE_PX,
            overlap_height_ratio=SAHI_TILE_OVERLAP_RATIO,
            overlap_width_ratio=SAHI_TILE_OVERLAP_RATIO,
            perform_standard_pred=True,
            postprocess_type="GREEDYNMM",
            postprocess_match_metric="IOS",
            postprocess_match_threshold=0.5,
            verbose=0,
            confidence_threshold=box_threshold,
        )

        raw = []
        for pred in result.object_prediction_list:
            x1, y1, x2, y2 = [float(v) for v in pred.bbox.to_xyxy()]
            raw.append({
                "x1": x1, "y1": y1, "x2": x2, "y2": y2,
                "score": float(pred.score.value), "label": str(pred.category.name),
            })
        return raw

    def detect_categories(self, image_path: str, categories: List[str],
                           box_threshold: float = 0.30, text_threshold: float = 0.25) -> Dict[str, Any]:
        """
        Real open-vocabulary detection: returns every instance of every requested category
        the model actually finds, each with its own real detection-confidence score
        (never a placeholder or heuristic value — this is genuine model output).

        For large images (see SAHI_TILE_THRESHOLD_PX), uses the real `sahi` library's sliced
        inference (tiles + full frame, merged via SAHI's own GREEDYNMM postprocess) so
        small/dense objects a single downsampled pass would miss are recovered without losing
        whatever the full-frame pass alone would have found.
        """
        if not self.is_real_model_loaded or not categories:
            return {"boxes": [], "ok": False}

        try:
            image = Image.open(image_path).convert("RGB")
            width, height = image.size

            used_tiling = _SAHI_AVAILABLE and self.sahi_model is not None and max(width, height) > SAHI_TILE_THRESHOLD_PX

            if used_tiling:
                try:
                    detections = self._run_sahi_sliced_pass(image, categories, box_threshold, text_threshold)
                    logger.info(f"SAHI sliced pass on {width}x{height} image: {len(detections)} raw detection(s).")
                except Exception as sahi_err:
                    logger.warning(f"SAHI sliced pass failed ({sahi_err}); falling back to a single full-frame pass for this request.")
                    detections = self._run_single_pass(image, categories, box_threshold, text_threshold)
                    used_tiling = False
            else:
                detections = self._run_single_pass(image, categories, box_threshold, text_threshold)

            boxes = []
            rejected_count = 0
            for idx, det in enumerate(detections):
                norm_x_min = round(max(0.0, det["x1"] / width), 4)
                norm_y_min = round(max(0.0, det["y1"] / height), 4)
                norm_x_max = round(min(1.0, det["x2"] / width), 4)
                norm_y_max = round(min(1.0, det["y2"] / height), 4)
                label = det["label"]
                score = det["score"]

                area_fraction = max(0.0, norm_x_max - norm_x_min) * max(0.0, norm_y_max - norm_y_min)
                if area_fraction > MAX_PLAUSIBLE_INSTANCE_AREA_FRACTION:
                    rejected_count += 1
                    logger.info(
                        f"Rejected a degenerate '{label}' detection covering "
                        f"{area_fraction:.1%} of the frame (score {float(score):.2f}) — "
                        f"see MAX_PLAUSIBLE_INSTANCE_AREA_FRACTION's docstring."
                    )
                    continue

                boxes.append({
                    "id": f"dino_box_{idx+1}",
                    "bbox": [norm_x_min, norm_y_min, norm_x_max, norm_y_max],
                    "label": f"{label} (open-vocab detection{', SAHI-sliced' if used_tiling else ''})",
                    # Real detection-head confidence — never a placeholder. When SAHI-sliced,
                    # this is still a genuine per-box detection score from the same underlying
                    # post_process_grounded_object_detection call, just run per-tile/per-frame
                    # and merged by SAHI's own (non-heuristic) box-merging logic.
                    "confidence": round(float(score), 3)
                })

            if rejected_count:
                logger.info(
                    f"{rejected_count} of {rejected_count + len(boxes)} raw detection(s) "
                    f"rejected as implausibly large; {len(boxes)} kept."
                )

            return {"boxes": boxes, "ok": True}
        except Exception as e:
            logger.warning(f"Grounding DINO inference failed ({e}).")
            return {"boxes": [], "ok": False}


# Global singleton, following this codebase's existing service pattern.
grounding_dino_service = GroundingDinoService()
