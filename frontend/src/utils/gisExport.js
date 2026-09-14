/**
 * SatQuery AI — GIS Export Engine for ISRO Bhuvan, QGIS & Google Earth
 * Standards: OGC KML 2.2, RFC 7946 GeoJSON, WGS84 EPSG:4326
 */

/**
 * Calculates surface area of a lat/lon bounding box in square kilometers
 */
export function calculateBoxAreaSqKm([southLat, westLon], [northLat, eastLon]) {
  const R = 6371; // Earth radius in km
  const dLat = ((northLat - southLat) * Math.PI) / 180;
  const dLon = ((eastLon - westLon) * Math.PI) / 180;
  const meanLat = (((southLat + northLat) / 2) * Math.PI) / 180;

  const height = R * Math.abs(dLat);
  const width = R * Math.abs(dLon) * Math.cos(meanLat);

  return parseFloat((height * width).toFixed(4));
}

/**
 * Safely parses any bounding box representation into normalized [x_min, y_min, x_max, y_max] (0.0 to 1.0)
 */
export function parseBoxCoordinates(box) {
  if (!box) return [0, 0, 1, 1];
  let x1 = 0, y1 = 0, x2 = 1, y2 = 1;

  if (Array.isArray(box.bbox) && box.bbox.length === 4) {
    [x1, y1, x2, y2] = box.bbox;
  } else if (Array.isArray(box.box_2d) && box.box_2d.length === 4) {
    const [ymin, xmin, ymax, xmax] = box.box_2d;
    x1 = xmin; y1 = ymin; x2 = xmax; y2 = ymax;
  } else if (box.ymin !== undefined && box.xmin !== undefined && box.ymax !== undefined && box.xmax !== undefined) {
    x1 = box.xmin; y1 = box.ymin; x2 = box.xmax; y2 = box.ymax;
  } else if (Array.isArray(box) && box.length === 4) {
    [x1, y1, x2, y2] = box;
  } else {
    return [0, 0, 1, 1];
  }

  // Handle 0-1000 integer grid coordinates (e.g. Qwen2.5-VL / GeoChat)
  if (x1 > 1 || y1 > 1 || x2 > 1 || y2 > 1) {
    x1 /= 1000; y1 /= 1000; x2 /= 1000; y2 /= 1000;
  }

  const x_min = Math.max(0, Math.min(x1, x2));
  const y_min = Math.max(0, Math.min(y1, y2));
  const x_max = Math.min(1, Math.max(x1, x2));
  const y_max = Math.min(1, Math.max(y1, y2));

  return [x_min, y_min, x_max, y_max];
}

/**
 * Converts normalized bounding box [ymin, xmin, ymax, xmax] (or [x1, y1, x2, y2]) to WGS84 Lat/Lon
 */
export function boxToGeoCoords(box, aoi) {
  if (!aoi?.bbox || !box) return null;
  const [minLon, minLat, maxLon, maxLat] = aoi.bbox;
  const [x1, y1, x2, y2] = parseBoxCoordinates(box);

  const southLat = minLat + (1 - y2) * (maxLat - minLat);
  const northLat = minLat + (1 - y1) * (maxLat - minLat);
  const westLon = minLon + x1 * (maxLon - minLon);
  const eastLon = minLon + x2 * (maxLon - minLon);

  return {
    southLat,
    northLat,
    westLon,
    eastLon,
    bounds: [[southLat, westLon], [northLat, eastLon]],
    polygonCoords: [
      [westLon, northLat],
      [eastLon, northLat],
      [eastLon, southLat],
      [westLon, southLat],
      [westLon, northLat] // Closed loop
    ]
  };
}

/**
 * Generate standard RFC 7946 GeoJSON FeatureCollection
 */
export function exportToGeoJson({ boxes = [], changeGeoJson = null, aoi = null, response = null }) {
  const features = [];
  const timestamp = new Date().toISOString();

  // Add Grounded Bounding Boxes
  boxes.forEach((box, idx) => {
    const geo = boxToGeoCoords(box, aoi);
    if (!geo) return;

    const areaSqKm = calculateBoxAreaSqKm([geo.southLat, geo.westLon], [geo.northLat, geo.eastLon]);
    const areaHectares = parseFloat((areaSqKm * 100).toFixed(2));

    features.push({
      type: "Feature",
      id: box.id || `satquery_feature_${idx + 1}`,
      geometry: {
        type: "Polygon",
        coordinates: [geo.polygonCoords]
      },
      properties: {
        id: box.id || `box_${idx + 1}`,
        label: box.label || "Detected Target",
        confidence: box.confidence || 0.88,
        confidence_pct: `${Math.round((box.confidence || 0.88) * 100)}%`,
        area_sq_km: areaSqKm,
        area_hectares: areaHectares,
        aoi_name: aoi?.name || "Target Region",
        crs: "EPSG:4326",
        source_model: (response?.execution_summary?.models_used || [])[0] || "sameelkazi/satquery-qwen25vl-vrsbench-lora-v2",
        query_id: response?.query_id || "satquery_runtime",
        extracted_at: timestamp
      }
    });
  });

  // Add Change Detection Polygons if present
  if (changeGeoJson && changeGeoJson.features) {
    changeGeoJson.features.forEach((feat, idx) => {
      features.push({
        ...feat,
        properties: {
          ...feat.properties,
          layer_type: "Bi-Temporal Change Detection",
          model: "AdaptFormer-CD / Siamese ViT",
          extracted_at: timestamp
        }
      });
    });
  }

  const geoJsonDoc = {
    type: "FeatureCollection",
    name: `SatQuery_GIS_${aoi?.id || 'export'}`,
    crs: {
      type: "name",
      properties: {
        name: "urn:ogc:def:crs:OGC:1.3:CRS84"
      }
    },
    metadata: {
      title: "SatQuery AI — Grounded Remote Sensing Vector Layer",
      organization: "ISRO • Smart India Hackathon (SIH26167)",
      aoi: aoi?.name || "Global AOI",
      timestamp,
      model_attribution: "sameelkazi / satquery-ai"
    },
    features
  };

  return JSON.stringify(geoJsonDoc, null, 2);
}

