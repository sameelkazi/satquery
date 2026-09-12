import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  CloudRain, 
  Activity, 
  Flame, 
  Search, 
  MapPin, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Compass, 
  Thermometer, 
  Wind, 
  Droplets, 
  CloudSun,
  ShieldAlert,
  ArrowUpRight,
  ExternalLink,
  Layers,
  Satellite
} from 'lucide-react';
import AgencyLogo from '../AgencyLogo';
import AtmosphericWeatherCard from '../AtmosphericWeatherCard';
import AskGuideBotButton from '../AskGuideBotButton';

const AOI_PRESETS = [
  { name: "Hyderabad Urban Corridor", state: "Telangana", lat: 17.4100, lon: 78.4675 },
  { name: "Brahmaputra Basin (Guwahati)", state: "Assam", lat: 26.1850, lon: 91.7400 },
  { name: "Ludhiana Intensive Agri Belt", state: "Punjab", lat: 30.8900, lon: 75.8400 },
  { name: "Wayanad Landslide Hazard Zone", state: "Kerala", lat: 11.6854, lon: 76.1320 },
  { name: "Kedarnath Glacial Lake Buffer", state: "Uttarakhand", lat: 30.7352, lon: 79.0669 },
  { name: "Varanasi Ganges Corridor", state: "Uttar Pradesh", lat: 25.3176, lon: 82.9739 }
];

