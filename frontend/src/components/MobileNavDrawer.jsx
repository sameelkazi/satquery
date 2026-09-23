import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  FileText,
  Bot,
  Sparkles,
  History,
  ShieldAlert,
  Camera,
  ShieldCheck,
  Globe,
  Compass,
  Radio,
  UserCheck,
  Eye,
  Terminal,
  ChevronRight,
  Layers,
  Home,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import AgencyLogo from './AgencyLogo';

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.26, ease: 'easeOut' }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.22, ease: 'easeIn' }
  }
};

const sheetVariants = {
  hidden: { 
    y: '100%',
    opacity: 0.95
  },
  visible: { 
    y: 0,
    opacity: 1,
    transition: { 
      type: 'spring',
      damping: 32,
      stiffness: 340,
      mass: 0.75,
      restDelta: 0.5
    }
  },
  exit: { 
    y: '100%',
    opacity: 0.95,
    transition: { 
      duration: 0.24, 
      ease: [0.32, 0, 0.67, 0] 
    }
  }
};

export default function MobileNavDrawer({
  isOpen,
  onClose,
  onOpenReport,
  onOpenGuideBot,
  onOpenUserGuide,
  onOpenCapabilities,
  onOpenTimeMachine,
  onOpenInvestigation,
  onOpenArViewfinder,
  onOpenCatalog,
  onOpenPaper,
  onRunStressTest,
  onNavigateTab,
  onOpenHero,
  onStartTour,
  activeTab = 'workspace',
  isDarkMode = true
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="mobile-nav-root"
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[2600] flex flex-col justify-end lg:hidden font-sans"
        >
          {/* Backdrop Scrim */}
          <motion.div
            key="mobile-drawer-backdrop"
            variants={backdropVariants}
            className="absolute inset-0 bg-black/65"
            onClick={onClose}
          />

          {/* Bottom Sliding Sheet Container — iOS Native Spring Dynamics */}
          <motion.div
            key="mobile-drawer-sheet"
            variants={sheetVariants}
            className="relative z-10 w-full max-h-[86vh] overflow-y-auto overscroll-contain rounded-t-3xl bg-white dark:bg-[#090e24] text-slate-900 dark:text-white border-t border-slate-200 dark:border-white/15 shadow-2xl p-4 sm:p-5 flex flex-col gap-4"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {/* Grab Handle */}
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-white/20 mx-auto -mt-1 mb-1" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <AgencyLogo domain="isro.gov.in" className="w-6 h-5 object-contain" />
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                    SatQuery Command Studio
                  </h3>
                  <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-semibold">
                    ISRO SIH26167 • Quick Navigation
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Primary Action Hero Cards (User Guide, Audit Report & Guide Bot) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400 dark:text-white/40 px-1">
                Priority Operations
              </span>

              {/* Sovereign User Guide: Who are you? */}
              <button
                type="button"
                onClick={() => { onClose(); onOpenUserGuide?.(); }}
                className="w-full p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/35 text-left flex items-center justify-between gap-3 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-sm cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs flex-shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        Who are you?
                      </h4>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                        User Guide
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-white/60 truncate">
                      Official Guide for Government Ministries &amp; SIH Judges
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. Certified SITREP Audit Report */}
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenReport?.(); }}
                  className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/30 text-left flex flex-col justify-between gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                      PDF Export
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      Audit SITREP Report
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-white/60 line-clamp-1">
                      Certified telemetry &amp; evidence
                    </p>
                  </div>
                </button>

                {/* 2. SatQuery Guide Bot */}
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenGuideBot?.(); }}
                  className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/10 border border-indigo-500/30 text-left flex flex-col justify-between gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                      AI Assistant
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      SatQuery Guide Bot
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-white/60 line-clamp-1">
                      Architecture &amp; evaluator Q&amp;A
                    </p>
                  </div>
                </button>
              </div>

              {/* 3. Cockpit Interactive Walkthrough Tour */}
              <button
                type="button"
                onClick={() => { onClose(); onStartTour?.(); }}
                className="p-3 rounded-2xl bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-indigo-500/15 border border-cyan-500/35 flex items-center justify-between gap-3 text-left hover:border-cyan-500/60 transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center flex-shrink-0 border border-cyan-500/30 shadow-xs">
                    <Sparkles className="w-4 h-4 text-cyan-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      🚀 Interactive Cockpit Tour
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-white/60 truncate">
                      GuideBot spotlight walkthrough across all tools
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-cyan-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </button>
            </div>

            {/* Remote Sensing Flagship Engines */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400 dark:text-white/40 px-1">
                Specialist Engines &amp; Field Tools
              </span>

              <div className="flex flex-col gap-1.5">
                {/* Time Machine */}
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenTimeMachine?.(); }}
                  className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 text-left hover:border-cyan-500/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center flex-shrink-0">
                      <History className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        Satellite Time-Machine
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-white/55 truncate">
                        2019–2025 Multi-temporal pairwise change detection
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>

                {/* Autonomous Investigation */}
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenInvestigation?.(); }}
                  className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 text-left hover:border-rose-500/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        Agentic Investigation Mode
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-white/55 truncate">
                        Autonomous 5-stage geospatial forensic planner
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>

                {/* AR Viewfinder */}
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenArViewfinder?.(); }}
                  className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 text-left hover:border-purple-500/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        AR Ground-Truth Viewfinder
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-white/55 truncate">
                        Mobile camera feed with live compass &amp; hazard overlay
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>

                {/* Confidence Stress Test */}
                <button
                  type="button"
                  onClick={() => { onClose(); onRunStressTest?.(); }}
                  className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 text-left hover:border-amber-500/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        Confidence Stress-Test (TTA)
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-white/55 truncate">
                        5-trial affine rotation &amp; noise model invariance
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>

                {/* Copernicus & Bhoonidhi Catalog */}
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenCatalog?.(); }}
                  className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 text-left hover:border-blue-500/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        Bhoonidhi &amp; Copernicus Catalog
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-white/55 truncate">
                        Live satellite registry &amp; scene discovery
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>

                {/* IEEE Research Manuscript */}
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenPaper?.(); }}
                  className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 text-left hover:border-indigo-500/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-gradient-to-tr from-amber-400 to-orange-500 text-[8px] font-black text-slate-950 items-center justify-center ring-1 ring-white/90 animate-attention-beacon leading-none select-none">
                          !
                        </span>
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        IEEE Research Manuscript
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-white/55 truncate">
                        Official 4-page camera-ready paper &amp; methodology
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              </div>
            </div>

            {/* Quick Workspace Switchers & Hero Exit */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-200/60 dark:border-white/10">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400 dark:text-white/40 px-1">
                Workspaces &amp; Home
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { onClose(); onNavigateTab?.('situational'); }}
                  className={`p-2.5 rounded-xl text-left border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'situational'
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300'
                      : 'bg-slate-100/60 dark:bg-white/5 border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-white/80'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 text-cyan-500" />
                  <span className="truncate">Situational Twin</span>
                </button>

                <button
                  type="button"
                  onClick={() => { onClose(); onNavigateTab?.('monitoring'); }}
                  className={`p-2.5 rounded-xl text-left border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'monitoring'
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300'
                      : 'bg-slate-100/60 dark:bg-white/5 border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-white/80'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 text-rose-500" />
                  <span className="truncate">Continuous Alerts</span>
                </button>

                <button
                  type="button"
                  onClick={() => { onClose(); onNavigateTab?.('explainability'); }}
                  className={`p-2.5 rounded-xl text-left border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'explainability'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                      : 'bg-slate-100/60 dark:bg-white/5 border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-white/80'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-amber-500" />
                  <span className="truncate">XAI Heatmap</span>
                </button>

                {/* Return to Hero Page */}
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenHero?.(); }}
                  className="p-2.5 rounded-xl text-left border border-slate-200/80 dark:border-white/15 bg-slate-200/50 dark:bg-white/10 text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2 transition-all cursor-pointer hover:bg-cyan-500/20"
                >
                  <Home className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span className="truncate">Hero Landing</span>
                </button>
              </div>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
