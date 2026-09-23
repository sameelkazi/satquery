"""
Real Affine Georeferencing Helper (added 2026-08-29)

Why this file exists: `changeformer_service._mask_to_geojson_features` has always placed its
output change-detection polygons using either a caller-supplied `viewport_bbox` (whatever
rectangle the frontend map happens to be showing) or a hardcoded default AOI (a fixed
Hyderabad bounding box), linearly interpolated over an 8x8 grid. That's a reasonable honest
fallback when the uploaded imagery carries no real geospatial metadata (e.g. the project's own
demo PNG/JPEG sample AOIs) -- but it means a genuine georeferenced GeoTIFF's own real pixel
geometry was never actually used, even when it's available. That's the gap flagged in the
2026-08-29 review of the uploaded ISRO-GIS research documents (Roadmap PDF's P3, Blueprint's
`GeospatialVectorPipeline`).

This module is the minimal real fix: when `image_path` is an actual georeferenced raster
(rasterio can open it AND it carries a real CRS), it exposes that raster's own affine
transform so pixel coordinates can be converted directly into real-world WGS84 lon/lat --
genuine coordinate math, not a linear approximation. It deliberately does NOT add new
dependencies (`geopandas`/`pyproj`) beyond what this project's `requirements.txt` already has
(`rasterio`, which bundles GDAL/PROJ reprojection via `rasterio.warp`).

Honesty contract: `get_real_georeference` returns `None` -- not a best-effort guess -- for
anything that isn't a real georeferenced raster (a plain PNG/JPEG, a corrupt file, a path that
doesn't exist). Callers MUST treat `None` as "fall back to the existing viewport-bbox
approximation," exactly as the code already did before this file existed. Never fabricate a
transform for imagery that doesn't actually have one.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


def get_real_georeference(image_path: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    Attempts to open `image_path` as a real georeferenced raster. Returns
    {"width", "height", "transform", "crs"} (the raster's own native pixel dimensions and
    affine transform) only if it is genuinely georeferenced -- i.e. rasterio can open it AND
    it carries a real CRS. Returns None for anything else (not a raster, no CRS, unreadable),
    which callers must treat as "no real georeferencing available," not as an error to hide.
    """
    if not image_path or not isinstance(image_path, str):
        return None
    try:
        import rasterio
        with rasterio.open(image_path) as src:
            if src.crs is None:
                logger.debug(f"{image_path} opened but carries no CRS -- not real georeferencing.")
                return None
            return {
                "width": src.width,
                "height": src.height,
                "transform": src.transform,
                "crs": src.crs,
            }
    except Exception as e:
        # Anything from "not a raster at all" (a plain PNG/JPEG demo asset) to "file missing" --
        # all honestly mean the same thing to the caller: no real georeferencing here.
        logger.debug(f"No real georeferencing available for {image_path}: {e}")
        return None


def pixel_points_to_wgs84(
    geo_ref: Dict[str, Any],
    points_rc: List[Tuple[float, float]],
) -> List[Tuple[float, float]]:
    """
    General point-list version of the corner math below (added 2026-08-29 for real mask
    polygonization -- a traced change-region boundary can have any number of vertices, not
    just 4). Converts a list of pixel-space (row, col) points -- in the ORIGINAL raster's own
    full-resolution pixel coordinates; callers working from a resized/downsampled mask must
    scale up to the original raster's `geo_ref["width"]`/`["height"]` first -- into real WGS84
    (lon, lat) points, using the raster's own affine transform (`rasterio.transform.xy`) and
    reprojecting via `rasterio.warp.transform` if its native CRS isn't already EPSG:4326. Same
    real coordinate math as `pixel_rect_to_wgs84` below, generalized to N points instead of 4.
    """
    import rasterio
    from rasterio.warp import transform as warp_transform

    transform = geo_ref["transform"]
    crs = geo_ref["crs"]

    xs, ys = [], []
    for row, col in points_rc:
        x, y = rasterio.transform.xy(transform, row, col)
        xs.append(x)
        ys.append(y)

    if str(crs) != "EPSG:4326":
        xs, ys = warp_transform(crs, "EPSG:4326", xs, ys)

    return list(zip(xs, ys))


