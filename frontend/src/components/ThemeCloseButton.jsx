import React from 'react';

export default function ThemeCloseButton({ onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className={`relative border-2 border-slate-300 dark:border-slate-300 hover:border-slate-800 dark:hover:border-slate-800 group w-11 h-11 sm:w-12 sm:h-12 rounded-2xl duration-300 overflow-hidden bg-slate-100 dark:bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-200 cursor-pointer flex-shrink-0 flex items-center justify-center shadow-sm ${className}`}
    >
      <span className="font-sans text-3xl font-light h-full w-full flex items-center justify-center !text-slate-900 dark:!text-slate-900 duration-300 relative z-10 select-none pb-0.5" style={{ color: '#0f172a' }}>
        ×
      </span>
      
      {/* Subtle corner hover accents */}
      <span className="absolute w-full h-full bg-cyan-400/20 rotate-45 group-hover:top-8 duration-500 top-14 left-0 pointer-events-none transition-all" />
      <span className="absolute w-full h-full bg-cyan-400/20 rotate-45 top-0 group-hover:left-8 duration-500 left-14 pointer-events-none transition-all" />
      <span className="absolute w-full h-full bg-cyan-400/20 rotate-45 top-0 group-hover:right-8 duration-500 right-14 pointer-events-none transition-all" />
      <span className="absolute w-full h-full bg-cyan-400/20 rotate-45 group-hover:bottom-8 duration-500 bottom-14 right-0 pointer-events-none transition-all" />
    </button>
  );
}
