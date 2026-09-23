"""
Quick sanity check for kaggle_inference_server.ipynb's new /vqa_multi endpoint —
run this BEFORE the full scripts/build_benchmark.py, so a broken/untested endpoint
fails fast on one request instead of burning GPU quota partway through 12 tasks.

Usage:
    python scripts/test_vqa_multi_tunnel.py https://<your-ngrok-url>.ngrok-free.app

Sends the two real Brahmaputra flood AOI images (bi-temporal pair, already in the
repo) and a real CDVQA-style question, then prints the raw response so you can see
whether it's genuinely comparing both images or something went wrong.
"""
import sys
import os
import base64
import json
import requests

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "sample_aois")

def main():
    if len(sys.argv) != 2:
        print("Usage: python scripts/test_vqa_multi_tunnel.py <tunnel_url>")
        sys.exit(1)

    tunnel_url = sys.argv[1].rstrip("/")
    img1_path = os.path.join(DATA_DIR, "brahmaputra_flood_optical_t1.png")
    img2_path = os.path.join(DATA_DIR, "brahmaputra_flood_optical_t2.png")

    for p in (img1_path, img2_path):
        if not os.path.exists(p):
            print(f"[FAIL] Expected test image not found: {p}")
            sys.exit(1)

    images_b64 = []
    for p in (img1_path, img2_path):
        with open(p, "rb") as f:
            images_b64.append(base64.b64encode(f.read()).decode("ascii"))

    payload = {
        "prompt": "What changed between these two dates, and where did the change occur?",
        "images_base64": images_b64,
        "image_labels": ["Time 1 (pre-flood)", "Time 2 (peak monsoon)"],
    }

    print(f"[*] POSTing to {tunnel_url}/vqa_multi ...")
    try:
        resp = requests.post(f"{tunnel_url}/vqa_multi", json=payload, timeout=(5, 120))
    except Exception as e:
        print(f"[FAIL] Request failed: {e}")
        sys.exit(1)

    print(f"[*] HTTP {resp.status_code}")
    if not resp.ok:
        print(f"[FAIL] Non-OK response body: {resp.text[:500]}")
        sys.exit(1)

    data = resp.json()
    print(json.dumps(data, indent=2))

    text = data.get("text", "")
    confidence = data.get("confidence")
    adapter_active = data.get("adapter_active")

    print("\n--- Sanity checks ---")
    print(f"Got non-empty text: {bool(text.strip())}")
    print(f"Got a real confidence number (not null): {isinstance(confidence, (int, float))}")
    print(f"adapter_active reported: {adapter_active}")
    if len(text.strip()) > 20 and isinstance(confidence, (int, float)):
        print("\n[PASS] /vqa_multi appears to be working — safe to run the full benchmark now:")
        print("       python scripts/build_benchmark.py")
    else:
        print("\n[WARN] Response looks incomplete — inspect the raw JSON above before trusting it.")

if __name__ == "__main__":
    main()
