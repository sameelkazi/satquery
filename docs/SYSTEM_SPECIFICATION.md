# SatQuery AI — System Architecture & Technical Specification Document
### Engineering & Implementation Specifications (ISRO / SIH26167)
**Project:** Smart India Hackathon 2026 — SIH26167 (ISRO, Department of Space / Space Technology)
**Document Type:** Formal System Architecture & Technical Implementation Specification. All mathematical formulations, model selection criteria, and architectural interfaces defined herein serve as the official engineering baseline.

**Revision note (v5 — failure-mode coverage + confidence-estimation logic + verbatim representative queries added):** Following an explicit request to make the plan as close to "100% working" as realistically achievable, three additions were made: (1) Section 2C-v specifies real, model-derived confidence-estimation logic (the PS explicitly requires this, and a fabricated/dummy confidence number is a detectable weak point); (2) Section 2E is a new Failure-Mode Coverage table mapping every critical path (inference, fine-tuning, SAR fusion, change-VQA, routing, deployment, network, validation) to a specific detection test and a rehearsed fallback — the realistic version of "guaranteed working" is "every failure mode is tested and has a non-silent fallback," not "nothing can ever fail"; (3) Phase 5's rehearsal query list now uses the PS's own five verbatim representative queries, since evaluators are likely to probe with similar phrasing.

**Revision note (v4 — verified BigEarthNet.txt and RS-Agent references added):** Two further verified findings materially improve the plan: (1) the PS's "BigEarthNet.txt" reference is confirmed real (`arXiv:2603.29630`, Herzog et al. 2026) — a dataset of 464,044 co-registered Sentinel-1 SAR + Sentinel-2 optical pairs with 9.6M VQA/captioning/grounding annotations, meaning the mandatory fine-tuning (2C-i) and mandatory SAR-fusion (2C-ii) requirements can largely be satisfied through one unified fine-tune rather than two separate engineering efforts; (2) RS-Agent (`arXiv:2406.07089`, GitHub `IntelliSensing/RS-Agent`) is confirmed real and provides a citable, verified four-component orchestration architecture (Central Controller, dynamic toolkit, Solution Space, Knowledge Space) that closely matches the PS's agentic-orchestration requirement — adopted as the design template for the router/validation layer (Section 2C-iv).

