import React, { useState } from 'react';

const LOGO_DEV_KEY = "pk_YXEzqq4fT-CRqF0cKukKtQ";

// Clean monograms & vector fallbacks for Indian Government Ministries
const AGENCY_FALLBACKS = {
  'icar.org.in': {
    name: 'ICAR',
    color: 'bg-emerald-600 text-white font-bold',
    label: 'ICAR'
  },
  'mohua.gov.in': {
    name: 'MoHUA',
    color: 'bg-amber-600 text-white font-bold',
    label: 'MoHUA'
  },
  'incois.gov.in': {
    name: 'INCOIS',
    color: 'bg-indigo-600 text-white font-bold',
    label: 'INCOIS'
  },
  'copernicus.eu': {
    name: 'ESA',
    color: 'bg-cyan-600 text-white font-bold',
    label: 'ESA'
  }
};

export default function AgencyLogo({ 
  domain, 
  alt = "Agency", 
  className = "w-6 h-6",
  size = 128
}) {
  const [hasError, setHasError] = useState(false);

  // 1. SPIT: Sardar Patel Institute of Technology, Mumbai (/spit_logo.png)
  if (domain === 'spit.ac.in' || domain === 'spit') {
    return (
      <img
        src="/spit_logo.png"
        alt="SPIT Mumbai"
        className={`object-contain flex-shrink-0 ${className}`}
        loading="eager"
      />
    );
  }

  // 2. ISRO: Official Wikimedia SVG logo (/isro_logo.svg)
  if (domain === 'isro.gov.in') {
    return (
      <img
        src="/isro_logo.svg"
        alt="ISRO Official Insignia"
        className={`object-contain flex-shrink-0 ${className}`}
        loading="eager"
      />
    );
  }

  // 2. NDMA: Official National Disaster Management Authority emblem (/ndma_logo.png)
  if (domain === 'ndma.gov.in') {
    return (
      <img
        src="/ndma_logo.png"
        alt="NDMA Official Emblem"
        className={`object-contain flex-shrink-0 ${className}`}
        loading="eager"
      />
    );
  }

  // 3. SIH 2026: Official Smart India Hackathon 2026 emblem (/sih_logo.png)
  if (domain === 'sih.gov.in') {
    return (
      <img
        src="/sih_logo.png"
        alt="Smart India Hackathon 2026"
        className={`object-contain flex-shrink-0 ${className}`}
        loading="eager"
      />
    );
  }

  // 4. RemoteCLIP: Vision-Language Remote Sensing Foundation Model (Liu et al., IEEE TGRS 2024)
  if (domain === 'remoteclip') {
    return (
      <div className={`rounded flex items-center justify-center bg-gradient-to-tr from-cyan-600 to-blue-700 text-white font-bold text-[9px] shadow-sm tracking-tighter ${className}`} title="RemoteCLIP (Liu et al., 2024)">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2">
          <circle cx="12" cy="12" r="9" />
          <path d="m10 15 5-3-5-3v6Z" fill="currentColor" />
        </svg>
      </div>
    );
  }

  // 5. Grounding DINO: Open-Set Object Detection (Liu et al., 2023)
  if (domain === 'grounding-dino') {
    return (
      <div className={`rounded flex items-center justify-center bg-gradient-to-tr from-emerald-600 to-teal-700 text-white font-bold text-[9px] shadow-sm ${className}`} title="Grounding DINO (Liu et al., 2023)">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2">
          <path d="M3 7V5a2 2 0 0 1 2-2h2" />
          <path d="M17 3h2a2 2 0 0 1 2 2v2" />
          <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
          <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      </div>
    );
  }

  // 6. SAHI: Slicing Aided Hyper Inference (Akyon et al., ICIP 2022)
  if (domain === 'sahi') {
    return (
      <div className={`rounded flex items-center justify-center bg-gradient-to-tr from-violet-600 to-purple-700 text-white font-bold text-[9px] shadow-sm ${className}`} title="SAHI (Akyon et al., 2022)">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      </div>
    );
  }

  // 7. AdaptFormer-CD: Bi-Temporal Change Detection (Chen et al., IEEE TGRS 2023)
  if (domain === 'adaptformer') {
    return (
      <div className={`rounded flex items-center justify-center bg-gradient-to-tr from-amber-600 to-orange-700 text-white font-bold text-[9px] shadow-sm ${className}`} title="AdaptFormer-CD (Chen et al., 2023)">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2">
          <path d="m7 16 5-10 5 10" />
          <path d="M8.5 13h7" />
        </svg>
      </div>
    );
  }

  // 8. VRSBench: Remote Sensing VLM Benchmark (NeurIPS 2024)
  if (domain === 'vrsbench') {
    return (
      <div className={`rounded flex items-center justify-center bg-gradient-to-tr from-rose-600 to-pink-700 text-white font-bold text-[8px] tracking-tighter shadow-sm ${className}`} title="VRSBench (NeurIPS 2024)">
        <span className="font-mono font-black">VRS</span>
      </div>
    );
  }

  // 9. QLoRA: NormalFloat4 Quantization (Dettmers et al., NeurIPS 2023)
  if (domain === 'qlora') {
    return (
      <div className={`rounded flex items-center justify-center bg-gradient-to-tr from-cyan-600 to-teal-800 text-white font-bold text-[8px] tracking-tighter shadow-sm ${className}`} title="QLoRA NormalFloat4">
        <span className="font-mono font-black">NF4</span>
      </div>
    );
  }

  // 10. All other agencies & tech companies: Use Logo.dev API directly
  if (!hasError && domain) {
    return (
      <img
        src={`https://img.logo.dev/${domain}?token=${LOGO_DEV_KEY}&size=${size}&format=png`}
        alt={alt || domain}
        className={`object-contain flex-shrink-0 rounded-sm ${className}`}
        onError={() => setHasError(true)}
        loading="lazy"
      />
    );
  }

  // 5. Graceful Fallback if Logo.dev returns error
  const fallback = AGENCY_FALLBACKS[domain];
  if (fallback) {
    return (
      <div 
        className={`inline-flex items-center justify-center rounded-md shadow-sm text-[9px] tracking-tight flex-shrink-0 ${fallback.color} ${className}`}
        title={fallback.name}
      >
        {fallback.label}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center justify-center rounded-md bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold flex-shrink-0 ${className}`}>
      {domain ? domain.slice(0, 2).toUpperCase() : 'GOV'}
    </div>
  );
}
