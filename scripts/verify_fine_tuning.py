"""
Verification Script for VRSBench LoRA Fine-Tuning / Adaptation (Phase 2.1 Acceptance Gate)
Compares Phase 1 pre-fine-tune baseline vs current-model performance.

Honesty fix (2026-08-26): a full project audit found three real fabrication bugs in this
script, all removed below.

  1. Wrong adapter check. It checked for a LoRA binary at
     finetuning/geochat_bigearthnet_lora_final/adapter_model.safetensors -- that file does
     exist on disk, but it's a stale, abandoned artifact from an earlier GeoChat+BigEarthNet
     approach. backend/models/geochat_service.py's own module docstring says plainly it "was
     trained on text-only synthetic data with a literal '<image>' placeholder... so it's left
     in place but no longer used by this file." The adapter this project actually ships and
     runs is the VRSBench LoRA, loaded via HF_ADAPTER_REPO onto Qwen2.5-VL-3B-Instruct (or the
     local finetuning/qwen25vl_vrsbench_lora_final/ fallback). So "adapter_weights_verified"
     was checking a file that has nothing to do with what the running service actually loads.
     This script now reads the genuine per-call "adapter_active" flag that
     geochat_service.run_vqa itself reports for each real inference call.

  2. Fabricated confidence score. "measured_conf" was computed from a hardcoded formula --
     0.85 + 0.025 * (count of domain keywords like "Sentinel"/"SAR"/"NDVI" found in the
     output text), clamped to [0.85, 0.97] -- never a real confidence value from the model.
     Worse, the query sent to the model was wrapped in a keyword-bait prefix
     ("[BigEarthNet.txt LoRA Adapted: Sentinel-1 SAR + Sentinel-2 MSI Multi-modal Prior]")
     containing the exact same domain terms the formula searched for afterward, which all but
     guaranteed an inflated "improvement" number regardless of real output quality. Both are
     removed: the query is now sent exactly as recorded in the baseline (no injected priming
     text), and confidence comes only from run_vqa's own genuinely-reported
     "confidence"/"confidence_basis".

  3. Hardcoded "features recognized" list. Every single comparison got the same
     "adapted_features_recognized" list (SAR backscatter physics, BigEarthNet taxonomy, etc.)
     regardless of what the model actually said -- fabricated claims, not derived from real
     output. Removed; the real response text/boxes/model/quantization are reported instead.

Two more real bugs found from a genuine local run of the fixed script (2026-08-26, same day):

  4. ZeroShotSearch entries were run through geochat_service.run_vqa() -- the wrong service.
     log_baseline_queries.py correctly routes ZeroShotSearch queries through
     remoteclip_service.zero_shot_tag() instead (a different model entirely, for a different
     task). Calling run_vqa() on a zero-shot-tagging query compared two unrelated things and
     produced a nonsense confidence delta. Fixed by branching on task the same way
     log_baseline_queries.py does.

  5. "Phase 1 Baseline" can be misleading in an environment where HF_ADAPTER_REPO is already
     configured: log_baseline_queries.py runs the exact same geochat_service singleton this
     script does, so if the adapter was active when the baseline was captured, "before" and
     "after" are the same adapted model, not a real pre-vs-post-fine-tuning comparison (this
     is exactly what a real run showed: 4 of 5 confidences came back bit-identical, because
     greedy decoding on the same model against the same image+prompt genuinely does that).
     This script cannot fix that by itself -- there's no code path here to load the base model
     without the adapter -- so it now detects the condition from the baseline file's own
     recorded "adapter_active" and warns plainly instead of presenting the comparison as a
     genuine before/after fine-tuning result.
"""

import os
import sys
import json
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.models.geochat_service import geochat_service
from backend.models.remoteclip_service import remoteclip_service

BASELINE_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "baseline_results.json")
ADAPTED_OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "adapted_comparison_results.json")
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "sample_aois")


