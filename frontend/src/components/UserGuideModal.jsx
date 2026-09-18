import React, { useState } from 'react';
import { 
  X, 
  BookOpen, 
  Bot, 
  Play, 
  ExternalLink, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  Sparkles, 
  Layers, 
  Globe, 
  ShieldAlert, 
  ShieldCheck, 
  Compass, 
  Check, 
  ChevronRight,
  Download,
  Terminal,
  Award,
  Radio,
  Eye
} from 'lucide-react';
import AgencyLogo from './AgencyLogo';

/**
 * Sovereign User Guide & Operational Manual Modal
 * Covers: SIH Judge / Evaluator, ISRO, NDMA, MoA (MNCFC), MoHUA, MoD.
 * Features: Agency logos, "Who are you?" selector, "How SatQuery Will Help You",
 * 4-Step Operational Workflows, and direct judge actions (Ask GuideBot & Demo Video).
 */

const USER_GUIDE_ROLES = [
  {
    id: 'sih_judge',
    label: 'SIH Judge / Evaluator',
    shortLabel: 'SIH Judge',
    org: 'Smart India Hackathon 2026',
    subOrg: 'ISRO Problem Statement SIH26167',
    badge: 'SIH26167 EVALUATION',
    logoType: 'sih',
    domain: 'sih.gov.in',
    tagline: 'Comprehensive evaluation guide on remote-sensing adaptation, benchmark metrics, and sovereign innovation',
    mandate: 'Evaluate team submission against mandatory SIH26167 clauses: open RS data fine-tuning (BigEarthNet/VRSBench), single-image VQA/grounding, bi-temporal change detection, optical+SAR fusion, and agentic orchestration.',
    howItHelpsTitle: 'How SatQuery Will Help You As A Judge / Evaluator:',
    benefits: [
      {
        title: '100% Problem Statement SIH26167 Compliance',
        desc: 'Genuinely fine-tuned vision-language model on VRSBench (Qwen2.5-VL-3B + LoRA) satisfying the mandatory remote-sensing adaptation requirement — not just a generic LLM wrapper.'
      },
      {
        title: 'Verifiable Accuracy & Zero Fabricated Claims',
        desc: '77.0% LLM-judged VQA accuracy on 200 held-out questions, Acc@0.5 44.0% visual grounding, and total transparency on live GPU backend vs. serverless Vercel fallback tiers ("PS compromise nahi").'
      },
      {
        title: 'Complementary Optical + SAR Cross-Modal Fusion',
        desc: 'Real Sentinel-1 dual-pol (VV/VH) radar backscatter statistical extraction fused with optical imagery for all-weather vision through dense clouds and smoke.'
      },
      {
        title: 'Sub-Pixel ChangeFormer with Real Hectare Quantification',
        desc: 'Bi-temporal Siamese ViT difference network producing vector GeoJSON and exact WGS84 polygon land-area calculations (cross-checked to 852.155 ha on Brahmaputra flood AOI).'
      },
      {
        title: 'Cryptographic SHA-256 SITREP Reports',
        desc: 'Downloadable official SITREP audit reports in PDF and JSON with verifiable cryptographic SHA-256 hash over recorded parameters.'
      }
    ],
    sopSteps: [
      {
        step: '1',
        title: 'Inspect Fine-Tuned Weights & Notebooks',
        desc: 'Access public Hugging Face adapter repositories (v1 & v2) and open-source Kaggle T4 GPU fine-tuning notebooks directly from the master links.'
      },
      {
        step: '2',
        title: 'Execute Multi-Modal Queries',
        desc: 'Test single-image VQA, referring-expression grounding, bi-temporal change detection, and SAR fusion using exemplar or custom GeoTIFF uploads.'
      },
      {
        step: '3',
        title: 'Review Execution Summary Telemetry',
        desc: 'Audit the real execution summary object displaying model latency, neural logits confidence, and genuine model attribution tags.'
      },
      {
        step: '4',
        title: 'Export Vector Layers & SITREP Audit',
        desc: 'Download OGC-compliant GeoJSON, ISRO Bhuvan KML, and the certified SITREP PDF report with SHA-256 content verification.'
      }
    ],
    isJudge: true
  },
  {
    id: 'isro_gov',
    label: 'ISRO / Space Scientist',
    shortLabel: 'ISRO Gov',
    org: 'Indian Space Research Organisation',
    subOrg: 'Department of Space • NRSC • SAC • IN-SPACe',
    badge: 'SPACE AGENCY',
    logoType: 'isro',
    domain: 'isro.gov.in',
    tagline: 'Sovereign Earth Observation, Bhuvan GIS sync, and Cartosat/RISAT sensor readiness',
    mandate: 'National spatial data infrastructure management, high-resolution satellite payload operations, and multi-mission Earth observation data dissemination.',
    howItHelpsTitle: 'How SatQuery Will Help ISRO & Space Scientists:',
    benefits: [
      {
        title: 'ISRO Bhuvan & OGC Vector Layer Compatibility',
        desc: 'Natively exports detected bounding coordinates and change masks into Bhuvan-compatible KML, OGC GeoJSON, and WKT CSV formats for instant GIS ingestion.'
      },
      {
        title: 'Zero-Code Cartosat-2S & RISAT SAR Readiness',
        desc: 'Architecture is pre-engineered for sub-meter panchromatic/multispectral optical feeds paired with C/X-band SAR radar, matching SAC undisclosed test data.'
      },
      {
        title: 'Live Copernicus & Bhoonidhi Scene Discovery',
        desc: 'Integrated unauthenticated Copernicus OData satellite registry client with zero-shot RemoteCLIP semantic scene filtering.'
      },
      {
        title: 'Low-Bandwidth Viewport GeoTIFF Tiling',
        desc: 'Extracts sub-50KB tile crops dynamically from multi-gigabyte rasters, enabling field teams to inspect space imagery over rural 2G/3G networks.'
      }
    ],
    sopSteps: [
      {
        step: '1',
        title: 'Connect Satellite Raster / AOI',
        desc: 'Select or upload a calibrated multi-band GeoTIFF with genuine CRS/geotransform metadata.'
      },
      {
        step: '2',
        title: 'Interrogate with Natural Language',
        desc: 'Ask complex spatial questions in plain English or Hindi without writing complex GIS SQL or Python scripts.'
      },
      {
        step: '3',
        title: 'Cross-Analyze Optical & SAR Polarimetry',
        desc: 'Evaluate radar backscatter ratios (water likelihood, urban double-bounce, volume scattering) alongside optical bands.'
      },
      {
        step: '4',
        title: 'Sync to Bhuvan Geoportal',
        desc: 'Export KML / GeoJSON files directly into ISRO Bhuvan or national GIS infrastructure.'
      }
    ],
    recommendedAoi: 'bhoonidhi',
    prompt: 'How does SatQuery integrate with ISRO Bhuvan and handle Cartosat-2S optical + RISAT SAR data?'
  },
  {
    id: 'ndma_gov',
    label: 'Disaster Management (NDMA / SDMA)',
    shortLabel: 'NDMA Gov',
    org: 'National Disaster Management Authority',
    subOrg: 'Ministry of Home Affairs • State Disaster Cells',
    badge: 'DISASTER RELIEF',
    logoType: 'ndma',
    domain: 'ndma.gov.in',
    tagline: 'Emergency flood routing, monsoon cloud-penetrating radar, and automated land-area quantification',
    mandate: 'Mitigate natural disasters, coordinate immediate relief logistics, and monitor real-time flood, cyclone, wildfire, and landslide hazards across India.',
    howItHelpsTitle: 'How SatQuery Will Help Disaster Management Authorities (NDMA):',
    benefits: [
      {
        title: 'All-Weather Cloud-Penetrating Sentinel-1 SAR',
        desc: 'C-band synthetic aperture radar pierces dense monsoon clouds and severe cyclone cover, mapping exact floodwater boundaries when optical sensors are blinded.'
      },
      {
        title: 'Automated Ground Hectare Quantification',
        desc: 'Instant polygon area calculation yields precise hectares and acres of inundated land (e.g. 852.155 ha flood expanse) for immediate relief deployment.'
      },
      {
        title: 'Certified Incident SITREP Generation',
        desc: 'Downloadable PDF situational reports with cryptographic SHA-256 integrity hash for formal inter-ministerial emergency coordination.'
      },
      {
        title: 'Continuous Live Weather & Hazard Telemetry',
        desc: 'Direct integrations with Open-Meteo live weather, USGS seismic alerts, and OSM Nominatim reverse-geocoding.'
      }
    ],
    sopSteps: [
      {
        step: '1',
        title: 'Switch to Situational Twin Cockpit',
        desc: 'Open live weather, hazard alerts, and real-time atmospheric readings for the affected disaster zone.'
      },
      {
        step: '2',
        title: 'Activate SAR Radar / Flood Mode',
        desc: 'Select optical + SAR modality to penetrate cloud cover and delineate standing water bodies.'
      },
      {
        step: '3',
        title: 'Run Bi-Temporal Change Detection',
        desc: 'Compare pre-disaster baseline (T1) with post-flood satellite pass (T2) to highlight newly inundated areas in red/magenta.'
      },
      {
        step: '4',
        title: 'Generate & Dispatch SITREP PDF',
        desc: 'Export the tamper-proof SITREP report with exact hectare calculations for district magistrates and NDRF teams.'
      }
    ],
    recommendedAoi: 'brahmaputra',
    prompt: 'How does SatQuery assist NDMA and emergency response teams during major flood or cyclone disasters?'
  },
  {
    id: 'moa_gov',
    label: 'Agriculture & Food (MNCFC / ICAR)',
    shortLabel: 'MoA Gov',
    org: 'Ministry of Agriculture & Farmers Welfare',
    subOrg: 'Mahalanobis National Crop Forecast Centre (MNCFC) • ICAR',
    badge: 'AGRITECH & PMFBY',
    logoType: 'custom_agri',
    domain: 'icar.org.in',
    tagline: 'Crop health monitoring, drought anomaly tracking, and PMFBY insurance parcel verification',
    mandate: 'Ensure national food security, forecast seasonal crop yields, track drought cycles, and expedite PMFBY crop insurance claim settlements for Indian farmers.',
    howItHelpsTitle: 'How SatQuery Will Help Agriculture & Farm Authorities (MoA / MNCFC):',
    benefits: [
      {
        title: 'Bi-Temporal Crop Health & Drought Tracking',
        desc: 'Pairwise satellite time-series analysis detects parched crops, delayed sowing, and irrigation shortages across entire agro-climatic zones.'
      },
      {
        title: 'Parcel-Level PMFBY Damage Assessment',
        desc: 'Text-guided region grounding pinpoints specific field parcels and calculates affected acreage for rapid, dispute-free crop insurance compensation.'
      },
      {
        title: 'Voice-Activated Hindi/English Queries',
        desc: 'Allows district agriculture officers and Gram Panchayats to interrogate satellite scenes using spoken Hindi or English via Web Speech API.'
      },
      {
        title: 'Multi-Temporal Vegetation Growth Tracking',
        desc: 'Satellite Time-Machine tracks 2019–2025 agricultural crop rotation patterns and green canopy indices over multi-year cycles.'
      }
    ],
    sopSteps: [
      {
        step: '1',
        title: 'Select Agricultural District AOI',
        desc: 'Load farmland scenes (e.g. Punjab farm belt or drought-prone Vidarbha/Marathwada).'
      },
      {
        step: '2',
        title: 'Ask in Hindi or English',
        desc: 'Speak or type queries like: "फसलों में सूखा या पानी की कमी कहाँ है?" or "Assess crop canopy health".'
      },
      {
        step: '3',
        title: 'Inspect Parcel Bounding Boxes',
        desc: 'Review grounded coordinates highlighting stressed parcels with computed hectare footprints.'
      },
      {
        step: '4',
        title: 'Export Crop Loss Evidence',
        desc: 'Generate GIS-ready vector polygons to attach directly to PMFBY insurance settlement dossiers.'
      }
    ],
    recommendedAoi: 'punjab',
    prompt: 'How can the Ministry of Agriculture and MNCFC use SatQuery for crop monitoring and PMFBY insurance verification?'
  },
  {
    id: 'mohua_gov',
    label: 'Smart Cities & Urban Planning (MoHUA)',
    shortLabel: 'MoHUA Gov',
    org: 'Ministry of Housing & Urban Affairs',
    subOrg: 'Smart Cities Mission • Municipal Corporations • Town Planning',
    badge: 'URBAN GOVERNANCE',
    logoType: 'custom_urban',
    domain: 'mohua.gov.in',
    tagline: 'Illegal encroachment detection, building footprint grounding, and master-plan compliance',
    mandate: 'Plan sustainable urban growth, detect unauthorized construction, prevent water-body encroachments, and audit municipal property footprints.',
    howItHelpsTitle: 'How SatQuery Will Help Urban Planners & Municipalities (MoHUA):',
    benefits: [
      {
        title: 'Illegal Encroachment & Mining Detection',
        desc: 'Bi-temporal ChangeFormer highlights unauthorized developments, lake-bed encroachments, and illegal quarrying over time.'
      },
      {
        title: 'Multi-Instance Building Footprint Grounding',
        desc: 'Grounding-DINO combined with SAHI multi-tile slicing pinpoints hundreds of individual structures in dense urban informal settlements.'
      },
      {
        title: 'Seamless Municipal GIS Integration',
        desc: 'Export spatial vectors straight into municipal ArcGIS and QGIS servers for property tax assessment and zoning compliance.'
      },
      {
        title: 'In-Field Mobile AR Ground-Truth Verification',
        desc: 'Field municipal inspectors can open camera viewfinder on mobile devices with live compass and hazard overlays to verify ground truth on-site.'
      }
    ],
    sopSteps: [
      {
        step: '1',
        title: 'Load Urban AOI Scene',
        desc: 'Select metropolitan sectors (e.g. Hyderabad Hitec City or Mumbai coastal corridors).'
      },
      {
        step: '2',
        title: 'Execute Building Grounding',
        desc: 'Ask: "Locate buildings in this image" to trigger Grounding-DINO + SAHI multi-tile instance detection.'
      },
      {
        step: '3',
        title: 'Run Multi-Temporal Encroachment Audit',
        desc: 'Compare historical baseline satellite passes against recent scenes to highlight unauthorized new constructions.'
      },
      {
        step: '4',
        title: 'Download Shapefiles & Coordinates',
        desc: 'Export WKT CSV and GeoJSON for property tax enforcement and municipal notices.'
      }
    ],
    recommendedAoi: 'hyderabad',
    prompt: 'How does SatQuery detect illegal urban encroachments and locate building footprints for town planners?'
  },
  {
    id: 'defense_gov',
    label: 'Defense & Reconnaissance (MoD / NTRO)',
    shortLabel: 'Defense Gov',
    org: 'Ministry of Defence • NTRO',
    subOrg: 'Armed Forces • Defence Intelligence Agency',
    badge: 'STRATEGIC DEFENCE',
    logoType: 'custom_defense',
    domain: 'mod.gov.in',
    tagline: 'Border surveillance, 24/7 radar camouflage penetration, and air-gapped security',
    mandate: 'Defend national sovereignty, conduct 24/7 border reconnaissance, monitor adversary fortifications, and preserve classified operational data security.',
    howItHelpsTitle: 'How SatQuery Will Help Defense & Border Reconnaissance (MoD / NTRO):',
    benefits: [
      {
        title: '24/7 Day/Night SAR Radar Penetration',
        desc: 'Synthetic Aperture Radar operates independently of sunlight, fog, or haze, penetrating camouflage netting via radar double-bounce analysis.'
      },
      {
        title: 'Automated Border Fortification Change Detection',
        desc: 'Siamese ViT difference network flags new airstrips, trenches, shelters, and forward troop staging areas between consecutive satellite passes.'
      },
      {
        title: 'Air-Gapped Sovereign On-Premise Deployment',
        desc: 'Can be deployed on isolated, secure defense networks via local Docker / PyTorch inference containers with zero external internet telemetry.'
      },
      {
        title: 'Test-Time Augmentation (TTA) Confidence Stress-Test',
        desc: '5-trial affine rotation and Gaussian perturbation testing confirms model predictions remain rock-solid under adverse image degradation.'
      }
    ],
    sopSteps: [
      {
        step: '1',
        title: 'Deploy Air-Gapped Local Pipeline',
        desc: 'Execute via local FastAPI / PyTorch container with fine-tuned Qwen2.5-VL LoRA weights.'
      },
      {
        step: '2',
        title: 'Ingest Optical + SAR Pairs',
        desc: 'Pair optical satellite passes with Sentinel-1/RISAT radar passes over strategic border passes.'
      },
      {
        step: '3',
        title: 'Execute Tactical Spatial Query',
        desc: 'Interrogate: "Detect newly constructed runways or staging areas" to identify tactical military alterations.'
      },
      {
        step: '4',
        title: 'Run Confidence Stress-Test',
        desc: 'Trigger TTA perturbation stress-testing to verify intelligence integrity before tactical dispatch.'
      }
    ],
    recommendedAoi: 'ladakh',
    prompt: 'How does SatQuery support defense reconnaissance, camouflage penetration, and air-gapped security?'
  }
];

