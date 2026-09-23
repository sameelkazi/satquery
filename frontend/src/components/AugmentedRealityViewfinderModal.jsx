import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Compass, 
  Crosshair, 
  MapPin, 
  Layers, 
  ShieldCheck, 
  Radio, 
  CheckCircle2, 
  RefreshCw, 
  X, 
  Sliders, 
  Eye,
  Scan,
  Send
} from 'lucide-react';
import { submitAnalystFeedback } from '../api/client';
import AskGuideBotButton from './AskGuideBotButton';

export default function AugmentedRealityViewfinderModal({ 
  isOpen, 
  onClose, 
  selectedAoi,
  isDarkMode = true,
  onAskGuideBot
}) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [compassHeading, setCompassHeading] = useState(42);
  const [pitchAngle, setPitchAngle] = useState(12);
  const [activeOverlayLayer, setActiveOverlayLayer] = useState('all'); // 'all', 'ndvi', 'flood', 'change'
  const [isLoggingGroundTruth, setIsLoggingGroundTruth] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const [fieldNotes, setFieldNotes] = useState("Field verified: Soil excavation and construction encroachment confirmed on ground.");

  const videoRef = useRef(null);

  // Initialize camera or fallback
  useEffect(() => {
    if (!isOpen) {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
      setCameraActive(false);
      return;
    }

    // Try starting camera
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      }).then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraActive(true);
          setCameraError(null);
        }
      }).catch(err => {
        console.warn("Camera stream unavailable, switching to Virtual Field Simulator:", err);
        setCameraActive(false);
        setCameraError("Camera unavailable or permission denied — running in Virtual Field Simulator mode.");
      });
    }

    // Device orientation handler
    const handleOrientation = (e) => {
      if (e.alpha !== null) setCompassHeading(Math.round(e.alpha));
      if (e.beta !== null) setPitchAngle(Math.round(e.beta));
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [isOpen]);

  const handleLogGroundTruth = async () => {
    setIsLoggingGroundTruth(true);
    try {
      await submitAnalystFeedback({
        query_id: `AR_GT_${Date.now()}`,
        original_label: "Satellite Remote Sensing Hypothesis",
        corrected_label: "Ground-Truth Field Verified Encroachment",
        bbox: selectedAoi?.bbox || [78.44, 17.385, 78.495, 17.435],
        feedback_type: "AR_GROUND_TRUTH_VERIFICATION",
        analyst_notes: `[AR Surveyor Note]: ${fieldNotes} (GPS: 17.410°N, 78.468°E, Heading: ${compassHeading}°)`,
        analyst_id: "IN_FIELD_SURVEYOR_09"
      });
      setLogSuccess(true);
      setTimeout(() => setLogSuccess(false), 3000);
    } catch (err) {
      console.error("Ground truth submission error:", err);
    } finally {
      setIsLoggingGroundTruth(false);
    }
  };

  if (!isOpen) return null;

  const lat = selectedAoi?.center ? selectedAoi.center[0] : 17.4124;
  const lon = selectedAoi?.center ? selectedAoi.center[1] : 78.4682;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-2xl animate-fade-in">
      <div className="relative w-full max-w-4xl h-[92vh] max-h-[820px] rounded-3xl overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.3)] bg-black flex flex-col justify-between">
        
        {/* Real Camera Feed or Virtual Simulator Canvas */}
        <div className="absolute inset-0 z-0 bg-slate-950 overflow-hidden">
          {cameraActive ? (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
          ) : (
            <div 
              className="w-full h-full bg-cover bg-center filter brightness-90 contrast-110"
              style={{
                backgroundImage: `url('/sample_aois/${selectedAoi?.sensors?.optical?.file || 'hyderabad_urban_optical.png'}')`,
                transform: `scale(1.2) rotate(${(compassHeading - 42) * 0.2}deg)`
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60" />
            </div>
          )}

          {/* Geo-Registered AR Wireframe Grid & Horizon HUD */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Horizon Guideline */}
            <div 
              className="absolute left-0 right-0 h-[1px] bg-cyan-400/40 border-t border-dashed border-cyan-400/60"
              style={{ top: `${50 + pitchAngle * 0.5}%` }}
            />

            {/* Central Crosshair Targeting Reticle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-28 h-28 border border-cyan-400/30 rounded-full flex items-center justify-center animate-pulse">
                <div className="w-16 h-16 border border-cyan-400/60 rounded-full flex items-center justify-center">
                  <Crosshair className="w-6 h-6 text-cyan-400" />
                </div>
                <span className="absolute -top-3 text-[9px] font-mono text-cyan-300 font-bold tracking-wider">
                  GROUND-TRUTH TARGET
                </span>
              </div>
            </div>

            {/* AR Geo-Spatial Projected Wireframes */}
            {(activeOverlayLayer === 'all' || activeOverlayLayer === 'ndvi') && (
              <div className="absolute top-[38%] left-[25%] p-3 rounded-2xl border border-emerald-400/80 bg-emerald-950/40 backdrop-blur-xs text-emerald-300 text-[10px] font-mono shadow-[0_0_15px_rgba(52,211,153,0.4)] animate-pulse">
                <span className="font-bold block">🟢 VEGETATION BUFFER (NDVI 0.68)</span>
                <span>Zoning: Protected Riparian Fringe</span>
              </div>
            )}

            {(activeOverlayLayer === 'all' || activeOverlayLayer === 'flood') && (
              <div className="absolute top-[52%] right-[20%] p-3 rounded-2xl border border-cyan-400/80 bg-cyan-950/40 backdrop-blur-xs text-cyan-300 text-[10px] font-mono shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                <span className="font-bold block">🌊 100-YR FLOOD INUNDATION LINE</span>
                <span>Elevation: +542m MSL Contour</span>
              </div>
            )}

            {(activeOverlayLayer === 'all' || activeOverlayLayer === 'change') && (
              <div className="absolute bottom-[35%] left-[38%] p-3 rounded-2xl border border-rose-400/90 bg-rose-950/50 backdrop-blur-xs text-rose-300 text-[10px] font-mono shadow-[0_0_20px_rgba(244,63,94,0.5)]">
                <span className="font-bold block animate-bounce">⚠️ CHANGEFORMER ANOMALY PIN</span>
                <span>+142% Reflectance Shift Since 2021</span>
              </div>
            )}
          </div>
        </div>

        {/* Top AR Header HUD */}
        <div className="relative z-10 p-3 sm:p-4 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
              <Scan className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight uppercase">
                  AR Ground-Truth Viewfinder
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-400 text-black text-[9px] font-mono font-bold animate-pulse">
                  LIVE AR
                </span>
              </div>
              <p className="text-[10px] font-mono text-cyan-300/80">
                {lat.toFixed(4)}°N, {lon.toFixed(4)}°E • GPS Acc: ±2.1m • Elev: 542m
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AskGuideBotButton 
              label="Ask Guide Bot"
              onClick={() => onAskGuideBot && onAskGuideBot("Explain the In-Field Mobile AR Ground-Truth Viewfinder: how does device compass/accelerometer data project AI geospatial boundaries and ChangeFormer anomalies onto mobile cameras in real time?")} 
            />

            {/* Compass Heading Widget */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full liquid-glass bg-black/60 border border-white/20 text-white font-mono text-xs">
              <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
              <span>{compassHeading.toString().padStart(3, '0')}° NE</span>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full liquid-glass bg-black/60 border border-white/20 flex items-center justify-center text-white hover:scale-105 transition-transform cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Camera fallback notice if running virtual simulator */}
        {cameraError && (
          <div className="relative z-10 self-center px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[11px] font-mono shadow-md backdrop-blur-md">
            🌐 Virtual Field Simulator Mode Active (Device Orientation Synced)
          </div>
        )}

        {/* Bottom AR Control HUD & Ground Truth Logger */}
        <div className="relative z-10 p-3 sm:p-5 flex flex-col gap-3 bg-gradient-to-t from-black/95 via-black/70 to-transparent">
          
          {/* Layer Selector Chips */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
            <div className="flex items-center gap-1.5 text-xs font-mono">
              {[
                { id: 'all', label: 'All AR Layers' },
                { id: 'ndvi', label: 'NDVI Vegetation' },
                { id: 'flood', label: 'Flood Hazard' },
                { id: 'change', label: 'ChangeFormer' }
              ].map(layer => (
                <button
                  key={layer.id}
                  onClick={() => setActiveOverlayLayer(layer.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    activeOverlayLayer === layer.id
                      ? 'bg-cyan-500 text-black font-bold shadow-md'
                      : 'liquid-glass bg-black/60 border border-white/20 text-white/80 hover:text-white'
                  }`}
                >
                  {layer.label}
                </button>
              ))}
            </div>

            {/* Simulator Compass Controls */}
            {!cameraActive && (
              <div className="flex items-center gap-1 text-[11px] font-mono text-cyan-300">
                <span>Heading:</span>
                <button
                  onClick={() => setCompassHeading(h => (h - 15 + 360) % 360)}
                  className="px-2 py-0.5 rounded liquid-glass border border-white/20 hover:bg-white/10"
                >
                  ◀
                </button>
                <button
                  onClick={() => setCompassHeading(h => (h + 15) % 360)}
                  className="px-2 py-0.5 rounded liquid-glass border border-white/20 hover:bg-white/10"
                >
                  ▶
                </button>
              </div>
            )}
          </div>

          {/* In-Field Ground Truth Verification Input Bar */}
          <div className="p-3 rounded-2xl liquid-glass bg-black/80 border border-cyan-500/30 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 flex-grow">
              <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <input
                type="text"
                value={fieldNotes}
                onChange={(e) => setFieldNotes(e.target.value)}
                placeholder="Log field surveyor observation (e.g. Concrete jetty encroachment confirmed)..."
                className="w-full bg-transparent text-xs text-white placeholder-white/40 focus:outline-none"
              />
            </div>

            <button
              onClick={handleLogGroundTruth}
              disabled={isLoggingGroundTruth}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex-shrink-0 cursor-pointer ${
                logSuccess 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-cyan-500 hover:bg-cyan-400 text-black'
              }`}
            >
              {logSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ground-Truth Logged!</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{isLoggingGroundTruth ? 'Logging...' : 'Verify Ground Truth'}</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
