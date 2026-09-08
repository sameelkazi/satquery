import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Satellite, 
  Layers, 
  RefreshCw, 
  Radio, 
  Image as ImageIcon, 
  Upload, 
  CheckCircle2, 
  Mic, 
  MicOff, 
  Volume2, 
  ShieldCheck, 
  ChevronDown,
  Paperclip,
  Command,
  XIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadSatelliteFile } from '../api/client';
import AgencyLogo from './AgencyLogo';

const SAMPLE_QUERIES = [
  {
    label: "Locate Buildings",
    query: "locate buildings in this image",
    type: "grounding",
    aoiId: "aoi_01_hyderabad"
  },
  {
    label: "ISRO Q1: Land-cover",
    query: "Describe the land-cover and major objects visible in this image",
    type: "vqa",
    aoiId: "aoi_01_hyderabad"
  },
  {
    label: "ISRO Q3: Flood Change",
    query: "What changed between these two dates, and where did the change occur?",
    type: "change",
    aoiId: "aoi_02_brahmaputra"
  },
  {
    label: "ISRO Q4: Optical + SAR",
    query: "Use the optical and SAR images together to identify built-up and water-covered regions",
    type: "fusion",
    aoiId: "aoi_01_hyderabad"
  },
  {
    label: "ISRO Q5: Built-up Dynamic",
    query: "Has the built-up area increased, decreased, or remained unchanged?",
    type: "change",
    aoiId: "aoi_02_brahmaputra"
  }
];

const SAT_COMMANDS = [
  { 
    prefix: "/locate", 
    label: "Locate Buildings", 
    description: "Detect and bound built structures", 
    query: "locate buildings in this image" 
  },
  { 
    prefix: "/change", 
    label: "Flood & Land Change", 
    description: "Detect bi-temporal water inundation", 
    query: "What changed between these two dates, and where did the change occur?" 
  },
  { 
    prefix: "/crops", 
    label: "Crop Classification", 
    description: "Analyze agricultural vegetation & stress", 
    query: "What type of agricultural crops/vegetation are present?" 
  },
  { 
    prefix: "/radar", 
    label: "SAR Radar Fusion", 
    description: "Fuse optical with microwave backscatter", 
    query: "Use the optical and SAR images together to identify built-up and water-covered regions" 
  },
  { 
    prefix: "/landcover", 
    label: "Land-cover QA", 
    description: "Comprehensive scene breakdown", 
    query: "Describe the land-cover and major objects visible in this image" 
  },
];

