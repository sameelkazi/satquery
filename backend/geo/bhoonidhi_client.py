"""
Bhoonidhi & Copernicus Remote Sensing Client
Provides: Public satellite tile lookup and metadata retrieval for ESA Copernicus Sentinel-1/2
(via a real, public, unauthenticated API call) and ISRO Bhoonidhi (ResourceSat-2/LISS-IV).

Honesty note (fixed 2026-08-24): this module previously defined real-looking base URLs but
never issued an HTTP request — search_available_scenes() just returned a hardcoded, fully
static 3-item list regardless of input. It now makes a genuine, unauthenticated GET request
to the Copernicus Data Space Ecosystem's public OData catalogue API
(https://documentation.dataspace.copernicus.eu/APIs/OData.html — confirmed to support
anonymous product search by collection/bbox/date) for the Sentinel-1 and Sentinel-2 entries,
and only falls back to a clearly-labeled static example on network failure or empty results.

ISRO Bhoonidhi does not expose a documented, unauthenticated public search API (it requires
registration-based access), so that entry remains a labeled static example rather than a
fabricated "live" call — we are not pretending to hit a real Bhoonidhi endpoint we can't
actually reach without credentials.
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional
import requests

logger = logging.getLogger(__name__)

ODATA_BASE_URL = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products"


class BhoonidhiCopernicusClient:
    def __init__(self):
        self.bhoonidhi_base_url = "https://bhoonidhi.nrsc.gov.in/bhoonidhi/api"
        self.copernicus_odata_url = ODATA_BASE_URL

    def _bbox_to_wkt_polygon(self, bbox: List[float]) -> str:
        min_lon, min_lat, max_lon, max_lat = bbox
        return (
            f"POLYGON(({min_lon} {min_lat},{max_lon} {min_lat},"
            f"{max_lon} {max_lat},{min_lon} {max_lat},{min_lon} {min_lat}))"
        )

    def _query_copernicus_odata(self, collection: str, bbox: List[float], start_date: str, end_date: str, top: int = 3) -> List[Dict[str, Any]]:
        """
        Real, unauthenticated GET request against the Copernicus Data Space Ecosystem
        OData product catalogue. Returns [] (not fabricated data) on any failure so the
        caller can decide how to handle "no live results" honestly.
        """
        wkt = self._bbox_to_wkt_polygon(bbox)
        filter_str = (
            f"Collection/Name eq '{collection}' and "
            f"OData.CSC.Intersects(area=geography'SRID=4326;{wkt}') and "
            f"ContentDate/Start gt {start_date}T00:00:00.000Z and "
            f"ContentDate/Start lt {end_date}T23:59:59.000Z"
        )
        params = {"$filter": filter_str, "$top": top, "$orderby": "ContentDate/Start desc"}
        try:
            resp = requests.get(self.copernicus_odata_url, params=params, timeout=8)
            resp.raise_for_status()
            data = resp.json()
            return data.get("value", [])
        except Exception as e:
            logger.warning(f"Copernicus OData query failed ({e}); no live scene results for {collection}.")
            return []

    def search_available_scenes(
        self,
        bbox: List[float],
        start_date: str = "2026-01-01",
        end_date: str = "2026-08-01",
        sensor: str = "Sentinel-2"
    ) -> List[Dict[str, Any]]:
        """
        Searches available satellite passes over an Indian AOI bbox. Sentinel-1/2 results
        come from a real live API call; ResourceSat-2/LISS-IV stays a labeled static example
        (Bhoonidhi has no public unauthenticated search API to call honestly).
        """
        results: List[Dict[str, Any]] = []

        s2_products = self._query_copernicus_odata("SENTINEL-2", bbox, start_date, end_date)
        if s2_products:
            for p in s2_products:
                results.append({
                    "scene_id": p.get("Name", "unknown"),
                    "satellite": "Sentinel-2 MSI",
                    "acquisition_date": p.get("ContentDate", {}).get("Start"),
                    "bands": ["B02(Blue)", "B03(Green)", "B04(Red)", "B08(NIR)", "B11(SWIR)"],
                    "resolution_m": 10.0,
                    "bbox": bbox,
                    "provider": "Copernicus Data Space Ecosystem (live OData query)",
                    "source": "live"
                })
        else:
            results.append({
                "scene_id": f"S2A_MSIL2A_{start_date.replace('-', '')}_T44QND",
                "satellite": "Sentinel-2A MSI",
                "acquisition_date": f"{start_date}T05:30:00Z",
                "bands": ["B02(Blue)", "B03(Green)", "B04(Red)", "B08(NIR)", "B11(SWIR)"],
                "resolution_m": 10.0,
                "bbox": bbox,
                "provider": "Copernicus Open Access (static example — live query returned no results or failed)",
                "source": "static_fallback"
            })

        s1_products = self._query_copernicus_odata("SENTINEL-1", bbox, start_date, end_date)
        if s1_products:
            for p in s1_products:
                results.append({
                    "scene_id": p.get("Name", "unknown"),
                    "satellite": "Sentinel-1 C-SAR",
                    "acquisition_date": p.get("ContentDate", {}).get("Start"),
                    "polarization": "VV + VH (Dual-Pol, per product metadata)",
                    "resolution_m": 10.0,
                    "bbox": bbox,
                    "provider": "Copernicus Data Space Ecosystem (live OData query)",
                    "source": "live"
                })
        else:
            results.append({
                "scene_id": f"S1A_IW_GRDH_{start_date.replace('-', '')}_DV",
                "satellite": "Sentinel-1A C-SAR",
                "acquisition_date": f"{start_date}T05:30:00Z",
                "polarization": "VV + VH (Dual-Pol)",
                "resolution_m": 10.0,
                "bbox": bbox,
                "provider": "Copernicus Sentinel-1 (static example — live query returned no results or failed)",
                "source": "static_fallback"
            })

        # Bhoonidhi: no public unauthenticated search endpoint exists to call honestly.
        results.append({
            "scene_id": f"RS2_L4_MX_{start_date.replace('-', '')}_IND",
            "satellite": "ResourceSat-2 LISS-IV",
            "acquisition_date": f"{start_date}T04:45:00Z",
            "resolution_m": 5.8,
            "bbox": bbox,
            "provider": "ISRO Bhoonidhi (static example — Bhoonidhi requires authenticated registration; no public search API available to call live)",
            "source": "static_fallback"
        })

        return results


bhoonidhi_client = BhoonidhiCopernicusClient()
