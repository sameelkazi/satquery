import React from 'react';
import { Bot } from 'lucide-react';

export default function AskGuideBotButton({ 
  onAsk, 
  prompt, 
  label = "Ask Guide Bot", 
  className = "",
  size = "normal" 
}) {
  if (!onAsk) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onAsk(prompt);
      }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-500/20 to-violet-500/20 hover:from-indigo-500/30 hover:to-violet-500/30 border border-indigo-500/40 text-indigo-700 dark:text-indigo-300 font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm ${
        size === 'small' ? 'text-[10px] px-2 py-0.5' : 'text-xs'
      } ${className}`}
      title="Ask SatQuery Guide Bot about this feature"
    >
      <Bot className={size === 'small' ? 'w-3 h-3 text-indigo-500 dark:text-indigo-400' : 'w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400'} />
      <span>{label}</span>
    </button>
  );
}
