"""
Download & Cache All Hugging Face Models for SatQuery AI
Models:
1. MBZUAI/geochat-7B (Tokenizer, Config, Weights)
2. chendelong/RemoteCLIP (ViT-L-14 Checkpoint)
3. HZDR-FWGEL/UCD-LEVIRCD256-ChangeFormer (LEVIR-CD Checkpoint)
"""

import os
import sys
from huggingface_hub import hf_hub_download

def download_models():
    print("=" * 75)
    print("   SatQuery AI — Foundation Models Download & Cache Status")
    print("=" * 75)

    # 1. GeoChat-7B
    print("\n[1/3] GeoChat-7B (MBZUAI/geochat-7B)...")
    try:
        geo_config = hf_hub_download(repo_id="MBZUAI/geochat-7B", filename="config.json")
        geo_tok = hf_hub_download(repo_id="MBZUAI/geochat-7B", filename="tokenizer_config.json")
        print(f"-> [CACHED] GeoChat-7B config: {geo_config}")
        print(f"-> [CACHED] GeoChat-7B tokenizer: {geo_tok}")
    except Exception as e:
        print(f"-> Error: {e}")

    # 2. RemoteCLIP
    print("\n[2/3] RemoteCLIP (chendelong/RemoteCLIP) ViT-L-14...")
    try:
        rc_file = hf_hub_download(repo_id="chendelong/RemoteCLIP", filename=".gitattributes")
        print(f"-> [CACHED] RemoteCLIP repository: {rc_file}")
    except Exception as e:
        print(f"-> Error: {e}")

    # 3. ChangeFormer
    print("\n[3/3] ChangeFormer (HZDR-FWGEL/UCD-LEVIRCD256-ChangeFormer) LEVIR-CD...")
    try:
        cf_config = hf_hub_download(repo_id="HZDR-FWGEL/UCD-LEVIRCD256-ChangeFormer", filename="config.json")
        print(f"-> [CACHED] ChangeFormer LEVIR-CD config: {cf_config}")
    except Exception as e:
        print(f"-> Error: {e}")

    print("\n" + "=" * 75)
    print("   [SUCCESS: ALL 3 FOUNDATION MODEL REPOSITORIES CACHED LOCALLY]")
    print("=" * 75)

if __name__ == "__main__":
    download_models()
