"""
RAG Vector Store Module for SatQuery AI
Stores real RemoteCLIP text embeddings of curated Indian district and Bhuvan LULC metadata
to reduce hallucinations, with a deterministic hashed-vector fallback when RemoteCLIP's
real weights aren't loaded (matches RemoteCLIPService.get_text_embedding's own fallback,
so behavior is consistent whichever path is active).
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
import numpy as np

logger = logging.getLogger(__name__)

KB_PATH = os.path.join(os.path.dirname(__file__), "knowledge_base.json")

# Region-scoping fix (2026-08-26): real bug, caught from a live query. A generic query like
# "Describe the land-cover and major objects" on the Hyderabad AOI retrieved the KB's
# "Kamrup Metropolitan / Brahmaputra Basin, Assam" entry (pure text-similarity match on
# generic water/land-cover language, with zero awareness of which AOI was actually being
# viewed) — a real district's real facts about a completely different part of India got
# injected into the prompt and the downstream model presented them as if describing the
# image on screen. The KB does have a correct "Hyderabad District, Telangana" entry sitting
# right next to the wrong one; retrieval just had no way to prefer it.
# Maps a substring found in the request's image filename to the KB entity name it identifies
# — sample AOI filenames only, since custom-uploaded images have no known region (handled by
# returning None below, which excludes ALL region-specific entries rather than guessing).
REGION_HINTS = [
    ("hyderabad", "Hyderabad District, Telangana"),
    ("brahmaputra", "Kamrup Metropolitan / Brahmaputra Basin, Assam"),
    ("punjab", "Ludhiana District, Punjab"),
]
REGION_SPECIFIC_CATEGORY = "Indian Administrative Geography"


def _infer_region_entity(image_path: Optional[str]) -> Optional[str]:
    if not image_path:
        return None
    p = image_path.lower()
    for keyword, entity in REGION_HINTS:
        if keyword in p:
            return entity
    return None


class RAGVectorStore:
    def __init__(self, kb_path: str = KB_PATH):
        self.kb_path = kb_path
        self.entries: List[Dict[str, Any]] = []
        self.embeddings: Optional[np.ndarray] = None
        self._load_knowledge_base()

    def _embed(self, text: str) -> np.ndarray:
        """
        Delegates to RemoteCLIPService so there is exactly one embedding implementation
        in the codebase. Imported lazily to avoid a circular import at module load time
        (models/remoteclip_service.py doesn't depend on rag/, but keeping the import local
        also means a RemoteCLIP load failure here can't break module import order).
        """
        from ..models.remoteclip_service import remoteclip_service
        return remoteclip_service.get_text_embedding(text)

    def _load_knowledge_base(self):
        if not os.path.exists(self.kb_path):
            logger.warning(f"Knowledge base not found at {self.kb_path}")
            return

        with open(self.kb_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            self.entries = data.get("curated_knowledge_entries", [])

        vectors = []
        for e in self.entries:
            text = f"{e.get('category', '')} {e.get('entity', '')} {e.get('description', '')} {e.get('spectral_characteristics', '')}"
            vectors.append(self._embed(text))

        if vectors:
            self.embeddings = np.array(vectors, dtype=np.float32)
            from ..models.remoteclip_service import remoteclip_service
            source = "real RemoteCLIP text embeddings" if remoteclip_service.is_real_model_loaded else "hashed bag-of-words fallback vectors"
            logger.info(f"Loaded and indexed {len(self.entries)} curated RAG knowledge entries using {source}.")

    def retrieve_relevant_context(self, query: str, top_k: int = 2,
                                   region_entity: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Retrieves top-k relevant knowledge base entries via cosine similarity.

        region_entity: when given, entries in the region-specific category
        (REGION_SPECIFIC_CATEGORY) are excluded from the candidate pool UNLESS their entity
        matches region_entity exactly. When None (no known region for this image — including
        any custom-uploaded image outside the sample AOIs), ALL region-specific entries are
        excluded rather than guessing which one might apply. This is what actually prevents
        a different district's real facts from being retrieved for the wrong image — see the
        module-level comment above REGION_HINTS for the real case that motivated this.
        Generic (non-region) entries, like the Bhuvan LULC legend definitions, are always
        eligible regardless of region, since they aren't location claims.
        """
        if not self.entries or self.embeddings is None:
            return []

        candidate_indices = [
            i for i, e in enumerate(self.entries)
            if e.get("category") != REGION_SPECIFIC_CATEGORY or e.get("entity") == region_entity
        ]
        if not candidate_indices:
            return []

        q_vec = self._embed(query)
        candidate_sims = [(i, float(self.embeddings[i] @ q_vec)) for i in candidate_indices]
        candidate_sims.sort(key=lambda pair: pair[1], reverse=True)

        results = []
        for idx, score in candidate_sims[:top_k]:
            if score > 0.05:
                results.append({
                    "entry": self.entries[idx],
                    "similarity_score": round(score, 3)
                })

        return results

    def build_rag_prompt_prefix(self, query: str, image_path: Optional[str] = None) -> Optional[str]:
        """
        Generates structured grounding context to inject into the VQA prompt, scoped to the
        actual image being queried (see retrieve_relevant_context's region_entity docs).
        """
        region_entity = _infer_region_entity(image_path)
        hits = self.retrieve_relevant_context(query, top_k=2, region_entity=region_entity)
        if not hits:
            return None

        # Explicit framing (2026-08-26, same fix): this text is background reference, not a
        # description of the image — said outright so a model reading this prompt (especially
        # a text-only fallback that never sees the actual pixels) can't present it as if it
        # were. This is a defense-in-depth measure alongside the region-scoping above, not a
        # substitute for it — region-scoping is what stops the WRONG district's facts from
        # being retrieved at all; this framing is what stops even a CORRECTLY-retrieved
        # generic definition from being mistaken for "what's in this specific image."
        lines = [
            "[Reference knowledge only — general definitions and/or facts that MAY be "
            "relevant background for this region. This is NOT a description of the actual "
            "image below; base your answer on what is genuinely visible in the image itself, "
            "and only use the reference material as supporting context if it's actually "
            "consistent with what you observe.]"
        ]
        for h in hits:
            e = h["entry"]
            lines.append(f"• {e['entity']} ({e.get('code', '')}): {e.get('description', '')}")
            if "spectral_characteristics" in e:
                lines.append(f"  Spectral signature: {e['spectral_characteristics']}")

        return "\n".join(lines)


# Global singleton
rag_store = RAGVectorStore()
