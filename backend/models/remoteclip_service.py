"""
RemoteCLIP Model Service Wrapper
Model: ChenDelong1999/RemoteCLIP (ViT-L/14)
Provides: Zero-shot scene tagging, real image embeddings, and real text embeddings
(used by the RAG vector store) for remote-sensing vision-language retrieval.
"""

import os
import logging
from typing import Dict, List, Any, Union, Optional
from PIL import Image
import numpy as np

logger = logging.getLogger(__name__)

DEFAULT_RS_LABELS = [
    "urban and built-up area",
    "agricultural land and crops",
    "water body and river",
    "dense forest canopy",
    "barren land and rock",
    "industrial zone",
    "transportation infrastructure",
    "wetland and marshland",
    "coastal zone",
    "cloud and shadow"
]


class RemoteCLIPService:
    def __init__(self, model_name: str = "ChenDelong1999/RemoteCLIP"):
        self.model_name = model_name
        self.model = None
        self.preprocess = None
        self.tokenizer = None
        self.is_loaded = False
        self.is_real_model_loaded = False  # True only if real RemoteCLIP weights are in self.model
        self._init_model()

    def _init_model(self):
        try:
            import torch
            import open_clip
            from huggingface_hub import hf_hub_download

            logger.info("Loading RemoteCLIP (ViT-L-14) foundation model...")
            self.model, _, self.preprocess = open_clip.create_model_and_transforms('ViT-L-14')

            ckpt_path = hf_hub_download(repo_id="chendelong/RemoteCLIP", filename="RemoteCLIP-ViT-L-14.pt")
            ckpt = torch.load(ckpt_path, map_location="cpu")
            self.model.load_state_dict(ckpt)
            logger.info(f"Loaded real RemoteCLIP neural checkpoint from {ckpt_path}")

            self.tokenizer = open_clip.get_tokenizer('ViT-L-14')
            if torch.cuda.is_available():
                self.model = self.model.cuda().eval()
            else:
                self.model = self.model.cpu().eval()
            self.is_loaded = True
            self.is_real_model_loaded = True
            logger.info("RemoteCLIP ViT-L-14 active and ready for neural inference.")
        except Exception as e:
            logger.warning(f"RemoteCLIP could not load real weights ({e}); using non-neural spectral-heuristic fallback.")
            self.model = None
            self.preprocess = None
            self.tokenizer = None
            self.is_real_model_loaded = False
            self.is_loaded = True

    def get_image_embedding(self, image: Union[Image.Image, str, np.ndarray]) -> np.ndarray:
        """
        Extracts a normalized image embedding. Real 768-dim RemoteCLIP embedding when the
        model is loaded; otherwise a deterministic (but explicitly non-neural) fallback
        vector derived from image color/texture statistics, sized to match so downstream
        cosine-similarity code keeps working.
        """
        if isinstance(image, str):
            image = Image.open(image).convert("RGB")
        elif isinstance(image, np.ndarray):
            image = Image.fromarray(image).convert("RGB")

        if self.model is not None and self.preprocess is not None:
            try:
                import torch
                device = next(self.model.parameters()).device
                img_tensor = self.preprocess(image).unsqueeze(0).to(device)
                with torch.no_grad():
                    img_features = self.model.encode_image(img_tensor)
                    img_features /= img_features.norm(dim=-1, keepdim=True)
                return img_features.cpu().numpy().flatten()
            except Exception as e:
                logger.debug(f"Native embedding error: {e}")

        # Fallback: deterministic vector from real color/texture moments (not a CLIP embedding).
        img_thumb = image.resize((64, 64))
        arr = np.array(img_thumb, dtype=np.float32) / 255.0
        r_mean, g_mean, b_mean = arr[:, :, 0].mean(), arr[:, :, 1].mean(), arr[:, :, 2].mean()

        seed = int((r_mean * 1000 + g_mean * 100 + b_mean * 10) * 100) % 65535
        rng = np.random.RandomState(seed)
        vec = rng.randn(768).astype(np.float32)
        vec[0] = g_mean - r_mean  # NDVI proxy
        vec[1] = b_mean - r_mean  # NDWI proxy
        vec[2] = (r_mean + g_mean + b_mean) / 3.0  # Albedo
        vec /= np.linalg.norm(vec)
        return vec

    def get_text_embedding(self, text: str) -> np.ndarray:
        """
        Real CLIP text-tower embedding (used by the RAG vector store to index/query the
        knowledge base against genuine RemoteCLIP semantics, instead of a hash-based
        bag-of-words vector). Falls back to a deterministic hashed vector of the same
        dimensionality only when the real model isn't loaded, so callers never need to
        special-case dimensionality.
        """
        if self.model is not None and self.tokenizer is not None:
            try:
                import torch
                device = next(self.model.parameters()).device
                tokens = self.tokenizer([text]).to(device)
                with torch.no_grad():
                    text_features = self.model.encode_text(tokens)
                    text_features /= text_features.norm(dim=-1, keepdim=True)
                return text_features.cpu().numpy().flatten()
            except Exception as e:
                logger.debug(f"Native text embedding error: {e}")

        # Non-neural fallback: same hashed bag-of-words scheme the RAG store used to use
        # inline, kept here so there is exactly one embedding implementation to reason about.
        dim = 768
        vec = np.zeros(dim, dtype=np.float32)
        for w in text.lower().split():
            h = abs(hash(w)) % dim
            vec[h] += 1.0
        norm = np.linalg.norm(vec)
        return vec / (norm + 1e-7)

    def zero_shot_tag(
        self,
        image: Union[Image.Image, str, np.ndarray],
        labels: Optional[List[str]] = None,
        top_k: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Calculates zero-shot probabilities across remote sensing land-cover categories.
        """
        candidate_labels = labels or DEFAULT_RS_LABELS

        if isinstance(image, str):
            image = Image.open(image).convert("RGB")
        elif isinstance(image, np.ndarray):
            image = Image.fromarray(image).convert("RGB")

        if self.model is not None and self.tokenizer is not None and self.preprocess is not None:
            try:
                import torch
                device = next(self.model.parameters()).device
                img_tensor = self.preprocess(image).unsqueeze(0).to(device)
                text_tokens = self.tokenizer([f"satellite image of {l}" for l in candidate_labels]).to(device)

                with torch.no_grad():
                    img_features = self.model.encode_image(img_tensor)
                    text_features = self.model.encode_text(text_tokens)

                    img_features /= img_features.norm(dim=-1, keepdim=True)
                    text_features /= text_features.norm(dim=-1, keepdim=True)

                    similarity = (100.0 * img_features @ text_features.T).softmax(dim=-1)
                    scores = similarity[0].cpu().numpy()

                results = [
                    {"label": candidate_labels[i], "score": round(float(scores[i]), 4)}
                    for i in range(len(candidate_labels))
                ]
                results.sort(key=lambda x: x["score"], reverse=True)
                return results[:top_k]
            except Exception as e:
                logger.warning(f"Native RemoteCLIP zero-shot inference failed ({e}), using spectral heuristics.")

        # Non-neural fallback for zero-shot tagging.
        img_arr = np.array(image.resize((128, 128)), dtype=np.float32) / 255.0
        r, g, b = img_arr[:, :, 0], img_arr[:, :, 1], img_arr[:, :, 2]

        ndvi_proxy = (g.mean() - r.mean()) / (g.mean() + r.mean() + 1e-5)
        ndwi_proxy = (b.mean() - (r.mean() + g.mean()) / 2.0)
        brightness = (r.mean() + g.mean() + b.mean()) / 3.0
        variance = img_arr.var()

        scores = {}
        for l in candidate_labels:
            score = 0.05
            l_lower = l.lower()
            if "water" in l_lower and (ndwi_proxy > 0.05 or (b.mean() > g.mean() and b.mean() > r.mean())):
                score = 0.72 + min(0.25, abs(ndwi_proxy) * 2)
            elif "crop" in l_lower or "agri" in l_lower:
                score = 0.65 + max(0.0, ndvi_proxy * 1.5)
            elif "forest" in l_lower and ndvi_proxy > 0.1:
                score = 0.75 + max(0.0, ndvi_proxy * 1.2)
            elif "urban" in l_lower or "built-up" in l_lower:
                score = 0.60 + min(0.35, variance * 8.0)
            elif "barren" in l_lower and brightness > 0.5:
                score = 0.55 + brightness * 0.3
            elif "industrial" in l_lower:
                score = 0.40 + variance * 5.0
            scores[l] = score

        total = sum(scores.values())
        norm_results = [
            {"label": k, "score": round(float(v / total), 4)}
            for k, v in scores.items()
        ]
        norm_results.sort(key=lambda x: x["score"], reverse=True)
        return norm_results[:top_k]


# Global singleton
remoteclip_service = RemoteCLIPService()
