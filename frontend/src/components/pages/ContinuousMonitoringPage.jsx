import React, { useState, useEffect } from 'react';
import { getDistrictGridSweep } from '../../api/client';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Send, 
  Sliders, 
  Smartphone, 
  MessageSquare, 
  Mail, 
  Webhook, 
  CheckCircle2, 
  AlertTriangle, 
  Wheat, 
  Waves, 
  Building2, 
  Droplet, 
  Camera, 
  Upload, 
  Clock, 
  TrendingDown, 
  TrendingUp, 
  ShieldCheck,
  Radio,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Sparkles
} from 'lucide-react';
import AgencyLogo from '../AgencyLogo';
import AskGuideBotButton from '../AskGuideBotButton';

const MONITORING_SECTORS = [
  {
    id: "agriculture",
    title: "Agriculture & Crop Stress",
    ministry: "MoA & FW / ICAR",
    domainLogo: "icar.org.in",
    icon: Wheat,
    color: "emerald",
    aoi: "Ludhiana Intensive Agri Belt, Punjab",
    metric: "NDVI Vegetation Anomaly: -18.4%",
    status: "CRITICAL STRESS DETECTED",
    statusType: "danger",
    ministryDashboard: {
      headline: "District-Level Wheat Crop Health Telemetry",
      summary: "Vegetation index drop of 18.4% across 4,200 hectares in Ludhiana West. Correlates with moisture deficit detected in Sentinel-1 SAR dielectric roughness.",
      action: "Advisory issued to State Agriculture Directorate for canal water release."
    },
    citizenAlert: {
      channel: "Kisan WhatsApp & SMS Broadcast",
      recipient: "Farmer Sukhwinder Singh (Khasra #42/8)",
      message: "🌾 किसान सलाह (MoA/ICAR): आपके खेत में वनस्पति स्वास्थ्य इंडेक्स 18% कम दर्ज किया गया है। नजदीकी नहर से सिंचाई तुरंत शुरू करें और फसल में पीला रतुआ (Yellow Rust) की जांच करें।"
    }
  },
  {
    id: "disaster",
    title: "Flood Inundation & Disaster Evacuation",
    ministry: "NDMA (MHA)",
    domainLogo: "ndma.gov.in",
    icon: Waves,
    color: "rose",
    aoi: "Brahmaputra Flood Basin, Assam",
    metric: "Submerged Area: 14.28 sq. km (+210%)",
    status: "SEVERE FLOOD INUNDATION",
    statusType: "danger",
    ministryDashboard: {
      headline: "Real-Time Flood Extent & Population Exposure",
      summary: "AdaptFormer-CD detected 14.28 km² new flood inundation. Estimated 18,400 residents in 6 riverine villages exposed to rising backwater.",
      action: "NDRF 1st Battalion deployed to Morigaon & Kamrup riverbank sectors."
    },
    citizenAlert: {
      channel: "Cell Broadcast Emergency Alert (CAP)",
      recipient: "Geo-targeted citizens within 5km radius",
      message: "🚨 NDMA EMERGENCY ALERT: Brahmaputra water level exceeded danger mark by 1.4m. Low-lying residents of Morigaon Sector-3 must evacuate immediately to Relief Shelter #12."
    }
  },
  {
    id: "urban",
    title: "Urban Encroachment & Green Cover Loss",
    ministry: "MoHUA (Smart Cities)",
    domainLogo: "mohua.gov.in",
    icon: Building2,
    color: "amber",
    aoi: "Hyderabad Urban Corridor & Hussain Sagar",
    metric: "Unauthorized Construction: 2.8 Hectares",
    status: "BUFFER ZONE ENCROACHMENT",
    statusType: "warning",
    ministryDashboard: {
      headline: "Lake FTL & Green Buffer Monitoring",
      summary: "Bi-temporal change detection flagged new concrete slab foundation (1,800 m²) inside Hussain Sagar 50-meter Full Tank Level (FTL) green buffer.",
      action: "Automated enforcement notice generated for Greater Hyderabad Municipal Corporation (GHMC)."
    },
    citizenAlert: {
      channel: "Citizen RWA & Crowdsourced Ground-Truth",
      recipient: "Local Resident Welfare Association (RWA)",
      message: "🏙️ GHMC Alert: Satellite detected unauthorized structure near Lake Buffer. Local residents: Verify ground-truth photo via SatQuery Citizen Portal."
    }
  },
  {
    id: "water",
    title: "Reservoir Depletion & Water Security",
    ministry: "Ministry of Jal Shakti",
    domainLogo: "isro.gov.in",
    icon: Droplet,
    color: "cyan",
    aoi: "Osman Sagar & Himayat Sagar Catchments",
    metric: "Reservoir Surface Shrinkage: -12.6%",
    status: "ELEVATED WATER DEFICIT",
    statusType: "warning",
    ministryDashboard: {
      headline: "Catchment Volume & Groundwater Trend",
      summary: "NDWI water surface mask shrunk by 12.6% over 90 days. Estimated storage deficit of 0.85 TMC compared to 5-year seasonal baseline.",
      action: "Panchayat irrigation rotation schedule triggered to conserve drinking water reserves."
    },
    citizenAlert: {
      channel: "Panchayat Irrigation Advisory SMS",
      recipient: "Water Users Association (WUA) Committee",
      message: "💧 जल शक्ति सलाह: जलाशय जलस्तर में 12% की कमी दर्ज हुई है। अगले 14 दिनों तक सिंचाई रोटेशन नियम 3 लागू रहेगा। ड्रिप/स्प्रिंकलर विधि अपनाएं।"
    }
  }
];

