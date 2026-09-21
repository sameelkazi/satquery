"""
scripts/evaluate_vrsbench_accuracy.py

Real, quantitative accuracy evaluation against VRSBench's OWN held-out evaluation files
(VRSBench_EVAL_vqa.json for VQA, VRSBench_EVAL_referring.json for grounding), using images
from Images_val.zip -- genuinely unseen during this project's own LoRA fine-tuning.

Why this script exists: an external review of the technical report flagged, correctly,
that nowhere in this project's reporting is there a real accuracy/IoU number against a
public benchmark -- scripts/build_benchmark.py only measures whether the router picked the
right TASK FAMILY and produced *some* output, not whether that output is actually correct
against ground truth. SIH26167's own judging criteria calls for evaluation against
"prescribed public benchmark test subsets" -- i.e. a real accuracy number is exactly what
will be checked. This script produces one, honestly, using data the adapter never trained
on.

Held-out guarantee: finetuning/kaggle_finetune_qwen2vl.ipynb's Cell 3 already draws the
FIRST 60 records of VRSBench_EVAL_vqa.json for its own during-training held-out loss
tracking (EVAL_NUM_EXAMPLES = 60, taken in file order). This script skips those same first
60 records and scores a later, disjoint slice of the same file, so every example scored
here is also genuinely unseen by the training run's own eval loop, not just by the LoRA's
training data.

What this does NOT claim: VRSBench's own paper describes a "GPT-based evaluation protocol"
for VQA scoring. This project has no GPT-4 access, so it does not reproduce that exact
protocol or claim comparability to the paper's own published numbers. Instead it computes
two honestly-separate scores:
  - heuristic_word_overlap_accuracy: a crude, deterministic, no-API-key-needed proxy
    (>=50% ground-truth content-word overlap). Always computed.
  - groq_llm_judge_accuracy: an LLM-as-judge score using Groq (already a real dependency
    of this project, used as its own text-fallback tier) as a real stand-in for a
    GPT-based judge. Computed only when GROQ_API_KEY is configured. This is Groq's
    judgment, not GPT's, and is labeled as such everywhere it's reported.

Grounding coordinate-order check (a real discrepancy found while building this script,
not previously reconciled anywhere in this codebase): VRSBench's own
VRSBench_EVAL_referring.json documents its ground-truth boxes as {<x1><y1><x2><y2>}, 0-100
scale, X-FIRST. But backend/models/geochat_service.py's parse_boxes_from_text used to
assume the model's OWN generated boxes are Y-FIRST -- a conclusion drawn from a single
live grounding example on 2026-08-26 (the Hussain Sagar lake case documented in that
file's docstring). Those were two separate, previously-unreconciled claims. This script
computes real IoU under BOTH orderings against VRSBench's own documented ground truth and
reports which one this specific fine-tuned adapter's output actually matches -- settling
it with evidence instead of one anecdote.

RESULT (first real run, 2026-08-27, 50 held-out referring-expression examples): X-FIRST
scored mean IoU 0.0647 vs Y-FIRST's 0.0032 -- X-FIRST wins by ~20x, matching VRSBench's
documented convention. geochat_service.py's parse_boxes_from_text has been reverted to
X-FIRST accordingly. Separately, and NOT resolved by this fix: even under X-FIRST, Acc@0.5
and Acc@0.7 were both 0.00 on this sample -- real grounding/localization accuracy is
currently very low, most likely due to limited referring-expression coverage in the 600
training examples. See report.tex Section 5.2 for the full honest disclosure and the
mitigation plan. Re-run this script after any retraining to check real progress on that
gap -- do not assume the coordinate-order fix alone improved it.

Usage (run from the repo root, in an environment where geochat_service can load the real
local/remote model -- e.g. this project's RTX 4060 machine with the .env GPU/adapter
config already used by the other scripts/*.py files):

    python scripts/evaluate_vrsbench_accuracy.py --num-vqa 200 --num-grounding 150

If no real local/remote model is available in the environment this runs in,
geochat_service.run_vqa() will transparently fall through to its own honestly-labeled
fallback tiers (cloud VLM, Groq, template) exactly as it does everywhere else in this
project -- every per-example result records which tier actually answered
("model"/"confidence_basis"), so this script's accuracy numbers are never silently
mislabeled as "the fine-tuned model's accuracy" when they are not.

Additional dependency beyond this project's existing backend requirements:
`huggingface_hub` (for downloading VRSBench's real eval files/images directly, the same
way finetuning/kaggle_finetune_qwen2vl.ipynb already does).
"""

