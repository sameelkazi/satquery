"""
finetuning/bigearthnet_txt_filter.py

The PS names "BigEarthNet.txt" (arXiv:2603.29630) as its primary/prescribed fine-tuning
dataset. This project's fine-tuning run actually uses VRSBench (a PS-named evaluation
dataset used here for training, under the PS's own "BigEarthNet.txt OR OTHER OPEN-SOURCE
TRAINING DATA" clause). This script adds a second training source built directly from
BigEarthNet.txt to close that gap for real.

Reads BigEarthNet.txt's annotation parquet (BIFOLD-BigEarthNetv2-0/BigEarthNet.txt on the
HF Hub, 9.55M rows) and selects a referring-expression subset (type == "bounding box",
category == "reference", i.e. "find the box for this described object" -- the same
text-to-box task shape as VRSBench's [refer] examples, which is what the project's Acc@0.5
grounding gap is about). category == "point" rows are excluded (a different point-to-box
task shape) to avoid teaching the model two incompatible box-output conventions.

Verified via HF's datasets-server API:
  - Columns: ID, S1_name, patch_id, input, output, type, category, split, latitude,
    longitude, country, season, climate_zone.
  - type=="bounding box" output format: "[x_min y_min, x_max y_max]" with normalized
    [0,1] coordinates, e.g. "[0.0 0.33, 0.28 0.8]".
  - category=="reference" input format: "Identify the location of the
    <ref>DESCRIPTION</ref>" (or similar) -- the <ref>...</ref> inner text is the object
    description to keep; wrapper phrasing/tags are stripped.
  - patch_id values (e.g. "S2A_MSIL2A_20170613T101031_N9999_R022_T33UUP_26_57") match the
    BigEarthNet v2.0 per-patch folder-naming convention, i.e. the folder name to look for
    inside BigEarthNet-S2.tar.zst.

Output schema matches kaggle_finetune_qwen2vl.ipynb Cell 3's manifest.json
({"image_path", "prompt", "response", "task_tag"}), except image_path is left None here --
bigearthnet_txt_extract.py fills it in after image extraction, so this filter step never
needs network access to the (much larger) image archives.

Runs on Kaggle; no heavy image/network dependencies beyond `datasets`/`huggingface_hub`/`pyarrow`.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

TEXT_DATASET_REPO = "BIFOLD-BigEarthNetv2-0/BigEarthNet.txt"

# Box format: "[x_min y_min, x_max y_max]", normalized 0-1 floats.
BOX_RE = re.compile(
    r"\[\s*([0-9.]+)\s+([0-9.]+)\s*,\s*([0-9.]+)\s+([0-9.]+)\s*\]"
)
# Strips the <ref>...</ref> / <point>(...)</point> XML-like wrapper tags this dataset's
# `input` field uses, keeping the inner text as the plain-language object description.
REF_TAG_RE = re.compile(r"<ref>(.*?)</ref>", re.IGNORECASE | re.DOTALL)
POINT_TAG_RE = re.compile(r"<point>.*?</point>", re.IGNORECASE | re.DOTALL)

REQUIRED_COLUMNS = [
    "patch_id", "input", "output", "type", "category", "split",
]


def clean_reference_prompt(raw_input: str) -> str | None:
    """Extracts the object description from a category=='reference' row's `input` field.
    Returns None if no <ref>...</ref> span is found (defensive -- don't guess at a
    different format if this dataset's phrasing varies row to row)."""
    m = REF_TAG_RE.search(raw_input or "")
    if not m:
        return None
    description = m.group(1).strip()
    if not description:
        return None
    return f"[refer] Where is the {description}?"


def box_str_to_token(output_text: str) -> str | None:
    """Converts BigEarthNet.txt's "[x_min y_min, x_max y_max]" (normalized 0-1) box
    string into this project's box-token format.

    Emits '{"bbox_2d": [x1, y1, x2, y2]}' on a 0-1000 integer scale, x-first -- Qwen3-VL's
    documented native grounding format (github.com/QwenLM/Qwen3-VL,
    cookbooks/2d_grounding.ipynb), matching the format kaggle_finetune_qwen2vl.ipynb's
    Cell 3 (convert_legacy_box_tokens) converts VRSBench's raw answers into and the format
    backend/models/geochat_service.py's parse_boxes_from_text expects at inference.
    Training both data sources toward one shared output convention is deliberate --
    mixing two box encodings in one fine-tune would teach an inconsistent output format.
    Omits the cookbook's optional "label" field since the referring expression already
    serves that role (see the notebook's Cell 3 note)."""
    m = BOX_RE.search(output_text or "")
    if not m:
        return None
    x1, y1, x2, y2 = (float(g) for g in m.groups())
    # Reject inverted/degenerate boxes outright rather than training on a bad label.
    if not (0.0 <= x1 < x2 <= 1.0 and 0.0 <= y1 < y2 <= 1.0):
        return None
    xi1, yi1, xi2, yi2 = (round(v * 1000) for v in (x1, y1, x2, y2))
    return f'{{"bbox_2d": [{xi1}, {yi1}, {xi2}, {yi2}]}}'


def select_rows(rows: list[dict[str, Any]], max_examples: int, dedupe_per_patch: int = 3
                 ) -> tuple[list[dict[str, Any]], Counter]:
    """Filtering/conversion logic, factored out so it's unit-testable against synthetic
    rows without network access (see test_bigearthnet_txt_filter.py)."""
    selected: list[dict[str, Any]] = []
    per_patch_count: Counter = Counter()
    stats = Counter()

    for row in rows:
        if len(selected) >= max_examples:
            break
        stats["seen"] += 1

        missing = [c for c in REQUIRED_COLUMNS if c not in row]
        if missing:
            stats["skipped_missing_columns"] += 1
            continue

        if str(row.get("type", "")).strip().lower() != "bounding box":
            stats["skipped_not_bbox_type"] += 1
            continue
        if str(row.get("category", "")).strip().lower() != "reference":
            # Excludes category=="point" (a different task shape, see module docstring).
            stats["skipped_not_reference_category"] += 1
            continue

        # BigEarthNet.txt ships a "split" column (train/val/test), inherited from
        # BigEarthNet v2.0's patch-pair splits. Only draw from "train" -- otherwise this
        # silently mixes in val/test rows, which would contaminate any future
        # BigEarthNet.txt-native eval built from its held-out split (our current eval is
        # VRSBench-based, a separate dataset, so it isn't affected today).
        if str(row.get("split", "")).strip().lower() != "train":
            stats["skipped_not_train_split"] += 1
            continue

        patch_id = row.get("patch_id")
        if not patch_id:
            stats["skipped_no_patch_id"] += 1
            continue
        if per_patch_count[patch_id] >= dedupe_per_patch:
            # Cap examples per patch so a few heavily-annotated patches don't dominate
            # the subset.
            stats["skipped_per_patch_cap"] += 1
            continue

        prompt = clean_reference_prompt(row.get("input", ""))
        if prompt is None:
            stats["skipped_unparseable_prompt"] += 1
            continue

        box_token = box_str_to_token(row.get("output", ""))
        if box_token is None:
            stats["skipped_unparseable_or_invalid_box"] += 1
            continue

        selected.append({
            "patch_id": patch_id,
            # The live schema has this column as lowercase "s1_name", not "S1_name" --
            # a capitalized lookup here would silently return None for every row. Not
            # currently used downstream (reserved for future SAR/fusion work).
            "s1_name": row.get("s1_name"),
            "prompt": prompt,
            "response": box_token,
            "task_tag": "refer",
            "source": "bigearthnet_txt",
        })
        per_patch_count[patch_id] += 1
        stats["selected"] += 1

    return selected, stats


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--max-examples", type=int, default=2500,
                     help="Cap on selected referring-expression examples (default 2500 -- "
                          "see finetuning/README note on why this size was chosen).")
    ap.add_argument("--dedupe-per-patch", type=int, default=3)
    ap.add_argument("--out", type=Path, default=Path("bigearthnet_txt_selected.json"))
    ap.add_argument("--smoke-test", action="store_true",
                     help="Only scan the first 20,000 rows (fast sanity check before the "
                          "full 9.55M-row scan) -- mirrors the SMOKE_TEST convention in "
                          "kaggle_finetune_qwen2vl.ipynb.")
    args = ap.parse_args()

    # Network access happens only here so the rest of this module's selection logic
    # stays unit-testable without the `datasets` library.
    from datasets import load_dataset

    limit = 20_000 if args.smoke_test else None
    print(f"Loading {TEXT_DATASET_REPO} ({'smoke-test: first ' + str(limit) + ' rows' if limit else 'full 9.55M rows'})...", flush=True)
    ds = load_dataset(TEXT_DATASET_REPO, split="all_data", streaming=True)
    def row_stream():
        first = True
        for i, row in enumerate(ds):
            if first:
                print("Column names found in first row:", list(row.keys()), flush=True)
                first = False
            if limit and i >= limit:
                break
            if (i + 1) % 500_000 == 0:
                print(f"  ...scanned {i + 1} rows", flush=True)
            yield row

    selected, stats = select_rows(row_stream(), max_examples=args.max_examples,
                                   dedupe_per_patch=args.dedupe_per_patch)
    print(f"\nSelection stats: {dict(stats)}")
    print(f"Selected {len(selected)} referring-expression examples across "
          f"{len(set(r['patch_id'] for r in selected))} unique patches.")

    assert len(selected) > 20, (
        "Too few examples were selected -- this means either the column names, the "
        "'bounding box'/'reference' type/category values, or the box/ref text formats "
        "on the live data no longer match what was verified previously. Print rows[0] "
        "and a few type=='bounding box' rows raw, paste back, and fix this script's "
        "assumptions rather than lowering this assertion."
    )

    args.out.write_text(json.dumps(selected, indent=2))
    print(f"\nWrote {args.out} -- next: run finetuning/bigearthnet_txt_extract.py to fetch "
          f"images for these patch_ids and produce a training-ready manifest.json.")

    # HF's `datasets` streaming path (via fsspec/huggingface_hub's HTTP retry machinery)
    # can leave a background thread alive with an in-flight request/retry against the
    # remote parquet file even after the foreground scan loop above stops consuming it
    # early (always true for --smoke-test, and whenever --max-examples caps selection
    # before the stream is exhausted). Normal interpreter finalization can then hit that
    # leftover thread mid-teardown and crash with "Fatal Python error:
    # PyGILState_Release: auto-releasing thread-state, but no thread-state for this
    # thread" -- observed on a real run, always AFTER the output above is already
    # written correctly, so it's a noisy false failure rather than a sign the selection
    # work was wrong. Skip normal finalization and exit immediately once everything is
    # safely on disk.
    sys.stdout.flush()
    sys.stderr.flush()
    os._exit(0)


if __name__ == "__main__":
    main()