export default function ContinuousMonitoringPage({ onBackToCockpit, selectedAoi, onAskGuideBot }) {
  const [activeSector, setActiveSector] = useState(MONITORING_SECTORS[0]);
  const [sweepData, setSweepData] = useState(null);
  const [isSweepLoading, setIsSweepLoading] = useState(false);
  const [sweepError, setSweepError] = useState(null);

  const runSweep = async () => {
    setIsSweepLoading(true);
    setSweepError(null);
    try {
      const aoiId = selectedAoi?.id || 'aoi_01_hyderabad';
      const aoiName = selectedAoi?.name || 'Hyderabad Metropolitan Region';
      const bbox = selectedAoi?.bbox || [78.44, 17.385, 78.495, 17.435];
      const sensors = selectedAoi?.sensors || {};
      const primaryImg = sensors.optical || sensors.optical_t2 || sensors.optical_t1;
      const images = primaryImg
        ? [{ url_or_path: primaryImg.url_or_path || `data/sample_aois/${primaryImg.file}`, modality: 'optical' }]
        : null;
      const res = await getDistrictGridSweep(aoiId, aoiName, bbox, images);
      setSweepData(res);
    } catch (err) {
      console.warn('Grid sweep fetch error:', err);
      setSweepError('Could not run the grid sweep against the backend.');
    } finally {
      setIsSweepLoading(false);
    }
  };

  useEffect(() => {
    runSweep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAoi]);

  const [alertThreshold, setAlertThreshold] = useState(15);
  const [isSimulatingDispatch, setIsSimulatingDispatch] = useState(false);
  const [dispatchHistory, setDispatchHistory] = useState([]);
  
  // Citizen Crowdsourced Ground-Truth Verification Feed
  const [citizenReports, setCitizenReports] = useState([
    {
      id: "REP-01",
      user: "Ramesh Sharma (Farmer, Ludhiana)",
      type: "Crop Health Ground Truth",
      verified: true,
      text: "Field inspection confirmed yellow patches on leaves in Plot 42B. Moisture deficit matched satellite NDVI report.",
      time: "12 mins ago"
    },
    {
      id: "REP-02",
      user: "Sunita Das (RWA Secretary, Hyderabad)",
      type: "Encroachment Verification",
      verified: true,
      text: "Uploaded photo of construction perimeter fencing near FTL boundary. Encroachment verified on-ground.",
      time: "45 mins ago"
    }
  ]);
  const [newReportText, setNewReportText] = useState("");

  const handleSimulateDispatch = () => {
    setIsSimulatingDispatch(true);
    setTimeout(() => {
      const newAlert = {
        id: `ALT-${Math.floor(1000 + Math.random() * 9000)}`,
        sector: activeSector.title,
        recipient: activeSector.citizenAlert.recipient,
        channel: activeSector.citizenAlert.channel,
        time: new Date().toLocaleTimeString(),
        status: "DELIVERED via SMS Gateway / Webhook"
      };
      setDispatchHistory(prev => [newAlert, ...prev]);
      setIsSimulatingDispatch(false);
    }, 900);
  };

  const handleAddCitizenReport = (e) => {
    e.preventDefault();
    if (!newReportText.trim()) return;
    const rep = {
      id: `REP-0${citizenReports.length + 1}`,
      user: "Analyst / Local Observer",
      type: `${activeSector.title} Ground Truth`,
      verified: true,
      text: newReportText,
      time: "Just now"
    };
    setCitizenReports([rep, ...citizenReports]);
    setNewReportText("");
  };

  const Icon = activeSector.icon;

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
          label="Ask Guide Bot about Monitoring"
          onClick={() => onAskGuideBot && onAskGuideBot("Explain the Continuous Monitoring & Alerting pipeline: how are temporal anomalies detected, and what parts are backend-wired vs dashboard concepts?")} 
        />
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
              <Radio className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Continuous Monitoring &amp; Multi-Ministry Automated Alerting
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-white/70 max-w-2xl">
            Autonomous change polling across Indian AOIs. Converts "query once" tool into a proactive early warning engine bridging Ministries to grassroots citizens.
          </p>
        </div>

        {/* Live Monitoring Pulse Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-700 dark:text-violet-400 text-xs font-mono font-bold self-start md:self-center">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ROADMAP VISION: NEXT-GEN CAPABILITY PREVIEW</span>
        </div>
      </div>

      {/* Sector Navigation Selector Tabs */}
      <div id="tour-monitoring-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {MONITORING_SECTORS.map((sector) => {
          const isSelected = activeSector.id === sector.id;
          const SectorIcon = sector.icon;
          return (
            <button
              key={sector.id}
              onClick={() => setActiveSector(sector)}
              className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2.5 shadow-sm cursor-pointer ${
                isSelected
                  ? 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-500 dark:border-cyan-400 text-slate-900 dark:text-white shadow-md shadow-cyan-500/10 scale-[1.01]'
                  : 'bg-white/80 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl ${isSelected ? 'bg-white/15 text-white dark:bg-black/15 dark:text-black' : 'bg-slate-100 dark:bg-white/10 text-cyan-600 dark:text-cyan-400'}`}>
                  <SectorIcon className="w-4 h-4" />
                </div>
                <AgencyLogo domain={sector.domainLogo} className="w-6 h-6 object-contain" />
              </div>

              <div>
                <span className={`text-[10px] font-mono font-bold block uppercase tracking-wider ${isSelected ? 'text-cyan-300 dark:text-cyan-700' : 'text-slate-500 dark:text-white/50'}`}>
                  {sector.ministry}
                </span>
                <h3 className="text-xs sm:text-sm font-bold truncate">
                  {sector.title}
                </h3>
              </div>
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Grid Anomaly Sweep: real RemoteCLIP zero-shot screening over a real tiled AOI image */}
      {/* (2026-09-09 rewrite -- see backend/grid_sweep.py's module docstring. The original   */}
      {/* version of this block was a fully static table naming real government agencies      */}
      {/* against fictional incidents; that version must never ship.)                         */}
      {/* ------------------------------------------------------------------- */}
      <div className="p-5 rounded-3xl liquid-glass-strong bg-white/95 dark:bg-slate-950/95 border border-slate-200/80 dark:border-white/10 shadow-xl flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Grid Anomaly Screening Sweep
                </h2>
                {sweepData?.is_simulated && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-700 text-white text-[10px] font-mono font-bold uppercase">
                    Simulated (no backend)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-white/60">
                Real RemoteCLIP zero-shot tagging over a real tiled crop of this AOI's bundled image — a screening signal, not a confirmed finding.
              </p>
            </div>
          </div>
          <button
            onClick={runSweep}
            disabled={isSweepLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-cyan-600 dark:bg-cyan-500 text-white dark:text-black text-xs font-bold shadow-sm hover:scale-105 transition-transform disabled:opacity-50 cursor-pointer"
          >
            {isSweepLoading ? 'Scanning…' : 'Run Sweep'}
          </button>
        </div>

        {sweepError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-700 dark:text-rose-300">{sweepError}</div>
        )}

        {sweepData?.status === 'no_imagery_available' && (
          <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-500/30 text-xs text-amber-800 dark:text-amber-200">
            {sweepData.reason}
          </div>
        )}

        {sweepData?.status === 'ok' && (
          <>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 dark:text-white/60 font-semibold">
                {sweepData.grid_size} grid — {sweepData.total_zones_scanned} zones scanned, {sweepData.notable_zones_count} notable
              </span>
              <span className="text-[10px] text-slate-400">{sweepData.scope_disclosure}</span>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/70">
                Notable Zones (ranked by real zero-shot similarity score)
              </h3>
              {sweepData.top_anomalies.length === 0 ? (
                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-200">
                  No notable zones — every tile's top match was an unremarkable land-cover category.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-slate-200/80 dark:border-white/10 text-[11px] font-mono text-slate-500 dark:text-white/50">
                        <th className="pb-2">Zone</th>
                        <th className="pb-2">Top Real Zero-Shot Label</th>
                        <th className="pb-2">Score</th>
                        <th className="pb-2">Est. Area</th>
                        <th className="pb-2">Typical Regulator (reference only)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-sans">
                      {sweepData.top_anomalies.map((item) => (
                        <tr key={item.zone_id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <td className="py-2.5 font-mono font-semibold">{item.zone_id}</td>
                          <td className="py-2.5 font-medium text-slate-800 dark:text-white/90">{item.top_label}</td>
                          <td className="py-2.5 font-mono text-cyan-700 dark:text-cyan-400">{Math.round((item.top_score || 0) * 100)}%</td>
                          <td className="py-2.5 font-mono text-slate-600 dark:text-white/70">{item.estimated_hectares ? `${item.estimated_hectares} ha` : '—'}</td>
                          <td className="py-2.5 text-[11px] text-slate-500 dark:text-white/60">{item.typical_regulator_reference || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {/* Main Dual View: Ministry Command Dashboard vs Grassroots Citizen Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left 7 Cols: Ministry Level Dashboard & Automated Threshold Engine */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          {/* Active Sector Summary Card */}
          <div className="p-5 rounded-3xl liquid-glass-strong bg-white/95 dark:bg-slate-950/95 border border-slate-200/80 dark:border-white/10 shadow-lg flex flex-col gap-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200/80 dark:border-white/10 gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-bold">
                    {activeSector.ministry} • Command Overview
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {activeSector.ministryDashboard.headline}
                  </h2>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                activeSector.statusType === 'danger' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30' : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
              }`}>
                {activeSector.status}
              </span>
            </div>

            {/* Metric Callout */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-500 dark:text-white/50 block">DETECTED ANOMALY</span>
                <span className="text-base sm:text-lg font-extrabold text-rose-600 dark:text-rose-400">
                  {activeSector.metric}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-500 dark:text-white/50 block">MONITORED AOI</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-white">
                  {activeSector.aoi}
                </span>
              </div>
            </div>

            {/* Ministry Actionable Briefing */}
            <div className="text-xs sm:text-sm text-slate-700 dark:text-white/80 leading-relaxed">
              <p className="mb-2">{activeSector.ministryDashboard.summary}</p>
              <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-500/20 text-xs font-medium text-cyan-900 dark:text-cyan-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                <span><strong>Policy Action:</strong> {activeSector.ministryDashboard.action}</span>
              </div>
            </div>

            {/* Automated Alert Threshold Configuration Slider */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-slate-700 dark:text-white/80 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-500" />
                  Autonomous Trigger Threshold:
                </span>
                <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md">
                  {alertThreshold}% Anomaly
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <span className="text-[10px] text-slate-500 dark:text-white/50 font-mono">
                When bi-temporal change exceeds {alertThreshold}%, SatQuery will automatically dispatch multi-channel warnings.
              </span>
            </div>
          </div>

          {/* Crowdsourced Ground-Truth Citizen Feed */}
          <div className="p-5 rounded-3xl liquid-glass-strong bg-white/95 dark:bg-slate-950/95 border border-slate-200/80 dark:border-white/10 shadow-lg flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-white/10">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Citizen RWA &amp; Farmer Ground-Truth Verification Feed
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 dark:text-white/50">
                Active Feedback Loop
              </span>
            </div>

            {/* Feed Items */}
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {citizenReports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{rep.user}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{rep.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-white/70 leading-snug">
                    "{rep.text}"
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold mt-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Ground-Truth Confirmed</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Observation Form */}
            <form onSubmit={handleAddCitizenReport} className="flex gap-2 mt-1">
              <input
                type="text"
                value={newReportText}
                onChange={(e) => setNewReportText(e.target.value)}
                placeholder="Analyst or citizen observation note..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-black font-semibold text-xs transition-transform active:scale-95 shadow-sm"
              >
                Submit Truth
              </button>
            </form>
          </div>

        </div>

        {/* Right 5 Cols: Grassroots Citizen Alert & Dispatch Simulator */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          {/* Simulated Citizen Mobile Payload Card */}
          <div className="p-5 rounded-3xl liquid-glass-strong bg-white/95 dark:bg-slate-950/95 border border-slate-200/80 dark:border-white/10 shadow-lg flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Citizen Mobile Alert Payload
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold">
                  {activeSector.citizenAlert.channel}
                </span>
              </div>

              {/* Simulated Phone Notification Screen */}
              <div className="mt-4 p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-white/50 border-b border-slate-200 dark:border-white/10 pb-2">
                  <span className="font-mono font-bold">GOV-ALERT DISPATCH</span>
                  <span>Recipient: {activeSector.citizenAlert.recipient}</span>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-xs leading-relaxed font-sans text-slate-800 dark:text-white/95 shadow-sm">
                  {activeSector.citizenAlert.message}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-white/40 pt-1 font-mono">
                  <span>Protocol: CAP v1.2 / TRAI DLT</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">READY TO FIRE</span>
                </div>
              </div>

              {/* Dispatch Action Button */}
              <button
                onClick={handleSimulateDispatch}
                disabled={isSimulatingDispatch}
                className="w-full mt-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg hover:shadow-cyan-500/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {isSimulatingDispatch ? (
                  <span>Transmitting Alert via SMS / WhatsApp Gateway…</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Trigger Live Alert Simulation</span>
                  </>
                )}
              </button>
            </div>

            {/* Real-Time Dispatch Log */}
            <div>
              <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider block mb-1.5">
                Recent Outbound Dispatches:
              </span>
              <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 divide-y divide-slate-200/60 dark:divide-white/5">
                {dispatchHistory.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400 font-mono">
                    Click trigger above to simulate alert dispatch.
                  </div>
                ) : (
                  dispatchHistory.map((d) => (
                    <div key={d.id} className="p-2.5 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{d.sector}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{d.recipient}</span>
                      </div>
                      <div className="text-right font-mono text-[10px]">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold block">{d.status}</span>
                        <span className="text-slate-400">{d.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
