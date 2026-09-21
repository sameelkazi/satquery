"""
SatQuery AI — Official ISRO & Multi-Task Benchmark Suite (Phase 5)
Evaluates the full agentic pipeline across 12 remote-sensing benchmark queries (VQA, Grounding, ChangeDetection, SAR Fusion, ZeroShot),
including the PS's own 5 official ISRO representative queries (ISRO_01-05).

Honesty note (2026-08-26): the routing/accuracy/latency measurement in this script is
genuine -- it calls handle_query() directly and times real execution, not mocked. The one
real bug found in a full audit was the summary print block claiming a fixed quantization
mode and adapter identity regardless of what actually ran; that's fixed below to read the
live geochat_service state instead. See scripts/verify_fine_tuning.py's docstring for a
related, more serious set of fabrication bugs found and fixed in that script.
"""

import os
import sys
import json
import time
import asyncio
from typing import Optional

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.main import handle_query, QueryRequest, ImageItem
from backend.models.geochat_service import geochat_service

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "sample_aois")
OUTPUT_BENCHMARK = os.path.join(os.path.dirname(__file__), "..", "data", "benchmark_evaluation_report.json")

BENCHMARK_SUITE = [
    # --- Official 5 ISRO Problem Statement Representative Queries ---
    {
        "id": "ISRO_01",
        "category": "Mandatory Single-Image VQA",
        "query": "Describe the land-cover and major objects visible in this image",
        "image_file": "hyderabad_urban_optical.png",
        "modality": "optical",
        "expected_task": "VQA"
    },
    {
        "id": "ISRO_02",
        "category": "Mandatory Text-Guided Grounding",
        "query": "Highlight the water body referred to in the query",
        "image_file": "hyderabad_urban_optical.png",
        "modality": "optical",
        "expected_task": "Grounding"
    },
    {
        "id": "ISRO_03",
        "category": "Mandatory Bi-temporal CDVQA",
        "query": "What changed between these two dates, and where did the change occur?",
        "image_files": ["brahmaputra_flood_optical_t1.png", "brahmaputra_flood_optical_t2.png"],
        "modalities": ["optical", "optical"],
        "expected_task": "ChangeDetection_CDVQA"
    },
    {
        "id": "ISRO_04",
        "category": "Mandatory Optical-SAR Cross-Modal Fusion",
        "query": "Use the optical and SAR images together to identify built-up and water-covered regions",
        "image_files": ["hyderabad_urban_optical.png", "hyderabad_urban_sar.png"],
        "modalities": ["optical", "sar"],
        "expected_task": "CrossModalFusion"
    },
    {
        "id": "ISRO_05",
        "category": "Mandatory Bi-temporal Change Dynamic",
        "query": "Has the built-up area increased, decreased, or remained unchanged?",
        "image_files": ["brahmaputra_flood_optical_t1.png", "brahmaputra_flood_optical_t2.png"],
        "modalities": ["optical", "optical"],
        "expected_task": "ChangeDetection_CDVQA"
    },

    # --- Additional Indian AOI Generalization Queries ---
    {
        "id": "BENCH_06",
        "category": "Grounding",
        "query": "locate buildings in this image",
        "image_file": "hyderabad_urban_optical.png",
        "modality": "optical",
        "expected_task": "Grounding"
    },
    {
        "id": "BENCH_07",
        "category": "Zero-Shot Tagging",
        "query": "Classify the zero-shot land-cover categories in this patch",
        "image_file": "punjab_agribelt_optical.png",
        "modality": "optical",
        "expected_task": "ZeroShotSearch"
    },
    {
        "id": "BENCH_08",
        "category": "Agricultural VQA",
        "query": "What type of agricultural crops or vegetation are present?",
        "image_file": "punjab_agribelt_optical.png",
        "modality": "optical",
        "expected_task": "VQA"
    },
    {
        "id": "BENCH_09",
        "category": "Flood Hazard VQA",
        "query": "Assess the extent of riverine water overflow near the embankments",
        "image_file": "brahmaputra_flood_optical_t2.png",
        "modality": "optical",
        "expected_task": "VQA"
    },
    {
        "id": "BENCH_10",
        "category": "SAR Backscatter Analysis",
        "query": "Extract microwave radar backscatter features and identify corner reflectors",
        "image_files": ["hyderabad_urban_optical.png", "hyderabad_urban_sar.png"],
        "modalities": ["optical", "sar"],
        "expected_task": "CrossModalFusion"
    },
    {
        "id": "BENCH_11",
        "category": "Infrastructure Grounding",
        "query": "Find and outline the road network and transportation intersections",
        "image_file": "hyderabad_urban_optical.png",
        "modality": "optical",
        "expected_task": "Grounding"
    },
    {
        "id": "BENCH_12",
        "category": "Bi-temporal Inundation Quantification",
        "query": "Measure the difference in surface water between Time 1 and Time 2",
        "image_files": ["brahmaputra_flood_optical_t1.png", "brahmaputra_flood_optical_t2.png"],
        "modalities": ["optical", "optical"],
        "expected_task": "ChangeDetection_CDVQA"
    }
]

