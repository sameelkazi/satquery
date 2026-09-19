# SatQuery v4 Training Runbook — Kaggle Relay (6-7 accounts)

**This run is sized purely for model quality, not against a calendar deadline** (the SIH26167 deadline has been confirmed extended). The full-checkpoint Hub-resume relay (below) is exactly what makes a run this size practical across a rotating group of accounts — there's no "must finish by X," just keep the relay going until `trainer.train()` completes.

**v4 update (2026-09-12, same day as v3):** two more changes landed on top of the v3 data/capacity scale-up, both researched and verified before being written into the notebook, neither yet run on real GPU time:

1. **Base model upgraded**: `Qwen/Qwen2.5-VL-3B-Instruct` → `Qwen/Qwen3-VL-4B-Instruct`. Same lineage (same Qwen team, direct successor), Apache-2.0 licensed, confirmed working bnb 4-bit quantization, identical LoRA target-module names on the language side, and a real structural improvement — the vision-tower MLP naming collision that forced this notebook's `exclude_modules` LoRA safeguard for Qwen2.5-VL no longer exists in Qwen3-VL.
2. **Box format switched**: referring-expression/grounding labels now use Qwen3-VL's own documented native format, `{"bbox_2d": [x1, y1, x2, y2]}` normalized 0-1000, instead of the inherited GeoChat-era `{<x1><y1><x2><y2>}` 0-100 bracket convention. This is a bet that fine-tuning lands more accurately when it reinforces a format the base model's own pretraining already associates with grounding — a reasonable, evidence-informed choice, not a proven fix. The v3 data/capacity scale-up below is still likely the bigger driver of any real accuracy gain.

Notebook is already updated and committed (`finetuning/kaggle_finetune_qwen2vl.ipynb`, commit `4a10aac`): up to 100,000 VRSBench examples + up to 150,000 BigEarthNet.txt referring-expression examples (up to 250,000 combined), 2 epochs, LoRA rank 32, targeting `HF_REPO_ID = "Sameelkazi/satquery-qwen3vl-vrsbench-lora-v4"`.

**Because the base model itself changed, not just the LoRA shape, any adapter trained under the old `-v3` repo (Qwen2.5-VL-based) is fully incompatible with this run and must never be resumed into it.** The new `-v4` repo name makes that failure mode structurally impossible — this run can only ever find a real `-v4` (Qwen3-VL-based) checkpoint to resume from.

**Real GPU-hour math, updated 2026-09-13 with the actual measured number** (not an estimate anymore): up to 250,000 examples × 2 epochs ÷ 8 (grad_accum) = up to 62,500 steps. The old ~48s/step figure was measured on the smaller 3B model and turned out to be optimistic — `TimeBudgetGuard`'s real smoke-test run on actual Kaggle GPU hardware measured **98.0s/step** on Qwen3-VL-4B, roughly double the old estimate, confirming the larger base model is meaningfully slower per step. At 98.0s/step × up to 62,500 steps, the real total is **up to ~1,701 GPU-hours** (62,500 × 98.0s ÷ 3600), not ~833.

**Corrected 2026-09-13 (an earlier revision of this doc had a real math error, caught by a direct question -- worth stating plainly rather than quietly fixing): more accounts do NOT reduce this below ~10 weeks in a sequential relay.** A relay hands one continuous training run off between accounts (resume from the last checkpoint) -- at any given moment, exactly ONE GPU is actually computing, no matter how many accounts exist. So the real floor is simply **total hours needed ÷ 24 hours/day**: 1,701 ÷ 24 ≈ 70.9 days ≈ **~10.1 weeks**, achievable ONLY if the relay runs 24/7 with zero gaps between handoffs. Accounts only matter for supplying enough combined weekly quota to sustain that 24/7 coverage without ever running dry: 24/7 needs ≥168 GPU-hours/week combined, and 6-7 accounts (~180-210 hrs/week) already clears that with comfortable margin for real-world handoff friction and Kaggle session limits. **Going past 7 accounts buys nothing in pure relay mode** -- 12 accounts still bottoms out at the same ~10.1-week floor, because the constraint was never "how much quota exists" once you're past the 24/7-coverage threshold, it's "only one GPU works at a time."

