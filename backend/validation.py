"""
Mandatory Input Validation Layer (SIH26167 PS Mandatory Requirement)
Checks image count, modality tags, format readability, spatial metadata, and cross-sensor co-registration.

Honesty fix (2026-08-29): the bi-temporal "co-registration" check previously only verified
image COUNT (>=2) -- despite the error message's own wording claiming "co-registered" images
are required, nothing ever compared the two images' real CRS or bounds. Separately,
`extract_geospatial_metadata`'s third fallback tier assigned a specific, real-looking UTM CRS
and exact bounds to the project's demo PNG assets purely by matching filename substrings
("hyderabad", "brahmaputra"/"flood", "punjab") -- indistinguishable in the returned schema from
metadata genuinely extracted from a raster's own embedded tags. Both are fixed here:
  1. Every metadata dict now carries a `metadata_source` field: "file_metadata" (genuinely
     extracted via rasterio or real GeoTIFF PIL tags) vs "known_demo_aoi_filename_heuristic"
     (a guess based on the demo asset's filename, not real embedded georeferencing).
  2. Bi-temporal change-detection validation now runs a real CRS + bounds-overlap comparison
     between the T1/T2 images when BOTH have `metadata_source == "file_metadata"`, and reports
     `co_registration_status` honestly ("verified" / "weak_overlap" / "mismatch" /
     "unverified") instead of silently implying "co-registered" was ever actually checked. A
     genuine CRS mismatch or zero real-world bounds overlap is now a hard validation error; a
     demo PNG pair (heuristic-only metadata) is honestly reported "unverified", never
     "verified" -- we do not pretend a filename guess proves two images are co-registered.
"""

import os
from typing import List, Dict, Any, Optional, Tuple
from PIL import Image

from .router import is_change_query, is_fusion_query

VALID_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".geotiff"}
VALID_MODALITIES = {"optical", "sar", "fused"}
# PS format rule (2026-08-24 fix): the PS requires GeoTIFF/TIFF as the primary format, with
# PNG/JPEG "accepted only for the prescribed public benchmark datasets." Previously PNG/JPEG
# was accepted unconditionally for any path. Scoped so the project's own sample-AOI demo
# assets (which are PNG) keep working, while real uploads via /upload must be GeoTIFF/TIFF.
RASTER_ONLY_EXTENSIONS = {".tif", ".tiff", ".geotiff"}

# Minimum real-world bounding-box IoU between T1 and T2 images to call them "verified" as the
# same AOI. Below this (but still overlapping) is reported "weak_overlap", not a hard error --
# a slight frame offset between two real passes is normal and shouldn't block a legitimate
# bi-temporal request.
CO_REGISTRATION_IOU_VERIFIED_THRESHOLD = 0.5


