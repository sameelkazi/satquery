import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Rocket,
  Database,
  Users,
  Globe2,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  Eye,
  Activity,
  Maximize2,
  CloudRain,
  Flame,
  Radio,
  Layers,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Landmark,
  FileText,
  FileCode,
  ImageIcon,
  FileCheck2
} from 'lucide-react';
import AgencyLogo from './AgencyLogo';
import ThemeCloseButton from './ThemeCloseButton';
import AskGuideBotButton from './AskGuideBotButton';

// Safe theme mappings for Tailwind purge safety
const THEMES = {
  cyan: {
    badgeBg: 'bg-cyan-500/15',
    badgeBorder: 'border-cyan-500/30',
    badgeText: 'text-cyan-600 dark:text-cyan-300',
    accentText: 'text-cyan-600 dark:text-cyan-400',
    bgCard: 'bg-cyan-50/70 dark:bg-cyan-950/20',
    borderCard: 'border-cyan-200/90 dark:border-cyan-500/30',
    borderActive: 'border-cyan-500',
    pillActive: 'bg-cyan-600 dark:bg-cyan-500 text-white border-cyan-400 shadow-cyan-500/30',
    iconBg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-600 dark:text-cyan-400',
    progress: 'from-cyan-500 to-blue-500',
    glow: 'rgba(6, 182, 212, 0.25)',
  },
  emerald: {
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-600 dark:text-emerald-300',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    bgCard: 'bg-emerald-50/70 dark:bg-emerald-950/20',
    borderCard: 'border-emerald-200/90 dark:border-emerald-500/30',
    borderActive: 'border-emerald-500',
    pillActive: 'bg-emerald-600 dark:bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/30',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    progress: 'from-emerald-500 to-teal-500',
    glow: 'rgba(16, 185, 129, 0.25)',
  },
  violet: {
    badgeBg: 'bg-violet-500/15',
    badgeBorder: 'border-violet-500/30',
    badgeText: 'text-violet-600 dark:text-violet-300',
    accentText: 'text-violet-600 dark:text-violet-400',
    bgCard: 'bg-violet-50/70 dark:bg-violet-950/20',
    borderCard: 'border-violet-200/90 dark:border-violet-500/30',
    borderActive: 'border-violet-500',
    pillActive: 'bg-violet-600 dark:bg-violet-500 text-white border-violet-400 shadow-violet-500/30',
    iconBg: 'bg-violet-500/15 border-violet-500/30 text-violet-600 dark:text-violet-400',
    progress: 'from-violet-500 to-fuchsia-500',
    glow: 'rgba(139, 92, 246, 0.25)',
  },
  amber: {
    badgeBg: 'bg-amber-500/15',
    badgeBorder: 'border-amber-500/30',
    badgeText: 'text-amber-600 dark:text-amber-300',
    accentText: 'text-amber-600 dark:text-amber-400',
    bgCard: 'bg-amber-50/70 dark:bg-amber-950/20',
    borderCard: 'border-amber-200/90 dark:border-amber-500/30',
    borderActive: 'border-amber-500',
    pillActive: 'bg-amber-600 dark:bg-amber-500 text-white border-amber-400 shadow-amber-500/30',
    iconBg: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400',
    progress: 'from-amber-500 to-orange-500',
    glow: 'rgba(245, 158, 11, 0.25)',
  },
};

