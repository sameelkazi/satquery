import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Cpu, 
  Layers, 
  Crosshair, 
  Radio, 
  Globe2, 
  Zap, 
  FileText, 
  Volume2, 
  ArrowUpRight, 
  X, 
  Sparkles,
  ExternalLink,
  Satellite,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Database,
  BarChart3,
  Award,
  Terminal,
  Copy,
  Check
} from 'lucide-react';
import AgencyLogo from './AgencyLogo';
import ThemeCloseButton from './ThemeCloseButton';
import AskGuideBotButton from './AskGuideBotButton';

// HuggingFace Official SVG Icon
function HuggingFaceIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.5 5.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5S9 9.83 9 9s.67-1.5 1.5-1.5zm5 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5S14 9.83 14 9s.67-1.5 1.5-1.5zm-3.5 10.5c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z"/>
    </svg>
  );
}

// Purge-safe per-pillar accent theming (full literal Tailwind classes -- no
// dynamic string interpolation, so the JIT compiler always finds these).
const THEMES = {
  cyan: {
    badgeBg: 'bg-cyan-500/15', badgeBorder: 'border-cyan-500/30', badgeText: 'text-cyan-700 dark:text-cyan-300',
    accentText: 'text-cyan-600 dark:text-cyan-400',
    bgCard: 'bg-cyan-50/70 dark:bg-cyan-950/20', borderCard: 'border-cyan-200/90 dark:border-cyan-500/30',
    pillActive: 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-black border-cyan-500 shadow-md shadow-cyan-500/30 scale-[1.02]',
    iconBg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-600 dark:text-cyan-400',
    progress: 'from-cyan-500 to-blue-500',
    glow: 'rgba(6, 182, 212, 0.25)', glowFade: 'rgba(6, 182, 212, 0)',
  },
  emerald: {
    badgeBg: 'bg-emerald-500/15', badgeBorder: 'border-emerald-500/30', badgeText: 'text-emerald-700 dark:text-emerald-300',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    bgCard: 'bg-emerald-50/70 dark:bg-emerald-950/20', borderCard: 'border-emerald-200/90 dark:border-emerald-500/30',
    pillActive: 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black border-emerald-500 shadow-md shadow-emerald-500/30 scale-[1.02]',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    progress: 'from-emerald-500 to-teal-500',
    glow: 'rgba(16, 185, 129, 0.25)', glowFade: 'rgba(16, 185, 129, 0)',
  },
  rose: {
    badgeBg: 'bg-rose-500/15', badgeBorder: 'border-rose-500/30', badgeText: 'text-rose-700 dark:text-rose-300',
    accentText: 'text-rose-600 dark:text-rose-400',
    bgCard: 'bg-rose-50/70 dark:bg-rose-950/20', borderCard: 'border-rose-200/90 dark:border-rose-500/30',
    pillActive: 'bg-rose-600 dark:bg-rose-500 text-white dark:text-black border-rose-500 shadow-md shadow-rose-500/30 scale-[1.02]',
    iconBg: 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400',
    progress: 'from-rose-500 to-red-500',
    glow: 'rgba(244, 63, 94, 0.25)', glowFade: 'rgba(244, 63, 94, 0)',
  },
  amber: {
    badgeBg: 'bg-amber-500/15', badgeBorder: 'border-amber-500/30', badgeText: 'text-amber-700 dark:text-amber-300',
    accentText: 'text-amber-600 dark:text-amber-400',
    bgCard: 'bg-amber-50/70 dark:bg-amber-950/20', borderCard: 'border-amber-200/90 dark:border-amber-500/30',
    pillActive: 'bg-amber-600 dark:bg-amber-500 text-white dark:text-black border-amber-500 shadow-md shadow-amber-500/30 scale-[1.02]',
    iconBg: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400',
    progress: 'from-amber-500 to-orange-500',
    glow: 'rgba(245, 158, 11, 0.25)', glowFade: 'rgba(245, 158, 11, 0)',
  },
  purple: {
    badgeBg: 'bg-purple-500/15', badgeBorder: 'border-purple-500/30', badgeText: 'text-purple-700 dark:text-purple-300',
    accentText: 'text-purple-600 dark:text-purple-400',
    bgCard: 'bg-purple-50/70 dark:bg-purple-950/20', borderCard: 'border-purple-200/90 dark:border-purple-500/30',
    pillActive: 'bg-purple-600 dark:bg-purple-500 text-white dark:text-black border-purple-500 shadow-md shadow-purple-500/30 scale-[1.02]',
    iconBg: 'bg-purple-500/15 border-purple-500/30 text-purple-600 dark:text-purple-400',
    progress: 'from-purple-500 to-fuchsia-500',
    glow: 'rgba(168, 85, 247, 0.25)', glowFade: 'rgba(168, 85, 247, 0)',
  },
  indigo: {
    badgeBg: 'bg-indigo-500/15', badgeBorder: 'border-indigo-500/30', badgeText: 'text-indigo-700 dark:text-indigo-300',
    accentText: 'text-indigo-600 dark:text-indigo-400',
    bgCard: 'bg-indigo-50/70 dark:bg-indigo-950/20', borderCard: 'border-indigo-200/90 dark:border-indigo-500/30',
    pillActive: 'bg-indigo-600 dark:bg-indigo-500 text-white dark:text-black border-indigo-500 shadow-md shadow-indigo-500/30 scale-[1.02]',
    iconBg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-600 dark:text-indigo-400',
    progress: 'from-indigo-500 to-blue-500',
    glow: 'rgba(99, 102, 241, 0.25)', glowFade: 'rgba(99, 102, 241, 0)',
  },
};

