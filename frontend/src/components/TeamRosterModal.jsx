import React, { useState } from 'react';
import { motion } from 'motion/react';
import ThemeCloseButton from './ThemeCloseButton';
import AskGuideBotButton from './AskGuideBotButton';
import { CoverflowCarousel } from './ui/coverflow-carousel';
import './TeamRosterModal.css';

const TEAM_MEMBERS = [
  {
    name: "Sameel Kazi",
    role: "Team Leader",
    photo: "/team/sameel.jpg",
    linkedin: "https://www.linkedin.com/in/sameel-kazi-390726386?utm_source=share_via&utm_content=profile&utm_medium=member_android"
  },
  {
    name: "Alihuzaifa Siddiqui",
    photo: "/team/alihuzaifa.jpg",
    linkedin: "https://www.linkedin.com/in/alihuzaifa-siddiqui-2a097b396?utm_source=share_via&utm_content=profile&utm_medium=member_android"
  },
  {
    name: "Samridhi Goel",
    photo: "/team/samridhi.jpg",
    linkedin: "https://www.linkedin.com/in/samridhi-goel-28912838b?utm_source=share_via&utm_content=profile&utm_medium=member_android"
  },
  {
    name: "Kapil Joshi",
    photo: "/team/kapil.jpg",
    linkedin: "https://www.linkedin.com/in/kapil-joshi-69735b384?utm_source=share_via&utm_content=profile&utm_medium=member_android"
  },
  {
    name: "Yajat Koyande",
    photo: "/team/yajat.jpg",
    linkedin: "https://www.linkedin.com/in/yajat-p-koyande-911608395?utm_source=share_via&utm_content=profile&utm_medium=member_android"
  },
  {
    name: "Adeeb Khan",
    photo: "/team/adeeb.jpg",
    linkedin: "https://www.linkedin.com/in/adeeb-khan-51b938394?utm_source=share_via&utm_content=profile&utm_medium=member_android"
  }
];

const CAROUSEL_SLIDES = TEAM_MEMBERS.map(m => ({
  src: m.photo,
  alt: m.name,
  title: m.name,
  role: m.role,
  linkedin: m.linkedin
}));

