import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Eye, 
  Layers, 
  Sliders, 
  Sparkles, 
  CheckCircle2, 
  Cpu, 
  Activity, 
  ShieldCheck, 
  Crosshair, 
  Download,
  Info,
  ExternalLink,
  Zap,
  BarChart3
} from 'lucide-react';
import AgencyLogo from '../AgencyLogo';
import AskGuideBotButton from '../AskGuideBotButton';

export default function ExplainabilityPage({ response, selectedAoi, onBackToCockpit, onAskGuideBot }) {
  const [heatmapOpacity, setHeatmapOpacity] = useState(65);
  const [selectedColormap, setSelectedColormap] = useState('turbo');
  const [activeLayer, setActiveLayer] = useState('fused'); // 'fused', 'optical', 'sar'
  const [selectedToken, setSelectedToken] = useState('inundated');

  const aoiName = selectedAoi?.name || "Brahmaputra Flood Basin & Inundation Zone";
  const opticalImage = selectedAoi?.sensors?.optical?.file 
    ? `/sample_aois/${selectedAoi.sensors.optical.file}`
    : "/sample_aois/brahmaputra_flood_optical_t2.png";

  const TOKEN_ATTRIBUTIONS = [
    { token: "inundated", weight: 0.38, sensor: "Sentinel-1 SAR + S2 NIR", focus: "Water-land boundary & soil saturation" },
    { token: "residential", weight: 0.24, sensor: "Sentinel-2 Optical (RGB)", focus: "Corrugated roof reflection & settlement cluster" },
    { token: "embankment", weight: 0.21, sensor: "Sentinel-1 SAR VV-Pol", focus: "Linear dyke corner-reflector backscatter" },
    { token: "vegetation", weight: 0.17, sensor: "Sentinel-2 NIR (Band 8)", focus: "Paddy crop canopy reflection" }
  ];

  const colormapGradients = {
    turbo: 'from-blue-600 via-emerald-500 via-yellow-400 to-rose-600',
    plasma: 'from-indigo-700 via-purple-600 via-rose-500 to-amber-400',
    viridis: 'from-indigo-900 via-teal-600 to-yellow-300'
  };

  return (
    <div className="w-full min-h-[calc(100vh-140px)] p-3 sm:p-5 md:p-6 flex flex-col gap-5 max-w-[1800px] mx-auto">
      
      {/* Quick Breadcrumb Back Button & Guide Bot Trigger */}
      <div className="flex items-center justify-between gap-3 -mb-1 flex-wrap">
        {onBackToCockpit && (
          <button
            onClick={onBackToCockpit}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full liquid-glass text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:scale-105 transition-transform self-start cursor-pointer"
          >
            <span>← Back to Command Cockpit</span>
          </button>
        )}
        <AskGuideBotButton 
          label="Ask Guide Bot about XAI"
          onClick={() => onAskGuideBot && onAskGuideBot("Explain the XAI Vision Token Attention Heatmap: what is the architecture and is it live or an illustrative UX mockup?")} 
        />
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
              <Eye className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Explainable AI (XAI) Vision Token Attention Heatmap
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-white/70 max-w-2xl">
            Transparent sub-pixel vision-language cross-attention maps. Inspect the exact image patches and sensory modalities that triggered the model's prediction.
          </p>
        </div>

        {/* Provenance Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-700 dark:text-violet-400 text-xs font-mono font-bold self-start md:self-center">
          <Sparkles className="w-4 h-4" />
          <span>ROADMAP VISION: NEXT-GEN CAPABILITY PREVIEW</span>
        </div>
      </div>

      {/* Main XAI Stage: Interactive Heatmap Viewer & Channel Weights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left 7 Cols: Image Heatmap Canvas */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div id="tour-explainability-box" className="p-5 rounded-3xl liquid-glass-strong bg-white/95 dark:bg-slate-950/95 border border-slate-200/80 dark:border-white/10 shadow-lg flex flex-col gap-4">
            
            {/* Canvas Header & Layer Selector */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10 flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <Crosshair className="w-4 h-4 text-cyan-500" />
                <span>Visual Cross-Attention Overlay ({aoiName})</span>
              </div>

              {/* Layer Selection Chips */}
              <div className="flex items-center gap-1.5 text-xs">
                {['fused', 'optical', 'sar'].map(layer => (
                  <button
                    key={layer}
                    onClick={() => setActiveLayer(layer)}
                    className={`px-2.5 py-1 rounded-xl font-semibold capitalize transition-all border ${
                      activeLayer === layer
                        ? 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-black border-cyan-500 shadow-sm'
                        : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70'
                    }`}
                  >
                    {layer} Layer
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Image with Attention Heatmap Overlay */}
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-white/10 shadow-inner group">
              {/* Base Satellite Raster Image */}
              <img
                src={opticalImage}
                alt="Base Satellite Scene"
                className="w-full h-full object-cover"
              />

              {/* Simulated Multi-Head Self-Attention (MHSA) Heatmap Overlay */}
              <div 
                className={`absolute inset-0 bg-gradient-to-tr ${colormapGradients[selectedColormap]} mix-blend-color-burn transition-opacity pointer-events-none`}
                style={{ opacity: heatmapOpacity / 100 }}
              />

              {/* High-Attention Hotspot Circles */}
              <div className="absolute inset-0 pointer-events-none">
                <div 
                  className="absolute top-[35%] left-[45%] w-24 h-24 rounded-full border-2 border-yellow-300 bg-yellow-400/30 animate-pulse flex items-center justify-center"
                  style={{ opacity: (heatmapOpacity / 100) }}
                >
                  <span className="text-[10px] font-mono font-bold text-black bg-yellow-300 px-1 rounded shadow">
                    Peak: 0.94
                  </span>
                </div>

                <div 
                  className="absolute top-[55%] left-[25%] w-20 h-20 rounded-full border border-rose-400 bg-rose-500/20 flex items-center justify-center"
                  style={{ opacity: (heatmapOpacity / 100) * 0.8 }}
                >
                  <span className="text-[9px] font-mono font-bold text-white bg-rose-600 px-1 rounded shadow">
                    0.82
                  </span>
                </div>
              </div>

              {/* Canvas HUD Controls Overlay */}
              <div className="absolute bottom-3 left-3 right-3 p-3 rounded-2xl bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-1">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  <span className="text-[11px] font-mono whitespace-nowrap">Heatmap Opacity: {heatmapOpacity}%</span>
                  <input
                    type="range"
                    min="10"
                    max="95"
                    value={heatmapOpacity}
                    onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
                    className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  {['turbo', 'plasma', 'viridis'].map(cm => (
                    <button
                      key={cm}
                      onClick={() => setSelectedColormap(cm)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono uppercase font-bold border transition-colors ${
                        selectedColormap === cm ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-white/10 text-white border-white/10'
                      }`}
                    >
                      {cm}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* XAI Finding Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs leading-relaxed">
              <span className="font-bold text-slate-900 dark:text-white block mb-1">
                Spatial Attention Diagnostic:
              </span>
              <p className="text-slate-700 dark:text-white/80">
                The Vision-Language Transformer concentrated <strong>38% of self-attention weights</strong> on the riverbank land-water boundary. The activation reflects dark radar backscatter from smooth standing water, confirming flood inundation rather than seasonal cloud shadow.
              </p>
            </div>

          </div>
        </div>

        {/* Right 5 Cols: Multi-Modal Channel Breakdown & Token Attributions */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          {/* Multi-Modal Sensor Fusion Contribution */}
          <div className="p-5 rounded-3xl liquid-glass-strong bg-white/95 dark:bg-slate-950/95 border border-slate-200/80 dark:border-white/10 shadow-lg flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Cross-Modal Sensory Contribution
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Layer Decomposition
              </span>
            </div>

            {/* Contribution Bars */}
            <div className="flex flex-col gap-2.5 text-xs">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-slate-800 dark:text-white">Sentinel-2 Optical (RGB Bands)</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-mono font-bold">42%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full" style={{ width: '42%' }} />
                </div>
                <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">Visual scene geometry &amp; roof footprints</span>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-slate-800 dark:text-white">Sentinel-2 NIR (Band 8 842nm)</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">33%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '33%' }} />
                </div>
                <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">Cellular chlorophyll absorption &amp; water absorption</span>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-slate-800 dark:text-white">Sentinel-1 C-SAR (VV/VH Radar)</span>
                  <span className="text-purple-600 dark:text-purple-400 font-mono font-bold">25%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: '25%' }} />
                </div>
                <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">Surface roughness &amp; dielectric constant validation</span>
              </div>
            </div>
          </div>

          {/* Token Attribution Breakdown */}
          <div className="p-5 rounded-3xl liquid-glass-strong bg-white/95 dark:bg-slate-950/95 border border-slate-200/80 dark:border-white/10 shadow-lg flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-500" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Query Token Spatial Weight Attribution
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  Top Tokens
                </span>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                {TOKEN_ATTRIBUTIONS.map((item, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setSelectedToken(item.token)}
                    className={`p-2.5 rounded-2xl border text-xs cursor-pointer transition-all flex flex-col gap-1 ${
                      selectedToken === item.token 
                        ? 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-500 text-slate-900 dark:text-white shadow-sm ring-1 ring-cyan-500/30'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-slate-900 dark:text-white">"{item.token}"</span>
                      <span className="text-cyan-600 dark:text-cyan-400 font-bold">{Math.round(item.weight * 100)}% Weight</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Sensors: {item.sensor}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-white/80 leading-tight">
                      {item.focus}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Export XAI Provenance Trace */}
            <button
              onClick={() => alert("✅ XAI Attention Matrix and Sub-Pixel Provenance Hash downloaded in GeoTIFF metadata format.")}
              className="w-full mt-2 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Certified XAI Provenance Report</span>
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}
