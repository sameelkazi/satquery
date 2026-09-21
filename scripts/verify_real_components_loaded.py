"""
scripts/verify_real_components_loaded.py

Cheap diagnostic (status flags + one real call per component, no benchmark queries) to
check whether the two off-the-shelf pretrained models this project already wires in for
Change Detection and Optical-SAR Fusion are ACTUALLY loading successfully in THIS
environment, or silently falling back to their honestly-labeled heuristic substitutes.

Both are real, genuinely pretrained models already present in the code:
  - backend/models/changeformer_service.py loads deepang/adaptformer-LEVIR-CD (a real
    AdaptFormer architecture, ~12.5M params, trained on LEVIR-CD, loaded via
    transformers' AutoImageProcessor/AutoModel with trust_remote_code=True).
  - backend/models/sar_fusion_service.py loads torchgeo's Sentinel-1 SSL4EO-S12 MoCo
    ResNet50 encoder (self-supervised on real Sentinel-1 GRD imagery).

Neither fact is visible anywhere in scripts/build_benchmark.py's output today -- this
script exists to get a real, current answer on whether they're actually active in this
specific environment (network access to Hugging Face, correct package versions, etc.),
rather than assuming from the code alone.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from backend.models.changeformer_service import changeformer_service  # noqa: E402
from backend.models.sar_fusion_service import sar_fusion_service  # noqa: E402


def main():
    print("=== Change Detection: deepang/adaptformer-LEVIR-CD ===")
    print(f"is_real_model_loaded = {changeformer_service.is_real_model_loaded}")
    if changeformer_service.is_real_model_loaded:
        print("Real trained weights loaded successfully. detect_change() uses a genuine "
              "neural forward pass as its primary path (pixel-difference is the fallback only).")
    else:
        print("NOT loaded -- detect_change() is currently using the pixel-difference "
              "fallback for EVERY call. That is honestly labeled in its own output "
              "(model=\"Spectral pixel-difference fallback...\"), but it is not a trained "
              "model. Check this script's own startup log above (printed by "
              "changeformer_service's _init_model) for the real reason: no network access "
              "to Hugging Face, a missing/incompatible `transformers` version, or a genuine "
              "loading error.")

    print("\n=== Optical-SAR Fusion: torchgeo Sentinel-1 SSL4EO-S12 MoCo encoder ===")
    print(f"is_real_encoder_loaded = {sar_fusion_service.is_real_encoder_loaded}")
    if sar_fusion_service.is_real_encoder_loaded:
        print("Real pretrained SAR encoder loaded successfully. extract_sar_features() "
              "includes a genuine model-derived signal-strength term (encoder_active=True).")
    else:
        print("NOT loaded -- extract_sar_features() is currently band-statistics-only "
              "(encoder_active will read False on every call). Check this script's own "
              "startup log above (printed by sar_fusion_service's _init_encoder) for the "
              "real reason: missing `torchgeo`/`timm`, no network access, or a genuine "
              "loading error.")

    print("\n=== Running one real call through each component to confirm end-to-end ===")
    dummy = Image.fromarray((np.random.rand(256, 256, 3) * 255).astype(np.uint8))
    change_res = changeformer_service.detect_change(dummy, dummy)
    print(f"detect_change() model field         = {change_res.get('model')}")
    print(f"detect_change() confidence_basis    = {change_res.get('confidence_basis')}")

    sar_stats = sar_fusion_service.extract_sar_features(dummy.convert("L"))
    print(f"extract_sar_features() encoder_active = {sar_stats.get('encoder_active')}")

    print("\n=== VERDICT ===")
    cd_real = changeformer_service.is_real_model_loaded
    sar_real = sar_fusion_service.is_real_encoder_loaded
    if cd_real and sar_real:
        print("Both components are genuinely loaded in this environment. The report's "
              "'architecturally inspired, not necessarily loaded' ambiguity does not apply "
              "here -- both are real, pretrained, currently active.")
    else:
        missing = []
        if not cd_real:
            missing.append("Change Detection (AdaptFormer-LEVIR-CD)")
        if not sar_real:
            missing.append("SAR encoder (torchgeo SSL4EO-S12)")
        print(f"NOT fully active: {', '.join(missing)} is currently on its heuristic "
              f"fallback in this environment. Fix the root cause logged above, then re-run "
              f"this script to confirm before claiming either as active in the report.")


if __name__ == "__main__":
    main()
