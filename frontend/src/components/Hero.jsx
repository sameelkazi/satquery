import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users, ArrowUpRight, ShieldCheck, Database, Compass, Rocket } from 'lucide-react';
import Navbar from './Navbar';
import HeroBadge from './HeroBadge';
import SihComplianceModal from './SihComplianceModal';
import TeamRosterModal from './TeamRosterModal';
import FutureRoadmapModal from './FutureRoadmapModal';
import AgencyLogo from './AgencyLogo';
import { HandwritingSvg } from '@/components/ui/handwriting-svg';
import GeospatialCursor from '@/components/ui/geospatial-cursor';
import TechSpecModal from './TechSpecModal';
import ResearchPaperModal from './ResearchPaperModal';

export default function Hero({ onEnterApp }) {
  const [isComplianceOpen, setIsComplianceOpen] = useState(false);
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [isPaperOpen, setIsPaperOpen] = useState(false);
  const [selectedTech, setSelectedTech] = useState(null);

  const techStackLogos = [
    { label: "RemoteCLIP", domain: "remoteclip" },
    { label: "Qwen2.5-VL", domain: "qwenlm.ai" },
    { label: "Grounding DINO", domain: "grounding-dino" },
    { label: "SAHI Sliced Inference", domain: "sahi" },
    { label: "AdaptFormer-CD", domain: "adaptformer" },
    { label: "VRSBench (NeurIPS)", domain: "vrsbench" },
    { label: "QLoRA (NF4)", domain: "qlora" },
    { label: "ISRO Bhoonidhi", domain: "isro.gov.in" },
    { label: "ESA Copernicus", domain: "copernicus.eu" },
    { label: "PyTorch", domain: "pytorch.org" },
    { label: "Hugging Face", domain: "huggingface.co" },
    { label: "SatQuery RAG Vector Store", domain: "github.com" },
  ];

  return (
    <>
      {/* =========================================================================
          1. DESKTOP / TABLET SCREEN (>= 768px, 16:9 Full-Screen Dark Hero)
          ========================================================================= */}
      <div className="hidden md:flex w-full h-[100dvh] max-h-[100dvh] relative bg-[#060314] text-[#F6F4EE] overflow-hidden flex-col justify-between select-none font-general">
        
        {/* Desktop 16:9 Full HD Video Background - Butter-Smooth Hardware-Accelerated */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover object-center z-0"
        >
          <source
            src="/videos/hero_desktop.mp4"
            type="video/mp4"
          />
        </video>

        {/* Cinematic Atmospheric Vignette matching mobile clarity */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent via-40% to-black/70 pointer-events-none z-[1]" />
        {/* Desktop 16:9 Screen Main Layout */}
        <div className="w-full h-full flex flex-col justify-between relative z-10 [cursor:none]">
          {/* Top Navbar */}
          <Navbar 
            onBookDemo={onEnterApp} 
            onOpenCompliance={() => setIsComplianceOpen(true)} 
            onOpenRoadmap={() => setIsRoadmapOpen(true)} 
            onOpenPaper={() => setIsPaperOpen(true)}
          />
          {/* 1px divider line below navbar */}
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent relative z-20 pointer-events-none" />

          {/* Hero Content (Balanced spacing: top cluster slightly down, bottom cluster slightly up) */}
          <main className="flex-1 flex flex-col items-center justify-between text-center px-6 relative z-10 pt-2.5 md:pt-3.5 pb-2.5 lg:pb-3.5">
            
            {/* TOP CLUSTER: SPIT, TEAM and larger Handwriting Title */}
            <div className="flex flex-col items-center mt-1 sm:mt-1.5">
              {/* SPIT College Badge in Enhanced Luxury Glassmorphism */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="rounded-full px-4 py-1.5 sm:px-5 sm:py-1.5 flex items-center gap-2.5 mb-1.5 shadow-[0_8px_32px_0_rgba(0,0,0,0.45),inset_0_1px_1px_0_rgba(255,255,255,0.4)] mx-auto bg-white/[0.12] hover:bg-white/[0.18] backdrop-blur-2xl border border-white/30 hover:border-cyan-400/40 transition-all cursor-default group select-none"
              >
                <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full bg-white/95 p-0.5 flex items-center justify-center flex-shrink-0 shadow-md ring-1 ring-white/60">
                  <img src="/spit_logo.png" alt="SPIT" className="w-full h-full object-contain" />
                </div>
                <span className="text-[12px] sm:text-[13px] font-semibold text-[#F6F4EE] tracking-[0.035em] font-general drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                  Sardar Patel Institute of Technology
                </span>
              </motion.div>

              {/* Team Label */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="flex items-center gap-2 mb-0.5"
              >
                <span className="text-xs md:text-sm font-mono uppercase tracking-[0.45em] text-[#22d3ee] font-extrabold drop-shadow-[0_0_18px_rgba(34,211,238,0.95)]">
                  TEAM
                </span>
              </motion.div>

              {/* Exact SVG Handwriting for Unhandled Exceptions (Restored to original full signature style & enlarged) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="w-full max-w-3xl h-[75px] sm:h-[90px] md:h-[105px] flex items-center justify-center my-0.5"
              >
                <HandwritingSvg
                  text="Unhandled Exceptions"
                  fontSize={62}
                  strokeWidth={2.4}
                  duration={2.6}
                  delay={0.3}
                  className="text-white drop-shadow-[0_2px_16px_rgba(6,182,212,0.85)] w-full h-full"
                />
              </motion.div>
            </div>

            {/* BOTTOM CLUSTER: 2 Center-Aligned CTA Buttons */}
            <div className="flex flex-col items-center mb-2 sm:mb-3">
              {/* 2 Center-Aligned CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="flex items-center justify-center gap-4 mb-0.5 font-general"
              >
                {/* Primary CTA: Launch Studio */}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onEnterApp}
                  className="flex items-center bg-cyan-400/30 hover:bg-cyan-400/40 active:bg-cyan-400/45 text-white rounded-full px-6 py-2.5 gap-2 text-sm font-semibold tracking-tight shadow-[0_0_24px_rgba(34,211,238,0.4),inset_0_1px_1px_rgba(255,255,255,0.5)] border border-cyan-300/50 backdrop-blur-2xl transition-all cursor-pointer font-general"
                >
                  <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">Launch Studio</span>
                  <ArrowUpRight className="w-4 h-4 text-cyan-200" />
                </motion.button>

                {/* Secondary CTA: Team Roster */}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsRosterOpen(true)}
                  className="flex items-center bg-white/[0.12] hover:bg-white/[0.20] active:bg-white/[0.24] text-white rounded-full px-5 py-2.5 gap-2.5 text-sm font-medium tracking-tight shadow-[0_8px_32px_0_rgba(0,0,0,0.4),inset_0_1px_1px_0_rgba(255,255,255,0.35)] backdrop-blur-2xl transition-all cursor-pointer border border-white/30 font-general"
                >
                  <div className="bg-cyan-400/25 p-1 rounded-full flex items-center justify-center border border-cyan-300/40 shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                    <Users className="w-3.5 h-3.5 text-cyan-200" />
                  </div>
                  <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">Team Roster</span>
                </motion.button>
              </motion.div>
            </div>
          </main>

        {/* Full-Bleed World-Class Desktop Bottom Bar / Marquee Footer */}
        <footer className="w-full px-6 sm:px-8 md:px-12 py-3.5 lg:py-4 relative z-20 bg-black/45 backdrop-blur-2xl border-t border-white/20 shadow-[0_-12px_40px_0_rgba(0,0,0,0.65),inset_0_1px_1px_0_rgba(255,255,255,0.25)] flex items-center justify-between gap-6 lg:gap-8 flex-shrink-0">
          {/* Left static badge - PS Compliance Pill */}
          <div 
            onClick={() => setIsComplianceOpen(true)}
            className="flex-shrink-0 flex items-center gap-3.5 py-1.5 px-3.5 rounded-2xl bg-white/[0.10] hover:bg-white/[0.18] active:bg-white/[0.24] border border-white/30 cursor-pointer transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.4),inset_0_1px_1px_0_rgba(255,255,255,0.35)] backdrop-blur-2xl group select-none"
            title="View SIH 2026 Problem Statement Compliance"
          >
            <div className="w-8 h-8 rounded-xl bg-white/95 p-1 flex items-center justify-center flex-shrink-0 shadow-md border border-white/40">
              <img src="/sih_logo.png" alt="SIH" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col justify-center pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[12.5px] font-bold text-white tracking-tight leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                  PS Compliance
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-cyan-300 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-mono text-cyan-300 font-bold uppercase tracking-wider drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
                  SIH26167
                </span>
                <span className="w-1 h-1 rounded-full bg-cyan-400/60" />
                <span className="text-[10.5px] text-white/70 font-medium tracking-tight">
                  ISRO
                </span>
              </div>
            </div>
          </div>

          {/* Center Vertical Separator */}
          <div className="h-8 w-[1px] bg-white/20 flex-shrink-0 hidden md:block" />

          {/* Right Infinite scrolling marquee with luxury frosted glass badges */}
          <div className="flex-1 overflow-hidden relative w-full [mask-image:linear-gradient(to_right,transparent,black_3%,black_97%,transparent)]">
            <div className="animate-marquee-infinite flex items-center gap-3.5 select-none">
              {techStackLogos.concat(techStackLogos).map((item, idx) => (
                <div 
                  key={idx}
                  onClick={() => setSelectedTech(item)}
                  className="bg-white/[0.10] hover:bg-white/[0.20] active:bg-white/[0.24] rounded-xl px-4 py-2 flex items-center gap-2.5 flex-shrink-0 shadow-[0_4px_20px_0_rgba(0,0,0,0.35),inset_0_1px_1px_0_rgba(255,255,255,0.3)] border border-white/25 hover:border-cyan-300/60 transition-all group cursor-pointer hover:scale-[1.03] active:scale-95"
                  title={`Click to inspect ${item.label} architecture & paper`}
                >
                  <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 bg-white/15 p-0.5 group-hover:bg-white/25 transition-colors border border-white/20">
                    <AgencyLogo domain={item.domain} alt={item.label} className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[12.5px] font-semibold text-white tracking-tight whitespace-nowrap font-general drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] group-hover:text-cyan-200 transition-colors">
                    {item.label}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-cyan-300 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all -ml-1" />
                </div>
              ))}
            </div>
          </div>
        </footer>
        </div>
      </div>

      {/* =========================================================================
          2. MOBILE / PHONE SCREEN (< 768px, 9:16 Vertical Screen) - 100% STRICTLY UNTOUCHED
          ========================================================================= */}
      <div className="block md:hidden w-full h-[100dvh] max-h-[100dvh] fixed inset-0 flex items-center justify-center p-0 bg-[#08141F] overflow-hidden overscroll-none touch-none">
        <section className="relative w-full h-full overflow-hidden flex flex-col items-center bg-transparent group">
          
          {/* Phone Screen Ratio Video Background (< 768px, 9:16 Vertical Cosmic Field) */}
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover object-center z-0"
          >
            <source
              src="/videos/hero_phone.mp4"
              type="video/mp4"
            />
          </video>

          {/* Mobile Cinematic Atmospheric Vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent via-35% to-black/60 pointer-events-none z-[1]" />

          {/* The Content Layer */}
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-start pb-0">
            <Navbar 
              onBookDemo={onEnterApp} 
              onOpenCompliance={() => setIsComplianceOpen(true)} 
              onOpenRoadmap={() => setIsRoadmapOpen(true)} 
            />

            {/* Text Container */}
            <div className="w-full flex flex-col items-center pt-16 sm:pt-20 px-4 sm:px-6 text-center max-w-4xl my-0">
              <HeroBadge />
              
              {/* Animated Team Signature Title */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="w-full flex flex-col items-center mb-1 sm:mb-2"
              >
                <span className="text-[11px] sm:text-xs font-mono uppercase tracking-[0.35em] text-cyan-300/95 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)] font-bold mb-0.5 sm:mb-1">
                  Team
                </span>
                
                <div className="w-full max-w-2xl h-[55px] sm:h-[75px] flex items-center justify-center">
                  <HandwritingSvg
                    text="Unhandled Exceptions"
                    fontSize={58}
                    strokeWidth={2.4}
                    duration={2.6}
                    delay={0.3}
                    className="text-white drop-shadow-[0_2px_16px_rgba(6,182,212,0.8)] w-full h-full"
                  />
                </div>
              </motion.div>
            </div>

            {/* Mobile Team Roster Button (< 768px) - Positioned cleanly right above bottom footer dock */}
            <div className="absolute bottom-24 left-0 right-0 w-full flex justify-center items-center pointer-events-none z-20">
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsRosterOpen(true)}
                className="pointer-events-auto flex items-center bg-white/[0.14] hover:bg-white/[0.22] active:bg-white/[0.26] rounded-full pl-2.5 pr-4 py-1.5 gap-2 transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.4),inset_0_1px_1px_0_rgba(255,255,255,0.4)] border border-white/30 cursor-pointer backdrop-blur-2xl whitespace-nowrap"
              >
                <div className="bg-cyan-400/25 p-1 rounded-full flex items-center justify-center border border-cyan-300/40 shadow-[0_0_12px_rgba(34,211,238,0.3)]">
                  <Users className="w-3.5 h-3.5 text-cyan-200" />
                </div>
                <span className="text-xs font-semibold text-white tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                  Team Roster
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-white/80" />
              </motion.button>
            </div>

            {/* Mobile Phone Floating Dock (< 768px) - High-End Frosted Glassmorphism Dock with Exact Center Divider */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="absolute bottom-3.5 left-3.5 right-3.5 p-2 rounded-2xl bg-white/[0.12] backdrop-blur-2xl border border-white/30 shadow-[0_12px_40px_0_rgba(0,0,0,0.45),inset_0_1px_1px_0_rgba(255,255,255,0.4)] z-20"
            >
              <div className="grid grid-cols-2 relative items-center gap-2">
                {/* Left Column: PS Compliance Button */}
                <button
                  onClick={() => setIsComplianceOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-2 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] active:bg-white/[0.22] border border-white/20 transition-all text-left group cursor-pointer shadow-sm"
                  title="View SIH 2026 Problem Statement Compliance"
                >
                  {/* SIH Logo Badge */}
                  <div className="w-7 h-7 rounded-lg bg-white/95 p-0.5 flex items-center justify-center flex-shrink-0 shadow-sm border border-white/40">
                    <img src="/sih_logo.png" alt="SIH 2026" className="w-full h-full object-contain" />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold text-white tracking-tight leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] truncate">
                        PS Compliance
                      </span>
                      <ArrowUpRight className="w-3 h-3 text-cyan-300 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform flex-shrink-0" />
                    </div>
                    <span className="text-[8px] font-medium text-cyan-300/90 tracking-wider uppercase drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] truncate">
                      ISRO • SIH26167
                    </span>
                  </div>
                </button>

                {/* Exact Center Divider */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-6 bg-white/25 pointer-events-none" />

                {/* Right Column: Launch Studio Button */}
                <button
                  onClick={onEnterApp}
                  className="w-full h-full min-h-[38px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-400/25 hover:bg-cyan-400/35 active:bg-cyan-400/40 border border-cyan-300/40 text-white text-[11.5px] font-medium transition-all shadow-[0_0_16px_rgba(34,211,238,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] cursor-pointer"
                >
                  <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] whitespace-nowrap">Launch Studio</span>
                  <ArrowUpRight className="w-3 h-3 text-cyan-200 flex-shrink-0" />
                </button>
              </div>
            </motion.div>
          </div>

        </section>
      </div>

      {/* =========================================================================
          3. SHARED MODALS
          ========================================================================= */}
      {/* SIH26167 Problem Statement Compliance Modal */}
      <SihComplianceModal
        isOpen={isComplianceOpen}
        onClose={() => setIsComplianceOpen(false)}
        onLaunchStudio={onEnterApp}
      />

      {/* Team Unhandled Exceptions Roster Modal */}
      <TeamRosterModal
        isOpen={isRosterOpen}
        onClose={() => setIsRosterOpen(false)}
      />

      {/* Vision & Scaling Roadmap Modal */}
      <FutureRoadmapModal
        isOpen={isRoadmapOpen}
        onClose={() => setIsRoadmapOpen(false)}
      />

      {/* Interactive Tech Architecture & ArXiv Specification Modal */}
      <TechSpecModal
        tech={selectedTech}
        isOpen={!!selectedTech}
        onClose={() => setSelectedTech(null)}
      />

      {/* SatQuery IEEE Research Paper (Drive View) Modal */}
      <ResearchPaperModal
        isOpen={isPaperOpen}
        onClose={() => setIsPaperOpen(false)}
      />

      {/* Global Desktop Geospatial Cursor - Active on hero screen; restores normal OS cursor on popups */}
      <GeospatialCursor isModalOpen={isComplianceOpen || isRosterOpen || isRoadmapOpen || isPaperOpen || !!selectedTech} />
    </>
  );
}
