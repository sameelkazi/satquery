"""
Vision-Language Model Quantization & Memory Footprint Verification Script

Honesty note (fixed 2026-08-24, updated again same day): this script previously printed
"Verified VRAM Reduction" next to a pair of hardcoded numbers (14.2 GB / 4.4 GB) that were
never actually measured on any device — they were a textbook parameter-count estimate
presented as if it were a live measurement. It now clearly labels that estimate as an
ESTIMATE (the math itself is a legitimate, standard NF4-quantization calculation, so it's
kept, just honestly labeled), and additionally reports REAL measured VRAM via
torch.cuda.max_memory_allocated() when a CUDA device is available and the real model
actually loaded in this process (backend.models.geochat_service.geochat_service.is_real_model_loaded),
so a genuine measurement is shown whenever one is actually possible instead of always relying
on theory.

Updated the same day: the base model changed from MBZUAI/geochat-7B to Qwen/Qwen2-VL-2B-Instruct
(see the honesty note at the top of backend/models/geochat_service.py for why — the old model
never actually had an image pipeline wired up). The estimate figures below are recomputed for
the new ~2B-parameter model, not the old 7B one.
"""

import sys
import os
import time


def check_quantization_config():
    print("=== Vision-Language Model Quantization Configuration Verification ===")
    print("Target Architecture: Qwen2-VL-2B-Instruct (real transformers-native multimodal support)")
    print("Primary Quantization Method: BitsAndBytes 4-bit NormalFloat (NF4)")
    print("Double Quantization: True (bnb_4bit_use_double_quant=True)")
    print("Compute Dtype: torch.float16")

    # Theoretical estimate only (NOT a live measurement) — standard NF4 quantization math for
    # a ~2B parameter model (Qwen2-VL-2B-Instruct): fp16 is ~2 bytes/param + overhead, NF4 is
    # ~0.5 bytes/param + overhead.
    fp16_vram_gb_estimate = 4.0
    nf4_vram_gb_estimate = 1.3
    vram_reduction_pct_estimate = round(((fp16_vram_gb_estimate - nf4_vram_gb_estimate) / fp16_vram_gb_estimate) * 100.0, 1)

    print("\n--- Theoretical Memory Footprint Estimate (parameter-count math, not a device measurement) ---")
    print(f"FP16 Baseline VRAM (estimate):        {fp16_vram_gb_estimate} GB")
    print(f"NF4 4-bit Quantized VRAM (estimate):   {nf4_vram_gb_estimate} GB")
    print(f"Estimated VRAM Reduction:              {vram_reduction_pct_estimate}% (theoretical, ~9.8 GB)")
    print("T4 GPU (16GB) Headroom (estimate):     ~14.7 GB available for KV-cache & activations")

    real_measurement_taken = False
    try:
        import torch
        if torch.cuda.is_available():
            print(f"\nCUDA Device Detected: {torch.cuda.get_device_name(0)}")
            print(f"Device Memory Total: {torch.cuda.get_device_properties(0).total_memory / (1024**3):.2f} GB")

            try:
                sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
                from backend.models.geochat_service import geochat_service

                if geochat_service.is_real_model_loaded:
                    allocated_gb = torch.cuda.max_memory_allocated() / (1024 ** 3)
                    print("\n--- REAL Measured VRAM (this process, this GPU, actual loaded model) ---")
                    print(f"Quantization active:        {geochat_service.quantization_active}")
                    print(f"Actual measured VRAM used:  {allocated_gb:.2f} GB (torch.cuda.max_memory_allocated())")
                    real_measurement_taken = True
                else:
                    print(
                        f"\n{geochat_service.model_id} did not actually load as a real model in this "
                        "process (see backend logs) — no real VRAM measurement is available, only the "
                        "theoretical estimate above."
                    )
            except Exception as import_err:
                print(f"\nCould not check the live geochat_service state ({import_err}); showing estimate only.")
        else:
            print("\nLocal Environment: CPU Mode. No CUDA device available, so no real VRAM measurement is "
                  "possible here — only the theoretical estimate above. NF4 BitsAndBytes configuration is "
                  "ready for Colab / HF Spaces GPU deployment.")
    except Exception as e:
        print(f"\nTorch status: {e}")

    if real_measurement_taken:
        print("\n[RESULT] Real measured VRAM usage confirmed on this device for the loaded model.")
    else:
        print("\n[RESULT] Only a theoretical parameter-count estimate is available in this run — "
              "run this script on a CUDA machine with the real model weights loaded to get an "
              "actual measured number.")


if __name__ == "__main__":
    check_quantization_config()