import argparse
import io
import json
import re
import sys
import time
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.models.geochat_service import geochat_service  # noqa: E402

DATASET_ID = "xiang709/VRSBench"
CACHE_DIR = Path("data/_vrsbench_eval_cache")
WORD_RE = re.compile(r"[a-z0-9]+")
BOX_RE = re.compile(r"\{\s*<\s*(\d{1,3})\s*>\s*<\s*(\d{1,3})\s*>\s*<\s*(\d{1,3})\s*>\s*<\s*(\d{1,3})\s*>\s*\}")


def download_real_eval_assets():
    from huggingface_hub import hf_hub_download

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Downloading real VRSBench held-out eval files from {DATASET_ID} (Hugging Face Hub)...")
    vqa_ann = hf_hub_download(repo_id=DATASET_ID, repo_type="dataset", filename="VRSBench_EVAL_vqa.json")
    ref_ann = hf_hub_download(repo_id=DATASET_ID, repo_type="dataset", filename="VRSBench_EVAL_referring.json")
    val_zip = hf_hub_download(repo_id=DATASET_ID, repo_type="dataset", filename="Images_val.zip")
    return vqa_ann, ref_ann, val_zip


def _resolve_zip_name(zip_names, image_id):
    """Matches an annotation's image_id to its real entry in the zip's namelist, either by
    an exact match or (VRSBench's zips nest images under a subfolder prefix) by suffix."""
    if image_id in zip_names:
        return image_id
    return next((n for n in zip_names if n.endswith(image_id)), None)


def load_image_from_zip(zf, zip_names, image_id, cache_dir):
    cache_path = cache_dir / image_id
    if cache_path.exists():
        return str(cache_path)
    name = _resolve_zip_name(zip_names, image_id)
    if name is None:
        return None
    from PIL import Image

    img = Image.open(io.BytesIO(zf.read(name))).convert("RGB")
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(cache_path)
    return str(cache_path)


def normalize_records(records):
    if isinstance(records, dict):
        return [dict(v, image_id=v.get("image_id", k)) for k, v in records.items()]
    return records


# ---- VQA accuracy ----

def heuristic_match(pred: str, gt: str) -> bool:
    """Deterministic, no-API-key VQA judge: token overlap over the ground truth's content
    words. Cruder than an LLM judge -- honestly labeled as a heuristic, never conflated
    with the Groq-judge score."""
    pred_tokens = set(WORD_RE.findall(pred.lower()))
    gt_tokens = set(WORD_RE.findall(gt.lower()))
    if not gt_tokens:
        return False
    overlap = len(pred_tokens & gt_tokens) / len(gt_tokens)
    return overlap >= 0.5


