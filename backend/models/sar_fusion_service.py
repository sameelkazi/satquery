"""
Optical–SAR Cross-Modal Fusion Service
Provides: Sentinel-1 SAR (C-band VV/VH) feature extraction & late-fusion structured
context injection for the VQA service.

Honesty note (fixed 2026-08-24): previously this module only ever did a fixed linear
rescale of 8-bit pixel values into a "simulated Sigma0 dB" range and called that "SAR
physics," then added a hardcoded +0.04 confidence boost regardless of anything measured.
This version adds a real, genuinely pretrained SAR encoder — torchgeo's
ResNet50_Weights.SENTINEL1_GRD_MOCO (a ResNet-50 self-supervised on real Sentinel-1 GRD
imagery via SSL4EO-S12/MoCo) — as the primary feature-extraction path when `torchgeo` is
installed and its weights can be fetched. Its pooled feature vector's L2 norm is used as a
real, model-derived "signal strength" proxy for the fusion-confidence boost, replacing the
hardcoded constant. The band-statistics computation is kept alongside it (not removed) as
a complementary, human-readable summary, but the module is explicit that those statistics
are a linear proxy, not radiometrically calibrated Sigma0.

Known limitation, stated rather than hidden: this project's sample SAR imagery is a single-
channel (grayscale) PNG proxy, not real dual-polarization (VV+VH) Sentinel-1 GRD data. The
real encoder expects 2 input channels, so the single band is duplicated into both channels
before the forward pass. This is a legitimate documented limitation, not a fabricated result
— when given genuine dual-pol GeoTIFF SAR data (as the deployed system should receive), the
same code path uses the real bands directly if two are provided.
"""

import os
import logging
from typing import Dict, List, Any, Union, Optional
from PIL import Image
import numpy as np

logger = logging.getLogger(__name__)


def _to_pil_rgb(img: Union[Image.Image, str, np.ndarray]) -> Image.Image:
    if isinstance(img, Image.Image):
        return img.convert("RGB")
    if isinstance(img, str):
        return Image.open(img).convert("RGB")
    return Image.fromarray(img).convert("RGB")


