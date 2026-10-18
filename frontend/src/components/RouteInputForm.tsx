import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Calendar,
  Weight,
  Layers,
  ArrowUpDown,
  Search,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import type { LocationPoint, GeocodingResult } from '../types';
import { searchLocations } from '../services/api';

interface RouteInputFormProps {
  origin: LocationPoint | null;
  destination: LocationPoint | null;
  departureTime: string;
  loadWeightLb: number;
  samplingInterval: number;
  isLoading: boolean;
  onOriginChange: (loc: LocationPoint) => void;
  onDestinationChange: (loc: LocationPoint) => void;
  onDepartureTimeChange: (time: string) => void;
  onLoadWeightChange: (weight: number) => void;
  onSamplingIntervalChange: (interval: number) => void;
  onSubmit: () => void;
  onSwap: () => void;
}

export const RouteInputForm: React.FC<RouteInputFormProps> = ({
  origin,
  destination,
  departureTime,
  loadWeightLb,
  samplingInterval,
  isLoading,
  onOriginChange,
  onDestinationChange,
  onDepartureTimeChange,
  onLoadWeightChange,
  onSamplingIntervalChange,
  onSubmit,
  onSwap,
}) => {
  // Autocomplete state for origin
  const [originQuery, setOriginQuery] = useState(origin?.name || '');
  const [originResults, setOriginResults] = useState<GeocodingResult[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [showOriginMenu, setShowOriginMenu] = useState(false);

  // Autocomplete state for destination
  const [destQuery, setDestQuery] = useState(destination?.name || '');
  const [destResults, setDestResults] = useState<GeocodingResult[]>([]);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [showDestMenu, setShowDestMenu] = useState(false);

  const originRef = useRef<HTMLDivElement>(null);
  const destRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (origin) setOriginQuery(origin.name);
  }, [origin]);

  useEffect(() => {
    if (destination) setDestQuery(destination.name);
  }, [destination]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (originRef.current && !originRef.current.contains(e.target as Node)) {
        setShowOriginMenu(false);
      }
      if (destRef.current && !destRef.current.contains(e.target as Node)) {
        setShowDestMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search origin
  useEffect(() => {
    if (!originQuery || originQuery === origin?.name || originQuery.length < 2) {
      setOriginResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingOrigin(true);
      try {
        const results = await searchLocations(originQuery);
        setOriginResults(results);
        setShowOriginMenu(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingOrigin(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [originQuery, origin?.name]);

  // Search destination
  useEffect(() => {
    if (!destQuery || destQuery === destination?.name || destQuery.length < 2) {
      setDestResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingDest(true);
      try {
        const results = await searchLocations(destQuery);
        setDestResults(results);
        setShowDestMenu(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingDest(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [destQuery, destination?.name]);

  const setDepartureNow = () => {
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    onDepartureTimeChange(localIso);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-emerald-400" /> Trip Parameters
        </h2>
      </div>

      {/* Origin & Destination Inputs */}
      <div className="space-y-2">
        {/* Origin */}
        <div ref={originRef} className="relative">
          <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Origin
          </label>
          <div className="relative">
            <input
              type="text"
              value={originQuery}
              onChange={(e) => setOriginQuery(e.target.value)}
              onFocus={() => originResults.length > 0 && setShowOriginMenu(true)}
              placeholder="e.g. Chicago, IL"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 pl-8 transition-all"
            />
            <MapPin className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-2.5" />
            {isSearchingOrigin && (
              <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin absolute right-2.5 top-2.5" />
            )}
          </div>

          {showOriginMenu && originResults.length > 0 && (
            <ul className="absolute left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-700/50">
              {originResults.map((r) => (
                <li
                  key={r.id}
                  onClick={() => {
                    onOriginChange({ lat: r.lat, lng: r.lng, name: r.name });
                    setOriginQuery(r.name);
                    setShowOriginMenu(false);
                  }}
                  className="px-3 py-2 text-xs text-slate-200 hover:bg-slate-700 cursor-pointer flex items-center gap-2"
                >
                  <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-medium text-white">{r.name}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Swap Button */}
        <div className="flex justify-center -my-1 relative z-10">
          <button
            type="button"
            onClick={onSwap}
            title="Swap Origin and Destination"
            className="p-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white cursor-pointer"
          >
            <ArrowUpDown className="w-3 h-3" />
          </button>
        </div>

        {/* Destination */}
        <div ref={destRef} className="relative">
          <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Destination
          </label>
          <div className="relative">
            <input
              type="text"
              value={destQuery}
              onChange={(e) => setDestQuery(e.target.value)}
              onFocus={() => destResults.length > 0 && setShowDestMenu(true)}
              placeholder="e.g. New York, NY"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 pl-8 transition-all"
            />
            <MapPin className="w-3.5 h-3.5 text-rose-400 absolute left-2.5 top-2.5" />
            {isSearchingDest && (
              <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin absolute right-2.5 top-2.5" />
            )}
          </div>

          {showDestMenu && destResults.length > 0 && (
            <ul className="absolute left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-700/50">
              {destResults.map((r) => (
                <li
                  key={r.id}
                  onClick={() => {
                    onDestinationChange({ lat: r.lat, lng: r.lng, name: r.name });
                    setDestQuery(r.name);
                    setShowDestMenu(false);
                  }}
                  className="px-3 py-2 text-xs text-slate-200 hover:bg-slate-700 cursor-pointer flex items-center gap-2"
                >
                  <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                  <div>
                    <div className="font-medium text-white">{r.name}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Departure Date/Time */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Departure Date & Time
          </label>
          <button
            type="button"
            onClick={setDepartureNow}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium px-1.5 py-0.5 rounded bg-slate-800 transition-colors"
          >
            Now
          </button>
        </div>
        <input
          type="datetime-local"
          value={departureTime}
          onChange={(e) => onDepartureTimeChange(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
        />
      </div>

      {/* Gross Load Weight */}
      <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <Weight className="w-3.5 h-3.5 text-amber-400" />
            Gross Load Weight
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="10000"
              max="80000"
              step="1000"
              value={loadWeightLb}
              onChange={(e) => onLoadWeightChange(Number(e.target.value))}
              className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-right text-xs font-bold text-amber-400 focus:outline-none"
            />
            <span className="text-xs text-slate-400">lbs</span>
          </div>
        </div>

        <input
          type="range"
          min="10000"
          max="80000"
          step="1000"
          value={loadWeightLb}
          onChange={(e) => onLoadWeightChange(Number(e.target.value))}
          className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded appearance-none cursor-pointer"
        />

        <div className="flex justify-between text-[10px] text-slate-500">
          <span>10k lb</span>
          <span className={loadWeightLb > 30000 ? 'text-amber-400 font-semibold' : ''}>30k lb</span>
          <span className={loadWeightLb > 40000 ? 'text-rose-400 font-semibold' : ''}>40k lb</span>
          <span>80k lb</span>
        </div>

        {/* Load rule alert */}
        {loadWeightLb > 40000 && (
          <div className="text-[11px] text-rose-300 bg-rose-950/50 border border-rose-900/60 px-2 py-1 rounded flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
            <span>&gt;40k lb: 35–44 mph wind elevates to <strong>Severe</strong>.</span>
          </div>
        )}
        {loadWeightLb > 30000 && loadWeightLb <= 40000 && (
          <div className="text-[11px] text-amber-300 bg-amber-950/50 border border-amber-900/60 px-2 py-1 rounded flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
            <span>&gt;30k lb: 45–54 mph wind elevates to <strong>No Travel</strong>.</span>
          </div>
        )}
      </div>

      {/* Sampling Interval */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Checkpoint Sampling Interval
          </span>
          <span className="text-[11px] text-emerald-400 font-mono">{samplingInterval} miles</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[10, 25, 50].map((interval) => (
            <button
              key={interval}
              type="button"
              onClick={() => onSamplingIntervalChange(interval)}
              className={`py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                samplingInterval === interval
                  ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {interval} miles
            </button>
          ))}
        </div>
      </div>

      {/* Calculate Button */}
      <button
        type="button"
        disabled={isLoading || !origin || !destination}
        onClick={onSubmit}
        className="w-full py-2.5 px-4 rounded-lg font-bold text-sm text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Calculating Safe Routes...
          </>
        ) : (
          'Calculate 3 Safe Routes'
        )}
      </button>
    </div>
  );
};
