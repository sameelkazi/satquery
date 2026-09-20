"""
finetuning/rsvqa_prepare.py -- RSVQA-LR training-data preparation.

v2, rewritten after a smoke test confirmed v1's generic auto-detect join picked the wrong
image-id field (it grabbed a bare "id" from an unrelated image record instead of "img_id"
from the question record, because the old code scanned one flattened list of every record
from every file and stopped at the first dict with any field matching
IMAGE_ID_CANDIDATES). Result of that bug: 0 manifest entries even though 772 images
extracted successfully and 77,232 train questions/answers downloaded fine.

Confirmed structure (from a live run against Zenodo record 6344334):
  LR_split_{Train,Val,Test}_questions.json -> top-level list of
    {"id": <question_id>, "img_id": <image_id>, "question": "...",
     "answers_ids": [<answer_id>, ...], "active": true, ...}
  LR_split_{Train,Val,Test}_answers.json -> top-level list of
    {"id": <answer_id>, "question_id": <question_id>, "answer": "...", ...}
  LR_split_{Train,Val,Test}_images.json -> top-level list of
    {"id": <image_id>, "original_name": "S2B_..._1024-2560.tif", ...}
  Each per-split file only carries full fields for records actually in that split --
  records not in that split come back as bare {"id": N, "active": false} stubs in that
  file. So the join must use one split's own three files together, never mixing a
  question from Train with an answer/image record from a different split's file.
  "all_questions.json"/"all_answers.json" contain the union across splits and are used
  only as a fallback if a per-split file is missing.
  12 files total, including Images_LR.zip (95,008,155 bytes, extracts to 772 .tif files).

Not verified: the exact filename convention inside the extracted Images_LR.zip (whether
image id 0 becomes "0.tif", "Images_LR/0.tif", or something derived from
"original_name"). This sandbox's network egress can't reach zenodo.org to check (a
restriction of this dev environment only). Rather than guess one convention, this script
tries several candidate filenames per image id and reports what matched.

Citation: Lobry, S., Marcos, D., Murray, J., Tuia, D. (2020). "RSVQA: Visual
Question Answering for Remote Sensing Data." IEEE TGRS. (arXiv:2003.07333)
"""
import argparse
import json
import sys
import tarfile
import zipfile
from pathlib import Path
from urllib.request import urlopen, urlretrieve

RECORD_ID = "6344334"  # RSVQA-LR (NOT 6344367 / RSVQA-HR)
CITATION = (
    "Lobry, S., Marcos, D., Murray, J., Tuia, D. (2020). "
    "\"RSVQA: Visual Question Answering for Remote Sensing Data.\" IEEE TGRS. "
    "(arXiv:2003.07333) -- data: https://zenodo.org/record/6344334 (RSVQA-LR)"
)
SPLITS = ["Train", "Val", "Test"]


def zenodo_file_list(record_id: str):
    url = f"https://zenodo.org/api/records/{record_id}"
    print(f"Querying Zenodo API: {url}")
    with urlopen(url, timeout=60) as resp:
        meta = json.loads(resp.read())
    files = meta.get("files", [])
    print(f"Record has {len(files)} file(s):")
    for f in files:
        print(f"  {f.get('key','?')}  ({f.get('size',0):,} bytes)")
    return {f["key"]: f for f in files}


def download_file(file_entry: dict, dest_dir: Path):
    key = file_entry["key"]
    link = file_entry["links"]["self"]
    dest = dest_dir / key
    if dest.exists() and dest.stat().st_size == file_entry.get("size", -1):
        print(f"  {key} already downloaded, reusing.")
        return dest
    print(f"  Downloading {key} ({file_entry.get('size', 0):,} bytes) ...")
    urlretrieve(link, dest)
    return dest


def load_list(path: Path, key: str):
    if not path.exists():
        return []
    data = json.loads(path.read_text())
    if isinstance(data, dict):
        return data.get(key, data.get(list(data.keys())[0], []) if data else [])
    return data if isinstance(data, list) else []


