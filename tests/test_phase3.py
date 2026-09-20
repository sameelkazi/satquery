"""
Phase 3 Acceptance Verification Test Suite
Tests all Phase 3 Acceptance Criteria:
1. Full pipeline execution end-to-end (validation -> router -> model(s) -> RAG -> execution summary)
2. Response payload size < 50KB for typical queries
3. Downloadable execution summary report generation (PDF & JSON)
4. RAG vector store context retrieval and grounding
"""

import os
import sys
import json
import pytest
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.main import handle_query, get_execution_report, download_pdf_report, QueryRequest, ImageItem, REPORTS_DB
from backend.rag.vector_store import rag_store
from backend.geo.tile_service import tile_service

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "sample_aois")

# 1. Test RAG Vector Store retrieval
def test_rag_vector_store_retrieval():
    query = "What is the spectral characteristic of built-up urban settlements?"
    hits = rag_store.retrieve_relevant_context(query, top_k=2)
    assert len(hits) > 0
    assert any("built-up" in h["entry"]["entity"].lower() or "lulc" in h["entry"]["code"].lower() for h in hits)
    
    prompt_prefix = rag_store.build_rag_prompt_prefix(query)
    assert prompt_prefix is not None
    assert "Bhuvan LULC" in prompt_prefix

# 2. Test Low-Bandwidth Geo Tile Cropping & Payload Size (<50KB)
def test_low_bandwidth_tile_payload():
    img_path = os.path.join(DATA_DIR, "hyderabad_urban_optical.png")
    image_bbox = [78.4400, 17.3850, 78.4950, 17.4350]
    viewport_bbox = [78.4500, 17.3950, 78.4850, 17.4250]

    cropped_img = tile_service.crop_tile_by_bbox(img_path, image_bbox, viewport_bbox, target_size=(512, 512))
    assert cropped_img.size == (512, 512)

    jpeg_bytes = tile_service.get_compressed_jpeg_bytes(cropped_img, quality=75)
    size_kb = len(jpeg_bytes) / 1024.0
    print(f"Cropped tile compressed payload size: {size_kb:.2f} KB")
    assert size_kb < 50.0, f"Payload size must be < 50KB, got {size_kb:.2f} KB"

# 3. Test End-to-End Query Execution & Downloadable Report Generation (PDF & JSON)
@pytest.mark.asyncio
async def test_end_to_end_and_downloadable_report():
    req = QueryRequest(
        query="locate buildings in this image",
        images=[
            ImageItem(url_or_path=os.path.join(DATA_DIR, "hyderabad_urban_optical.png"), modality="optical")
        ],
        viewport_bbox=[78.4400, 17.3850, 78.4950, 17.4350]
    )

    res = await handle_query(req)
    assert res.validation["passed"]
    assert len(res.text_response) > 10
    assert len(res.boxes) > 0
    assert res.execution_summary["confidence"] >= 0.60, f"Expected confidence >= 0.60, got {res.execution_summary['confidence']}"

    query_id = res.query_id
    assert query_id in REPORTS_DB

    # Test JSON Report retrieval
    json_rep = await get_execution_report(query_id)
    assert json_rep.status_code == 200
    parsed_json = json.loads(json_rep.body.decode('utf-8'))
    assert parsed_json["query_id"] == query_id
    assert "execution_summary" in parsed_json

    # Test PDF Report generation
    pdf_resp = await download_pdf_report(query_id)
    assert pdf_resp.status_code == 200
    assert pdf_resp.media_type == "application/pdf"
    assert len(pdf_resp.body) > 1000 # Valid non-empty PDF bytes
    assert pdf_resp.body.startswith(b"%PDF")