export default function QueryBox({ 
  onSendQuery, 
  onQuery,
  isLoading, 
  selectedAoi, 
  onSelectAoi, 
  sampleAois = [],
  selectedModality,
  onModalityChange,
  language = 'en',
  onLanguageChange
}) {
  const [query, setQuery] = useState('');
  const [localLanguage, setLocalLanguage] = useState(language);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isStressTestActive, setIsStressTestActive] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [inputFocused, setInputFocused] = useState(false);

  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const commandPaletteRef = useRef(null);

  useEffect(() => {
    setLocalLanguage(language);
  }, [language]);

  // Command palette autocomplete
  useEffect(() => {
    if (query.startsWith('/') && !query.includes(' ')) {
      setShowCommandPalette(true);
      const idx = SAT_COMMANDS.findIndex(cmd => cmd.prefix.startsWith(query.toLowerCase()));
      setActiveSuggestion(idx >= 0 ? idx : -1);
    } else {
      setShowCommandPalette(false);
    }
  }, [query]);

  // Click outside to close command palette
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (commandPaletteRef.current && !commandPaletteRef.current.contains(e.target)) {
        setShowCommandPalette(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize Web Speech API for voice query
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = localLanguage === 'hi' ? 'hi-IN' : 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (e) => {
        console.error("Speech recognition error:", e);
        setIsListening(false);
      };
      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        if (transcript) {
          setQuery(transcript);
        }
      };
      recognitionRef.current = recognition;
    }
  }, [localLanguage]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.lang = localLanguage === 'hi' ? 'hi-IN' : 'en-US';
      recognitionRef.current.start();
    }
  };

  const handleKeyDown = (e) => {
    if (showCommandPalette) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestion(prev => (prev < SAT_COMMANDS.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestion(prev => (prev > 0 ? prev - 1 : SAT_COMMANDS.length - 1));
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        if (activeSuggestion >= 0) {
          setQuery(SAT_COMMANDS[activeSuggestion].query);
          setShowCommandPalette(false);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowCommandPalette(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!query.trim() || isLoading) return;
    const sendFn = onSendQuery || onQuery;
    if (sendFn) {
      sendFn({
        query: query.trim(),
        language: localLanguage,
        stressTest: isStressTestActive
      });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await uploadSatelliteFile(file, selectedModality === 'sar' ? 'sar' : 'optical');
      setUploadedFileName(file.name);
      if (onSelectAoi) {
        onSelectAoi({
          id: `custom_${Date.now()}`,
          name: `Uploaded: ${file.name}`,
          state: 'User Scene',
          center: [17.4100, 78.4675],
          bbox: [78.4400, 17.3850, 78.4950, 17.4350],
          sensors: {
            optical: { file: res.filename, url_or_path: res.url_or_path },
            sar: { file: res.filename, url_or_path: res.url_or_path },
            optical_t1: { file: res.filename, url_or_path: res.url_or_path },
            optical_t2: { file: res.filename, url_or_path: res.url_or_path }
          },
          description: `Custom uploaded remote-sensing tile (${file.name})`
        });
      }
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleChipClick = (chip) => {
    setQuery(chip.query);
    if (chip.aoiId && onSelectAoi) {
      const match = sampleAois.find(a => a.id === chip.aoiId);
      if (match) onSelectAoi(match);
    }
  };

  return (
    <div id="tour-query-box" className="liquid-glass-strong p-2.5 sm:p-3 rounded-2xl flex flex-col gap-2 shadow-xl relative flex-shrink-0 z-20">
      
      {/* Sleek Compact Tool Bar: Modality, Quick Prompts, Stress-Test */}
      <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-slate-200/60 dark:border-white/10 flex-wrap">
        
        {/* Left: Modality Dropdown & Quick Prompts Dropdown */}
        <div className="flex items-center gap-1.5 flex-wrap">
          
          {/* Modality Dropdown — iOS Liquid Glass Pill */}
          <div id="tour-modality-switcher" className="relative flex items-center gap-1.5 ios-dropdown-pill pl-3 pr-7 py-1 flex-shrink-0 group cursor-pointer overflow-hidden">
            <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0 pointer-events-none" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 select-none pointer-events-none">
              {selectedModality === 'optical' && 'Optical (Sentinel-2)'}
              {selectedModality === 'sar' && 'SAR Radar (Sentinel-1)'}
              {selectedModality === 'sar_fusion' && 'Fused (Optical + SAR)'}
              {selectedModality === 'change_detection' && 'Bi-Temporal (T1 vs T2)'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-white/40 group-hover:text-slate-600 dark:group-hover:text-white/70 transition-colors pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            
            <select
              value={selectedModality}
              onChange={(e) => onModalityChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              title="Select satellite sensor modality"
            >
              <option value="optical" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">Optical (Sentinel-2)</option>
              <option value="sar" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">SAR Radar (Sentinel-1)</option>
              <option value="sar_fusion" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">Fused (Optical + SAR)</option>
              <option value="change_detection" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">Bi-Temporal (T1 vs T2)</option>
            </select>
          </div>

          {/* Quick Prompts Dropdown — iOS Liquid Glass Pill with Official ISRO Insignia */}
          <div className="relative flex items-center gap-1.5 ios-dropdown-pill pl-2.5 pr-7 py-1 flex-shrink-0 group cursor-pointer overflow-hidden">
            <AgencyLogo domain="isro.gov.in" className="w-4 h-3.5 object-contain flex-shrink-0 pointer-events-none" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 select-none pointer-events-none">
              ISRO Exemplars
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-white/40 group-hover:text-slate-600 dark:group-hover:text-white/70 transition-colors pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            
            <select
              onChange={(e) => {
                if (e.target.value) {
                  const q = SAMPLE_QUERIES.find(sq => sq.query === e.target.value);
                  if (q) handleChipClick(q);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              title="Load pre-calibrated ISRO benchmark query"
            >
              <option value="" disabled className="bg-white dark:bg-slate-950 text-slate-500 dark:text-white/50">ISRO Exemplars</option>
              {SAMPLE_QUERIES.map((sq, idx) => (
                <option key={idx} value={sq.query} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
                  {sq.label}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Right: Stress-Test Toggle */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsStressTestActive(prev => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
              isStressTestActive
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-700 dark:text-amber-300 font-bold shadow-xs shadow-amber-500/10'
                : 'bg-white/85 dark:bg-slate-900/85 border-slate-200/90 dark:border-white/10 text-slate-700 dark:text-white/70 hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-950 dark:hover:text-white shadow-xs'
            }`}
            title="Toggle 5-Trial Test-Time Augmentation (TTA) Perturbation Stress-Test"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${isStressTestActive ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
            <span>Stress-Test {isStressTestActive ? 'ON' : 'OFF'}</span>
          </button>
        </div>

      </div>

      {/* Interactive AI Chat Input Box with Animated Ring & Command Palette */}
      <div className="relative w-full">
        
        {/* Command Palette Dropdown (Opens downwards with high z-index to avoid clipping) */}
        <AnimatePresence>
          {showCommandPalette && (
            <motion.div 
              ref={commandPaletteRef}
              className="absolute left-0 right-0 top-full mt-2 backdrop-blur-xl bg-white/95 dark:bg-slate-950/95 rounded-xl z-50 shadow-2xl border border-slate-200/90 dark:border-cyan-500/30 overflow-hidden"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              <div className="py-1">
                <div className="px-3 py-1.5 text-[10px] font-mono text-cyan-600 dark:text-cyan-400 uppercase tracking-wider font-bold border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                  <span>ISRO Satellite Commands (Press Enter or Tab)</span>
                  <span className="text-slate-400 dark:text-white/40">ESC to close</span>
                </div>
                {SAT_COMMANDS.map((cmd, index) => (
                  <div
                    key={cmd.prefix}
                    className={`flex items-center justify-between px-3 py-2 text-xs transition-colors cursor-pointer ${
                      activeSuggestion === index 
                        ? 'bg-cyan-500/20 text-cyan-900 dark:text-white font-medium' 
                        : 'text-slate-800 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                    onClick={() => {
                      setQuery(cmd.query);
                      setShowCommandPalette(false);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{cmd.prefix}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{cmd.label}</span>
                    </div>
                    <span className="text-slate-500 dark:text-white/40 text-[11px] truncate max-w-[200px]">{cmd.description}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Wrapper with Ambient Glow Focus Ring */}
        <div className={`relative w-full rounded-xl bg-white/90 dark:bg-slate-900/90 border transition-all ${
          inputFocused 
            ? 'border-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.25)] ring-2 ring-cyan-500/20' 
            : 'border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
        }`}>
          
          {/* Main Input Textarea/Input */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={
              isListening 
                ? "Listening to voice query..." 
                : localLanguage === 'hi'
                  ? "उपग्रह दृश्य पर कुछ भी पूछें (उदा. 'इमारतें दिखाओ', '/' दबाकर कमांड्स देखें)..."
                  : "Ask anything about this scene (or type '/' for satellite commands)..."
            }
            disabled={isLoading}
            className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 text-xs sm:text-sm px-3.5 py-2.5 focus:outline-none font-sans"
          />

          {/* Attached File Chip if uploaded */}
          {uploadedFileName && (
            <div className="px-3 pb-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span className="truncate max-w-[200px]">{uploadedFileName}</span>
                <button
                  type="button"
                  onClick={() => setUploadedFileName(null)}
                  className="hover:text-rose-500 ml-1 cursor-pointer"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </span>
            </div>
          )}

          {/* Bottom Integrated Action Bar */}
          <div className="px-2.5 py-1.5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-2">
            
            {/* Action Tools Left */}
            <div className="flex items-center gap-1">
              
              {/* File / Raster Attach Button */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".tif,.tiff,.geotiff,.png,.jpg,.jpeg" 
                className="hidden" 
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-1.5 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Attach GeoTIFF Raster or Custom Image"
              >
                {isUploading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-500" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </button>

              {/* Command Palette Button */}
              <button
                type="button"
                onClick={() => setShowCommandPalette(prev => !prev)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  showCommandPalette 
                    ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' 
                    : 'text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
                title="Satellite Commands Palette (Type '/')"
              >
                <Command className="w-4 h-4" />
              </button>

              {/* Voice Input Mic */}
              <button
                type="button"
                onClick={toggleListening}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  isListening 
                    ? 'bg-rose-500 text-white shadow-md animate-bounce' 
                    : 'text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
                title={isListening ? "Click to stop recording" : "Click to speak voice query"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

            </div>

            {/* Sci-Fi Cosmos AI Glowing Query Button */}
            <div className="sq-ai-btn-wrapper">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || !query.trim()}
                className={`sq-ai-btn ${isLoading ? 'is-loading' : ''}`}
                title={isLoading ? "Processing satellite query..." : "Execute satellite query"}
              >
                <svg className="sq-btn-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                </svg>
                <div className="sq-txt-wrapper">
                  <div className="sq-txt-1">
                    {(localLanguage === 'hi' ? 'खोजें' : 'Query').split('').map((char, idx) => (
                      <span key={idx} className="sq-btn-letter">
                        {char}
                      </span>
                    ))}
                  </div>
                  <div className="sq-txt-2">
                    {(localLanguage === 'hi' ? 'खोज जारी...' : 'Querying...').split('').map((char, idx) => (
                      <span key={idx} className="sq-btn-letter">
                        {char}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Stress-Test Active Live Banner */}
      {isStressTestActive && (
        <div className="flex items-center justify-between px-3 py-1 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-[10.5px] text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span className="font-semibold">
              TTA Robustness Stress-Test: 5-trial perturbations active.
            </span>
          </div>
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 px-1.5 py-0.5 rounded-full">
            Active
          </span>
        </div>
      )}

    </div>
  );
}
