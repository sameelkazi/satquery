"""
finetuning/bigearthnet_txt_extract.py

Fetches real Sentinel-2 pixels for the patches selected by bigearthnet_txt_filter.py and
produces a training-ready manifest.json ({"image_path", "prompt", "response", "task_tag"})
matching the schema kaggle_finetune_qwen2vl.ipynb Cell 5 expects.

BigEarthNet v2.0 images are not available as a per-patch/streamable download anywhere
(not on bigearth.net, not via the Planetary Computer STAC catalog, and torchgeo's loader
only covers the older v1.0 archive with different patch IDs). The only option is the
Zenodo whole-modality archive: BigEarthNet-S2.tar.zst (~59 GiB). Each patch is a folder of
12 per-band GeoTIFFs (per bigearth.net's Description_BigEarthNet_v2.pdf), not one combined
image file.

zstd frames in this archive aren't seekable, so there's no way to jump straight to the
handful of patches we need. This script pays the full streaming-download cost once but
keeps peak disk usage small: it reads the archive as a forward-only stream and only
materializes the ~9 files per wanted patch (3 RGB bands), discarding everything else
without writing it to disk. The streaming logic is covered by test_bigearthnet_txt_extract.py
against a synthetic fixture (zenodo.org isn't reachable from this dev sandbox); it should be
smoke-tested for real on Kaggle before trusting it against the full run.

Scope: this stage only extracts B04/B03/B02 (true-color RGB) from BigEarthNet-S2.tar.zst,
not the S1 (SAR) archive. The immediate task (referring-expression grounding) is optical
only, and Qwen2.5-VL's frozen CLIP-style vision tower expects standard RGB input, not a
12-band tensor, so pulling more bands would be wasted bandwidth here. Pulling VV/VH from
BigEarthNet-S1.tar.zst for SAR fusion is handled separately (bigearthnet_txt_extract_fusion.py).

Cross-session resume: the 59 GiB stream should only ever happen once. After building the
small (tens of MB) image+manifest output, this script pushes it to a private HF Hub
dataset repo. Every later run (any Kaggle account/session with an HF_TOKEN for that repo)
checks the repo first and downloads the cached dataset instead of hitting Zenodo again.
"""
from __future__ import annotations

import argparse
import io
import json
from pathlib import Path
from typing import Iterable

import numpy as np

S2_BANDS_RGB = ["B04", "B03", "B02"]  # Red, Green, Blue -- true-color order
S2_ARCHIVE_URL = "https://zenodo.org/records/10891137/files/BigEarthNet-S2.tar.zst"
CACHE_REPO_SUFFIX = "-bigearthnet-txt-cache"  # appended to the project's existing HF_REPO_ID


def wanted_member_names(patch_ids: Iterable[str]) -> dict[str, tuple[str, str]]:
    """Maps each expected basename ("<patch_id>_<band>.tif") to (patch_id, band).
    Matched by basename only, not full path, since the exact root-folder prefix inside
    the archive hasn't been verified -- only the per-patch/per-band naming convention has."""
    wanted = {}
    for pid in patch_ids:
        for band in S2_BANDS_RGB:
            wanted[f"{pid}_{band}.tif"] = (pid, band)
    return wanted


def stretch_band_to_uint8(band: np.ndarray, low_pct: float = 2.0, high_pct: float = 98.0) -> np.ndarray:
    """Raw S2 reflectance bands are uint16 and mostly dark without a stretch. A 2-98
    percentile clip-and-rescale to 0-255 matches the convention used by Sentinel Hub /
    EO Browser's default true-color rendering."""
    band = band.astype(np.float32)
    lo, hi = np.percentile(band, [low_pct, high_pct])
    if hi <= lo:
        # Degenerate (e.g. a uniform synthetic test band) -- avoid div-by-zero.
        return np.full_like(band, 128, dtype=np.uint8)
    stretched = np.clip((band - lo) / (hi - lo), 0.0, 1.0) * 255.0
    return stretched.astype(np.uint8)


def bands_to_rgb_image(band_arrays: dict[str, np.ndarray]):
    """band_arrays must have keys 'B04','B03','B02'. Returns a PIL.Image (RGB). Kept
    separate from any tar/network code so it's directly unit-testable."""
    from PIL import Image
    missing = [b for b in S2_BANDS_RGB if b not in band_arrays]
    if missing:
        raise ValueError(f"missing required bands for RGB compose: {missing}")
    r = stretch_band_to_uint8(band_arrays["B04"])
    g = stretch_band_to_uint8(band_arrays["B03"])
    b = stretch_band_to_uint8(band_arrays["B02"])
    rgb = np.stack([r, g, b], axis=-1)
    return Image.fromarray(rgb, mode="RGB")