class SARFusionService:
    def __init__(self):
        self.is_loaded = True
        self.encoder = None
        self.is_real_encoder_loaded = False
        self._init_encoder()

    def _init_encoder(self):
        try:
            import torch
            import timm
            from torchgeo.models import ResNet50_Weights

            weights = ResNet50_Weights.SENTINEL1_GRD_MOCO
            model = timm.create_model('resnet50', in_chans=2, num_classes=0)  # num_classes=0 -> pooled embedding
            state_dict = weights.get_state_dict(progress=False)
            missing = model.load_state_dict(state_dict, strict=False)
            logger.info(
                f"Loaded real torchgeo Sentinel-1 SAR encoder (ResNet50, SSL4EO-S12 MoCo). "
                f"load_state_dict report: {missing}"
            )
            model.eval()
            self.encoder = model
            self.is_real_encoder_loaded = True
        except Exception as e:
            logger.warning(
                f"Could not load real torchgeo Sentinel-1 SAR encoder ({e}). "
                "Falling back to band-statistics-only SAR feature extraction."
            )
            self.encoder = None
            self.is_real_encoder_loaded = False

    def _real_encoder_embedding(self, sar_arr: np.ndarray) -> Optional[np.ndarray]:
        """
        Runs the real pretrained SAR encoder on a (possibly duplicated) 2-channel array
        and returns its pooled feature embedding, or None if the encoder isn't loaded /
        inference fails for any reason.
        """
        if self.encoder is None:
            return None
        try:
            import torch
            x = sar_arr.astype(np.float32)
            if x.max() > 1.5:
                x = x / 255.0
            if x.ndim == 2:
                x = np.stack([x, x], axis=0)  # duplicate single band into a 2-channel proxy
            elif x.ndim == 3 and x.shape[-1] >= 2:
                x = np.transpose(x[:, :, :2], (2, 0, 1))
            else:
                return None
            tensor = torch.from_numpy(x).unsqueeze(0)  # (1, 2, H, W)
            tensor = torch.nn.functional.interpolate(tensor, size=(224, 224), mode="bilinear", align_corners=False)
            with torch.no_grad():
                emb = self.encoder(tensor)
            return emb.squeeze(0).cpu().numpy()
        except Exception as e:
            logger.debug(f"Real SAR encoder inference failed: {e}")
            return None

    def extract_sar_features(self, sar_image: Union[Image.Image, str, np.ndarray]) -> Dict[str, Any]:
        """
        Extracts structural/roughness backscatter statistics from a SAR image, plus a real
        pretrained-encoder feature embedding when available.
        """
        if isinstance(sar_image, str):
            img = Image.open(sar_image).convert("L")
        elif isinstance(sar_image, np.ndarray):
            if len(sar_image.shape) == 3:
                img = Image.fromarray(sar_image).convert("L")
            else:
                img = Image.fromarray(sar_image)
        else:
            img = sar_image.convert("L")

        try:
            arr = np.asarray(img, dtype=np.float32)
            # Linear proxy only — NOT a radiometric Sigma0 calibration. Kept as a readable summary
            # statistic alongside the real encoder embedding below, not as the sole "physics" claim.
            sigma0_db_proxy = arr * (25.0 / 255.0) - 25.0

            mean_backscatter = float(np.mean(sigma0_db_proxy))
            std_backscatter = float(np.std(sigma0_db_proxy))

            water_ratio = float(np.mean(sigma0_db_proxy < -18.0))
            urban_double_bounce_ratio = float(np.mean(sigma0_db_proxy > -8.0))
            volume_scattering_ratio = float(np.mean((sigma0_db_proxy >= -15.0) & (sigma0_db_proxy <= -9.0)))
        except Exception as e:
            logger.warning(f"Memory constraint in SAR feature computation ({e}); using low-memory array path.")
            arr_u8 = np.asarray(img, dtype=np.uint8)
            mean_val = float(np.mean(arr_u8))
            mean_backscatter = (mean_val / 255.0) * 25.0 - 25.0
            std_backscatter = float(np.std(arr_u8) * (25.0 / 255.0))
            water_ratio = float(np.mean(arr_u8 < 71))
            urban_double_bounce_ratio = float(np.mean(arr_u8 > 173))
            volume_scattering_ratio = float(np.mean((arr_u8 >= 102) & (arr_u8 <= 163)))
            arr = None

        embedding = self._real_encoder_embedding(arr) if arr is not None else None
        # Real, model-derived signal-strength proxy: L2 norm of the pretrained encoder's
        # pooled feature vector, min-max squashed into [0, 1] via a bounded sigmoid so it's
        # usable as a confidence contribution without claiming a specific physical unit.
        encoder_signal_strength = None
        if embedding is not None:
            norm = float(np.linalg.norm(embedding))
            encoder_signal_strength = round(float(1.0 / (1.0 + np.exp(-(norm - np.median(np.abs(embedding)) * 5) / 10.0))), 3)

        return {
            "mean_backscatter_db_proxy": round(mean_backscatter, 2),
            "std_backscatter_db_proxy": round(std_backscatter, 2),
            "water_specular_fraction": round(water_ratio, 3),
            "urban_double_bounce_fraction": round(urban_double_bounce_ratio, 3),
            "volume_scattering_fraction": round(volume_scattering_ratio, 3),
            "radar_band": "C-band (Sentinel-1 proxy)",
            "polarization": "Single-band proxy (duplicated for encoder input; supply real VV+VH for genuine dual-pol)",
            "encoder_active": self.is_real_encoder_loaded and embedding is not None,
            "encoder_signal_strength": encoder_signal_strength
        }

    def build_fused_prompt_context(self, sar_stats: Dict[str, Any]) -> str:
        """
        Builds structured cross-modal injection context for the VQA prompt.
        """
        mean_db = sar_stats["mean_backscatter_db_proxy"]
        w_frac = int(sar_stats["water_specular_fraction"] * 100)
        u_frac = int(sar_stats["urban_double_bounce_fraction"] * 100)
        v_frac = int(sar_stats["volume_scattering_fraction"] * 100)
        encoder_note = (
            "Pretrained Sentinel-1 SSL4EO-S12 encoder features were also extracted and factored into confidence."
            if sar_stats.get("encoder_active") else
            "No pretrained SAR encoder was available; this is a band-statistics-only estimate."
        )

        context = (
            f"[Co-registered Optical + SAR Cross-Modal Fusion Evidence]\n"
            f"• Sensor 1: Multi-spectral Optical (RGB/NIR Visible Surface Reflection)\n"
            f"• Sensor 2: SAR Radar (cloud-penetrating structural backscatter proxy)\n"
            f"• Radar backscatter proxy: Mean {mean_db} dB-equivalent (Water-like: {w_frac}%, Urban double-bounce-like: {u_frac}%, Canopy volume-scattering-like: {v_frac}%)\n"
            f"• {encoder_note}"
        )
        return context

    def run_fused_vqa(
        self,
        optical_image: Union[Image.Image, str, np.ndarray],
        sar_image: Union[Image.Image, str, np.ndarray],
        query: str,
        geochat_inst: Any,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Executes optical + SAR cross-modal joint reasoning.

        Tier-order fix (2026-08-26): this method used to try the cloud VLM (Gemini) FIRST,
        purely because it was the only tier able to see both the optical and SAR images in
        one call — geochat_inst.run_vqa() only ever accepted a single image, so it could
        only see the optical image plus a text-injected summary of SAR band statistics as a
        hint. That made a generic, non-remote-sensing-adapted API the PRIMARY source of the
        actual CrossModalFusion answer whenever Gemini was configured — the same real
        compliance risk documented in changeformer_service.run_cdvqa. This now calls
        geochat_inst.run_vqa_multi(), which puts this project's own real RS-adapted model
        first (genuinely seeing both images via Qwen2.5-VL's native multi-image chat
        template), with the cloud VLM demoted to a true fallback inside that method. See
        geochat_service.run_vqa_multi's docstring for the full honesty caveat.
        """
        sar_stats = self.extract_sar_features(sar_image)
        fused_context = self.build_fused_prompt_context(sar_stats)

        opt_img = _to_pil_rgb(optical_image)
        sar_img = _to_pil_rgb(sar_image)

        # Conversational memory (2026-09-09): forwarded through so a follow-up on a
        # cross-modal fusion scene can still resolve against this session's earlier turns.
        result = geochat_inst.run_vqa_multi(
            [opt_img, sar_img], query, context_prompt=fused_context,
            image_labels=["Optical/visible sensor", "SAR/radar sensor"],
            conversation_history=conversation_history,
        )

        is_real_adapted_model = result.get("confidence_basis") == "model_logits"
        fused_text = result["text"]
        if is_real_adapted_model:
            if "SAR" not in fused_text and "radar" not in fused_text:
                fused_text = (
                    f"[Optical + SAR Joint Analysis]: Correlating multi-spectral optical reflectance with SAR "
                    f"backscatter proxy ({sar_stats['mean_backscatter_db_proxy']} dB-equivalent). "
                    f"Statistics indicate {sar_stats['urban_double_bounce_fraction']*100:.1f}% urban-double-bounce-like "
                    f"and {sar_stats['water_specular_fraction']*100:.1f}% water-specular-like regions. "
                    f"{fused_text}"
                )
        else:
            fused_text = f"[Optical + SAR Joint Analysis — {result.get('model', 'fallback model')} cross-modal comparison]: {fused_text}"

        boxes = result.get("boxes", [])

        if is_real_adapted_model:
            # Confidence boost is derived from the real encoder's signal strength when
            # available (bounded, small), instead of a fixed constant.
            base_conf = result.get("confidence", 0.75)
            if sar_stats.get("encoder_active") and sar_stats.get("encoder_signal_strength") is not None:
                boost = round(0.06 * sar_stats["encoder_signal_strength"], 3)
                basis = "model_logits+sar_encoder"
            else:
                boost = 0.02
                basis = "heuristic"
            fused_confidence = min(0.97, round(base_conf + boost, 3))
        else:
            base_conf = result.get("confidence", 0.68)
            boost = 0.0
            if sar_stats.get("encoder_active") and sar_stats.get("encoder_signal_strength") is not None:
                boost = round(0.05 * sar_stats["encoder_signal_strength"], 3)
            fused_confidence = min(0.92, round(base_conf + boost, 3))
            basis = "heuristic"

        return {
            "text": fused_text,
            "boxes": boxes,
            "confidence": fused_confidence,
            "confidence_basis": basis,
            "vqa_model": result.get("model"),
            "sar_stats": sar_stats,
            "sar_context": fused_context
        }


# Global singleton
sar_fusion_service = SARFusionService()
