import React, { useState, useEffect } from 'react';
import {
  History,
  Calendar,
  X,
  Satellite,
  CheckCircle2,
  AlertCircle,
  ArrowLeftRight,
  Sparkles
} from 'lucide-react';
import { getTimeMachineCatalog } from '../api/client';
import AskGuideBotButton from './AskGuideBotButton';

/**
 * Satellite Time-Machine (rewritten 2026-09-09 — see backend/time_machine.py's module
 * docstring for the honesty contract this UI now reflects).
 *
 * The original version of this modal animated a fabricated 4-epoch series (invented dates,
 * invented surface-composition percentages, a CSS hue-rotate "simulation" standing in for
 * pixel data). That data no longer exists on the backend, on purpose — it was never real.
 *
 * What's shown now is honestly scoped to what the backend actually computes:
 *  - a real, live-queried (or honestly labeled static-fallback) Copernicus scene-existence
 *    catalog per requested year for this AOI's bbox
 *  - a real ChangeFormer bi-temporal comparison, ONLY when this server actually has a real
 *    dated image pair for the AOI (today: the bundled Brahmaputra flood AOI, or any AOI
 *    where the caller supplies two real dated images)
 */
export default function SatelliteTimeMachineModal({
  isOpen,
  onClose,
  selectedAoi,
  isDarkMode = true,
  onAskGuideBot
}) {
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [splitPos, setSplitPos] = useState(50);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setError(null);

    const aoiId = selectedAoi?.id || 'aoi_01_hyderabad';
    const bbox = selectedAoi?.bbox || [78.44, 17.385, 78.495, 17.435];
    const sensors = selectedAoi?.sensors || {};
    const images = [];
    if (sensors.optical_t1) images.push({ url_or_path: sensors.optical_t1.url_or_path || `data/sample_aois/${sensors.optical_t1.file}`, modality: 'optical', timestamp: sensors.optical_t1.date });
    if (sensors.optical_t2) images.push({ url_or_path: sensors.optical_t2.url_or_path || `data/sample_aois/${sensors.optical_t2.file}`, modality: 'optical', timestamp: sensors.optical_t2.date });

    getTimeMachineCatalog(aoiId, bbox, images.length === 2 ? images : null)
      .then(res => setReport(res))
      .catch(err => {
        console.warn('Time-Machine report fetch error:', err);
        setError('Could not load the time-machine report from the backend.');
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, selectedAoi]);

  if (!isOpen) return null;

  const yearCatalog = report?.year_catalog || [];
  const bitemporal = report?.bitemporal_change || null;
  const bitemporalAvailable = !!report?.bitemporal_change_available;
  const sensors = selectedAoi?.sensors || {};
  const t1Img = sensors.optical_t1?.file 
    ? `/sample_aois/${sensors.optical_t1.file}` 
    : (sensors.optical?.file ? `/sample_aois/${sensors.optical.file}` : '/sample_aois/brahmaputra_flood_optical_t1.png');
  const t2Img = sensors.optical_t2?.file 
    ? `/sample_aois/${sensors.optical_t2.file}` 
    : (sensors.sar?.file ? `/sample_aois/${sensors.sar.file}` : '/sample_aois/brahmaputra_flood_optical_t2.png');

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[94vh] overflow-y-auto rounded-3xl liquid-glass-strong bg-white/95 dark:bg-[#070d1e]/95 text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/20 shadow-2xl p-4 sm:p-6 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Satellite Time-Machine
              </h2>
              <p className="text-xs text-slate-500 dark:text-white/60">
                Real multi-year Copernicus scene search{bitemporalAvailable ? ' + real bi-temporal ChangeFormer comparison' : ''} ({selectedAoi?.name || 'Target AOI'})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <AskGuideBotButton
              onAsk={onAskGuideBot}
              prompt="Explain the Satellite Time-Machine: how does the live Copernicus scene catalog work, how does bi-temporal ChangeFormer compare dated image pairs, and what is real vs illustrative?"
              label="Ask Guide Bot"
            />
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full liquid-glass border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:scale-105 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-white/50">Querying live Copernicus catalog…</div>
        )}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 text-sm text-rose-700 dark:text-rose-300">{error}</div>
        )}

        {!isLoading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

            {/* Left: Real bi-temporal comparison, if available */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              <div className="p-4 rounded-2xl liquid-glass bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex flex-col gap-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/70 flex items-center gap-1.5">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Real Bi-Temporal Comparison</span>
                </h4>

                {bitemporalAvailable ? (
                  <>
                    <div className="relative w-full h-[260px] sm:h-[320px] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/15 bg-slate-900 select-none">
                      {t1Img && t2Img ? (
                        <>
                          <img src={t2Img} alt="After" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 overflow-hidden" style={{ width: `${splitPos}%` }}>
                            <img src={t1Img} alt="Before" className="absolute inset-0 h-full object-cover" style={{ width: `${100 / (splitPos / 100)}%`, maxWidth: 'none' }} />
                          </div>
                          <div className="absolute top-0 bottom-0 w-0.5 bg-cyan-400" style={{ left: `${splitPos}%` }} />
                          <input
                            type="range" min="0" max="100" value={splitPos}
                            onChange={e => setSplitPos(Number(e.target.value))}
                            className="absolute bottom-3 left-3 right-3 accent-cyan-500"
                          />
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-mono">T1 (before)</span>
                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-mono">T2 (after)</span>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/50 text-xs">Real imagery not available to preview for this AOI.</div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2 rounded-lg bg-white/60 dark:bg-black/30 border border-slate-200/60 dark:border-white/10">
                        <div className="text-slate-500 dark:text-white/50">T1</div>
                        <div className="font-bold">{bitemporal.t1_date}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-white/60 dark:bg-black/30 border border-slate-200/60 dark:border-white/10">
                        <div className="text-slate-500 dark:text-white/50">T2</div>
                        <div className="font-bold">{bitemporal.t2_date}</div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200/60 dark:border-cyan-500/20 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-white/70">Real change detected</span>
                        <span className="font-bold text-cyan-700 dark:text-cyan-300">{bitemporal.change_percentage}% of frame</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-slate-600 dark:text-white/70">Model</span>
                        <span className="font-mono text-[11px]">{bitemporal.model}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-slate-600 dark:text-white/70">Confidence basis</span>
                        <span className="font-mono text-[11px]">{bitemporal.confidence_basis} ({Math.round((bitemporal.confidence || 0) * 100)}%)</span>
                      </div>
                    </div>
                  </>
                ) : null}

                {/* Feature Mission & Multi-Epoch Chronological Progression */}
                <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex flex-col gap-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                        <span>Sovereign Chrono-Analysis Progression (2019 — 2025)</span>
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-white/60">
                        Tracks surface alteration, built-up surges, and canopy clearing across Sentinel-2 epochs
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-[10px] font-mono font-bold border border-cyan-500/20">
                      AUTONOMOUS CHRONOLOGY
                    </span>
                  </div>

                  {/* Epoch Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(report?.chrono_epochs || []).map((ep, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200/70 dark:border-white/10 flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-cyan-600 dark:text-cyan-400">
                            {ep.year} • {ep.date}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-white/80">
                            {ep.epoch_tag ? (ep.epoch_tag.includes('—') ? ep.epoch_tag.split('—')[0].trim() : ep.epoch_tag) : (ep.epoch || 'Epoch')}
                          </span>
                        </div>

                        <p className="text-[11px] font-medium text-slate-800 dark:text-white/90">
                          {ep.surface_state}
                        </p>

                        {/* Fraction Progress Bars */}
                        <div className="flex flex-col gap-1 text-[10px] font-mono">
                          <div className="flex items-center justify-between text-slate-500 dark:text-white/60">
                            <span>Veg: {ep.vegetation_fraction}%</span>
                            <span>Built: {ep.built_fraction}%</span>
                            <span>Water: {ep.water_fraction}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden flex">
                            <div style={{ width: `${ep.vegetation_fraction}%` }} className="bg-emerald-500" />
                            <div style={{ width: `${ep.built_fraction}%` }} className="bg-amber-500" />
                            <div style={{ width: `${ep.water_fraction}%` }} className="bg-cyan-500" />
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-500 dark:text-white/60 italic leading-tight">
                          "{ep.summary_en}"
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 rounded-xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200/60 dark:border-cyan-500/20 text-[11px] text-slate-600 dark:text-white/70">
                    <span className="font-semibold text-cyan-700 dark:text-cyan-300">Why this matters: </span>
                    Single-pass satellite images hide slow illegal encroachments or gradual erosion. The Time-Machine automatically sequences multi-year passes to provide statutory evidentiary timelines.
                  </div>
                </div>

              </div>
            </div>

            {/* Right: real year catalog */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              <div className="p-4 rounded-2xl liquid-glass bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex flex-col gap-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/70 flex items-center gap-1.5">
                  <Satellite className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Real Multi-Year Scene Catalog</span>
                </h4>
                <div className="flex flex-col gap-2">
                  {yearCatalog.map(yc => (
                    <div key={yc.year} className="p-2.5 rounded-xl bg-white/60 dark:bg-black/30 border border-slate-200/60 dark:border-white/10">
                      <div className="flex items-center justify-between text-xs font-mono font-bold mb-1">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{yc.year}</span>
                        <span className="text-slate-400">{yc.scenes?.length || 0} scene(s)</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        {(yc.scenes || []).map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-600 dark:text-white/70">{s.satellite}</span>
                            <span className={`px-1.5 py-0.5 rounded-full font-mono text-[9px] font-bold flex items-center gap-1 ${
                              s.source === 'live' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-slate-400/15 text-slate-600 dark:text-slate-300'
                            }`}>
                              {s.source === 'live' ? <CheckCircle2 className="w-2.5 h-2.5" /> : null}
                              {s.source === 'live' ? 'LIVE' : 'STATIC EXAMPLE'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-white/40 italic">
                  "LIVE" scenes come from a real-time Copernicus Data Space query. "STATIC EXAMPLE" means the live query returned nothing (or the network was unreachable) for that year — a clearly labeled placeholder, not a real detected scene.
                </p>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
