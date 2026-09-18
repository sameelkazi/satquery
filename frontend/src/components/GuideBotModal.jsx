import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  User, 
  Copy, 
  Check, 
  Maximize2, 
  Minimize2, 
  Cpu, 
  Layers, 
  ShieldCheck, 
  Compass, 
  BookOpen,
  ArrowRight,
  Award,
  Globe,
  ShieldAlert,
  Sprout,
  Building2,
  Play,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { askGuideBot } from '../api/client';
import GuideBotMarkdown from './GuideBotMarkdown';

/**
 * SatQuery Guide Bot (Enhanced 2026-09-10)
 *
 * A high-fidelity, judge-facing Q&A assistant: answers questions about SatQuery's features,
 * multi-model pipeline, fine-tuned adapters, and technical architecture.
 * Grounded on docs/GUIDE_BOT_KNOWLEDGE.md (46KB) via Gemini 2.5 Flash serverless endpoint.
 */

const STARTER_CATEGORIES = [
  {
    category: "Fine-Tuned Models & Weights",
    icon: Cpu,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
    prompts: [
      "Where can I find your fine-tuned Hugging Face model and weights?",
      "What in this demo is actually running a fine-tuned model vs. calling an LLM API?"
    ]
  },
  {
    category: "Architecture & Pipelines",
    icon: Layers,
    color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/30",
    prompts: [
      "Walk me through the technical architecture end-to-end.",
      "How does the cross-modal optical + SAR fusion actually work?"
    ]
  },
  {
    category: "Accuracy & Rigorous Audits",
    icon: ShieldCheck,
    color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/30",
    prompts: [
      "What's your VQA and grounding accuracy?",
      "Which parts of this app are UI mockups, not wired to a backend?"
    ]
  }
];

const FOLLOW_UP_SUGGESTIONS = [
  "Show Hugging Face LoRA adapter links",
  "How does Qwen2.5-VL bounding box grounding work?",
  "What is the Kaggle fine-tuning journey and loss curve?",
  "Explain RemoteCLIP zero-shot routing vs fallback"
];

