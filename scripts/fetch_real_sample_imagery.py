"""
Fetch real satellite imagery to replace the placeholder/cartoon sample AOI images.

Why this exists: data/sample_aois/*.png were procedurally-drawn placeholders (a green grid
with a blue zigzag line, colored rectangles for buildings) rather than real satellite data -
found during an honesty audit on 2026-08-24 while debugging why grounding boxes never lined
up with the live map. This script replaces them with genuinely real imagery.

IMPORTANT - run this on a machine with normal internet access, e.g. your own machine:
    pip install requests pillow    (both are already in backend/requirements.txt)
    python scripts/fetch_real_sample_imagery.py

Note: Ensure your runtime environment has unrestricted outbound HTTPS internet access
to communicate with European Space Agency (EOX) and NASA GIBS WMS endpoints.

What it fetches:
- Hyderabad + Punjab (single optical image): EOX Sentinel-2 cloudless WMS - a real, freely-
  licensed 10m-resolution Sentinel-2 mosaic, no signup required.
- Brahmaputra bi-temporal (T1/T2): NASA GIBS WMS, VIIRS true color, two genuinely different
  real acquisition dates (a dry-season default and a monsoon-peak default) so the "what
  changed" demo query has something real to find. A cloud-free mosaic (like EOX above) would
  smooth the flood away entirely, which is why this AOI uses a different, date-specific
  source. Resolution is 250m - coarse for this ~8km AOI, but genuinely real and date-specific.
  Known limitation, not a bug: monsoon-season optical imagery is very often cloud-obscured
  over Assam (this is exactly why SAR is preferred for real flood mapping) - if the T2 fetch
  succeeds but looks cloudy, try a different TIME date via the manual link in the imagery
  guide instead of this script's default.
- Hyderabad SAR: Copernicus Data Space Sentinel-1 GRD quicklook - the one image type with no
  equivalent no-auth mosaic service. Requires a free Copernicus account (the same one
  backend/geo/bhoonidhi_client.py already queries for metadata, https://dataspace.copernicus.eu/).
  Set COPERNICUS_USER / COPERNICUS_PASS as environment variables before running this script.
  Skipped with clear instructions if they aren't set - never silently faked.

Every downloaded response is verified as a genuinely decodable image (via PIL) before being
written over the existing placeholder. A service returning an error page, an empty body, or a
non-image response is reported as a failure, never silently saved as if it were real imagery.
"""

import os
import sys
import io
import math
from pathlib import Path

import requests

try:
    from PIL import Image
except ImportError:
    print("Pillow is required: pip install pillow", file=sys.stderr)
    sys.exit(1)

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
SAMPLE_DIR = PROJECT_ROOT / "data" / "sample_aois"

EOX_WMS = "https://tiles.maps.eox.at/wms"
GIBS_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
COPERNICUS_ODATA = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products"
COPERNICUS_TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"


def lonlat_to_mercator(lon, lat):
    x = lon * 20037508.34 / 180
    y = math.log(math.tan((90 + lat) * math.pi / 360)) / (math.pi / 180) * 20037508.34 / 180
    return x, y


def fetch_and_validate(url, dest_path, description, timeout=30):
    """
    Downloads `url`, verifies the bytes actually decode as a real image, then saves.
    Returns True only on genuine success - never writes a non-image response to disk, so a
    failed or blocked request can never silently masquerade as real imagery.
    """
    print(f"  Fetching {description} ...")
    try:
        resp = requests.get(url, timeout=timeout)
    except Exception as e:
        print(f"  FAILED: request error ({e})")
        return False

    if resp.status_code != 200:
        print(f"  FAILED: HTTP {resp.status_code} - {resp.text[:200]!r}")
        return False

    content_type = resp.headers.get("Content-Type", "")
    if "image" not in content_type:
        print(f"  FAILED: response wasn't an image (Content-Type: {content_type!r}). "
              f"First 200 bytes: {resp.content[:200]!r}")
        return False

    try:
        img = Image.open(io.BytesIO(resp.content))
        img.verify()
        img_format, img_size = img.format, img.size
    except Exception as e:
        print(f"  FAILED: response claimed to be an image but didn't decode ({e})")
        return False

    dest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(dest_path, "wb") as f:
        f.write(resp.content)
    print(f"  OK: saved real image ({len(resp.content)} bytes, {img_format} {img_size}) -> {dest_path}")
    return True


def fetch_eox(bbox_lonlat, dest_path, description):
    min_lon, min_lat, max_lon, max_lat = bbox_lonlat
    x1, y1 = lonlat_to_mercator(min_lon, min_lat)
    x2, y2 = lonlat_to_mercator(max_lon, max_lat)
    params = {
        "SERVICE": "WMS", "VERSION": "1.1.1", "REQUEST": "GetMap",
        "LAYERS": "s2cloudless-2024_3857", "STYLES": "", "FORMAT": "image/png",
        "SRS": "EPSG:3857", "BBOX": f"{x1:.2f},{y1:.2f},{x2:.2f},{y2:.2f}",
        "WIDTH": "512", "HEIGHT": "512",
    }
    url = EOX_WMS + "?" + "&".join(f"{k}={v}" for k, v in params.items())
    return fetch_and_validate(url, dest_path, description)


def fetch_gibs(bbox_lonlat, date_str, dest_path, description):
    min_lon, min_lat, max_lon, max_lat = bbox_lonlat
    params = {
        "SERVICE": "WMS", "VERSION": "1.1.1", "REQUEST": "GetMap",
        "LAYERS": "VIIRS_SNPP_CorrectedReflectance_TrueColor",
        "SRS": "EPSG:4326", "BBOX": f"{min_lon},{min_lat},{max_lon},{max_lat}",
        "WIDTH": "400", "HEIGHT": "350", "FORMAT": "image/png", "TIME": date_str,
    }
    url = GIBS_WMS + "?" + "&".join(f"{k}={v}" for k, v in params.items())
    return fetch_and_validate(url, dest_path, description)