def load_split(dest: Path, split: str):
    """3-file join for one split: questions + answers + images, all from that split's
    own files (never mixed across splits), joined by id. Returns a list of
    {question, answer, img_id, original_name} dicts."""
    q_path = dest / f"LR_split_{split}_questions.json"
    a_path = dest / f"LR_split_{split}_answers.json"
    i_path = dest / f"LR_split_{split}_images.json"

    questions = [q for q in load_list(q_path, "questions") if isinstance(q, dict) and q.get("active", True) and "question" in q]
    answers = [a for a in load_list(a_path, "answers") if isinstance(a, dict) and a.get("active", True) and "answer" in a]
    images = [i for i in load_list(i_path, "images") if isinstance(i, dict) and i.get("active", True)]

    ans_by_qid = {}
    for a in answers:
        ans_by_qid.setdefault(a.get("question_id"), a.get("answer"))
    img_by_id = {i.get("id"): i for i in images}

    records = []
    for q in questions:
        ans_ids = q.get("answers_ids") or []
        answer = None
        if ans_ids:
            for aid in ans_ids:
                a = next((x for x in answers if x.get("id") == aid), None)
                if a:
                    answer = a.get("answer")
                    break
        if answer is None:
            answer = ans_by_qid.get(q.get("id"))
        img = img_by_id.get(q.get("img_id"))
        if not (answer and img and q.get("question")):
            continue
        records.append({
            "question": q["question"],
            "answer": str(answer),
            "img_id": q.get("img_id"),
            "original_name": img.get("original_name", ""),
        })
    return records


