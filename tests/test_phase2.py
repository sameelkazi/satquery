"""
Phase 2 Acceptance Verification Test Suite
Tests all 6 Phase 2 Acceptance Criteria defined in the PRD.
"""

import os
import sys
import json
import pytest
import asyncio
from typing import Dict, Any

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.validation import input_validator
from backend.router import agentic_router
from backend.models.geochat_service import geochat_service
from backend.models.changeformer_service import changeformer_service
from backend.models.sar_fusion_service import sar_fusion_service
from backend.models.remoteclip_service import remoteclip_service

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "sample_aois")
BASELINE_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "baseline_results.json")
ADAPTED_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "adapted_comparison_results.json")

# 1. Acceptance Criterion 1: Fine-tuning difference logged
def test_fine_tuning_difference_logged():
    # Honesty fix (2026-08-26): this used to assert data["adapter_binary_present"] is True,
    # tied to scripts/verify_fine_tuning.py's old check of a stale, unused adapter path
    # (finetuning/geochat_bigearthnet_lora_final/) -- fixed there to report the real,
    # per-call "adapter_active" flag from geochat_service.run_vqa instead. This test now
    # checks the genuine fields that script actually produces, without asserting a specific
    # outcome for adapter_active (that's an honest fact about the environment the script was
    # run in, not something a test should force to a particular value).
    assert os.path.exists(ADAPTED_FILE), "Adapted comparison results must exist."
    with open(ADAPTED_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert "adapter_active_for_any_query" in data
    comparisons = data.get("comparisons", [])
    assert len(comparisons) >= 5, "Must contain at least 5 evaluated queries."
    for comp in comparisons:
        assert "confidence_basis" in comp["after"]
        assert "adapter_active" in comp["after"]
        assert "model" in comp["after"]

# 2. Acceptance Criterion 2: Input validation rejects 3 bad-input test cases
def test_input_validation_bad_cases():
    # Bad Case A: Missing modality tag
    case_a = input_validator.validate_request(
        query="locate buildings",
        images=[{"url_or_path": "data/sample_aois/hyderabad_urban_optical.png"}] # missing modality
    )
    assert not case_a["passed"]
    assert any("modality" in err.lower() for err in case_a["errors"])

    # Bad Case B: Bi-temporal change task with only 1 image
    case_b = input_validator.validate_request(
        query="What changed between the two dates?",
        images=[{"url_or_path": "data/sample_aois/brahmaputra_flood_optical_t1.png", "modality": "optical"}]
    )
    assert not case_b["passed"]
    assert any("bi-temporal" in err.lower() or "2 co-registered" in err.lower() for err in case_b["errors"])

    # Bad Case C: Unsupported file format
    case_c = input_validator.validate_request(
        query="Describe the scene",
        images=[{"url_or_path": "data/sample_aois/satellite_data.xyz_corrupt", "modality": "optical"}]
    )
    assert not case_c["passed"]
    assert any("unsupported" in err.lower() for err in case_c["errors"])

# 3. Acceptance Criterion 3: Router correctly classifies at least 8/10 test queries
def test_agentic_router_classification():
    test_queries = [
        ("Locate all residential buildings in this area", "Grounding", "Optical"),
        ("Highlight the boundaries of the lake and canal", "Grounding", "Optical"),
        ("What changed between Time 1 and Time 2 in the flood basin?", "ChangeDetection_CDVQA", "Optical"),
        ("Has the built-up area increased, decreased, or remained unchanged?", "ChangeDetection_CDVQA", "Optical"),
        ("Use the optical and SAR images together to identify built-up and water regions", "CrossModalFusion", "Fused"),
        ("Extract microwave radar backscatter information with optical multi-spectral data", "CrossModalFusion", "Fused"),
        ("Classify the zero-shot land-cover categories in this patch", "ZeroShotSearch", "Optical"),
        ("Tag the dominant surface categories present", "ZeroShotSearch", "Optical"),
        ("Describe the land-cover and major objects visible in this image", "VQA", "Optical"),
        ("What type of crops are growing in this sector?", "VQA", "Optical")
    ]
    
    correct_count = 0
    for query, exp_task, exp_mod in test_queries:
        num_imgs = 2 if exp_task in ["ChangeDetection_CDVQA", "CrossModalFusion"] else 1
        mods = ["optical", "sar"] if exp_task == "CrossModalFusion" else ["optical"]
        route = agentic_router.route_query(query, num_images=num_imgs, modalities_present=mods)
        if route["task"] == exp_task and route["modality"] == exp_mod:
            correct_count += 1
            
    assert correct_count >= 8, f"Router accuracy must be >= 80%, got {correct_count}/10"

# 4. Acceptance Criterion 4: Change detection mask + CDVQA natural language answer
def test_change_detection_and_cdvqa():
    img_t1 = os.path.join(DATA_DIR, "brahmaputra_flood_optical_t1.png")
    img_t2 = os.path.join(DATA_DIR, "brahmaputra_flood_optical_t2.png")
    
    change_res = changeformer_service.detect_change(img_t1, img_t2)
    assert "geojson" in change_res
    assert change_res["geojson"]["type"] == "FeatureCollection"
    assert change_res["change_percentage"] > 0, "Change percentage must be > 0%"
    assert change_res["confidence"] > 0.70

    query = "What changed between these two dates and where did the change occur?"
    # Regression fix (2026-08-26): run_cdvqa now returns a dict (was a bare string) so
    # main.py can credit the model that actually produced the text -- see
    # backend/models/changeformer_service.py's run_cdvqa docstring for the audit-trail bug
    # that fixed. This test was left asserting on the old string shape and would now fail
    # with a TypeError; updated to read the dict's "text" field.
    cdvqa_res = changeformer_service.run_cdvqa(img_t1, img_t2, change_res, query)
    cdvqa_text = cdvqa_res["text"]
    assert len(cdvqa_text) > 30
    assert "change" in cdvqa_text.lower() or "altered" in cdvqa_text.lower()

# 5. Acceptance Criterion 5: SAR fusion enriches response compared to optical-only
def test_optical_sar_cross_modal_fusion():
    opt_img = os.path.join(DATA_DIR, "hyderabad_urban_optical.png")
    sar_img = os.path.join(DATA_DIR, "hyderabad_urban_sar.png")
    query = "Identify built-up and water covered regions using optical and SAR"

    # Optical only
    opt_res = geochat_service.run_vqa(opt_img, query)
    
    # Fused
    fused_res = sar_fusion_service.run_fused_vqa(opt_img, sar_img, query, geochat_service)
    
    assert "sar_stats" in fused_res
    # Fixed 2026-08-26: sar_fusion_service.extract_sar_features() actually returns
    # "mean_backscatter_db_proxy" (explicitly named "_proxy" since it's a linear rescale,
    # not a radiometrically calibrated Sigma0 value — see that file's module docstring).
    # This test asserted the wrong key name and would fail with a KeyError-adjacent
    # AssertionError on any real run, independent of the CDVQA/fusion tier-order fix in
    # this same test file's other test.
    assert "mean_backscatter_db_proxy" in fused_res["sar_stats"]
    assert "SAR" in fused_res["text"] or "radar" in fused_res["text"] or "backscatter" in fused_res["text"]
    assert fused_res["confidence"] >= opt_res["confidence"], "Cross-modal fusion must provide higher/equal confidence."

# 6. Acceptance Criterion 6: Parallel async execution
@pytest.mark.asyncio
async def test_parallel_async_execution():
    from backend.main import handle_query, QueryRequest, ImageItem
    
    req = QueryRequest(
        query="What changed between Time 1 and Time 2?",
        images=[
            ImageItem(url_or_path=os.path.join(DATA_DIR, "brahmaputra_flood_optical_t1.png"), modality="optical"),
            ImageItem(url_or_path=os.path.join(DATA_DIR, "brahmaputra_flood_optical_t2.png"), modality="optical")
        ],
        viewport_bbox=[91.70, 26.15, 91.78, 26.22]
    )
    
    res = await handle_query(req)
    assert res.validation["passed"]
    assert res.change_mask_geojson is not None
    assert res.change_vqa_answer is not None
    assert res.latency_ms > 0
    assert "ChangeFormer-LEVIR-CD" in res.execution_summary["models_used"]
