import React, { useState } from 'react';
import { Eye, Layers, Calendar, Radio, SlidersHorizontal, Grid } from 'lucide-react';

export default function ModalityViewer({ selectedAoi, selectedModality }) {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'slider'
  const [sliderPos, setSliderPos] = useState(50); // 0 to 100%

  if (!selectedAoi) return null;

  const sensors = selectedAoi.sensors || {};
  const isBiTemporal = Boolean(sensors.optical_t1 && sensors.optical_t2);
  const isCrossModal = Boolean(sensors.optical && sensors.sar);
  const hasPair = isBiTemporal || isCrossModal;

  const leftImg = isBiTemporal 
    ? `/data/sample_aois/${sensors.optical_t1?.file}` 
    : `/data/sample_aois/${sensors.optical?.file}`;
  const rightImg = isBiTemporal 
    ? `/data/sample_aois/${sensors.optical_t2?.file}` 
    : `/data/sample_aois/${sensors.sar?.file}`;

  const leftLabel = isBiTemporal ? "Time T1 (Baseline)" : "Optical MSI (RGB)";
  const rightLabel = isBiTemporal ? "Time T2 (Inundation)" : "Sentinel-1 SAR (Radar)";

  return (
    <div className="liquid-glass-strong p-3 sm:p-3.5 rounded-2xl flex flex-col gap-2 shadow-xl flex-shrink-0">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <h4 className="text-[11px] font-semibold tracking-tight text-slate-800 dark:text-white uppercase font-mono">
            Sensor Imagery & Cross-Modal Inspection
          </h4>
        </div>
        <div className="flex items-center gap-1.5">
          {hasPair && (
            <div className="flex items-center p-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[9px]">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-black font-semibold shadow-sm' 
                    : 'text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Grid className="w-2.5 h-2.5" />
                <span>Side-by-Side</span>
              </button>
              <button
                onClick={() => setViewMode('slider')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all ${
                  viewMode === 'slider' 
                    ? 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-black font-semibold shadow-sm' 
                    : 'text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-2.5 h-2.5" />
                <span>Swipe Slider</span>
              </button>
            </div>
          )}
          <span className="text-[9px] font-mono text-cyan-700 dark:text-cyan-300 font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 uppercase tracking-wider">
            {selectedModality.toUpperCase()}
          </span>
        </div>
      </div>

      {viewMode === 'slider' && hasPair ? (
        /* Interactive Comparison Swipe Slider */
        <div className="liquid-glass p-2 rounded-xl flex flex-col gap-1.5 border border-slate-200/60 dark:border-white/10">
          <div className="flex items-center justify-between text-[10px] font-mono px-1">
            <span className="text-cyan-600 dark:text-cyan-300 font-semibold flex items-center gap-1">◀ {leftLabel}</span>
            <span className="text-slate-500 dark:text-white/40 text-[9px]">Drag slider to compare</span>
            <span className="text-emerald-600 dark:text-emerald-300 font-semibold flex items-center gap-1">{rightLabel} ▶</span>
          </div>

          <div 
            className="relative rounded-xl overflow-hidden h-28 sm:h-32 xl:h-36 bg-black/60 select-none cursor-ew-resize border border-slate-200 dark:border-white/10"
            onMouseMove={(e) => {
              if (e.buttons === 1) {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                setSliderPos((x / rect.width) * 100);
              }
            }}
            onTouchMove={(e) => {
              const touch = e.touches[0];
              const rect = e.currentTarget.getBoundingClientRect();
              const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
              setSliderPos((x / rect.width) * 100);
            }}
          >
            {/* Background Right Image */}
            <img 
              src={rightImg} 
              alt="Right Layer" 
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />

            {/* Clipped Left Image */}
            <div 
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ width: `${sliderPos}%` }}
            >
              <img 
                src={leftImg} 
                alt="Left Layer" 
                className="absolute inset-0 w-full h-full object-cover"
                style={{ width: '100%', maxWidth: 'none' }}
              />
            </div>

            {/* Draggable Divider Bar */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,1)] pointer-events-none flex items-center justify-center"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="w-5 h-5 rounded-full bg-white text-black text-[9px] font-bold flex items-center justify-center shadow-xl border border-slate-900">
                ↔
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Standard Side-by-Side Grid */
        <div className="grid grid-cols-2 gap-2">
          {/* Optical Sensor */}
          {sensors.optical && (
            <div className="liquid-glass p-2 rounded-xl flex flex-col gap-1 border border-slate-200/60 dark:border-white/5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-800 dark:text-white/90 flex items-center gap-1">
                  <Eye className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                  Optical (S2)
                </span>
                <span className="font-mono text-[9px] text-slate-500 dark:text-white/40">10m RGB</span>
              </div>
              <div className="relative rounded-lg overflow-hidden h-24 sm:h-28 xl:h-32 bg-slate-100 dark:bg-black/40 flex items-center justify-center border border-slate-200 dark:border-white/5">
                <img 
                  src={`/data/sample_aois/${sensors.optical.file}`} 
                  alt="Optical MSI" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="hidden absolute inset-0 items-center justify-center text-[10px] text-slate-500 dark:text-white/40 font-mono">
                  [Sentinel-2 Tile]
                </div>
              </div>
            </div>
          )}

          {/* SAR Sensor */}
          {sensors.sar && (
            <div className="liquid-glass p-2 rounded-xl flex flex-col gap-1 border border-slate-200/60 dark:border-white/5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-800 dark:text-white/90 flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  SAR (S1)
                </span>
                <span className="font-mono text-[9px] text-slate-500 dark:text-white/40">VV+VH</span>
              </div>
              <div className="relative rounded-lg overflow-hidden h-24 sm:h-28 xl:h-32 bg-slate-100 dark:bg-black/40 flex items-center justify-center border border-slate-200 dark:border-white/5">
                <img 
                  src={`/data/sample_aois/${sensors.sar.file}`} 
                  alt="Sentinel-1 SAR" 
                  className="w-full h-full object-cover filter contrast-125"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="hidden absolute inset-0 items-center justify-center text-[10px] text-slate-500 dark:text-white/40 font-mono">
                  [Sentinel-1 Tile]
                </div>
              </div>
            </div>
          )}

          {/* Bi-temporal T1 */}
          {sensors.optical_t1 && (
            <div className="liquid-glass p-2 rounded-xl flex flex-col gap-1 border border-slate-200/60 dark:border-white/5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-800 dark:text-white/90 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                  T1 Baseline
                </span>
                <span className="font-mono text-[9px] text-slate-500 dark:text-white/40">2026-03</span>
              </div>
              <div className="relative rounded-lg overflow-hidden h-24 sm:h-28 xl:h-32 bg-slate-100 dark:bg-black/40 flex items-center justify-center border border-slate-200 dark:border-white/5">
                <img 
                  src={`/data/sample_aois/${sensors.optical_t1.file}`} 
                  alt="Time T1" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Bi-temporal T2 */}
          {sensors.optical_t2 && (
            <div className="liquid-glass p-2 rounded-xl flex flex-col gap-1 border border-slate-200/60 dark:border-white/5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-800 dark:text-white/90 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                  T2 Inundation
                </span>
                <span className="font-mono text-[9px] text-slate-500 dark:text-white/40">2026-07</span>
              </div>
              <div className="relative rounded-lg overflow-hidden h-24 sm:h-28 xl:h-32 bg-slate-100 dark:bg-black/40 flex items-center justify-center border border-slate-200 dark:border-white/5">
                <img 
                  src={`/data/sample_aois/${sensors.optical_t2.file}`} 
                  alt="Time T2" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
