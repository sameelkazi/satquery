"""
Phase 5 Acceptance Verification Test Suite
Tests all Phase 5 Criteria:
1. Hindi / Multilingual output translation verification
2. Benchmark execution report validation
"""

import os
import sys
import json
import pytest
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.main import handle_query, QueryRequest, ImageItem
from backend.translation import translation_service

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "sample_aois")
BENCHMARK_REPORT = os.path.join(os.path.dirname(__file__), "..", "data", "benchmark_evaluation_report.json")

# 1. Acceptance Criterion 1: Hindi output translation
@pytest.mark.asyncio
async def test_hindi_translation_output():
    req = QueryRequest(
        query="locate buildings in this image",
        images=[
            ImageItem(url_or_path=os.path.join(DATA_DIR, "hyderabad_urban_optical.png"), modality="optical")
        ],
        language="hi"
    )

    res = await handle_query(req)
    assert res.validation["passed"]
    assert len(res.text_response) > 10
    # Must contain Hindi Devanagari characters
    assert any('\u0900' <= char <= '\u097F' for char in res.text_response), "Response must contain Hindi Devanagari text"

# 2. Acceptance Criterion 2: Benchmark report validation
def test_benchmark_report_validation():
    assert os.path.exists(BENCHMARK_REPORT), "Benchmark evaluation report must exist"
    with open(BENCHMARK_REPORT, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    assert data["accuracy_pct"] >= 90.0
    assert len(data["benchmark_results"]) >= 12
    # Verify official ISRO queries passed
    isro_results = [r for r in data["benchmark_results"] if r["id"].startswith("ISRO_")]
    assert len(isro_results) == 5
    for r in isro_results:
        assert r["status"] == "PASS"