def fetch_copernicus_sar_quicklook(bbox_lonlat, dest_path, description):
    user = os.environ.get("COPERNICUS_USER")
    password = os.environ.get("COPERNICUS_PASS")
    if not user or not password:
        print("  SKIPPED: set COPERNICUS_USER / COPERNICUS_PASS environment variables "
              "(free account at https://dataspace.copernicus.eu/) to automate this one. "
              "Otherwise use the Copernicus Browser link from the imagery guide.")
        return False

    try:
        token_resp = requests.post(COPERNICUS_TOKEN_URL, data={
            "client_id": "cdse-public", "grant_type": "password",
            "username": user, "password": password,
        }, timeout=15)
        token_resp.raise_for_status()
        access_token = token_resp.json()["access_token"]
    except Exception as e:
        print(f"  FAILED: Copernicus login failed ({e})")
        return False

    min_lon, min_lat, max_lon, max_lat = bbox_lonlat
    wkt = (f"POLYGON(({min_lon} {min_lat},{max_lon} {min_lat},"
           f"{max_lon} {max_lat},{min_lon} {max_lat},{min_lon} {min_lat}))")
    filter_str = (
        f"Collection/Name eq 'SENTINEL-1' and "
        f"OData.CSC.Intersects(area=geography'SRID=4326;{wkt}') and "
        f"contains(Name,'GRD')"
    )
    try:
        search_resp = requests.get(COPERNICUS_ODATA, params={
            "$filter": filter_str, "$top": 1, "$orderby": "ContentDate/Start desc",
        }, timeout=15)
        search_resp.raise_for_status()
        products = search_resp.json().get("value", [])
    except Exception as e:
        print(f"  FAILED: Copernicus product search failed ({e})")
        return False

    if not products:
        print("  FAILED: no recent Sentinel-1 GRD product found for this AOI")
        return False

    product_id = products[0]["Id"]
    quicklook_url = f"{COPERNICUS_ODATA}({product_id})/Quicklook/$value"
    headers = {"Authorization": f"Bearer {access_token}"}
    print(f"  Fetching {description} ...")
    try:
        resp = requests.get(quicklook_url, headers=headers, timeout=30)
    except Exception as e:
        print(f"  FAILED: quicklook download error ({e})")
        return False
    if resp.status_code != 200:
        print(f"  FAILED: HTTP {resp.status_code} fetching quicklook")
        return False
    try:
        img = Image.open(io.BytesIO(resp.content))
        img.verify()
    except Exception as e:
        print(f"  FAILED: quicklook response didn't decode as an image ({e})")
        return False

    dest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(dest_path, "wb") as f:
        f.write(resp.content)
    print(f"  OK: saved real Sentinel-1 quicklook ({len(resp.content)} bytes) -> {dest_path}")
    return True


def main():
    print("Fetching real satellite imagery to replace placeholder sample AOI images.\n")
    results = {}

    print("[1/5] Hyderabad optical (EOX Sentinel-2 cloudless)")
    results["hyderabad_optical"] = fetch_eox(
        [78.4400, 17.3850, 78.4950, 17.4350],
        SAMPLE_DIR / "hyderabad_urban_optical.png",
        "Hyderabad optical",
    )

    print("\n[2/5] Punjab optical (EOX Sentinel-2 cloudless)")
    results["punjab_optical"] = fetch_eox(
        [75.8000, 30.8500, 75.8800, 30.9300],
        SAMPLE_DIR / "punjab_agribelt_optical.png",
        "Punjab optical",
    )

    print("\n[3/5] Brahmaputra T1 - dry season (NASA GIBS VIIRS true color)")
    results["brahmaputra_t1"] = fetch_gibs(
        [91.7000, 26.1500, 91.7800, 26.2200], "2026-03-10",
        SAMPLE_DIR / "brahmaputra_flood_optical_t1.png",
        "Brahmaputra T1 (dry season, 2026-03-10)",
    )

    print("\n[4/5] Brahmaputra T2 - monsoon peak (NASA GIBS VIIRS true color)")
    results["brahmaputra_t2"] = fetch_gibs(
        [91.7000, 26.1500, 91.7800, 26.2200], "2026-07-25",
        SAMPLE_DIR / "brahmaputra_flood_optical_t2.png",
        "Brahmaputra T2 (monsoon peak, 2026-07-25)",
    )

    print("\n[5/5] Hyderabad SAR (Copernicus Sentinel-1 GRD quicklook)")
    results["hyderabad_sar"] = fetch_copernicus_sar_quicklook(
        [78.4400, 17.3850, 78.4950, 17.4350],
        SAMPLE_DIR / "hyderabad_urban_sar.png",
        "Hyderabad SAR",
    )

    print("\n--- Summary ---")
    for name, ok in results.items():
        print(f"  {'OK  ' if ok else 'FAIL'}  {name}")

    failed = [k for k, v in results.items() if not v]
    if failed:
        print(f"\n{len(failed)} of {len(results)} did not complete automatically.")
        print("For any that failed - e.g. heavy cloud cover on the chosen VIIRS date, or no "
              "Copernicus login set - use the manual links from the imagery guide instead.")
        sys.exit(1)
    else:
        print("\nAll 5 real images saved. Restart the backend to pick them up.")


if __name__ == "__main__":
    main()
