import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bot } from 'lucide-react';
import { MenuVertical } from './ui/menu-vertical';
import AgencyLogo from './AgencyLogo';

export default function DesktopSidebarMenu({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  onOpenCapabilities,
  onOpenPaper,
  onOpenUserGuide,
  onOpenGuideBot,
  onOpenReport,
  onStartTour,
  isDarkMode = true,
}) {
  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const menuItems = [
    {
      label: 'Command Cockpit',
      purpose: 'Primary GIS reasoning workspace with multimodal satellite imagery, natural language spatial QA, and verified bounding box analysis powered by Qwen2.5-VL LoRA and RemoteCLIP.',
      active: activeTab === 'workspace',
      onClick: () => {
        onSelectTab('workspace');
        onClose();
      },
    },
    {
      label: 'Situational Twin',
      purpose: 'Live multi-hazard digital twin fusing real-time Open-Meteo weather forecasts, USGS seismic telemetry, and OSM geocoding with satellite observations.',
      active: activeTab === 'situational',
      onClick: () => {
        onSelectTab('situational');
        onClose();
      },
    },
    {
      label: 'Continuous Alerts Hub',
      purpose: 'Autonomous change-detection sentinel continuously monitoring designated AOIs for floods, wildland fires, and infrastructure anomalies.',
      active: activeTab === 'monitoring',
      onClick: () => {
        onSelectTab('monitoring');
        onClose();
      },
    },
    {
      label: 'HITL Active Learning',
      purpose: 'Human-in-the-Loop retraining studio enabling domain experts to refine detections, correct bounding boxes, and trigger active learning fine-tuning.',
      active: activeTab === 'hitl',
      onClick: () => {
        onSelectTab('hitl');
        onClose();
      },
    },
    {
      label: 'XAI Token Attention',
      purpose: 'Explainability dashboard showing cross-attention heatmaps to expose which satellite pixels and spectral bands guided the model reasoning.',
      active: activeTab === 'explainability',
      onClick: () => {
        onSelectTab('explainability');
        onClose();
      },
    },
    {
      label: 'GovTech API & SDK',
      purpose: 'Enterprise RESTful API gateway and Python SDK compatible with national portals like API Setu for automated ministry workflows.',
      active: activeTab === 'developers',
      onClick: () => {
        onSelectTab('developers');
        onClose();
      },
    },
    {
      label: 'Capabilities Suite',
      purpose: 'Interactive showroom of all 8 sovereign satellite AI tools, edge deployment modules, and ground validation pipelines.',
      onClick: () => {
        onClose();
        onOpenCapabilities?.();
      },
    },
    {
      label: 'Research Paper',
      purpose: 'Official 4-page academic manuscript in IEEE format detailing loss formulations, theoretical framework, and benchmark evaluations.',
      onClick: () => {
        onClose();
        onOpenPaper?.();
      },
    },
    {
      label: 'Who are you?',
      purpose: 'Sovereign executive briefing outlining SatQuery AI architecture, SIH 2026 problem statement alignment, and national deployment roadmap.',
      onClick: () => {
        onClose();
        onOpenUserGuide?.();
      },
    },
    {
      label: 'Guide Bot',
      purpose: 'Conversational AI assistant trained on satellite remote sensing, ISRO payloads, and platform mechanics for real-time inquiries.',
      onClick: () => {
        onClose();
        onOpenGuideBot?.();
      },
    },
    {
      label: '🚀 Cockpit Walkthrough Tour',
      purpose: 'Launch the game-style interactive spotlight walkthrough where GuideBot introduces every tool and feature step-by-step.',
      onClick: () => {
        onClose();
        onStartTour?.();
      },
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] hidden lg:flex justify-end">
          {/* Frosted Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Sleek Right Slide-out Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`relative z-10 w-full max-w-[360px] sm:max-w-[420px] h-full flex flex-col justify-between p-5 sm:p-6 overflow-y-auto shadow-[-20px_0_50px_rgba(0,0,0,0.5)] border-l ${
              isDarkMode
                ? 'bg-slate-950/95 text-white border-white/10'
                : 'bg-white/95 text-slate-900 border-slate-200'
            }`}
          >
            {/* Header Section */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-200/80 dark:border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl liquid-glass flex items-center justify-center p-1.5 shadow-sm">
                  <AgencyLogo domain="isro.gov.in" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight">SatQuery AI</h2>
                  <p className="text-[11px] text-slate-500 dark:text-white/50 font-mono">
                    ISRO • SIH26167 Command Menu
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl liquid-glass flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer border border-slate-200 dark:border-white/10"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Vertical Kinetic Navigation Menu */}
            <div className="py-5 flex-1 flex flex-col justify-start overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-white/15 pr-1">
              <MenuVertical
                menuItems={menuItems}
                color="#06b6d4"
                skew={-4}
                className="px-0 sm:px-1 gap-2.5 sm:gap-3"
              />
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between flex-shrink-0 text-xs font-mono text-slate-400 dark:text-white/40">
              <span className="text-[11px]">Smart India Hackathon 2026 • DOS</span>
              <span className="text-[10px]">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-sans text-[9px] text-slate-600 dark:text-white/70">Esc</kbd> to close
              </span>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
