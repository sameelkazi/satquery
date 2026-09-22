# SatQuery AI — Complete Feature Inventory & Roadmap

**Project:** SatQuery AI (SIH26167 — ISRO, Department of Space)
**Last updated:** 2026-09-09
**Source of truth for PS requirements:** `SatQuery_AI_PRD_for_AI_Coding_Agents.md`, Section 0A (verbatim official problem statement)
**Scope of this document:** Every feature in SatQuery — everything currently implemented (backend + frontend, verified against the actual source code) and everything planned or proposed (the app's own in-UI roadmap plus the six newly-discussed feature ideas). Anything that looked real but wasn't backed by an actual API call is called out explicitly rather than presented as equivalent to a working feature. This supersedes the narrower first draft of this file, which covered only the six newly-proposed ideas.

---

## 0. Problem Statement Context (for reference)

The official PS (Section 0A) mandates:

- **Remote-sensing adaptation:** at least one vision/vision-language component must be fine-tuned or adapted using BigEarthNet.txt or similar open data. A generic, non-adapted LLM/VLM does not satisfy the requirements.
- **Single-image baseline:** VQA is mandatory, plus either captioning/scene description *or* text-guided region grounding.
- **Multi-image change analysis:** change description or change-based VQA from a bi-temporal pair is mandatory. A spatial change map is an addition where reference masks are available.
- **Cross-modal pair analysis:** the system must extract complementary information from a co-registered optical/multispectral and SAR image pair.
- **Agentic orchestration:** automatic task classification, input validation, tool/model selection, output fusion, and an auditable execution summary.
- **Deliverables:** interactive GUI, input upload/compatibility checking, visual evidence, confidence information, execution summaries, and **downloadable reports**.

Two constraints that directly shape the feature list below:

- The system **must run entirely on public data** — it is explicitly **not** dependent on ISRO-internal/classified imagery (Cartosat-2S, RISAT SAR).
- Final evaluation uses an **undisclosed ISRO/SAC dataset** of co-registered Cartosat-2S optical + RISAT SAR pairs. The team has **confirmed no access** to this sensor-format imagery during development — a structural risk that applies equally to every competing team.

---

## PART A — Currently Implemented Features

### A.1 Core Mandatory Task Pipeline (Backend)

| Task | PS Requirement | Real Implementation | Status |
|---|---|---|---|
| **VQA** (Visual Question Answering) | Mandatory, single-image baseline | `geochat_service.py`, Qwen2.5-VL-3B (NF4 4-bit quantized) + custom LoRA adapter fine-tuned on VRSBench. Tiered fallback: local/Colab-tunnel GPU → Groq text-only LLM (sees a text description, not real pixels) → deterministic heuristic. Verified accuracy: **77.0%** LLM-judged on 200 held-out VRSBench questions. | **Real, verified.** |
| **Visual Grounding** | Text-guided region grounding | `geochat_service.py` (fine-tuned coordinate head) for referring-expression queries; `grounding_dino_service.py` (open-vocabulary detector + SAHI tiling) for category-wide "locate all X" queries — added because VRSBench's own paper (arXiv:2406.12384) confirms the fine-tuned model architecturally only ever emits one box per query. Verified: Acc@0.5 **44.0%**, Acc@0.7 **16.0%**, mean IoU **0.3671** (X-first coordinate ordering; a documented coordinate-order ambiguity in the base model's output is disclosed in the research paper). | **Real, verified. Grounding accuracy is genuinely still in active hardening — this is disclosed, not hidden.** |
| **Bi-Temporal Change Detection (CDVQA)** | Mandatory multi-image change analysis | `changeformer_service.py`, AdaptFormer-CD (Siamese ViT + lightweight adapter tuning), trained/evaluated against LEVIR-CD/WHU-CD (external published baseline F1 91.4%, honestly labeled as the authors' own paper result, not a SatQuery-internal number). Produces a real pixel-level probability mask, converted via `rasterio.features.shapes` into vector GeoJSON polygons rendered live on the Leaflet map. | **Real, verified.** |
| **Cross-Modal Fusion (Optical + SAR)** | Mandatory cross-modal pair analysis | `sar_fusion_service.py` computes genuine NumPy-derived backscatter statistics from real Sentinel-1 VV/VH pixel data (mean backscatter, std, water-likelihood ratio, urban double-bounce ratio, volume scattering ratio), fused with Qwen2.5-VL reasoning across both images. | **Real, verified.** Validation gap found and slated for fix: current check only requires 2 images, not one-of-each-modality (see Part B, item 2 of the debug plan). |
| **Zero-Shot Semantic Search / Retrieval** | Not explicitly named in the PS but supports the agentic orchestration + catalog requirement | `remoteclip_service.py` — real zero-shot tagging and image/text embedding via RemoteCLIP, against a `DEFAULT_RS_LABELS` taxonomy. | **Real, verified.** |
| **Agentic task routing** | Mandatory: automatic task classification, validation, model selection, output fusion, auditable execution summary | `router.py` (keyword/heuristic task classifier) + `validation.py` (pre-dispatch input checks) + `main.py`'s dispatch logic + `execution_summary` returned on every response. | **Real and working for the common case.** A known dispatch/validation edge case (task mislabeled when an image-count precondition silently isn't met) is tracked as an open bug in the separate debug plan, not yet fixed. |

