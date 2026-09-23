"""
Demo Query Response Cache (Phase 4 Latency Optimization)

HONESTY FIX (2026-08-24) — this was the actual root cause of the "inaccurate annotation"
report on the "locate buildings in this image" query:

Previously, `_preload_rehearsal_demo_queries()` pre-seeded this cache at startup with 5 fully
FABRICATED responses for the "official ISRO representative queries" — hardcoded text,
hardcoded bounding boxes with specific pixel coordinates, and suspiciously round confidence
scores (0.93-0.97) — none of it ever produced by any model. `backend/main.py` checks this
cache BEFORE routing or invoking any specialist model (step "1.5 Fast In-Memory Demo Cache
Check"), so for any of those 5 exact queries, the ENTIRE pipeline — router, GeoChat/Gemini/
Groq fallback chain, every honesty fix made across three rounds of this audit — was silently
bypassed forever, and a scripted fake answer was served instead. This is exactly what
happened to the "locate buildings in this image" query: models_used showed
"GeoChat-7B-Grounded" (a label that appears nowhere in geochat_service.py — it's not a real
model output) at a fabricated 95% confidence.

This cache is legitimate as a LATENCY optimization (repeat queries during a live demo
shouldn't re-run a slow model stack) — the bug was populating it with pre-written fake
answers instead of genuinely-computed ones. The fix: this class no longer pre-seeds anything.
`get()`/`set()` remain as plain memoization primitives; `backend/main.py` now calls `set()`
only AFTER it has genuinely computed a response via the real pipeline, so a cache hit always
replays a real answer that was actually produced once, never a scripted one that was never
computed at all. The cache starts empty and is populated purely from real traffic.

CORRECTNESS FIX (2026-08-29) — a teammate's audit correctly flagged that the cache key only
ever covered the query text, the FIRST image's filename, and a single combined modality
string. Confirmed directly against main.py's call sites and genuinely broken for:
  - Bi-temporal change queries: same T1 + a DIFFERENT T2 (or vice versa) hashed identically
    to an earlier request, so a stale, unrelated T1/T2 answer could be replayed.
  - Fusion queries: the same optical image with a DIFFERENT SAR image had the same problem
    (the old key never looked at the second image at all).
  - Model/adapter upgrades: nothing in the key changed when the real RS-adapted LoRA became
    active, so a pre-adapter fallback answer (Gemini/Groq/template) computed earlier would
    keep being replayed forever for the same query+first-image+modality combo, even after a
    genuinely better model became available.

Fixed: the key now covers EVERY image in the request, in order (not just the first), each
identified by a stable identity signal -- real file mtime+size when the path exists locally
(cheap: no full file read, but changes whenever the underlying upload's bytes genuinely
change), or the raw path/URL/data-URI string otherwise (a data: URI already IS the image's
content, so hashing it directly is exact, not an approximation). The key also now includes
the ordered per-image modality tags, the viewport bbox, and a `model_version` fingerprint the
caller supplies -- main.py builds one from geochat_service's real `adapter_active` flag and
`model_id`, so the moment the real adapter comes online, every previously-cached answer is
automatically treated as a cache miss and recomputed for real, rather than replaying a stale
fallback forever.
"""

import hashlib
import os
from typing import Any, Dict, List, Optional


class ResponseCache:
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}

    def _image_signature(self, images: List[Dict[str, Any]]) -> str:
        """
        Builds an ordered, per-image identity signature covering EVERY image in the request
        (not just the first). For a real local file, uses (path, mtime_ns, size) -- a cheap
        stat-based stand-in for a full content hash that still correctly invalidates the
        moment the file's actual bytes change (a re-uploaded T2 with the same filename but
        different content gets a different signature), without reading the whole file on
        every cache lookup. For a URL or a data: URI (already the literal image content),
        falls back to the raw string itself, which is already an exact, stable identity.
        """
        parts = []
        for img in images:
            path = img.get("url_or_path", "")
            modality = str(img.get("modality", "")).lower()
            identity = path
            try:
                if path and os.path.exists(path):
                    st = os.stat(path)
                    identity = f"{path}:{st.st_mtime_ns}:{st.st_size}"
            except OSError:
                pass
            parts.append(f"{identity}|{modality}")
        return ";".join(parts)

    def _hash_key(
        self,
        query: str,
        images: List[Dict[str, Any]],
        viewport_bbox: Optional[List[float]],
        model_version: str,
    ) -> str:
        bbox_sig = ",".join(f"{v:.6f}" for v in viewport_bbox) if viewport_bbox else "no_viewport"
        raw = (
            f"{query.strip().lower()}|{self._image_signature(images)}|"
            f"{bbox_sig}|{model_version}"
        )
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def get(
        self,
        query: str,
        images: List[Dict[str, Any]],
        viewport_bbox: Optional[List[float]] = None,
        model_version: str = "",
    ) -> Optional[Dict[str, Any]]:
        k = self._hash_key(query, images, viewport_bbox, model_version)
        return self._cache.get(k)

    def set(
        self,
        query: str,
        images: List[Dict[str, Any]],
        viewport_bbox: Optional[List[float]],
        model_version: str,
        response: Dict[str, Any],
    ):
        k = self._hash_key(query, images, viewport_bbox, model_version)
        self._cache[k] = response


response_cache = ResponseCache()