export default function UserGuideModal({
  isOpen,
  onClose,
  onOpenGuideBot,
  onNavigateTab,
  onSelectAoi,
  isDarkMode = true
}) {
  const [selectedRole, setSelectedRole] = useState('sih_judge');
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const activeRole = USER_GUIDE_ROLES.find(r => r.id === selectedRole) || USER_GUIDE_ROLES[0];
  const DEMO_VIDEO_URL = "https://drive.google.com/file/d/1wXmPzBycXPVv-Xyxt5H7ruJtYXB5K1Cy/view?usp=drivesdk";

  const handleAskGuideBotForRole = (questionText) => {
    onClose();
    onOpenGuideBot?.(questionText);
  };

  const handleCopyDemoLink = () => {
    navigator.clipboard.writeText(DEMO_VIDEO_URL);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  return (
    <div className="fixed inset-0 z-[2700] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl animate-fade-in font-sans">
      
      {/* Responsive Modal Container — Guaranteed fitting on 360px phones up to 4K screens */}
      <div className="relative w-full max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl max-h-[92vh] sm:max-h-[88vh] rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-[#070b1c]/95 backdrop-blur-2xl text-slate-900 dark:text-white border border-slate-200 dark:border-white/15 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-3.5 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] flex-shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-indigo-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0 shadow-sm">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  Who are you?
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold font-mono bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                  Sovereign User Guide
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-white/60 truncate">
                Official Operational Manual for Government Ministries &amp; SIH Evaluators
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stakeholder Selector Bar with REAL LOGOS (Scrollable horizontally on mobile, wrapping on desktop) */}
        <div className="px-3.5 sm:px-6 py-2.5 border-b border-slate-200/60 dark:border-white/10 bg-slate-100/50 dark:bg-black/20 flex-shrink-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-max">
            {USER_GUIDE_ROLES.map((role) => {
              const isSelected = selectedRole === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className={`px-3 py-2 rounded-xl text-left border flex items-center gap-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md font-bold'
                      : 'bg-white/80 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-white/80 hover:bg-white dark:hover:bg-white/10'
                  }`}
                >
                  {/* Real Logo Renderer */}
                  <div className={`w-6 h-6 rounded-lg p-0.5 flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-white/20' : 'bg-slate-100 dark:bg-white/10'
                  }`}>
                    {role.logoType === 'sih' && (
                      <AgencyLogo domain="sih.gov.in" className="w-5 h-5 object-contain" />
                    )}
                    {role.logoType === 'isro' && (
                      <AgencyLogo domain="isro.gov.in" className="w-5 h-5 object-contain" />
                    )}
                    {role.logoType === 'ndma' && (
                      <AgencyLogo domain="ndma.gov.in" className="w-5 h-5 object-contain" />
                    )}
                    {role.logoType === 'custom_agri' && (
                      <div className="w-full h-full rounded bg-emerald-600 flex items-center justify-center text-white text-[8px] font-black">
                        MoA
                      </div>
                    )}
                    {role.logoType === 'custom_urban' && (
                      <div className="w-full h-full rounded bg-amber-600 flex items-center justify-center text-white text-[8px] font-black">
                        MoHUA
                      </div>
                    )}
                    {role.logoType === 'custom_defense' && (
                      <div className="w-full h-full rounded bg-slate-700 flex items-center justify-center text-white text-[8px] font-black">
                        MoD
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <span className="text-xs leading-tight font-semibold">
                      {role.shortLabel}
                    </span>
                    <span className={`text-[9px] font-mono leading-tight ${
                      isSelected ? 'text-white/80' : 'text-slate-400 dark:text-white/50'
                    }`}>
                      {role.badge.split(' ')[0]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Guide Content Area — zero horizontal overflow */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5 md:p-6 flex flex-col gap-4 sm:gap-5">
          
          {/* Agency Banner Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-cyan-500/5 to-slate-500/5 border border-indigo-500/20 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/10 border border-slate-200/80 dark:border-white/15 p-1.5 flex items-center justify-center flex-shrink-0 shadow-sm">
                {activeRole.logoType === 'sih' && (
                  <AgencyLogo domain="sih.gov.in" className="w-9 h-9 object-contain" />
                )}
                {activeRole.logoType === 'isro' && (
                  <AgencyLogo domain="isro.gov.in" className="w-9 h-9 object-contain" />
                )}
                {activeRole.logoType === 'ndma' && (
                  <AgencyLogo domain="ndma.gov.in" className="w-9 h-9 object-contain" />
                )}
                {activeRole.logoType === 'custom_agri' && (
                  <div className="w-full h-full rounded-xl bg-emerald-600 flex items-center justify-center text-white text-xs font-black">
                    MoA
                  </div>
                )}
                {activeRole.logoType === 'custom_urban' && (
                  <div className="w-full h-full rounded-xl bg-amber-600 flex items-center justify-center text-white text-xs font-black">
                    MoHUA
                  </div>
                )}
                {activeRole.logoType === 'custom_defense' && (
                  <div className="w-full h-full rounded-xl bg-slate-700 flex items-center justify-center text-white text-xs font-black">
                    MoD
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    {activeRole.label}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    {activeRole.badge}
                  </span>
                </div>
                <div className="text-[11px] sm:text-xs text-indigo-600 dark:text-cyan-400 font-semibold font-mono">
                  {activeRole.subOrg}
                </div>
                <p className="text-xs text-slate-600 dark:text-white/70 mt-0.5">
                  {activeRole.tagline}
                </p>
              </div>
            </div>

            {/* Quick Demo Video Button in Banner */}
            <a
              href={DEMO_VIDEO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-102 flex-shrink-0 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Official Demo Video</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          </div>

          {/* CRITICAL ACTIONS SPECIFICALLY FOR SIH JUDGE / EVALUATOR */}
          {activeRole.isJudge && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-indigo-500/10 to-transparent border-2 border-amber-500/40 shadow-md flex flex-col gap-3">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-mono font-bold uppercase tracking-wider">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Primary Evaluator Direct Controls</span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                
                {/* 1. Click here to ask GuideBot anything about the project */}
                <button
                  type="button"
                  onClick={() => handleAskGuideBotForRole("Provide a complete judge evaluation briefing on SatQuery: problem statement SIH26167 compliance, fine-tuned VRSBench weights, real vs fallback tiers, and verified accuracy metrics.")}
                  className="flex-1 p-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-indigo-500/30 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer group"
                >
                  <Bot className="w-4 h-4 text-cyan-300 group-hover:rotate-12 transition-transform flex-shrink-0" />
                  <span className="text-center">Click here to ask GuideBot anything about the project</span>
                </button>

                {/* 2. Click here for demo video */}
                <a
                  href={DEMO_VIDEO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-emerald-500/30 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer flex-shrink-0"
                >
                  <Play className="w-4 h-4 text-emerald-100 fill-emerald-100 flex-shrink-0" />
                  <span>Click here for demo video</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80 flex-shrink-0" />
                </a>

              </div>

              {/* Quick Evaluator Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider">
                  Judge Prompts:
                </span>
                {[
                  "Where can I find your fine-tuned Hugging Face weights?",
                  "What in this demo is actually running a fine-tuned model vs API?",
                  "What is your verified VQA and grounding accuracy?",
                  "How does the cross-modal optical + SAR fusion work?"
                ].map((promptText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAskGuideBotForRole(promptText)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-white/10 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-white/15 text-[11px] text-indigo-700 dark:text-indigo-300 font-medium transition-colors cursor-pointer"
                  >
                    {promptText}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section: How SatQuery Will Help You */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{activeRole.howItHelpsTitle}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeRole.benefits.map((b, bIdx) => (
                <div 
                  key={bIdx}
                  className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 flex flex-col gap-1 shadow-2xs"
                >
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 flex-shrink-0" />
                    {b.title}
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-white/70 leading-relaxed pl-3">
                    {b.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Standard Operating Procedure (SOP) / 4-Step Operational Workflow */}
          <div className="flex flex-col gap-2.5 pt-1">
            <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <Terminal className="w-4 h-4" />
              <span>4-Step Operational SOP for {activeRole.shortLabel}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {activeRole.sopSteps.map((s, sIdx) => (
                <div 
                  key={sIdx}
                  className="p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex flex-col gap-1.5 shadow-2xs relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold font-mono flex items-center justify-center">
                      {s.step}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 dark:text-white/40 uppercase">
                      Phase {s.step}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                    {s.title}
                  </h5>
                  <p className="text-[10px] text-slate-500 dark:text-white/60 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions for Government Roles */}
          {!activeRole.isJudge && (
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span className="text-xs font-medium text-slate-800 dark:text-white truncate">
                  Prompt GuideBot: "{activeRole.prompt}"
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleAskGuideBotForRole(activeRole.prompt)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex-shrink-0"
              >
                Ask GuideBot Now
              </button>
            </div>
          )}

        </div>

        {/* Modal Footer Bar */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-500 dark:text-white/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span>SatQuery Sovereign Remote Sensing AI</span>
            <span>•</span>
            <span className="font-mono text-cyan-600 dark:text-cyan-400">ISRO SIH26167</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopyDemoLink}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              {copiedLink ? <Check className="w-3 h-3 text-emerald-500" /> : <ExternalLink className="w-3 h-3" />}
              <span>{copiedLink ? 'Link Copied' : 'Copy Video Link'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-slate-200/70 dark:bg-white/10 text-slate-800 dark:text-white font-semibold hover:bg-slate-300 dark:hover:bg-white/20 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
