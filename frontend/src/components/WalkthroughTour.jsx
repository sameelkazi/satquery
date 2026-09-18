import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Sparkles, 
  Play, 
  MessageSquare, 
  ShieldCheck, 
  CheckCircle2, 
  Check,
  Compass,
  Cpu,
  Layers,
  MapPin,
  ExternalLink,
  FileText
} from 'lucide-react';

export const TOUR_STEPS = [
  // ---------------------------------------------------------------------------
  // PHASE 1: MANDATORY PROBLEM STATEMENT COMPLIANCE (ISRO SIH26167)
  // Verified live in the primary Command Cockpit ('workspace')
  // ---------------------------------------------------------------------------
  {
    id: 'domain',
    tab: 'workspace',
    targetSelector: '#tour-domain-selector',
    speakerName: 'Ali Bot',
    speakerTitle: 'Flight Systems Lead',
    rubricTag: 'PS MANDATE: 5 MISSION DOMAIN DIRECTIVES',
    tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
    botImage: '/bots/ali_bot_right.png',
    botSide: 'left', // Bot on left, pointing RIGHT towards Domain selector
    greeting: '1. Mission Domain Directives',
    badge: 'Step 1 of 16',
    content: 'SIH26167 requires operational remote sensing domain adaptation. SatQuery dynamically reconfigures its reasoning pipeline across 5 directives: ISRO Earth Observation, NDMA Disaster Response, MNCFC Agriculture, MoHUA Smart Cities, and INCOIS Maritime Security.',
    placement: 'bottom'
  },
  {
    id: 'aoi',
    tab: 'workspace',
    targetSelector: '#tour-aoi-selector',
    speakerName: 'Samridhi Bot',
    speakerTitle: 'Remote Sensing Specialist',
    rubricTag: 'PS MANDATE: GEO-CATALOG & GPS AOI MANAGER',
    tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
    botImage: '/bots/samridhi_bot_right.png',
    botSide: 'left', // Bot on left, pointing RIGHT towards AOI selector
    greeting: '2. Satellite Scene & AOI Manager',
    badge: 'Step 2 of 16',
    content: 'Full geographic flexibility: Switch between pre-calibrated multi-sensor scenes (Hyderabad Urban Corridor, Brahmaputra Flood, Punjab Agriculture, Vizag Port) or provide custom bounding box coordinates anywhere across the Indian subcontinent.',
    placement: 'bottom'
  },
  {
    id: 'modality',
    tab: 'workspace',
    targetSelector: '#tour-modality-switcher',
    speakerName: 'Samridhi Bot',
    speakerTitle: 'Remote Sensing Specialist',
    rubricTag: 'PS MANDATE: OPTICAL + SAR DUAL-POL FUSION',
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    botImage: '/bots/samridhi_bot_left.png',
    botSide: 'right', // Bot on right, pointing LEFT towards modality pills
    greeting: '3. Multimodal Remote Sensing Switcher',
    badge: 'Step 3 of 16',
    content: 'Extracts complementary intelligence from co-registered sensors: Optical Sentinel-2 MSI, all-weather Sentinel-1 C-band SAR Radar (penetrates cloud cover, monsoons, and night), and our NumPy-derived backscatter ratio fusion engine.',
    placement: 'right'
  },
  {
    id: 'query',
    tab: 'workspace',
    targetSelector: '#tour-query-box',
    speakerName: 'Ali Bot',
    speakerTitle: 'Flight Systems Lead',
    rubricTag: 'CORE PS MANDATE: ADAPTED VLM + BILINGUAL VOICE',
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    botImage: '/bots/ali_bot_left.png',
    botSide: 'right', // Bot on right, pointing LEFT towards AI query box
    greeting: '4. Fine-Tuned Vision-Language AI',
    badge: 'Step 4 of 16',
    content: 'Powered by our fine-tuned Qwen2.5-VL LoRA adapter (trained on VRSBench & BigEarthNet.txt). Supports bilingual natural language (English & Hindi), Web Speech API voice input, slash commands, and custom GeoTIFF raster uploads.',
    placement: 'right'
  },
  {
    id: 'map',
    tab: 'workspace',
    targetSelector: '#tour-map-canvas',
    speakerName: 'Samridhi Bot',
    speakerTitle: 'Remote Sensing Specialist',
    rubricTag: 'PS MANDATE: WGS84 GROUNDING & CHANGE DETECTION',
    tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
    botImage: '/bots/samridhi_bot_right.png',
    botSide: 'left', // Bot on left, pointing RIGHT into map
    greeting: '5. Interactive Geospatial Canvas',
    badge: 'Step 5 of 16',
    content: 'High-precision 2D Leaflet canvas rendering detected objects with real-world WGS84 GPS coordinates (EPSG:4326), sub-pixel Grounding DINO + SAHI bounding boxes, confidence scores, and AdaptFormer-CD bi-temporal vector polygon masks.',
    placement: 'left'
  },
  {
    id: 'response',
    tab: 'workspace',
    targetSelector: '#tour-response-panel',
    speakerName: 'Ali Bot',
    speakerTitle: 'Flight Systems Lead',
    rubricTag: 'PS DELIVERABLE: AUDITABLE SITREP & GIS EXPORT',
    tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
    botImage: '/bots/ali_bot_right.png',
    botSide: 'left', // Bot on left, pointing RIGHT into response panel
    greeting: '6. Multimodal SITREP & GIS Export',
    badge: 'Step 6 of 16',
    content: 'Audit-ready intelligence: Verified confidence metrics, surface area footprints in km² and hectares, audio text-to-speech, certified SITREP PDF reports with SHA-256 tamper evidence, and GIS layer export to ISRO Bhuvan and QGIS.',
    placement: 'left'
  },

  // ---------------------------------------------------------------------------
  // INTERMISSION MILESTONE: 100% PS REQUIREMENTS FULFILLED
  // Clean centered celebratory card with smooth dark backdrop (NO cutout shadow)
  // ---------------------------------------------------------------------------
  {
    id: 'milestone',
    tab: 'workspace',
    targetSelector: null,
    speakerName: 'Ali Bot',
    speakerTitle: 'Flight Systems Lead',
    rubricTag: '100% PROBLEM STATEMENT DELIVERED 🇮🇳',
    tagColor: 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
    botImage: '/bots/ali_bot_intro.png', // Ali Bot normal pose (arms crossed, proud smile, yellow sparks!)
    botSide: 'left',
    greeting: '100% PS Requirements Delivered!',
    badge: 'Milestone • Step 7 of 16',
    content: 'Every single mandate from ISRO SIH26167 is 100% satisfied, benchmarked, and verified! But our team went far beyond the baseline. Now let’s tour the live sovereign innovations we engineered for national deployment!',
    placement: 'center',
    isMilestone: true,
    checklist: [
      'Domain Adaptation: Qwen2.5-VL LoRA on VRSBench (77.0% Accuracy)',
      'Single-Image Baseline: VQA + Text-Guided Sub-Pixel Grounding',
      'Multi-Image Analysis: Bi-Temporal AdaptFormer-CD Vector Polygons',
      'Cross-Modal Fusion: Sentinel-1 SAR Dual-Pol Backscatter + Optical',
      'Agentic Orchestration: Task Routing, Execution Summary & PDF Reports'
    ]
  },

  // ---------------------------------------------------------------------------
  // PHASE 2: SOVEREIGN INNOVATIONS BEYOND THE PROBLEM STATEMENT
  // Direct screen navigation + Target box spotlight highlighting!
  // ---------------------------------------------------------------------------
  {
    id: 'memory',
    tab: 'workspace',
    targetSelector: '#tour-context-memory',
    speakerName: 'Samridhi Bot',
    speakerTitle: 'Remote Sensing Specialist',
    rubricTag: 'INNOVATION 1: MULTI-TURN CONVERSATION MEMORY',
    tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
    botImage: '/bots/samridhi_bot_right.png',
    botSide: 'left', // Bot on left, pointing RIGHT into memory log
    greeting: '8. Multi-Turn Context Memory',
    badge: 'Step 8 of 16',
    content: 'Beyond the PS: SatQuery retains full spatial conversation memory across turns. Follow up with "Which of those structures is closest to the river?" and the engine resolves spatial references using previous turns. Click "Full View" for the complete session timeline.',
    placement: 'left'
  },
  {
    id: 'situational',
    tab: 'situational', // DIRECT SCREEN NAVIGATION
    targetSelector: '#tour-situational-grid', // HIGHLIGHTS LIVE WEATHER & HAZARD GRID
    speakerName: 'Samridhi Bot',
    speakerTitle: 'Remote Sensing Specialist',
    rubricTag: 'INNOVATION 2: LIVE SITUATIONAL DIGITAL TWIN',
    tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
    botImage: '/bots/samridhi_bot_right.png',
    botSide: 'left', // Bot on left, pointing RIGHT into hazards grid
    greeting: '9. Live Situational Digital Twin',
    badge: 'Step 9 of 16',
    content: 'Live multi-hazard digital twin! Fusing real-time Open-Meteo atmospheric forecasts (precipitation, wind, cloud cover), USGS global seismic telemetry, and OSM reverse geocoding directly alongside satellite imagery for early disaster warning.',
    placement: 'bottom'
  },
  {
    id: 'monitoring',
    tab: 'monitoring', // DIRECT SCREEN NAVIGATION
    targetSelector: '#tour-monitoring-grid', // HIGHLIGHTS MULTI-MINISTRY MONITORING SECTORS
    speakerName: 'Samridhi Bot',
    speakerTitle: 'Remote Sensing Specialist',
    rubricTag: 'INNOVATION 3: CONTINUOUS MONITORING SENTINEL',
    tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
    botImage: '/bots/samridhi_bot_left.png',
    botSide: 'right', // Bot on right, pointing LEFT into monitoring sectors
    greeting: '10. Continuous Monitoring & Alerts',
    badge: 'Step 10 of 16',
    content: 'Autonomous multi-ministry monitoring sentinel: Tracks designated AOIs across NDMA (floods), Agriculture (droughts), and Urban Affairs (encroachments). Features a real RemoteCLIP zero-shot grid anomaly sweep screening 16 raster tiles overnight.',
    placement: 'bottom'
  },
  {
    id: 'hitl',
    tab: 'hitl', // DIRECT SCREEN NAVIGATION
    targetSelector: '#tour-hitl-box', // HIGHLIGHTS BOUNDING BOX INSPECTOR & RETRAINING QUEUE
    speakerName: 'Ali Bot',
    speakerTitle: 'Flight Systems Lead',
    rubricTag: 'INNOVATION 4: HITL ACTIVE LEARNING STUDIO',
    tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
    botImage: '/bots/ali_bot_right.png',
    botSide: 'left', // Bot on left, pointing RIGHT into bounding box inspector
    greeting: '11. HITL Active Retraining Studio',
    badge: 'Step 11 of 16',
    content: 'Human-in-the-Loop active learning: Domain analysts audit model detections, drag bounding box corners, and inject verified ground truth into our persistent queue (/api/feedback), continuously refining Qwen2.5-VL LoRA weights!',
    placement: 'right'
  },
  {
    id: 'explainability',
    tab: 'explainability', // DIRECT SCREEN NAVIGATION
    targetSelector: '#tour-explainability-box', // HIGHLIGHTS ATTENTION HEATMAP CANVAS
    speakerName: 'Samridhi Bot',
    speakerTitle: 'Remote Sensing Specialist',
    rubricTag: 'INNOVATION 5: XAI VISION TOKEN ATTENTION',
    tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
    botImage: '/bots/samridhi_bot_left.png',
    botSide: 'right', // Bot on right, pointing LEFT into attention canvas
    greeting: '12. Explainable AI (XAI) Heatmap',
    badge: 'Step 12 of 16',
    content: 'Transparent AI for defense & governance: Inspect multi-head cross-attention heatmaps showing exactly which pixel clusters and spectral bands the Vision-Language Transformer attended to when answering spatial queries.',
    placement: 'right'
  },
  {
    id: 'developers',
    tab: 'developers', // DIRECT SCREEN NAVIGATION
    targetSelector: '#tour-developer-tester', // HIGHLIGHTS INTERACTIVE REQUEST BUILDER
    speakerName: 'Ali Bot',
    speakerTitle: 'Flight Systems Lead',
    rubricTag: 'INNOVATION 6: GOVTECH API & PYTHON SDK',
    tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
    botImage: '/bots/ali_bot_right.png',
    botSide: 'left', // Bot on left, pointing RIGHT into API tester
    greeting: '13. GovTech API & Developer Sandbox',
    badge: 'Step 13 of 16',
    content: 'Enterprise-ready GovTech platform: OpenAPI 3.1 compliant REST endpoints, an interactive microservice testing console, and a lightweight Python Client SDK engineered for plug-and-play integration with API Setu and national GIS portals.',
    placement: 'left'
  },
  {
    id: 'paper',
    tab: 'workspace', // NAVIGATE BACK TO COCKPIT
    targetSelector: '#tour-paper-button', // HIGHLIGHTS IEEE PAPER BUTTON IN HEADER
    speakerName: 'Samridhi Bot',
    speakerTitle: 'Remote Sensing Specialist',
    rubricTag: 'INNOVATION 7: OFFICIAL IEEE RESEARCH PAPER',
    tagColor: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold',
    botImage: '/bots/samridhi_bot_right.png',
    botSide: 'left', // Bot on left, pointing RIGHT towards header button
    greeting: '14. IEEE 4-Page Research Manuscript',
    badge: 'Step 14 of 16',
    content: 'Our work is grounded in rigorous academic research: Our 4-page camera-ready IEEE manuscript ("SatQuery: Agentic Vision-Language Intelligence") documents mathematical loss formulations, VRSBench benchmark evaluations, and multi-modal ablation studies.',
    placement: 'bottom'
  },
  {
    id: 'capabilities',
    tab: 'workspace',
    targetSelector: '#tour-menu-button, #tour-menu-button-mobile', // HIGHLIGHTS SOVEREIGN MENU BUTTON (DESKTOP & MOBILE)
    fallbackSelector: '#tour-menu-button-mobile',
    speakerName: 'Samridhi Bot',
    speakerTitle: 'Remote Sensing Specialist',
    rubricTag: 'INNOVATION 8: TIME MACHINE & AR VIEWFINDER',
    tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
    botImage: '/bots/samridhi_bot_left.png',
    botSide: 'right', // Bot on right, pointing LEFT towards menu button
    greeting: '15. Sovereign Capabilities Suite',
    badge: 'Step 15 of 16',
    content: 'Accessible via the Menu button: Explore the Satellite Time-Machine with interactive split-swipe temporal comparisons, the 5-step Agentic Investigation mode, Test-Time Augmentation (TTA) stress testing, and the in-field mobile AR Ground Truth Viewfinder.',
    placement: 'bottom'
  },

  // ---------------------------------------------------------------------------
  // CONCLUSION: EVALUATION READY & GUIDE BOT
  // ---------------------------------------------------------------------------
  {
    id: 'conclusion',
    tab: 'workspace',
    targetSelector: null,
    speakerName: 'Ali Bot',
    speakerTitle: 'Flight Systems Lead',
    rubricTag: 'EVALUATION READY • ASK GUIDE BOT',
    tagColor: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
    botImage: '/bots/ali_bot_intro.png', // Ali Bot normal pose (arms crossed, proud smile, yellow sparks!)
    botSide: 'left',
    greeting: 'Cockpit Ready — Ask Guide Bot Anything!',
    badge: 'Final Step • 16 of 16',
    content: 'You have completed the full walkthrough: 100% Problem Statement compliance verified, 8 sovereign innovations demonstrated, and our published IEEE manuscript. If you have any questions about our weights, datasets, or architecture during evaluation, our SatQuery Guide Bot is standing by!',
    placement: 'center',
    isFinalStep: true
  }
];

