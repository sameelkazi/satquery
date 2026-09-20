# SatQuery v3 Training Runbook — Kaggle Relay (6-7 accounts)

**SUPERSEDED (2026-09-12): see finetuning/V4_TRAINING_RUNBOOK.md instead.** The base model was upgraded Qwen2.5-VL-3B -> Qwen3-VL-4B-Instruct and the box format switched to Qwen3-VL native `bbox_2d` the same day this v3 scale-up would otherwise have started training -- everything below (repo names, GPU-hour estimate, cache-prep commands) is now stale. Kept only as a historical record of the v3 data/capacity scale-up reasoning, which is still real and still applies (the v4 runbook says so explicitly).


**This run is sized purely for model quality, not against a calendar deadline** (the SIH26167 deadline has been confirmed extended). The full-checkpoint Hub-resume relay (below) is exactly what makes a run this size practical across a rotating group of accounts — there's no "must finish by X," just keep the relay going until `trainer.train()` completes.

Notebook is already updated and committed (`finetuning/kaggle_finetune_qwen2vl.ipynb`, commit `d336950`): up to 100,000 VRSBench examples + up to 150,000 BigEarthNet.txt referring-expression examples (up to 250,000 combined), 2 epochs, LoRA rank 32, targeting `HF_REPO_ID = "...-lora-v3"`.

**Real GPU-hour math, stated plainly so you can plan the rotation** (not to talk anyone out of it): up to 250,000 examples × 2 epochs ÷ 8 (grad_accum) = up to 62,500 steps × ~48s/step ≈ **833 real GPU-hours**. At ~30h/week per Kaggle free-tier account across 6-7 accounts (~180-210 combined GPU-hours/week), that's roughly **4-4.5 weeks** of everyone rotating in every week. `TimeBudgetGuard` will print the *actual* measured rate a few steps into your first real session — the 48s/step figure is last measured on the smaller v2 run, so re-check it early rather than trusting this estimate blindly for the full ~833h.

## Before anyone touches a GPU

1. **One person only** runs the BigEarthNet.txt data-prep on a **CPU-only** Kaggle session first (this doesn't need GPU quota — don't waste GPU-hours on it):
   ```
   python finetuning/bigearthnet_txt_filter.py --max-examples 150000
   python finetuning/bigearthnet_txt_extract.py --cache-repo YOUR-HF-USERNAME/satquery-qwen25vl-vrsbench-lora-bigearthnet-txt-cache
   ```
   Watch the printed real category counts from `bigearthnet_txt_filter.py` — it will select however many real "bounding box"/"reference" rows actually exist, up to 150,000, and print that real number. **Note it and tell the team** — the true pool size for this specific category has not been verified ahead of time, so the real BigEarthNet.txt count in this run could land anywhere up to that ceiling.
2. Everyone participating needs: (a) their own free Kaggle account with phone-verified GPU access, (b) an `HF_TOKEN` Kaggle secret with write access to `YOUR-HF-USERNAME/satquery-qwen25vl-vrsbench-lora-v3` (create this as a new, empty, **private** HF repo before anyone starts — do not reuse the v2 repo, and do not reuse a v3 repo from an earlier, smaller attempt at this run, since LoRA rank changed 16→32 mid-design — a v3 repo that already has an r=16 checkpoint on it will crash on a real shape mismatch when this notebook tries to resume it at r=32), (c) this repo cloned/uploaded into their Kaggle session.
3. **First person to run: `SMOKE_TEST=True` first.** Confirms the whole pipeline (data load, model load, one real train step, one real eval, one real checkpoint push) works end-to-end before committing real GPU-hours. Takes ~10-15 minutes. Only proceed to `SMOKE_TEST=False` once this completes cleanly, including the Hub push.

## The relay itself

Kaggle free-tier gives each account ~30 GPU-hours per week and caps a single continuous session at several hours (session limits vary — if your session is cut off, that's expected, not a failure).

1. **Person 1** starts a fresh Kaggle session, sets `SMOKE_TEST=False`, runs the notebook top to bottom (`Run All`). Cell 6 will print "No existing checkpoint or adapter found... starting a fresh LoRA init" the first time.
2. Watch the `TimeBudgetGuard` printout within the first ~20 real steps — it prints a real measured `s/step` and an extrapolated total-run estimate. Post that number in the group chat so everyone knows the real (not estimated) total.
3. When a session dies (Kaggle disconnects, weekly quota runs out, or a person just needs to stop), the LAST real checkpoint is already safely on the Hub (pushed every `_SAVE_EVAL_STEPS`=2,000 steps). **The next person just starts a fresh Kaggle session, on their own account, sets `SMOKE_TEST=False`, and runs the notebook top to bottom again** — Cell 6 will detect the full checkpoint (weights + optimizer + scheduler + real step count) on the Hub and resume from the exact step it left off, not restart from zero. This is what makes it safe for the relay to pause for days between handoffs if someone's weekly quota runs dry.
4. Rotate through the team, in any order, whenever someone has quota available, until `trainer.train()` finishes all steps (up to ~62,500).
5. **One rule that matters more than any other**: don't change `NUM_EXAMPLES`, `INCLUDE_BIGEARTHNET_TXT`, or the LoRA config (`r`, `lora_alpha`, `target_modules`) between relay handoffs. The resume logic assumes the exact same data composition and model shape across the whole run — changing it mid-relay either silently corrupts the step-count bookkeeping or crashes on a real shape mismatch (documented in the notebook's own Cell 6/7 comments).
6. Post in the group chat after every handoff: who ran it, what step it reached, whether `TimeBudgetGuard`'s estimate looked on-track. This is the only coordination mechanism — there's no automatic dashboard.

## When training finishes

1. The final adapter is at `https://huggingface.co/YOUR-HF-USERNAME/satquery-qwen25vl-vrsbench-lora-v3` (private repo).
2. Point `backend/.env`'s `HF_ADAPTER_REPO` at the v3 repo (only once training is actually done — don't point it there mid-run).
3. Re-run `scripts/evaluate_vrsbench_accuracy.py` (unchanged, already reusable as-is) against the deployed backend with the v3 adapter active — compare its Acc@0.5/Acc@0.7/mIoU/VQA-accuracy numbers against v2's disclosed 44.0%/16.0%/0.3671. Use `preflight_check()`'s output to confirm `adapter_active=True` and the fingerprint matches the v3 repo before trusting any number it reports.
4. Update the Guide Bot knowledge base and any judge-facing docs with the real v3 numbers — only after this real verification, never before.

## What's still coming (not blocking training start)

Real RSVQA and CDVQA evaluation harnesses (both are PS-named prescribed evaluation datasets, currently not integrated at all in this repo) are being built next. These are inference-only and don't compete for Kaggle GPU-hours, so they can be built and run in parallel with this training relay, not sequenced before it.
