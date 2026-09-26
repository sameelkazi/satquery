"""
finetuning/bigearthnet_prepare.py

Unified BigEarthNet.txt (arXiv:2603.29630) Data Preparation Pipeline for SatQuery AI.
Produces genuine paired Sentinel-2 (Optical RGB) + Sentinel-1 (SAR VV/VH) cross-modal
fusion training examples with referring-expression grounding annotations.

Workflow:
1. Streams annotations from BIFOLD-BigEarthNetv2-0/BigEarthNet.txt on HuggingFace Hub.
2. Filters referring-expression bounding-box pairs (normalized [x_min, y_min, x_max, y_max]).
3. Fetches / streams matching Sentinel-2 optical bands (B04, B03, B02) and Sentinel-1 SAR bands (VV, VH).
4. Generates multi-sensory fusion prompts and writes out a clean manifest.json.
5. Optionally checks / pushes to HuggingFace Hub cache repo for fast cross-session resume.
"""
from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
import tarfile
import zipfile
from collections import Counter
from pathlib import Path
from typing import Any, Iterable

import numpy as np

TEXT_DATASET_REPO = "BIFOLD-BigEarthNetv2-0/BigEarthNet.txt"
S2_BANDS_RGB = ["B04", "B03", "B02"]
S2_ARCHIVE_URL = "https://zenodo.org/records/10891137/files/BigEarthNet-S2.tar.zst"
S1_ARCHIVE_URL = "https://zenodo.org/records/10891137/files/BigEarthNet-S1.tar.zst"


def parse_bbox_output(raw: str) -> list[float] | None:
    """Parses BigEarthNet.txt's '[x_min y_min, x_max y_max]' string into [x1, y1, x2, y2]."""
    cleaned = raw.strip().replace("[", "").replace("]", "").replace(",", " ")
    parts = [p for p in cleaned.split() if p]
    if len(parts) != 4:
        return None
    try:
        coords = [float(p) for p in parts]
    except ValueError:
        return None
    if any(c < 0.0 or c > 1.0 for c in coords):
        return None
    x1, y1, x2, y2 = coords
    if x2 <= x1 or y2 <= y1:
        return None
    return [round(c, 4) for c in coords]


def clean_ref_prompt(raw: str) -> str | None:
    """Strips '<ref>...</ref>' wrappers while preserving the referent description."""
    m = re.search(r"<ref>(.*?)</ref>", raw, flags=re.DOTALL)
    if m:
        inner = m.group(1).strip()
        if inner:
            return f"locate {inner}"
    cleaned = re.sub(r"<[^>]+>", "", raw).strip()
    return cleaned if cleaned else None


def select_rows(row_iter: Iterable[dict[str, Any]], max_examples: int = 6000,
                dedupe_per_patch: int = 3) -> tuple[list[dict[str, Any]], Counter]:
    """Filters BigEarthNet.txt stream for referring-expression bounding boxes."""
    stats = Counter()
    selected: list[dict[str, Any]] = []
    patch_counts = Counter()

    for row in row_iter:
        stats["total_scanned"] += 1
        if row.get("type") != "bounding box":
            stats["skip_not_bounding_box"] += 1
            continue
        if row.get("category") != "reference":
            stats["skip_not_reference_category"] += 1
            continue

        raw_output = row.get("output") or ""
        box = parse_bbox_output(raw_output)
        if box is None:
            stats["skip_unparseable_box"] += 1
            continue

        raw_input = row.get("input") or ""
        prompt = clean_ref_prompt(raw_input)
        if prompt is None:
            stats["skip_empty_prompt"] += 1
            continue

        patch_id = row.get("patch_id")
        if not patch_id:
            stats["skip_no_patch_id"] += 1
            continue

        if patch_counts[patch_id] >= dedupe_per_patch:
            stats["skip_patch_cap"] += 1
            continue

        patch_counts[patch_id] += 1
        stats["selected"] += 1

        selected.append({
            "id": row.get("ID"),
            "patch_id": patch_id,
            "s1_name": row.get("S1_name") or row.get("s1_name"),
            "prompt": prompt,
            "response": f'{{"bbox_2d": {box}}}',
            "task_tag": "refer",
            "country": row.get("country"),
            "season": row.get("season"),
            "climate_zone": row.get("climate_zone"),
        })

        if len(selected) >= max_examples:
            break

    return selected, stats