const ROADMAP_PAGES = [
  {
    id: 'near_term',
    stepNumber: '01',
    horizon: 'Near-Term',
    title: 'BigEarthNet.txt Scale-Up & Grounding Hardening',
    icon: Database,
    themeColor: 'cyan',
    badgeText: 'Pipeline Built • GPU Run Next',
    vision: 'Our fine-tuning today already answers most held-out questions correctly (84% by LLM-judge). The next step scales the same recipe onto BigEarthNet.txt — the exact dataset ISRO names as the primary adaptation source — and rebalances training toward referring-expression examples to sharpen localization.',
    whyItWins: 'This is not a hope — the data pipeline (filter, extract, cache) is already written and tested. What is left is GPU time, and our new full-checkpoint resume means that time is never wasted again, even across accounts.',
    conceptImage: '/roadmap/bigearthnet_scaleup.jpg',
    conceptCaption: 'AI Satellite Vision: Multispectral patch tokenization with grounded bounding-box coordinate reasoning.',
    researchDiagram: '/roadmap/bigearthnet_generation.svg',
    researchTitle: 'Official BigEarthNet.txt Multimodal Generation & Filtering Pipeline',
    researchSource: 'TU Berlin BIFOLD • arXiv:2603.29630 (Official Dataset Paper)',
    diagramType: 'pipeline',
    diagramNodes: [
      { step: '01', title: 'Filter Dataset', detail: '9.55M rows → real referring expression pairs', tag: 'Data Clean' },
      { step: '02', title: 'Streamed Extraction', detail: 'Disk-bounded patch raster extraction', tag: 'Sentinel S1/S2' },
      { step: '03', title: 'LoRA Fine-Tuning', detail: 'Rebalanced LoRA pass on Qwen2.5-VL', tag: 'GPU Cluster' },
      { step: '04', title: 'Spatial Benchmark', detail: 'Honest Acc@0.5 IoU grounding report', tag: 'WGS84 EPSG:4326' },
    ],
    links: [
      { label: 'BigEarthNet.txt on HuggingFace', href: 'https://huggingface.co/datasets/BIFOLD-BigEarthNetv2-0/BigEarthNet.txt' },
      { label: 'arXiv:2603.29630 (dataset paper)', href: 'https://arxiv.org/abs/2603.29630' },
    ]
  },
  {
    id: 'mid_term',
    stepNumber: '02',
    horizon: 'Mid-Term',
    title: 'Multi-Source Situational Intelligence',
    icon: Compass,
    themeColor: 'emerald',
    badgeText: 'Weather + Seismic Live Today',
    vision: 'Satellite reasoning gets stronger when it is not looking at pixels alone. Our Situational Twin already cross-references live weather (Open-Meteo) and real-time seismic activity (USGS) against every query. The vision: extend this into active-fire telemetry (NASA FIRMS), a human-in-the-loop correction queue that feeds back into training, and a transparent attention-heatmap view so every answer shows its own reasoning.',
    whyItWins: 'Grounding an answer in external, independently-verifiable data sources is a stronger auditability story than any single model claim — and it directly answers the Problem Statement’s call for auditable execution.',
    conceptImage: '/roadmap/situational_intelligence.jpg',
    conceptCaption: 'Global Situational Twin: Real-time sensor fusion fusing weather radar, USGS seismic ripples, and NASA FIRMS active fire telemetry.',
    researchDiagram: '/roadmap/nasa_earthdata_operations.jpg',
    researchTitle: 'NASA Earth Science Data Operations & LANCE NRT Telemetry Network',
    researchSource: 'NASA EOSDIS & LANCE Rapid Hazard Response Architecture',
    diagramType: 'hub',
    diagramNodes: [
      { icon: CloudRain, label: 'Open-Meteo', sub: 'Precipitation & cloud radar', status: 'Live Today' },
      { icon: Activity, label: 'USGS Seismic', sub: 'Earthquake epicenters & mag', status: 'Live Today' },
      { icon: Flame, label: 'NASA FIRMS', sub: 'Active thermal wildfire spots', status: 'Next Sprint' },
      { icon: ShieldCheck, label: 'Analyst Feedback', sub: 'Human-in-the-loop audit loop', status: 'Active Queue' },
    ],
    links: [
      { label: 'Open-Meteo (live today)', href: 'https://open-meteo.com/' },
      { label: 'USGS Earthquake Feed (live today)', href: 'https://earthquake.usgs.gov/' },
      { label: 'NASA FIRMS (planned)', href: 'https://firms.modaps.eosdis.nasa.gov/' },
    ]
  },
  {
    id: 'long_term',
    stepNumber: '03',
    horizon: 'Long-Term',
    title: 'Ministry-to-Citizen Digital Twin',
    icon: Users,
    themeColor: 'violet',
    badgeText: 'One Engine, Two Audiences',
    vision: 'The same continuous change-monitoring engine serves two audiences from one pipeline: a ministry dashboard for policy-grade district analytics (NDMA, MoA, MoHUA, INCOIS), and a plain-language WhatsApp/SMS channel so a farmer or a resident gets the same insight in their own language — no app install required.',
    whyItWins: 'Most hackathon submissions stop at the dashboard. Closing the loop to the citizen, in the language and channel they already use, is what turns a monitoring tool into genuine public infrastructure — directly in the spirit of ISRO’s civilian-benefit mandate.',
    conceptImage: '/roadmap/ministry_citizen_twin.jpg',
    conceptCaption: 'Dual Delivery Pipeline: High-resolution GIS analytics for NDMA/Ministries & localized automated SMS/WhatsApp civilian dispatch.',
    researchDiagram: '/roadmap/cap_emergency_architecture.png',
    researchTitle: 'Common Alerting Protocol (CAP ITU-T X.1303 / IPAWS) Standard Architecture',
    researchSource: 'WMO / ITU-T Disaster Response & NDMA SACHET Implementation',
    diagramType: 'bridge',
    diagramNodes: [
      {
        channel: 'Ministry Command Console',
        icon: Landmark,
        target: 'NDMA • MoA • MoHUA • INCOIS',
        format: 'Policy-grade district analytics, Vector GeoJSON polygons, time-series anomaly charts',
        badge: 'High-Resolution GIS'
      },
      {
        channel: 'Continuous Monitoring Engine',
        icon: Cpu,
        target: 'SatQuery Siamese ViT Core',
        format: 'Sub-pixel change detection, cloud masking, automated severity scoring',
        badge: 'Unified Backbone'
      },
      {
        channel: 'Citizen Broadcast Channel',
        icon: Smartphone,
        target: 'Farmers • Village Councils • Citizens',
        format: 'Zero-install WhatsApp / SMS in 12 Indian languages with geo-fenced flood & crop alerts',
        badge: 'Civic Benefit'
      }
    ],
    links: []
  },
  {
    id: 'ecosystem',
    stepNumber: '04',
    horizon: 'Ecosystem',
    title: 'GovTech Integration & Next-Gen Specialists',
    icon: Globe2,
    themeColor: 'amber',
    badgeText: 'Sandbox Wired • Production Path Clear',
    vision: 'Our Developer Hub already speaks the API Setu contract end-to-end against its public sandbox, so plugging into production government data-sharing infrastructure is an onboarding step, not a rebuild. In parallel, we are evaluating published, remote-sensing-pretrained models such as EarthDial (CVPR 2025) as additional specialists once their inference profile is verified on free-tier hardware.',
    whyItWins: 'Designing for interoperability with India’s own GovTech stack from day one means this project can plug into real agency workflows instead of staying a standalone demo.',
    conceptImage: '/roadmap/govtech_apisetu.jpg',
    conceptCaption: 'Digital India GovTech Data Highway: Sovereign API Setu federation & EarthDial CVPR 2025 foundation model interoperability.',
    researchDiagram: '/roadmap/earthdial_model_architecture.png',
    researchDiagramSecondary: '/roadmap/apisetu_architecture.png',
    researchTitle: 'EarthDial Model Architecture: Multi-Modal RS Foundation Transformer (CVPR 2025)',
    researchSecondaryTitle: 'Official National API Setu Service Mesh Architecture (MeitY)',
    researchSource: 'CVPR 2025 (IBM / MBZUAI) & MeitY API Setu Documentation',
    diagramType: 'pipeline',
    diagramNodes: [
      { step: '01', title: 'SatQuery Core', detail: 'Dual-branch VLM & Siamese Change Pipeline', tag: 'Production Core' },
      { step: '02', title: 'API Setu Gateway', detail: 'National data-sharing contract sandbox verified', tag: 'Digital India' },
      { step: '03', title: 'EarthDial CVPR 2025', detail: 'Remote-sensing pretrained dialogue specialist', tag: 'SOTA Evaluation' },
      { step: '04', title: 'Public GovTech SDK', detail: 'Zero-barrier integration for state portals', tag: 'Open Governance' },
    ],
    links: [
      { label: 'API Setu Directory', href: 'https://directory.apisetu.gov.in/' },
      { label: 'EarthDial (CVPR 2025)', href: 'https://github.com/hiyamdebary/EarthDial' },
    ]
  }
];

