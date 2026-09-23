import React from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, Rocket, ShieldCheck, Database, Compass, FileText } from 'lucide-react';
import AgencyLogo from './AgencyLogo';

export default function Navbar({ onBookDemo, onOpenCompliance, onOpenRoadmap, onOpenPaper }) {
  const menuItems = [
    { 
      name: "Vision & Roadmap", 
      icon: Rocket,
      action: onOpenRoadmap,
    },
    { 
      name: "Bhoonidhi STAC Harvester", 
      icon: Database,
      action: onBookDemo 
    },
    { 
      name: "Situational Twin", 
      icon: Compass,
      action: onBookDemo 
    },
  ];

  return (
    <nav className="flex items-center justify-between py-4 md:py-6 px-4 sm:px-6 md:px-10 w-full relative z-30">
      {/* Left Side Logo */}
      <div className="flex-1 flex items-center gap-2.5 sm:gap-3.5">
        <AgencyLogo domain="isro.gov.in" className="w-10 h-7 sm:w-12 sm:h-9 md:w-20 md:h-14 object-contain flex-shrink-0 drop-shadow-[0_2px_16px_rgba(0,0,0,0.95)]" />
        <div className="flex items-center gap-2 sm:gap-2.5">
          <span className="font-bold tracking-tight text-base sm:text-lg md:text-xl text-[#F6F4EE] drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            SatQuery <span className="font-serif italic font-normal text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]">AI</span>
          </span>
          <span className="hidden sm:inline-block text-[10px] md:text-[11px] font-bold uppercase tracking-wider bg-cyan-950/70 text-cyan-300 border border-cyan-400/40 px-2.5 py-0.5 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.25)] backdrop-blur-md font-mono">
            ISRO • SIH26167
          </span>
        </div>
      </div>

      {/* Center Menu (Desktop >= 1024px) - Luxury Frosted Glass Capsule */}
      <div className="hidden lg:flex items-center">
        <ul className="flex items-center gap-1 xl:gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.12] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.4),inset_0_1px_1px_0_rgba(255,255,255,0.35)] border border-white/30 font-general">
          {menuItems.map((item, idx) => (
            <li 
              key={idx} 
              onClick={item.action}
              className="cursor-pointer transition-all flex items-center gap-1.5 px-3.5 py-1.5 rounded-full hover:bg-white/[0.15] text-white text-[13px] font-medium select-none group"
            >
              {item.icon && (
                <item.icon className="w-3.5 h-3.5 text-[#22d3ee] group-hover:text-cyan-200 transition-colors drop-shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
              )}
              <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">{item.name}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Right Buttons */}
      <div className="flex-1 flex justify-end items-center gap-2">

        {/* Mobile: Clean Roadmap Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onOpenRoadmap}
          className="flex md:hidden items-center bg-white/[0.12] hover:bg-white/[0.20] active:bg-white/[0.24] text-white rounded-full pl-2 pr-3.5 py-1.5 gap-1.5 border border-white/30 backdrop-blur-2xl shadow-sm cursor-pointer"
        >
          <div className="bg-white/20 p-1 rounded-full flex items-center justify-center">
            <Rocket className="w-3 h-3 text-cyan-200" />
          </div>
          <span className="text-[11px] font-medium tracking-tight whitespace-nowrap">Roadmap</span>
        </motion.button>

        {/* Desktop: Research Paper Button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={onOpenPaper}
          className="hidden md:flex items-center bg-white/[0.12] hover:bg-white/[0.20] active:bg-white/[0.24] text-white rounded-full pl-2.5 pr-4 py-1.5 gap-2 border border-cyan-400/50 hover:border-cyan-300 transition-all group cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.3),inset_0_1px_1px_0_rgba(255,255,255,0.35)] backdrop-blur-2xl font-general"
          title="View SatQuery IEEE 4-Page Research Paper"
        >
          <div className="relative bg-cyan-400/25 group-hover:bg-cyan-400/35 p-1.5 rounded-full flex items-center justify-center transition-colors border border-cyan-300/40 shadow-[0_0_8px_rgba(34,211,238,0.3)]">
            <FileText className="w-3.5 h-3.5 text-cyan-200" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-85" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-gradient-to-tr from-amber-400 to-orange-500 text-[9px] font-black text-slate-950 items-center justify-center ring-1 ring-white/90 animate-attention-beacon leading-none select-none">
                !
              </span>
            </span>
          </div>
          <span className="text-xs font-medium tracking-tight whitespace-nowrap text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
            Research Paper
          </span>
        </motion.button>
      </div>
    </nav>
  );
}