export default function WalkthroughTour({
  isOpen = false,
  isWelcomeOpen = false,
  onClose,
  onStartTour,
  onOpenGuideBot,
  onOpenPaper,
  onNavigateTab,
  activeTab = 'workspace',
  isDarkMode = true
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [cardPosition, setCardPosition] = useState({ top: 0, left: 0 });
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const dialogRef = useRef(null);
  const step = TOUR_STEPS[currentStep] || TOUR_STEPS[0];

  // Dynamically navigate to the required tab when step changes
  useEffect(() => {
    if (!isOpen) return;
    const currentStepObj = TOUR_STEPS[currentStep];
    if (currentStepObj && currentStepObj.tab && onNavigateTab) {
      if (activeTab !== currentStepObj.tab) {
        onNavigateTab(currentStepObj.tab);
      }
    }
  }, [currentStep, isOpen, onNavigateTab, activeTab]);

  // Update target element bounds and calculate dialog placement
  const updateSpotlightPosition = useCallback(() => {
    if (!isOpen) return;
    const currentStepObj = TOUR_STEPS[currentStep];
    if (!currentStepObj) return;

    const isMobile = window.innerWidth < 640;

    // For milestone, conclusion or steps with no targetSelector, center the dialog cleanly
    if (currentStepObj.isMilestone || !currentStepObj.targetSelector || currentStepObj.placement === 'center') {
      setTargetRect(null);
      const totalWidth = isMobile 
        ? Math.min(390, window.innerWidth - 16) 
        : Math.min(currentStepObj.isMilestone ? 780 : 660, window.innerWidth - 32);
      const dialogHeight = isMobile 
        ? (currentStepObj.isMilestone ? 440 : 310) 
        : (currentStepObj.isMilestone ? 440 : 320);
      setCardPosition({
        top: Math.max(16, (window.innerHeight - dialogHeight) / 2),
        left: Math.max(8, (window.innerWidth - totalWidth) / 2)
      });
      return;
    }

    // Helper to find the actively visible DOM element among comma-separated or single selectors
    const findVisibleElement = (selector) => {
      if (!selector) return null;
      const parts = selector.split(',').map(s => s.trim()).filter(Boolean);
      for (const part of parts) {
        try {
          const matchingEls = document.querySelectorAll(part);
          for (const candidate of matchingEls) {
            const r = candidate.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
              return candidate;
            }
          }
        } catch {
          // ignore invalid querySelector
        }
      }
      return null;
    };

    let el = findVisibleElement(currentStepObj.targetSelector);
    if (!el && currentStepObj.fallbackSelector) {
      el = findVisibleElement(currentStepObj.fallbackSelector);
    }

    const totalWidth = isMobile 
      ? Math.min(390, window.innerWidth - 16) 
      : Math.min(currentStepObj.isMilestone ? 780 : 660, window.innerWidth - 32);
    const dialogHeight = isMobile 
      ? (currentStepObj.isMilestone ? 440 : 310) 
      : (currentStepObj.isMilestone ? 440 : 310);
    const margin = isMobile ? 10 : 16;

    if (!el) {
      setTargetRect(null);
      setCardPosition({
        top: Math.max(16, (window.innerHeight - dialogHeight) / 2),
        left: Math.max(8, (window.innerWidth - totalWidth) / 2)
      });
      return;
    }

    // Smooth scroll target into view if outside
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      setTargetRect(null);
      setCardPosition({
        top: Math.max(16, (window.innerHeight - dialogHeight) / 2),
        left: Math.max(8, (window.innerWidth - totalWidth) / 2)
      });
      return;
    }

    const padding = 8;
    const computedTarget = {
      top: Math.max(0, rect.top - padding),
      left: Math.max(0, rect.left - padding),
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
      rawTop: rect.top,
      rawLeft: rect.left,
      rawRight: rect.right,
      rawBottom: rect.bottom,
    };
    setTargetRect(computedTarget);

    let top = 0;
    let left = 0;

    if (isMobile) {
      // -----------------------------------------------------------------------
      // 9:16 MOBILE VIEWPORT:
      // Prevent horizontal squishing and cutoff. Horizontally center the dialog,
      // and vertically position it based on target altitude so the highlighted
      // element and the dialog card are both clearly visible.
      // -----------------------------------------------------------------------
      left = Math.max(8, (window.innerWidth - totalWidth) / 2);
      
      const targetMidpoint = computedTarget.rawTop + computedTarget.height / 2;
      const screenMidpoint = window.innerHeight * 0.48;

      if (targetMidpoint < screenMidpoint) {
        // Target is in the upper half: Dock dialog in lower portion of viewport
        top = Math.min(window.innerHeight - dialogHeight - 16, Math.max(computedTarget.rawBottom + margin, window.innerHeight - dialogHeight - 20));
      } else {
        // Target is in lower half: Place dialog above target or near top
        top = Math.max(16, Math.min(computedTarget.rawTop - dialogHeight - margin, 65));
      }
    } else {
      // -----------------------------------------------------------------------
      // DESKTOP VIEWPORT: 4-Way Placement with larger comfortable dialog
      // -----------------------------------------------------------------------
      const placement = currentStepObj.placement || 'bottom';

      if (placement === 'bottom') {
        top = computedTarget.rawBottom + margin;
        left = computedTarget.rawLeft + (computedTarget.width / 2) - (totalWidth / 2);
        if (top + dialogHeight > window.innerHeight - 20) {
          top = Math.max(20, computedTarget.rawTop - dialogHeight - margin);
        }
      } else if (placement === 'top') {
        top = computedTarget.rawTop - dialogHeight - margin;
        left = computedTarget.rawLeft + (computedTarget.width / 2) - (totalWidth / 2);
        if (top < 20) {
          top = computedTarget.rawBottom + margin;
        }
      } else if (placement === 'left') {
        top = Math.max(20, computedTarget.rawTop + (computedTarget.height / 2) - (dialogHeight / 2));
        left = computedTarget.rawLeft - totalWidth - margin;
        if (left < 20) {
          if (computedTarget.rawRight + totalWidth + margin <= window.innerWidth - 20) {
            left = computedTarget.rawRight + margin;
          } else {
            left = Math.max(16, (window.innerWidth - totalWidth) / 2);
            top = computedTarget.rawBottom + margin;
          }
        }
      } else if (placement === 'right') {
        top = Math.max(20, computedTarget.rawTop + (computedTarget.height / 2) - (dialogHeight / 2));
        left = computedTarget.rawRight + margin;
        if (left + totalWidth > window.innerWidth - 20) {
          if (computedTarget.rawLeft - totalWidth - margin >= 20) {
            left = computedTarget.rawLeft - totalWidth - margin;
          } else {
            left = Math.max(16, (window.innerWidth - totalWidth) / 2);
            top = computedTarget.rawBottom + margin;
          }
        }
      }
    }

    // Clamp inside viewport
    left = Math.max(8, Math.min(window.innerWidth - totalWidth - 8, left));
    top = Math.max(16, Math.min(window.innerHeight - dialogHeight - 16, top));

    setCardPosition({ top, left });
  }, [currentStep, isOpen]);

  // Staged recalculations on step change, tab change, resize, or scroll
  useEffect(() => {
    if (!isOpen) return;
    updateSpotlightPosition();
    const t1 = setTimeout(updateSpotlightPosition, 60);
    const t2 = setTimeout(updateSpotlightPosition, 180);
    const t3 = setTimeout(updateSpotlightPosition, 350);
    const t4 = setTimeout(updateSpotlightPosition, 600);

    const handleResize = () => updateSpotlightPosition();
    const handleScroll = () => updateSpotlightPosition();

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isOpen, currentStep, activeTab, updateSpotlightPosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleFinishTour();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handleBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleFinishTour();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinishTour = () => {
    try {
      localStorage.setItem('satquery_tour_completed', 'true');
      if (dontShowAgain) {
        localStorage.setItem('satquery_tour_dismissed', 'true');
      }
    } catch (e) {}
    // Always navigate user back to the primary workspace cockpit!
    if (onNavigateTab) {
      onNavigateTab('workspace');
    }
    setCurrentStep(0);
    if (onClose) onClose();
  };

  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  // ---------------------------------------------------------------------------
  // 1. Welcome Modal: Clean Elegant White Chatbot Bubble for Judges
  // ---------------------------------------------------------------------------
  if (isWelcomeOpen && !isOpen) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-slate-900/65 backdrop-blur-md animate-fadeIn font-general">
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 max-w-2xl w-full animate-scaleUp max-h-[92vh] overflow-y-auto p-1">
          
          {/* Ali Bot Normal Pose (arms crossed with yellow spark!) */}
          <div className="flex-shrink-0 flex items-center justify-center">
            <img
              src="/bots/ali_bot_intro.png"
              alt="Ali Bot"
              className="h-36 xs:h-44 sm:h-80 md:h-92 w-auto object-contain drop-shadow-2xl select-none"
            />
          </div>

          {/* Clean White Chatbot Bubble */}
          <div className="relative bg-white text-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-2xl border border-slate-100 flex-1 flex flex-col gap-2.5 sm:gap-3.5 w-full">
            
            {/* Pointer tail on the left pointing towards Ali on desktop */}
            <div className="hidden sm:block absolute top-12 -left-3 w-0 h-0 border-t-[9px] border-t-transparent border-b-[9px] border-b-transparent border-r-[12px] border-r-white" />

            {/* Bubble Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 mb-1">
                  <ShieldCheck className="w-3 h-3 text-blue-600" />
                  <span>ISRO SIH26167 • JUDGE &amp; EVALUATOR BRIEFING</span>
                </div>
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-1.5 sm:gap-2">
                  <span>Welcome, Evaluators!</span>
                  <span className="text-base sm:text-xl">🇮🇳</span>
                </h2>
                <span className="text-[11px] sm:text-xs font-semibold text-blue-600">
                  Problem Statement Compliance &amp; Sovereign Innovation Tour
                </span>
              </div>

              <button
                type="button"
                onClick={handleFinishTour}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Introductory Speech */}
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Hello! We are <strong>Ali</strong> and <strong>Samridhi</strong>, your mission co-pilots for SatQuery. We built this interactive tour so you can immediately verify our <strong>100% compliance with ISRO Problem Statement SIH26167</strong>, followed by the <strong>8 sovereign innovations</strong> and our camera-ready IEEE research paper!
            </p>

            {/* Two-Part Roadmap Pill Grid */}
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-blue-50/70 border border-blue-100 flex flex-col gap-0.5 sm:gap-1">
                <span className="font-bold text-blue-900 flex items-center gap-1 text-[10px] sm:text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span>Part 1: PS Mandates</span>
                </span>
                <span className="text-[9px] sm:text-[10px] text-blue-700 leading-tight">
                  VRSBench LoRA, Optical+SAR fusion, WGS84 grounding &amp; SITREP reports.
                </span>
              </div>

              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-purple-50/70 border border-purple-100 flex flex-col gap-0.5 sm:gap-1">
                <span className="font-bold text-purple-900 flex items-center gap-1 text-[10px] sm:text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                  <span>Part 2: Sovereign Innovations</span>
                </span>
                <span className="text-[9px] sm:text-[10px] text-purple-700 leading-tight">
                  Digital Twin, Sentinel alerts, HITL studio, GovTech SDK &amp; IEEE Paper.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-2 sm:gap-3 pt-1.5 sm:pt-2 border-t border-slate-100">
              <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <span className="text-[10px] sm:text-[11px] text-slate-500">Don't show again</span>
              </label>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handleFinishTour}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Skip
                </button>

                <button
                  type="button"
                  onClick={onStartTour}
                  className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
                  <span>Start Tour</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    );
  }

  // If tour is not actively open, render nothing
  if (!isOpen) return null;

  const isBotOnLeft = step.botSide === 'left';
  const hasCutout = targetRect && !step.isMilestone && step.targetSelector;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none select-none overflow-hidden font-general">
      
      {/* ------------------------------------------------------------------- */}
      {/* SVG Spotlight Mask (Clean smooth dark backdrop for milestone, cutout for target) */}
      {/* ------------------------------------------------------------------- */}
      <svg 
        className="fixed inset-0 w-full h-full pointer-events-auto"
        style={{ width: '100vw', height: '100vh' }}
        onClick={handleNext}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {hasCutout && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="16"
                fill="black"
              />
            )}
          </mask>
        </defs>

        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill={step.isMilestone ? "rgba(15, 23, 42, 0.85)" : "rgba(15, 23, 42, 0.72)"}
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* ------------------------------------------------------------------- */}
      {/* Glowing Border around Active Tool (Only when targeting a tool) */}
      {/* ------------------------------------------------------------------- */}
      {hasCutout && (
        <div
          className="fixed pointer-events-none transition-all duration-300 rounded-2xl border-2 border-cyan-400 shadow-[0_0_28px_rgba(34,211,238,0.9)] ring-4 ring-cyan-400/25 animate-pulse"
          style={{
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
            zIndex: 10001
          }}
        >
          {/* 4 Corner Reticle Accents */}
          <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-300" />
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-300" />
          <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-300" />
          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-300" />
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Side-by-Side: Bot Character + Clean White Chat Bubble */}
      {/* ------------------------------------------------------------------- */}
      <div
        ref={dialogRef}
        className="fixed pointer-events-auto transition-all duration-300 ease-out z-[10002]"
        style={{
          top: `${cardPosition.top}px`,
          left: `${cardPosition.left}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-end gap-2 sm:gap-4 ${isBotOnLeft ? 'flex-row' : 'flex-row-reverse'} animate-scaleUp w-[calc(100vw-16px)] max-w-[390px] sm:w-auto sm:max-w-none`}>
          
          {/* Bot Character Image (Sized prominently for 9:16 mobile vs desktop) */}
          <div className="flex-shrink-0 flex items-end">
            <img
              src={step.botImage}
              alt={step.speakerName}
              className={`${
                step.isMilestone 
                  ? 'h-40 xs:h-48 sm:h-80 md:h-88' 
                  : 'h-32 xs:h-38 sm:h-64 md:h-72'
              } w-auto object-contain drop-shadow-2xl select-none`}
            />
          </div>

          {/* Clean White Chatbot Bubble */}
          <div className={`relative bg-white text-slate-900 rounded-2xl sm:rounded-3xl p-3 xs:p-3.5 sm:p-6 shadow-2xl border border-slate-100 flex-1 min-w-0 ${
            step.isMilestone ? 'sm:w-[540px] md:w-[600px]' : 'sm:w-[420px] md:w-[460px]'
          } flex flex-col gap-1.5 xs:gap-2 sm:gap-2.5`}>
            
            {/* Speech bubble tail pointing towards the bot */}
            {isBotOnLeft ? (
              <div className="absolute bottom-7 xs:bottom-8 sm:bottom-12 -left-2 sm:-left-2.5 w-0 h-0 border-t-[6px] sm:border-t-[8px] border-t-transparent border-b-[6px] sm:border-b-[8px] border-b-transparent border-r-[8px] sm:border-r-[10px] border-r-white drop-shadow-[-2px_0_2px_rgba(0,0,0,0.03)]" />
            ) : (
              <div className="absolute bottom-7 xs:bottom-8 sm:bottom-12 -right-2 sm:-right-2.5 w-0 h-0 border-t-[6px] sm:border-t-[8px] border-t-transparent border-b-[6px] sm:border-b-[8px] border-b-transparent border-l-[8px] sm:border-l-[10px] border-l-white drop-shadow-[2px_0_2px_rgba(0,0,0,0.03)]" />
            )}

            {/* Bubble Top Row: Rubric Tag Badge + Title + Close */}
            <div className="flex items-start justify-between gap-1.5 sm:gap-2 border-b border-slate-100 pb-1.5 sm:pb-2.5">
              <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0">
                
                {/* Judge Rubric Tag Badge */}
                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                  <span className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[8px] xs:text-[9px] font-mono font-bold border tracking-wider truncate max-w-[210px] sm:max-w-none ${step.tagColor}`}>
                    {step.rubricTag}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400">
                    {step.badge}
                  </span>
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5">
                  <h3 className="text-xs xs:text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-snug truncate">
                    {step.greeting}
                  </h3>
                  <span className="text-[10px] sm:text-[11px] text-blue-600 font-semibold truncate hidden xs:inline">
                    • {step.speakerName}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinishTour}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer flex-shrink-0"
                title="Skip tour (Esc)"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* Dialogue Body */}
            <p className="text-[11px] xs:text-xs sm:text-[13px] text-slate-600 leading-relaxed select-text">
              {step.content}
            </p>

            {/* Milestone Checklist (Shown on Step 7) */}
            {step.isMilestone && step.checklist && (
              <div className="p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col gap-1 sm:gap-1.5 my-0.5 sm:my-1">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
                  <span>Mandatory PS Deliverables Verified:</span>
                </span>
                <div className="grid grid-cols-1 gap-0.5 sm:gap-1 text-[9px] xs:text-[10px] sm:text-[11px] text-slate-600">
                  {step.checklist.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-1 sm:gap-1.5">
                      <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[8px] sm:text-[9px] font-bold flex-shrink-0 mt-0.5">✓</span>
                      <span className="leading-tight">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Direct Research Paper Action Button on Step 14 */}
            {step.id === 'paper' && onOpenPaper && (
              <button
                type="button"
                onClick={onOpenPaper}
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-[11px] sm:text-xs font-semibold shadow-sm transition-all cursor-pointer my-0.5 sm:my-1 w-full"
              >
                <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Open IEEE 4-Page Research Paper (PDF)</span>
              </button>
            )}

            {/* Stepper Progress Dots */}
            <div className="flex items-center justify-center gap-1 pt-0.5 sm:pt-1">
              {TOUR_STEPS.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  className={`transition-all rounded-full cursor-pointer ${
                    idx === currentStep
                      ? s.isMilestone
                        ? 'w-4 sm:w-6 h-1 sm:h-1.5 bg-amber-500'
                        : 'w-3.5 sm:w-5 h-1 sm:h-1.5 bg-blue-600'
                      : 'w-1 sm:w-1.5 h-1 sm:h-1.5 bg-slate-200 hover:bg-slate-300'
                  }`}
                  title={`Go to Step ${idx + 1}: ${s.greeting}`}
                />
              ))}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[11px] sm:text-xs font-semibold text-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-1 sm:gap-1.5">
                {/* Final Step: Direct "Ask Guide Bot" & "Launch Cockpit" */}
                {isLastStep ? (
                  <>
                    {onOpenPaper && (
                      <button
                        type="button"
                        onClick={onOpenPaper}
                        className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-colors cursor-pointer"
                        title="Read IEEE Research Manuscript"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Paper</span>
                      </button>
                    )}

                    {onOpenGuideBot && (
                      <button
                        type="button"
                        onClick={onOpenGuideBot}
                        className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] sm:text-xs font-semibold border border-indigo-200 transition-colors cursor-pointer"
                        title="Ask deep technical questions about weights, architecture & rubrics"
                      >
                        <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span>Ask Guide Bot</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleFinishTour}
                      className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] sm:text-xs font-semibold shadow-sm transition-all cursor-pointer"
                    >
                      <span>Launch Cockpit</span>
                      <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleFinishTour}
                      className="px-2 sm:px-2.5 py-1 sm:py-1.5 text-[11px] sm:text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      Skip
                    </button>

                    <button
                      type="button"
                      onClick={handleNext}
                      className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl text-white text-[11px] sm:text-xs font-semibold shadow-sm transition-all cursor-pointer ${
                        step.isMilestone
                          ? 'bg-amber-600 hover:bg-amber-700 font-bold shadow-amber-600/20'
                          : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                      }`}
                    >
                      <span className="sm:hidden">{step.isMilestone ? 'Innovations →' : 'Next'}</span>
                      <span className="hidden sm:inline">{step.isMilestone ? 'Explore Live Innovations →' : 'Next'}</span>
                      <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}