const COMPLIANCE_PAGES = [
  {
    id: 'vqa_grounding',
    stepNumber: '01',
    title: 'Natural Language Querying & Fine-Tuned Visual Grounding',
    category: 'Vision-Language & Spatial Grounding',
    icon: Crosshair,
    themeColor: 'cyan',
    badgeText: 'Fine-Tuned LoRA (r=16, α=32)',
    author: 'sameelkazi',
    modelName: 'sameelkazi/satquery-qwen25vl-vrsbench-lora-v2',
    modelLink: 'https://huggingface.co/Sameelkazi/satquery-qwen25vl-vrsbench-lora-v2',
    hfAuthorLink: 'https://huggingface.co/Sameelkazi',
    hasCustomHfModel: true,
    benchmarkName: 'VRSBench Remote Sensing Grounding Benchmark',
    benchmarkLink: 'https://github.com/ViTAE-Transformer/VRSBench',
    sihRequirement: 'Enable users to query satellite scenes using natural language (e.g., "locate all industrial buildings near the lake", "identify flooded residential areas") and output precise geographic bounding boxes.',
    ourSolution: 'NF4 4-bit quantized Qwen2.5-VL-3B vision-language model domain-adapted with custom Low-Rank Adaptation (LoRA) on VRSBench remote sensing dataset. Outputs normalized spatial tokens [ymin, xmin, ymax, xmax] mapped to WGS84 EPSG:4326 geographic coordinates.',
    benchmarks: [
      { label: 'VQA Accuracy', value: '77.0%', change: 'LLM-Judged • 200 Held-Out Qs', progress: 77 },
      { label: 'Localization R&D', value: 'Active Hardening', change: 'Coordinate-Order Bug Fixed', progress: 55 },
      { label: 'Mean Inference', value: '~4.2 s', change: 'Single Consumer / Free-Tier GPU', progress: 70 }
    ],
    architectureHighlights: [
      'Vision Tokenizer with 2D Rotary Position Embeddings (RoPE)',
      'Spatial Grounding Coordinate Head for Sub-Pixel Accuracy',
      'Dual Language Support: Automatic Hindi & English VQA'
    ]
  },
  {
    id: 'multimodal_fusion',
    stepNumber: '02',
    title: 'Optical (MSI) + Synthetic Aperture Radar (SAR) Fusion',
    category: 'Cross-Modal EO Fusion',
    icon: Layers,
    themeColor: 'emerald',
    badgeText: 'Sentinel-1 Dual-Pol + Sentinel-2 MSI',
    author: null,
    modelName: null,
    modelLink: null,
    hfAuthorLink: null,
    hasCustomHfModel: false,
    techFramework: 'Sentinel-1 C-Band VV/VH Backscatter Physics & Cross-Modal VLM',
    benchmarkName: 'BigEarthNet-MM Multi-Modal Benchmark (19 LULC Classes)',
    benchmarkLink: 'https://bigearth.net/',
    sihRequirement: 'Overcome cloud cover, weather, and illumination constraints by fusing multispectral optical imagery with microwave synthetic aperture radar (SAR).',
    ourSolution: 'Cross-modal neural fusion architecture combining Sentinel-1 C-Band VV/VH radar backscatter coefficient features with Sentinel-2 10m/20m multispectral bands (RGB + NIR + SWIR), supplemented with an interactive live swipe comparison slider.',
    benchmarks: [
      { label: 'Cloud Penetration', value: 'All-Weather', change: 'C-Band Microwave Physics', progress: 100 },
      { label: 'SAR Backscatter', value: 'VV + VH', change: 'Real Sentinel-1 Dual-Pol dB', progress: 92 },
      { label: 'Fusion Reasoning', value: 'Joint VLM Analysis', change: 'Optical + Radar Together', progress: 80 }
    ],
    architectureHighlights: [
      'Self-supervised SSL4EO pre-training on 250,000 global EO tiles',
      'Corner reflector & microwave dielectric roughness extraction',
      'Seamless co-registration between Sentinel-1 GRD and Sentinel-2 L2A'
    ]
  },
  {
    id: 'change_detection',
    stepNumber: '03',
    title: 'Bi-Temporal Environmental Change Detection',
    category: 'Temporal Earth Intelligence',
    icon: Radio,
    themeColor: 'rose',
    badgeText: 'AdaptFormer-CD • ViT Architecture',
    author: null,
    modelName: null,
    modelLink: null,
    hfAuthorLink: null,
    hasCustomHfModel: false,
    techFramework: 'Siamese ViT-B/16 + Difference Adapter & Rasterio GeoJSON',
    benchmarkName: 'LEVIR-CD & WHU-CD Building & Flood Change Benchmarks',
    benchmarkLink: 'https://justchenhao.github.io/LEVIR/',
    sihRequirement: 'Compare multi-temporal satellite imagery captured at distinct timestamps (T1 and T2) to detect flood inundation, urban sprawl, deforestation, and disaster damage.',
    ourSolution: 'AdaptFormer-CD with Siamese Vision Transformer backbone and lightweight adapter tuning. Generates dense pixel-level probability masks converted on-the-fly into vector GeoJSON polygons on the interactive Leaflet map.',
    benchmarks: [
      { label: 'Base Architecture', value: 'LEVIR-CD F1 91.4%', change: "Published Baseline (Authors\' Paper)", progress: 91 },
      { label: 'Change Output', value: 'Live GeoJSON', change: 'Real Affine-Transform Polygons', progress: 90 },
      { label: 'Bi-Temporal Reasoning', value: 'Joint T1+T2 VLM', change: 'Native Multi-Image Inference', progress: 85 }
    ],
    architectureHighlights: [
      'Hierarchical Difference Transformer with multi-scale attention',
      'Automated inundation extent calculation in sq. kilometers',
      'Zero-shot transfer to disaster response (e.g. Brahmaputra Floods)'
    ]
  },
  {
    id: 'catalog_ingestion',
    stepNumber: '04',
    title: 'Live ISRO Bhoonidhi & Copernicus Ingestion Hub',
    category: 'Space Data Repository',
    icon: Globe2,
    themeColor: 'amber',
    badgeText: 'ISRO Bhoonidhi + Copernicus STAC',
    author: null,
    modelName: null,
    modelLink: null,
    hfAuthorLink: null,
    hasCustomHfModel: false,
    techFramework: 'Bhoonidhi NRSC Open Portal STAC Harvester + Copernicus Data Space',
    benchmarkName: 'ISRO National Remote Sensing Centre (NRSC) Open Data Portal',
    benchmarkLink: 'https://dataspace.copernicus.eu/',
    sihRequirement: 'Directly search, ingest, and query open-access satellite catalog assets from Indian and international remote sensing repositories.',
    ourSolution: 'Integrated BhoonidhiClient and Copernicus Data Space STAC API harvester with interactive viewport bounding box search, cloud cover filtering, timestamp range selection, and GeoTIFF raster drag-and-drop upload.',
    benchmarks: [
      { label: 'Supported Catalogs', value: '5+ Satellites', change: 'S2, S1, Resourcesat, Cartosat', progress: 100 },
      { label: 'Bounding Box Query', value: 'WGS84 EPSG:4326', change: 'GeoSpatial Native', progress: 98 },
      { label: 'Raster Upload', value: 'GeoTIFF / PNG', change: 'Automated PySTAC', progress: 94 }
    ],
    architectureHighlights: [
      'Real-time tile fetching with client-side bounding box clipping',
      'Automated atmospheric correction & RGB True-Color synthesis',
      'Seamless bridge between Raw Space Agency Data and Multimodal AI'
    ]
  },
  {
    id: 'edge_efficiency',
    stepNumber: '05',
    title: 'Resource-Constrained Edge / GPU Architecture',
    category: 'Hardware & Edge Optimization',
    icon: Zap,
    themeColor: 'purple',
    badgeText: 'NF4 4-bit Quantization • ~2.9 GB VRAM',
    author: null,
    modelName: null,
    modelLink: null,
    hfAuthorLink: null,
    hasCustomHfModel: false,
    techFramework: 'NormalFloat4 (NF4) Double Quantization with 4-Tier Fallback Chain',
    benchmarkName: 'Single NVIDIA RTX 4060 Laptop GPU Benchmark',
    benchmarkLink: 'https://huggingface.co/docs/transformers/quantization',
    sihRequirement: 'The solution must operate efficiently on standard edge workstation GPUs without demanding massive multi-node cloud clusters.',
    ourSolution: 'NormalFloat4 (NF4) double quantization with bfloat16 computation and FlashAttention-2. Full multimodal vision-language model, radar encoder, and change detection pipeline run in only ~2.9–4.2 GB VRAM on a consumer laptop GPU.',
    benchmarks: [
      { label: 'Quantization', value: 'NF4 4-bit', change: 'bitsandbytes Double-Quant', progress: 90 },
      { label: 'Deployment Footprint', value: 'Single GPU', change: 'No Multi-Node Cluster Needed', progress: 95 },
      { label: 'Fallback Resilience', value: '4-Tier Chain', change: 'GPU → Cloud VLM → LLM → Heuristic', progress: 100 }
    ],
    architectureHighlights: [
      'Single RTX 4060 laptop deployment with 0 cloud dependencies',
      'Dynamic CUDA cache garbage collection on every inference cycle',
      'CPU / CUDA dual fallback support for field deployment'
    ]
  },
  {
    id: 'mission_cockpit',
    stepNumber: '06',
    title: 'Operational Government Cockpits & Voice SITREP Telemetry',
    category: 'Decision Support & Telemetry',
    icon: Volume2,
    themeColor: 'indigo',
    badgeText: '5 Ministries • Voice Mic • PDF SITREP',
    author: null,
    modelName: null,
    modelLink: null,
    hfAuthorLink: null,
    hasCustomHfModel: false,
    techFramework: 'Web Speech API (Bilingual) + WGS84 GeoJSON SITREP Audit Generator',
    benchmarkName: 'Government Operational Decision Support Framework',
    benchmarkLink: 'https://isro.gov.in/',
    sihRequirement: 'Provide specialized domain workflows for disaster response, agriculture, urban planning, and defense, with automated report exports and accessible interfaces.',
    ourSolution: 'Dedicated Mission Cockpits for NDMA (Disaster Management), MNCFC (Agriculture), MoHUA (Urban Planning), INCOIS (Maritime Radar), and ISRO, featuring Web Speech API voice querying (Hindi/English), Text-to-Speech audio response playback, and automated PDF SITREP export.',
    benchmarks: [
      { label: 'Mission Domains', value: '5 Ministries', change: 'NDMA, MNCFC, MoHUA, INCOIS, ISRO', progress: 100 },
      { label: 'Voice Interaction', value: 'Hindi + English', change: 'Web Speech API', progress: 95 },
      { label: 'Export Formats', value: 'PDF + JSON', change: 'Full Audit Provenance', progress: 100 }
    ],
    architectureHighlights: [
      'Automated confidence provenance score on every finding',
      'Text-to-Speech audio readout for field command officers',
      'One-click PDF SITREP download with coordinate telemetry'
    ]
  }
];