/**
 * Generate standard OGC KML 2.2 XML for ISRO Bhuvan & Google Earth
 */
export function exportToKml({ boxes = [], changeGeoJson = null, aoi = null, response = null }) {
  const timestamp = new Date().toISOString();
  const aoiName = aoi?.name || "Satellite Scene";

  let placemarksXml = '';

  boxes.forEach((box, idx) => {
    const geo = boxToGeoCoords(box, aoi);
    if (!geo) return;

    const areaSqKm = calculateBoxAreaSqKm([geo.southLat, geo.westLon], [geo.northLat, geo.eastLon]);
    const label = box.label || `Target ${idx + 1}`;
    const conf = Math.round((box.confidence || 0.88) * 100);

    const coordString = geo.polygonCoords
      .map(([lon, lat]) => `${lon},${lat},0`)
      .join(' ');

    placemarksXml += `
    <Placemark>
      <name>${label} (#${idx + 1})</name>
      <description><![CDATA[
        <div style="font-family: sans-serif; font-size: 13px; line-height: 1.5; color: #0f172a;">
          <h3 style="margin: 0 0 8px 0; color: #0284c7;">SatQuery AI — Grounded Spatial Detection</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="font-weight: bold; padding: 3px 0;">Target Label:</td><td>${label}</td></tr>
            <tr><td style="font-weight: bold; padding: 3px 0;">Confidence:</td><td>${conf}%</td></tr>
            <tr><td style="font-weight: bold; padding: 3px 0;">Surface Area:</td><td>${areaSqKm} sq. km (${(areaSqKm * 100).toFixed(1)} ha)</td></tr>
            <tr><td style="font-weight: bold; padding: 3px 0;">AOI Name:</td><td>${aoiName}</td></tr>
            <tr><td style="font-weight: bold; padding: 3px 0;">Model:</td><td>sameelkazi/satquery-qwen25vl-vrsbench-lora-v2</td></tr>
            <tr><td style="font-weight: bold; padding: 3px 0;">CRS Datum:</td><td>WGS84 (EPSG:4326)</td></tr>
          </table>
          <p style="margin-top: 10px; font-size: 11px; color: #64748b;">Generated for ISRO Bhuvan & QGIS</p>
        </div>
      ]]></description>
      <styleUrl>#satquery_box_style</styleUrl>
      <Polygon>
        <extrude>1</extrude>
        <altitudeMode>clampToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordString}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>SatQuery AI — ${aoiName}</name>
    <description>Grounded Multimodal Vector Layers for ISRO Bhuvan &amp; QGIS</description>
    <Style id="satquery_box_style">
      <LineStyle>
        <color>ffffd322</color> <!-- Glowing Cyan AABBGGRR -->
        <width>3</width>
      </LineStyle>
      <PolyStyle>
        <color>40ffd322</color> <!-- 25% Alpha Cyan Fill -->
        <fill>1</fill>
        <outline>1</outline>
      </PolyStyle>
    </Style>
    <Folder>
      <name>Grounded Detections</name>
      ${placemarksXml}
    </Folder>
  </Document>
</kml>`;
}

/**
 * Generate Tabular CSV with WKT (Well-Known Text) for Excel & Database ingestion
 */
export function exportToWktCsv({ boxes = [], aoi = null, response = null }) {
  const headers = ["feature_id", "label", "confidence_score", "area_sq_km", "area_hectares", "centroid_lat", "centroid_lon", "wkt_geometry", "crs", "model_attribution"];
  const rows = [];

  boxes.forEach((box, idx) => {
    const geo = boxToGeoCoords(box, aoi);
    if (!geo) return;

    const areaSqKm = calculateBoxAreaSqKm([geo.southLat, geo.westLon], [geo.northLat, geo.eastLon]);
    const areaHa = (areaSqKm * 100).toFixed(2);
    const centerLat = ((geo.southLat + geo.northLat) / 2).toFixed(6);
    const centerLon = ((geo.westLon + geo.eastLon) / 2).toFixed(6);

    const wkt = `"POLYGON((${geo.polygonCoords.map(([lon, lat]) => `${lon} ${lat}`).join(', ')}))"`;

    rows.push([
      `SATQUERY_BOX_${idx + 1}`,
      `"${box.label || 'Target'}"`,
      box.confidence || 0.88,
      areaSqKm,
      areaHa,
      centerLat,
      centerLon,
      wkt,
      "EPSG:4326",
      "sameelkazi/satquery-qwen25vl-vrsbench-lora-v2"
    ].join(','));
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Triggers client-side browser file download
 */
export function triggerFileDownload(content, filename, mimeType = "application/json") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
