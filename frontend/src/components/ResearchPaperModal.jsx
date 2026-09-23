import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  ExternalLink, 
  Download, 
  ShieldCheck, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2,
  BookOpen
} from 'lucide-react';
import ThemeCloseButton from './ThemeCloseButton';
import AskGuideBotButton from './AskGuideBotButton';

export default function ResearchPaperModal({ isOpen, onClose, onAskGuideBot }) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const scrollContainerRef = useRef(null);

  // Reset zoom on modal open/close
  useEffect(() => {
    if (isOpen) {
      setZoomLevel(100);
    }
  }, [isOpen]);

  // Support Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const driveViewUrl = "https://drive.google.com/file/d/17EHRK2iKjiZB9HNvXPx8E0uxy5flDiO7/view?usp=drivesdk";
  const drivePreviewUrl = "https://drive.google.com/file/d/17EHRK2iKjiZB9HNvXPx8E0uxy5flDiO7/preview";

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 25, 250));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 25, 50));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  };

  const handleDownloadPaper = async (e) => {
    if (e) e.preventDefault();
    try {
      const res = await fetch('/SatQuery_IEEE_Research_Paper.pdf');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "SatQuery_IEEE_Research_Paper.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    } catch (err) {
      console.warn("Direct blob download failed, falling back to window.open", err);
    }
    window.open('/SatQuery_IEEE_Research_Paper.pdf', '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200 font-general">
      {/* Sleek Luxury White Modal Container */}
      <div className="relative w-full max-w-6xl h-[96vh] sm:h-[92vh] rounded-2xl sm:rounded-3xl bg-white text-slate-900 shadow-[0_25px_80px_rgba(0,0,0,0.5)] border border-slate-200/90 flex flex-col overflow-hidden">
        
        {/* Top Header Bar — Fully Responsive on 9:16 Mobile viewports */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-200/80 bg-slate-50/95 backdrop-blur-md flex-shrink-0 gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Team / Project Official Logo */}
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 p-1 flex items-center justify-center flex-shrink-0 shadow-sm">
              <img 
                src="/team_logo.png" 
                alt="Unhandled Exceptions" 
                className="w-full h-full object-contain drop-shadow-sm" 
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-xs sm:text-base md:text-lg font-bold tracking-tight text-slate-900 truncate">
                  SatQuery: IEEE 4-Page Paper
                </h2>
                <span className="text-[10px] sm:text-[11px] font-semibold text-cyan-800 tracking-tight bg-cyan-100/80 px-2 py-0.5 rounded-full border border-cyan-200">
                  IEEE TGRS
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-500 font-sans mt-0.5 truncate">
                Smart India Hackathon 2026 • ISRO Problem Statement SIH26167 • Camera-Ready Manuscript
              </p>
            </div>
          </div>

          {/* Header Action Buttons & Desktop Zoom Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            
            {/* Desktop Zoom Control Group (Hidden on small 9:16 mobile where floating bar is active) */}
            <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full bg-slate-200/80 border border-slate-300 text-slate-700">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 75}
                className="p-1 rounded-full hover:bg-white active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
                title="Zoom Out (-25%)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-bold min-w-[40px] text-center">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 250}
                className="p-1 rounded-full hover:bg-white active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
                title="Zoom In (+25%)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              {zoomLevel !== 100 && (
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="p-1 rounded-full hover:bg-white text-cyan-700 active:scale-95 transition-all cursor-pointer ml-0.5"
                  title="Reset Zoom to 100%"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Guide Bot Button (Hidden on very compact screens to avoid wrapping) */}
            <div className="hidden lg:block">
              <AskGuideBotButton 
                label="Ask Guide Bot"
                onClick={() => onAskGuideBot && onAskGuideBot("Summarize the SatQuery IEEE 4-page research paper manuscript: key methodologies, benchmark datasets (VRSBench), and validation results.")} 
              />
            </div>

            {/* Direct Download Button */}
            <a
              href="/SatQuery_IEEE_Research_Paper.pdf"
              download="SatQuery_IEEE_Research_Paper.pdf"
              onClick={handleDownloadPaper}
              className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white text-[11px] sm:text-xs font-semibold tracking-tight transition-all shadow-sm hover:scale-105 cursor-pointer flex-shrink-0"
              title="Download IEEE 4-Page Research Paper PDF directly"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Download PDF</span>
            </a>

            {/* Open in Drive Button */}
            <a
              href={driveViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-[11px] sm:text-xs font-semibold tracking-tight transition-all shadow-sm hover:scale-105 cursor-pointer flex-shrink-0"
              title="Open document in Google Drive new tab"
            >
              <span className="hidden sm:inline">Drive</span>
              <ExternalLink className="w-3.5 h-3.5 text-cyan-300" />
            </a>

            <ThemeCloseButton onClick={onClose} />
          </div>
        </div>

        {/* Embedded Native Google Drive Document Viewer with Interactive Zoom Container */}
        <div 
          ref={scrollContainerRef}
          className="w-full flex-1 relative bg-slate-200/70 overflow-auto touch-pan-x touch-pan-y select-none"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain'
          }}
        >
          <div
            style={{
              width: `${zoomLevel}%`,
              height: `${zoomLevel}%`,
              minWidth: '100%',
              minHeight: '100%',
              transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1), height 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            className="relative flex items-center justify-center bg-slate-100"
          >
            <iframe
              src={drivePreviewUrl}
              className="w-full h-full border-0"
              allow="autoplay"
              title="SatQuery IEEE Research Paper Drive View"
            />
          </div>
        </div>

        {/* Floating Zoom & Reader Controls Bar — Specially crafted for 9:16 Mobile Screens */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full bg-slate-900/90 dark:bg-black/90 backdrop-blur-xl border border-white/20 shadow-[0_10px_35px_rgba(0,0,0,0.5)] text-white select-none">
          
          {/* Zoom Out Button */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 75}
            className="p-1.5 rounded-full hover:bg-white/15 active:scale-90 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
            title="Zoom Out (-25%)"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-white" />
          </button>

          {/* Current Zoom Level Display */}
          <div className="flex items-center gap-1 px-1">
            <span className="text-xs font-mono font-bold tracking-wider min-w-[38px] text-center text-cyan-300">
              {zoomLevel}%
            </span>
            {zoomLevel !== 100 && (
              <button
                type="button"
                onClick={handleResetZoom}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/25 text-cyan-300 hover:bg-cyan-500/40 transition-colors cursor-pointer"
                title="Reset to 100% Fit"
              >
                Reset
              </button>
            )}
          </div>

          {/* Zoom In Button */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 250}
            className="p-1.5 rounded-full hover:bg-white/15 active:scale-90 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
            title="Zoom In (+25%)"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-white" />
          </button>

          {/* Vertical Divider */}
          <div className="w-[1px] h-4 bg-white/20 mx-0.5" />

          {/* Quick 1.5x Mobile Reading Mode Preset */}
          <button
            type="button"
            onClick={() => setZoomLevel(zoomLevel === 150 ? 100 : 150)}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
              zoomLevel === 150 
                ? 'bg-cyan-400 text-slate-950 font-black shadow-sm' 
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
            title="Toggle 150% Mobile Column Reading Mode"
          >
            <span>{zoomLevel === 150 ? 'Fit 100%' : '1.5x Read'}</span>
          </button>

          {/* Direct Fullscreen / External View */}
          <a
            href={driveViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-full hover:bg-white/15 active:scale-90 transition-all text-cyan-300 cursor-pointer"
            title="Open Fullscreen in Google Drive app/tab"
            aria-label="Open in Google Drive"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

      </div>
    </div>
  );
}
