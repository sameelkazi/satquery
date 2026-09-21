"""
Generate real georeferenced GeoTIFF sidecars for the project's own curated demo AOIs.

Why this exists: `data/sample_aois/*.png` are plain PNGs with no embedded geospatial
metadata, so `geo_transform.get_real_georeference()` (correctly, per its own honesty
contract) returns None for them -- which means every change-detection GeoJSON feature
computed on these demo assets gets `area_sq_m: None` ("no real-world scale available"),
even though we actually DO know the true real-world bounds of each of these curated
AOIs (they're recorded in sample_aois_metadata.json's own "bbox" field, e.g. the
Hyderabad AOI's [78.44, 17.385, 78.495, 17.435] is a real place, not a placeholder).

This script does NOT invent any new geospatial fact. It takes the bbox already
recorded in sample_aois_metadata.json for each AOI and writes a same-pixel-dimensions
GeoTIFF sidecar (same basename, .tif extension) next to each PNG, with a real affine
transform (rasterio.transform.from_bounds) and CRS EPSG:4326 embedded, and the exact
same pixel data copied in. This is packaging, not fabrication: the numbers are the
same bbox that was already in the metadata file (and already rendered on the map for
these AOIs elsewhere in the app) -- now just embedded in a format that
`get_real_georeference` recognizes as real georeferencing.

The original .png files are left untouched (still used for on-screen display). The
sidecar .tif is consumed only by `geo_transform.get_real_georeference_with_sidecar`,
added alongside this script, which is the only call site that looks for it.
"""
import json
import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import from_bounds
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
METADATA_PATH = ROOT / "data" / "sample_aois" / "sample_aois_metadata.json"
AOI_DIR = ROOT / "data" / "sample_aois"


def generate_for_file(png_filename: str, bbox: list) -> None:
    png_path = AOI_DIR / png_filename
    if not png_path.exists():
        print(f"[!] Skipping {png_filename}: file not found at {png_path}")
        return

    tif_path = png_path.with_suffix(".tif")

    img = Image.open(png_path).convert("RGB")
    arr = np.array(img)  # (H, W, 3)
    height, width = arr.shape[0], arr.shape[1]

    west, south, east, north = bbox
    transform = from_bounds(west, south, east, north, width, height)

    # rasterio expects (bands, rows, cols)
    band_data = np.transpose(arr, (2, 0, 1))

    with rasterio.open(
        tif_path,
        "w",
        driver="GTiff",
        height=height,
        width=width,
        count=3,
        dtype=band_data.dtype,
        crs="EPSG:4326",
        transform=transform,
    ) as dst:
        dst.write(band_data)

    print(f"[+] Wrote {tif_path.relative_to(ROOT)} ({width}x{height}, bbox={bbox})")


def main():
    with open(METADATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    count = 0
    for aoi in data["sample_aois"]:
        bbox = aoi["bbox"]
        for sensor_key, sensor_info in aoi.get("sensors", {}).items():
            filename = sensor_info.get("file")
            if not filename or not filename.lower().endswith(".png"):
                continue
            generate_for_file(filename, bbox)
            count += 1

    print(f"\n[OK] Generated {count} GeoTIFF sidecar(s).")


if __name__ == "__main__":
    main()
