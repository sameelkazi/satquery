"""
Grid Anomaly Sweep Module (SatQuery AI - ISRO / SIH26167)

Honesty contract (2026-09-09 rewrite — the original version hardcoded a fixed "Top 10
Anomalies" list naming real Indian government agencies against entirely fictional
incidents, with a timestamp set to "today" to look live; that version must never ship):

Splits a REAL bundled AOI image into a real N x N grid of pixel crops (genuine
`Image.crop()`), and runs RemoteCLIP's real zero-shot tagging on each real crop against a
fixed anomaly-category taxonomy. Ranks crops by their real top-1 similarity score. This is
a real automated *screening* signal computed from real pixels — it is not a live radar/
satellite feed, and every returned item says so.

No fabricated agency attribution to a specific incident: the "typical_regulator" field is
static reference text about the category in general, never a claim that a violation
occurred at that tile.

If the requested AOI has no real bundled image on this server, this returns an honest
"no_imagery_available" result — never a fabricated leaderboard.
"""

import os
import time
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

ANOMALY_TAXONOMY = [
    "sand dredging pit",
    "lake bed land reclamation",
    "clear-cut logging patch",
    "unauthorized construction cluster",
    "industrial effluent discharge",
    "crop residue burning scar",
    "quarry excavation",
    "waterlogged settlement",
    "undisturbed vegetation",
    "normal urban fabric",
]

_TYPICAL_REGULATOR = {
    "sand dredging pit": "State Dept. of Mines & Geology (reference only)",
    "lake bed land reclamation": "State Lake/Wetland Protection Authority (reference only)",
    "clear-cut logging patch": "Forest Department / MoEFCC (reference only)",
    "unauthorized construction cluster": "Urban Development Authority (reference only)",
    "industrial effluent discharge": "State Pollution Control Board / CPCB (reference only)",
    "crop residue burning scar": "ICAR / State Agriculture Dept. (reference only)",
    "quarry excavation": "State Dept. of Mines & Geology (reference only)",
    "waterlogged settlement": "NDMA / Municipal Drainage Authority (reference only)",
    "undisturbed vegetation": None,
    "normal urban fabric": None,
}

# AOIs this server actually has a real bundled raster for.
_REAL_AOI_IMAGES = {
    "aoi_01_hyderabad": "hyderabad_urban_optical.png",
    "aoi_02_brahmaputra": "brahmaputra_flood_optical_t2.png",
    "aoi_03_punjab": "punjab_agribelt_optical.png",
}


def generate_grid_anomaly_sweep(
    aoi_id: str,
    aoi_name: str,
    bbox: Optional[List[float]] = None,
    grid_size: int = 4,
    image_path: Optional[str] = None,
) -> Dict[str, Any]:
    from PIL import Image
    from .models.remoteclip_service import remoteclip_service

    start_time = time.time()

    resolved_path = image_path
    if not resolved_path:
        filename = _REAL_AOI_IMAGES.get(aoi_id)
        if filename:
            resolved_path = os.path.join(os.path.dirname(__file__), "..", "data", "sample_aois", filename)

    if not resolved_path or not os.path.exists(resolved_path):
        return {
            "status": "no_imagery_available",
            "reason": f"No real bundled or supplied image is available for AOI '{aoi_id}' — a sweep needs a real raster to tile and score.",
            "aoi_id": aoi_id,
            "aoi_name": aoi_name,
        }

    try:
        img = Image.open(resolved_path).convert("RGB")
    except Exception as e:
        return {"status": "error", "reason": f"Could not open image: {e}", "aoi_id": aoi_id}

    w, h = img.size
    tile_w, tile_h = w // grid_size, h // grid_size
    used_real_model = getattr(remoteclip_service, "is_real_model_loaded", False)

    zones = []
    for row in range(grid_size):
        for col in range(grid_size):
            box = (col * tile_w, row * tile_h, (col + 1) * tile_w, (row + 1) * tile_h)
            tile_img = img.crop(box)
            zone_id = f"{chr(65 + row)}{col + 1}"

            try:
                tag_results = remoteclip_service.zero_shot_tag(tile_img, labels=ANOMALY_TAXONOMY, top_k=3)
            except Exception as e:
                logger.warning(f"Zone {zone_id} tagging failed: {e}")
                tag_results = []

            top = tag_results[0] if tag_results else None
            hectares = None
            if bbox and len(bbox) == 4:
                west, south, east, north = bbox
                lon_span = (east - west) / grid_size
                lat_span = (north - south) / grid_size
                import math
                mid_lat_rad = ((south + north) / 2.0) * math.pi / 180.0
                km_per_deg_lat = 111.32
                km_per_deg_lon = 111.32 * max(0.05, abs(math.cos(mid_lat_rad)))
                hectares = round(lon_span * km_per_deg_lon * lat_span * km_per_deg_lat * 100.0, 2)

            zones.append({
                "zone_id": zone_id,
                "pixel_box": list(box),
                "top_label": top["label"] if top else None,
                "top_score": top["score"] if top else None,
                "top3_labels": tag_results,
                "typical_regulator_reference": _TYPICAL_REGULATOR.get(top["label"], None) if top else None,
                "estimated_hectares": hectares,
                "is_notable": bool(top and top["label"] not in ("undisturbed vegetation", "normal urban fabric") and top["score"] > 0.3),
            })

    ranked = sorted(
        [z for z in zones if z["is_notable"]],
        key=lambda z: z["top_score"] or 0.0,
        reverse=True,
    )

    return {
        "status": "ok",
        "sweep_id": f"SWEEP-{int(time.time())}",
        "aoi_id": aoi_id,
        "aoi_name": aoi_name,
        "grid_size": f"{grid_size}x{grid_size}",
        "total_zones_scanned": len(zones),
        "notable_zones_count": len(ranked),
        "top_anomalies": ranked[:10],
        "all_zones": zones,
        "data_source": "real_model_inference" if used_real_model else "real_pixel_heuristic (neural RemoteCLIP weights not loaded on this server)",
        "scope_disclosure": (
            "This is a real zero-shot similarity screen over real crops of this server's own bundled AOI "
            "image — not a live daily satellite feed. Scores are a screening signal, not confirmed findings."
        ),
        "execution_latency_ms": round((time.time() - start_time) * 1000, 1),
    }