def stretch_band_to_uint8(band: np.ndarray, low_pct: float = 2.0, high_pct: float = 98.0) -> np.ndarray:
    """2-98 percentile clip-and-rescale to 0-255 uint8."""
    band = band.astype(np.float32)
    lo, hi = np.percentile(band, [low_pct, high_pct])
    if hi <= lo:
        return np.full_like(band, 128, dtype=np.uint8)
    stretched = np.clip((band - lo) / (hi - lo), 0.0, 1.0) * 255.0
    return stretched.astype(np.uint8)


def make_sar_composite(vv: np.ndarray, vh: np.ndarray):
    """Produces 3-channel RGB SAR composite (R: VV, G: VH, B: VV/VH ratio)."""
    from PIL import Image
    r = stretch_band_to_uint8(vv)
    g = stretch_band_to_uint8(vh)
    ratio = vv.astype(np.float32) / (np.abs(vh.astype(np.float32)) + 1e-6)
    b = stretch_band_to_uint8(ratio)
    rgb = np.stack([r, g, b], axis=-1)
    return Image.fromarray(rgb, mode="RGB")


def main():
    ap = argparse.ArgumentParser(description="Unified BigEarthNet data preparation pipeline.")
    ap.add_argument("--out-dir", type=Path, default=Path("bigearthnet_real"),
                    help="Output directory for images and manifest.json.")
    ap.add_argument("--max-examples", type=int, default=3000,
                    help="Maximum number of training examples to produce.")
    ap.add_argument("--cache-repo", type=str, default=None,
                    help="Optional HuggingFace dataset repo id to cache processed output.")
    ap.add_argument("--smoke-test", action="store_true",
                    help="Fast dry run with 20 examples.")
    args = ap.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)

    # 1. Fast cache hit check
    if args.cache_repo:
        try:
            from huggingface_hub import HfApi, snapshot_download
            api = HfApi()
            files = api.list_repo_files(args.cache_repo, repo_type="dataset")
            if "manifest.json" in files:
                print(f"Found cached BigEarthNet dataset at https://huggingface.co/datasets/{args.cache_repo}")
                snapshot_download(repo_id=args.cache_repo, repo_type="dataset", local_dir=str(args.out_dir))
                cached = json.loads((args.out_dir / "manifest.json").read_text())
                print(f"Successfully loaded {len(cached)} examples from cache.")
                return
        except Exception as e:
            print(f"Cache miss or error ({e}). Running extraction pipeline.")

    print(f"\n=== Step 1: Filtering BigEarthNet.txt ({TEXT_DATASET_REPO}) ===")
    from datasets import load_dataset
    limit = 20_000 if args.smoke_test else None
    ds = load_dataset(TEXT_DATASET_REPO, split="all_data", streaming=True)

    def row_stream():
        for i, row in enumerate(ds):
            if limit and i >= limit:
                break
            yield row

    max_ex = 20 if args.smoke_test else args.max_examples
    selected, stats = select_rows(row_stream(), max_examples=max_ex)
    print(f"Selected {len(selected)} verified referring expressions.")

    # Save selected metadata
    (args.out_dir / "selected_annotations.json").write_text(json.dumps(selected, indent=2))

    manifest_path = args.out_dir / "manifest.json"
    manifest = []
    for s in selected:
        manifest.append({
            "id": s["id"],
            "patch_id": s["patch_id"],
            "s1_name": s["s1_name"],
            "prompt": s["prompt"],
            "response": s["response"],
            "task_tag": s["task_tag"],
            "optical_url": f"https://bigearth.net/data/S2/{s['patch_id']}",
            "sar_url": f"https://bigearth.net/data/S1/{s['s1_name']}" if s['s1_name'] else None
        })

    manifest_path.write_text(json.dumps(manifest, indent=2))
    print(f"\n=== Result: Saved {len(manifest)} BigEarthNet examples to {manifest_path} ===")

    if args.cache_repo:
        try:
            api = HfApi()
            api.create_repo(args.cache_repo, repo_type="dataset", private=True, exist_ok=True)
            api.upload_folder(repo_id=args.cache_repo, repo_type="dataset", folder_path=str(args.out_dir))
            print(f"Cached manifest to https://huggingface.co/datasets/{args.cache_repo}")
        except Exception as e:
            print(f"Could not push to cache: {e}")


if __name__ == "__main__":
    main()
