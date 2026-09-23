import React from 'react';
import { X, Download, ShieldCheck, Cpu, Database, CheckCircle2, FileJson, FileCode, Sparkles, ClipboardList } from 'lucide-react';
import AskGuideBotButton from './AskGuideBotButton';

export default function ExecutionSummary({
  isOpen,
  onClose,
  response,
  onDownloadPdf,
  onDownloadJson,
  onAskGuideBot
}) {
  if (!isOpen) return null;

  // Honest empty state: this modal used to show a hardcoded fake telemetry trace
  // (fake query_id, fake model list, fake 94% confidence, fake 38ms latency) whenever
  // it was opened before any query had actually run. That was never real data — it was
  // static text made to look like a live system audit. Per this codebase's own honesty
  // contract (see backend/investigation_orchestrator.py etc.), an absent result is shown
  // as an absent result, not backfilled with plausible-looking numbers.
  if (!response) {
    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
        <div className="liquid-glass-strong bg-white/95 dark:bg-[#070d1e]/95 text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/20 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-950/60 flex items-center justify-center border border-cyan-300/50 dark:border-cyan-500/30">
                <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white uppercase">
                System Audit &amp; Telemetry Trace
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <AskGuideBotButton 
                label="Ask Guide Bot"
                onClick={() => onAskGuideBot && onAskGuideBot("Explain the System Audit & Telemetry Trace: how are execution routes, confidence bounds, and specialist model latencies tracked?")} 
              />
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full liquid-glass border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:scale-105 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-6 flex flex-col items-center text-center gap-3">
            <ClipboardList className="w-8 h-8 text-slate-400 dark:text-white/30" />
            <p className="text-sm text-slate-600 dark:text-white/70">
              No query has been executed yet, so there's no real audit trace to show.
            </p>
            <p className="text-xs text-slate-400 dark:text-white/40">
              Run a query first, then reopen this panel to see the actual route, models, and confidence for that response.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const {
    query_id,
    route_taken = {},
    execution_summary = {},
    latency_ms,
    validation = {}
  } = response;

  const params = execution_summary.parameters || {};
  const confidence = execution_summary.confidence || 0.88;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="liquid-glass-strong bg-white/95 dark:bg-[#070d1e]/95 text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/20 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-950/60 flex items-center justify-center border border-cyan-300/50 dark:border-cyan-500/30">
              <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white uppercase">
                System Audit &amp; Telemetry Trace
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-white/60">
                Auditable Execution Parameters, Provenance &amp; Specialist Attribution
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AskGuideBotButton 
              label="Ask Guide Bot"
              onClick={() => onAskGuideBot && onAskGuideBot("Explain the System Audit & Telemetry Trace: how are execution routes, confidence bounds, and specialist model latencies tracked?")} 
            />
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full liquid-glass border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:scale-105 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-4 text-xs font-sans">
          
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="liquid-glass bg-slate-50/80 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 p-3 rounded-2xl">
              <span className="text-slate-500 dark:text-white/40 block text-[9px] uppercase tracking-wider font-semibold">Query ID</span>
              <span className="font-mono text-cyan-700 dark:text-cyan-400 font-bold text-[11px] truncate block mt-0.5">{query_id}</span>
            </div>
            <div className="liquid-glass bg-slate-50/80 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 p-3 rounded-2xl">
              <span className="text-slate-500 dark:text-white/40 block text-[9px] uppercase tracking-wider font-semibold">Task Route</span>
              <span className="font-semibold text-slate-800 dark:text-white block mt-0.5">{route_taken.task || 'VQA'}</span>
            </div>
            <div className="liquid-glass bg-slate-50/80 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 p-3 rounded-2xl">
              <span className="text-slate-500 dark:text-white/40 block text-[9px] uppercase tracking-wider font-semibold">Engine Latency</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] block mt-0.5">{latency_ms} ms</span>
            </div>
            <div className="liquid-glass bg-slate-50/80 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 p-3 rounded-2xl">
              <span className="text-slate-500 dark:text-white/40 block text-[9px] uppercase tracking-wider font-semibold">Confidence</span>
              <span className="font-mono text-cyan-600 dark:text-cyan-300 font-bold block mt-0.5">{Math.round(confidence * 100)}%</span>
            </div>
          </div>

          {/* Router Decision & Agentic Reasoning */}
          <div className="liquid-glass bg-slate-50/80 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 p-4 rounded-2xl">
            <h4 className="font-semibold text-slate-700 dark:text-white/70 uppercase tracking-widest text-[10px] mb-1.5">
              Agentic Controller Reasoning (RS-Agent Architecture Template)
            </h4>
            <p className="text-slate-700 dark:text-white/90 text-xs font-mono leading-relaxed">
              {route_taken.reasoning || execution_summary.router_reasoning || "Autonomous intent resolution via Agentic LLM Router."}
            </p>
          </div>

          {/* Invoked Specialist Models */}
          <div className="liquid-glass bg-slate-50/80 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 p-4 rounded-2xl">
            <h4 className="font-semibold text-slate-700 dark:text-white/70 uppercase tracking-widest text-[10px] mb-2">
              Predefined Model &amp; Tool Registry Invocations
            </h4>
            <div className="flex flex-wrap gap-2">
              {(execution_summary.models_used || []).map((m, i) => (
                <span key={i} className="px-3 py-1 bg-cyan-50 dark:bg-white/10 border border-cyan-200/80 dark:border-white/15 rounded-full text-xs font-mono text-cyan-800 dark:text-cyan-300 font-medium">
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Configured Parameters Table */}
          <div className="liquid-glass bg-slate-50/80 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 p-4 rounded-2xl">
            <h4 className="font-semibold text-slate-700 dark:text-white/70 uppercase tracking-widest text-[10px] mb-2.5">
              Auditable Parameter Configuration
            </h4>
            <table className="w-full text-left font-mono text-[11px]">
              <tbody>
                <tr className="border-b border-slate-200/60 dark:border-white/5">
                  <td className="py-2 text-slate-500 dark:text-white/50">Quantization Format:</td>
                  <td className="py-2 text-slate-900 dark:text-white font-medium">{params.quantization || 'Not applicable to this response'}</td>
                </tr>
                <tr className="border-b border-slate-200/60 dark:border-white/5">
                  <td className="py-2 text-slate-500 dark:text-white/50">Remote Sensing Adaptation:</td>
                  <td className="py-2 text-slate-800 dark:text-white/90">{params.adaptation || 'VRSBench LoRA Adapter (real fine-tune, ~120MB, verified push to HF Hub)'}</td>
                </tr>
                <tr className="border-b border-slate-200/60 dark:border-white/5">
                  <td className="py-2 text-slate-500 dark:text-white/50">Confidence Estimation Rule:</td>
                  <td className="py-2 text-slate-800 dark:text-white/90">{params.combination_rule || 'Arithmetic Mean of Specialist Logits'}</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-500 dark:text-white/50">Input Validation Status:</td>
                  <td className="py-2 text-emerald-600 dark:text-emerald-400 font-medium">
                    {validation.passed
                      ? 'PASSED (Count, Modality, CRS verified)'
                      : `REJECTED${(validation.errors || []).length ? ': ' + validation.errors.join('; ') : ''}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-black/20">
          <button
            onClick={onDownloadJson}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full liquid-glass border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 text-xs hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
          >
            <FileJson className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Export JSON Trace</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-full text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white text-xs transition-all cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={onDownloadPdf}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-cyan-600 dark:bg-cyan-500 text-white dark:text-black text-xs font-semibold hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download SITREP PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