def groq_judge(question: str, pred: str, gt: str, groq_key: str):
    """LLM-as-judge VQA scoring via Groq -- this project's real, honestly-labeled stand-in
    for VRSBench's own GPT-based evaluation protocol (no GPT-4 access here). Returns
    (is_correct, ok) -- ok=False on any failure, caller falls back to the heuristic."""
    try:
        from groq import Groq

        client = Groq(api_key=groq_key)
        prompt = (
            f"Question: {question}\nGround-truth answer: {gt}\nModel's answer: {pred}\n\n"
            "Does the model's answer convey the same essential information as the "
            "ground-truth answer, allowing for paraphrasing and reasonable detail "
            "differences? Reply with exactly one word: YES or NO."
        )
        completion = client.chat.completions.create(
            model="allam-2-7b",
            messages=[
                {
                    "role": "system",
                    "content": "You are a strict but fair evaluation judge for a visual "
                    "question answering benchmark. Reply with exactly one word: YES or NO.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.0,
            max_tokens=5,
        )
        verdict = (completion.choices[0].message.content or "").strip().upper()
        return ("YES" in verdict), True
    except Exception as e:
        print(f"  [groq judge failed: {e}]")
        return False, False


def run_vqa_eval(vqa_ann_path, val_zip_path, num_examples, groq_key):
    with open(vqa_ann_path) as f:
        records = normalize_records(json.load(f))

    zf = zipfile.ZipFile(val_zip_path)
    zip_names = zf.namelist()

    # Skip the same first 60 *usable* records that kaggle_finetune_qwen2vl.ipynb's own
    # Cell 3 held-out eval loop actually consumed (2026-09-06 correctness fix): that loop
    # walks this exact file in order and keeps collecting until it has 60 records with a
    # resolvable image_id and a valid question/answer, silently skipping (not counting) any
    # malformed record along the way. The previous `records[60:]` raw-index slice only
    # matched that behavior if zero records in the first ~60-70 were unusable, which
    # VRSBench_EVAL_vqa.json is not guaranteed to satisfy. Skipping by USABLE count instead
    # keeps this script's held-out slice genuinely disjoint from the training run's own
    # tracked eval set, rather than merely assuming it is.
    usable = [
        rec for rec in records
        if rec.get("image_id") and rec.get("question") and rec.get("ground_truth")
        and _resolve_zip_name(zip_names, rec["image_id"])
    ]
    candidates = usable[60:]
    print(f"  ({len(usable)} usable VQA records found; skipping the first 60 already used "
          f"by training's held-out loop, {len(candidates)} remain as candidates)")

    results = []
    scored = 0
    for rec in candidates:
        if scored >= num_examples:
            break
        image_id = rec.get("image_id")
        question = rec.get("question")
        ground_truth = rec.get("ground_truth")
        img_path = load_image_from_zip(zf, zip_names, image_id, CACHE_DIR / "vqa_images")
        if img_path is None:
            continue

        t0 = time.time()
        vqa_res = geochat_service.run_vqa(img_path, question)
        latency_ms = round((time.time() - t0) * 1000, 1)
        pred_text = vqa_res.get("text", "")

        h_correct = heuristic_match(pred_text, ground_truth)
        llm_correct, llm_ok = (None, False)
        if groq_key:
            llm_correct, llm_ok = groq_judge(question, pred_text, ground_truth, groq_key)

        results.append(
            {
                "image_id": image_id,
                "question": question,
                "ground_truth": ground_truth,
                "predicted": pred_text,
                "model": vqa_res.get("model"),
                "confidence": vqa_res.get("confidence"),
                "confidence_basis": vqa_res.get("confidence_basis"),
                "adapter_active": vqa_res.get("adapter_active"),
                "latency_ms": latency_ms,
                "heuristic_correct": h_correct,
                "llm_judge_correct": llm_correct,
                "llm_judge_ok": llm_ok,
            }
        )
        scored += 1
        if scored % 10 == 0:
            print(f"  VQA: {scored}/{num_examples} scored...")

    n = len(results)
    heuristic_acc = (sum(r["heuristic_correct"] for r in results) / n) if n else None
    llm_scored = [r for r in results if r["llm_judge_ok"]]
    llm_acc = (sum(r["llm_judge_correct"] for r in llm_scored) / len(llm_scored)) if llm_scored else None

    return {
        "num_examples": n,
        "heuristic_word_overlap_accuracy": round(heuristic_acc, 4) if heuristic_acc is not None else None,
        "groq_llm_judge_accuracy": round(llm_acc, 4) if llm_acc is not None else None,
        "groq_llm_judge_examples_scored": len(llm_scored),
        "judging_note": (
            "heuristic_word_overlap_accuracy needs no API key and is always computed, but is "
            "a crude proxy (>=50% ground-truth content-word overlap). groq_llm_judge_accuracy "
            "is this project's real stand-in for VRSBench's own GPT-based evaluation protocol "
            "-- computed only when GROQ_API_KEY is set, and is Groq's judgment, not the "
            "original paper's exact number."
        ),
        "per_example": results,
    }


# ---- Grounding accuracy (Acc@0.5 / Acc@0.7 via IoU) ----

def parse_gt_box_x_first(ground_truth: str):
    """VRSBench's own documented ground-truth format: {<x1><y1><x2><y2>}, 0-100 scale,
    X-FIRST (confirmed directly from VRSBench_EVAL_referring.json's schema)."""
    m = BOX_RE.search(ground_truth)
    if not m:
        return None
    x1, y1, x2, y2 = [int(v) / 100.0 for v in m.groups()]
    return [min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2)]


PRED_BBOX2D_RE = re.compile(
    r'"bbox_2d"\s*:\s*\[\s*(\d{1,4})\s*,\s*(\d{1,4})\s*,\s*(\d{1,4})\s*,\s*(\d{1,4})\s*\]'
)


def parse_pred_box_both_orderings(raw_text: str):
    """Parses the model's own raw generated box under BOTH possible orderings, so this
    script can settle -- with real IoU evidence -- whether
    geochat_service.parse_boxes_from_text's current Y-FIRST assumption actually matches
    what this adapter emits, or whether VRSBench's own X-FIRST training-data convention
    (see module docstring) is the real answer.

    UPDATED 2026-09-12 (v4 base-model + box-format switch, paired with
    finetuning/kaggle_finetune_qwen2vl.ipynb's swap to Qwen3-VL-4B-Instruct): the
    fine-tuned model's real output format changed from the OLD GeoChat-style
    '{<x1><y1><x2><y2>}' 0-100 bracket tokens to Qwen3-VL's own native
    '{"bbox_2d": [x1,y1,x2,y2]}' JSON, normalized 0-1000, ALWAYS x-first (that's the
    format's own definition -- there is no coordinate-order ambiguity left to test for a
    NEW-format prediction, unlike the old bracket tokens). Tries the new format FIRST;
    only a raw_text with no 'bbox_2d' match falls back to the legacy BOX_RE-based
    both-orderings check below, so this script still correctly scores historical raw text
    saved from a pre-v4 (Qwen2.5-VL/GeoChat-format) adapter run without a separate code
    path.

    Coordinate clamping (2026-09-04): the model occasionally emits a raw value >100 on
    this 0-100 scale -- real examples observed in data/vrsbench_accuracy_eval.json include
    101, 103, 106, 107, 108 (e.g. P0019_0002.png's real output {<30><85><61><107>}), a
    genuine calibration imprecision, not a parsing bug. backend/models/geochat_service.py's
    parse_boxes_from_text already clamps its own rendered boxes to the valid [0,1] canvas
    before displaying them in the UI; this eval script did not apply that same clamp, so an
    out-of-range prediction was scored against ground truth as an oversized/invalid box
    (e.g. x2=1.07) instead of the same clamped box the product actually shows a user. That
    made this script's IoU numbers slightly pessimistic versus what a user would
    actually see, and inconsistent with the app's own display logic. Clamping here now
    matches the same policy already used in production.

    Real, checked-before-shipping effect of this fix (recomputed directly against all
    50 stored examples in data/vrsbench_accuracy_eval.json before this change was
    applied, not assumed): clamping raises the IoU on 3 of the 7 out-of-range examples,
    and one of those -- P0019_0002.png, predicted {<30><85><61><107>} vs ground truth
    {<32><86><69><98>} -- crosses the 0.5 threshold (0.4473 unclamped -> 0.6203
    clamped), because the unclamped box's extra y-extent past 1.0 was inflating its
    area (and so the union) without adding any real intersection -- ground truth
    already ends at y2=0.98. Net effect on the headline numbers once this eval is
    re-run: Acc@0.5 moves from 0/50 (0.0%) to 1/50 (2.0%), mean IoU from 0.0647 to
    0.0692. Real, honest, small -- this is a metric-methodology fix, not a model
    improvement. Do not report this as 'the grounding problem is fixed.'"""
    bm = PRED_BBOX2D_RE.search(raw_text)
    if bm:
        x1, y1, x2, y2 = [int(v) / 1000.0 for v in bm.groups()]
        box_x_first = [max(0.0, min(x1, x2)), max(0.0, min(y1, y2)), min(1.0, max(x1, x2)), min(1.0, max(y1, y2))]
        # New format is unambiguously x-first by definition -- y-first is not a real
        # possible reading of it, so both return values are identical here (kept as a
        # pair only so callers checking both keys don't need a format-specific branch).
        return box_x_first, box_x_first

    m = BOX_RE.search(raw_text)
    if not m:
        return None, None
    a, b, c, d = [int(v) / 100.0 for v in m.groups()]
    box_x_first = [max(0.0, min(a, c)), max(0.0, min(b, d)), min(1.0, max(a, c)), min(1.0, max(b, d))]
    box_y_first = [max(0.0, min(b, d)), max(0.0, min(a, c)), min(1.0, max(b, d)), min(1.0, max(a, c))]
    return box_x_first, box_y_first


def iou(box_a, box_b) -> float:
    xa1, ya1, xa2, ya2 = box_a
    xb1, yb1, xb2, yb2 = box_b
    ix1, iy1 = max(xa1, xb1), max(ya1, yb1)
    ix2, iy2 = min(xa2, xb2), min(ya2, yb2)
    iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
    inter = iw * ih
    area_a = max(0.0, xa2 - xa1) * max(0.0, ya2 - ya1)
    area_b = max(0.0, xb2 - xb1) * max(0.0, yb2 - yb1)
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


def run_grounding_eval(ref_ann_path, val_zip_path, num_examples):
    with open(ref_ann_path) as f:
        records = normalize_records(json.load(f))

    zf = zipfile.ZipFile(val_zip_path)
    zip_names = zf.namelist()

    results = []
    scored = 0
    for rec in records:
        if scored >= num_examples:
            break
        image_id = rec.get("image_id")
        question = rec.get("question")
        ground_truth = rec.get("ground_truth")
        if not (image_id and question and ground_truth):
            continue
        gt_box = parse_gt_box_x_first(ground_truth)
        if gt_box is None:
            continue
        img_path = load_image_from_zip(zf, zip_names, image_id, CACHE_DIR / "grounding_images")
        if img_path is None:
            continue

        t0 = time.time()
        vqa_res = geochat_service.run_vqa(img_path, question)
        latency_ms = round((time.time() - t0) * 1000, 1)
        raw_text = vqa_res.get("raw_text", vqa_res.get("text", ""))
        box_x_first, box_y_first = parse_pred_box_both_orderings(raw_text)

        iou_x_first = iou(box_x_first, gt_box) if box_x_first else 0.0
        iou_y_first = iou(box_y_first, gt_box) if box_y_first else 0.0

        results.append(
            {
                "image_id": image_id,
                "question": question,
                "ground_truth_raw": ground_truth,
                "raw_model_output": raw_text,
                "model": vqa_res.get("model"),
                "confidence": vqa_res.get("confidence"),
                "confidence_basis": vqa_res.get("confidence_basis"),
                "latency_ms": latency_ms,
                "box_parsed": box_x_first is not None,
                "iou_if_x_first": round(iou_x_first, 4),
                "iou_if_y_first": round(iou_y_first, 4),
            }
        )
        scored += 1
        if scored % 10 == 0:
            print(f"  Grounding: {scored}/{num_examples} scored...")

    n = len(results)
    parsed = [r for r in results if r["box_parsed"]]

    def acc_at(key, thresh):
        if not parsed:
            return None
        return round(sum(1 for r in parsed if r[key] >= thresh) / len(parsed), 4)

    def mean_of(key):
        if not parsed:
            return None
        return round(sum(r[key] for r in parsed) / len(parsed), 4)

    return {
        "num_examples": n,
        "num_with_parseable_box": len(parsed),
        "acc_at_0.5_if_x_first": acc_at("iou_if_x_first", 0.5),
        "acc_at_0.7_if_x_first": acc_at("iou_if_x_first", 0.7),
        "acc_at_0.5_if_y_first": acc_at("iou_if_y_first", 0.5),
        "acc_at_0.7_if_y_first": acc_at("iou_if_y_first", 0.7),
        "mean_iou_if_x_first": mean_of("iou_if_x_first"),
        "mean_iou_if_y_first": mean_of("iou_if_y_first"),
        "coordinate_order_note": (
            "VRSBench's own ground truth is documented as X-FIRST ({<x1><y1><x2><y2>}). "
            "This script computes IoU under both the X-FIRST and Y-FIRST reading of the "
            "MODEL's own generated box to show, with real data, which one this adapter's "
            "output actually matches -- see geochat_service.parse_boxes_from_text's "
            "docstring for the prior single-example basis of its current Y-FIRST setting, "
            "and revisit that parsing if these results disagree with it."
        ),
        "per_example": results,
    }


def preflight_check():
    """Reports exactly what geochat_service actually loaded, before this script spends
    30-60+ minutes of real GPU/API time on the eval loop. Two real misconfigurations this
    catches immediately instead of only after the fact: (1) REMOTE_INFERENCE_URL /
    COLAB_INFERENCE_URL being set causes _init_model() to skip local GPU loading entirely
    and call that tunnel per-request instead -- if that tunnel isn't live, every example
    silently falls through to the Gemini/Groq/template fallback tiers, and this run would
    NOT be testing the local adapter at all; (2) HF_ADAPTER_REPO being unset, wrong, or
    failing to attach (bad/missing HF_TOKEN for a private repo) leaves adapter_active False,
    meaning this would score the base Qwen2.5-VL-3B, not the fine-tuned v2 adapter."""
    gs = geochat_service
    print("=== Preflight: what geochat_service actually loaded ===")
    print(f"  remote_url (REMOTE_INFERENCE_URL/COLAB_INFERENCE_URL): {gs.remote_url or '(not set -- good, will use local GPU)'}")
    print(f"  is_loaded: {gs.is_loaded}")
    print(f"  quantization_active: {gs.quantization_active}")
    print(f"  adapter_active: {gs.adapter_active}")
    print(f"  adapter_source_fingerprint: {gs.adapter_source_fingerprint}")
    if gs.remote_url:
        print("  WARNING: remote_url is set -- local GPU model loading was SKIPPED entirely. "
              "Every call below will hit that remote tunnel; if it isn't live, results will "
              "reflect the Gemini/Groq/template fallback tiers, not the local v2 adapter. "
              "Unset REMOTE_INFERENCE_URL / COLAB_INFERENCE_URL if that's not what you want.")
    if not gs.adapter_active:
        print("  WARNING: adapter_active is False -- HF_ADAPTER_REPO is unset, or the adapter "
              "failed to attach (check HF_TOKEN if the repo is private). This run would score "
              "the BASE model, not the fine-tuned v2 adapter. Check the logs above for the "
              "real reason before continuing.")
    print("=========================================================\n")


def main():
    parser = argparse.ArgumentParser(
        description="Real quantitative accuracy evaluation against VRSBench's own held-out eval files."
    )
    parser.add_argument("--num-vqa", type=int, default=200)
    parser.add_argument("--num-grounding", type=int, default=150)
    parser.add_argument("--out", type=str, default="data/vrsbench_accuracy_eval.json")
    args = parser.parse_args()

    preflight_check()

    groq_key = geochat_service._read_env_var("GROQ_API_KEY")
    if not groq_key:
        print("GROQ_API_KEY not set -- VQA accuracy will only report the heuristic "
              "word-overlap score, not an LLM-judge score.")

    vqa_ann_path, ref_ann_path, val_zip_path = download_real_eval_assets()

    print(f"\n=== Running real VQA accuracy eval ({args.num_vqa} examples from "
          f"VRSBench_EVAL_vqa.json, held-out Images_val.zip) ===")
    vqa_summary = run_vqa_eval(vqa_ann_path, val_zip_path, args.num_vqa, groq_key)

    print(f"\n=== Running real grounding accuracy eval ({args.num_grounding} examples "
          f"from VRSBench_EVAL_referring.json) ===")
    grounding_summary = run_grounding_eval(ref_ann_path, val_zip_path, args.num_grounding)

    output = {
        "dataset": DATASET_ID,
        "note": (
            "Real quantitative accuracy against VRSBench's own held-out evaluation files -- "
            "not training data, and not the 60 VQA examples already used for "
            "during-training eval tracking. See this script's module docstring for exactly "
            "what is and isn't measured here."
        ),
        "vqa": vqa_summary,
        "grounding": grounding_summary,
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    print("\n=== SUMMARY ===")
    print(f"VQA ({vqa_summary['num_examples']} examples): heuristic word-overlap accuracy = "
          f"{vqa_summary['heuristic_word_overlap_accuracy']}")
    if vqa_summary["groq_llm_judge_accuracy"] is not None:
        print(f"VQA: Groq LLM-judge accuracy = {vqa_summary['groq_llm_judge_accuracy']} "
              f"(on {vqa_summary['groq_llm_judge_examples_scored']} examples)")
    print(f"Grounding ({grounding_summary['num_with_parseable_box']}/"
          f"{grounding_summary['num_examples']} boxes parsed):")
    print(f"  If X-first (VRSBench's documented convention): "
          f"Acc@0.5={grounding_summary['acc_at_0.5_if_x_first']}, "
          f"Acc@0.7={grounding_summary['acc_at_0.7_if_x_first']}, "
          f"mean IoU={grounding_summary['mean_iou_if_x_first']}")
    print(f"  If Y-first (this codebase's current parsing assumption): "
          f"Acc@0.5={grounding_summary['acc_at_0.5_if_y_first']}, "
          f"Acc@0.7={grounding_summary['acc_at_0.7_if_y_first']}, "
          f"mean IoU={grounding_summary['mean_iou_if_y_first']}")
    print(f"\nFull per-example results saved to {out_path}")


if __name__ == "__main__":
    main()
