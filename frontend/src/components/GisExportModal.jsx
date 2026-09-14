import React, { useState } from 'react';
import { 
  Globe2, 
  Download, 
  Copy, 
  Check, 
  X, 
  MapPin, 
  Layers, 
  FileCode, 
  FileSpreadsheet, 
  CheckCircle2, 
  Sparkles,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { 
  exportToGeoJson, 
  exportToKml, 
  exportToWktCsv, 
  triggerFileDownload, 
  boxToGeoCoords, 
  calculateBoxAreaSqKm 
} from '../utils/gisExport';
import AgencyLogo from './AgencyLogo';
import AskGuideBotButton from './AskGuideBotButton';

export default function GisExportModal({ 
  isOpen, 
  onClose, 
  response, 
  selectedAoi,
  onAskGuideBot
}) {
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState('');

  if (!isOpen || !response) return null;

  const { boxes = [], change_mask_geojson } = response;
  const aoiName = selectedAoi?.name || 'satellite_aoi';
  const cleanAoiSlug = aoiName.toLowerCase().replace(/[^a-z0-9]/g, '_');

  // Calculate total area across all detected bounding boxes
  let totalAreaSqKm = 0;
  const computedBoxes = boxes.map((box, idx) => {
    const geo = boxToGeoCoords(box, selectedAoi);
    let area = 0;
    if (geo) {
      area = calculateBoxAreaSqKm([geo.southLat, geo.westLon], [geo.northLat, geo.eastLon]);
      totalAreaSqKm += area;
    }
    return {
      ...box,
      geo,
      areaSqKm: area,
      areaHa: (area * 100).toFixed(1)
    };
  });

  const handleDownloadGeoJson = () => {
    const geojson = exportToGeoJson({ boxes, changeGeoJson: change_mask_geojson, aoi: selectedAoi, response });
    triggerFileDownload(geojson, `SatQuery_${cleanAoiSlug}_vector.geojson`, 'application/geo+json');
    triggerSuccessNotice('GeoJSON Layer Exported');
  };

  const handleDownloadKml = () => {
    const kml = exportToKml({ boxes, changeGeoJson: change_mask_geojson, aoi: selectedAoi, response });
    triggerFileDownload(kml, `SatQuery_${cleanAoiSlug}_bhuvan.kml`, 'application/vnd.google-earth.kml+xml');
    triggerSuccessNotice('ISRO Bhuvan KML Exported');
  };

  const handleDownloadCsv = () => {
    const csv = exportToWktCsv({ boxes, aoi: selectedAoi, response });
    triggerFileDownload(csv, `SatQuery_${cleanAoiSlug}_wkt_coordinates.csv`, 'text/csv');
    triggerSuccessNotice('WKT Coordinates CSV Exported');
  };

  const handleCopyGeoJson = () => {
    const geojson = exportToGeoJson({ boxes, changeGeoJson: change_mask_geojson, aoi: selectedAoi, response });
    navigator.clipboard.writeText(geojson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const triggerSuccessNotice = (msg) => {
    setDownloadSuccess(msg);
    setTimeout(() => setDownloadSuccess(''), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl liquid-glass-strong bg-white/95 dark:bg-[#070d1e]/95 p-5 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-white/20 flex flex-col gap-4 text-slate-900 dark:text-white">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-200/80 dark:border-white/10 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
              <Globe2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Bhuvan & QGIS Geospatial Export Suite
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 text-[10px] font-bold font-mono">
                  OGC Standards
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-white/70 mt-0.5">
                Export grounded spatial vector geometries for ISRO Bhuvan, QGIS, ArcGIS, and Google Earth Pro
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <AskGuideBotButton 
              onAsk={onAskGuideBot} 
              prompt="Explain the Bhuvan & QGIS Geospatial Export Suite: how are vector geometries, OGC formats (GeoJSON, KML, WKT), and SITREP reports with SHA-256 integrity hash generated?"
              label="Ask Guide Bot"
            />
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-white transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Success Toast Notice */}
        {downloadSuccess && (
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{downloadSuccess} Successfully!</span>
            </div>
            <span className="text-[10px] font-mono">WGS84 EPSG:4326</span>
          </div>
        )}

        {/* Spatial Summary Banner */}
        <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-center">
          <div className="p-2 rounded-xl bg-white dark:bg-white/10 border border-slate-200/60 dark:border-white/10">
            <div className="text-[10px] text-slate-500 dark:text-white/60 font-mono">DETECTED TARGETS</div>
            <div className="text-base sm:text-lg font-bold text-cyan-600 dark:text-cyan-400">{boxes.length} Vectors</div>
          </div>
          <div className="p-2 rounded-xl bg-white dark:bg-white/10 border border-slate-200/60 dark:border-white/10">
            <div className="text-[10px] text-slate-500 dark:text-white/60 font-mono">TOTAL DETECTED AREA</div>
            <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">{totalAreaSqKm.toFixed(2)} km²</div>
          </div>
          <div className="p-2 rounded-xl bg-white dark:bg-white/10 border border-slate-200/60 dark:border-white/10">
            <div className="text-[10px] text-slate-500 dark:text-white/60 font-mono">CRS DATUM</div>
            <div className="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400">EPSG:4326</div>
          </div>
        </div>

        {/* Primary Export Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* ISRO Bhuvan KML Card */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex flex-col justify-between gap-3 shadow-sm hover:border-cyan-500/40 transition-colors">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex-shrink-0">
                <Globe2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>ISRO Bhuvan / Google Earth KML</span>
                  <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-[9px] font-mono font-bold">.KML</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-white/60 mt-0.5 leading-snug">
                  OGC KML 2.2 vector polygons with styled bounding boxes and rich HTML telemetry balloons for ISRO Bhuvan & Google Earth.
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadKml}
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 font-bold text-xs shadow-md transition-transform active:scale-98"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Bhuvan KML</span>
            </button>
          </div>

          {/* QGIS / ArcGIS GeoJSON Card */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex flex-col justify-between gap-3 shadow-sm hover:border-emerald-500/40 transition-colors">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>QGIS &amp; ArcGIS GeoJSON Layer</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[9px] font-mono font-bold">.GEOJSON</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-white/60 mt-0.5 leading-snug">
                  RFC 7946 FeatureCollection with bounding polygons, calculated surface area, confidence metadata, and ChangeFormer layers.
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadGeoJson}
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-bold text-xs shadow-md transition-transform active:scale-98"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download QGIS GeoJSON</span>
            </button>
          </div>
        </div>

        {/* Secondary Actions: WKT CSV & Clipboard Copy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            onClick={handleDownloadCsv}
            className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-white transition-colors text-left"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <span>Download WKT Coordinates (.CSV)</span>
          </button>

          <button
            onClick={handleCopyGeoJson}
            className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-white transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-cyan-500" />}
            <span>{copied ? 'GeoJSON Copied to Clipboard!' : 'Copy Raw GeoJSON to Clipboard'}</span>
          </button>
        </div>

        {/* Detected Targets Area Table */}
        {computedBoxes.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-white/60">
              Grounded Targets Geographic Area Breakdown:
            </span>
            <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/5 divide-y divide-slate-100 dark:divide-white/5">
              {computedBoxes.map((b, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500" />
                    <span className="font-semibold text-slate-800 dark:text-white">{b.label || `Target #${idx + 1}`}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({Math.round((b.confidence || 0.88) * 100)}% conf)</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{b.areaSqKm} km²</span>
                    <span className="text-slate-500 dark:text-white/50">({b.areaHa} ha)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 dark:border-white/10 text-xs font-mono text-slate-500 dark:text-white/50">
          <span>Compatible with: ISRO Bhuvan • QGIS 3.x • ArcGIS Pro</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white font-semibold transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