class InputValidator:
    def __init__(self):
        pass

    def validate_request(
        self,
        query: str,
        images: List[Dict[str, Any]],
        task_hint: Optional[str] = None,
        viewport_bbox: Optional[List[float]] = None
    ) -> Dict[str, Any]:
        """
        Validates the incoming query and image payload before dispatching to specialist models.
        Returns:
            {"passed": bool, "errors": List[str], "details": Dict[str, Any]}
        """
        errors = []
        details = {
            "num_images": len(images),
            "modalities": [],
            "image_formats": [],
            "dimensions": []
        }

        # 1. Query text validation
        if not query or not query.strip():
            errors.append("Query text cannot be empty.")

        # 2. Image count check
        if not images:
            errors.append("At least one remote-sensing image or GeoTIFF tile must be provided.")
            return {"passed": False, "errors": errors, "details": details}

        # 3. Individual image validation
        modalities_found = []
        # Parallel to `images` (None/"" where extraction wasn't possible or the tag was
        # missing/invalid) so the co-registration checks below can honestly look up a
        # specific image's metadata by its real index or modality, rather than by position
        # in a filtered list.
        geo_meta_by_image: List[Optional[Dict[str, Any]]] = []
        modality_by_image: List[str] = []
        for idx, img_info in enumerate(images):
            url_or_path = img_info.get("url_or_path", "")
            modality = img_info.get("modality", "").lower()
            modality_by_image.append(modality)

            if not url_or_path:
                errors.append(f"Image [{idx+1}] path or URL is missing.")
                geo_meta_by_image.append(None)
                continue

            # Check file extension
            _, ext = os.path.splitext(url_or_path.lower())
            is_inline_data = url_or_path.startswith("data:image")
            if ext not in VALID_IMAGE_EXTENSIONS and not is_inline_data:
                errors.append(f"Image [{idx+1}] format '{ext}' is unsupported. Must be GeoTIFF/TIFF, PNG, or JPEG.")
            elif (
                ext not in RASTER_ONLY_EXTENSIONS
                and not is_inline_data
                and "data/sample_aois/" not in url_or_path.replace("\\", "/").lower()
            ):
                errors.append(
                    f"Image [{idx+1}] format '{ext}' is only accepted for the project's prescribed public "
                    "benchmark AOI datasets (data/sample_aois/). Real satellite imagery uploads must be "
                    "GeoTIFF/TIFF per the PS's primary-format requirement."
                )

            # Modality check
            if not modality:
                errors.append(f"Image [{idx+1}] is missing mandatory sensor modality tag ('optical' or 'sar').")
            elif modality not in VALID_MODALITIES:
                errors.append(f"Image [{idx+1}] has invalid modality '{modality}'. Allowed: {VALID_MODALITIES}")
            else:
                modalities_found.append(modality)

            # Check readability and dimensions if file exists locally
            geo_meta_for_this_image: Optional[Dict[str, Any]] = None
            if os.path.exists(url_or_path):
                try:
                    with Image.open(url_or_path) as im:
                        details["dimensions"].append({"width": im.width, "height": im.height})
                        details["image_formats"].append(im.format)

                        # Real GeoTIFF spatial metadata extraction
                        geo_meta_for_this_image = self.extract_geospatial_metadata(url_or_path, im)
                        if geo_meta_for_this_image:
                            details.setdefault("geospatial_metadata", []).append(geo_meta_for_this_image)
                except Exception as e:
                    errors.append(f"Image [{idx+1}] is corrupt or unreadable: {str(e)}")
            geo_meta_by_image.append(geo_meta_for_this_image)

        details["modalities"] = modalities_found

        # 4. Task-specific compatibility validation
        # Uses the single shared classifier (backend/router.py's is_change_query /
        # is_fusion_query) instead of a second, independently-maintained keyword list — the
        # two lists had drifted apart (this one was missing "increase", "decrease",
        # "remained", "before and after", "dates", "microwave", "backscatter"), which let
        # queries the router would classify as ChangeDetection_CDVQA or CrossModalFusion pass
        # validation unrecognized as either.
        is_change_task = (task_hint == "ChangeDetection_CDVQA") or is_change_query(query)
        is_fusion_task = (task_hint == "CrossModalFusion") or is_fusion_query(query)

        # Pair-overcount fix (2026-08-29, audit finding): both task families are strictly
        # pair-based downstream -- main.py's ChangeDetection_CDVQA branch always uses
        # images_dict[0]/[1] as T1/T2, and its CrossModalFusion branch picks the first
        # 'optical'-tagged and first 'sar'-tagged image -- so a 3rd/4th image submitted
        # alongside a valid pair was previously silently ignored rather than acted on or
        # rejected, even though the change-task error message's own wording already said
        # "exactly 2". Now rejected outright: the caller should know its extra images were
        # never used, rather than silently getting an answer based on a subset of what it
        # submitted.
        if (is_change_task or is_fusion_task) and len(images) > 2:
            kind = "Bi-temporal change analysis" if is_change_task else "Optical–SAR cross-modal fusion"
            errors.append(
                f"{kind} is a strictly pair-based task (exactly 2 images), but {len(images)} "
                "images were provided. Extra images are not silently dropped -- resubmit with "
                "only the 2 images that should be compared."
            )

        if is_change_task:
            if len(images) < 2:
                errors.append("Bi-temporal change analysis requires exactly 2 co-registered images (Time T1 and Time T2).")
            else:
                # Real co-registration check (2026-08-29 fix) -- see module docstring. Compares
                # the first two images as T1/T2, matching the convention used everywhere else
                # in this codebase (changeformer_service.detect_change, run_cdvqa, etc.).
                geo_t1 = geo_meta_by_image[0] if len(geo_meta_by_image) > 0 else None
                geo_t2 = geo_meta_by_image[1] if len(geo_meta_by_image) > 1 else None
                co_status, co_note = self._check_co_registration(geo_t1, geo_t2)
                details["co_registration_status"] = co_status
                details["co_registration_note"] = co_note
                # Audit fix (2026-08-29, round 3): "weak_overlap" was previously allowed
                # through -- but changeformer_service.detect_change does no reprojection or
                # cropping to a common grid; it just resizes both FULL images to 256x256 and
                # diffs/feeds them to the change model pixel-for-pixel. A partially-overlapping
                # T1/T2 pair fed through that unaligned would compare genuinely different
                # ground locations and could easily manufacture a false change mask. Real fix
                # (reproject/resample both to a common CRS+grid+intersecting AOI before
                # inference) is a real scope of work; until that lands, reject weak_overlap for
                # change detection outright rather than silently accept a comparison the
                # pipeline can't actually align -- exactly the stopgap the audit itself
                # proposed as acceptable pending the real fix. Fusion is NOT included in this
                # rejection: sar_fusion_service.run_fused_vqa does joint VLM reasoning over the
                # two images (a model looking at both pictures and answering in text), not a
                # per-pixel numeric diff, so it isn't exposed to the same "silently manufactures
                # a wrong numeric result from misaligned pixels" failure mode.
                if co_status in ("mismatch", "weak_overlap"):
                    errors.append(f"Co-registration check failed: {co_note}")

        if is_fusion_task:
            has_optical = "optical" in modalities_found
            has_sar = "sar" in modalities_found
            # Fix (2026-08-24): the previous check `not (has_optical and has_sar) and len(images) < 2`
            # only errored when BOTH conditions failed, so two images of the SAME modality
            # (e.g. two optical images) satisfied len(images) >= 2 and passed fusion
            # validation despite having zero SAR data — main.py would then feed an optical
            # image to sar_fusion_service and report it as genuine SAR evidence. Fusion now
            # requires one image specifically tagged 'optical' AND one specifically tagged
            # 'sar', regardless of total image count.
            if not (has_optical and has_sar):
                errors.append("Optical–SAR cross-modal fusion requires one image tagged 'optical' and one image tagged 'sar' (not just any two images).")
            else:
                # Co-registration extension (2026-08-29, audit finding): the check above only
                # confirmed a modality TAG on each side, never that the optical and SAR images
                # actually cover the same real-world location -- unlike the change-detection
                # path, which already got a real CRS/bounds comparison earlier today. Looks up
                # the same optical/SAR pair main.py's own CrossModalFusion branch will actually
                # use (first image tagged 'optical', first tagged 'sar' -- matching main.py's
                # `next(... img["modality"] == "optical" ...)` selection exactly) so this
                # validates the real pair that gets dispatched, not just "some optical image
                # and some SAR image happen to be present somewhere in the request".
                opt_idx = next((i for i, m in enumerate(modality_by_image) if m == "optical"), None)
                sar_idx = next((i for i, m in enumerate(modality_by_image) if m == "sar"), None)
                geo_opt = geo_meta_by_image[opt_idx] if opt_idx is not None else None
                geo_sar = geo_meta_by_image[sar_idx] if sar_idx is not None else None
                co_status, co_note = self._check_co_registration(geo_opt, geo_sar)
                details["fusion_co_registration_status"] = co_status
                details["fusion_co_registration_note"] = co_note
                if co_status == "mismatch":
                    errors.append(f"Optical–SAR co-registration check failed: {co_note}")

        # 5. Viewport / Bbox check
        if viewport_bbox is not None:
            if not isinstance(viewport_bbox, list) or len(viewport_bbox) != 4:
                errors.append("viewport_bbox must be an array of 4 coordinates [minLon, minLat, maxLon, maxLat].")
            else:
                min_lon, min_lat, max_lon, max_lat = viewport_bbox
                if min_lon >= max_lon or min_lat >= max_lat:
                    errors.append("Invalid viewport bounding box coordinates (min >= max).")

        passed = len(errors) == 0
        return {
            "passed": passed,
            "errors": errors,
            "details": details
        }

    def _check_co_registration(
        self,
        geo_meta_t1: Optional[Dict[str, Any]],
        geo_meta_t2: Optional[Dict[str, Any]],
    ) -> Tuple[str, str]:
        """
        Honestly compares two images' geospatial metadata for real co-registration (same CRS,
        overlapping real-world bounds) -- shared by both the bi-temporal change-detection
        check (T1/T2) and the optical-SAR fusion check below (the actual optical/SAR pair
        main.py will dispatch). Added 2026-08-29 in direct response to an audit finding that
        this check previously only verified image COUNT (>=2) for change detection, and didn't
        exist AT ALL for fusion (only modality tags were checked, never that the two images
        cover the same real-world location) -- despite the change-task error message's own
        wording claiming "co-registered" was being enforced.

        Returns (status, note):
          - "verified": both images have real, file-extracted metadata (not a filename guess),
             share the same CRS, and their bounds overlap with IoU >= threshold.
          - "weak_overlap": same as above but the bounds only partially overlap.
          - "mismatch": both have real metadata but different CRS, or their bounds don't
             overlap at all -- these are demonstrably not the same real-world AOI. Treated as
             a hard validation error.
          - "unverified": real, file-extracted metadata isn't available for both images (e.g.
             one or both are the project's demo PNG assets, whose metadata -- if any -- comes
             from a filename heuristic, not real embedded georeferencing). We do NOT call a
             filename guess "verified" co-registration.
        """
        real_t1 = bool(geo_meta_t1) and geo_meta_t1.get("metadata_source") == "file_metadata"
        real_t2 = bool(geo_meta_t2) and geo_meta_t2.get("metadata_source") == "file_metadata"
        if not (real_t1 and real_t2):
            return (
                "unverified",
                "Co-registration was not verified: real, file-extracted geospatial metadata "
                "(CRS + bounds from the raster's own embedded tags) is not available for both "
                "T1 and T2 images. A demo-AOI filename guess, where present, is not treated as "
                "real georeferencing for this check."
            )

        crs1, crs2 = geo_meta_t1.get("crs"), geo_meta_t2.get("crs")
        bounds1, bounds2 = geo_meta_t1.get("bounds"), geo_meta_t2.get("bounds")
        if not bounds1 or not bounds2:
            return (
                "unverified",
                "Co-registration was not verified: real-world bounds were missing from the "
                "extracted metadata for one or both images."
            )

        # CRS-mismatch fix (2026-08-29, audit finding): a different CRS does NOT mean a
        # different location -- optical and SAR products routinely ship in different UTM
        # zones (or one in WGS84), while validly covering the same real-world AOI. The
        # previous version hard-rejected any CRS difference without ever attempting to
        # compare them properly. Now reprojects BOTH bounds into a common frame (WGS84) via
        # rasterio.warp.transform_bounds before comparing -- a real coordinate transform, not
        # an assumption that "different CRS => mismatch". Reprojection failure (a CRS string
        # rasterio can't parse) is reported "unverified", not "mismatch" -- inability to
        # compare isn't evidence the images don't overlap.
        try:
            bounds1_wgs84 = self._bounds_to_wgs84(bounds1, crs1)
            bounds2_wgs84 = self._bounds_to_wgs84(bounds2, crs2)
        except Exception as e:
            return (
                "unverified",
                f"Co-registration was not verified: could not reproject bounds from "
                f"({crs1}) / ({crs2}) to a common CRS for comparison ({e})."
            )

        min_lon = max(bounds1_wgs84[0], bounds2_wgs84[0])
        min_lat = max(bounds1_wgs84[1], bounds2_wgs84[1])
        max_lon = min(bounds1_wgs84[2], bounds2_wgs84[2])
        max_lat = min(bounds1_wgs84[3], bounds2_wgs84[3])
        if min_lon >= max_lon or min_lat >= max_lat:
            return (
                "mismatch",
                "T1 and T2 real-world bounding boxes do not overlap at all -- these are not "
                "the same area of interest."
            )

        inter_area = (max_lon - min_lon) * (max_lat - min_lat)
        area1 = (bounds1_wgs84[2] - bounds1_wgs84[0]) * (bounds1_wgs84[3] - bounds1_wgs84[1])
        area2 = (bounds2_wgs84[2] - bounds2_wgs84[0]) * (bounds2_wgs84[3] - bounds2_wgs84[1])
        union_area = area1 + area2 - inter_area
        iou = (inter_area / union_area) if union_area > 0 else 0.0

        if iou < CO_REGISTRATION_IOU_VERIFIED_THRESHOLD:
            return (
                "weak_overlap",
                f"T1 and T2 bounding boxes overlap only partially (IoU={iou:.2f}) -- verify "
                "these are genuinely the same AOI before trusting the change-detection result."
            )
        crs_note = f"CRS {crs1}" if crs1 == crs2 else f"CRS {crs1} and {crs2} (compared via a common WGS84 frame)"
        return (
            "verified",
            f"T1 and T2 ({crs_note}) real-world bounds overlap with IoU={iou:.2f}."
        )

    def _bounds_to_wgs84(self, bounds: List[float], crs_str: Optional[str]) -> List[float]:
        """
        Reprojects a [minLon/minX, minLat/minY, maxLon/maxX, maxLat/maxY]-style bounds tuple
        from `crs_str` into real WGS84 (EPSG:4326) coordinates via rasterio/PROJ -- genuine
        coordinate transform math (same library this project already uses in geo_transform.py
        for pixel-to-WGS84 conversion), not an assumption. If `crs_str` is already WGS84 (or
        unset), returns bounds unchanged. Raises on an unparseable CRS string rather than
        silently returning the input -- callers must treat that as "couldn't verify", never as
        "already comparable".
        """
        if not crs_str or "4326" in str(crs_str):
            return list(bounds)
        import rasterio
        from rasterio.warp import transform_bounds
        return list(transform_bounds(crs_str, "EPSG:4326", *bounds))

    def extract_geospatial_metadata(self, file_path: str, pil_image: Optional[Image.Image] = None) -> Optional[Dict[str, Any]]:
        """
        Extracts genuine GeoTIFF CRS, spatial bounding coordinates, pixel scale, and metadata tags.

        Every returned dict carries a `metadata_source` field so callers (and the
        co-registration check above) can tell real, file-extracted georeferencing apart from
        the filename-based demo-AOI guess in tier 3 below -- added 2026-08-29 after noticing
        the guess was otherwise schema-identical to genuinely extracted metadata, which meant
        a demo PNG with zero real embedded geospatial data could be indistinguishable from a
        real GeoTIFF's own metadata to any downstream consumer.
        """
        meta: Dict[str, Any] = {
            "file": os.path.basename(file_path),
            "is_georeferenced": False
        }

        # 1. Try rasterio if installed -- real extraction from the raster's own embedded tags.
        # Honesty fix (2026-08-29, caught while testing this same change): GDAL's PNG/JPEG
        # driver lets rasterio successfully *open* a plain, non-georeferenced demo PNG -- and
        # when a raster carries no real geotransform, rasterio silently substitutes an
        # identity matrix, so `src.bounds`/`src.crs` come back as a fake "EPSG:4326 (0,0)-
        # (width,height)" default rather than raising. The old code returned that default as
        # if it were real georeferencing any time rasterio could merely decode the file. Now
        # gated strictly on `src.crs is not None`: only a genuinely georeferenced raster
        # returns here as "file_metadata"; anything else falls through to tier 2/3 below
        # instead of fabricating coordinates for an ordinary image.
        try:
            import rasterio
            with rasterio.open(file_path) as src:
                if src.crs is not None:
                    meta["is_georeferenced"] = True
                    meta["metadata_source"] = "file_metadata"
                    meta["crs"] = str(src.crs)
                    meta["bounds"] = [src.bounds.left, src.bounds.bottom, src.bounds.right, src.bounds.top]
                    meta["resolution_m"] = [abs(src.res[0]), abs(src.res[1])]
                    meta["driver"] = src.driver
                    meta["count_bands"] = src.count
                    return meta
                # else: rasterio could decode the file but it has no real CRS/geotransform --
                # not actual georeferencing. Fall through rather than fabricate one.
        except Exception:
            pass

        # 2. Try PIL Tiff tags (33550 = ModelPixelScaleTag, 33922 = ModelTiepointTag, 34735 = GeoKeyDirectoryTag)
        #    -- also real, file-extracted metadata.
        if pil_image is not None and hasattr(pil_image, "tag_v2"):
            try:
                tags = pil_image.tag_v2
                has_geotiff = any(k in tags for k in [33550, 33922, 34735, 34736, 34737])
                if has_geotiff:
                    meta["is_georeferenced"] = True
                    meta["metadata_source"] = "file_metadata"
                    meta["crs"] = "EPSG:4326 (WGS 84 GeoTIFF)"
                    if 33550 in tags:
                        scale = tags[33550]
                        meta["pixel_scale"] = [float(s) for s in scale]
                    if 33922 in tags:
                        tiepoints = tags[33922]
                        meta["tiepoints"] = [float(tp) for tp in tiepoints]
                    return meta
            except Exception:
                pass

        # 3. Fallback for the project's own sample Indian AOI demo assets -- NOT real
        #    extraction. These PNGs carry zero embedded geospatial metadata; this is a
        #    filename-substring guess of plausible real-world bounds so the demo UI has
        #    something to show on the map. Honestly labeled `metadata_source` so this can
        #    never be mistaken for a genuinely-extracted CRS/bounds by any downstream code
        #    (including the co-registration check above, which explicitly refuses to
        #    "verify" co-registration using this tier).
        fname = os.path.basename(file_path).lower()
        if "hyderabad" in fname:
            meta["is_georeferenced"] = True
            meta["metadata_source"] = "known_demo_aoi_filename_heuristic"
            meta["metadata_note"] = (
                "Bounds/CRS inferred from the demo filename, not extracted from real embedded "
                "raster geospatial metadata -- this PNG has none."
            )
            meta["crs"] = "EPSG:32644 (WGS 84 / UTM Zone 44N)"
            meta["bounds"] = [78.440, 17.385, 78.495, 17.435]
            meta["sensor"] = "Sentinel-2 MSI / Sentinel-1 C-SAR"
            return meta
        elif "brahmaputra" in fname or "flood" in fname:
            meta["is_georeferenced"] = True
            meta["metadata_source"] = "known_demo_aoi_filename_heuristic"
            meta["metadata_note"] = (
                "Bounds/CRS inferred from the demo filename, not extracted from real embedded "
                "raster geospatial metadata -- this PNG has none."
            )
            meta["crs"] = "EPSG:32646 (WGS 84 / UTM Zone 46N)"
            meta["bounds"] = [92.750, 26.500, 92.950, 26.700]
            meta["sensor"] = "Sentinel-1 C-SAR Dual-Pol"
            return meta
        elif "punjab" in fname:
            meta["is_georeferenced"] = True
            meta["metadata_source"] = "known_demo_aoi_filename_heuristic"
            meta["metadata_note"] = (
                "Bounds/CRS inferred from the demo filename, not extracted from real embedded "
                "raster geospatial metadata -- this PNG has none."
            )
            meta["crs"] = "EPSG:32643 (WGS 84 / UTM Zone 43N)"
            meta["bounds"] = [75.750, 30.850, 75.950, 31.050]
            meta["sensor"] = "Sentinel-2 MSI"
            return meta

        return None

# Global singleton
input_validator = InputValidator()
