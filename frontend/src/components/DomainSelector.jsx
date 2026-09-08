import React from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import AgencyLogo from './AgencyLogo';

export const DOMAIN_PROFILES = [
  {
    id: 'general',
    name: 'ISRO — Indian Space Research Organisation',
    deptName: 'ISRO (DOS)',
    shortName: 'ISRO (All-Domain)',
    agency: 'isro.gov.in',
    badge: 'ISRO • Dept of Space',
    activeColor: 'border-cyan-500 text-cyan-700 dark:text-cyan-300 bg-cyan-500/15 dark:bg-white/15',
    description: 'Universal vision-language reasoning across all satellite sensors & task families.'
  },
  {
    id: 'disaster',
    name: 'NDMA — National Disaster Management Authority',
    deptName: 'NDMA (MHA)',
    shortName: 'NDMA (Disaster)',
    agency: 'ndma.gov.in',
    badge: 'NDMA • DMSP Flood',
    aoiId: 'aoi_02_brahmaputra',
    modality: 'change_detection',
    activeColor: 'border-rose-500 text-rose-700 dark:text-rose-300 bg-rose-500/15 dark:bg-white/15',
    defaultQuery: "What changed between these two dates, and where did the change occur?",
    description: 'Bi-temporal flood inundation extent, breach identification, and rapid damage assessment.'
  },
  {
    id: 'agriculture',
    name: 'MNCFC / ICAR — Mahalanobis National Crop Forecast Centre',
    deptName: 'MNCFC (MoA&FW)',
    shortName: 'MNCFC / ICAR (Agri)',
    agency: 'icar.org.in',
    badge: 'MNCFC • ICAR Agri',
    aoiId: 'aoi_03_punjab',
    modality: 'optical',
    activeColor: 'border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 dark:bg-white/15',
    defaultQuery: "What type of agricultural crops/vegetation are present?",
    description: 'Multispectral crop classification, field boundary recognition, and drought stress monitoring.'
  },
  {
    id: 'urban',
    name: 'MoHUA — Ministry of Housing and Urban Affairs',
    deptName: 'MoHUA (Smart Cities)',
    shortName: 'MoHUA (Urban)',
    agency: 'mohua.gov.in',
    badge: 'MoHUA • Smart Cities',
    aoiId: 'aoi_01_hyderabad',
    modality: 'sar_fusion',
    activeColor: 'border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-500/15 dark:bg-white/15',
    defaultQuery: "Use the optical and SAR images together to identify built-up and water-covered regions",
    description: 'Cross-modal Optical+SAR built-up density analysis and water-body encroachment detection.'
  },
  {
    id: 'maritime',
    name: 'INCOIS — Indian National Centre for Ocean Information Services',
    deptName: 'INCOIS (MoES)',
    shortName: 'INCOIS (Maritime/SAR)',
    agency: 'incois.gov.in',
    badge: 'INCOIS • MoES Radar',
    aoiId: 'aoi_01_hyderabad',
    modality: 'sar',
    activeColor: 'border-indigo-500 text-indigo-700 dark:text-indigo-300 bg-indigo-500/15 dark:bg-white/15',
    defaultQuery: "Extract radar backscatter, identify corner reflectors",
    description: 'Sentinel-1 C-band SAR microwave backscatter analysis, vessel detection, and coastal infrastructure.'
  }
];

export default function DomainSelector({ 
  activeDomain, 
  onSelectDomain,
  aois = [],
  selectedAoi,
  onSelectAoi
}) {
  return (
    <div className="liquid-glass-strong px-3 py-2 sm:px-4 sm:py-2 rounded-2xl flex items-center justify-between gap-3 shadow-lg flex-shrink-0 w-full overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-2 sm:gap-2.5 flex-nowrap min-w-0">
        
        {/* Mission Domain Profile Dropdown — iOS Liquid Glass Pill */}
        <div id="tour-domain-selector" className="relative flex items-center gap-2 ios-dropdown-pill pl-3 pr-7 py-1.5 flex-shrink-0 group cursor-pointer overflow-hidden">
          <AgencyLogo 
            domain={activeDomain.agency} 
            className={`${activeDomain.id === 'general' ? 'w-4 h-3.5 object-contain' : 'w-3.5 h-3.5 rounded-xs object-contain'} pointer-events-none flex-shrink-0`} 
          />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 pointer-events-none select-none">
            {activeDomain.deptName} — {activeDomain.shortName}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-white/40 group-hover:text-slate-600 dark:group-hover:text-white/70 transition-colors pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          
          <select
            value={activeDomain.id}
            onChange={(e) => {
              const found = DOMAIN_PROFILES.find(dp => dp.id === e.target.value);
              if (found && onSelectDomain) onSelectDomain(found);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            title={activeDomain.description}
          >
            {DOMAIN_PROFILES.map((dp) => (
              <option key={dp.id} value={dp.id} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
                {dp.deptName} — {dp.shortName}
              </option>
            ))}
          </select>
        </div>

        {/* Target AOI Scene Dropdown — iOS Liquid Glass Pill */}
        <div id="tour-aoi-selector" className="relative flex items-center gap-1.5 ios-dropdown-pill pl-3 pr-7 py-1.5 flex-shrink-0 group cursor-pointer overflow-hidden">
          <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0 pointer-events-none" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 max-w-[210px] truncate select-none pointer-events-none">
            {selectedAoi ? `${selectedAoi.name} (${selectedAoi.state})` : 'Select AOI'}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-white/40 group-hover:text-slate-600 dark:group-hover:text-white/70 transition-colors pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          
          <select
            value={selectedAoi?.id || ''}
            onChange={(e) => {
              const match = aois.find(a => a.id === e.target.value);
              if (match && onSelectAoi) onSelectAoi(match);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            title="Select geographic area of interest"
          >
            {aois.map((aoi) => (
              <option key={aoi.id} value={aoi.id} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
                {aoi.name} ({aoi.state})
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Right side: Domain Specialist Badge — iOS Frosted Capsule */}
      <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] font-mono font-medium text-slate-700 dark:text-white/70 ios-dropdown-pill px-3 py-1 shadow-xs">
          {activeDomain.badge}
        </span>
      </div>

    </div>
  );
}