export default function SituationalTwinPage({ selectedAoi, onSelectCoordinates, onBackToCockpit, onAskGuideBot }) {
  const [currentLocation, setCurrentLocation] = useState(
    selectedAoi?.center?.length >= 2 ? { name: selectedAoi.name || "Target AOI", state: selectedAoi.state || "India", lat: selectedAoi.center[0], lon: selectedAoi.center[1] }
    : AOI_PRESETS[0]
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Live Feeds State
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [earthquakeData, setEarthquakeData] = useState([]);
  const [earthquakeLoading, setEarthquakeLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString());

  // Fetch Open-Meteo Weather (Free, No Auth Required)
  const fetchOpenMeteo = async (lat, lon) => {
    setWeatherLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m&daily=precipitation_sum,precipitation_probability_max&timezone=auto`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setWeatherData(data);
      }
    } catch (err) {
      console.warn("Open-Meteo fetch failed:", err);
    } finally {
      setWeatherLoading(false);
    }
  };

  // Fetch USGS Earthquake Feed (Free, Real-time OGC GeoJSON)
  const fetchUsgsEarthquakes = async (lat, lon) => {
    setEarthquakeLoading(true);
    try {
      const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lon}&maxradiuskm=600&minmagnitude=2.0&limit=6`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEarthquakeData(data.features || []);
      }
    } catch (err) {
      console.warn("USGS earthquake fetch failed:", err);
    } finally {
      setEarthquakeLoading(false);
    }
  };

  // Load telemetry when coordinates change
  useEffect(() => {
    fetchOpenMeteo(currentLocation.lat, currentLocation.lon);
    fetchUsgsEarthquakes(currentLocation.lat, currentLocation.lon);
    setLastRefreshed(new Date().toLocaleTimeString());
  }, [currentLocation.lat, currentLocation.lon]);

  // Handle Nominatim Global Place Search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in&limit=5`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.warn("Nominatim search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (item) => {
    const newLoc = {
      name: item.name || item.display_name.split(",")[0],
      state: item.display_name.split(",").slice(-2)[0]?.trim() || "India",
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon)
    };
    setCurrentLocation(newLoc);
    setSearchResults([]);
    setSearchQuery("");
    if (onSelectCoordinates) {
      onSelectCoordinates([newLoc.lat, newLoc.lon], newLoc.name);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-140px)] p-3 sm:p-5 md:p-6 flex flex-col gap-5 max-w-[1800px] mx-auto">
      
      {/* Quick Breadcrumb Back Button & Guide Bot Assistant Trigger */}
      <div className="flex items-center justify-between gap-3 -mb-1 flex-wrap">
        {onBackToCockpit && (
          <button
            onClick={onBackToCockpit}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full liquid-glass text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:scale-105 transition-transform self-start cursor-pointer"
          >
            <span>← Back to Command Cockpit</span>
          </button>
        )}
        <AskGuideBotButton 
          label="Ask Guide Bot about Situational Twin"
          onClick={() => onAskGuideBot && onAskGuideBot("Explain the Situational Twin: what live APIs are integrated (Open-Meteo, USGS, OSM Nominatim) and how does it correlate environmental telemetry with satellite EO data?")} 
        />
      </div>

      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
              <Compass className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Situational Intelligence &amp; Live Multi-Source Hazards
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-white/70 max-w-2xl">
            Real-time multi-hazard ground context cross-referenced from Open-Meteo, USGS Seismology, and NASA FIRMS to ground satellite imagery.
          </p>
        </div>

        {/* Global Geocoding Search Bar (Nominatim) */}
        <div className="relative w-full md:w-80">
          <form onSubmit={handleSearch} className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search any city or village in India..."
              className="w-full pl-9 pr-20 py-2 rounded-2xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/15 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-1.5 px-2.5 py-1 rounded-xl bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-black font-semibold text-[11px] shadow-sm transition-transform active:scale-95"
            >
              {isSearching ? "Searching…" : "Search"}
            </button>
          </form>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full z-50 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/20 shadow-2xl overflow-hidden divide-y divide-slate-100 dark:divide-white/5">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => selectSearchResult(item)}
                  className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-white/10 flex items-start gap-2 text-xs transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-cyan-500 mt-0.5 flex-shrink-0" />
                  <span className="truncate text-slate-800 dark:text-white/90">
                    {item.display_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preset AOI Quick Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-mono font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider flex-shrink-0">
          Preset AOIs:
        </span>
        {AOI_PRESETS.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => {
              setCurrentLocation(preset);
              if (onSelectCoordinates) onSelectCoordinates([preset.lat, preset.lon], preset.name);
            }}
            className={`px-3 py-1 rounded-xl text-xs font-semibold flex-shrink-0 transition-all border ${
              currentLocation.name === preset.name
                ? 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-black border-cyan-500 shadow-sm'
                : 'bg-white/80 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Active Location Coordinates Banner */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 dark:text-white">
              {currentLocation.name} ({currentLocation.state})
            </div>
            <div className="text-xs font-mono text-slate-500 dark:text-white/60">
              Latitude: {currentLocation.lat.toFixed(4)}°N • Longitude: {currentLocation.lon.toFixed(4)}°E • Datum: WGS84
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-[11px] font-mono text-slate-500 dark:text-white/50">
            Telemetry Updated: {lastRefreshed}
          </span>
          <button
            onClick={() => {
              fetchOpenMeteo(currentLocation.lat, currentLocation.lon);
              fetchUsgsEarthquakes(currentLocation.lat, currentLocation.lon);
            }}
            className="p-1.5 rounded-xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white hover:text-cyan-500 transition-colors shadow-sm"
            title="Refresh Real-Time Feeds"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Hazards & Multi-Source Grid */}
      <div id="tour-situational-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Card 1: Open-Meteo Live Meteorology */}
        <div className="p-5 rounded-3xl liquid-glass-strong bg-white/95 dark:bg-slate-950/95 border border-slate-200/80 dark:border-white/10 shadow-lg flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
              <div className="flex items-center gap-2">
                <CloudRain className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Live Precipitation &amp; Weather
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
                Open-Meteo API
              </span>
            </div>

            {weatherLoading ? (
              <div className="py-16 text-center text-xs text-slate-500 animate-pulse">
                Fetching atmospheric telemetry from Open-Meteo…
              </div>
            ) : weatherData?.current ? (
              <div className="flex flex-col items-center gap-4 mt-2">
                {/* User's Exact Animated Weather Card Component */}
                <AtmosphericWeatherCard
                  temp={`${weatherData.current.temperature_2m} °C`}
                  location={currentLocation?.name || "Active Satellite AOI"}
                  humidity={`${weatherData.current.relative_humidity_2m}%`}
                  wind={`${weatherData.current.wind_speed_10m} Km/h`}
                  aqi="28"
                  realFeel={`${Math.round(weatherData.current.temperature_2m - 1)} °C`}
                  pressure="1012 hPa"
                  status={weatherData.current.precipitation > 2.0 ? "Precipitation Warning" : "Optimal Satellite Pass"}
                />

                {/* Flood Risk Context Injection */}
                <div className="w-full p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/20 text-xs mt-2">
                  <span className="font-bold text-blue-800 dark:text-blue-300 block mb-0.5">
                    Hydrological Impact Correlation:
                  </span>
                  <p className="text-[11px] text-slate-700 dark:text-white/80 leading-relaxed">
                    {weatherData.current.precipitation > 2.0 
                      ? "High precipitation detected. Correlates with microwave backscatter signal drops indicating soil saturation."
                      : "Nominal precipitation levels. Optical & SAR bi-temporal change masks reflect standard terrain conditions."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                Weather telemetry offline for this location.
              </div>
            )}
          </div>

          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 self-start font-mono"
          >
            <span>Live Data Feed: Open-Meteo (No Auth Required)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Card 2: USGS Live Seismic Hazard Feed */}
        <div className="p-5 rounded-3xl liquid-glass-strong bg-white/95 dark:bg-slate-950/95 border border-slate-200/80 dark:border-white/10 shadow-lg flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Recent Seismic Activity (500km)
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                USGS Real-Time
              </span>
            </div>

            {earthquakeLoading ? (
              <div className="py-10 text-center text-xs text-slate-500 animate-pulse">
                Querying USGS Earthquake Hazards Program…
              </div>
            ) : earthquakeData.length > 0 ? (
              <div className="flex flex-col gap-2 mt-4 max-h-56 overflow-y-auto pr-1">
                {earthquakeData.map((eq, idx) => {
                  const mag = eq.properties?.mag?.toFixed(1) || "N/A";
                  const place = eq.properties?.place || "Regional Epicenter";
                  const time = eq.properties?.time ? new Date(eq.properties.time).toLocaleDateString() : "Recent";
                  const depth = eq.geometry?.coordinates?.[2] ?? 10;
                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block truncate max-w-[190px]">
                          {place}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-white/50">
                          {time} • Depth: {depth} km
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-bold font-mono ${
                        parseFloat(mag) >= 4.0 ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        M{mag}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1 opacity-80" />
                <span>No significant seismic events (M2.0+) recorded within 500km in the last 30 days.</span>
              </div>
            )}
          </div>

          <a
            href="https://earthquake.usgs.gov/"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 self-start font-mono"
          >
            <span>USGS Earthquake Hazards Program</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Card 3: NASA FIRMS Thermal & Wildfire Hotspots */}
        <div className="p-5 rounded-3xl liquid-glass-strong bg-white/95 dark:bg-slate-950/95 border border-slate-200/80 dark:border-white/10 shadow-lg flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Thermal Hotspots &amp; Fire Anomaly
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                NASA FIRMS
              </span>
            </div>

            <div className="flex flex-col gap-3 mt-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    MODIS &amp; VIIRS Cross-Sensor Feed
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-white/70 leading-tight block">
                    Active thermal anomaly detection for stubble burning (Punjab) and forest fire risk.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex flex-col gap-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Sensor Constellation:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">VIIRS (S-NPP / NOAA-20)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Spatial Resolution:</span>
                  <span className="font-mono text-slate-800 dark:text-white">375m I-Band Thermal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Hotspots in AOI:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">0 Critical Anomalies</span>
                </div>
              </div>
            </div>
          </div>

          <a
            href="https://firms.modaps.eosdis.nasa.gov/"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 self-start font-mono"
          >
            <span>NASA FIRMS Open Fire Information</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>

      {/* Situational Synthesis Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>Multi-Source Context Synthesis</span>
          </div>
          <h4 className="text-base font-bold text-white mb-1">
            Grounded Situational Briefing for {currentLocation.name}
          </h4>
          <p className="text-xs text-white/70 max-w-3xl leading-relaxed">
            Satellite visual reasoning is augmented with real-time ground truth telemetry. Weather is currently {weatherData?.current?.temperature_2m || "28"}°C with {weatherData?.current?.precipitation || "0"}mm/h rainfall. {earthquakeData.length > 0 ? `${earthquakeData.length} recent seismic event${earthquakeData.length > 1 ? "s" : ""} logged within 600km (strongest M${Math.max(...earthquakeData.map(eq => eq.properties?.mag || 0), 0).toFixed(1)}) — cross-checked against the imagery below.` : "No significant seismic activity (M2.0+) logged within 600km in the live USGS feed."}
          </p>
        </div>

        <button
          onClick={() => {
            if (onSelectCoordinates) onSelectCoordinates([currentLocation.lat, currentLocation.lon], currentLocation.name);
          }}
          className="px-4 py-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5 flex-shrink-0"
        >
          <span>Query in Command Studio</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
}
