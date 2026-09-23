import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Compass, 
  Eye, 
  Radio, 
  UserCheck, 
  Terminal, 
  Layers, 
  Home, 
  Globe2, 
  Menu, 
  X, 
  Languages, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import AgencyLogo from './AgencyLogo';
import ThemeSwitch from './ThemeSwitch';

export const NAVIGATION_PAGES = [
  { id: 'studio', label: 'Command Studio', icon: Layers, badge: 'VLM Grounding' },
  { id: 'situational', label: 'Situational Twin', icon: Compass, badge: 'Live Weather & USGS' },
  { id: 'monitoring', label: 'Continuous Alerts', icon: Radio, badge: 'NDMA & MoA' },
  { id: 'hitl', label: 'HITL Retraining', icon: UserCheck, badge: 'Active Learning' },
  { id: 'explainability', label: 'XAI Heatmap', icon: Eye, badge: 'Token Attention' },
  { id: 'developers', label: 'API & SDK', icon: Terminal, badge: 'GovTech Ready' }
];

export default function StudioNavbar({ 
  activePage, 
  onSelectPage, 
  onExitToHero, 
  serverStatus,
  isDarkMode,
  onToggleTheme,
  language = 'en',
  onToggleLanguage
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-[1536px] mx-auto px-3 sm:px-5 md:px-8 h-16 flex items-center justify-between gap-3">
        
        {/* Left Side Logo & Brand Mark */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button 
            onClick={onExitToHero}
            className="flex items-center gap-2.5 group cursor-pointer"
            title="Return to Landing Page"
          >
            <AgencyLogo domain="isro.gov.in" className="w-9 h-7 object-contain flex-shrink-0" />
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-sm sm:text-base text-slate-900 dark:text-white transition-colors">
                  SatQuery <span className="font-serif italic font-normal text-cyan-600 dark:text-cyan-400">AI</span>
                </span>
                <span className="hidden sm:inline-block text-[9px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 px-1.5 py-0.2 rounded-full border border-cyan-500/30">
                  ISRO SIH26167
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 dark:text-white/50 hidden xs:block">
                Multimodal Earth Intelligence
              </span>
            </div>
          </button>
        </div>

        {/* Center Desktop Navigation Tabs */}
        <nav className="hidden xl:flex items-center gap-1 bg-slate-100/80 dark:bg-white/5 p-1 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-inner">
          {NAVIGATION_PAGES.map((page) => {
            const isSelected = activePage === page.id;
            const PageIcon = page.icon;
            return (
              <button
                key={page.id}
                onClick={() => onSelectPage(page.id)}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'text-white dark:text-slate-950 shadow-md font-bold'
                    : 'text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute inset-0 bg-slate-900 dark:bg-cyan-400 rounded-xl"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <PageIcon className="w-3.5 h-3.5" />
                  <span>{page.label}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          
          {/* Language Switcher (English / हिंदी) */}
          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-white transition-colors"
            title="Toggle Bilingual Hindi / English Mode"
          >
            <Languages className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="font-mono text-[11px]">{language === 'hi' ? 'हिंदी (Active)' : 'ENG'}</span>
          </button>

          {/* Theme Switch */}
          <ThemeSwitch isDark={isDarkMode} onToggle={onToggleTheme} />

          {/* Return to Hero CTA */}
          <button
            onClick={onExitToHero}
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-white/80 transition-colors"
            title="Back to Landing Hero"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Landing</span>
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            className="xl:hidden w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-800 dark:text-white"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-200/80 dark:border-white/10 p-3 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2">
          {NAVIGATION_PAGES.map((page) => {
            const isSelected = activePage === page.id;
            const PageIcon = page.icon;
            return (
              <button
                key={page.id}
                onClick={() => {
                  onSelectPage(page.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-cyan-400 text-white dark:text-slate-950 font-bold'
                    : 'text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <PageIcon className="w-4 h-4" />
                  <span>{page.label}</span>
                </div>
                <span className="text-[10px] opacity-75 font-mono">{page.badge}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