**The only way to actually beat ~10 weeks is genuine parallelism**: shard the training data across N accounts, train N independent LoRA adapters SIMULTANEOUSLY (not relayed -- truly side-by-side, at the same time), then merge the resulting adapters by averaging weights at the end. This was seriously considered for a 12-way split (~20,833 examples per shard) and explicitly **decided against** (2026-09-13): merging 12 independently-trained adapters with zero mid-training synchronization is a more aggressive setup than what's been validated in published LoRA/federated-averaging work (typically 2-4 shards, with periodic sync, not one shot at the very end), and there is a real, honestly-unquantifiable-without-actually-running-it risk of measurable accuracy loss versus one continuous run. Given that risk and no calendar deadline forcing the trade-off, the plan stays the plain sequential relay below: slower (~10 weeks) but zero risk to the final model's real accuracy.

## Before anyone touches a GPU

1. **Done (2026-09-16), verified on the Hub — no one else needs to re-run this.** The real, full-scale extraction completed: 150,000 real training examples across 65,293 unique real Sentinel-2 patches, pushed to
   [`Sameelkazi/satquery-qwen3vl-vrsbench-lora-v4-bigearthnet-txt-cache-full`](https://huggingface.co/datasets/Sameelkazi/satquery-qwen3vl-vrsbench-lora-v4-bigearthnet-txt-cache-full)
   (private dataset repo, images sharded into `images/part_00`-`part_09` to stay under
   Hugging Face's 10,000-files-per-directory git limit). Independently verified via
   `HfApi.list_repo_files` — 65,295 files total, `manifest.json` present with exactly
   150,000 entries.

   **Note the `-cache-full` suffix**: an earlier attempt at this same repo name (without
   `-full`) silently failed to push and, when re-run, only produced 380 examples from a
   stale leftover selection file — that name is tainted and was abandoned in favor of
   `-cache-full` rather than overwritten in place. `kaggle_finetune_qwen2vl_v4.ipynb`
   Cell 6 reads the LOCAL `bigearthnet_txt_real/manifest.json` (which `extract.py`
   produces either way), so this only matters if you ever re-run the extraction
   yourself — anyone just running the training notebook does not need to touch this.

   If for some reason this needs to be redone from scratch on a fresh machine:
   ```
   python finetuning/bigearthnet_txt_filter.py --max-examples 150000
   python finetuning/bigearthnet_txt_extract.py --cache-repo Sameelkazi/satquery-qwen3vl-vrsbench-lora-v4-bigearthnet-txt-cache-full
   ```
   This will find the existing cache and download it directly (fast) rather than
   re-streaming the ~59 GiB Zenodo archive, since `manifest.json` is confirmed present
   in that repo.
2. Everyone participating needs: (a) their own free Kaggle account with phone-verified GPU access, (b) an `HF_TOKEN` Kaggle secret with write access to `Sameelkazi/satquery-qwen3vl-vrsbench-lora-v4` (create this as a new, empty, **private** HF repo before anyone starts — do not reuse the v2 or v3 repos: v3 is a shape mismatch, v2/v3 are BOTH a different, fully incompatible base model), (c) this repo cloned/uploaded into their Kaggle session.
3. **First person to run: `SMOKE_TEST=True` first.** Confirms the whole pipeline (data load, model load, one real train step, one real eval, one real checkpoint push) works end-to-end on Qwen3-VL-4B before committing real GPU-hours. Takes ~10-15 minutes, possibly a little longer than v3's smoke run since Qwen3-VL-4B is a larger download. Only proceed to `SMOKE_TEST=False` once this completes cleanly, including the Hub push.

## The relay itself

Kaggle free-tier gives each account ~30 GPU-hours per week and caps a single continuous session at several hours (session limits vary — if your session is cut off, that's expected, not a failure). With 6-7 accounts in rotation, the combined pool (~180-210 GPU-hours/week) already covers 24/7 continuous relay coverage — **the real gain comes from prompt handoffs**, not from adding more accounts: keep a rough queue/schedule so a fresh account's session starts within minutes-to-hours of the previous one ending, not days, or the ~10.1-week floor will slip toward 11-12+ weeks in practice.

1. **Person 1** starts a fresh Kaggle session, sets `SMOKE_TEST=False`, runs the notebook top to bottom (`Run All`). Cell 7 will print "No existing checkpoint or adapter found... starting a fresh LoRA init" the first time.
2. Watch the `TimeBudgetGuard` printout within the first ~20 real steps — it prints a real measured `s/step` and an extrapolated total-run estimate. Post that number in the group chat so everyone knows the real (not estimated, and likely different from v3's 48s/step given the larger base model) total.
3. When a session dies (Kaggle disconnects, weekly quota runs out, or a person just needs to stop), the LAST real checkpoint is already safely on the Hub (pushed every `_SAVE_EVAL_STEPS`=2,000 steps). **The next person just starts a fresh Kaggle session, on their own account, sets `SMOKE_TEST=False`, and runs the notebook top to bottom again** — Cell 7 will detect the full checkpoint (weights + optimizer + scheduler + real step count) on the Hub and resume from the exact step it left off, not restart from zero. This is what makes it safe for the relay to pause for days between handoffs if someone's weekly quota runs dry.
4. Rotate through the team, in any order, whenever someone has quota available, until `trainer.train()` finishes all steps (up to ~62,500).
5. **One rule that matters more than any other**: don't change `NUM_EXAMPLES`, `INCLUDE_BIGEARTHNET_TXT`, or the LoRA config (`r`, `lora_alpha`, `target_modules`) between relay handoffs — and now, don't change the base model or box-format code either, for the same reason. The resume logic assumes the exact same data composition and model shape across the whole run — changing it mid-relay either silently corrupts the step-count bookkeeping or crashes on a real shape mismatch (documented in the notebook's own Cell 6/7 comments).
6. Post in the group chat after every handoff: who ran it, what step it reached, whether `TimeBudgetGuard`'s estimate looked on-track. This is the only coordination mechanism — there's no automatic dashboard.

## When training finishes

1. The final adapter is at `https://huggingface.co/Sameelkazi/satquery-qwen3vl-vrsbench-lora-v4` (private repo).
2. **Before pointing `backend/.env`'s `HF_ADAPTER_REPO` at the v4 repo, first update `backend/models/geochat_service.py`'s own local-GPU model-loading code** (currently still loads `Qwen2_5_VLForConditionalGeneration` / `self.model_id` defaulting to the 2.5 checkpoint — this was deliberately NOT changed as part of the 2026-09-12 v4 commit, which only touched box-format *parsing*, not model *loading*). Attaching a v4 (Qwen3-VL-based) LoRA adapter to a Qwen2.5-VL base model at inference time will fail with a real shape/architecture mismatch, not silently degrade — so this class swap is a required, currently-outstanding step before the v4 adapter can actually be used in the deployed backend, not something to discover after training finishes.
3. Re-run `scripts/evaluate_vrsbench_accuracy.py` (already updated 2026-09-12 to parse the new box format) against the deployed backend with the v4 adapter active — compare its Acc@0.5/Acc@0.7/mIoU/VQA-accuracy numbers against v2's disclosed 44.0%/16.0%/0.3671. Use `preflight_check()`'s output to confirm `adapter_active=True` and the fingerprint matches the v4 repo before trusting any number it reports. Report the real number, whatever it is — the base-model and box-format changes are evidence-informed bets, not guaranteed improvements.
4. Update the Guide Bot knowledge base and any judge-facing docs with the real v4 numbers — only after this real verification, never before.

## What's still coming (not blocking training start)

Real RSVQA and CDVQA evaluation harnesses (both are PS-named prescribed evaluation datasets, currently not integrated at all in this repo) are being built next. These are inference-only and don't compete for Kaggle GPU-hours, so they can be built and run in parallel with this training relay, not sequenced before it.