export default function FutureRoadmapModal({ isOpen, onClose, onAskGuideBot }) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [activeMediaTab, setActiveMediaTab] = useState('research'); // 'research', 'concept', 'interactive'
  const [activeSecondaryDiagram, setActiveSecondaryDiagram] = useState(false);
  const [lightboxData, setLightboxData] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setCurrentPageIndex(prev => Math.min(prev + 1, ROADMAP_PAGES.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setCurrentPageIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        if (lightboxData) {
          setLightboxData(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, lightboxData]);

  if (!isOpen) return null;

  const currentItem = ROADMAP_PAGES[currentPageIndex];
  const Icon = currentItem.icon;
  const progressPercent = Math.round(((currentPageIndex + 1) / ROADMAP_PAGES.length) * 100);
  const theme = THEMES[currentItem.themeColor] || THEMES.cyan;

  const handleNext = () => {
    setCurrentPageIndex(prev => Math.min(prev + 1, ROADMAP_PAGES.length - 1));
    setActiveSecondaryDiagram(false);
  };
  const handlePrev = () => {
    setCurrentPageIndex(prev => Math.max(prev - 1, 0));
    setActiveSecondaryDiagram(false);
  };

  const currentResearchImg = activeSecondaryDiagram && currentItem.researchDiagramSecondary
    ? currentItem.researchDiagramSecondary
    : currentItem.researchDiagram;

  const currentResearchTitle = activeSecondaryDiagram && currentItem.researchSecondaryTitle
    ? currentItem.researchSecondaryTitle
    : currentItem.researchTitle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-5xl max-h-[94vh] overflow-y-auto rounded-3xl bg-white/95 dark:bg-[#080d1d]/95 p-4 sm:p-6 md:p-7 shadow-2xl border border-slate-200/90 dark:border-white/15 flex flex-col justify-between gap-4 sm:gap-5 text-slate-900 dark:text-white transition-colors duration-300"
        style={{
          boxShadow: `0 25px 50px -12px ${theme.glow}`
        }}
      >

        {/* Modal Top Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-slate-200/80 dark:border-white/10 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-1.5 sm:p-2 rounded-2xl bg-white dark:bg-white/10 shadow-sm border border-slate-200/80 dark:border-white/10 flex items-center gap-2">
              <AgencyLogo domain="isro.gov.in" className="w-10 h-7 object-contain" />
              <div className="w-[1px] h-6 bg-slate-200 dark:bg-white/20" />
              <Rocket className="w-6 h-6 text-violet-500 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Vision & Scaling Roadmap
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-700 dark:text-violet-300 text-xs font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Grounded in What We’ve Already Built
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-white/70 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-slate-800 dark:text-white">SIH26167</span>
                <span className="text-slate-400">•</span>
                <span>Real Research Papers, Official GovTech Architectures & AI System Vision</span>
              </p>
            </div>
          </div>

          {/* Actions & Close */}
          <div className="flex items-center gap-2">
            <AskGuideBotButton 
              label="Ask Guide Bot"
              onClick={() => onAskGuideBot && onAskGuideBot(`Explain the SatQuery roadmap for ${currentItem.title}: what parts are operational vs future vision?`)} 
            />
            <ThemeCloseButton onClick={onClose} />
          </div>
        </div>

        {/* Stepper Navigation Pills with Progress Bar */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {ROADMAP_PAGES.map((page, idx) => {
              const isSelected = idx === currentPageIndex;
              const PageIcon = page.icon;
              const pageTheme = THEMES[page.themeColor] || THEMES.cyan;
              return (
                <button
                  key={page.id}
                  onClick={() => {
                    setCurrentPageIndex(idx);
                    setActiveSecondaryDiagram(false);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 border cursor-pointer ${
                    isSelected
                      ? `${pageTheme.pillActive} shadow-lg scale-[1.02]`
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  <PageIcon className="w-4 h-4" />
                  <span className="font-mono text-[11px] opacity-75">{page.stepNumber}</span>
                  <span>{page.horizon}</span>
                </button>
              );
            })}
          </div>

          {/* Glowing Animated Progress Bar */}
          <div className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${theme.progress} transition-all duration-300 rounded-full shimmer-bar`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Dynamic Multipage Card Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            className="flex flex-col gap-4"
          >
            {/* Page Header Card */}
            <div className="p-4 rounded-2xl bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${theme.iconBg} border flex-shrink-0 shadow-sm`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <div className={`text-[11px] font-mono uppercase tracking-wider ${theme.accentText} font-bold flex items-center gap-1.5`}>
                    <span>{currentItem.horizon}</span>
                    <span className="opacity-40">•</span>
                    <span>Roadmap Pillar {currentItem.stepNumber}</span>
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-snug">
                    {currentItem.title}
                  </h3>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full ${theme.badgeBg} border ${theme.badgeBorder} ${theme.badgeText} font-mono text-xs font-bold flex-shrink-0 self-start sm:self-center`}>
                {currentItem.badgeText}
              </span>
            </div>

            {/* Visual Showcase (Research Paper Diagram + AI System Visual + Interactive Flow) */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-900/5 dark:bg-black/30 overflow-hidden shadow-inner p-3 sm:p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-200/60 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <FileCode className={`w-4 h-4 ${theme.accentText}`} />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-white/80">
                    Scientific Architecture & System Visuals
                  </span>
                </div>

                {/* Switcher: Research Paper Diagram vs AI Concept vs Interactive Flow */}
                <div className="flex items-center gap-1.5 bg-slate-200/80 dark:bg-white/10 p-1 rounded-xl text-[11px] font-semibold">
                  <button
                    onClick={() => setActiveMediaTab('research')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      activeMediaTab === 'research'
                        ? 'bg-white dark:bg-white/20 shadow-xs text-slate-900 dark:text-white font-bold'
                        : 'text-slate-600 dark:text-white/60 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <span>Research Paper Diagram</span>
                  </button>

                  <button
                    onClick={() => setActiveMediaTab('concept')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      activeMediaTab === 'concept'
                        ? 'bg-white dark:bg-white/20 shadow-xs text-slate-900 dark:text-white font-bold'
                        : 'text-slate-600 dark:text-white/60 hover:text-slate-900'
                    }`}
                  >
                    <ImageIcon className={`w-3.5 h-3.5 ${theme.accentText}`} />
                    <span>AI Mission Visual</span>
                  </button>

                  <button
                    onClick={() => setActiveMediaTab('interactive')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      activeMediaTab === 'interactive'
                        ? 'bg-white dark:bg-white/20 shadow-xs text-slate-900 dark:text-white font-bold'
                        : 'text-slate-600 dark:text-white/60 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-violet-500" />
                    <span>Interactive Pipeline</span>
                  </button>
                </div>
              </div>

              {/* Media Content Display */}
              <div className="min-h-[260px] flex flex-col justify-center">
                
                {/* 1. Research Paper Diagram View */}
                {activeMediaTab === 'research' && (
                  <div className="flex flex-col gap-2">
                    {currentItem.researchDiagramSecondary && (
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => setActiveSecondaryDiagram(false)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                            !activeSecondaryDiagram
                              ? `${theme.pillActive}`
                              : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70'
                          }`}
                        >
                          CVPR 2025 EarthDial Architecture
                        </button>
                        <button
                          onClick={() => setActiveSecondaryDiagram(true)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                            activeSecondaryDiagram
                              ? `${theme.pillActive}`
                              : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70'
                          }`}
                        >
                          National API Setu Gateway
                        </button>
                      </div>
                    )}

                    <div 
                      onClick={() => setLightboxData({
                        src: currentResearchImg,
                        title: currentResearchTitle,
                        source: currentItem.researchSource
                      })}
                      className="relative group rounded-xl overflow-hidden border border-slate-200/80 dark:border-white/15 bg-white shadow-md cursor-pointer hover:border-cyan-500/50 transition-all"
                    >
                      <div className="w-full h-[280px] sm:h-[330px] flex items-center justify-center p-3 bg-white">
                        <img
                          src={currentResearchImg}
                          alt={currentResearchTitle}
                          className="max-h-full w-auto max-w-full object-contain transition-transform group-hover:scale-[1.02]"
                        />
                      </div>

                      <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/75 hover:bg-black text-white backdrop-blur-md transition-all flex items-center gap-1.5 text-[11px] font-mono shadow-md border border-white/20">
                        <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Click to Enlarge / Zoom</span>
                      </div>

                      <div className="p-2.5 bg-slate-900 text-white flex items-center justify-between flex-wrap gap-2 text-xs border-t border-slate-800">
                        <span className="font-bold flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-cyan-400" />
                          {currentResearchTitle}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/80 border border-white/20">
                          Source: {currentItem.researchSource}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. AI Mission Visual View */}
                {activeMediaTab === 'concept' && (
                  <div className="relative group rounded-xl overflow-hidden border border-slate-200/70 dark:border-white/15 bg-slate-950 flex flex-col justify-between shadow-md">
                    <div className="relative w-full max-h-[360px] min-h-[240px] flex items-center justify-center overflow-hidden">
                      <img
                        src={currentItem.conceptImage}
                        alt={currentItem.title}
                        className="w-full max-h-[360px] object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                        onClick={() => setLightboxData({
                          src: currentItem.conceptImage,
                          title: `${currentItem.title} — Mission Concept`,
                          source: 'Custom Neural Mission Simulation Visual'
                        })}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                      <button
                        onClick={() => setLightboxData({
                          src: currentItem.conceptImage,
                          title: `${currentItem.title} — Mission Concept`,
                          source: 'Custom Neural Mission Simulation Visual'
                        })}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer flex items-center gap-1 text-[11px] font-mono"
                        title="View Full Resolution"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Zoom</span>
                      </button>
                    </div>
                    <div className="p-2.5 bg-slate-900/95 text-slate-200 text-xs leading-relaxed border-t border-white/10 flex items-center justify-between">
                      <span>{currentItem.conceptCaption}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/80">
                        {currentItem.horizon} Concept
                      </span>
                    </div>
                  </div>
                )}

                {/* 3. Interactive Pipeline Flow View */}
                {activeMediaTab === 'interactive' && (
                  <div className="rounded-xl border border-slate-200/80 dark:border-white/15 bg-slate-50/90 dark:bg-white/[0.03] p-4 flex flex-col justify-between gap-3 shadow-sm">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-white/60 font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>Execution Architecture Flow</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white/80 font-mono">
                        {currentItem.diagramType.toUpperCase()}
                      </span>
                    </div>

                    {currentItem.diagramType === 'pipeline' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                        {currentItem.diagramNodes.map((node, i) => (
                          <div 
                            key={i} 
                            className="glow-tile p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] shadow-xs flex flex-col justify-between gap-1.5 hover:border-slate-300 dark:hover:border-white/20 transition-all"
                            style={{ '--tile-glow': theme.glow }}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-mono font-bold ${theme.accentText}`}>
                                Step {node.step}
                              </span>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/70">
                                {node.tag}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                              {node.title}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-white/60 leading-tight">
                              {node.detail}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {currentItem.diagramType === 'hub' && (
                      <div className="flex flex-col gap-2.5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {currentItem.diagramNodes.map((node, i) => {
                            const NodeIcon = node.icon;
                            return (
                              <div 
                                key={i} 
                                className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] shadow-xs flex flex-col items-center text-center gap-1.5"
                              >
                                <NodeIcon className={`w-5 h-5 ${theme.accentText}`} />
                                <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{node.label}</div>
                                <div className="text-[10px] text-slate-500 dark:text-white/60 leading-tight">{node.sub}</div>
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                                  {node.status}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between px-3.5">
                          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                            → Real-time Cross-Referenced Spatial Context
                          </span>
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                            Zero-Hallucination Grounding
                          </span>
                        </div>
                      </div>
                    )}

                    {currentItem.diagramType === 'bridge' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {currentItem.diagramNodes.map((node, i) => {
                          const NodeIcon = node.icon;
                          return (
                            <div 
                              key={i} 
                              className={`p-3 rounded-xl border ${
                                i === 1 ? 'border-violet-500/50 bg-violet-500/10' : 'border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.04]'
                              } shadow-xs flex flex-col justify-between gap-1.5`}
                            >
                              <div className="flex items-center justify-between">
                                <NodeIcon className="w-5 h-5 text-violet-500" />
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-700 dark:text-violet-300 font-semibold">
                                  {node.badge}
                                </span>
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-white">{node.channel}</div>
                                <div className="text-[10px] font-mono text-slate-500 dark:text-white/60">{node.target}</div>
                              </div>
                              <div className="text-[10px] text-slate-600 dark:text-white/70 leading-relaxed border-t border-slate-200/60 dark:border-white/10 pt-1">
                                {node.format}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

            {/* Vision + Why It Wins Cards (Exact Original Text Preserved) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 flex flex-col gap-2 shadow-sm">
                <div className="text-xs font-mono font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>What We’re Building Toward</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-white/80 leading-relaxed font-normal">
                  {currentItem.vision}
                </p>
              </div>

              <div className={`p-4 rounded-2xl ${theme.bgCard} border ${theme.borderCard} flex flex-col gap-2 shadow-sm`}>
                <div className={`text-xs font-mono font-bold ${theme.accentText} uppercase tracking-wider mb-0.5 flex items-center gap-1.5`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Why This Is Realistic, Not Hype</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-white/95 leading-relaxed font-medium">
                  {currentItem.whyItWins}
                </p>
              </div>
            </div>

            {/* Technical Verification Links */}
            {currentItem.links.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-mono font-bold text-slate-400 dark:text-white/40 uppercase mr-1">
                  Research References:
                </span>
                {currentItem.links.map((l, i) => (
                  <a
                    key={i}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="glow-tile flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 border border-slate-200/80 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-white/80 transition-all hover:scale-[1.02]"
                    style={{ '--tile-glow': theme.glow }}
                  >
                    <span>{l.label}</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer Stepper Controls */}
        <div className="flex items-center justify-between pt-3.5 border-t border-slate-200/80 dark:border-white/10 flex-wrap gap-3">
          <div className="flex items-center gap-3 text-xs font-mono text-slate-600 dark:text-white/60 font-semibold">
            <span>{currentPageIndex + 1} of {ROADMAP_PAGES.length}</span>
            <div className="flex items-center gap-1.5">
              {ROADMAP_PAGES.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  onClick={() => {
                    setCurrentPageIndex(dotIdx);
                    setActiveSecondaryDiagram(false);
                  }}
                  className={`cursor-pointer rounded-full transition-all duration-300 ${
                    dotIdx === currentPageIndex
                      ? `w-6 h-1.5 ${theme.pillActive.split(' ')[0]}`
                      : 'w-1.5 h-1.5 bg-slate-300 dark:bg-white/20 hover:bg-slate-400'
                  }`}
                  aria-label={`Go to step ${dotIdx + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentPageIndex === 0}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                currentPageIndex === 0
                  ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-white/10'
                  : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {currentPageIndex < ROADMAP_PAGES.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-bold text-xs shadow-md hover:scale-105 transition-all cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600 text-white font-bold text-xs shadow-lg hover:scale-105 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Got It</span>
              </button>
            )}
          </div>
        </div>

        {/* Lightbox for Full Diagram / Image Inspection */}
        {lightboxData && (
          <div 
            className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
            onClick={() => setLightboxData(null)}
          >
            <div 
              className="relative max-w-5xl w-full bg-slate-950 rounded-2xl border border-white/20 p-4 shadow-2xl flex flex-col gap-3 max-h-[92vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center text-white pb-2 border-b border-white/10">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    {lightboxData.title}
                  </h4>
                  {lightboxData.source && (
                    <p className="text-[11px] font-mono text-slate-400">{lightboxData.source}</p>
                  )}
                </div>
                <button 
                  onClick={() => setLightboxData(null)} 
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-auto max-h-[75vh] flex items-center justify-center p-2 rounded-xl bg-white">
                <img 
                  src={lightboxData.src} 
                  alt={lightboxData.title} 
                  className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg" 
                />
              </div>

              <div className="text-[11px] text-slate-400 font-mono text-center">
                Press Esc or click outside to close inspection view
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
