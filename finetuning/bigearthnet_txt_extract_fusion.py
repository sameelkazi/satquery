"""
finetuning/bigearthnet_txt_extract_fusion.py

Builds two-image (Sentinel-2 optical + Sentinel-1 SAR) training examples so the
fine-tuned model learns to jointly reason over both modalities at training time, rather
than optical-SAR fusion only existing as an inference-time heuristic (see
backend/models/sar_fusion_service.py, which does backscatter analysis at query time but
never feeds it back into fine-tuning).

Background: this project's PRD originally assumed BigEarthNet.txt ships annotation text
that explicitly describes SAR-derived information alongside optical content. Checking the
actual paper (arXiv:2603.29630), its project page (txt.bigearth.net) and the refinement
paper (arXiv:2407.03653) does not support that -- the confirmed annotation types
(geographically-anchored captions, VQA, referring-expression grounding) are derived from
Sentinel-2 optical content only; there's no SAR-specific or cross-modal annotation type in
that dataset. Training on the earlier assumption would mean teaching the model that text
describes SAR content it never actually saw.

Approach used here: BigEarthNet.txt's optical annotation text is kept unchanged, and a
second sentence is appended that is a computed statement derived from that same patch's
real Sentinel-1 VV/VH pixels -- which polarization has higher backscatter, by what ratio,
and how the patch's texture compares to the rest of this extracted sample (a self-relative
comparison; see the calibration note below). This mirrors what sar_fusion_service.py
already does at inference time, now baked into a training target as well.

Facts this relies on:
  - BigEarthNet-S1.tar.zst is at the same Zenodo record as the S2 archive
    bigearthnet_txt_extract.py already streams:
    https://zenodo.org/records/10891137/files/BigEarthNet-S1.tar.zst (~51 GiB).
  - S1 patch-folder naming: "<S1A|S1B>_IW_GRDH_1SDV_<date>T<time>_<S2-tile-id><H>_<V>",
    with per-band files "<patch_folder_name>_VV.tif" / "<patch_folder_name>_VH.tif" (per
    bigearth.net's Description_BigEarthNet_v2.pdf).
  - The join key from an S2 patch to its S1 counterpart is the "s1_name" column in
    BigEarthNet.txt's annotation parquet, already captured by bigearthnet_txt_filter.py's
    select_rows() but unused until now.

Calibration is not verified: whether the S1 GeoTIFF pixels are linear backscatter,
dB-scaled, or raw digital number was not confirmed (this sandbox can't reach zenodo.org;
Kaggle/local sessions can). The generated statistics/text are therefore relative and
calibration-agnostic (which band is brighter, by what ratio, texture relative to this
sample's own distribution) rather than asserting absolute physical units -- these
comparisons hold under either a linear or monotonic dB transform. Run --smoke-test first
and inspect the printed pixel-value ranges before trusting a full run.

Scope is deliberately small (per the PRD's guidance for this stage -- enough to satisfy
the requirement and show a measurable difference, not to be exhaustive): default 3,000
examples, since this also requires a fresh ~51 GiB S1 stream on top of the already-cached
S2 images.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable

import numpy as np

S1_BANDS = ["VV", "VH"]
S1_ARCHIVE_URL = "https://zenodo.org/records/10891137/files/BigEarthNet-S1.tar.zst"


def wanted_s1_member_names(s1_names: Iterable[str]) -> dict[str, tuple[str, str]]:
    """Same basename-matching approach as bigearthnet_txt_extract.py's
    wanted_member_names() -- the exact root-folder prefix inside the S1 archive hasn't
    been independently verified, so matching is by basename only."""
    wanted = {}
    for name in s1_names:
        for band in S1_BANDS:
            wanted[f"{name}_{band}.tif"] = (name, band)
    return wanted


def stream_extract_s1_patches(archive_url: str, wanted: dict[str, tuple[str, str]],
                               session=None) -> dict[str, dict[str, np.ndarray]]:
    """Forward-only stream of BigEarthNet-S1.tar.zst, decoding VV/VH bands to arrays as
    they arrive and dropping raw bytes immediately (same memory discipline as the S2
    stream). Keeps decoded arrays rather than saved PNGs, since the pixel statistics are
    needed before deciding how to describe each patch (see main())."""
    import tarfile
    import zstandard
    from rasterio.io import MemoryFile

    if session is None:
        raise ValueError("a real requests.Session is required")

    def read_band(raw_bytes: bytes) -> np.ndarray:
        with MemoryFile(raw_bytes) as memfile:
            with memfile.open() as src:
                return src.read(1).astype(np.float32)

    per_patch: dict[str, dict[str, np.ndarray]] = {}
    wanted_names = {name for name, _band in wanted.values()}
    resp = session.get(archive_url, stream=True, timeout=120)
    resp.raise_for_status()
    raw_stream = resp.raw
    raw_stream.decode_content = True

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
                name, band = hit
                f = tar.extractfile(member)
                if f is None:
                    continue
                per_patch.setdefault(name, {})[band] = read_band(f.read())

                if members_seen % 200_000 == 0:
                    have = sum(1 for v in per_patch.values() if len(v) == len(S1_BANDS))
                    print(f"  ...scanned {members_seen} S1 tar members, "
                          f"{have}/{len(wanted_names)} wanted S1 patches fully matched so far",
                          flush=True)

                complete = sum(1 for v in per_patch.values() if len(v) == len(S1_BANDS))
                if complete == len(wanted_names):
                    print("All wanted S1 patches matched -- stopping stream early.",
                          flush=True)
                    break
    return per_patch


def make_sar_composite(vv: np.ndarray, vh: np.ndarray):
    """Standard Sentinel-1 dual-pol RGB composite (R=VV, G=VH, B=VV/VH ratio) -- the
    convention used in ESA/Copernicus's own dual-pol GRD visualization guidance.
    Percentile-stretches each channel independently, which is calibration-agnostic
    (works the same whether raw values are linear or dB)."""
    from PIL import Image

    def stretch(x, lo_pct=2.0, hi_pct=98.0):
        lo, hi = np.percentile(x, [lo_pct, hi_pct])
        if hi <= lo:
            return np.full_like(x, 128, dtype=np.uint8)
        return (np.clip((x - lo) / (hi - lo), 0.0, 1.0) * 255.0).astype(np.uint8)

    ratio = vv / (vh + 1e-6)
    r, g, b = stretch(vv), stretch(vh), stretch(ratio)
    rgb = np.stack([r, g, b], axis=-1)
    return Image.fromarray(rgb, mode="RGB")


def classify_relative(value: float, all_values: list[float]) -> str:
    """Calibration-agnostic, corpus-relative classification: describes a patch relative
    to the other patches extracted in this run, never against an absolute threshold
    (see module docstring)."""
    q1, q3 = np.percentile(all_values, [25, 75])
    if value >= q3:
        return "higher than most other scenes in this set"
    if value <= q1:
        return "lower than most other scenes in this set"
    return "in the typical range for this set"


def sar_sentence(vv_mean: float, vh_mean: float, vv_cv: float,
                  all_ratios: list[float], all_cvs: list[float]) -> str:
    ratio = vv_mean / (vh_mean + 1e-6)
    ratio_desc = classify_relative(ratio, all_ratios)
    texture_desc = classify_relative(vv_cv, all_cvs)
    if ratio >= np.percentile(all_ratios, 75) and vv_cv >= np.percentile(all_cvs, 50):
        hint = ("patterns like this -- strong VV relative to VH plus higher backscatter "
                "texture -- are often associated with dense built-up areas or other "
                "structures that produce double-bounce radar scattering")
    elif ratio <= np.percentile(all_ratios, 25) and vv_cv <= np.percentile(all_cvs, 50):
        hint = ("patterns like this -- weak, uniform backscatter across both "
                "polarizations -- are often associated with smooth, homogeneous surfaces "
                "such as calm water or bare/compacted ground")
    else:
        hint = ("this doesn't strongly match either the built-up or smooth-surface "
                "extremes commonly seen in Sentinel-1 imagery")
    return (f"In the paired Sentinel-1 SAR image, VV backscatter is {ratio_desc} relative "
            f"to VH (VV/VH ratio {ratio:.2f} in this scene), and backscatter texture is "
            f"{texture_desc} for this dataset ({hint}). This is a computed description of "
            f"the SAR data itself, not a certainty about land cover -- treat it as a "
            f"supporting cue alongside the optical description above.")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--selected", type=Path, default=Path("bigearthnet_txt_selected.json"),
                     help="Output of bigearthnet_txt_filter.py -- must include s1_name "
                          "values (re-run filter.py if this doesn't exist yet; it's a "
                          "cheap parquet-only step, not the expensive image download).")
    ap.add_argument("--optical-cache-dir", type=Path, default=Path("bigearthnet_txt_real"),
                     help="Directory already containing the cached S2 optical images + "
                          "manifest.json from bigearthnet_txt_extract.py's cache path -- "
                          "reused here rather than re-streaming S2.")
    ap.add_argument("--max-examples", type=int, default=3000)
    ap.add_argument("--out-dir", type=Path, default=Path("bigearthnet_sar_fusion_real"))
    ap.add_argument("--cache-repo", type=str, required=True)
    ap.add_argument("--smoke-test", action="store_true")
    args = ap.parse_args()

    from huggingface_hub import HfApi, snapshot_download

    api = HfApi()
    try:
        files = api.list_repo_files(args.cache_repo, repo_type="dataset")
        if "manifest.json" in files:
            print(f"Found an existing cached SAR-fusion dataset at "
                  f"https://huggingface.co/datasets/{args.cache_repo} -- downloading that "
                  f"directly instead of re-streaming the ~51 GiB S1 archive.")
            snapshot_download(repo_id=args.cache_repo, repo_type="dataset",
                               local_dir=str(args.out_dir))
            cached = json.loads((args.out_dir / "manifest.json").read_text())
            print(f"Wrote {args.out_dir}/manifest.json from cache ({len(cached)} examples). Done.")
            return
        else:
            print(f"Cache repo exists at {args.cache_repo} but manifest.json is missing "
                  f"-- redoing extraction.")
    except Exception as e:
        print(f"No cached SAR-fusion dataset found at {args.cache_repo} ({e}) -- doing the "
              f"one-time extraction. This will be cached for every future run after this one.")

    if not args.selected.exists():
        print(f"{args.selected} not found -- run bigearthnet_txt_filter.py first (cheap, "
              f"parquet-only, no image download) to produce it with s1_name values.")
        raise SystemExit(1)
    if not (args.optical_cache_dir / "manifest.json").exists():
        print(f"{args.optical_cache_dir}/manifest.json not found -- run "
              f"bigearthnet_txt_extract.py's cache path first so S2 optical images are "
              f"already available locally for reuse here.")
        raise SystemExit(1)

    selected = json.loads(args.selected.read_text())
    optical_manifest = json.loads((args.optical_cache_dir / "manifest.json").read_text())
    # bigearthnet_txt_extract.py names each saved optical image "ben_txt_<patch_id>.png"
    # (see build_manifest() there) -- recover patch_id from that naming convention.
    optical_by_patch_id = {}
    for row in optical_manifest:
        stem = Path(row["image_path"]).stem  # "ben_txt_<patch_id>"
        if stem.startswith("ben_txt_"):
            optical_by_patch_id[stem[len("ben_txt_"):]] = row

    usable = [r for r in selected
              if r.get("s1_name") and r["patch_id"] in optical_by_patch_id]
    print(f"Rows with both a usable s1_name and an already-cached optical image: "
          f"{len(usable)} out of {len(selected)} selected rows.")
    if not usable:
        print("No usable rows -- either bigearthnet_txt_selected.json has no s1_name "
              "values, or none of its patch_ids overlap with the cached optical "
              "manifest. Paste a few selected[i] rows and optical_manifest[i] entries "
              "back rather than guessing why.")
        raise SystemExit(1)

    max_examples = 20 if args.smoke_test else args.max_examples
    usable = usable[:max_examples]
    s1_names = sorted({r["s1_name"] for r in usable})
    wanted = wanted_s1_member_names(s1_names)
    print(f"Need S1 pixels for {len(s1_names)} unique patches "
          f"({len(wanted)} band files) -- streaming {S1_ARCHIVE_URL} ...")

    import requests
    session = requests.Session()
    per_patch_s1 = stream_extract_s1_patches(S1_ARCHIVE_URL, wanted, session=session)

    complete = {name: bands for name, bands in per_patch_s1.items()
                if all(b in bands for b in S1_BANDS)}
    print(f"S1 patches with both VV and VH successfully extracted: {len(complete)} "
          f"out of {len(s1_names)} needed.")
    if complete:
        sample_vv = next(iter(complete.values()))["VV"]
        print(f"Extracted VV pixel value range for one sample patch: "
              f"min={sample_vv.min():.4f}, max={sample_vv.max():.4f}, "
              f"mean={sample_vv.mean():.4f} -- inspect this before trusting the run: "
              f"very large values (thousands+) suggest raw digital numbers, small/negative "
              f"values suggest dB, values in a narrow 0-1-ish band suggest calibrated "
              f"linear backscatter. The statistics/text below are calibration-agnostic "
              f"either way (see module docstring), but knowing the convention matters for "
              f"any future absolute-unit claims.")
    if not complete:
        print("Zero S1 patches fully matched -- the member-basename convention inside "
              "BigEarthNet-S1.tar.zst may differ from what was assumed "
              "(<s1_name>_VV.tif / <s1_name>_VH.tif). Print the first ~20 member names "
              "from the stream and compare before re-running against the full archive.")
        raise SystemExit(1)

    # Per-patch summary stats (scalars only) for the corpus-relative classification in
    # sar_sentence().
    stats_by_name = {}
    for name, bands in complete.items():
        vv, vh = bands["VV"], bands["VH"]
        stats_by_name[name] = {
            "vv_mean": float(vv.mean()), "vh_mean": float(vh.mean()),
            "vv_cv": float(vv.std() / (abs(vv.mean()) + 1e-6)),
        }
    all_ratios = [s["vv_mean"] / (s["vh_mean"] + 1e-6) for s in stats_by_name.values()]
    all_cvs = [s["vv_cv"] for s in stats_by_name.values()]

    images_dir = args.out_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)
    manifest = []
    skipped = 0
    for row in usable:
        s1_name = row["s1_name"]
        if s1_name not in complete:
            skipped += 1
            continue
        bands = complete[s1_name]
        composite = make_sar_composite(bands["VV"], bands["VH"])
        sar_path = images_dir / f"sar_{s1_name}.png"
        composite.save(sar_path)
        composite.close()

        s = stats_by_name[s1_name]
        sentence = sar_sentence(s["vv_mean"], s["vh_mean"], s["vv_cv"], all_ratios, all_cvs)
        optical_row = optical_by_patch_id[row["patch_id"]]

        manifest.append({
            "image_path_optical": optical_row["image_path"],
            "image_path_sar": str(sar_path),
            "prompt": ("Using the optical and SAR images together, what does each show, "
                       "and what does the SAR image add that the optical image alone does "
                       "not?"),
            "response": f"{optical_row['response']} {sentence}",
            "task_tag": "fusion",
        })
    if skipped:
        print(f"Skipped {skipped} rows whose S1 patch wasn't fully extracted.")

    args.out_dir.mkdir(parents=True, exist_ok=True)
    (args.out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"\nWrote {len(manifest)} optical+SAR fusion training examples to "
          f"{args.out_dir}/manifest.json.")

    print(f"Pushing processed cache to https://huggingface.co/datasets/{args.cache_repo} "
          f"so future runs don't need to re-stream the ~51 GiB S1 archive.")
    api.create_repo(args.cache_repo, repo_type="dataset", private=True, exist_ok=True)
    api.upload_folder(repo_id=args.cache_repo, repo_type="dataset", folder_path=str(args.out_dir))
    print("Done.")


if __name__ == "__main__":
    main()