export default function TeamRosterModal({ isOpen, onClose, onAskGuideBot }) {
  const [activeMobileIdx, setActiveMobileIdx] = useState(0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[94vh] overflow-y-auto rounded-3xl liquid-glass-strong bg-white/95 dark:bg-[#070d1e]/95 p-4 sm:p-7 shadow-2xl border border-slate-200/80 dark:border-white/20 flex flex-col gap-4 sm:gap-5 text-slate-900 dark:text-white">
        
        {/* Header - Centered Prominent Team Logo */}
        <div className="relative flex items-center justify-center pb-3 sm:pb-4 border-b border-slate-200/80 dark:border-white/10 w-full min-h-[60px] sm:min-h-[76px]">
          {/* Official Team Logo - Centered & Big */}
          <div className="flex items-center justify-center py-1">
            <img 
              src="/team_logo.png" 
              alt="Unhandled Exceptions" 
              className="h-12 sm:h-16 md:h-20 w-auto object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
            />
          </div>

          {/* Theme 4-Corner Sliding Diamond Close Button & Guide Bot Button (Pinned to Top Right) */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <AskGuideBotButton 
              label="Ask Guide Bot"
              onClick={() => onAskGuideBot && onAskGuideBot("Tell me about the Unhandled Exceptions team, Sameel Kazi, and the models he fine-tuned on Hugging Face.")} 
            />
            <ThemeCloseButton onClick={onClose} />
          </div>
        </div>

        {/* 1. Mobile 9:16 3D Coverflow Carousel View (block md:hidden) */}
        <div className="block md:hidden w-full py-1">
          <CoverflowCarousel
            slides={CAROUSEL_SLIDES}
            cardWidth="clamp(220px, 68vw, 250px)"
            cardHeight="350px"
            rotate={28}
            depth={0.35}
            perspective={2.8}
            gap={0.06}
            loop={true}
            showNavigation={true}
            showPagination={true}
            onSelect={(idx) => setActiveMobileIdx(idx)}
            renderCard={(slide) => (
              <div className="blob-roster-card">
                {/* Animated Ambient Light Blob (User Reference Effect) */}
                <div className="blob" />

                {/* Frosted Glass Container */}
                <div className="bg">
                  {/* Photo Frame - Completely Clean, Crisp, NO badges, NO topbar */}
                  <div className="blob-card-media">
                    <img
                      src={slide.src}
                      alt={slide.alt}
                      draggable={false}
                      className="blob-card-img"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>

                  {/* Card Content & User's Official LinkedIn Button with Tooltip */}
                  <div className="blob-card-content">
                    <div>
                      <h3 className="blob-member-name">
                        {slide.title}
                      </h3>
                      {slide.role && (
                        <p className="text-[10.5px] font-medium text-slate-500 dark:text-cyan-400 -mt-1 mb-1">
                          {slide.role}
                        </p>
                      )}
                      <p className="blob-member-inst flex items-center justify-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center p-0.5 flex-shrink-0 shadow-sm overflow-hidden">
                          <img src="/spit_logo.png" alt="SPIT" className="w-full h-full object-contain" />
                        </span>
                        <span>Sardar Patel Institute of Technology</span>
                      </p>
                    </div>

                    {/* Official LinkedIn Button with Animated Tooltip */}
                    <a
                      href={slide.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="group/btn hover:bg-[#0077b5] relative bg-[#0a66c2] rounded-xl text-white duration-300 font-medium flex justify-center gap-2 items-center py-2 px-3 shadow-md w-full mt-auto"
                    >
                      <svg
                        className="w-4 h-4 fill-white flex-shrink-0"
                        preserveAspectRatio="xMidYMid meet"
                        viewBox="0 0 100 100"
                      >
                        <path d="M92.86,0H7.12A7.17,7.17,0,0,0,0,7.21V92.79A7.17,7.17,0,0,0,7.12,100H92.86A7.19,7.19,0,0,0,100,92.79V7.21A7.19,7.19,0,0,0,92.86,0ZM30.22,85.71H15.4V38H30.25V85.71ZM22.81,31.47a8.59,8.59,0,1,1,8.6-8.59A8.6,8.6,0,0,1,22.81,31.47Zm63,54.24H71V62.5c0-5.54-.11-12.66-7.7-12.66s-8.91,6-8.91,12.26V85.71H39.53V38H53.75v6.52H54c2-3.75,6.83-7.7,14-7.7,15,0,17.79,9.89,17.79,22.74Z" />
                      </svg>
                      <span className="border-l border-white/40 pl-2 text-xs font-semibold tracking-tight">
                        LinkedIn
                      </span>
                      
                      {/* Tooltip on Hover */}
                      <div className="group-hover/btn:opacity-100 opacity-0 -top-9 left-1/2 -translate-x-1/2 absolute z-20 pointer-events-none px-2.5 py-1 text-[11px] font-semibold text-white transition-all duration-300 bg-slate-900 dark:bg-black rounded-lg shadow-xl whitespace-nowrap before:w-2 before:h-2 before:rotate-45 before:-bottom-1 before:left-1/2 before:-translate-x-1/2 before:bg-slate-900 dark:before:bg-black before:absolute border border-cyan-400/40">
                        See my profile!
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            )}
          />

          {/* Swipe Hint Helper (No duplicate names or disconnected buttons!) */}
          <div className="mt-2 text-center text-[11px] font-mono text-slate-500 dark:text-cyan-400/80">
            Swipe or tap arrows to explore all 6 members
          </div>
        </div>

        {/* 2. Desktop 16:9 Grid View (hidden md:grid lg:grid-cols-6) with Rotating Gradient Borders and Tooltip LinkedIn Buttons */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
          {TEAM_MEMBERS.map((m, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.08 }}
              className="team-card-container group"
            >
              <div className="team-card-inner bg-white dark:bg-[#0b1329] border border-slate-200/80 dark:border-white/10">
                {/* Member Photo Frame - Uniform 1:1 Aspect Ratio */}
                <div className="w-full aspect-square overflow-hidden rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-inner mb-3 relative">
                  <img 
                    src={m.photo} 
                    alt={m.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>

                {/* Member Name & Role */}
                <div className="mb-2.5 min-h-[38px] flex flex-col items-center justify-center">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                    {m.name}
                  </h4>
                  {m.role ? (
                    <span className="text-[11px] font-medium text-slate-500 dark:text-cyan-400 mt-0.5">
                      {m.role}
                    </span>
                  ) : null}
                </div>

                {/* Enhanced LinkedIn Button with Official Path & Tooltip */}
                <a
                  href={m.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="group/btn hover:bg-[#0077b5] relative bg-[#0a66c2] rounded-xl text-white duration-300 font-medium flex justify-center gap-2 items-center py-2 px-3 shadow-md w-full mt-auto"
                >
                  <svg
                    className="w-5 h-5 fill-white flex-shrink-0"
                    preserveAspectRatio="xMidYMid meet"
                    viewBox="0 0 100 100"
                  >
                    <path d="M92.86,0H7.12A7.17,7.17,0,0,0,0,7.21V92.79A7.17,7.17,0,0,0,7.12,100H92.86A7.19,7.19,0,0,0,100,92.79V7.21A7.19,7.19,0,0,0,92.86,0ZM30.22,85.71H15.4V38H30.25V85.71ZM22.81,31.47a8.59,8.59,0,1,1,8.6-8.59A8.6,8.6,0,0,1,22.81,31.47Zm63,54.24H71V62.5c0-5.54-.11-12.66-7.7-12.66s-8.91,6-8.91,12.26V85.71H39.53V38H53.75v6.52H54c2-3.75,6.83-7.7,14-7.7,15,0,17.79,9.89,17.79,22.74Z" />
                  </svg>
                  <span className="border-l border-white/40 pl-2 text-xs font-semibold tracking-tight">
                    LinkedIn
                  </span>
                  
                  {/* Tooltip on Hover */}
                  <div className="group-hover/btn:opacity-100 opacity-0 -top-9 left-1/2 -translate-x-1/2 absolute z-20 pointer-events-none px-2.5 py-1 text-[11px] font-semibold text-white transition-all duration-300 bg-slate-900 dark:bg-black rounded-lg shadow-xl whitespace-nowrap before:w-2 before:h-2 before:rotate-45 before:-bottom-1 before:left-1/2 before:-translate-x-1/2 before:bg-slate-900 dark:before:bg-black before:absolute border border-cyan-400/40">
                    See my profile!
                  </div>
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer - Center Aligned with SIH Logo */}
        <div className="flex items-center justify-center pt-3 border-t border-slate-200/80 dark:border-white/10 text-xs font-mono text-slate-500 dark:text-white/60 gap-2.5 sm:gap-3 text-center">
          <img 
            src="/sih_logo.png" 
            alt="Smart India Hackathon 2026" 
            className="h-6 sm:h-7 w-auto object-contain"
          />
          <span className="text-[10px] sm:text-xs font-medium">
            Smart India Hackathon 2026 • Ministry of Education &amp; ISRO
          </span>
        </div>

      </div>
    </div>
  );
}
