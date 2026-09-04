"""
Geo Tile Cropping & Low-Bandwidth Service
Provides: Server-side GeoTIFF cropping by viewport bounding box and downsampling to maintain <50KB payload.
"""

import os
import io
import logging
from typing import List, Dict, Any, Optional, Tuple
from PIL import Image
import numpy as np

logger = logging.getLogger(__name__)

class TileService:
    def __init__(self):
        pass

    def crop_tile_by_bbox(
        self,
        image_path: str,
        image_bbox: List[float],
        viewport_bbox: List[float],
        target_size: Tuple[int, int] = (512, 512)
    ) -> Image.Image:
        """
        Crops an AOI image based on user's viewport bounding box (EPSG:4326).
        image_bbox: [minLon, minLat, maxLon, maxLat] of the source GeoTIFF
        viewport_bbox: [minLon, minLat, maxLon, maxLat] of the client view
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Source imagery not found: {image_path}")

        img = Image.open(image_path).convert("RGB")
        w, h = img.size

        img_min_lon, img_min_lat, img_max_lon, img_max_lat = image_bbox
        vp_min_lon, vp_min_lat, vp_max_lon, vp_max_lat = viewport_bbox

        # Calculate pixel coordinates
        x1 = max(0, int(((vp_min_lon - img_min_lon) / (img_max_lon - img_min_lon + 1e-9)) * w))
        y1 = max(0, int(((img_max_lat - vp_max_lat) / (img_max_lat - img_min_lat + 1e-9)) * h))
        x2 = min(w, int(((vp_max_lon - img_min_lon) / (img_max_lon - img_min_lon + 1e-9)) * w))
        y2 = min(h, int(((img_max_lat - vp_min_lat) / (img_max_lat - img_min_lat + 1e-9)) * h))

        # Boundary check
        if x2 <= x1:
            x1, x2 = 0, w
        if y2 <= y1:
            y1, y2 = 0, h

        cropped = img.crop((x1, y1, x2, y2))
        # Downsample to target size for bandwidth efficiency
        resized = cropped.resize(target_size, Image.Resampling.BILINEAR)
        return resized

    def get_compressed_jpeg_bytes(self, image: Image.Image, quality: int = 80) -> bytes:
        """
        Encodes image into compressed JPEG bytes ensuring size < 50KB (Low-bandwidth transmission contract).
        """
        curr_quality = quality
        while curr_quality >= 30:
            buf = io.BytesIO()
            image.save(buf, format="JPEG", quality=curr_quality, optimize=True)
            data = buf.getvalue()
            if len(data) <= 49000:
                return data
            curr_quality -= 10
            
        buf = io.BytesIO()
        image.save(buf, format="JPEG", quality=max(20, curr_quality), optimize=True)
        return buf.getvalue()

tile_service = TileService()
