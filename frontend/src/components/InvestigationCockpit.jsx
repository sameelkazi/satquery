import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Compass, 
  Layers, 
  Radio, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Download, 
  Sparkles, 
  ArrowRight,
  ExternalLink,
  Loader2,
  X
} from 'lucide-react';
import { runAgenticInvestigation } from '../api/client';
import AskGuideBotButton from './AskGuideBotButton';

export default function InvestigationCockpit({ 
  isOpen, 
  onClose, 
  selectedAoi,
  onApplyGroundedBoxes,
  isDarkMode = true,
  onAskGuideBot
}) {
  const [investigativeQuery, setInvestigativeQuery] = useState(
    "Is river ke paas illegal mining ya sand excavation ho rahi hai kya?"
  );
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [investigationResult, setInvestigationResult] = useState(null);

  const sampleQueries = [
    "Is river ke paas illegal mining ya sand excavation ho rahi hai kya?",
    "Detect unauthorized coastal land reclamation and jetty encroachment",
    "Identify unlicensed deforestation patches inside the reserve forest buffer",
    "Check downstream embankment integrity and flood risk breach points"
  ];

  const handleStartInvestigation = async (queryToRun) => {
    const q = queryToRun || investigativeQuery;
    setIsExecuting(true);
    setCurrentStepIndex(0);
    setInvestigationResult(null);

    // Simulate animated step progression
    const stepTimer1 = setTimeout(() => setCurrentStepIndex(1), 700);
    const stepTimer2 = setTimeout(() => setCurrentStepIndex(2), 1400);
    const stepTimer3 = setTimeout(() => setCurrentStepIndex(3), 2100);

    try {
      const sensors = selectedAoi?.sensors || {};
      const images = [];
      if (sensors.optical) images.push({ url_or_path: sensors.optical.url_or_path || `data/sample_aois/${sensors.optical.file}`, modality: 'optical' });
      if (sensors.optical_t1) images.push({ url_or_path: sensors.optical_t1.url_or_path || `data/sample_aois/${sensors.optical_t1.file}`, modality: 'optical', timestamp: sensors.optical_t1.date });
      if (sensors.optical_t2) images.push({ url_or_path: sensors.optical_t2.url_or_path || `data/sample_aois/${sensors.optical_t2.file}`, modality: 'optical', timestamp: sensors.optical_t2.date });
      if (sensors.sar) images.push({ url_or_path: sensors.sar.url_or_path || `data/sample_aois/${sensors.sar.file}`, modality: 'sar' });

      const res = await runAgenticInvestigation({
        query: q,
        images,
        aoi_id: selectedAoi?.id || 'aoi_01_hyderabad',
        aoi_name: selectedAoi?.name || 'Hyderabad Urban Corridor',
        bbox: selectedAoi?.bbox
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      setCurrentStepIndex(4);
      setInvestigationResult(res);
      if (res.grounded_boxes && onApplyGroundedBoxes) {
        onApplyGroundedBoxes(res.grounded_boxes);
      }
    } catch (err) {
      console.error("Investigation error:", err);
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[94vh] overflow-y-auto rounded-3xl liquid-glass-strong bg-white/95 dark:bg-[#070d1e]/95 text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/20 shadow-2xl p-4 sm:p-6 flex flex-col gap-5">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Agentic Investigation Orchestrator
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px] font-mono font-bold">
                  MULTI-TOOL AUTONOMOUS PLANNER
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-white/60">
                Chains RemoteCLIP, Qwen2.5-VL Grounding, Sentinel-1 SAR Backscatter &amp; ChangeFormer into an auditable intelligence dossier
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AskGuideBotButton 
              label="Ask Guide Bot"
              onClick={() => onAskGuideBot && onAskGuideBot("Explain the Agentic Investigation Orchestrator: how does it chain RemoteCLIP, Qwen2.5-VL Grounding, SAR dielectric backscatter, and bi-temporal change detection into an auditable intelligence dossier?")} 
            />
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full liquid-glass border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:scale-105 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Investigative Query Formulation Bar */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 p-1.5 rounded-2xl liquid-glass bg-slate-50/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-inner">
            <Search className="w-4 h-4 text-slate-400 dark:text-white/40 ml-2" />
            <input
              type="text"
              value={investigativeQuery}
              onChange={(e) => setInvestigativeQuery(e.target.value)}
              placeholder="Ask an investigative, open-ended question (e.g. Is river ke paas illegal mining ho rahi hai?)"
              className="w-full bg-transparent text-xs sm:text-sm font-sans text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none px-2"
              onKeyDown={(e) => e.key === 'Enter' && handleStartInvestigation()}
            />
            <button
              onClick={() => handleStartInvestigation()}
              disabled={isExecuting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all flex-shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{isExecuting ? 'Investigating...' : 'Launch Investigation'}</span>
            </button>
          </div>

          {/* Quick Preset Prompts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-white/40 flex-shrink-0">Presets:</span>
            {sampleQueries.map((sq, i) => (
              <button
                key={i}
                onClick={() => {
                  setInvestigativeQuery(sq);
                  handleStartInvestigation(sq);
                }}
                className="px-2.5 py-1 rounded-full liquid-glass border border-slate-200 dark:border-white/10 text-[11px] text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white truncate max-w-[280px] cursor-pointer"
                title={sq}
              >
                {sq}
              </button>
            ))}
          </div>
        </div>

        {/* 4-Step Autonomous Plan Progression Stepper */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[
            { step: 1, name: "Zero-Shot Semantic Probe", model: "RemoteCLIP (ViT-L/14)", icon: Search },
            { step: 2, name: "Spatial Bounding & Extent", model: "Qwen2.5-VL + Grounding-DINO", icon: Compass },
            { step: 3, name: "SAR Backscatter & Turbidity", model: "Sentinel-1 MoCo (VV+VH)", icon: Radio },
            { step: 4, name: "Bi-Temporal Alteration Vector", model: "ChangeFormer-V2", icon: Layers }
          ].map((s, idx) => {
            const isCompleted = currentStepIndex > idx || (currentStepIndex === 4 && investigationResult);
            const isCurrent = currentStepIndex === idx;
            const StepIcon = s.icon;

            return (
              <div
                key={s.step}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-1.5 ${
                  isCompleted
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                    : isCurrent
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-800 dark:text-rose-300 animate-pulse'
                    : 'bg-slate-50/50 dark:bg-white/5 border-slate-200/70 dark:border-white/10 text-slate-500 dark:text-white/50'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold">STEP 0{s.step}</span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-rose-500 animate-spin" />
                  ) : (
                    <span className="text-[10px] uppercase font-bold text-slate-400">QUEUED</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <StepIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{s.name}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 dark:text-white/60 truncate">
                  {s.model}
                </span>
              </div>
            );
          })}
        </div>

        {/* Synthesized Forensic Dossier Output Stage */}
        {investigationResult && (
          <div className="p-5 rounded-3xl liquid-glass bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/15 flex flex-col gap-4 shadow-xl animate-fade-in">
            
            {/* Dossier Header & Alert Tier */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-white text-xs font-bold font-mono uppercase tracking-wider ${
                  investigationResult.alert_tier === 'REVIEW_RECOMMENDED' ? 'bg-amber-600' : 'bg-slate-500'
                }`}>
                  {(investigationResult.alert_tier || 'INSUFFICIENT_EVIDENCE').replace(/_/g, ' ')}
                </span>
                {investigationResult.is_simulated && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-700 text-white text-[10px] font-bold font-mono uppercase">
                    Simulated (no backend)
                  </span>
                )}
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {investigationResult.threat_category}
                </h3>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-slate-500 dark:text-white/60">Confidence:</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">
                  {investigationResult.composite_confidence != null ? `${Math.round(investigationResult.composite_confidence * 100)}%` : 'N/A'}
                </span>
                <span className="text-slate-300 dark:text-white/20">|</span>
                <span className="text-slate-500 dark:text-white/60">Execution:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {investigationResult.total_latency_ms}ms
                </span>
              </div>
            </div>

            {/* Bilingual Executive Forensic Narrative */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-white/50">
                Executive Forensic Synthesis (Ground-Truthed Evidence)
              </h4>
              <p className="text-xs sm:text-sm font-sans text-slate-800 dark:text-white/90 leading-relaxed p-3 rounded-2xl bg-white/70 dark:bg-black/30 border border-slate-200/60 dark:border-white/10">
                {investigationResult.synthesis?.summary_en}
              </p>
              <p className="text-xs font-sans text-slate-700 dark:text-white/80 leading-relaxed p-3 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200/60 dark:border-cyan-500/20 font-medium">
                {investigationResult.synthesis?.summary_hi}
              </p>
              {investigationResult.synthesis?.disclaimer && (
                <p className="text-[11px] italic text-slate-500 dark:text-white/50 px-1">
                  {investigationResult.synthesis.disclaimer}
                </p>
              )}
            </div>

            {/* Statutory Compliance Violations & Recommended Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              
              {/* Statutory Legal Flags */}
              <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-500/20 flex flex-col gap-2">
                <h5 className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Regulatory Reference (context only, not a violation finding)</span>
                </h5>
                <ul className="flex flex-col gap-1.5 text-xs text-slate-700 dark:text-white/80">
                  {(investigationResult.synthesis?.regulatory_reference || []).map((flag, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommended Actions */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-500/20 flex flex-col gap-2">
                <h5 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Suggested Next Steps</span>
                </h5>
                <ul className="flex flex-col gap-1.5 text-xs text-slate-700 dark:text-white/80">
                  {(investigationResult.synthesis?.recommended_actions || []).map((action, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Footer Action */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-white/10 flex-wrap gap-2">
              <span className="text-[11px] font-mono text-slate-500 dark:text-white/50">
                Dossier Reference: {investigationResult.investigation_id} • Certified by RS-Agent Orchestrator
              </span>
              <button
                onClick={() => {
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-cyan-600 dark:bg-cyan-500 text-white dark:text-black text-xs font-bold hover:scale-105 transition-transform cursor-pointer"
              >
                <span>Inspect Bounding Boxes on Cockpit Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
