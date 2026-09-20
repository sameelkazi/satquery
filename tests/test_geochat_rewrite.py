"""
Targeted verification for the geochat_service.py rewrite — run inside the project's own
Python environment (device_bash), with GROQ_API_KEY forced empty for this process only
(not touching .env) so it exercises the deterministic fallback path fast instead of
waiting out real network timeouts to Groq (this device_bash bridge has restricted egress
to Groq, confirmed earlier in this session — unrelated to correctness, just slow to
fail-open on every attempt).
"""
import os
import sys

os.environ["GROQ_API_KEY"] = ""
os.environ.pop("REMOTE_INFERENCE_URL", None)
os.environ.pop("COLAB_INFERENCE_URL", None)

sys.path.insert(0, os.getcwd())

from backend.models.geochat_service import GeoChatService
from PIL import Image

failures = []

def check(label, cond):
    status = "PASS" if cond else "FAIL"
    print(f"[{status}] {label}")
    if not cond:
        failures.append(label)

# Fresh instance so init-time behavior is observed cleanly (the module-level singleton
# already initialized once at import time above).
svc = GeoChatService()

check("model_id defaults to Qwen2-VL, not GeoChat-7B", svc.model_id == "Qwen/Qwen2-VL-2B-Instruct")
check("is_real_model_loaded starts False (no premature True at init)", svc.is_real_model_loaded is False)
check("adapter_active starts False", svc.adapter_active is False)
check("remote_url is empty when neither env var is set", not svc.remote_url)

# A tiny synthetic image (no real GPU/tunnel/Groq available in this env) exercises the
# last-resort deterministic template path.
img = Image.new("RGB", (64, 64), color=(30, 120, 60))
result = svc.run_vqa(img, "locate buildings in this image")

check("run_vqa returns a dict with all required keys", all(k in result for k in ("text", "boxes", "confidence", "confidence_basis", "model", "adapter_active", "quantization")))
check("confidence_basis is 'heuristic' (no real model/tunnel/Groq available)", result["confidence_basis"] == "heuristic")
check("model label does not claim GeoChat-7B", "GeoChat" not in result["model"] and "geochat-7B" not in result["model"].lower())
check("model label mentions the real base model id (Qwen2-VL)", "Qwen2-VL" in result["model"])
check("is_real_model_loaded still False after a fallback-only call (no real inference happened)", svc.is_real_model_loaded is False)
check("adapter_active still False (no adapter loaded)", svc.adapter_active is False)
check("boxes list is present (from pixel heuristic since query mentions buildings)", isinstance(result["boxes"], list) and len(result["boxes"]) > 0)

# Env var rename check: REMOTE_INFERENCE_URL should take priority, COLAB_INFERENCE_URL
# should still work as a fallback.
os.environ["COLAB_INFERENCE_URL"] = "http://legacy-example:1234"
svc2 = GeoChatService()
check("legacy COLAB_INFERENCE_URL is still read as a fallback", svc2.remote_url == "http://legacy-example:1234")
os.environ["REMOTE_INFERENCE_URL"] = "http://new-example:5678"
svc3 = GeoChatService()
check("REMOTE_INFERENCE_URL takes priority over legacy COLAB_INFERENCE_URL when both are set", svc3.remote_url == "http://new-example:5678")
os.environ.pop("REMOTE_INFERENCE_URL", None)
os.environ.pop("COLAB_INFERENCE_URL", None)

print()
if failures:
    print(f"{len(failures)} FAILURE(S): {failures}")
    sys.exit(1)
else:
    print("ALL CHECKS PASSED")
