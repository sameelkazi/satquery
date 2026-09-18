import React, { useState } from 'react';
import { Terminal, Copy, Check, ExternalLink } from 'lucide-react';

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 rounded-xl overflow-hidden border border-slate-700/60 bg-slate-950 text-slate-100 shadow-md">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] font-mono text-slate-400">
        <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-semibold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-[11px] font-mono leading-relaxed text-emerald-300/90 selection:bg-cyan-500/30">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function renderInline(text) {
  if (!text) return null;

  // Regex matching:
  // 1. Markdown link: [label](url)
  // 2. Raw URL: https?://...
  // 3. Inline code: `code`
  // 4. Bold: **text**
  // 5. Italic: *text* (when not preceded/followed by another *)
  const tokenRegex = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s<),]+|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  
  const elements = [];
  let lastIdx = 0;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      elements.push(text.substring(lastIdx, match.index));
    }

    const fullMatch = match[0];

    // Case 1: Markdown link [label](url)
    if (match[2] && match[3]) {
      const label = match[2];
      const url = match[3];
      const isHf = url.includes('huggingface.co');

      if (isHf) {
        elements.push(
          <a
            key={match.index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 my-0.5 rounded-lg bg-amber-500/15 dark:bg-amber-400/15 border border-amber-500/40 text-amber-800 dark:text-amber-300 font-semibold text-[11px] hover:bg-amber-500/25 transition-all shadow-xs"
          >
            <span className="text-xs">🤗</span>
            <span className="underline underline-offset-2">{label}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-75" />
          </a>
        );
      } else {
        elements.push(
          <a
            key={match.index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 underline underline-offset-2 decoration-indigo-400/60 hover:decoration-indigo-500 transition-all"
          >
            <span>{label}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
          </a>
        );
      }
    }
    // Case 2: Raw URL
    else if (fullMatch.startsWith('http://') || fullMatch.startsWith('https://')) {
      const url = fullMatch;
      const isHf = url.includes('huggingface.co');

      if (isHf) {
        const repoName = url.replace(/https?:\/\/huggingface\.co\//, '');
        elements.push(
          <a
            key={match.index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 my-0.5 rounded-lg bg-amber-500/15 dark:bg-amber-400/15 border border-amber-500/40 text-amber-800 dark:text-amber-300 font-semibold text-[11px] hover:bg-amber-500/25 transition-all shadow-xs"
          >
            <span className="text-xs">🤗</span>
            <span className="underline underline-offset-2 font-mono truncate max-w-[260px]">{repoName}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-75" />
          </a>
        );
      } else {
        elements.push(
          <a
            key={match.index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 underline underline-offset-2 break-all text-[11px]"
          >
            <span>{url}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-70 flex-shrink-0" />
          </a>
        );
      }
    }
    // Case 3: Inline code `code`
    else if (match[4]) {
      elements.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 mx-0.5 rounded-md font-mono text-[11px] bg-slate-200/80 dark:bg-white/10 text-indigo-700 dark:text-cyan-300 font-semibold border border-slate-300/60 dark:border-white/10"
        >
          {match[4]}
        </code>
      );
    }
    // Case 4: Bold **bold**
    else if (match[5]) {
      elements.push(
        <strong key={match.index} className="font-bold text-slate-900 dark:text-white">
          {match[5]}
        </strong>
      );
    }
    // Case 5: Italic *italic*
    else if (match[6]) {
      elements.push(
        <em key={match.index} className="italic text-slate-700 dark:text-white/85">
          {match[6]}
        </em>
      );
    }

    lastIdx = tokenRegex.lastIndex;
  }

  if (lastIdx < text.length) {
    elements.push(text.substring(lastIdx));
  }

  return elements;
}

export default function GuideBotMarkdown({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Multi-line Code Block
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push(
        <CodeBlock
          key={`code-${blocks.length}`}
          language={lang}
          code={codeLines.join('\n')}
        />
      );
      continue;
    }

    // 2. Table Block
    if (line.includes('|') && i + 1 < lines.length && lines[i + 1].includes('|') && lines[i + 1].includes('---')) {
      const tableRows = [];
      while (i < lines.length && lines[i].includes('|')) {
        tableRows.push(lines[i]);
        i++;
      }

      const headerCols = tableRows[0]
        .split('|')
        .map(c => c.trim())
        .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1);
      
      const bodyRows = tableRows.slice(2).map(r => 
        r.split('|')
         .map(c => c.trim())
         .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1)
      );

      blocks.push(
        <div key={`table-${blocks.length}`} className="my-3 overflow-x-auto rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
          <table className="w-full text-[11px] text-left">
            <thead className="bg-slate-100/90 dark:bg-white/5 border-b border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-white font-bold">
              <tr>
                {headerCols.map((c, colIdx) => (
                  <th key={colIdx} className="px-3 py-2">
                    {renderInline(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/5 bg-white/40 dark:bg-black/20">
              {bodyRows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-3 py-2 text-slate-700 dark:text-white/80">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // 3. Headings
    if (line.startsWith('#### ')) {
      blocks.push(
        <h5 key={`h4-${blocks.length}`} className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mt-2.5 mb-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          {renderInline(line.slice(5))}
        </h5>
      );
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      blocks.push(
        <h4 key={`h3-${blocks.length}`} className="text-xs sm:text-sm font-bold text-indigo-800 dark:text-indigo-300 mt-3 mb-1.5 pb-1 border-b border-indigo-500/20 flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">§</span>
          {renderInline(line.slice(4))}
        </h4>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push(
        <h3 key={`h2-${blocks.length}`} className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-3.5 mb-1.5 pb-1 border-b border-slate-200/80 dark:border-white/10">
          {renderInline(line.slice(3))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      blocks.push(
        <h2 key={`h1-${blocks.length}`} className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-4 mb-2 pb-1.5 border-b border-slate-300/80 dark:border-white/15">
          {renderInline(line.slice(2))}
        </h2>
      );
      i++;
      continue;
    }

    // 4. Horizontal Rule
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
      blocks.push(<hr key={`hr-${blocks.length}`} className="my-3 border-slate-200/80 dark:border-white/10" />);
      i++;
      continue;
    }

    // 5. Blockquote
    if (line.startsWith('> ')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <blockquote key={`quote-${blocks.length}`} className="my-2.5 pl-3 py-2 border-l-3 border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/20 text-slate-700 dark:text-white/80 italic rounded-r-xl text-xs leading-relaxed">
          {quoteLines.map((ql, qidx) => (
            <p key={qidx}>{renderInline(ql)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // 6. Unordered List Items
    if (/^[\*\-]\s+/.test(line.trim())) {
      const listItems = [];
      while (i < lines.length && /^[\*\-]\s+/.test(lines[i].trim())) {
        const itemContent = lines[i].trim().replace(/^[\*\-]\s+/, '');
        listItems.push(itemContent);
        i++;
      }
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="my-2 space-y-1.5 pl-0.5">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-slate-700 dark:text-white/90">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 mt-1.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">{renderInline(item)}</div>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 7. Ordered List Items
    if (/^\d+\.\s+/.test(line.trim())) {
      const listItems = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const match = lines[i].trim().match(/^(\d+)\.\s+(.*)/);
        if (match) {
          listItems.push({ num: match[1], text: match[2] });
        }
        i++;
      }
      blocks.push(
        <ol key={`ol-${blocks.length}`} className="my-2 space-y-1.5 pl-0.5">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-slate-700 dark:text-white/90">
              <span className="w-4 h-4 rounded-full bg-indigo-500/15 dark:bg-indigo-400/20 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                {item.num}
              </span>
              <div className="flex-1 min-w-0">{renderInline(item.text)}</div>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 8. Empty lines
    if (!line.trim()) {
      blocks.push(<div key={`empty-${blocks.length}`} className="h-1.5" />);
      i++;
      continue;
    }

    // 9. Standard Paragraph
    blocks.push(
      <p key={`p-${blocks.length}`} className="my-1.5 text-xs leading-relaxed text-slate-800 dark:text-white/90">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-0.5">{blocks}</div>;
}