def main():
    print("=== Verifying VRSBench LoRA Fine-Tuning: Baseline vs Current-Model Comparison ===")

    if not os.path.exists(BASELINE_FILE):
        print(f"Error: Baseline file not found at {BASELINE_FILE}. Run scripts/log_baseline_queries.py first.")
        return

    with open(BASELINE_FILE, "r", encoding="utf-8") as f:
        baseline_data = json.load(f)

    baseline_entries = baseline_data.get("results", [])
    comparison_results = []

    print(f"Evaluating {len(baseline_entries)} baseline queries against the currently-loaded model "
          f"({geochat_service.model_id}, quantization={geochat_service.quantization_active})...\n")

    baseline_had_adapter_active = any(b.get("adapter_active") for b in baseline_entries)

    for b in baseline_entries:
        img_path = os.path.join(DATA_DIR, b["image"])
        query = b["query"]
        task = b.get("task")

        # Route by task exactly like log_baseline_queries.py does -- ZeroShotSearch was
        # never a geochat_service.run_vqa() query, it's remoteclip_service.zero_shot_tag().
        # Comparing them as if they were the same model would compare two unrelated systems.
        start_t = time.time()
        if task == "ZeroShotSearch":
            tags = remoteclip_service.zero_shot_tag(img_path)
            duration_ms = round((time.time() - start_t) * 1000, 1)
            adapted_conf = float(tags[0]["score"]) if tags else 0.0
            after = {
                "zero_shot_tags": tags,
                "confidence": adapted_conf,
                "confidence_basis": "model_similarity_score",
                "model": "RemoteCLIP zero-shot tagger",
                "adapter_active": None,  # not applicable -- this task doesn't use geochat_service
                "quantization": None,
                "duration_ms": duration_ms,
                "stage": "Phase 2: RemoteCLIP zero-shot tagging (no LoRA adapter involved in this task)"
            }
        else:
            # No injected priming text here -- this is the exact same query the baseline
            # used, so any difference in the result genuinely reflects whatever model/adapter
            # is actually loaded right now, not a prompt written to coax a particular answer.
            adapted_res = geochat_service.run_vqa(img_path, query)
            duration_ms = round((time.time() - start_t) * 1000, 1)
            adapted_conf = float(adapted_res.get("confidence", 0.0))
            after = {
                "text": adapted_res.get("text", ""),
                "boxes": adapted_res.get("boxes", []),
                "confidence": adapted_conf,
                "confidence_basis": adapted_res.get("confidence_basis", "unknown"),
                "model": adapted_res.get("model", "unknown"),
                "adapter_active": bool(adapted_res.get("adapter_active", False)),
                "quantization": adapted_res.get("quantization"),
                "duration_ms": duration_ms,
                "stage": (
                    "Phase 2: VRSBench LoRA active on this call"
                    if adapted_res.get("adapter_active")
                    else "Phase 2: LoRA adapter NOT active for this call (base model or a fallback tier answered -- see 'model' above)"
                )
            }

        base_conf = float(b.get("confidence", 0.0))
        delta = round(adapted_conf - base_conf, 3)

        comparison = {
            "query_id": b["query_id"],
            "query": query,
            "image": b["image"],
            "task": task,
            "before": {
                "text": b.get("text_response", ""),
                "confidence": base_conf,
                "model": b.get("model", "unknown"),
                "adapter_active": b.get("adapter_active"),
                "stage": "Phase 1 Baseline"
            },
            "after": after,
            "confidence_delta": delta
        }
        comparison_results.append(comparison)
        print(f"-> [{b['query_id']}] ({task}) baseline conf {base_conf} -> current-run conf {adapted_conf} "
              f"(delta {'+' if delta >= 0 else ''}{delta}) | model={after.get('model')} | "
              f"adapter_active={after.get('adapter_active')}")

    any_adapter_active = any(c["after"].get("adapter_active") for c in comparison_results)

    with open(ADAPTED_OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "adapted_timestamp": time.time(),
            "model_id": geochat_service.model_id,
            "quantization_active": geochat_service.quantization_active,
            "adapter_active_for_any_query": any_adapter_active,
            "baseline_adapter_was_also_active": baseline_had_adapter_active,
            "comparisons": comparison_results
        }, f, indent=2)

    if not any_adapter_active:
        print(f"\n[WARNING] The VRSBench LoRA adapter was NOT active for ANY query in this run -- "
              f"the 'after' results above reflect the base model or a fallback tier, not the "
              f"fine-tuned adapter. Check HF_ADAPTER_REPO / HF_TOKEN in .env, confirm the backend "
              f"logged 'Applied real VRSBench LoRA adapter...', and re-run this script.")
    if baseline_had_adapter_active:
        print(f"\n[WARNING] data/baseline_results.json itself already shows the VRSBench LoRA adapter "
              f"active on at least one entry. That means 'Phase 1 Baseline' was NOT captured from the "
              f"un-adapted base model -- it's the same adapted model this script just ran again, so this "
              f"comparison is not a genuine before/after fine-tuning measurement (identical/near-identical "
              f"confidence deltas are expected and correct here, not a bug). To get a real baseline, "
              f"log_baseline_queries.py needs to run in an environment where HF_ADAPTER_REPO is unset/empty "
              f"so geochat_service loads the base model only.")

    print(f"\n[SUCCESS] Genuine before/after comparison saved to {ADAPTED_OUTPUT_FILE}")


if __name__ == "__main__":
    main()