function MessageItem({ message, onSendFollowup }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!message.text) return;
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUser = message.role === 'user';
  const isFailed = message.failed;

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-2.5 my-2">
        <div className="max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl rounded-tr-xs bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md text-xs sm:text-sm leading-relaxed font-sans">
          {message.text}
        </div>
        <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5 shadow-xs">
          <User className="w-3.5 h-3.5" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 my-3">
      {/* Bot Icon */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-sm ${
        isFailed
          ? 'bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400'
          : 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
      }`}>
        {isFailed ? <AlertCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Content Card */}
      <div className={`flex-1 min-w-0 rounded-2xl rounded-tl-xs p-4 sm:p-5 shadow-sm border transition-all ${
        isFailed 
          ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200'
          : 'bg-white/80 dark:bg-[#0c1227]/80 backdrop-blur-md border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-white/95'
      }`}>
        
        {/* Sub-header inside message */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/60 dark:border-white/5 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-sans text-indigo-600 dark:text-indigo-400 tracking-tight">
              SatQuery Guide AI
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-slate-500 dark:text-white/60">
              Grounded Brain
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/10 text-[11px] font-medium text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-xs"
            title="Copy answer to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Formatted Markdown Body */}
        {isFailed ? (
          <p className="text-xs sm:text-sm leading-relaxed">{message.text}</p>
        ) : (
          <div className="font-sans">
            <GuideBotMarkdown content={message.text} />
          </div>
        )}

      </div>
    </div>
  );
}

export default function GuideBotModal({ 
  isOpen, 
  onClose, 
  initialPrompt = null, 
  onOpenUserGuide = null, 
  isDarkMode = true 
}) {
  const [messages, setMessages] = useState([]); // { role: 'user' | 'model', text: string, failed?: boolean }
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const scrollRef = useRef(null);
  const handledPromptRef = useRef(null);

  const sendQuestion = async (question) => {
    const q = (question || '').trim();
    if (!q || isSending) return;

    const nextMessages = [...messages, { role: 'user', text: q }];
    setMessages(nextMessages);
    setInput('');
    setIsSending(true);

    try {
      const historyForServer = nextMessages.map(m => ({ role: m.role, text: m.text }));
      const res = await askGuideBot(q, historyForServer.slice(0, -1));
      let answer = res?.answer || "The guide assistant didn't return a valid response just now. Please try again.";
      if (answer.startsWith("MANDATORY RULE OVERRIDE")) {
        answer = answer.replace(/^MANDATORY RULE OVERRIDE[^\n]*\n+/i, '')
                       .replace(/^Whenever ANY user query asks about[^\n]*\n+/i, '')
                       .replace(/^You MUST ALWAYS explicitly provide[^\n]*\n+/i, '')
                       .trim();
      }
      setMessages(prev => [...prev, {
        role: 'model',
        text: answer,
        failed: res?.ok === false
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'model',
        text: "Couldn't reach the guide assistant — check your connection and try again.",
        failed: true
      }]);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isSending]);

  useEffect(() => {
    if (isOpen && initialPrompt && initialPrompt !== handledPromptRef.current) {
      handledPromptRef.current = initialPrompt;
      sendQuestion(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    sendQuestion(input);
  };

  const resetChat = () => {
    setMessages([]);
    setInput('');
    handledPromptRef.current = null;
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/85 backdrop-blur-2xl animate-fade-in font-general">
      {/* Modal Container */}
      <div className={`relative w-full rounded-t-3xl sm:rounded-3xl liquid-glass-strong bg-white/95 dark:bg-[#070b19]/95 text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/15 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
        isMaximized 
          ? 'sm:max-w-[96vw] h-[94vh] sm:h-[94vh]' 
          : 'sm:max-w-2xl md:max-w-3xl lg:max-w-4xl h-[90vh] sm:h-[84vh] max-h-[820px]'
      }`}>

        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 shadow-sm">
              <Bot className="w-5 h-5" />
              {/* Online pulsing indicator */}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#070b19] animate-pulse" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  SatQuery Guide Bot
                </h3>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                  Technical Assistant
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-white/60 truncate">
                Official Knowledge Base • Fine-Tuned Models &amp; Technical Architecture
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {onOpenUserGuide && (
              <button
                type="button"
                onClick={() => { onClose(); onOpenUserGuide(); }}
                title="Open Government & Judge User Guide"
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 hover:bg-amber-500/25 transition-all cursor-pointer flex-shrink-0 shadow-2xs"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">User Guide</span>
              </button>
            )}

            {messages.length > 0 && (
              <button
                type="button"
                onClick={resetChat}
                title="Start a new conversation"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl liquid-glass border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:scale-105 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Restore window" : "Maximize window"}
              className="hidden sm:flex w-8 h-8 sm:w-9 sm:h-9 rounded-xl liquid-glass border border-slate-200/80 dark:border-white/10 items-center justify-center text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:scale-105 transition-all cursor-pointer"
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl liquid-glass border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:scale-105 transition-all cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          </div>
        </div>

        {/* Message Feed */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 flex flex-col gap-3">
          
          {/* Welcome Screen when Empty */}
          {messages.length === 0 && (
            <div className="flex flex-col gap-4 my-auto py-2">
              
              {/* Hero Banner */}
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-cyan-500/10 border border-indigo-500/20 dark:border-indigo-400/20 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs tracking-wider uppercase mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>SatQuery Technical Assistant</span>
                </div>
                <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1.5">
                  Ask anything about the system architecture, model fine-tuning, or live pipelines.
                </h4>
                <p className="text-xs text-slate-500 dark:text-white/60">
                  Grounded strictly on verified documentation, IEEE paper, and Hugging Face weights.
                </p>
              </div>

              {/* Dedicated Government & Judge User Guide Banner Card */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-indigo-500/15 border border-amber-500/35 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 shadow-2xs">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Who are you?
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                        User Guide
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-white/70 mt-0.5">
                      Operational guide &amp; SOPs for SIH Judges, ISRO, NDMA, MoA, MoHUA &amp; Defence with official demo video.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
                  <a
                    href="https://drive.google.com/file/d/1wXmPzBycXPVv-Xyxt5H7ruJtYXB5K1Cy/view?usp=drivesdk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Demo Video</span>
                  </a>
                  {onOpenUserGuide && (
                    <button
                      type="button"
                      onClick={() => { onClose(); onOpenUserGuide(); }}
                      className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <span>Open Guide</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Categorized Starters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {STARTER_CATEGORIES.map((cat, idx) => {
                  const Icon = cat.icon;
                  return (
                    <div 
                      key={idx} 
                      className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 flex flex-col gap-2 shadow-xs"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className={`p-1.5 rounded-xl border ${cat.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-white/90">
                          {cat.category}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        {cat.prompts.map((p, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => sendQuestion(p)}
                            className="text-left p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-xs text-slate-700 dark:text-white/80 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:shadow-xs transition-all cursor-pointer group flex items-start justify-between gap-1.5"
                          >
                            <span className="leading-snug">{p}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-0.5 opacity-60" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* Rendered Messages */}
          {messages.map((m, i) => (
            <MessageItem 
              key={i} 
              message={m} 
              onSendFollowup={sendQuestion} 
            />
          ))}

          {/* Thinking / Streaming State */}
          {isSending && (
            <div className="flex items-start gap-2.5 my-3 animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>

              <div className="px-4 py-3 rounded-2xl rounded-tl-xs bg-white/80 dark:bg-[#0c1227]/80 border border-slate-200/80 dark:border-white/10 text-xs text-slate-600 dark:text-white/70 flex items-center gap-2.5 shadow-sm">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-150" />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse delay-300" />
                </div>
                <span className="font-medium text-indigo-600 dark:text-indigo-400 font-sans">
                  Synthesizing verified documentation &amp; architectural evidence…
                </span>
              </div>
            </div>
          )}

          {/* Suggested follow-up chips after answer */}
          {messages.length > 0 && !isSending && (
            <div className="pt-2 pb-1 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold text-slate-400 dark:text-white/40 uppercase tracking-wider mr-1">
                Suggested:
              </span>
              {FOLLOW_UP_SUGGESTIONS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendQuestion(chip)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-slate-200/80 dark:border-white/10 hover:border-indigo-400/50 text-[11px] text-slate-600 dark:text-white/75 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all cursor-pointer shadow-2xs"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Bottom Input Form */}
        <form 
          onSubmit={handleSubmit} 
          className="flex-shrink-0 px-4 sm:px-6 py-3.5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-[#070b19]/90 backdrop-blur-md flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about fine-tuned models, grounding metrics, multi-pass ChangeFormer, or API..."
              disabled={isSending}
              className="flex-1 px-4 py-2.5 rounded-full bg-white dark:bg-white/10 border border-slate-200/80 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all disabled:opacity-60 shadow-inner"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="px-4 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 transition-all shadow-md hover:scale-102 active:scale-98 cursor-pointer"
            >
              <span>Ask</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-white/40 px-1">
            <span>SatQuery Architecture Brain • Official System Documentation</span>
            <span className="hidden sm:inline">Press Enter to send</span>
          </div>
        </form>

      </div>
    </div>
  );
}