### A.2 Supporting Backend Services

- **RAG grounding / hallucination guard** (`backend/rag/vector_store.py`): retrieves curated Indian district and Bhuvan LULC facts via RemoteCLIP text embeddings before generation, cosine-similarity search over an in-memory NumPy store (not a dedicated vector database — see Part D, honesty finding #2). Includes a real, previously-shipped bug fix (2026-08-26): a region-scoping guard that stops a generic query from retrieving an unrelated district's facts.
- **Hindi/English translation** (`backend/translation.py`): domain-specific `RS_HINDI_LEXICON` for remote-sensing terminology, wired to `/api/translate` and the frontend's language toggle.
- **Live satellite catalog search** (`backend/geo/bhoonidhi_client.py`): genuine, unauthenticated Copernicus OData API integration for real-time Sentinel-1/2 scene search (fixed 2026-08-24 from a fully-fake hardcoded scene list). ISRO Bhoonidhi itself remains an honestly-labeled static example, since no public unauthenticated Bhoonidhi API exists — this is disclosed in the UI copy, not presented as live.
- **Viewport tile cropping** (`backend/geo/tile_service.py`): real GeoTIFF bounding-box cropping and JPEG compression for low-bandwidth delivery to the map.
- **Response cache** (`backend/cache/response_cache.py`): exact-duplicate query caching for latency. Previously the root cause of a real "inaccurate annotation" bug (pre-seeded fabricated demo answers bypassing the whole pipeline) — fixed 2026-08-24.
- **Human-in-the-Loop feedback** (`/api/feedback`, `/api/feedback/queue`): a real analyst-correction queue persisted to `data/retraining_queue.json`, wired end-to-end to `HitlAnnotationPage.jsx`.
- **Georeferencing** (`backend/models/geo_transform.py`): `get_real_georeference()` never fabricates a coordinate transform — returns `None` unless the raster genuinely carries CRS metadata. Extended (2026-09-09) with `get_real_georeference_with_sidecar()`, which allows the project's own demo AOI PNGs (whose true bounding boxes are already known and recorded) to resolve via a same-basename `.tif` sidecar, with a pixel-dimension safety check — arbitrary user uploads without a matching sidecar are unaffected and still honestly return `None`.
- **SITREP / audit PDF report** (`backend/report_generator.py`): downloadable PDF per query — header/timestamp, sensor/platform info, VQA response, bounding-box table, router decision trace, and an "Auditable Parameters" section that reads real per-service state rather than asserting a fixed claim. Extended (2026-09-09, commit `01d2b85`) with a real bi-temporal area-analysis section (hectares/acres, computed from `changeformer_service`'s WGS84 polygon-area math) and a SHA-256 content-integrity hash over the report's own recorded fields (explicitly labeled as a fingerprint of the record, not of model weights or raw imagery).

### A.3 API Surface (`backend/main.py`)

`GET /`, `POST /upload`, `POST /query`, `POST /query/stream`, `GET /report/{query_id}`, `GET /report/{query_id}/pdf`, `GET /api/catalog/search`, `POST /api/feedback`, `GET /api/feedback/queue`, `POST /api/translate`.

### A.4 Frontend — Confirmed Real (genuinely wired to a backend or external API)

| Component | What it does |
|---|---|
| `QueryBox.jsx` | Natural-language query input; sample-AOI selector; GeoTIFF/PNG upload (`uploadSatelliteFile`, wired to `/upload`); modality pills (Optical / SAR / Fused / Bi-Temporal); ISRO exemplar query chips matching the PS's own five reference questions; **voice query via the Web Speech API** (Hindi + English); language toggle. |
| `MapView.jsx` | Interactive Leaflet map (Esri World Imagery basemap + CartoDB labels), real bounding-box rendering from grounding responses, real ChangeFormer GeoJSON polygon overlay, WGS84 EPSG:4326 coordinate HUD, layer toggles. |
| `ModalityViewer.jsx` | Side-by-side sensor comparison (optical/SAR or bi-temporal T1/T2) **and an interactive drag-to-compare swipe slider** — this is the swipe-slider half of the "hectare quantifier + split-swipe" idea already built (see Part D §D.3). |
| `ResponsePanel.jsx` | Renders the real answer text, confidence %, latency, computed bounding-box area (km²), **text-to-speech playback via the Web Speech Synthesis API**, links to Audit Trace / GIS export / PDF download. |
| `DomainSelector.jsx` | Five real "Mission Cockpit" domain profiles (ISRO general, NDMA disaster, MNCFC/ICAR agriculture, MoHUA urban, INCOIS maritime), each pre-wiring a relevant AOI, modality, and default query. |
| `GisExportModal.jsx` | Real GeoJSON, KML, and WKT/CSV export functions operating on actual response data; real file download + clipboard copy. |
| `BhoonidhiModal.jsx` | Calls the real `/api/catalog/search` endpoint (genuine Copernicus OData search). |
| `ExecutionSummary.jsx` | Renders real `route_taken` / `execution_summary` fields from actual API responses. |
| `HitlAnnotationPage.jsx` | Real `fetch` calls to `/api/feedback` and `/api/feedback/queue` — genuine analyst feedback loop. |
| `SituationalTwinPage.jsx` | Genuine live fetches to `api.open-meteo.com` (weather), `earthquake.usgs.gov` (USGS seismic), and `nominatim.openstreetmap.org` (geocoding). Links out to NASA FIRMS (not yet integrated — see Part C). |
| `DeveloperHubPage.jsx` | A real interactive API tester that calls the live backend. |
| `AtmosphericWeatherCard.jsx` | Decorative weather-card UI component (accepts live values as props from `SituationalTwinPage`'s real fetches; the card itself has no independent data source). |
| `TeamRosterModal.jsx` | Team roster and credits — informational, no claims to verify. |
| `SihComplianceModal.jsx` | A 6-pillar PS-compliance showcase (maps each PS requirement to the actual implementing model/service). One stale figure was found and fixed during this audit (see Part D, honesty finding #1). |
| `TechSpecModal.jsx` | Technical spec cards (architecture, formulas, arXiv links, metrics) for each real technology in the stack: RemoteCLIP, Qwen2.5-VL, Grounding DINO, SAHI, AdaptFormer-CD, VRSBench, QLoRA, ISRO Bhoonidhi, ESA Copernicus, PyTorch, Hugging Face, and the in-house RAG vector store. One entry was found to name a technology not actually integrated and was corrected (see Part D, honesty finding #2). |
| Small UI-chrome components (`AgencyLogo`, `Hero`, `HeroBadge`, `Navbar`, `StudioNavbar`, `BottomLeftCard`, `BottomRightCorner`, `Loader`, `ThemeCloseButton`, `ThemeSwitch`, `ui/geospatial-cursor`, `ui/handwriting-svg`) | Pure presentation/navigation chrome — checked for hidden claims; none found. |

### A.5 Frontend — Flagged as Likely UI-Only Mockups (no real backend wiring found)

Per the "PS compromise nahi" standard this project holds itself to, these two pages are called out plainly rather than presented as equivalent to the confirmed-real features above:

- **`ExplainabilityPage.jsx`** ("Explainable AI (XAI) Vision Token Attention Heatmap") — **zero `fetch`/`axios`/API calls found anywhere in the file.** It contains a specific, hardcoded narrative claim ("concentrated 38% of self-attention weights on the riverbank land-water boundary") baked directly into JSX text rather than derived from any real model introspection. All interactivity (`heatmapOpacity`, `selectedColormap`, `activeLayer`, `selectedToken`) is local UI state with no data source. **This page should either be rebuilt on real attention-weight extraction from the model, or clearly relabeled as a conceptual/illustrative mockup before being shown to evaluators as a working feature.**
- **`ContinuousMonitoringPage.jsx`** ("Continuous Monitoring & Multi-Ministry Automated Alerting") — **zero `fetch`/`axios`/API calls found.** No backend endpoint exists for scheduled monitoring or multi-ministry alert dispatch. **Same recommendation: rebuild on a real scheduler + notification backend, or relabel as illustrative.**

---

## PART B — Known Open Correctness Issues (not yet fixed, tracked separately)

These were found during a deep-debug pass and are documented in a separate implementation plan, not yet executed:

1. `main.py`: when `ChangeDetection_CDVQA`/`CrossModalFusion` is routed but the image-count precondition isn't actually met, execution silently falls through to plain VQA without updating `execution_summary.task` — misreporting what actually ran.
2. `validation.py`: fusion validation only checks `len(images) >= 2`, not one-optical + one-SAR — two optical images could pass fusion validation and be treated as though one were genuine SAR data.
3. `validation.py` / `router.py`: two independently-maintained keyword lists for query classification can silently drift (root cause of #1).
4. `validation.py`: PS's GeoTIFF-primary / PNG-JPEG-only-for-benchmark-datasets format rule is not yet enforced.
5. `LoadingStates.jsx`: progress narration names specific models ("Executing GeoChat-7B, ChangeFormer & SAR Dual-Pol services in parallel...") regardless of which ones will actually run for a given query.
6. ~~A Gemini vision fallback tier is planned but not yet implemented.~~ **Correction: this is already implemented.** `geochat_service.py` already imports `gemini_service.py` and calls `describe_images(...)` as a real vision-grounded tier between the remote-tunnel and Groq fallbacks — it was live in the codebase before this line was first written. Labeled honestly as a general-purpose VLM (not RS-fine-tuned), confidence bucketed as `heuristic`, and never flips `is_real_model_loaded`/`adapter_active`.

---

## PART C — Existing In-App Future Roadmap (from `FutureRoadmapModal.jsx`)

The app already has its own honestly-labeled roadmap, independent of the six newly-discussed ideas below:

1. **BigEarthNet.txt Scale-Up & Grounding Hardening** (Near-Term) — pipeline for this is built; needs a GPU run to execute at scale.
2. **Multi-Source Situational Intelligence** (Mid-Term) — Open-Meteo/USGS labeled "Live Today" (confirmed accurate), NASA FIRMS labeled "Next Sprint" (confirmed not yet integrated), Analyst Feedback labeled "Active Queue" (confirmed true).
3. **Ministry-to-Citizen Digital Twin** (Long-Term, aspirational) — ministry GIS dashboard + citizen WhatsApp/SMS alerts in 12 languages. Not started.
4. **GovTech Integration & Next-Gen Specialists** (Ecosystem) — claims API Setu sandbox integration (not independently verified this round) plus a future evaluation against EarthDial (CVPR 2025). Not started.

---

## PART D — Newly Proposed Features (from the team's recent brainstorm)

### Honesty findings from this round's audit (fixed during this session)

1. **`SihComplianceModal.jsx` — stale/inconsistent VQA accuracy figure.** Pillar 1's benchmark tile claimed "VQA Accuracy 84.0% ... LLM-Judged • 50 Held-Out Qs" — a number that appears nowhere else in the codebase and directly contradicts the independently-verified, reproducible result used everywhere else (77.0% LLM-judged accuracy on a 200-question held-out VRSBench set, per `data/vrsbench_accuracy_eval.json` and `TechSpecModal.jsx`'s own Qwen2.5-VL card). **Fixed:** corrected to "77.0% ... 200 Held-Out Qs" to match the verified number everywhere else.
2. **`Hero.jsx` / `TechSpecModal.jsx` — a named technology that isn't actually used.** The scrolling tech-stack strip on the landing page, and its accompanying spec card, both named "Qdrant Vector DB" as part of the architecture, complete with plausible-sounding metrics ("<25ms query speed", "HNSW + Geo-Payload", "Millions of scenes"). A direct search of the backend found **zero references to Qdrant anywhere in the codebase** — the real RAG implementation (`backend/rag/vector_store.py`) is an in-house, in-memory NumPy cosine-similarity search over a curated JSON knowledge base, not a dedicated vector database. **Fixed:** relabeled as "SatQuery RAG Vector Store" with metrics and an architecture description that match what the code actually does (in-memory NumPy search, filename-inferred region scoping, deterministic hashed-vector fallback).

Both fixes were verified with an `esbuild` syntax check after editing.

### D.1 Sensor-Agnostic, GSD-Adaptive Tiling
*(Originally pitched as "ISRO Blind-Test Shield: Cartosat-2S & RISAT-1A Sensor Preset Mode")*

**Idea:** Make the SAHI tiling pipeline adapt patch size/stride to the ground sample distance (GSD) of whatever imagery it receives, instead of a fixed size tuned only for 10 m Sentinel data.

**PS alignment:** Indirect — the undisclosed final-evaluation dataset uses sub-meter Cartosat-2S imagery, and a fixed Sentinel-tuned patch size would generalize poorly to it.

**Honesty assessment — reframed from the original pitch.** The original framing implied sensor-specific calibration and validation against Cartosat-2S/RISAT, which the team has **no access to** — claiming validation against it would be an unverifiable overclaim. The legitimate version is **generic, sensor-agnostic engineering**: read declared GSD/resolution metadata when present and scale tiling parameters accordingly, without claiming validation the team doesn't have.

**Status:** Not started. **Priority:** 5.

### D.2 SAR Dielectric Overlay (Cloud-Shadow vs. True Water Disambiguation)

**Idea:** Visualize the real backscatter-derived statistics SatQuery already computes (mean backscatter, water-likelihood, urban double-bounce ratio) as a map overlay.

**PS alignment:** Direct — makes the mandatory cross-modal capability visible and verifiable, not just textual.

**Honesty assessment:** Strong — `sar_fusion_service.py`'s `extract_sar_features()` already computes real statistics from real pixel data; this only visualizes what's already genuinely computed.

**Status:** Backend statistics exist and are real; map visualization layer not yet built. **Priority:** 3.

### D.3 Hectare/Acreage Change Quantifier + Before/After Split-Swipe

**Idea:** Report bi-temporal change in physical units (hectares/acres) and let users visually compare pre/post imagery with a swipe slider.

**PS alignment:** Direct — extends the mandatory change-detection capability with a decision-useful, quantified output.

**Honesty assessment — required a real fix before it could work at all.** Every demo AOI PNG lacked embedded geospatial metadata, so `get_real_georeference()` always returned `None` for them, meaning area would always show as unavailable in the live demo. **Fix implemented (2026-09-09, commit `18938c4`):** each demo AOI's already-known true bounding box (recorded in `sample_aois_metadata.json`) is packaged into a same-name `.tif` GeoTIFF sidecar; `get_real_georeference_with_sidecar()` uses it only when pixel dimensions match, leaving arbitrary uploads unaffected. Verified end-to-end: the Brahmaputra flood pair now correctly computes **852.155 ha**, cross-checked consistent with the pipeline's independently-computed 13.68% change rate against the AOI's true bbox area.

**Status:** Backend hectare/acreage computation — **done**. Exposed in the SITREP PDF — **done**. **The frontend swipe-slider UI is also already built** (`ModalityViewer.jsx`'s "Swipe Slider" view mode, confirmed in this audit) — this item is more complete than previously tracked. **Priority:** 2.

### D.4 Click-to-Drill-Down Target Interrogation

**Idea:** Clicking a detected bounding box opens a mini info card with a one-click "Interrogate Target" follow-up VQA query.

**PS alignment:** Enhances existing grounding UX; not itself a new mandated capability.

**Honesty assessment:** Low risk — chains an existing real capability through a nicer UI trigger.

**Note (updated 2026-09-09):** SatQuery now has real conversational memory (see Part F) — `session_id` is already threaded through `QueryRequest`/`QueryResponse` and the frontend's `chatHistory` state, so this feature can build directly on the existing session plumbing rather than needing a new history mechanism first. It would still need its own UI trigger (the click-to-drill-down card) and to pass the current `session_id` on the follow-up query.

**Status:** Not started. **Priority:** 4.

### D.5 Multi-Spectral Physics Grounding (NDVI/NDWI Toggle)

**Idea:** Let users switch to computed spectral indices (NDVI for vegetation, NDWI for water) to visually cross-check textual claims.

**PS alignment:** Indirect — the PS's adaptation requirement is about model fine-tuning, not spectral-index visualization; still a legitimate standalone enhancement.

**Honesty assessment — real data gap.** Genuine NDVI needs a real near-infrared band; the demo AOIs are RGB-only. **Approximating NDVI from RGB and calling it NDVI would be scientifically incorrect and exactly the kind of fabricated-capability claim this project audits against.** Requires sourcing real multi-band Sentinel-2 imagery first.

**Status:** Not started; blocked on real multi-band source imagery. **Priority:** 6.

### D.6 SITREP / Mission Intelligence Report (1-Click PDF Export)

**Idea:** A formal, downloadable audit report per query.

**PS alignment:** Direct — the PS explicitly lists downloadable reports as a mandatory deliverable.

**Status:** Core report already existed; extended (2026-09-09, commit `01d2b85`) with a real area-analysis section and a SHA-256 content-integrity hash — see Part A.2. Sun-elevation/sensor-telemetry fields and an embedded map-snapshot image remain open (would need real per-image EXIF/STAC metadata and a frontend map-to-image export, neither of which exist yet). **Priority:** 1 (done first).

### D.7 Priority Roadmap

| # | Feature | PS Alignment | Status | Priority |
|---|---|---|---|---|
| 1 | SITREP PDF enhancement (area analysis + integrity hash) | Direct (mandatory deliverable) | **Done, verified** | 1 |
| 2 | Hectare/acreage quantifier + split-swipe UI | Direct (change-detection mandate) | **Backend + frontend both done, verified** | 2 |
| 3 | SAR dielectric overlay (visualize real backscatter stats) | Direct (cross-modal mandate) | Backend stats real; visualization not started | 3 |
| 4 | Click-to-drill-down target interrogation | Enhances existing grounding | Not started | 4 |
| 5 | Sensor-agnostic, GSD-adaptive tiling (honestly reframed) | Indirect (final-eval generalization) | Not started | 5 |
| 6 | NDVI/NDWI spectral toggle | Indirect; PS doesn't mandate this | Blocked on real multi-band imagery | 6 |

---

## PART E — Groundwork Already in Place

- Real WGS84 polygon-area math (`changeformer_service._polygon_area_sq_m_wgs84`) — fixed from a prior fabrication (2026-08-29 audit).
- Real per-pixel change-region polygonization via `rasterio.features.shapes` (replaced an earlier fixed-grid approximation).
- Real SAR backscatter statistics (`sar_fusion_service.extract_sar_features`).
- Real, honesty-fixed execution report generator (`report_generator.py`).
- Real georeferencing detection (`geo_transform.get_real_georeference`) with a strict never-fabricate contract, now extended with a sidecar mechanism scoped only to the project's own curated demo assets.
- The bi-temporal split-swipe comparison UI (`ModalityViewer.jsx`) already exists and is reusable for D.3 and D.2.

## PART F — Known System Limitations Relevant to Future Features

- ~~**No conversational memory.**~~ **Implemented (2026-09-09).** Sessions are now tracked server-side (`backend/session_store.py`, one JSON file per session under `data/sessions/`, capped at the last 5 turns, text-only). All four inference tiers (local Qwen2.5-VL, remote GPU tunnel, Gemini, Groq) are conditioned on prior turns of the same session — genuine multi-turn `apply_chat_template`/`messages` history for the local-model and Groq tiers, a folded-in text recap for the remote-tunnel and Gemini tiers. The frontend persists a `session_id` in `localStorage`, resets it automatically on every AOI/scene switch, and offers a "New Conversation" control. Known honest limits: prior images are never re-attached (only their questions/answers are recalled), the local-model tier's chat-template correctness could not be live-verified in this sandbox (no GPU available here), and the remote-tunnel's genuine multi-turn support requires redeploying the updated `kaggle_inference_server.ipynb`.
- **Groq fallback tier is text-only, but it is not the only fallback.** When no GPU/tunnel is available, `geochat_service.py` first tries a real Gemini vision call (see the correction on Part B, item 6) before ever falling back to the text-only Groq tier — Groq-text-only is now the last-resort case, not the common one.
- **Two frontend pages are UI mockups, not live features** (Part A.5) — they should not be demoed as working AI capabilities without either being wired to a real backend or clearly relabeled as illustrative.
