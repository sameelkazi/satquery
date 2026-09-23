"use client";

import LiquidGlassCursor from "@/components/ui/liquid-glass-cursor";

function Chevron({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function PlayIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export default function LiquidGlassCursorDemo() {
  return (
    <LiquidGlassCursor className="min-h-screen w-full font-sans selection:bg-black selection:text-white">
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-[80vw] w-[80vw] -translate-x-1/2 rounded-full bg-white opacity-60 blur-[100px]" />

      <div className="relative z-10 mx-auto flex h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
        <p
          data-cursor="text"
          className="mb-6 inline-block text-xs font-semibold uppercase tracking-[0.25em] text-[#86868B]"
        >
          Cursor Lens
        </p>

        <h1
          data-cursor="text"
          className="text-[76px] font-semibold leading-[1.05] tracking-[-0.04em] text-[#1D1D1F] max-[1025px]:text-6xl max-md:text-5xl"
        >
          Look closer.
        </h1>

        <p
          data-cursor="text"
          className="mx-auto mt-6 max-w-xl text-xl font-medium leading-relaxed tracking-tight text-[#86868B] max-md:text-lg"
        >
          A liquid-glass lens tracks your cursor, magnifying and refracting
          everything it passes over. The closer you look, the more there is to see.
        </p>

        <div className="mt-10 flex flex-row items-center gap-4 max-md:flex-col">
          <button
            data-cursor="button"
            className="flex items-center justify-center gap-2 rounded-full bg-[#1D1D1F] px-7 py-3.5 text-base font-medium text-white transition-all hover:scale-105 hover:bg-black active:scale-95"
          >
            Get started <Chevron className="h-4 w-4" />
          </button>
          <button
            data-cursor="button"
            className="flex items-center justify-center gap-2 rounded-full border border-[#D2D2D7] bg-transparent px-7 py-3.5 text-base font-medium text-[#1D1D1F] transition-all hover:scale-105 hover:bg-black/[0.04] active:scale-95"
          >
            <PlayIcon className="h-4 w-4" /> Watch demo
          </button>
        </div>
      </div>
    </LiquidGlassCursor>
  );
}