async def run_benchmark(target_query_id: Optional[str] = None):
    print("=" * 80)
    print("     SatQuery AI — Official ISRO SIH26167 Benchmark Evaluation Suite")
    print("=" * 80)

    existing_report = None
    if target_query_id and os.path.exists(OUTPUT_BENCHMARK):
        try:
            with open(OUTPUT_BENCHMARK, "r", encoding="utf-8") as f:
                existing_report = json.load(f)
        except Exception as e:
            logger.warning(f"Could not load existing report: {e}")

    suite_to_run = BENCHMARK_SUITE
    if target_query_id:
        suite_to_run = [item for item in BENCHMARK_SUITE if item["id"].lower() == target_query_id.lower()]
        if not suite_to_run:
            print(f"Error: Query ID '{target_query_id}' not found in benchmark suite.")
            return

    print(f"Executing {len(suite_to_run)} benchmark quer{'y' if len(suite_to_run) == 1 else 'ies'}...\n")

    executed_results = []
    print(f"{'ID':<9} | {'Category':<32} | {'Task':<20} | {'Latency':<8} | {'Conf':<6} | {'Status'}")
    print("-" * 90)

    for item in suite_to_run:
        if "image_files" in item:
            images = [
                ImageItem(url_or_path=os.path.join(DATA_DIR, f), modality=m)
                for f, m in zip(item["image_files"], item["modalities"])
            ]
        else:
            images = [ImageItem(url_or_path=os.path.join(DATA_DIR, item["image_file"]), modality=item["modality"])]

        req = QueryRequest(query=item["query"], images=images)
        start_t = time.time()
        res = await handle_query(req)
        duration_ms = round((time.time() - start_t) * 1000, 1)

        routed_task = res.route_taken.get("task", "Unknown")
        is_correct_task = (routed_task == item["expected_task"])
        has_content = len(res.text_response.strip()) >= 5
        conf = res.execution_summary.get("confidence", 0.0)
        
        status = "PASS" if (is_correct_task and has_content) else "FAIL"
        print(f"{item['id']:<9} | {item['category']:<32} | {routed_task:<20} | {duration_ms:>6.1f}ms | {conf*100:>4.0f}% | [ {status} ]", flush=True)

        executed_results.append({
            "id": item["id"],
            "category": item["category"],
            "query": item["query"],
            "expected_task": item["expected_task"],
            "routed_task": routed_task,
            "latency_ms": duration_ms,
            "confidence": conf,
            "status": status,
            "text_response": res.text_response,
            "boxes_count": len(res.boxes),
            "change_mask_present": res.change_mask_geojson is not None
        })

        import gc
        gc.collect()
        try:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        except Exception:
            pass

    # Combine with existing report if running a subset
    if existing_report and "benchmark_results" in existing_report:
        merged_dict = {r["id"]: r for r in existing_report["benchmark_results"]}
        for r in executed_results:
            merged_dict[r["id"]] = r
        # Preserve original suite order
        final_results = [merged_dict[item["id"]] for item in BENCHMARK_SUITE if item["id"] in merged_dict]
    else:
        final_results = executed_results

    passed_count = sum(1 for r in final_results if r.get("status") == "PASS")
    total_count = len(final_results)
    total_latency = sum(r.get("latency_ms", 0.0) for r in final_results)
    avg_latency = round(total_latency / total_count, 2) if total_count else 0.0
    accuracy_pct = round((passed_count / total_count) * 100, 1) if total_count else 0.0

    print("-" * 90)
    print(f"\n[BENCHMARK SUMMARY]")
    print(f"• Total Queries in Report: {total_count}")
    print(f"• Success / Accuracy Rate: {passed_count}/{total_count} ({accuracy_pct}%)")
    print(f"• Average Latency:         {avg_latency} ms / query")
    print(f"• Quantization Mode:       {geochat_service.quantization_active or 'none (no local GPU model loaded)'}")
    if geochat_service.adapter_active:
        print(f"• Remote Sensing Adapter:  VRSBench LoRA (rank=16, alpha=32) -- active on {geochat_service.model_id}")
    else:
        print(f"• Remote Sensing Adapter:  NOT active for this run (base {geochat_service.model_id} only, or a fallback tier answered instead)")

    # Save to disk
    os.makedirs(os.path.dirname(OUTPUT_BENCHMARK), exist_ok=True)
    with open(OUTPUT_BENCHMARK, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": time.time(),
            "accuracy_pct": accuracy_pct,
            "avg_latency_ms": avg_latency,
            "model_id": geochat_service.model_id,
            "quantization_active": geochat_service.quantization_active,
            "adapter_active": geochat_service.adapter_active,
            "benchmark_results": final_results
        }, f, indent=2)

    print(f"\n[REPORT SAVED] Benchmark report written to {OUTPUT_BENCHMARK}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Run SatQuery ISRO Benchmark Suite")
    parser.add_argument("--query-id", type=str, default=None, help="Run only a specific query ID (e.g. BENCH_09)")
    args = parser.parse_args()

    asyncio.run(run_benchmark(target_query_id=args.query_id))
