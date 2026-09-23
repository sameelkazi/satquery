import React from 'react';
import {
  Sparkles,
  History,
  ShieldAlert,
  Camera,
  Radio,
  ShieldCheck,
  Globe,
  FileText,
  Layers,
  ArrowRight,
  X,
  Compass,
  Cpu,
  Eye,
  CheckCircle2,
  Bot
} from 'lucide-react';
import AskGuideBotButton from './AskGuideBotButton';

export default function CapabilitiesMenuModal({
  isOpen,
  onClose,
  onOpenTimeMachine,
  onOpenInvestigation,
  onOpenArViewfinder,
  onOpenCatalog,
  onOpenReport,
  onOpenPaper,
  onRunStressTest,
  onOpenGuideBot,
  onAskGuideBot,
  onNavigateTab,
  onOpenHero,
  isDarkMode = true
}) {
  if (!isOpen) return null;

  const CAPABILITIES = [
    {
      id: 'guide_bot',
      title: 'SatQuery Guide Bot',
      badge: 'ASK ABOUT ANY FEATURE',
      badgeColor: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      icon: Bot,
      iconColor: 'text-indigo-500',
      description: 'Q&A assistant for judges — answers questions about features and technical architecture, grounded on the project\'s own documentation.',
      action: () => { onClose(); onOpenGuideBot?.(); }
    },
    {
      id: 'time_machine',
      title: 'Satellite Time-Machine',
      badge: '2019 — 2025 SENTINEL-2',
      badgeColor: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
      icon: History,
      iconColor: 'text-cyan-500',
      description: 'Multi-temporal pairwise ChangeFormer spatial alteration sequence with auto-narrated voiceover.',
      action: () => { onClose(); onOpenTimeMachine?.(); }
    },
    {
      id: 'investigation',
      title: 'Agentic Investigation Mode',
      badge: 'AUTONOMOUS 5-STEP PLANNER',
      badgeColor: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
      icon: ShieldAlert,
      iconColor: 'text-rose-500',
      description: 'Chains RemoteCLIP, Qwen2.5-VL Grounding, SAR Backscatter & ChangeFormer into a forensic dossier.',
      action: () => { onClose(); onOpenInvestigation?.(); }
    },
    {
      id: 'ar_viewfinder',
      title: 'AR Ground-Truth Viewfinder',
      badge: 'MOBILE WEBCAM + COMPASS',
      badgeColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
      icon: Camera,
      iconColor: 'text-purple-500',
      description: 'Live in-field camera feed projecting compass heading, NDVI health wireframes, and flood hazard lines.',
      action: () => { onClose(); onOpenArViewfinder?.(); }
    },
    {
      id: 'stress_test',
      title: 'Confidence Stress-Test (TTA)',
      badge: '5-TRIAL PERTURBATION CONSENSUS',
      badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
      icon: ShieldCheck,
      iconColor: 'text-amber-500',
      description: 'Executes affine rotation (±15°), spatial zoom, and gamma jitter trials to verify specialist model invariance.',
      action: () => { onClose(); onRunStressTest?.(); }
    },
    {
      id: 'grid_sweep',
      title: 'Overnight District Anomaly Sweep',
      badge: '16-ZONE RADAR SENTINEL',
      badgeColor: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
      icon: Radio,
      iconColor: 'text-rose-500',
      description: 'Automated spatial grid tiling and screening producing the Top 10 Critical Geospatial Anomalies digest.',
      action: () => { onClose(); onNavigateTab?.('monitoring'); }
    },
    {
      id: 'catalog',
      title: 'Copernicus & Bhoonidhi Catalog',
      badge: 'ISRO & ESA DATASETS',
      badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
      icon: Globe,
      iconColor: 'text-blue-500',
      description: 'Discover live open-access multi-spectral passes from Sentinel-2, Sentinel-1, and Bhoonidhi registries.',
      action: () => { onClose(); onOpenCatalog?.(); }
    },
    {
      id: 'audit_report',
      title: 'System Audit & Certified SITREP',
      badge: 'AUDITABLE TELEMETRY',
      badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      icon: FileText,
      iconColor: 'text-emerald-500',
      description: 'Execution telemetry trace, confidence provenance, and official certified SITREP PDF generation.',
      action: () => { onClose(); onOpenReport?.(); }
    },
    {
      id: 'research_paper',
      title: 'IEEE Research Paper Manuscript',
      badge: '4-PAGE CAMERA-READY',
      badgeColor: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      icon: Sparkles,
      iconColor: 'text-indigo-500',
      description: 'Read the official SatQuery scientific paper manuscript in embedded Google Drive document view.',
      action: () => { onClose(); onOpenPaper?.(); }
    },
    {
      id: 'xai_attention',
      title: 'XAI Token Attention Inspector',
      badge: 'EXPLAINABLE VLM',
      badgeColor: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
      icon: Eye,
      iconColor: 'text-yellow-500',
      description: 'Sub-pixel vision-language cross-attention maps showing exactly where models focus their receptive field.',
      action: () => { onClose(); onNavigateTab?.('explainability'); }
    },
    {
      id: 'hero_landing',
      title: 'Return to Hero Overview',
      badge: 'LANDING & ROSTER',
      badgeColor: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
      icon: Compass,
      iconColor: 'text-cyan-500',
      description: 'Return to the main full-screen 3D geospatial landing page, problem statement specs, and team roster.',
      action: () => { onClose(); onOpenHero?.(); }
    }
  ];

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/80 backdrop-blur-xl animate-fade-in font-sans">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl liquid-glass-strong bg-white/95 dark:bg-[#070d1e]/95 text-slate-900 dark:text-white border border-slate-200/90 dark:border-white/20 shadow-2xl p-4 sm:p-6 md:p-7 flex flex-col gap-4 sm:gap-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  SatQuery Sovereign Intelligence Suite
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 text-[10px] font-mono font-bold">
                  SIH26167
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-white/60">
                All next-generation remote sensing, forensic, and field capabilities in one unified command center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AskGuideBotButton 
              label="Ask Guide Bot"
              onClick={() => {
                onClose();
                onAskGuideBot?.("Give me a comprehensive overview of all SatQuery sovereign capabilities and architecture.");
              }} 
            />
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full liquid-glass border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:scale-105 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2-Column Responsive Grid of Capabilities (1-Col on mobile, 2-Col on tablet/laptop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
          {CAPABILITIES.map((cap) => {
            const CapIcon = cap.icon;
            return (
              <div
                key={cap.id}
                onClick={cap.action}
                className="group p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 hover:border-cyan-500/50 dark:hover:border-cyan-400/40 hover:bg-slate-50 dark:hover:bg-white/10 transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-sm hover:shadow-md hover:scale-[1.01]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl bg-slate-100 dark:bg-white/10 ${cap.iconColor}`}>
                      <CapIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                        {cap.title}
                      </h3>
                      <span className={`inline-block mt-0.5 px-2 py-0.2 rounded-full text-[9px] font-mono font-bold border ${cap.badgeColor}`}>
                        {cap.badge}
                      </span>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-400 dark:text-white/40 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                </div>

                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-white/70 leading-relaxed">
                  {cap.description}
                </p>

                {cap.id !== 'guide_bot' && (
                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                        onAskGuideBot?.(`Explain the ${cap.title} capability: ${cap.description} and what models/pipelines power it.`);
                      }}
                      className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Bot className="w-3 h-3" />
                      <span>Ask Guide Bot about this</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-white/10 text-xs text-slate-500 dark:text-white/50 flex-wrap gap-2">
          <span>Sovereign Earth Observation Intelligence • ISRO Problem Statement SIH26167</span>
          <span className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold">
            All Systems Calibrated &amp; Ready
          </span>
        </div>

      </div>
    </div>
  );
}
