import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquareText, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  BrainCircuit, 
  User, 
  Bot, 
  Sparkles,
  Layers,
  History,
  Info,
  Maximize2,
  X,
  Copy,
  Check,
  Download,
  Target,
  Clock
} from 'lucide-react';

/**
 * Conversational Memory UI with Accordion and Full-Screen Dialog View.
 * Displays all multi-turn questions & answers in the current session.
 */
export default function ConversationLog({ 
  turns = [], 
  onNewConversation, 
  isDarkMode,
  sessionId 
}) {
  const [expanded, setExpanded] = useState(turns.length > 0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedTurnIdx, setCopiedTurnIdx] = useState(null);
  const [copiedSessionId, setCopiedSessionId] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const prevCountRef = useRef(turns.length);

  // Auto-expand when a new turn is recorded so user immediately sees context recorded
  useEffect(() => {
    if (turns.length > prevCountRef.current && turns.length > 0) {
      setExpanded(true);
    }
    prevCountRef.current = turns.length;
  }, [turns.length]);

  const count = turns.length;

  const handleCopyText = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedTurnIdx(idx);
    setTimeout(() => setCopiedTurnIdx(null), 2000);
  };

  const handleCopySessionId = () => {
    if (!sessionId) return;
    navigator.clipboard.writeText(sessionId);
    setCopiedSessionId(true);
    setTimeout(() => setCopiedSessionId(false), 2000);
  };

  const handleCopyFullTranscript = () => {
    if (turns.length === 0) return;
    const transcript = turns.map((t, i) => (
      `### Turn #${i + 1} (${t.task || 'VQA'}) [${t.timestamp || 'N/A'}]\n` +
      `**User:** ${t.query}\n\n` +
      `**SatQuery AI:** ${t.answer}\n`
    )).join('\n---\n\n');

    navigator.clipboard.writeText(`SatQuery Session Transcript\nSession ID: ${sessionId}\nTotal Turns: ${count}\n\n${transcript}`);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const handleExportJson = () => {
    const data = {
      session_id: sessionId,
      exported_at: new Date().toISOString(),
      total_turns: count,
      turns: turns
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `satquery_session_${(sessionId || 'trace').slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div id="tour-context-memory" className="liquid-glass-strong rounded-2xl shadow-md border border-slate-200/80 dark:border-white/10 flex flex-col overflow-hidden transition-all duration-300">
        
        {/* Header Bar - Entire row clickable */}
        <div 
          onClick={() => setExpanded(prev => !prev)}
          className="flex items-center justify-between gap-2 px-3.5 py-2.5 cursor-pointer select-none hover:bg-slate-100/60 dark:hover:bg-white/5 transition-colors"
          title={expanded ? "Click to collapse conversation memory" : "Click to expand conversation memory"}
        >
          {/* Left: Icon & Title & Turn Pill */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/15 dark:bg-cyan-400/10 flex items-center justify-center flex-shrink-0 border border-cyan-500/30">
              <BrainCircuit className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            </div>
            
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                Context Memory
              </span>
              
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold flex items-center gap-1 border ${
                count > 0 
                  ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30' 
                  : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 border-slate-200 dark:border-white/10'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${count > 0 ? 'bg-cyan-500 animate-pulse' : 'bg-slate-400'}`} />
                {count === 0 ? '0 Turns' : `${count} Turn${count !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>

          {/* Right: Actions & Expand Chevron */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Full View Modal Trigger */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-cyan-500/10 dark:hover:bg-cyan-400/15 border border-slate-200/80 dark:border-white/10 text-[10px] font-semibold text-slate-600 dark:text-white/70 hover:text-cyan-600 dark:hover:text-cyan-300 transition-all cursor-pointer"
              title="Open full conversation history modal"
            >
              <Maximize2 className="w-3 h-3" />
              <span className="hidden sm:inline">Full View</span>
            </button>

            {/* New Session Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onNewConversation) onNewConversation();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 text-[10px] font-semibold text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:scale-105 transition-all cursor-pointer"
              title="Clear memory and start a fresh session on this scene"
            >
              <RotateCcw className="w-3 h-3" />
              <span>New</span>
            </button>

            {/* Expand / Collapse Chevron */}
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {/* Expanded Content Area */}
        {expanded && (
          <div className="border-t border-slate-200/60 dark:border-white/10 px-3.5 py-3 flex flex-col gap-2.5 max-h-72 sm:max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-white/15 bg-slate-50/40 dark:bg-black/15">
            
            {/* Empty State */}
            {count === 0 ? (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-cyan-500/5 dark:bg-cyan-400/5 border border-cyan-500/20 text-xs">
                <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1 min-w-0 flex-1 break-words">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Multi-Turn Session Memory Active
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-white/60 leading-relaxed break-words">
                    Ask questions above (e.g. <span className="font-mono text-cyan-600 dark:text-cyan-400">"Locate buildings"</span> followed by <span className="font-mono text-cyan-600 dark:text-cyan-400">"What is between them?"</span>). SatQuery links prior questions and spatial context across turns.
                  </p>
                </div>
              </div>
            ) : (
              /* Turns List */
              <>
                {turns.map((t, idx) => (
                  <div 
                    key={idx} 
                    className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col gap-2 transition-all hover:border-cyan-500/40"
                  >
                    {/* Turn Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 flex items-center gap-1">
                        <History className="w-3 h-3" />
                        Turn #{idx + 1}
                      </span>
                      
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {t.boxesCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <Target className="w-2.5 h-2.5" />
                            {t.boxesCount} Grounded
                          </span>
                        )}
                        {t.task && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/70">
                            {t.task}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* User Query */}
                    <div className="flex items-start gap-2 text-xs">
                      <div className="w-5 h-5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0 break-words text-slate-900 dark:text-slate-100 font-medium leading-relaxed select-text">
                        {t.query}
                      </div>
                    </div>

                    {/* Model Answer */}
                    <div className="flex items-start gap-2 text-xs bg-slate-50/80 dark:bg-white/[0.03] p-2 rounded-lg border border-slate-100 dark:border-white/5 relative group">
                      <div className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0 break-words text-slate-700 dark:text-white/80 leading-relaxed text-[11.5px] select-text">
                        {t.answer}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(t.answer, idx)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded bg-white dark:bg-slate-800 shadow border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-opacity"
                        title="Copy answer"
                      >
                        {copiedTurnIdx === idx ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                ))}

                {/* Bottom Action Strip */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/40 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1 text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Open in Full Modal View</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="flex items-center gap-1 text-[10px] font-mono text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Export JSON</span>
                  </button>
                </div>
              </>
            )}

          </div>
        )}

      </div>

      {/* Full-Screen Context Memory Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-3xl max-h-[90vh] liquid-glass-strong rounded-3xl shadow-2xl border border-slate-200/80 dark:border-white/15 flex flex-col overflow-hidden animate-scaleUp">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/70">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/15 dark:bg-cyan-400/15 flex items-center justify-center flex-shrink-0 border border-cyan-500/30">
                  <BrainCircuit className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      Multi-Turn Contextual Memory
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                      {count} {count === 1 ? 'Turn' : 'Turns'} Active
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-white/60 truncate">
                    Spatial-temporal conversation chain maintained for this AOI session
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {sessionId && (
                  <button
                    type="button"
                    onClick={handleCopySessionId}
                    className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-mono text-slate-600 dark:text-white/70 hover:bg-slate-200 transition-colors"
                    title="Click to copy Session ID"
                  >
                    {copiedSessionId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>ID: {sessionId.slice(0, 8)}...</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-white/10 hover:bg-rose-500/20 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - Spacious Timeline */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 bg-slate-50/50 dark:bg-black/20 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-white/15">
              {count === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 dark:bg-cyan-400/10 flex items-center justify-center mb-4 border border-cyan-500/20">
                    <BrainCircuit className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800 dark:text-white mb-2">
                    No Conversation Turns Recorded Yet
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-white/60 leading-relaxed mb-6">
                    SatQuery features an active multi-turn session memory engine. When you ask questions about an AOI scene, subsequent queries automatically reference prior bounding boxes, features, and analysis without losing context.
                  </p>
                  <div className="w-full bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 border border-slate-200 dark:border-white/10 text-left text-xs flex flex-col gap-2">
                    <span className="font-semibold text-slate-800 dark:text-white text-[11px] uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                      Sample Multi-Turn Progression:
                    </span>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold flex items-center justify-center">1</span>
                      <span>"Locate commercial buildings in Hyderabad corridor"</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold flex items-center justify-center">2</span>
                      <span>"Which of those structures is closest to the lake?"</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold flex items-center justify-center">3</span>
                      <span>"Perform multi-temporal change detection over that zone"</span>
                    </div>
                  </div>
                </div>
              ) : (
                turns.map((turn, idx) => (
                  <div 
                    key={idx}
                    className="p-4 sm:p-5 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col gap-3 transition-all hover:border-cyan-500/40"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5" />
                          Turn #{idx + 1}
                        </span>
                        {turn.timestamp && (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {turn.timestamp}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {turn.boxesCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {turn.boxesCount} Grounded Targets
                          </span>
                        )}
                        {turn.task && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/70">
                            {turn.task}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* User Prompt */}
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 mb-0.5">
                          User Query
                        </div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed select-text break-words">
                          {turn.query}
                        </div>
                      </div>
                    </div>

                    {/* AI Response */}
                    <div className="flex items-start gap-3 bg-slate-50 dark:bg-white/[0.03] p-3.5 rounded-xl border border-slate-100 dark:border-white/5 relative group">
                      <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-0.5 flex items-center justify-between">
                          <span>SatQuery Grounded Response</span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(turn.answer, idx)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-[10px] font-sans text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                          >
                            {copiedTurnIdx === idx ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedTurnIdx === idx ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <div className="text-xs sm:text-sm text-slate-700 dark:text-white/90 leading-relaxed select-text break-words whitespace-pre-line">
                          {turn.answer}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/70">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyFullTranscript}
                  disabled={count === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-white/80 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  {copiedTranscript ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTranscript ? 'Transcript Copied!' : 'Copy Transcript'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportJson}
                  disabled={count === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-white/80 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onNewConversation) onNewConversation();
                    setIsModalOpen(false);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear Memory</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md hover:shadow-cyan-500/20 transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