**Revision note (v3 — official PS text verified):** The person supplied the official, verbatim SIH26167 problem-statement text (PS #160, S.No. 167, deadline 20 September 2026). This version was rewritten against that verbatim text and corrects several requirements the earlier draft missed or got wrong:
1. **Fine-tuning/adaptation is MANDATORY, not optional.** The official PS requires: *"At least one visual or vision-language component must be fine-tuned or otherwise adapted using BigEarthNet.txt or any open source training data."* The earlier "inference-only, no training" plan directly contradicted this — fixed in Section 5, Phase 2.
2. **Optical–SAR cross-modal fusion is a MANDATORY functional requirement**, not a nice-to-have: *"The system must automatically extract complementary information from a co-registered optical/multispectral and SAR image pair."* None of GeoChat/RemoteCLIP/ChangeFormer natively fuse SAR — a dedicated fusion module is now added (Section 2C, Phase 2).
3. **Bi-temporal change analysis must include change-based VQA (CDVQA), not just a change mask.** ChangeFormer alone (mask-only) does not satisfy this — a CDVQA-capable path is now required (Section 2C).
4. **Final evaluation uses an undisclosed ISRO/SAC dataset of co-registered Cartosat-2S optical + RISAT SAR pairs, with undisclosed annotations**, in addition to public benchmark subsets (BigEarthNet, VRSBench, RSVQA, CDVQA). This is a genuine generalization risk that cannot be fully eliminated by training on public data alone — flagged explicitly in Section 2D so the team sets realistic expectations rather than assuming the public-data approach guarantees final-score success.
5. **Agentic controller must perform explicit input validation** (count, modality, format, metadata, co-registration compatibility) before dispatching to specialist models — this is now an explicit component, not implicit in the router.
6. **Deliverables must include downloadable execution-summary reports** (task, models/tools used, parameters, confidence) — added to Phase 3/5 deliverables.

Sections retained from v2 (BitsAndBytes-first quantization, dependency isolation, ZeroGPU deployment, Must-have/Nice-to-have tiering) remain valid and are cross-referenced below.

---

## 0A. Verbatim Official Problem Statement (source of truth)

> **PS Number:** SIH26167 | **Organization:** ISRO, Department of Space | **Category:** Software | **Theme:** Space Technology | **Deadline:** 20 September 2026
>
> **Mandatory functional scope (quoted from the official PS — do not paraphrase away any of these):**
> - Remote-sensing adaptation: **at least one visual or vision-language component must be fine-tuned or otherwise adapted** using BigEarthNet.txt or other open-source training data.
> - Single-image baseline: **VQA is mandatory.** Each solution must additionally implement either captioning/scene description *or* text-guided region grounding.
> - Multi-image change analysis: **change description or change-based VQA from a bi-temporal pair is mandatory.** A spatial change map may additionally be generated where reference masks are available.
> - Cross-modal pair analysis: **the system must extract complementary information from a co-registered optical/multispectral and SAR image pair.**
> - Agentic orchestration: the system must automatically **select, sequence, and execute** the appropriate specialist models/tools according to the query and input configuration — including checking number, modality, format, metadata, and compatibility of inputs; selecting from a predefined model/tool registry; configuring only permitted parameters; combining outputs; and returning an auditable execution summary (task, models/tools used, key parameters).
> - A generic LLM/VLM **without remote-sensing adaptation will not satisfy the requirements.**
>
> **Prescribed datasets (use these specific ones, not substitutes):** BigEarthNet.txt (primary adaptation/fine-tuning dataset), VRSBench and RSVQA (single-image captioning/grounding/VQA evaluation), CDVQA (multitemporal change-based VQA evaluation).
>
> **Final evaluation:** uses prescribed public benchmark test subsets **plus an ISRO/SAC evaluation dataset** containing pre-georeferenced, co-registered **Cartosat-2S optical and RISAT SAR image pairs**, with task-specific reference answers/labels/boxes/masks. **Evaluation annotations will not be disclosed to teams.**
>
> **Deliverables:** an interactive GUI/web application with an agentic remote-sensing AI backend; codes and models including test and demonstration; input upload and compatibility checking; visual evidence, confidence information, execution summaries, and **downloadable reports**.

---



## 0. How to use this document

You are building a working, phone-deployable web application. This PRD is structured in **phases**. Complete each phase fully, verify its **Acceptance Criteria**, and only then proceed to the next. If any acceptance criterion fails, apply the listed **Fallback** before moving on — do not silently skip ahead with a broken component.

Ask the user for clarification only if genuinely blocked (e.g., missing API key, GPU unavailable). Do not ask about decisions already made in this document (model choice, stack choice, UI layout) — those are fixed.

---

## 1. Product Summary

**What it is:** An interactive vision-language assistant that lets a user ask natural-language questions about satellite/remote-sensing imagery ("How many buildings are near the river?", "Is there deforestation here?", "What changed between these two dates?") and receive grounded, accurate answers — including bounding boxes, change masks, and text — rendered on a 2D map.

**Who uses it:** SIH judges, evaluated live on a phone via a public URL. Secondary: field officers / analysts doing agri, disaster, urban, or forest monitoring.

**What it is NOT:**
- Not a 3D visualization tool (no CesiumJS, no Three.js — 2D map only).
- Not a native mobile app (web-only, responsive).
- Not dependent on ISRO-internal/classified imagery (Cartosat-2S, RISAT SAR) — must run entirely on public data.
- Not a single-model chatbot wrapper — it is a multi-model orchestrated pipeline (this is the core differentiator; do not simplify to a single LLM call).

---

## 2. Non-Negotiable Technical Decisions

These are final. Do not substitute, "improve," or simplify away from these without an explicit fallback trigger.

| Decision | Value | Reason (do not re-litigate) |
|---|---|---|
| Conversational / grounding model | **GeoChat-7B** (`MBZUAI/geochat-7B`, HuggingFace) | Only mature open grounded RS-VLM with bounding-box output; satisfies the mandatory single-image VQA + grounding requirement |
| Zero-shot retrieval / RAG encoder | **RemoteCLIP** (`ChenDelong1999/RemoteCLIP`, ViT-L/14) | Verified real, CLIP-style, best for scene tagging + retrieval |
| Bi-temporal change detection + change-VQA | **ChangeFormer** (`wgcban/ChangeFormer`, pretrained on LEVIR-CD) for the spatial change mask, **PLUS a CDVQA-capable path** (see Section 2C) for change-based question answering | The PS mandates change-based VQA, not just a mask — ChangeFormer alone does not satisfy this |
| Optical–SAR cross-modal fusion | **Dedicated fusion module — see Section 2C** (not covered by GeoChat/RemoteCLIP/ChangeFormer) | This is a mandatory PS requirement; none of the three core models natively ingest SAR |
| Map library | **Leaflet.js** (2D only) | No 3D rendering anywhere in this project |
| Backend framework | **FastAPI** (Python 3.10+) | Async support needed for parallel model calls |
| Frontend framework | **React.js + TailwindCSS** | Standard, fast to build, mobile-responsive |
| Geospatial data source (for building/training) | **Sentinel-1 (SAR) + Sentinel-2 (optical)** via Copernicus, plus free-tier **Bhoonidhi** (ResourceSat LISS-IV); fine-tuning on **BigEarthNet.txt** (prescribed) | Public, no ISRO-internal data dependency for development — but see Section 2D for the final-evaluation caveat |
| Serving engine for single-request demo | **Plain HuggingFace Transformers**, NOT vLLM | vLLM has 40-80x worse TTFT at low concurrency (benchmarked); this is a single-judge-at-a-time demo, not a high-concurrency service |
| Quantization | **BitsAndBytes 4-bit (NF4) as PRIMARY path.** AWQ+Marlin is an optional stretch goal only, NOT a requirement. | See Section 2A below — AWQ on LLaVA-style custom VLMs (GeoChat's architecture) is verified to require manual calibration and has documented breakage (`AttributeError: LlavaConfig object has no attribute mm_vision_tower`), and the AutoAWQ library itself is now deprecated upstream. BitsAndBytes works with a single `load_in_4bit=True` flag in `transformers`, no calibration needed. |
| Router LLM | **Llama-3-8B-Instruct via Groq API** | Fast (LPU hardware), open-weight model (keeps "open" positioning consistent) — do NOT use Gemini/OpenAI for this or any core-reasoning component |
| Deployment target | **HuggingFace Spaces — ZeroGPU (H200) tier first choice**; T4-small ($0.40/hr) or A10G-small ($1.00/hr, 24GB VRAM) as paid fallback | ZeroGPU gives free, dynamic H200 access for HF PRO subscribers ($9/mo) — verified current (2026) pricing, ideal for demo-day bursts. Falls back to per-hour billed GPU tiers if ZeroGPU quota is insufficient. |

### 2A. Quantization Reality Check (do not skip this)

Research finding: **AWQ quantization of LLaVA-architecture models (which GeoChat is built on) is NOT a turnkey, one-line operation.** Verified from the AWQ project's own documentation and multiple GitHub issues:
- The official `llm-awq` repo states LLaVA-v1.5-7B is supported only in the sense that **"you may need to run the AWQ search on your own to quantize these models"** — no pre-quantized GeoChat weights exist.
- Real, documented failure mode: attempting to AWQ-quantize a LLaVA-1.5-7B-hf checkpoint throws `AttributeError: 'LlavaConfig' object has no attribute 'mm_vision_tower'` due to a mismatch between how the HF-format LLaVA checkpoint stores its vision tower vs. what the AWQ quantization script expects.
- `AutoAWQ` (the more accessible community tool) explicitly notes it only reliably quantizes the **language-model portion** of VLMs, not the vision encoder — added complexity for a custom architecture like GeoChat.
- As of the current AutoAWQ/vLLM documentation, **AutoAWQ is deprecated**; the functionality has moved into `llm-compressor`, meaning less community support and more setup friction than the "10.9x speedup" headline number suggests for a novel model in a 4-week window.

**Decision: use BitsAndBytes 4-bit (`load_in_4bit=True`, NF4) as the default quantization path for GeoChat.** This is a single-flag change in standard `transformers` loading code, well-documented for LLaVA-family models, and gives a real, verified ~70% VRAM reduction (14.2GB → ~4.4GB for a 7B model) with under 1% typical accuracy loss. Throughput is lower than AWQ+Marlin would theoretically give, but it *actually works* without custom calibration debugging eating into hackathon time.

**AWQ+Marlin remains a legitimate stretch goal for Phase 4** if Phase 1-3 finish early and a team member wants to attempt it — but it must never be on the critical path.

**Explicitly forbidden:** Do not call Gemini, GPT-4, or any closed commercial model for image understanding, VQA, grounding, or change detection. The entire pitch's differentiation from Google Earth AI depends on the core pipeline being open-source and self-hosted. Router-level query classification and final-answer translation (Hindi/regional) are the only places a hosted API (Groq, running an open model) is acceptable — and even there, prefer open-weight models over closed ones.

### 2B. Dependency Isolation (avoid environment hell)

GeoChat (LLaVA/Vicuna-based), RemoteCLIP (OpenCLIP-based), and ChangeFormer (standalone PyTorch/timm-based) come from three independent research codebases with three independently pinned `requirements.txt` / `environment.yml` files. Installing all three into one shared Python environment is a common, time-consuming source of dependency conflicts (transformers version mismatches, torch/CUDA version mismatches, etc.) in multi-model-pipeline projects.

**Decision: isolate each model in its own environment/container, communicate over a simple internal API — do not force a single shared Python environment.**

Two acceptable patterns, in order of preference for a hackathon timeline:
1. **Separate conda/venv environments per model**, each exposing a small local FastAPI/Flask microservice on its own port (e.g., GeoChat on :8001, RemoteCLIP on :8002, ChangeFormer on :8003). The main `backend/main.py` orchestrator calls these over `localhost` HTTP. Fastest to set up for a student team, no Docker knowledge required.
2. **Docker containers per model** (one Dockerfile per service under `backend/models/`), orchestrated via `docker-compose`. Cleaner and more "production-grade" for the pitch narrative, but adds Docker setup/debugging time — only choose this if the team already has Docker experience.

**Do not attempt to `pip install` all three repos' dependencies into one environment and hope for the best** — resolve this decision in Phase 1, not as a Phase 3 surprise.

### 2C. Mandatory Requirements the Model Stack Does NOT Cover Out-of-the-Box

The official PS mandates three things that GeoChat + RemoteCLIP + ChangeFormer, used purely as pretrained inference engines, do **not** satisfy. Each needs a specific added component. Do not treat these as optional — a solution missing any one of them does not meet the PS's stated functional scope.

**(i) Mandatory fine-tuning/adaptation.** The PS requires at least one component be fine-tuned or adapted on BigEarthNet (or other open training data) — inference-only usage of pretrained weights does not satisfy this. **Verified critical finding:** the PS's "BigEarthNet.txt" reference is not the classic 2019 BigEarthNet or a typo — it resolves to a real, very recent paper: **BigEarthNet.txt: A Large-Scale Multi-Sensor Image-Text Dataset and Benchmark for Earth Observation** (Herzog et al., 2026, TU Berlin/BIFOLD, `arXiv:2603.29630`, https://txt.bigearth.net). Verified contents: **464,044 co-registered Sentinel-1 SAR + Sentinel-2 optical images with 9.6M text annotations**, covering geographically-anchored captions, VQA pairs, and referring-expression/bounding-box detection instructions — i.e., it is simultaneously the fine-tuning dataset AND a source of co-registered optical-SAR pairs AND VQA/grounding training data in one download. **Decision: use BigEarthNet.txt as the primary fine-tuning dataset** (this single dataset satisfies both 2C-i and most of 2C-ii below), backed by the older, more established BigEarthNet-MM (`arXiv:2105.07921`, 590,326 S1-S2 pairs) and reBEN (`arXiv:2407.03653`) as stable fallbacks if BigEarthNet.txt's 2026 release has access/tooling friction. LoRA fine-tune GeoChat (rank=16, alpha=32) on a BigEarthNet.txt-derived instruction subset. This is deliberately scoped small — a few thousand samples, a few epochs — the goal is to satisfy the "adapted" requirement and produce a measurable before/after difference to show evaluators, not to achieve state-of-the-art accuracy. Budget this explicitly in Phase 2, not as an afterthought in Phase 4.

**(ii) Mandatory optical–SAR fusion.** None of the three core models ingest SAR natively. **Decision, updated:** because BigEarthNet.txt provides *already co-registered* Sentinel-1 SAR + Sentinel-2 optical pairs with paired text annotations, the fine-tuning step in (i) can be extended to directly teach GeoChat to reason jointly over an optical+SAR pair, rather than requiring a fully separate fusion architecture. Two viable approaches, in order of preference for a hackathon timeline:
   - **(Preferred, lower risk) Fine-tune-driven fusion:** during the LoRA fine-tune in (i), include BigEarthNet.txt samples that pair optical+SAR imagery with text describing complementary information from both (the dataset is verified to contain exactly this annotation type). This teaches the fine-tuned GeoChat to natively reference SAR-derived cues (e.g., structural/moisture information) when both modalities are provided, without needing a bespoke fusion module. Simpler to build and directly grounded in the PS's own prescribed dataset.
   - **(Stretch, higher payoff if time allows) Late-fusion feature-injection or true joint encoder:** if the fine-tune-driven approach is not distinguishing SAR information clearly enough, fall back to the previous late-fusion plan (a small pretrained SAR encoder via `torchgeo`/`TorchSat`, injected as structured prompt context), or reference EarthGPT (`arXiv:2401.16822`) / SkySense (`arXiv:2312.10115`) fusion-architecture patterns for a lightweight cross-attention layer. Only attempt this if the fine-tune-driven approach is already working and there is spare time in Phase 4.

**(iii) Mandatory change-based VQA (CDVQA), not just a change mask.** ChangeFormer produces a pixel mask, which satisfies the *optional* "spatial change map" bonus but not the *mandatory* "change description or change-based VQA." **Decision, updated with newly verified references:** after ChangeFormer produces the change mask, feed the mask + both T1/T2 images into GeoChat with a change-specific prompt template ("Given these two images from different dates and the highlighted change regions, describe what changed and answer: {user_query}") — this converts a raw mask into a natural-language, query-answerable change description without requiring a separate CDVQA-specific model to be trained from scratch. For a stronger, more citable version if time allows, reference the prompt/output design patterns from **Change-Agent** (`arXiv:2403.19646`, change interpretation + analysis) or **CDVQA** (`arXiv:2112.06343`, the canonical change-based-VQA benchmark) to validate the output format against the actual CDVQA task structure rather than inventing one from scratch.

### 2C-iv. Recommended Orchestration Pattern (verified reference architecture)

The PS's "agentic orchestration" requirement (Section 0A) — task classification, input validation, tool selection from a registry, output fusion, auditable execution trace — maps closely onto a **verified, real, open-source reference architecture: RS-Agent** (`arXiv:2406.07089`, GitHub `IntelliSensing/RS-Agent`). RS-Agent's four components — a **Central Controller** (LLM-based task interpretation), a **dynamic toolkit** (tool execution registry), a **Solution Space** (task-specific expert guidance/planning), and a **Knowledge Space** (domain-level RAG-style reasoning) — are a close architectural match to what the PS describes, and the paper reports over 95% task-planning accuracy across 18 remote-sensing tasks.

**Decision: adopt RS-Agent's four-component pattern as the design template for `router.py` and the input-validation layer**, rather than building a bespoke router from first principles. This is not a requirement to use RS-Agent's exact codebase (which is tuned for its own tool-set) — it is a citable, verified architectural pattern to follow: Central Controller (maps to the router's task/modality/temporal classification), dynamic toolkit (maps to the GeoChat/ChangeFormer/RemoteCLIP service registry), Solution Space (maps to the input-validation + task-specific parameter selection), and Knowledge Space (maps to the RAG grounding layer in Phase 3). Citing this pattern explicitly in the presentation strengthens the "auditable orchestration" novelty claim with real academic grounding rather than an ad-hoc design.

### 2C-v. Confidence Estimation (explicit PS requirement — do not leave as a placeholder field)

The verbatim PS text requires the system to *"combine textual and spatial outputs, **estimate confidence**, and return visual evidence."* This is a specific, gradeable requirement, not just a UI nicety — implement it as real logic, not a hardcoded/dummy number:

- **Per-component confidence, then combined:** each specialist (GeoChat, ChangeFormer, RemoteCLIP) should surface a confidence signal — for GeoChat, use the model's token-level log-probabilities/softmax scores for the generated answer or grounding box; for ChangeFormer, use the mean predicted change-probability within the flagged mask region (already a `[0,1]` value from the model's sigmoid output); for RemoteCLIP zero-shot tagging, use the softmax similarity score of the top match.
- **Combination rule (simple, defensible, not over-engineered):** when a query routes to a single specialist, its confidence passes through directly. When a query routes to multiple specialists (e.g., GeoChat + ChangeFormer for a change-VQA query), combine as a simple weighted average or minimum of the component confidences — document whichever rule is chosen in the execution-summary output, since the PS's auditable-trace requirement means the *rule itself*, not just the number, may be inspected.
- **Do not fabricate a plausible-looking confidence number that isn't derived from an actual model signal** — this is the kind of detail that is easy to fake for a demo but easy for an evaluator to catch as ungrounded if questioned.

### 2D. Final-Evaluation Risk — Read This Before Assuming Success

The official PS states final evaluation includes **an undisclosed ISRO/SAC dataset of co-registered Cartosat-2S optical + RISAT SAR pairs, with undisclosed reference annotations.** This is a genuine, structural risk that no amount of good engineering on public data can fully eliminate:

- The team cannot train, validate, or even preview on Cartosat-2S/RISAT-format imagery during development (confirmed restricted/commercial access, per Section on data-access in the companion strategy document).
- Sentinel-1/2 (used for development) and Cartosat-2S/RISAT (used for final evaluation) differ in resolution, radiometric calibration, and sensor characteristics. A model that performs well on Sentinel data is **not guaranteed** to generalize perfectly to Cartosat/RISAT without ever having seen a real example.
- **This is not a flaw in this plan — it is an inherent constraint of the problem statement that likely affects every competing team equally**, since Cartosat-2S/RISAT access is restricted for all student teams, not just this one.

**What this means practically:** do not present the project internally or to teammates as "guaranteed to score well on final evaluation." Instead:
1. Build the strongest possible pipeline on public data (Sentinel-1/2, BigEarthNet, VRSBench, RSVQA, CDVQA) — this is the only data realistically available, and doing this well is within the team's control.
2. In the presentation, explicitly acknowledge this generalization gap and frame the fine-tuning/adaptation work (Section 2C-i) as evidence of a deliberate strategy to maximize cross-sensor robustness (e.g., mention that BigEarthNet's Sentinel-2 resolution and general land-cover diversity is the closest legally-accessible proxy available for adapting toward higher-resolution optical sensors).
3. Do not overinvest engineering time chasing a guarantee that cannot be achieved without illegal/unauthorized access to restricted imagery — treat generalization risk as accepted and documented, not as something to "solve."

### 2E. Failure-Mode Coverage — Explicit Test-and-Fallback for Every Critical Path

**No plan can guarantee "100% working" — that guarantee does not exist for any non-trivial software project, hackathon or otherwise.** What *is* achievable is eliminating single points of failure by explicitly testing every critical path and having a rehearsed fallback for each, so that no individual component failure can take down the whole demo. Treat this table as a pre-demo checklist, not optional reading.

| Critical path | Failure mode | Detection (test before demo day) | Fallback |
|---|---|---|---|
| GeoChat inference | Model returns garbage/empty output on an unfamiliar image | Run all rehearsed demo queries + 5 random held-out queries the night before; manually verify outputs | Pre-cached response for rehearsed queries (Section, Phase 4); for live queries, a clear "unable to answer confidently" response is better than a garbage one — implement this as an explicit low-confidence threshold check |
| Fine-tuned LoRA adapter | Fine-tuned model performs worse than base model on some inputs (overfitting on the small BigEarthNet.txt subset) | Compare fine-tuned vs. base-model outputs on the Phase-1 logged baseline queries; keep both checkpoints available | Load the base (pre-fine-tune) GeoChat as a runtime fallback if the fine-tuned adapter is detected to be degrading output quality (e.g., via a simple sanity-check prompt run at startup) |
| SAR fusion module | SAR encoder or fusion prompt produces no meaningful difference from optical-only | Explicitly A/B compare fused vs. optical-only response on the same AOI before demo day (this is already an acceptance criterion in Phase 2.4) | If fusion quality is weak, do not silently show a fake-looking "SAR insight" — instead show the raw SAR band statistics/backscatter values directly as supporting evidence, which is honest and still satisfies "extract complementary information" |
| ChangeFormer + change-VQA chain | Change mask is noisy/wrong on a demo AOI pair | Test on at least 3 known-change AOI pairs during Phase 2, not just 1 | Use the NDVI/NDBI band-difference fallback (already specified in Phase 2's fallback) for the mask, while keeping the GeoChat-generated change description as the primary mandatory output |
| Router misclassification | LLM router (Groq/Llama-3) returns malformed JSON or wrong task classification | Log and manually review router outputs on 20+ test queries; add JSON schema validation with a retry-once policy | If the router fails schema validation twice, fall back to a simple keyword-based rule classifier (e.g., "changed"/"between" → ChangeDetection_CDVQA; "SAR"/"radar" → CrossModalFusion) — crude but never silently crashes |
| Deployment / HF Spaces | ZeroGPU quota exhausted or Space goes to sleep mid-demo | Do a full timed dry-run at the actual expected demo time-of-day, not just during off-peak development hours | Have a paid T4-small/A10G-small Space (Section 2, deployment row) pre-configured and ready to switch DNS/URL to within minutes if ZeroGPU is unavailable on demo day |
| Network / live demo | Venue WiFi or cellular fails during the live judge interaction | Test on cellular data specifically (already an acceptance criterion in Phase 3/5) | Pre-recorded screen capture of the full demo flow as an absolute last-resort fallback, shown only if live access genuinely fails — do not treat this as the default path |
| Input validation layer | A malformed or incompatible image pair is uploaded and the system crashes instead of erroring gracefully | Explicitly test with intentionally bad inputs (Phase 2.2 acceptance criteria already requires 3 such tests) | Ensure every validation failure returns a clear, user-facing error message (via the `validation.errors` field in the API contract, Section 6) rather than a raw stack trace or silent failure |

**The standard this table sets:** every row above should be able to say "we tested this failure mode and know what happens" before demo day. That is the realistic, achievable version of "make it work" — not a guarantee that nothing will ever fail, but a guarantee that nothing fails *silently* or *without a rehearsed response*.

---

## 3. System Architecture

```
User query (text, via Leaflet map + chat box) + input image(s)
        |
        v
[Input Validation Layer] -- checks count, modality, format, metadata,
   co-registration compatibility of uploaded images (PS mandatory requirement)
        |
        v
[Agentic Router] -- Llama-3-8B-Instruct via Groq
        |
        +--> Task classification: {VQA, Grounding, ChangeDetection/CDVQA, ZeroShotSearch, CrossModalFusion}
        +--> Modality: {Optical, SAR, Fused}
        +--> Temporal: {single timestamp, bi-temporal}
        |
        v
   +--------+--------+-----------------+------------------+
   |        |                 |                            |
   v        v                 v                            v
[GeoChat] [ChangeFormer   [RemoteCLIP]              [SAR Fusion Module]
 VQA/Box   + CDVQA-prompt] Zero-shot tag              (Section 2C-ii:
           Change mask +                              late-fusion feature
           NL description                             injection into
                                                        GeoChat prompt)
   |        |                 |                            |
   +--------+--------+--------+----------------------------+
        |
        v
[RAG Grounding Layer] -- RemoteCLIP embeddings + small vector DB
   (Indian district / land-cover metadata, reduces hallucination)
        |
        v
[Response Renderer] -- text + GeoJSON boxes/masks + execution summary
        |
        v
Leaflet 2D map (client) -- renders overlay, streams text, offers
   downloadable execution-summary report (PS mandatory deliverable)
```

**Critical constraint:** GeoChat and ChangeFormer calls must run in **parallel** (`asyncio.gather`), not sequentially, when a query needs both. The SAR fusion module runs alongside GeoChat when the input includes a co-registered optical+SAR pair, not as a separate sequential step.

---

## 4. Repository Structure

Build exactly this structure:

```
satquery-ai/
├── backend/
│   ├── main.py                 # FastAPI app entrypoint
│   ├── router.py                # Agentic router logic (Groq call + classification)
│   ├── models/
│   │   ├── geochat_service.py   # GeoChat load + inference wrapper
│   │   ├── remoteclip_service.py
│   │   └── changeformer_service.py
│   ├── rag/
│   │   ├── vector_store.py      # Qdrant/FAISS wrapper
│   │   └── knowledge_base.json  # Curated Indian district/land-cover metadata
│   ├── geo/
│   │   ├── tile_service.py      # Rasterio-based GeoTIFF cropping
│   │   └── bhoonidhi_client.py  # Data-fetch wrapper for Bhoonidhi/Copernicus
│   ├── cache/
│   │   └── response_cache.py    # Pre-cached demo-query responses
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── MapView.jsx      # Leaflet 2D map wrapper
│   │   │   ├── QueryBox.jsx     # Chat/query input
│   │   │   ├── ResponsePanel.jsx
│   │   │   └── LoadingStates.jsx # Staged loading-state UI
│   │   └── api/
│   │       └── client.js        # Backend API calls
│   ├── package.json
│   └── tailwind.config.js
├── scripts/
│   ├── download_models.sh       # Pulls GeoChat/RemoteCLIP/ChangeFormer weights
│   ├── quantize_geochat.py      # AWQ 4-bit + Marlin kernel setup
│   └── build_benchmark.py       # Custom 20-30 query benchmark (Phase 5)
├── data/
│   └── sample_aois/             # 5-10 pre-downloaded Indian AOI GeoTIFFs
└── README.md
```

---

## 4A. Priority Tiering — What to Cut If Time Runs Short

A 4-week timeline for a student team (likely juggling coursework in parallel) is achievable for a **working core demo**, but every phase below has "must-have" and "nice-to-have" components. Treat this tiering as binding — if a phase is running late, cut from the bottom of its own tier list first, never cut a Must-Have to protect a Nice-to-Have elsewhere.

**Important change from earlier drafts of this document:** fine-tuning, optical-SAR fusion, and change-based VQA (CDVQA) are **PS-mandatory**, per the verbatim official text in Section 0A — they are Must-have, not Nice-to-have, even though they add real implementation effort. A technically polished demo that skips any of these three does not satisfy the problem statement as written, regardless of how well the rest of the pipeline works.

| Tier | Items | Rationale |
|---|---|---|
| **Must-have** (PS-mandatory — the solution does not satisfy the problem statement without these) | GeoChat-7B (BitsAndBytes 4-bit) VQA+grounding; RemoteCLIP zero-shot tagging; **LoRA fine-tune of GeoChat on BigEarthNet** (Section 2C-i); **optical-SAR late-fusion module** (Section 2C-ii); **ChangeFormer + change-VQA (CDVQA-satisfying) prompt chain** (Section 2C-iii); **input validation layer**; agentic router (even a simple keyword/rule-based fallback if the LLM router misbehaves); Leaflet 2D map + query box + response panel; downloadable execution-summary report; deployment to a public URL reachable from a phone | These are explicitly required by the verbatim PS text (Section 0A) — a "generic LLM/VLM without remote-sensing adaptation will not satisfy the requirements," and change-mask-only or optical-only solutions do not meet the mandatory scope |
| **Nice-to-have** (strengthens the pitch, cut only after confirming all Must-have items work) | RAG grounding layer; response pre-caching for demo queries; parallel async execution; scaling the fine-tune to a larger BigEarthNet subset; the true joint-encoder SAR fusion upgrade (Section 2C-ii stretch option) | These improve quality/polish but the PS's stated functional scope is already met without them |
| **Stretch goals** (only attempt if ahead of schedule) | AWQ+Marlin quantization upgrade; Hindi/regional-language output; quantized offline mode; full 20-30 query benchmark against VRSBench/RSVQA/CDVQA (a 5-10 query mini-benchmark is an acceptable substitute); TEOChat upgrade over ChangeFormer | High effort-to-payoff ratio under time pressure; valuable polish but expendable |

**On the 4-week timeline itself:** given that fine-tuning, SAR fusion, and CDVQA are now confirmed mandatory (not assumptions that can be simplified away), the realistic split is Phase 1 (setup) = 3-4 days, **Phase 2 (mandatory adaptation + fusion, now the largest phase) = 10-12 days**, Phase 3 (frontend/deploy/RAG) = 5-6 days, Phase 4-5 (optimization/polish/rehearsal) = remaining days. If the team is behind schedule, protect Phase 2's four mandatory sub-tasks (2.1-2.4) over Phase 3/4/5 polish — a plain but PS-compliant UI beats a beautiful UI wrapped around a non-compliant backend.

---

## 5. Build Phases

### Phase 1 — Environment + Baseline Inference

**Tasks:**
1. Set up Python environment: PyTorch, `transformers`, `accelerate`, `bitsandbytes`, `peft` (for LoRA fine-tuning in Phase 2), GDAL, Rasterio.
2. Register accounts and pull credentials for: Copernicus Open Access Hub, Bhoonidhi (`pip install bhoonidhi`).
3. Download 5–10 sample Indian AOIs (urban sprawl, flood zone, agricultural belt) as GeoTIFFs into `data/sample_aois/`. Also download a BigEarthNet subset (needed for mandatory fine-tuning in Phase 2 — do not defer this download).
4. Write `geochat_service.py`: load `MBZUAI/geochat-7B`, implement a single function `run_vqa(image, query) -> {text, boxes}`.
5. Write `remoteclip_service.py`: load `ChenDelong1999/RemoteCLIP` (ViT-L/14), implement `zero_shot_tag(image, labels) -> scores`.
6. Manually test both on sample AOIs and on RSVQA-LR / VRSBench sample images. Confirm outputs are non-garbage. This baseline (pretrained, not-yet-adapted) run also serves as the "before" comparison point for the mandatory fine-tuning step in Phase 2 — log these baseline outputs, do not discard them.

**Acceptance criteria:**
- [ ] GeoChat returns a coherent text answer + at least one bounding box on a test query like "locate buildings in this image."
- [ ] RemoteCLIP returns sensible top-3 zero-shot labels for a test tile (e.g., "urban," "agricultural," "water").
- [ ] Baseline (pre-fine-tune) outputs on 5-10 test queries are logged for later before/after comparison.

**Fallback:** If GeoChat inference is unacceptably inaccurate on Indian tiles in manual spot-checks, this reinforces the need for the Phase 2 fine-tuning step (which is mandatory regardless — see Section 2C-i) — increase its priority rather than treating it as optional.

---

### Phase 2 — Mandatory Adaptation + Fusion: Fine-Tuning, Router, Change-VQA, SAR Fusion

**This phase implements three PS-mandatory requirements (Section 2C) — do not skip or defer any of the three subsections below.**

**2.1 — Mandatory fine-tuning/adaptation (Section 2C-i):**
1. Prepare a BigEarthNet-derived instruction dataset: convert a subset of BigEarthNet image–label pairs into a simple VQA-style instruction format (e.g., "What land-cover classes are present in this image?" → label list as the target answer). A few thousand samples is sufficient.
2. LoRA fine-tune GeoChat (rank=16, alpha=32, targeting the attention projection layers) on this dataset. Use `peft` + `transformers` Trainer or a simple custom training loop — a few epochs is sufficient given the scoped-down goal.
3. Re-run the same test queries logged in Phase 1 through the fine-tuned model and record the before/after comparison. This comparison becomes both a PS-compliance artifact and a pitch talking point.

**2.2 — Agentic router + mandatory input validation (Section 0A):**
4. Write `router.py`: call Groq API with Llama-3-8B-Instruct. System prompt must classify incoming query into exactly this JSON schema:
   ```json
   {
     "task": "VQA" | "Grounding" | "ChangeDetection_CDVQA" | "ZeroShotSearch" | "CrossModalFusion",
     "modality": "Optical" | "SAR" | "Fused",
     "temporal": "single" | "bi-temporal"
   }
   ```
5. Write an input-validation function (in `router.py` or a dedicated `validation.py`) that runs **before** the router dispatches: check image count matches the requested task (e.g., bi-temporal tasks need exactly 2 co-registered images), check modality tags are present and consistent, check GeoTIFF/TIFF format and CRS metadata are readable, and return a clear error to the user if validation fails rather than silently passing bad input downstream. This satisfies the PS's explicit "check number, modality, format, metadata, and compatibility" requirement.

**2.3 — Change detection + mandatory change-based VQA (Section 2C-iii):**
6. Write `changeformer_service.py`: load `wgcban/ChangeFormer` pretrained on LEVIR-CD, implement `detect_change(image_t1, image_t2) -> mask_geojson`.
7. Test on a co-registered before/after Sentinel-2 pair over a known-change AOI.
8. Implement the CDVQA-satisfying step: after ChangeFormer produces a mask, feed the mask + both images into GeoChat with the change-specific prompt template from Section 2C-iii, producing a natural-language, query-answerable change description — this is mandatory, not optional.

**2.4 — Optical–SAR cross-modal fusion (Section 2C-ii):**
9. Implement the late-fusion approach: run a SAR-capable encoder (check `torchgeo`/`TorchSat` for a pretrained Sentinel-1 backbone) on the SAR image, extract a compact feature/statistics summary, and inject it as structured context into the GeoChat prompt alongside the optical image, per the template in Section 2C-ii.
10. Test on a co-registered Sentinel-1 (SAR) + Sentinel-2 (optical) pair over the same AOI, confirm the fused response references information a purely-optical analysis could not have surfaced (e.g., all-weather/night detection framing, or a structural cue SAR is good at).

**2.5 — Orchestration wiring:**
11. In `main.py`, wire the router (with validation) to dispatch to the correct service(s). For queries needing both GeoChat and ChangeFormer, use `asyncio.gather` — **not** sequential await calls.

**Acceptance criteria:**
- [ ] Fine-tuned GeoChat shows a measurable, logged difference from the Phase-1 baseline on the same test queries.
- [ ] Input validation correctly rejects at least 3 hand-crafted bad-input test cases (wrong image count, missing modality tag, unreadable format).
- [ ] Router correctly classifies at least 8/10 hand-written test queries into the right task/modality/temporal fields.
- [ ] ChangeFormer produces a visually sensible change mask on the test AOI pair (not all-zero, not all-one), AND the change-VQA step produces a coherent natural-language answer to a change-related question.
- [ ] The SAR fusion module demonstrably changes/enriches the response on a fused query compared to an optical-only query on the same AOI.
- [ ] A query requiring both GeoChat + ChangeFormer completes in `max(t_geochat, t_changeformer)` time, verified by logging both call durations and total wall-clock time.

**Fallback:** If the full LoRA fine-tune (2.1) risks the timeline, scope it down further — even a very small (few-hundred-sample, 1-epoch) fine-tune satisfies the letter of the "adapted" requirement and produces *a* before/after artifact; do not skip it entirely, since it is explicitly mandatory in the PS text. If ChangeFormer integration (2.3) stalls past its allotted time, replace the mask step with a simple NDVI/NDBI band-difference visualization as a placeholder for the mask (keep the GeoChat change-VQA step working regardless, since that is the mandatory part) and mark the mask quality explicitly as "future work" in code comments.

---

### Phase 3 — Frontend, Deployment, RAG Grounding

**Tasks:**
1. Build `MapView.jsx`: Leaflet 2D map, viewport-based AOI selection, GeoJSON overlay rendering (boxes from GeoChat, masks from ChangeFormer).
2. Build `QueryBox.jsx` + `ResponsePanel.jsx`: text input, streaming response display.
3. Build `LoadingStates.jsx`: staged status text — "Analyzing satellite imagery..." → "Running change-detection model..." → "Grounding response..." — shown while the corresponding backend call is in flight (drive this from actual backend progress events via WebSocket or polling, not a fake timer).
4. Implement the **low-bandwidth pipeline**: client sends only the current viewport bounding box (EPSG:4326) as JSON; `tile_service.py` crops the relevant tile server-side via Rasterio from a cloud-optimized GeoTIFF, downsamples to 512×512 or 1024×1024, and only text + GeoJSON (target: <50KB) is returned to the client.
5. Build `vector_store.py`: small Qdrant or FAISS instance storing RemoteCLIP embeddings of a curated `knowledge_base.json` (Indian district names, land-cover codes, known AOI metadata — populate this with real, verifiable entries, not placeholders).
   - **Realistic sourcing for a few-thousand-entry knowledge base within 1-2 days, not weeks:** pull India administrative-boundary data (state/district names) from OpenStreetMap's admin-boundary exports (via Nominatim/Overpass API, structured GeoJSON, fast to script) or the Survey of India's published district lists; pull land-cover class codes from Bhuvan's published LULC classification legend (a fixed, documented set of class codes, not something that needs scraping thousands of records). Do not attempt to build an exhaustive national dataset — a few hundred to low-thousands of curated entries covering the demo AOIs and their surrounding districts is sufficient and realistic for the timeline.
6. Wire RAG: before generation, retrieve top-k knowledge-base entries by cosine similarity and inject into the GeoChat prompt as grounding context.
7. Deploy backend + frontend to HuggingFace Spaces. **Try ZeroGPU first** (dynamic H200 access, free for HF PRO subscribers at $9/mo — a worthwhile one-time team cost, verified current 2026 pricing) since it suits bursty, demo-style traffic well. If ZeroGPU's usage quota is insufficient for rehearsal + live demo, fall back to a billed tier: T4-small ($0.40/hr, 16GB VRAM) is likely sufficient for the 4-bit-quantized pipeline; A10G-small ($1.00/hr, 24GB VRAM) if more headroom is needed. Confirm the full app is reachable and functional over a public URL from a mobile browser on cellular data (not just WiFi).

**Acceptance criteria:**
- [ ] The full pipeline (router → model(s) → RAG → render) runs end-to-end and is reachable via a public URL.
- [ ] Confirmed working on an actual phone browser, over cellular data.
- [ ] Response payload for a typical query is under 50KB (verify via browser network inspector).
- [ ] RAG-grounded responses correctly cite retrieved knowledge-base context (spot-check 5 queries manually).

**Fallback (critical — do not skip):** If the full 4-module pipeline is not running end-to-end on a public URL by the end of this phase, cut scope immediately: drop the RAG layer (mark as future work) or drop ChangeFormer, but ship a working 2-module demo. A working, smaller demo beats a broken, ambitious one.

---

### Phase 4 — Latency Optimization

**Tasks:**
1. Apply BitsAndBytes 4-bit (NF4) quantization to GeoChat via `load_in_4bit=True` in the `transformers` loading call — this is the primary, default path (see Section 2A). Confirm VRAM footprint drops to roughly 4-5GB and note the actual measured throughput.
2. Serve via plain HuggingFace Transformers, not vLLM, for the live single-request demo path (vLLM is only appropriate for the offline batch-benchmark in Phase 5).
3. Implement KV-cache reuse for the fixed system-prompt prefix (reuse `past_key_values` across requests rather than recomputing the full prompt each time).
4. Build `response_cache.py`: an in-memory (or Redis) key-value cache. Pre-compute and store full responses for 3–5 queries that will be used in the live demo rehearsal. Cache lookup should be near-instant (<500ms) on a hit, with a correct fallback to live inference on a miss.
5. Add streaming: GeoChat's text output should stream token-by-token to the frontend while box/mask rendering completes in parallel.
6. **Stretch goal only, do not block on this:** if Phases 1-3 finished ahead of schedule and a team member wants to attempt AWQ+Marlin for extra throughput, budget it as an isolated side-experiment with its own environment (see Section 2B) — never replace the working BitsAndBytes path until the AWQ version is proven equivalent in output quality.

**Acceptance criteria:**
- [ ] BitsAndBytes 4-bit quantization applied and VRAM reduction confirmed (log before/after numbers).
- [ ] A pre-cached demo query responds in under 500ms end-to-end (measure and log).
- [ ] An un-cached, live query completes in under 5 seconds end-to-end (measure and log; if not met, apply parallel execution / KV-cache fixes before proceeding).
- [ ] Text response visibly streams in the UI rather than appearing all at once.

**Fallback:** If even BitsAndBytes 4-bit quantization introduces integration issues in the available time, fall back to running GeoChat unquantized (fp16) on a larger GPU tier (HF Spaces A10G-small, 24GB VRAM, $1.00/hr) for the demo window only — this is a valid, simple fallback that trades a small amount of rental cost for zero quantization risk.

---

### Phase 5 — Differentiation, Benchmark, Rehearsal

**Tasks:**
1. Add Hindi/regional-language output: translate the final text response via IndicTrans2 or a lightweight open-model translation pass (do not use a closed API for this if avoidable).
2. Add a quantized offline mode: demonstrate the 4-bit GeoChat running without an internet connection, if GPU/time allows.
3. Build `build_benchmark.py`: run 20–30 hand-written test queries against Indian AOIs (mix of VQA, grounding, and change-detection queries) through the full pipeline, and record accuracy/latency numbers to quote in the pitch. This is a genuine batch workload — vLLM is appropriate here if desired.
4. Prepare the presentation-facing artifacts (not code, but flag for the user): math slides (InfoNCE loss, LoRA update rule, ChangeFormer BCE+Dice loss — already written up in the companion strategy PDF), the Google Earth AI differentiation table, and a rehearsed live-demo script with exactly 3–4 guaranteed-working queries. **Use the PS's own representative queries as the primary source for these** (verified verbatim from the official PS text) — evaluators are likely to test with queries similar to these, so rehearsing on the exact phrasing is the highest-value prep: "Describe the land-cover and major objects visible in this image," "Highlight the water body referred to in the query," "What changed between these two dates, and where did the change occur?," "Use the optical and SAR images together to identify built-up and water-covered regions," "Has the built-up area increased, decreased, or remained unchanged?" — these five collectively exercise VQA, grounding, change-VQA, and optical-SAR fusion, i.e., all the PS's mandatory functional categories in one rehearsal set.
5. Full dry-run of the deployed app on mobile cellular data, end-to-end, timed.

**Acceptance criteria:**
- [ ] Hindi output verified correct on at least 3 sample queries (native-speaker or reliable back-translation check).
- [ ] Benchmark script produces a clean results table (query, task type, latency, pass/fail on manual review).
- [ ] Full mobile dry-run completed with no crashes, on cellular data, timed end-to-end.

---

## 6. API Contract (Backend)

Implement exactly this contract so frontend/backend can be built somewhat independently:

**POST `/query`**
```json
// Request
{
  "query": "string, natural language",
  "images": [
    { "url_or_path": "string", "modality": "optical" | "sar", "timestamp": "ISO date string" }
  ],
  "viewport_bbox": [minLon, minLat, maxLon, maxLat],
  "language": "en" | "hi" | "<regional code>"
}

// Response
{
  "validation": { "passed": true, "errors": [] },
  "text_response": "string",
  "boxes": [ { "bbox": [x1,y1,x2,y2], "label": "string", "confidence": 0.0 } ],
  "change_mask_geojson": { /* GeoJSON polygon, null if not a change query */ },
  "change_vqa_answer": "string, null if not a change query",
  "sar_fusion_context": "string, null if not a fused-modality query",
  "route_taken": { "task": "...", "modality": "...", "temporal": "..." },
  "execution_summary": {
    "task": "...",
    "models_used": ["geochat", "changeformer", "..."],
    "parameters": {},
    "confidence": 0.0
  },
  "latency_ms": 0,
  "cached": true | false
}
```

**GET `/report/{query_id}`** — returns a downloadable PDF or JSON execution-summary report for a prior query (PS-mandatory deliverable — see Section 0A).

---

## 7. What the AI Agent Should NOT Decide

Do not silently change any of the following. If you believe a change is warranted, stop and flag it to the user rather than proceeding:
- Model choices in Section 2.
- The "no closed-API for core reasoning" rule.
- The 2D-only map constraint.
- The phased order (do not build Phase 3 UI before Phase 1/2 models are verified working).
- **The mandatory status of fine-tuning, SAR fusion, and change-VQA (Section 2C)** — these are not engineering nice-to-haves, they are direct requirements from the verbatim official PS text (Section 0A). Do not simplify them away to save time without explicitly flagging the tradeoff to the user first.

---

## 8. Definition of Done

Aligned with the priority tiering in Section 4A and the verbatim PS requirements in Section 0A — the Must-have list is the PS-compliance bar, not just a demo-quality bar.

**Minimum viable "done" — PS-compliant (Must-have — the project does not satisfy the problem statement without these):**
- [ ] Public URL live, tested on a phone over cellular data.
- [ ] GeoChat (4-bit quantized) and RemoteCLIP integrated and verifiably working (not mocked).
- [ ] **At least one component demonstrably fine-tuned/adapted on BigEarthNet**, with a logged before/after comparison (Section 2C-i).
- [ ] **Optical-SAR fusion module working**, with a demonstrated response difference on fused vs. optical-only queries (Section 2C-ii).
- [ ] **Bi-temporal change analysis produces a change description or change-VQA answer**, not just a raw mask (Section 2C-iii).
- [ ] Input validation layer checks image count/modality/format/metadata before dispatch, with visible error handling on bad input.
- [ ] Router correctly dispatches queries (LLM-based or rule-based fallback).
- [ ] Leaflet 2D map + query box + response panel functional end-to-end.
- [ ] Downloadable execution-summary report available for at least one completed query.
- [ ] No 3D rendering, no native app, no closed-API core-reasoning calls anywhere in the codebase.

**Strong submission (Nice-to-have — pursue after Must-have is solid):**
- [ ] RAG grounding layer active, with at least one demonstrated before/after hallucination-reduction example.
- [ ] At least 3 demo queries pre-cached and instant (<500ms).
- [ ] Parallel async execution confirmed for multi-module queries.
- [ ] Fine-tune scaled beyond the minimal viable BigEarthNet subset.

**Bonus polish (Stretch — only if ahead of schedule):**
- [ ] AWQ+Marlin quantization attempted as a proven upgrade over BitsAndBytes (not a replacement unless verified equivalent).
- [ ] True joint-encoder SAR fusion (beyond the late-fusion baseline).
- [ ] Hindi/regional output working.
- [ ] Benchmark script run against VRSBench/RSVQA/CDVQA subsets (5-10 queries per dataset is an acceptable substitute for exhaustive evaluation) with results logged.
- [ ] Quantized offline mode demonstrated.
- [ ] Quantized offline mode demonstrated.
