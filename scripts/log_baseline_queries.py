"""
Phase 1 Baseline Query Logger
Runs baseline (pre-fine-tuning) inference across sample Indian AOIs and logs results for Phase 2 before/after comparison.

Honesty fix (2026-08-26): the "model" fallback default used to be the stale name
"GeoChat-7B" (an earlier, abandoned base model this project no longer uses -- see
backend/models/geochat_service.py's module docstring for why it was replaced with
Qwen2.5-VL-3B-Instruct). geochat_service.run_vqa always includes a real "model" key in
practice, so this default should essentially never fire, but it's changed to a neutral
"unknown" so it can never silently print a false model name if it ever does.
"""

import os
import sys
import json
import time

# Add root directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.models.geochat_service import geochat_service
from backend.models.remoteclip_service import remoteclip_service

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "sample_aois")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "baseline_results.json")

BASELINE_QUERIES = [
    {
        "query_id": "base_01",
        "task": "Grounding",
        "query": "locate buildings in this image",
        "image_file": "hyderabad_urban_optical.png",
        "aoi": "Hyderabad Urban Corridor"
    },
    {
        "query_id": "base_02",
        "task": "VQA",
        "query": "Describe the land-cover and major objects visible in this image",
        "image_file": "hyderabad_urban_optical.png",
        "aoi": "Hyderabad Urban Corridor"
    },
    {
        "query_id": "base_03",
        "task": "ZeroShotSearch",
        "query": "Zero-shot classification of land-cover categories",
        "image_file": "punjab_agribelt_optical.png",
        "aoi": "Ludhiana Intensive Agricultural Belt"
    },
    {
        "query_id": "base_04",
        "task": "VQA",
        "query": "Highlight the water body and river channel",
        "image_file": "brahmaputra_flood_optical_t1.png",
        "aoi": "Brahmaputra Flood Basin (Pre-flood)"
    },
    {
        "query_id": "base_05",
        "task": "VQA",
        "query": "What type of agricultural crops or vegetation are present?",
        "image_file": "punjab_agribelt_optical.png",
        "aoi": "Ludhiana Agricultural Belt"
    }
]

def main():
    print("=== Running Phase 1 Baseline Inference & Logging ===")
    results = []
    
    for q in BASELINE_QUERIES:
        img_path = os.path.join(DATA_DIR, q["image_file"])
        print(f"\n[Running {q['query_id']}] '{q['query']}' on {q['image_file']}...")
        
        start_t = time.time()
        if q["task"] == "ZeroShotSearch":
            tags = remoteclip_service.zero_shot_tag(img_path)
            duration_ms = round((time.time() - start_t) * 1000, 1)
            entry = {
                "query_id": q["query_id"],
                "query": q["query"],
                "aoi": q["aoi"],
                "task": q["task"],
                "image": q["image_file"],
                "duration_ms": duration_ms,
                "zero_shot_tags": tags,
                "confidence": float(tags[0]["score"]) if tags else 0.85,
                "adaptation_stage": "Pre-fine-tuning Baseline"
            }
        else:
            vqa_res = geochat_service.run_vqa(img_path, q["query"])
            duration_ms = round((time.time() - start_t) * 1000, 1)
            entry = {
                "query_id": q["query_id"],
                "query": q["query"],
                "aoi": q["aoi"],
                "task": q["task"],
                "image": q["image_file"],
                "duration_ms": duration_ms,
                "text_response": vqa_res["text"],
                "boxes": vqa_res["boxes"],
                "confidence": vqa_res["confidence"],
                "confidence_basis": vqa_res.get("confidence_basis", "unknown"),
                "model": vqa_res.get("model", "unknown"),
                "adapter_active": vqa_res.get("adapter_active", False),
                "adaptation_stage": "Pre-fine-tuning Baseline"
            }
            
        results.append(entry)
        print(f"-> Completed in {duration_ms}ms | Confidence: {entry['confidence']}")
        if "boxes" in entry and entry["boxes"]:
            print(f"-> Detected {len(entry['boxes'])} bounding boxes: {entry['boxes']}")

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump({"baseline_run_timestamp": time.time(), "results": results}, f, indent=2)
        
    print(f"\n[SUCCESS] Baseline results logged to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