def read_band_geotiff_bytes(raw_bytes: bytes) -> np.ndarray:
    """Reads one in-memory GeoTIFF band's bytes into a 2D array via rasterio's MemoryFile
    -- no temp file needed for the per-band read."""
    import rasterio
    from rasterio.io import MemoryFile
    with MemoryFile(raw_bytes) as memfile:
        with memfile.open() as src:
            return src.read(1)


def _extract_from_zst_stream(raw_stream, wanted: dict[str, tuple[str, str]],
                            images_dir: Path | None = None) -> dict[str, dict[str, bytes]]:
    """Forward-only stream consumer. If images_dir is given, decodes and saves completed
    RGB patches to disk as they arrive, freeing raw band bytes immediately so memory stays
    O(1) even for 65k+ patches."""
    import tarfile
    import zstandard

    per_patch: dict[str, dict[str, bytes]] = {}
    saved_patches: set[str] = set()
    wanted_patch_ids = {pid for pid, _band in wanted.values()}

    if images_dir is not None:
        images_dir.mkdir(parents=True, exist_ok=True)

    dctx = zstandard.ZstdDecompressor()
    members_seen = 0
    with dctx.stream_reader(raw_stream) as reader:
        with tarfile.open(fileobj=reader, mode="r|*") as tar:
            for member in tar:
                members_seen += 1
                basename = member.name.rsplit("/", 1)[-1]
                hit = wanted.get(basename)
                if not hit:
                    continue
                pid, band = hit
                f = tar.extractfile(member)
                if f is None:
                    continue
                per_patch.setdefault(pid, {})[band] = f.read()

                if images_dir is not None and all(b in per_patch[pid] for b in S2_BANDS_RGB):
                    try:
                        band_arrays = {b: read_band_geotiff_bytes(per_patch[pid][b]) for b in S2_BANDS_RGB}
                        img = bands_to_rgb_image(band_arrays)
                        img = img.resize((max(336, img.width), max(336, img.height)), resample=1)
                        img_path = images_dir / f"ben_txt_{pid}.png"
                        img.save(img_path)
                        img.close()
                        saved_patches.add(pid)
                    except Exception as err:
                        print(f"Error saving patch {pid}: {err}")
                    del per_patch[pid]

                if members_seen % 200_000 == 0:
                    have = len(saved_patches) if images_dir is not None else len(per_patch)
                    print(f"  ...scanned {members_seen} tar members, "
                          f"{have}/{len(wanted_patch_ids)} wanted patches matched so far", flush=True)

                total_matched = len(saved_patches) if images_dir is not None else len(per_patch)
                if total_matched == len(wanted_patch_ids) and (
                    images_dir is not None or all(len(v) == len(S2_BANDS_RGB) for v in per_patch.values())
                ):
                    print("All wanted patches matched -- stopping stream early.", flush=True)
                    break
    return per_patch


def stream_extract_patches(archive_url: str, wanted: dict[str, tuple[str, str]],
                            out_dir: Path, session=None) -> dict[str, dict[str, bytes]]:
    """Streams `archive_url` (a .tar.zst) forward-only, collecting raw band-file bytes for
    members whose basename is in `wanted`, grouped by patch_id. Never writes the bulk
    archive to disk -- saves images to out_dir/images as they complete."""
    if session is None:
        raise ValueError("a real requests.Session is required")
    resp = session.get(archive_url, stream=True, timeout=120)
    resp.raise_for_status()
    raw_stream = resp.raw
    raw_stream.decode_content = True
    images_dir = out_dir / "images"
    return _extract_from_zst_stream(raw_stream, wanted, images_dir=images_dir)


