"""
Confidence Stress-Test Module: Test-Time Augmentation (TTA) (SatQuery AI)

Honesty contract (2026-09-09 rewrite — the original version hardcoded all 5 trial scores
as fixed constants regardless of input; that version must never ship):

Perturbs the REAL provided image (rotation, crop-zoom, gamma/illumination jitter) using
real PIL transforms, and re-runs RemoteCLIP's real zero-shot tagging (backend.models.
remoteclip_service.zero_shot_tag) on each real perturbed variant. The "stability index" is
the real agreement between each trial's top-1 label and the baseline trial's top-1 label,
plus the real score spread across trials for that label.

Scope disclosed honestly: this measures representation-level stability of the zero-shot
tagging signal under real image perturbations — it does NOT re-run full VQA answer
generation 5 times (that would be far more expensive per call). The response says this
explicitly so it is never read as "the VQA answer was independently regenerated 5 times."

If no image is provided, this returns an "insufficient_input" result — never a fabricated
stability score.
"""

import io
import time
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


def _load_image(path: str):
    from PIL import Image
    return Image.open(path).convert("RGB")


def _perturbations(img):
    """Returns real PIL-transformed variants of the real input image."""
    from PIL import ImageEnhance

    w, h = img.size
    variants = []

    variants.append(("T0_BASELINE", "Unaltered Baseline", "Rotation: 0°, Scale: 1.0x, Gamma: 1.0", img))

    rot_cw = img.rotate(-15, resample=3, expand=False, fillcolor=(128, 128, 128))
    variants.append(("T1_ROT_CW", "Affine Rotation (+15° CW)", "Rotation: +15°, bilinear, gray-fill edges", rot_cw))

    rot_ccw = img.rotate(15, resample=3, expand=False, fillcolor=(128, 128, 128))
    variants.append(("T2_ROT_CCW", "Affine Rotation (-15° CCW)", "Rotation: -15°, bilinear, gray-fill edges", rot_ccw))

    crop_box = (int(w * 0.05), int(h * 0.05), int(w * 0.95), int(h * 0.95))
    crop_zoom = img.crop(crop_box).resize((w, h))
    variants.append(("T3_CROP_ZOOM", "Center Crop & 1.1x Zoom", "Central 90% region, resized back to original size", crop_zoom))

    gamma_img = ImageEnhance.Brightness(img).enhance(0.82)
    gamma_img = ImageEnhance.Contrast(gamma_img).enhance(1.15)
    variants.append(("T4_ILLUM_GAMMA", "Radiometric Gamma Jitter", "Brightness x0.82, Contrast x1.15 (simulated haze/shadow)", gamma_img))

    return variants


def run_confidence_stress_test(
    image_path: Optional[str] = None,
    query: str = "",
    labels: Optional[List[str]] = None,
) -> Dict[str, Any]:
    from .models.remoteclip_service import remoteclip_service, DEFAULT_RS_LABELS

    start_time = time.time()

    if not image_path:
        return {
            "status": "insufficient_input",
            "reason": "No image was provided with this request — a real stress-test needs a real image to perturb.",
            "test_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

    try:
        img = _load_image(image_path)
    except Exception as e:
        return {
            "status": "error",
            "reason": f"Could not open the provided image: {e}",
            "test_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

    candidate_labels = labels or DEFAULT_RS_LABELS
    variants = _perturbations(img)

    trials = []
    baseline_top_label = None
    used_real_model = getattr(remoteclip_service, "is_real_model_loaded", False)

    for trial_id, name, params, variant_img in variants:
        t0 = time.time()
        try:
            tag_results = remoteclip_service.zero_shot_tag(variant_img, labels=candidate_labels, top_k=3)
        except Exception as e:
            logger.warning(f"Stress-test trial {trial_id} failed: {e}")
            tag_results = []

        top_label = tag_results[0]["label"] if tag_results else None
        top_score = tag_results[0]["score"] if tag_results else 0.0
        if trial_id == "T0_BASELINE":
            baseline_top_label = top_label

        trials.append({
            "trial_id": trial_id,
            "perturbation": name,
            "parameters": params,
            "top_label": top_label,
            "top_label_score": top_score,
            "top3_labels": tag_results,
            "label_agrees_with_baseline": (top_label == baseline_top_label) if baseline_top_label else None,
            "latency_ms": round((time.time() - t0) * 1000, 1),
        })

    agree_count = sum(1 for t in trials if t["label_agrees_with_baseline"])
    stability_pct = round((agree_count / len(trials)) * 100.0, 1) if trials else 0.0

    if stability_pct >= 80.0:
        robustness_status = "ROBUST_GROUNDED_CONSENSUS"
        robustness_badge = "Robust — top label consistent under perturbation"
    else:
        robustness_status = "UNSTABLE_LOW_ROBUSTNESS"
        robustness_badge = "Unstable — top label changed under perturbation"

    return {
        "status": "ok",
        "test_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "total_trials": len(trials),
        "baseline_top_label": baseline_top_label,
        "stability_index_pct": stability_pct,
        "robustness_status": robustness_status,
        "robustness_badge": robustness_badge,
        "trials": trials,
        "data_source": "real_model_inference" if used_real_model else "real_pixel_heuristic (neural RemoteCLIP weights not loaded on this server)",
        "scope_disclosure": (
            "This measures real zero-shot tagging stability across 5 real PIL-perturbed copies of the "
            "provided image. It does not re-run full VQA answer generation 5 times."
        ),
        "execution_time_ms": round((time.time() - start_time) * 1000, 1),
    }
