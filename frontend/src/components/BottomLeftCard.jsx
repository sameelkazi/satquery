import React from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import AgencyLogo from './AgencyLogo';

export default function BottomLeftCard({ onExplore, onOpenCompliance }) {
  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="absolute bottom-28 right-4 left-auto md:left-6 md:right-auto md:bottom-6 lg:bottom-10 lg:left-10 p-3.5 md:p-4 lg:p-5 rounded-[1.2rem] md:rounded-[1.5rem] lg:rounded-[2.2rem] bg-white/40 backdrop-blur-xl flex flex-col gap-2 lg:gap-3 min-w-[160px] md:min-w-[190px] lg:min-w-[220px] w-fit shadow-lg border border-white/30"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-2xl md:text-3xl font-medium text-[rgba(30,50,90,0.95)] tracking-tight">
            SIH 2026
          </span>
          <span className="text-[10px] md:text-[11px] font-medium text-[rgba(30,50,90,0.65)] uppercase tracking-wider">
            ISRO PS • SIH26167
          </span>
        </div>
        <AgencyLogo domain="sih.gov.in" className="w-10 h-8 object-contain" />
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onOpenCompliance || onExplore}
        className="flex items-center bg-white rounded-full pl-1.5 pr-4 py-1.5 gap-2 hover:bg-white/95 transition-colors self-start group cursor-pointer shadow-sm"
      >
        <div className="bg-[rgba(30,50,90,0.1)] p-1 rounded-full flex items-center justify-center">
          <ArrowUpRight className="w-3.5 h-3.5 text-[rgba(30,50,90,0.9)]" />
        </div>
        <span className="text-[13px] font-medium text-[rgba(30,50,90,0.9)]">
          SIH PS Compliance
        </span>
      </motion.button>
    </motion.div>
  );
}