def find_image_file(images_dir: Path, img_id, original_name: str, cache: dict):
    """Tries several candidate filenames rather than assuming one convention, and caches
    the directory listing so this isn't an O(n^2) rglob per record."""
    if "listing" not in cache:
        cache["listing"] = {p.name: p for p in images_dir.rglob("*") if p.is_file()}
        cache["stems"] = {p.stem: p for p in images_dir.rglob("*") if p.is_file()}
    listing = cache["listing"]
    stems = cache["stems"]

    candidates = [
        f"{img_id}.tif", f"{img_id}.png", f"{img_id}.jpg",
        str(img_id),
    ]
    if original_name:
        candidates.append(original_name)
        candidates.append(Path(original_name).name)
    for c in candidates:
        if c in listing:
            return listing[c]
    if str(img_id) in stems:
        return stems[str(img_id)]
    return None


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--smoke-test", action="store_true",
                     help="Join+preview the schema per split and attempt to resolve at "
                          "most 20 images. Run this first, always.")
    ap.add_argument("--max-examples", type=int, default=15000)
    ap.add_argument("--dest", default="rsvqa_lr_raw", help="Local download destination.")
    ap.add_argument("--out-dir", default="rsvqa_real", help="Output directory for manifest.json.")
    ap.add_argument("--skip-download", action="store_true",
                     help="Reuse whatever's already downloaded/extracted under --dest/--out-dir.")
    ap.add_argument("--cache-repo", type=str, default=None,
                     help="Optional HF dataset repo id to cache the final output (manifest "
                          "+ images, already self-contained under --out-dir) in. Without "
                          "this, every fresh Kaggle session/resume re-downloads all Zenodo "
                          "files (~150 MB) from scratch. With this set, a cache hit does "
                          "one small HF snapshot_download instead, same pattern as "
                          "bigearthnet_txt_extract.py uses.")
    args = ap.parse_args()

    if args.cache_repo:
        try:
            from huggingface_hub import HfApi, snapshot_download
            api = HfApi()
            files = api.list_repo_files(args.cache_repo, repo_type="dataset")
            if "manifest.json" in files:
                print(f"Found an existing cached RSVQA-LR dataset at "
                      f"https://huggingface.co/datasets/{args.cache_repo} -- downloading "
                      f"that directly instead of re-downloading from Zenodo.")
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
            print(f"No cached RSVQA-LR dataset found at {args.cache_repo} ({e}) -- doing "
                  f"the extraction. This will be cached for every future run after this one.")

    print(CITATION)
    dest = Path(args.dest)
    dest.mkdir(parents=True, exist_ok=True)
    images_dir = Path(args.out_dir) / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    if not args.skip_download:
        try:
            files = zenodo_file_list(RECORD_ID)
        except Exception as e:
            print(f"\nCould not reach the Zenodo API ({e}). Not fabricating a file list.")
            sys.exit(1)

        needed = []
        for split in SPLITS:
            for kind in ["questions", "answers", "images"]:
                key = f"LR_split_{split}_{kind}.json"
                if key in files:
                    needed.append(key)
        if not needed:
            print("\nNone of the expected LR_split_*.json files were found in the "
                  "Zenodo file list above -- the record's file names may have changed. "
                  "Paste this output back before proceeding.")
            sys.exit(1)
        for key in needed:
            download_file(files[key], dest)

        archive_key = next((k for k in files if k.lower().startswith("images_lr")), None)
        if archive_key and not any(images_dir.iterdir()):
            local_archive = download_file(files[archive_key], dest)
            print(f"  Extracting image archive {local_archive.name} ...")
            if local_archive.suffix == ".zip":
                with zipfile.ZipFile(local_archive) as zf:
                    zf.extractall(images_dir)
            elif local_archive.name.endswith((".tar.gz", ".tgz")):
                with tarfile.open(local_archive) as tf:
                    tf.extractall(images_dir)
    else:
        print(f"\n--skip-download set -- using whatever already exists under {dest} / {images_dir}.")

    print("\n=== Per-split question+answer+image join ===")
    all_records = []
    for split in SPLITS:
        recs = load_split(dest, split)
        print(f"  {split}: {len(recs)} joined question/answer/img_id records")
        if recs:
            print(f"    First: {recs[0]}")
        all_records.extend(recs)

    if not all_records:
        print("\nCould not join any records from the per-split files -- paste the "
              "keys/preview of LR_split_Train_questions.json / _answers.json / "
              "_images.json back (this script already prints them above on a full run).")
        sys.exit(1)

    print(f"\nImage files visible under {images_dir}: "
          f"{sum(1 for _ in images_dir.rglob('*') if _.is_file())}")
    sample = images_dir.rglob("*")
    sample_names = [p.name for p in list(images_dir.rglob("*"))[:10] if p.is_file()]
    print(f"Sample extracted filenames: {sample_names}")

    max_examples = 20 if args.smoke_test else args.max_examples
    manifest = []
    skipped_no_image = 0
    cache = {}
    for rec in all_records:
        if len(manifest) >= max_examples:
            break
        img_path = find_image_file(images_dir, rec["img_id"], rec["original_name"], cache)
        if img_path is None:
            skipped_no_image += 1
            continue
        manifest.append({
            "image_path": str(img_path),
            "prompt": f"[rsvqa] {rec['question']}",
            "response": rec["answer"],
        })

    print(f"\n=== Result ===")
    print(f"Joined records available: {len(all_records)}")
    print(f"Skipped (no resolvable image file found on disk): {skipped_no_image}")
    print(f"Usable RSVQA-LR examples built: {len(manifest)}")

    if not manifest:
        print(
            "\nZero usable examples -- none of the tried filename patterns "
            "(<img_id>.tif/.png/.jpg, the bare id, or the 'original_name' field) matched "
            "an extracted file. Paste the 'Sample extracted filenames' line above plus a "
            "few img_id/original_name values from the join preview back, rather than "
            "guessing further."
        )
        sys.exit(1)

    out_dir = Path(args.out_dir)
    with open(out_dir / "manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"\nSaved {len(manifest)} RSVQA-LR examples to {out_dir}/manifest.json")

    if args.cache_repo:
        # Images already live under out_dir/images/..., so out_dir is already
        # self-contained -- no path rewriting needed, just push it.
        from huggingface_hub import HfApi
        api = HfApi()
        print(f"Pushing self-contained cache (manifest + images) to "
              f"https://huggingface.co/datasets/{args.cache_repo} so future runs don't "
              f"need to re-download from Zenodo.")
        api.create_repo(args.cache_repo, repo_type="dataset", private=True, exist_ok=True)
        api.upload_folder(repo_id=args.cache_repo, repo_type="dataset", folder_path=str(out_dir))
        print("Done.")


if __name__ == "__main__":
    main()
