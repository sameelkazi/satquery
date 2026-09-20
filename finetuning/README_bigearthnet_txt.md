# BigEarthNet.txt second fine-tuning stage — run order and honest cost

The PS names "BigEarthNet.txt" (arXiv:2603.29630) as its primary/prescribed fine-tuning
dataset. This project's main fine-tune already uses VRSBench under the PS's own explicit
"BigEarthNet.txt **or other open-source training data**" clause — a documented,
defensible substitution, not a compromise. This stage adds a real, additional
referring-expression training set built directly from BigEarthNet.txt/BigEarthNet v2.0
itself, aimed specifically at the Acc@0.5 grounding gap `data/vrsbench_accuracy_eval.json`
already measured.

**No GPU is needed for this stage at all** — it's a CPU + network-bound data-prep step.
Run it on a Kaggle session with **Accelerator: None**, not a GPU one; using a GPU session
here just burns GPU-hour quota for nothing.

## What this costs, honestly

- **~59 GiB of network transfer**, once, ever (S2 optical only — SAR/S1 deliberately
  deferred, see `bigearthnet_txt_extract.py`'s docstring). No confirmed way to download
  less exists for BigEarthNet v2.0's real images.
- **Peak disk usage stays small** (tens of MB) — `bigearthnet_txt_extract.py` streams the
  archive forward-only and only ever writes the handful of matched patch images to disk,
  never the bulk archive.
- **This is a network/CPU-bound step, not a GPU-bound one.** Run it on a **CPU-only**
  Kaggle session, separate from `kaggle_finetune_qwen2vl_v4.ipynb`, so it never eats into
  the GPU-hour quota. Once done, the small result is cached to a private HF dataset repo —
  every later session/account just downloads that small cache instead of re-streaming
  the full archive.
- **Additional GPU-hours for the extra training data itself are separate** — see the v4
  training runbook (`finetuning/V4_TRAINING_RUNBOOK.md`) for the current combined
  GPU-hour estimate across the full VRSBench + BigEarthNet.txt mix.

## Before running on Kaggle

Check available disk on the CPU session first — this was NOT verifiable from the sandbox
this was written in (no network egress to zenodo.org/bigearth.net from there, confirmed
directly), so it must be checked live:

```
!df -h /kaggle/working
```

## Run order (on Kaggle, CPU-only session, real HF_TOKEN available via Kaggle secrets)

```bash
pip install datasets huggingface_hub zstandard rasterio pillow numpy

python finetuning/bigearthnet_txt_filter.py --smoke-test --max-examples 50   # fast sanity check first
python finetuning/bigearthnet_txt_filter.py --max-examples 150000           # real run

python finetuning/bigearthnet_txt_extract.py \
  --cache-repo Sameelkazi/satquery-qwen3vl-vrsbench-lora-v4-bigearthnet-txt-cache-full
```

**Updated 2026-09-16: the real, full-scale extraction is DONE and verified on the Hub.**
150,000 real training examples across 65,293 unique real Sentinel-2 patches were
extracted and pushed to
[`Sameelkazi/satquery-qwen3vl-vrsbench-lora-v4-bigearthnet-txt-cache-full`](https://huggingface.co/datasets/Sameelkazi/satquery-qwen3vl-vrsbench-lora-v4-bigearthnet-txt-cache-full)
(private dataset repo). Images are sharded into 10 subdirectories (`images/part_00`
through `images/part_09`, ~6,529-6,530 files each) because Hugging Face's git backend
caps any single directory at 10,000 files — the flat layout this doc originally
described hit that cap on the first real push attempt and had to be resharded.
`bigearthnet_txt_extract.py` now shards automatically on any future run, and its
cache-hit path was fixed to download the actual images alongside manifest.json (an
earlier version only fetched the manifest on a cache hit, silently leaving the
referenced image files missing on disk for anyone reusing the cache — fixed 2026-09-16).

**Use the `-cache-full` repo name above, NOT the earlier plain `-cache` name.** That
earlier name is tainted with a stale partial run (only 380 examples from a leftover test
selection) and its own cache-hit path will just re-serve that small set if reused — it
is being kept around as-is rather than overwritten, to avoid disturbing whatever, if
anything, already depends on it, but the `-cache-full` name is the one this project's
real v4 training actually uses.

**Also still true from the v3→v4 box-format change (2026-09-13): don't reuse any `-v3`
or un-versioned cache** — `box_str_to_token()` was updated to emit Qwen3-VL's native
`{"bbox_2d": [x1,y1,x2,y2]}` format (0-1000 scale) instead of the old GeoChat-era
`{<x1><y1><x2><y2>}` bracket format (0-100 scale); an older cache holds labels in the
old format and would silently train the v4 model on a mismatched box convention.

Then run `kaggle_finetune_qwen2vl_v4.ipynb` as usual (GPU session) — Cell 6 picks up
`bigearthnet_txt_real/manifest.json` automatically if present, merges it into
`train_dataset`, and prints which real data sources were actually used this run (for
honest reporting in the model card / final report). Set `INCLUDE_BIGEARTHNET_TXT = False`
in Cell 6 to fall back to VRSBench-only training with zero risk.

## What was verified vs. what still needs a live check

Verified (via HF's datasets-server API and bigearth.net's official
`Description_BigEarthNet_v2.pdf`, both on 2026-08-29): the real column schema, the real
`[x_min y_min, x_max y_max]` (normalized 0–1) box format, the real per-patch-folder /
per-band-file naming convention, and that `patch_id`/`S1_name` are genuine join keys
present on every row.

NOT verified (blocked by this sandbox having no network egress to zenodo.org or
bigearth.net — confirmed directly, not assumed): the exact root-folder prefix inside the
real `.tar.zst`, and real end-to-end throughput/timing for the ~59 GiB stream. Run the
`--smoke-test` filter pass and a small manual check of the first ~20 real tar member names
before trusting the full run — this mirrors the project's own established practice
(`SMOKE_TEST` in `kaggle_finetune_qwen2vl_v4.ipynb`) of never trusting an untested pipeline
against a large real cost on the first try.
