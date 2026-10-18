import React, { useState } from 'react';
import { Filter, Wind, CloudRain, Snowflake, AlertTriangle, ArrowLeft, MapPin } from 'lucide-react';
import type { Checkpoint } from '../types';

interface CheckpointTimelineProps {
  routeName: string;
  checkpoints: Checkpoint[];
  activeCheckpoint: Checkpoint | null;
  onSelectCheckpoint: (cp: Checkpoint) => void;
  onBackToRoutes: () => void;
}

export const CheckpointTimeline: React.FC<CheckpointTimelineProps> = ({
  routeName,
  checkpoints,
  activeCheckpoint,
  onSelectCheckpoint,
  onBackToRoutes,
}) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');

  // Count checkpoints per risk level
  const counts: Record<string, number> = {
    ALL: checkpoints.length,
    Severe: 0,
    High: 0,
    Moderate: 0,
    Low: 0,
    'No Travel': 0,
  };

  checkpoints.forEach((cp) => {
    const lvl = cp.risk?.overall_level || 'Low';
    if (counts[lvl] !== undefined) {
      counts[lvl]++;
    }
  });

  const filtered = checkpoints.filter((cp) => {
    if (filterLevel === 'ALL') return true;
    return (cp.risk?.overall_level || 'Low') === filterLevel;
  });

  return (
    <div className="space-y-3">
      {/* Top Header: Back to Routes & Route Name */}
      <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800">
        <button
          type="button"
          onClick={onBackToRoutes}
          className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Routes
        </button>
        <span className="font-semibold text-white truncate max-w-[200px]" title={routeName}>
          {routeName}
        </span>
      </div>

      {/* Filter Pills with Counts */}
      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5 overflow-x-auto">
        <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 mr-0.5" />
        {['ALL', 'Severe', 'High', 'Moderate', 'Low', 'No Travel'].map((lvl) => {
          const count = counts[lvl] || 0;
          const isSelected = filterLevel === lvl;

          return (
            <button
              key={lvl}
              type="button"
              onClick={() => setFilterLevel(lvl)}
              className={`px-2 py-0.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                isSelected
                  ? 'bg-emerald-600 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 bg-slate-950/60'
              }`}
            >
              <span>{lvl}</span>
              <span
                className={`text-[10px] px-1 py-0.2 rounded-full ${
                  isSelected ? 'bg-slate-950/30 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Checkpoints Timeline List */}
      <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs bg-slate-900/50 rounded-xl border border-slate-800">
            No checkpoints match the "{filterLevel}" risk filter.
          </div>
        ) : (
          filtered.map((cp) => {
            const risk = cp.risk;
            const weather = cp.weather;
            const riskLevel = risk?.overall_level || 'Low';
            const isActive = activeCheckpoint?.index === cp.index;

            return (
              <div
                key={cp.index}
                onClick={() => onSelectCheckpoint(cp)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all space-y-2 ${
                  isActive
                    ? 'bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/50 shadow-lg'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                }`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-emerald-300 text-[11px] font-mono font-bold flex items-center justify-center">
                      #{cp.index}
                    </span>
                    <span className="font-bold text-white text-xs">
                      Mile {cp.distance_from_start_miles}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      (+{cp.segment_distance_miles} mi)
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      riskLevel === 'No Travel'
                        ? 'bg-red-950 text-red-400 border border-red-700'
                        : riskLevel === 'Severe'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : riskLevel === 'High'
                        ? 'bg-orange-950 text-orange-400 border border-orange-800'
                        : riskLevel === 'Moderate'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    }`}
                  >
                    {riskLevel}
                  </span>
                </div>

                {/* ETA & Coordinates */}
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    ETA: <strong className="text-slate-200">{cp.eta_formatted}</strong>
                  </span>
                  <span className="font-mono text-[10px] flex items-center gap-0.5 text-slate-500">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    {cp.latitude.toFixed(2)}, {cp.longitude.toFixed(2)}
                  </span>
                </div>

                {/* Weather Metrics */}
                {weather && (
                  <div className="grid grid-cols-4 gap-1 bg-slate-950/80 p-1.5 rounded-lg text-center text-[10px]">
                    <div>
                      <div className="text-slate-500">Temp</div>
                      <div className="font-bold text-white font-mono">{weather.temperature_f}°F</div>
                    </div>
                    <div>
                      <div className="text-slate-500 flex items-center justify-center gap-0.5">
                        <Wind className="w-2.5 h-2.5 text-cyan-400" /> Wind
                      </div>
                      <div className="font-bold text-white font-mono">{weather.wind_speed_mph} mph</div>
                    </div>
                    <div>
                      <div className="text-slate-500 flex items-center justify-center gap-0.5">
                        <CloudRain className="w-2.5 h-2.5 text-blue-400" /> Rain
                      </div>
                      <div className="font-bold text-white font-mono">{weather.rain_in_hr} in/h</div>
                    </div>
                    <div>
                      <div className="text-slate-500 flex items-center justify-center gap-0.5">
                        <Snowflake className="w-2.5 h-2.5 text-cyan-200" /> Snow
                      </div>
                      <div className="font-bold text-white font-mono">{weather.snow_in_hr} in/h</div>
                    </div>
                  </div>
                )}

                {/* Load Weight Alert */}
                {risk?.load_notes && risk.load_notes.length > 0 && (
                  <div className="bg-rose-950/50 border border-rose-800/60 rounded-lg p-1.5 text-[11px] text-rose-300 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span>{risk.load_notes.join(' ')}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
