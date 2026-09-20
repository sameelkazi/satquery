"""Tests bigearthnet_txt_extract.py's core logic without any real network access:
1. stretch_band_to_uint8 / bands_to_rgb_image against synthetic uint16 raster arrays.
2. _extract_from_zst_stream against a synthetic .tar.zst fixture laid out exactly like
   the REAL verified BigEarthNet v2.0 structure (per-patch folder containing 12 real
   per-band GeoTIFFs, of which only 3 are wanted) -- including decoy patches and decoy
   bands that must NOT be extracted.
3. build_manifest's join logic end to end on top of (1)+(2).
"""
import sys
sys.path.insert(0, "/tmp/beq_test")
import io
import tarfile
import numpy as np
import zstandard
import rasterio
from rasterio.io import MemoryFile

from bigearthnet_txt_extract import (
    stretch_band_to_uint8, bands_to_rgb_image, wanted_member_names,
    _extract_from_zst_stream, read_band_geotiff_bytes, build_manifest, S2_BANDS_RGB,
)

# --- 1. stretch / compose ---
flat = np.full((10, 10), 500, dtype=np.uint16)
out = stretch_band_to_uint8(flat)
assert out.dtype == np.uint8 and (out == 128).all(), "degenerate flat band should fall back to mid-gray"

ramp = np.linspace(0, 3000, 100).reshape(10, 10).astype(np.uint16)
out2 = stretch_band_to_uint8(ramp)
assert out2.min() == 0 and out2.max() == 255, f"ramp should stretch to full 0-255 range, got {out2.min()}-{out2.max()}"

img = bands_to_rgb_image({"B04": ramp, "B03": ramp, "B02": ramp})
assert img.mode == "RGB" and img.size == (10, 10)
try:
    bands_to_rgb_image({"B04": ramp})
    assert False, "should have raised on missing bands"
except ValueError:
    pass
print("PASS: stretch/compose unit tests")


# --- helper: build a real in-memory GeoTIFF for one band ---
def make_geotiff_bytes(arr: np.ndarray) -> bytes:
    buf = io.BytesIO()
    with MemoryFile() as memfile:
        with memfile.open(driver="GTiff", height=arr.shape[0], width=arr.shape[1],
                           count=1, dtype=arr.dtype) as dst:
            dst.write(arr, 1)
        buf.write(memfile.read())
    return buf.getvalue()


# --- 2. synthetic archive matching the REAL per-patch-folder / 12-band-file layout ---
WANTED_PATCH = "S2A_MSIL2A_20170613T101031_N9999_R022_T33UUP_26_57"
DECOY_PATCH = "S2A_MSIL2A_20170613T101031_N9999_R022_T33UUP_99_99"
ALL_BANDS = [f"B{n:02d}" for n in range(1, 13)]  # real 12-band naming (B01..B12)

raw_tar = io.BytesIO()
band_pixel_values = {}
with tarfile.open(fileobj=raw_tar, mode="w") as tar:
    for patch in (WANTED_PATCH, DECOY_PATCH):
        for band in ALL_BANDS:
            val = hash((patch, band)) % 2000 + 100
            band_pixel_values[(patch, band)] = val
            arr = np.full((6, 6), val, dtype=np.uint16)
            tif_bytes = make_geotiff_bytes(arr)
            # real layout: "<root>/<patch_folder>/<patch_folder>_<band>.tif"
            member_name = f"BigEarthNet-S2/{patch}/{patch}_{band}.tif"
            info = tarfile.TarInfo(name=member_name)
            info.size = len(tif_bytes)
            tar.addfile(info, io.BytesIO(tif_bytes))
raw_tar.seek(0)

compressed = io.BytesIO()
zstandard.ZstdCompressor().copy_stream(raw_tar, compressed)
compressed.seek(0)

wanted = wanted_member_names([WANTED_PATCH])  # only ask for the 3 RGB bands of ONE patch
assert len(wanted) == 3
per_patch = _extract_from_zst_stream(compressed, wanted)

assert set(per_patch.keys()) == {WANTED_PATCH}, f"decoy patch leaked into results: {per_patch.keys()}"
assert set(per_patch[WANTED_PATCH].keys()) == set(S2_BANDS_RGB), \
    f"expected exactly {S2_BANDS_RGB}, got {list(per_patch[WANTED_PATCH].keys())}"
print(f"PASS: streaming extraction pulled exactly {sum(len(v) for v in per_patch.values())} "
      f"of the 24 real band files in the fixture (12 bands x 2 patches), skipping the rest.")

# decode back and verify pixel values round-tripped correctly through rasterio
arrays = {band: read_band_geotiff_bytes(data) for band, data in per_patch[WANTED_PATCH].items()}
for band in S2_BANDS_RGB:
    expected_val = band_pixel_values[(WANTED_PATCH, band)]
    assert (arrays[band] == expected_val).all(), f"pixel value mismatch for {band}"
print("PASS: extracted band bytes decode to the exact real pixel values written")

# --- 3. build_manifest end-to-end ---
import tempfile
from pathlib import Path
selected = [
    {"patch_id": WANTED_PATCH, "prompt": "[refer] Where is the pastures?", "response": "{<0><33><28><80>}", "task_tag": "refer"},
    {"patch_id": WANTED_PATCH, "prompt": "[refer] Where is the road?", "response": "{<10><10><20><20>}", "task_tag": "refer"},
    {"patch_id": "SOME_MISSING_PATCH_NOT_EXTRACTED", "prompt": "[refer] Where is X?", "response": "{<1><1><2><2>}", "task_tag": "refer"},
]
with tempfile.TemporaryDirectory() as td:
    manifest = build_manifest(selected, {WANTED_PATCH: arrays}, Path(td) / "images")
    assert len(manifest) == 2, f"expected 2 manifest rows (1 dropped for missing image), got {len(manifest)}"
    assert manifest[0]["image_path"] == manifest[1]["image_path"], "both rows share the same patch image"
    assert Path(manifest[0]["image_path"]).exists()
    from PIL import Image
    saved = Image.open(manifest[0]["image_path"])
    assert saved.size[0] >= 336 and saved.size[1] >= 336, "image should be upscaled to >=336px"
print("PASS: build_manifest end-to-end (shared image across multiple QA rows, missing-patch row dropped)")

print("\nALL TESTS PASSED")
