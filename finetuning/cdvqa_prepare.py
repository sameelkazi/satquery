"""
finetuning/cdvqa_prepare.py -- CDVQA (Change Detection Visual Question Answering)
training-data preparation.

Confirmed repo structure (from a live clone + inspection): repo
https://github.com/YZHJessica/CDVQA.git contains, per split (Train/Val/Test/Test2):
  {Split}_questions.json -> {"questions": [
      {"id": 0, "img_id": 0, "type": "change_or_not",
       "question": "Did the regions of buildings change?", "answers_ids": [0], ...}, ...]}
  {Split}_answers.json   -> {"answers": [
      {"id": 0, "question_id": 0, "answer": "yes", ...}, ...]}
  {Split}_images.json    -> {"images": [
      {"id": 0, "res_x": ".1524m", "res_y": ".1524m",
       "questions_ids": [0, 1], "file_name": "07308.png", ...}, ...]}
Confirmed counts: Train 65,967 questions / 25,600 image entries; Val 16,441 / 6,400;
Test 39,686 / 15,488; Test2 31,036 / 15,488. No image files or download URL are committed
to this repo -- a clone contains only the JSON files, LICENSE, and a short README.

Image source (per the CDVQA paper, arXiv:2112.06343): "we choose the existing semantic
change detection dataset SECOND [18] as the basic data to automatically generate a CDVQA
dataset" -- 2,968 of SECOND's bi-temporal pairs (Shanghai/Hangzhou/Chengdu aerial imagery).
SECOND's project page (captain-whu.github.io/SCD, Wuhan University) hosts it via two
Google Drive links (4,662 pairs total, 512x512):
    https://drive.google.com/file/d/1mN8jzCKKK27p3ODGoDgepjiRYGQpB34u/view
    https://drive.google.com/file/d/1QlAdzrHpfBIOZ6SK78yHF2i1u6tikmBc/view

Not verified: SECOND's internal folder-naming convention for the pre-/post-change image
pair (common bi-temporal-CD conventions are im1/im2, A/B, or T1/T2). This script tries all
of these against whatever `file_name` values CDVQA's images.json records use, and prints
what it finds rather than assuming one. This dev sandbox has no network egress to
drive.google.com; run --smoke-test first and check the printed folder-structure
diagnostics before trusting a full run.

Requires `gdown` for the Google Drive download (pip install gdown --quiet if missing).
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

REPO_URL = "https://github.com/YZHJessica/CDVQA.git"
SECOND_GDRIVE_IDS = [
    "1mN8jzCKKK27p3ODGoDgepjiRYGQpB34u",
    "1QlAdzrHpfBIOZ6SK78yHF2i1u6tikmBc",
]
CITATION = (
    "Yuan, Z., Mou, L., Xiong, Z., Zhu, X.X. (2022). "
    "\"Change detection meets visual question answering.\" IEEE TGRS, 60. "
    "(arXiv:2112.06343) -- QA data: https://github.com/YZHJessica/CDVQA -- "
    "images: SECOND dataset (Yang et al., arXiv:2010.05687), "
    "https://captain-whu.github.io/SCD/"
)
PRE_POST_FOLDER_CANDIDATES = [
    ("im1", "im2"),
    ("A", "B"),
    ("T1", "T2"),
    ("before", "after"),
    ("im1_512", "im2_512"),
]


def ensure_gdown():
    try:
        import gdown  # noqa: F401
    except ImportError:
        print("Installing gdown (needed to download SECOND's Google Drive archive)...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "gdown"], check=True)


def clone_repo(dest: Path):
    if dest.exists():
        print(f"{dest} already exists locally -- reusing it (delete it first for a clean re-clone).")
        return
    print(f"Cloning CDVQA QA-data repo from {REPO_URL} ...")
    subprocess.run(["git", "clone", "--depth", "1", REPO_URL, str(dest)], check=True)


def load_split(repo_dir: Path, split: str):
    """3-file join: questions + answers + images, by id. Returns a list of
    {question, answer, file_name} dicts (metadata only, no image bytes yet)."""
    def _load(name, key):
        p = repo_dir / f"{split}_{name}.json"
        if not p.exists():
            return []
        data = json.loads(p.read_text())
        return data.get(key, [])

    questions = _load("questions", "questions")
    answers = _load("answers", "answers")
    images = _load("images", "images")
    if not (questions and answers and images):
        return []

    ans_by_id = {a["id"]: a.get("answer") for a in answers}
    img_by_id = {i["id"]: i.get("file_name") for i in images}

    records = []
    for q in questions:
        ans_ids = q.get("answers_ids") or []
        if not ans_ids:
            continue
        answer = ans_by_id.get(ans_ids[0])
        file_name = img_by_id.get(q.get("img_id"))
        if not (answer and file_name and q.get("question")):
            continue
        records.append({
            "question": q["question"],
            "answer": answer,
            "file_name": file_name,
            "type": q.get("type", "unknown"),
        })
    return records


def find_second_image_root(second_dir: Path):
    """Discovers whatever folder structure SECOND's archive actually unzips to -- prints
    top-level and second-level directories and reports which of
    PRE_POST_FOLDER_CANDIDATES (if any) exist, rather than assuming."""
    print(f"\nDirectory structure under {second_dir}:")
    found_pairs = []
    for p in sorted(second_dir.rglob("*")):
        if p.is_dir():
            rel = p.relative_to(second_dir)
            depth = len(rel.parts)
            if depth <= 2:
                print(f"  [dir depth={depth}] {rel}")
    for pre_name, post_name in PRE_POST_FOLDER_CANDIDATES:
        pre_dirs = list(second_dir.rglob(pre_name))
        post_dirs = list(second_dir.rglob(post_name))
        if pre_dirs and post_dirs:
            print(f"  Match: found both '{pre_name}' and '{post_name}' folders "
                  f"({pre_dirs[0]}, {post_dirs[0]})")
            found_pairs.append((pre_dirs[0], post_dirs[0]))
    if not found_pairs:
        print("  No known pre/post folder-naming convention "
              f"({PRE_POST_FOLDER_CANDIDATES}) matched anything under {second_dir}. "
              "Paste this whole directory listing back rather than guessing further.")
    return found_pairs


def download_second_images(dest_dir: Path):
    ensure_gdown()
    import gdown
    dest_dir.mkdir(parents=True, exist_ok=True)
    for i, file_id in enumerate(SECOND_GDRIVE_IDS):
        out_zip = dest_dir / f"second_part{i}.zip"
        if out_zip.exists():
            print(f"  {out_zip} already downloaded, reusing.")
        else:
            print(f"  Downloading SECOND archive part {i} from Google Drive "
                  f"(id={file_id}) ...")
            try:
                gdown.download(id=file_id, output=str(out_zip), quiet=False)
            except Exception as e:
                print(f"  Download failed for part {i}: {e}. Google Drive rate-limits/"
                      f"quota-blocks large-file downloads sometimes -- if this keeps "
                      f"failing, download {out_zip.name} manually via a browser from "
                      f"https://drive.google.com/file/d/{file_id}/view and place it at "
                      f"{out_zip}, then re-run this script.")
                continue
        if out_zip.exists() and out_zip.stat().st_size > 0:
            print(f"  Extracting {out_zip.name} ...")
            import zipfile
            try:
                with zipfile.ZipFile(out_zip) as zf:
                    zf.extractall(dest_dir)
            except zipfile.BadZipFile:
                print(f"  {out_zip.name} is not a valid zip file (likely an HTML error "
                      f"page from a blocked/quota-limited Drive download, not the real "
                      f"archive) -- delete it and retry, or download manually.")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--smoke-test", action="store_true",
                     help="Join+preview the QA schema and attempt a small download to "
                          "discover the image folder structure. Run this first, always.")
    ap.add_argument("--max-examples", type=int, default=20000)
    ap.add_argument("--repo-dest", default="cdvqa_repo")
    ap.add_argument("--images-dest", default="second_images")
    ap.add_argument("--out-dir", default="cdvqa_real")
    ap.add_argument("--skip-image-download", action="store_true",
                     help="Use if you already have SECOND's images extracted locally "
                          "under --images-dest from a manual download.")
    ap.add_argument("--cache-repo", type=str, default=None,
                     help="Optional HF dataset repo id to cache the final (small manifest "
                          "+ referenced images, self-contained under --out-dir) output in. "
                          "Without this, every fresh Kaggle session/resume re-clones the "
                          "repo and re-downloads SECOND's ~4 GiB Google Drive archive from "
                          "scratch, wasting wall-clock and Google Drive's rate limits. "
                          "With this set, a cache hit does one small HF snapshot_download "
                          "instead, same pattern as bigearthnet_txt_extract.py uses.")
    args = ap.parse_args()

    if args.cache_repo:
        try:
            from huggingface_hub import HfApi, snapshot_download
            api = HfApi()
            files = api.list_repo_files(args.cache_repo, repo_type="dataset")
            if "manifest.json" in files:
                print(f"Found an existing cached CDVQA dataset at "
                      f"https://huggingface.co/datasets/{args.cache_repo} -- downloading "
                      f"that directly instead of re-cloning/re-downloading from GitHub + "
                      f"Google Drive.")
                snapshot_download(repo_id=args.cache_repo, repo_type="dataset",
                                   local_dir=str(args.out_dir))
                cached = json.loads((Path(args.out_dir) / "manifest.json").read_text())
                print(f"Wrote {args.out_dir}/manifest.json from cache ({len(cached)} "
                      f"examples, images included). Done.")
                return
            else:
                print(f"Cache repo exists at {args.cache_repo} but manifest.json is "
                      f"missing -- redoing extraction.")
        except Exception as e:
            print(f"No cached CDVQA dataset found at {args.cache_repo} ({e}) -- doing the "
                  f"extraction. This will be cached for every future run after this one.")

    print(CITATION)
    repo_dest = Path(args.repo_dest)
    clone_repo(repo_dest)

    print("\n=== Question+answer+image-filename join, per split ===")
    all_records = []
    for split in ["Train", "Val", "Test", "Test2"]:
        recs = load_split(repo_dest, split)
        print(f"  {split}: {len(recs)} joined question/answer/file_name records")
        if recs:
            print(f"    First: {recs[0]}")
        all_records.extend(recs)

    if not all_records:
        print("\nCould not join any records -- the file-naming convention "
              "(Train_questions.json etc) may not match what's really in the repo. "
              "Re-check the repo's file listing and paste it back.")
        sys.exit(1)

    images_dest = Path(args.images_dest)
    if not args.skip_image_download:
        print(f"\nDownloading SECOND's image archive (large, this can take a while) "
              f"into {images_dest} ...")
        download_second_images(images_dest)
    else:
        print(f"\n--skip-image-download set -- using whatever already exists under {images_dest}.")

    pairs = find_second_image_root(images_dest)
    if not pairs:
        print(
            "\nCould not confirm a pre/post image-folder convention -- stopping here "
            "rather than fabricating a manifest. If the download above failed or was "
            "rate-limited, download the two Google Drive files manually "
            f"({SECOND_GDRIVE_IDS}) via a browser, extract them under {images_dest}, "
            "then re-run with --skip-image-download."
        )
        sys.exit(1)

    pre_root, post_root = pairs[0]
    max_examples = 20 if args.smoke_test else args.max_examples
    manifest = []
    skipped_no_image = 0
    for rec in all_records:
        if len(manifest) >= max_examples:
            break
        pre_path = pre_root / rec["file_name"]
        post_path = post_root / rec["file_name"]
        if not (pre_path.exists() and post_path.exists()):
            skipped_no_image += 1
            continue
        manifest.append({
            "image_path_pre": str(pre_path),
            "image_path_post": str(post_path),
            "prompt": f"[cdvqa] {rec['question']}",
            "response": str(rec["answer"]),
        })

    print(f"\n=== Result ===")
    print(f"Joined records available: {len(all_records)}")
    print(f"Skipped (image pair not found on disk at {pre_root}/{post_root}): {skipped_no_image}")
    print(f"Usable bi-temporal CDVQA examples built: {len(manifest)}")

    if not manifest:
        print("\nZero usable examples -- the file_name values in CDVQA's images.json "
              "likely don't match SECOND's filenames 1:1 (e.g. a numbering/zero-padding "
              "mismatch). Paste a few file_name values from the join above and a real "
              "directory listing of the extracted SECOND images "
              "(`ls second_images/im1 | head`) back for a fix, rather than guessing.")
        sys.exit(1)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.cache_repo:
        # The images currently live under the separate --images-dest, not nested under
        # --out-dir -- move (not copy) just the ones this manifest references into
        # out_dir/images/{im1,im2}/ and rewrite the manifest to point there, so out_dir
        # is one self-contained unit a future session can restore from a single
        # snapshot_download.
        #
        # This used to copy2, which left the SECOND images on disk twice (once under
        # --images-dest, once under out_dir) -- risky against Kaggle's persisted-output
        # quota for a dataset this size. Moving instead (and removing the now-empty
        # --images-dest tree afterward) keeps only one copy on disk; safe because
        # --images-dest is never read again this run once the cache is pushed, and
        # future runs pull images from the HF cache instead of re-downloading.
        # Non-cache runs (no --cache-repo) are unaffected.
        import shutil
        cache_im1_dir = out_dir / "images" / "im1"
        cache_im2_dir = out_dir / "images" / "im2"
        cache_im1_dir.mkdir(parents=True, exist_ok=True)
        cache_im2_dir.mkdir(parents=True, exist_ok=True)
        for row in manifest:
            pre_src, post_src = Path(row["image_path_pre"]), Path(row["image_path_post"])
            pre_dst, post_dst = cache_im1_dir / pre_src.name, cache_im2_dir / post_src.name
            if pre_src.exists() and not pre_dst.exists():
                shutil.move(str(pre_src), str(pre_dst))
            if post_src.exists() and not post_dst.exists():
                shutil.move(str(post_src), str(post_dst))
            row["image_path_pre"] = str(pre_dst)
            row["image_path_post"] = str(post_dst)

        images_root = Path(args.images_dest)
        if images_root.exists():
            freed_bytes = sum(f.stat().st_size for f in images_root.rglob("*") if f.is_file())
            shutil.rmtree(images_root, ignore_errors=True)
            print(f"Freed ~{freed_bytes / (1024**3):.2f} GiB by removing the now-redundant "
                  f"{images_root} after moving its needed files into {out_dir}.")

    with open(out_dir / "manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"\nSaved {len(manifest)} CDVQA examples to {out_dir}/manifest.json")

    if args.cache_repo:
        from huggingface_hub import HfApi
        api = HfApi()
        print(f"Pushing self-contained cache (manifest + referenced images) to "
              f"https://huggingface.co/datasets/{args.cache_repo} so future runs don't "
              f"need to re-clone/re-download from GitHub + Google Drive.")
        api.create_repo(args.cache_repo, repo_type="dataset", private=True, exist_ok=True)
        api.upload_folder(repo_id=args.cache_repo, repo_type="dataset", folder_path=str(out_dir))
        print("Done.")


if __name__ == "__main__":
    main()
