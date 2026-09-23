import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cpu, RefreshCw, Layers, Database } from 'lucide-react';
import Loader from './Loader';

// Honesty fix (2026-08-27): stage 3 used to unconditionally name "GeoChat-7B, ChangeFormer
// & SAR Dual-Pol services in parallel" -- but that's only true for a CrossModalFusion/
// ChangeDetection_CDVQA query. A plain single-image VQA, Grounding, or ZeroShotSearch
// request never touches ChangeFormer or the SAR encoder, so the old label was fabricating
// activity that wasn't happening for most queries. Kept generic here (no model names) since
// this component fires before the router has even classified the query, so it genuinely
// doesn't know yet which specialist model(s) will run -- the honest per-response model
// attribution still shows up afterward in the real execution summary.
const STAGES = [
  { id: 1, label: "Validating input imagery format, modality tags & CRS metadata...", icon: ShieldCheck },
  { id: 2, label: "RS-Agent Central Controller classifying query intent & routing models...", icon: Cpu },
  { id: 3, label: "Running inference on the routed specialist model(s)...", icon: Layers },
  { id: 4, label: "Grounding output via RAG knowledge base & computing confidence...", icon: Database }
];

export default function LoadingStates() {
  const [currentStage, setCurrentStage] = useState(1);

  useEffect(() => {
    const timer1 = setTimeout(() => setCurrentStage(2), 600);
    const timer2 = setTimeout(() => setCurrentStage(3), 1400);
    const timer3 = setTimeout(() => setCurrentStage(4), 2200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="liquid-glass-strong p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-white/20 shadow-2xl flex flex-col gap-3 sm:gap-4">
      {/* Animated Space Orbit Loader with Proportional Scale */}
      <Loader />

      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
          <span className="text-[11px] sm:text-xs font-mono font-semibold uppercase tracking-wider text-white">
            Agentic Pipeline Executing
          </span>
        </div>
        <span className="text-[10px] sm:text-[11px] font-mono text-white/60">Step {currentStage} of 4</span>
      </div>

      <div className="flex flex-col gap-2 py-0.5">
        {STAGES.map((stage) => {
          const Icon = stage.icon;
          const isDone = currentStage > stage.id;
          const isCurrent = currentStage === stage.id;

          return (
            <div 
              key={stage.id}
              className={`flex items-center gap-2.5 p-2 sm:p-2.5 rounded-xl border transition-all duration-300 text-xs ${
                isCurrent 
                  ? 'bg-white/15 border-cyan-400/50 text-white shadow-md'
                  : isDone
                  ? 'bg-white/5 border-white/20 text-white/90'
                  : 'bg-white/5 border-white/5 text-white/40'
              }`}
            >
              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs flex-shrink-0 font-medium ${
                isCurrent 
                  ? 'bg-cyan-400 text-black animate-pulse font-bold'
                  : isDone
                  ? 'bg-white/80 text-black'
                  : 'bg-white/10 text-white/40'
              }`}>
                {isDone ? '✓' : stage.id}
              </div>

              <div className="text-[11px] sm:text-xs font-medium flex-1 leading-snug">
                {stage.label}
              </div>

              {isCurrent && (
                <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
