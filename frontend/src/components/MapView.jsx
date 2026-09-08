import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Rectangle, GeoJSON, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { Compass, Layers, Eye, Crosshair } from 'lucide-react';

function MapViewportTracker({ onViewportChange }) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      const bbox = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth()
      ];
      if (onViewportChange) {
        onViewportChange(bbox);
      }
    }
  });
  return null;
}

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center.length === 2) {
      map.flyTo(center, zoom || 13, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
}

export default function MapView({ 
  selectedAoi, 
  aoi,
  onViewportChange, 
  onBboxChange,
  boxes = [], 
  changeGeoJson = null,
  activeModality,
  isDarkMode
}) {
  const [showBoxes, setShowBoxes] = useState(true);
  const [showChanges, setShowChanges] = useState(true);

  const activeAoi = selectedAoi || aoi;
  const defaultCenter = [17.4100, 78.4675]; // Hyderabad
  const defaultZoom = 13;

  const currentCenter = activeAoi?.center || defaultCenter;
  const currentZoom = activeAoi?.zoom || defaultZoom;

  // Convert normalized boxes [x1, y1, x2, y2] or {ymin, xmin, ymax, xmax} to geographic bounds based on AOI
  const getBoxGeoBounds = (box) => {
    if (!activeAoi?.bbox || !box) return null;
    try {
      const [minLon, minLat, maxLon, maxLat] = activeAoi.bbox;
      let x1 = 0, y1 = 0, x2 = 1, y2 = 1;

      if (box.ymin !== undefined && box.xmin !== undefined && box.ymax !== undefined && box.xmax !== undefined) {
        x1 = box.xmin; y1 = box.ymin; x2 = box.xmax; y2 = box.ymax;
      } else if (Array.isArray(box.box_2d) && box.box_2d.length === 4) {
        const [ymin, xmin, ymax, xmax] = box.box_2d;
        x1 = xmin; y1 = ymin; x2 = xmax; y2 = ymax;
      } else if (Array.isArray(box.bbox) && box.bbox.length === 4) {
        [x1, y1, x2, y2] = box.bbox;
      } else if (Array.isArray(box) && box.length === 4) {
        [x1, y1, x2, y2] = box;
      } else {
        return null;
      }

      // If coordinates are in 0-1000 scale (e.g. Qwen2.5-VL / GeoChat)
      if (x1 > 1 || y1 > 1 || x2 > 1 || y2 > 1) {
        x1 /= 1000; y1 /= 1000; x2 /= 1000; y2 /= 1000;
      }

      const x_min = Math.max(0, Math.min(x1, x2));
      const y_min = Math.max(0, Math.min(y1, y2));
      const x_max = Math.min(1, Math.max(x1, x2));
      const y_max = Math.min(1, Math.max(y1, y2));

      const southLat = minLat + (1 - y_max) * (maxLat - minLat);
      const northLat = minLat + (1 - y_min) * (maxLat - minLat);
      const westLon = minLon + x_min * (maxLon - minLon);
      const eastLon = minLon + x_max * (maxLon - minLon);

      if (!Number.isFinite(southLat) || !Number.isFinite(northLat) || !Number.isFinite(westLon) || !Number.isFinite(eastLon)) {
        return null;
      }

      return [
        [southLat, westLon],
        [northLat, eastLon]
      ];
    } catch (e) {
      console.warn("Could not calculate bounds for box:", box, e);
      return null;
    }
  };

  return (
    <div className="relative w-full h-full min-h-full rounded-2xl overflow-hidden shadow-2xl">
      
      {/* Top Map HUD - Theme-Aware Floating Frosted Glass Pill (White Box in Light Mode, Dark Obsidian in Dark Mode) */}
      <div className="absolute top-2.5 left-2.5 z-[1000] flex items-center gap-2 map-hud-pill px-3 py-1.5 rounded-full text-xs shadow-xl pointer-events-none">
        <Compass className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-spin-slow flex-shrink-0" />
        <span className="font-bold tracking-tight map-hud-text">
          {selectedAoi ? selectedAoi.name : 'Interactive Viewport'}
        </span>
        <span className="map-hud-divider font-light">|</span>
        <span className="font-mono text-[10px] map-hud-text-muted font-semibold">
          WGS84 EPSG:4326
        </span>
      </div>

      {/* Layer Toggle HUD - Top Right Floating Frosted Glass Pill */}
      <div className="absolute top-2.5 right-2.5 z-[1000] flex items-center gap-1.5 map-hud-pill p-1 rounded-full text-xs shadow-xl">
        <button
          onClick={() => setShowBoxes(prev => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all text-[11px] font-semibold ${
            showBoxes 
              ? 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-black font-bold shadow-sm' 
              : 'map-hud-text-muted hover:map-hud-text'
          }`}
          title="Toggle Grounding BBoxes"
        >
          <Crosshair className="w-3 h-3" />
          <span>Boxes ({boxes.length})</span>
        </button>
        <button
          onClick={() => setShowChanges(prev => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all text-[11px] font-semibold cursor-pointer ${
            showChanges && changeGeoJson
              ? 'bg-rose-600 dark:bg-rose-500 text-white font-bold shadow-sm' 
              : 'map-hud-text-muted hover:map-hud-text'
          }`}
          title={
            changeGeoJson 
              ? `Toggle ${changeGeoJson.features?.length || 1} Change Detection Mask Clusters` 
              : "No Change Masks active. Run a Bi-Temporal Change query (e.g. NDMA Brahmaputra) to view change detection masks."
          }
        >
          <Layers className="w-3 h-3" />
          <span>Change Masks ({changeGeoJson?.features?.length || (changeGeoJson ? 1 : 0)})</span>
        </button>
      </div>

      {/* Legend Badge - Bottom Right Floating Frosted Glass Pill */}
      <div className="absolute bottom-2.5 right-2.5 z-[1000] flex items-center gap-3 map-hud-pill px-3 py-1.5 rounded-full text-[11px] shadow-xl pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500 border border-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
          <span className="map-hud-text font-semibold">Grounded Region</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 border border-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
          <span className="map-hud-text font-semibold">ChangeFormer Cluster</span>
        </div>
      </div>

      <MapContainer
        center={currentCenter}
        zoom={currentZoom}
        scrollWheelZoom={true}
        className="w-full h-full rounded-2xl"
      >
        <MapController center={currentCenter} zoom={currentZoom} />
        <MapViewportTracker onViewportChange={onViewportChange} />

        {/* High-res Satellite Imagery Basemap */}
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={18}
        />

        {/* Labels Overlay */}
        <TileLayer
          attribution='&copy; CartoDB'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={18}
        />

        {/* Change Detection GeoJSON Polygon Overlay */}
        {changeGeoJson && showChanges && (
          <GeoJSON
            key={JSON.stringify(changeGeoJson)}
            data={changeGeoJson}
            style={() => ({
              color: '#f43f5e',
              weight: 2.5,
              fillColor: '#f43f5e',
              fillOpacity: 0.35,
              dashArray: '3, 4'
            })}
            onEachFeature={(feature, layer) => {
              const p = feature.properties || {};
              const title = p.label || p.cluster_id || "Change Detection Cluster";
              const area = p.area_hectares ? `${p.area_hectares} ha` : (p.area_sq_m ? `${(p.area_sq_m / 10000).toFixed(2)} ha` : "Detected Change");
              const conf = p.confidence ? `${Math.round(p.confidence * 100)}%` : "88%";
              layer.bindTooltip(
                `<div class="font-sans text-xs p-1 text-black font-semibold">
                  <div class="font-bold text-rose-700">${title}</div>
                  <div class="text-[10px] text-slate-700">Area: ${area} | Conf: ${conf}</div>
                </div>`,
                { sticky: true }
              );
            }}
          />
        )}

        {/* Bounding Boxes Overlays */}
        {showBoxes && boxes && boxes.map((box, idx) => {
          const bounds = getBoxGeoBounds(box);
          if (!bounds) return null;
          return (
            <Rectangle
              key={box.id || idx}
              bounds={bounds}
              pathOptions={{
                color: '#22d3ee',
                weight: 2.5,
                fillColor: '#22d3ee',
                fillOpacity: 0.25,
              }}
            >
              <Tooltip sticky>
                <div className="font-sans text-xs p-1 text-black">
                  <div className="font-bold text-cyan-700">{box.label || 'Target'}</div>
                  <div className="text-[10px] text-slate-600 font-mono">
                    Confidence: {Math.round((box.confidence || 0.85) * 100)}%
                  </div>
                </div>
              </Tooltip>
            </Rectangle>
          );
        })}
      </MapContainer>
    </div>
  );
}