def get_real_georeference_with_sidecar(image_path: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    Same honesty contract as `get_real_georeference` (returns None for anything that isn't
    genuinely georeferenced -- never fabricates a transform), extended with one additional,
    narrowly-scoped real source: a pre-generated GeoTIFF *sidecar* living next to the given
    image, at the same path with a ".tif" extension.

    Why this exists (added for the project's own curated `data/sample_aois/` demo assets,
    2026-09-09): those are plain PNGs, so `get_real_georeference` correctly returns None for
    them and every change-detection GeoJSON feature computed on them reports
    `area_sq_m: None`. But we DO actually know the true real-world bounds of those specific,
    curated AOIs (recorded in `sample_aois_metadata.json`'s own "bbox" field -- real places,
    not placeholders) -- see `scripts/generate_sample_aoi_geotiffs.py`, which packages that
    already-known bbox into a real GeoTIFF sidecar (same filename, ".tif" extension) next to
    each PNG. This function is the only thing that looks for that sidecar.

    This is deliberately NOT a general "trust any same-named .tif" mechanism for arbitrary
    user uploads: it still requires the sidecar to be a real rasterio-readable raster with an
    actual CRS (checked the same way as `get_real_georeference`), AND requires its pixel
    dimensions to exactly match the original image's own dimensions (so pixel-to-geo scaling
    stays correct) -- if either check fails, this returns None exactly like the base function
    would, never a best-effort guess. A random user-uploaded PNG with no matching sidecar
    behaves identically to before this function existed.
    """
    geo_ref = get_real_georeference(image_path)
    if geo_ref is not None:
        return geo_ref

    if not image_path or not isinstance(image_path, str):
        return None

    from pathlib import Path
    sidecar_path = Path(image_path).with_suffix(".tif")
    if not sidecar_path.exists():
        return None

    sidecar_ref = get_real_georeference(str(sidecar_path))
    if sidecar_ref is None:
        return None

    try:
        from PIL import Image
        with Image.open(image_path) as original_img:
            original_size = original_img.size  # (width, height)
    except Exception as e:
        logger.debug(f"Could not read original image dimensions for sidecar match check ({image_path}): {e}")
        return None

    if (sidecar_ref["width"], sidecar_ref["height"]) != original_size:
        logger.debug(
            f"Sidecar {sidecar_path} dimensions {(sidecar_ref['width'], sidecar_ref['height'])} "
            f"do not match {image_path} dimensions {original_size} -- refusing to use it."
        )
        return None

    return sidecar_ref


def pixel_rect_to_wgs84(
    geo_ref: Dict[str, Any],
    col_start: float,
    row_start: float,
    col_end: float,
    row_end: float,
) -> List[Tuple[float, float]]:
    """
    Converts a pixel-space rectangle -- in the ORIGINAL raster's own full-resolution pixel
    coordinates; callers working from a resized/downsampled mask must scale up to the
    original raster's `geo_ref["width"]`/`["height"]` first -- into a real WGS84 lon/lat
    quadrilateral. Real coordinate math derived from the raster's own metadata, not an
    approximation. Now a thin wrapper over `pixel_points_to_wgs84` (refactored 2026-08-29
    to share one real implementation instead of duplicating it).

    Returns 4 (lon, lat) corners in the order: top-left, top-right, bottom-right, bottom-left
    (matching row/col order: row_start=top, row_end=bottom).
    """
    corners_rc = [
        (row_start, col_start), (row_start, col_end),
        (row_end, col_end), (row_end, col_start),
    ]
    return pixel_points_to_wgs84(geo_ref, corners_rc)