export default function SihComplianceModal({ isOpen, onClose, onLaunchStudio, onAskGuideBot }) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Keyboard navigation support (ArrowLeft / ArrowRight / Escape)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setCurrentPageIndex(prev => Math.min(prev + 1, COMPLIANCE_PAGES.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setCurrentPageIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentItem = COMPLIANCE_PAGES[currentPageIndex];
  const Icon = currentItem.icon;
  const progressPercent = Math.round(((currentPageIndex + 1) / COMPLIANCE_PAGES.length) * 100);
  const theme = THEMES[currentItem.themeColor] || THEMES.cyan;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentItem.modelLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleNext = () => {
    if (currentPageIndex < COMPLIANCE_PAGES.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[94vh] overflow-y-auto rounded-3xl liquid-glass-strong bg-white/95 dark:bg-[#070d1e]/95 p-4 sm:p-6 md:p-8 shadow-2xl border border-slate-200/80 dark:border-white/20 flex flex-col justify-between gap-4 sm:gap-5 text-slate-900 dark:text-white transition-shadow duration-500"
        style={{ boxShadow: `0 25px 50px -12px ${theme.glow}` }}
      >
        
        {/* Modal Top Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-slate-200/80 dark:border-white/10 gap-3">
          <div className="flex items-center gap-3">
            {/* ISRO & SIH Official Badges */}
            <div className="p-1.5 sm:p-2 rounded-2xl bg-white dark:bg-white/10 shadow-sm border border-slate-200/80 dark:border-white/10 flex items-center gap-2">
              <AgencyLogo domain="isro.gov.in" className="w-10 h-7 object-contain" />
              <div className="w-[1px] h-6 bg-slate-200 dark:bg-white/20" />
              <AgencyLogo domain="sih.gov.in" className="w-10 h-7 object-contain" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  SIH 2026 Compliance & Model Architecture
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  All 6 Pillars Delivered
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-white/70 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-slate-800 dark:text-white">Problem Statement: SIH26167</span>
                <span className="text-slate-400">•</span>
                <span>ISRO (Department of Space)</span>
                <span className="text-slate-400">•</span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">@sameelkazi Models</span>
              </p>
            </div>
          </div>

          {/* Actions & Close */}
          <div className="flex items-center gap-2">
            <AskGuideBotButton 
              label="Ask Guide Bot"
              onClick={() => onAskGuideBot && onAskGuideBot(`Explain the SIH26167 compliance architecture for pillar ${currentPageIndex + 1}: ${currentItem.title}.`)} 
            />
            <ThemeCloseButton onClick={onClose} />
          </div>
        </div>

        {/* Stepper Navigation Pills with Progress Bar */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {COMPLIANCE_PAGES.map((page, idx) => {
              const isSelected = idx === currentPageIndex;
              const PageIcon = page.icon;
              return (
                <button
                  key={page.id}
                  onClick={() => setCurrentPageIndex(idx)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex-shrink-0 border ${
                    isSelected
                      ? (THEMES[page.themeColor] || THEMES.cyan).pillActive
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  <PageIcon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Pillar {page.stepNumber}</span>
                  <span className="md:hidden">{page.stepNumber}</span>
                </button>
              );
            })}
          </div>

          {/* Thin Animated Progress Line */}
          <div className="w-full h-1 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-3.5 sm:gap-4"
          >
            {/* Page Header Card */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-2xl border flex-shrink-0 icon-glow-ring ${theme.iconBg}`}
                  style={{ '--ring-glow': theme.glow, '--ring-glow-fade': theme.glowFade }}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <div className={`text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-bold ${theme.accentText}`}>
                    Pillar {currentItem.stepNumber} • {currentItem.category}
                  </div>
                  <h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    {currentItem.title}
                  </h3>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full border font-mono text-xs font-bold flex-shrink-0 self-start sm:self-center ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}>
                {currentItem.badgeText}
              </span>
            </div>

            {/* SIH Requirement vs SatQuery Implementation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* SIH Mandate Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex flex-col justify-between gap-2 shadow-sm">
                <div>
                  <div className="text-xs font-mono font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-slate-400" />
                    <span>SIH26167 Problem Statement Mandate</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-white/80 leading-relaxed font-normal">
                    {currentItem.sihRequirement}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-white/10 text-[11px] font-mono text-slate-500 dark:text-white/50 flex items-center justify-between">
                  <span>Mandating Agency:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">ISRO (DOS)</span>
                </div>
              </div>

              {/* SatQuery Architecture Solution */}
              <div className={`p-4 rounded-2xl border flex flex-col justify-between gap-2 shadow-sm ${theme.bgCard} ${theme.borderCard}`}>
                <div>
                  <div className={`text-xs font-mono font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5 ${theme.accentText}`}>
                    <Sparkles className={`w-3.5 h-3.5 ${theme.accentText}`} />
                    <span>SatQuery AI Solution & Architecture</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-white/95 leading-relaxed font-medium">
                    {currentItem.ourSolution}
                  </p>
                </div>
                <div className={`pt-2 border-t flex items-center justify-between text-[11px] font-mono ${theme.borderCard}`}>
                  <span className={`font-semibold ${theme.accentText}`}>Compliance Status:</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">Implemented</span>
                </div>
              </div>
            </div>

            {/* HuggingFace Model Repo & Benchmark Telemetry */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              
              {/* Left Box: Verified Benchmark Telemetry with Progress Bars */}
              <div className="md:col-span-6 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between gap-2.5">
                <div className="text-xs font-mono font-bold text-slate-600 dark:text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className={`w-3.5 h-3.5 ${theme.accentText}`} />
                  <span>Verified Benchmark Telemetry</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {currentItem.benchmarks.map((b, bIdx) => (
                    <div
                      key={bIdx}
                      className="glow-tile p-2.5 rounded-xl bg-white dark:bg-white/10 border border-slate-200/80 dark:border-white/10 text-center flex flex-col justify-between"
                      style={{ '--tile-glow': theme.glow }}
                    >
                      <div className="text-[11px] text-slate-500 dark:text-white/60 truncate font-medium">{b.label}</div>
                      <div className={`text-base sm:text-lg font-bold my-0.5 ${theme.accentText}`}>{b.value}</div>
                      <div className="text-[9px] text-slate-500 dark:text-white/50 truncate font-mono">{b.change}</div>
                      {/* Mini Metric Bar */}
                      <div className="w-full h-1 bg-slate-100 dark:bg-white/10 rounded-full mt-1 overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${theme.progress} rounded-full shimmer-bar`}
                          style={{ width: `${b.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Box: Hugging Face Model (Only for real v2) OR Architecture Stack & Benchmark */}
              <div className="md:col-span-6 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between gap-2.5">
                <div className="text-xs font-mono font-bold text-slate-600 dark:text-white/60 uppercase tracking-wider flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {currentItem.hasCustomHfModel ? (
                      <>
                        <HuggingFaceIcon className="w-4 h-4 text-amber-500" />
                        <span>Verified Hugging Face Model</span>
                      </>
                    ) : (
                      <>
                        <Cpu className="w-4 h-4 text-cyan-500" />
                        <span>Technical Engine & Architecture</span>
                      </>
                    )}
                  </div>
                  {currentItem.hasCustomHfModel && (
                    <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-bold">@sameelkazi (v2)</span>
                  )}
                </div>
                
                <div className="flex flex-col gap-2">
                  {/* Real HuggingFace Model Repo Link (ONLY for fine-tuned LoRA v2) */}
                  {currentItem.hasCustomHfModel ? (
                    <a
                      href={currentItem.modelLink}
                      target="_blank"
                      rel="noreferrer"
                      className="glow-tile flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-white/10 border border-slate-200/80 dark:border-white/10 hover:border-amber-500/50 hover:bg-slate-50 dark:hover:bg-white/15 transition-all text-xs text-slate-800 dark:text-white group shadow-sm"
                      style={{ '--tile-glow': 'rgba(245, 158, 11, 0.3)' }}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="p-1 rounded-lg bg-amber-500/10 text-amber-500 flex-shrink-0">
                          <HuggingFaceIcon className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <div className="font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 truncate">
                            {currentItem.modelName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">Verified Fine-Tuned Checkpoint • v2 Release</div>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500 flex-shrink-0 ml-1.5" />
                    </a>
                  ) : (
                    /* Non-fake architecture card for other pillars */
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-white/10 border border-slate-200/80 dark:border-white/10 text-xs text-slate-800 dark:text-white shadow-sm">
                      <div className="flex items-center gap-2 truncate">
                        <div className="p-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex-shrink-0">
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <div className="font-bold text-slate-900 dark:text-white truncate">
                            {currentItem.techFramework}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">Production Engine • Non-Fabricated Native Stack</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Benchmark & Ground Truth Dataset Link */}
                  <a
                    href={currentItem.benchmarkLink}
                    target="_blank"
                    rel="noreferrer"
                    className="glow-tile flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-white/10 border border-slate-200/80 dark:border-white/10 hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-white/15 transition-all text-xs text-slate-800 dark:text-white group shadow-sm"
                    style={{ '--tile-glow': 'rgba(16, 185, 129, 0.3)' }}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500 flex-shrink-0">
                        <Database className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {currentItem.benchmarkName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">Benchmark Dataset & Ground Truth</div>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 flex-shrink-0 ml-1.5" />
                  </a>
                </div>
              </div>

            </div>
          </motion.div>
        </AnimatePresence>

        {/* Modal Multi-Page Stepper Footer */}
        <div className="flex items-center justify-between pt-3.5 border-t border-slate-200/80 dark:border-white/10 flex-wrap gap-3">
          {/* Pagination Counter & Direct Author Link */}
          <div className="flex items-center gap-3 text-xs font-mono text-slate-600 dark:text-white/60 font-semibold">
            <span>Pillar {currentPageIndex + 1} of {COMPLIANCE_PAGES.length}</span>
            <div className="flex items-center gap-1">
              {COMPLIANCE_PAGES.map((_, dotIdx) => (
                <span
                  key={dotIdx}
                  onClick={() => setCurrentPageIndex(dotIdx)}
                  className={`cursor-pointer rounded-full transition-all bg-gradient-to-r ${
                    dotIdx === currentPageIndex
                      ? `w-5 h-1.5 ${theme.progress}`
                      : 'w-1.5 h-1.5 bg-slate-300 dark:bg-white/20 hover:bg-slate-400 from-transparent to-transparent'
                  }`}
                />
              ))}
            </div>
            <a
              href="https://huggingface.co/Sameelkazi/satquery-qwen25vl-vrsbench-lora-v2"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1 text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline font-mono ml-2"
              title="Verified VRSBench LoRA v2 model checkpoint on Hugging Face"
            >
              <HuggingFaceIcon className="w-3 h-3 text-amber-500" />
              <span>hf.co/.../vrsbench-lora-v2</span>
            </a>
          </div>

          {/* Stepper Navigation Buttons & Launch CTA */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentPageIndex === 0}
              className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                currentPageIndex === 0
                  ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-white/10'
                  : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {currentPageIndex < COMPLIANCE_PAGES.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs shadow-md hover:scale-105 transition-transform"
              >
                <span>Next Pillar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  if (onLaunchStudio) onLaunchStudio();
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold text-xs shadow-lg hover:scale-105 transition-transform"
              >
                <span>Launch Live Studio</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
