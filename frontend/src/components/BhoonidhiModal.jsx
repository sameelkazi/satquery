import React, { useState, useEffect } from 'react';
import { Globe, Satellite, Calendar, Layers, ShieldCheck, Download, Search, RefreshCw, X, Radio } from 'lucide-react';
import { searchSatelliteCatalog } from '../api/client';
import ThemeCloseButton from './ThemeCloseButton';
import AskGuideBotButton from './AskGuideBotButton';

export default function BhoonidhiModal({ isOpen, onClose, currentBbox, aoiName, onAskGuideBot }) {
  const [scenes, setScenes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState("2026-04-01");
  const [endDate, setEndDate] = useState("2026-08-27");
  const [filterSatellite, setFilterSatellite] = useState("all");

  useEffect(() => {
    if (isOpen) {
      handleSearch();
    }
  }, [isOpen, currentBbox]);

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const data = await searchSatelliteCatalog(currentBbox, startDate, endDate);
      setScenes(data.scenes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredScenes = filterSatellite === "all" 
    ? scenes 
    : scenes.filter(s => s.satellite.toLowerCase().includes(filterSatellite.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[88vh] flex flex-col rounded-3xl liquid-glass-strong bg-white/95 dark:bg-[#070d1e]/95 p-5 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-white/20 text-slate-900 dark:text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/10 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shadow-sm">
              <Globe className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Live Satellite Product Catalogue
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 font-medium">
                  ISRO Bhoonidhi • Copernicus OData
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-white/60 mt-0.5">
                Live scene lookup for current AOI: <span className="text-slate-900 dark:text-white font-semibold">{aoiName || "Active BBox"}</span> [{currentBbox?.map(n => n.toFixed(3)).join(', ')}]
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AskGuideBotButton 
              label="Ask Guide Bot"
              onClick={() => onAskGuideBot && onAskGuideBot("Explain the ISRO Bhoonidhi and Copernicus live catalog search integration: what APIs are queried and how are STAC metadata assets mapped?")} 
            />
            <ThemeCloseButton onClick={onClose} />
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4 p-3.5 rounded-2xl bg-slate-100/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs">
          <div>
            <label className="block text-[10px] uppercase font-mono text-slate-500 dark:text-white/50 mb-1 font-semibold">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-cyan-500 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-mono text-slate-500 dark:text-white/50 mb-1 font-semibold">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-cyan-500 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-mono text-slate-500 dark:text-white/50 mb-1 font-semibold">Constellation</label>
            <select
              value={filterSatellite}
              onChange={(e) => setFilterSatellite(e.target.value)}
              className="w-full bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 shadow-sm"
            >
              <option value="all" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">All Satellites</option>
              <option value="sentinel-2" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Sentinel-2 (Optical MSI)</option>
              <option value="sentinel-1" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Sentinel-1 (C-Band SAR)</option>
              <option value="resourcesat" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">ResourceSat-2 (ISRO LISS-IV)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-md cursor-pointer"
            >
              {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Fetch Passes</span>
            </button>
          </div>
        </div>

        {/* Scene Cards List */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-white/60">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
              <span className="text-xs font-mono">Querying Copernicus OData & Bhoonidhi registry...</span>
            </div>
          ) : filteredScenes.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-white/50 text-xs font-mono">
              No satellite granules found for selected date window and bbox.
            </div>
          ) : (
            filteredScenes.map((s, idx) => (
              <div 
                key={idx}
                className="p-3.5 rounded-2xl bg-white/95 dark:bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-200/80 dark:border-white/10 hover:border-cyan-500/50 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                    {s.satellite.includes('SAR') ? (
                      <Radio className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Satellite className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{s.satellite}</span>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${s.source === 'live' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'}`}>
                        {s.source === 'live' ? 'Live API Pass' : 'Catalogue Reference'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-white/40 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded border border-slate-200/80 dark:border-white/10">{s.resolution_m}m GSD</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-700 dark:text-white/70 mt-1 break-all">
                      {s.scene_id}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-white/50 mt-0.5">
                      Acquired: <span className="text-slate-900 dark:text-white/80 font-semibold font-mono">{s.acquisition_date ? new Date(s.acquisition_date).toLocaleString() : 'N/A'}</span> • {s.provider}
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-end justify-between gap-2 flex-shrink-0">
                  {s.polarization && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold">
                      {s.polarization}
                    </span>
                  )}
                  {s.bands && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 font-semibold">
                      {s.bands.length} Multispectral Bands
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