def build_manifest(selected: list[dict], per_patch_bands: dict[str, dict[str, np.ndarray]],
                    images_dir: Path) -> list[dict]:
    """Emits one manifest row per selected (prompt, response) pair whose image was saved
    to images_dir, matching kaggle_finetune_qwen2vl.ipynb Cell 3's manifest.json schema."""
    images_dir.mkdir(parents=True, exist_ok=True)
    image_path_by_patch: dict[str, str] = {}
    manifest = []
    skipped_no_image = 0
    for row in selected:
        pid = row["patch_id"]
        if pid not in image_path_by_patch:
            # Shard into subdirectories of <= 10,000 files to respect HF directory limits.
            part_name = f"part_{abs(hash(pid)) % 10:02d}"
            part_dir = images_dir / part_name
            part_dir.mkdir(parents=True, exist_ok=True)
            img_path = part_dir / f"ben_txt_{pid}.png"
            if not img_path.exists():
                bands = per_patch_bands.get(pid)
                if not bands or any(b not in bands for b in S2_BANDS_RGB):
                    skipped_no_image += 1
                    continue
                img = bands_to_rgb_image(bands)
                img = img.resize((max(336, img.width), max(336, img.height)), resample=1)
                img.save(img_path)
                img.close()
            image_path_by_patch[pid] = str(img_path)
        manifest.append({
            "image_path": image_path_by_patch[pid],
            "prompt": row["prompt"],
            "response": row["response"],
            "task_tag": row.get("task_tag", "refer"),
        })
    if skipped_no_image:
        print(f"WARNING: {skipped_no_image} selected examples had no matching extracted "
              f"image (patch not found in the archive stream) and were dropped.", flush=True)
    return manifest


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--selected", type=Path, default=Path("bigearthnet_txt_selected.json"))
    ap.add_argument("--out-dir", type=Path, default=Path("bigearthnet_txt_real"))
    ap.add_argument("--cache-repo", type=str, required=True,
                     help="HF dataset repo id to cache the small processed output in, e.g. "
                          "YOUR-HF-USERNAME/satquery-qwen25vl-vrsbench-lora-bigearthnet-txt-cache "
                          "(same HF account/token this project's LoRA checkpoints already use).")
    args = ap.parse_args()

    import sys
    if sys.platform == "win32":
        try:
            import ctypes
            ctypes.windll.kernel32.SetThreadExecutionState(0x80000002)  # ES_CONTINUOUS | ES_SYSTEM_REQUIRED
        except Exception:
            pass

    from huggingface_hub import HfApi, snapshot_download

    api = HfApi()
    try:
        files = api.list_repo_files(args.cache_repo, repo_type="dataset")
        if "manifest.json" in files:
            print(f"Found an existing cached dataset at https://huggingface.co/datasets/{args.cache_repo} "
                  f"-- downloading that directly instead of re-streaming the ~59 GiB Zenodo archive.")
            snapshot_download(repo_id=args.cache_repo, repo_type="dataset", local_dir=str(args.out_dir))
            cached_manifest = json.loads((args.out_dir / "manifest.json").read_text())
            print(f"Wrote {args.out_dir}/manifest.json from cache ({len(cached_manifest)} examples). Done.")
            return
        else:
            print(f"Cache repo exists at {args.cache_repo} but manifest.json is missing -- redoing extraction.")
    except Exception as e:
        print(f"No cached dataset found at {args.cache_repo} ({e}) -- doing the "
              f"one-time ~59 GiB extraction from Zenodo. This will be cached for every "
              f"future run/account after this one.")

    import requests
    selected = json.loads(args.selected.read_text())
    patch_ids = sorted({row["patch_id"] for row in selected})
    wanted = wanted_member_names(patch_ids)
    print(f"Need {len(patch_ids)} unique real patches ({len(wanted)} band files) out of "
          f"{len(selected)} selected training examples.")

    session = requests.Session()
    raw_bands = stream_extract_patches(S2_ARCHIVE_URL, wanted, args.out_dir, session=session)
    per_patch_arrays = {
        pid: {band: read_band_geotiff_bytes(data) for band, data in bands.items()}
        for pid, bands in raw_bands.items()
    }

    images_dir = args.out_dir / "images"
    manifest = build_manifest(selected, per_patch_arrays, images_dir)
    assert len(manifest) > 20, (
        "Too few real images were matched -- likely means the tar member basename "
        "convention differs from what was assumed (<patch_id>_<band>.tif). Print the "
        "first ~20 real member names from the stream and compare before re-running "
        "against the full archive."
    )
    (args.out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"Wrote {args.out_dir}/manifest.json with {len(manifest)} real training examples.")

    print(f"Pushing processed cache to https://huggingface.co/datasets/{args.cache_repo} "
          f"so future runs don't need to re-stream the full archive.")
    api.create_repo(args.cache_repo, repo_type="dataset", private=True, exist_ok=True)
    api.upload_folder(repo_id=args.cache_repo, repo_type="dataset", folder_path=str(args.out_dir))
    print("Done.")


if __name__ == "__main__":
    main()
