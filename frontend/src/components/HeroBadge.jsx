import React from 'react';
import { motion } from 'motion/react';
import { GraduationCap } from 'lucide-react';

export default function HeroBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex items-center gap-2 sm:gap-2.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/[0.10] md:bg-white/60 backdrop-blur-2xl md:backdrop-blur-md border border-white/30 md:border-white/30 mx-auto mb-2 md:mb-3.5 w-fit shadow-[0_8px_32px_0_rgba(0,0,0,0.35),inset_0_1px_1px_0_rgba(255,255,255,0.35)] md:shadow-sm"
    >
      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center p-0.5 shadow-sm overflow-hidden flex-shrink-0">
        <img src="/spit_logo.png" alt="SPIT Logo" className="w-full h-full object-contain" />
      </div>
      <span className="text-xs sm:text-[13px] font-medium text-white/95 md:text-[rgba(30,50,90,0.95)] tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] md:drop-shadow-none">
        Sardar Patel Institute of Technology
      </span>
    </motion.div>
  );
}
