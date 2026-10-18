import React from 'react';
import {
  ShieldCheck,
  Clock,
  Navigation,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import type { RouteOption } from '../types';

interface RouteCardProps {
  route: RouteOption;
  isSelected: boolean;
  onSelect: () => void;
  onOpenCheckpoints: () => void;
}

export const RouteCard: React.FC<RouteCardProps> = ({
  route,
  isSelected,
  onSelect,
  onOpenCheckpoints,
}) => {
  const { risk_summary: summary } = route;

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl p-3.5 transition-all cursor-pointer border ${
        isSelected
          ? route.is_recommended
            ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/50 shadow-lg'
            : 'bg-slate-900 border-cyan-500 ring-1 ring-cyan-500/50 shadow-lg'
          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Header: Rank & Title */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {route.is_recommended ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500 text-slate-950">
              <ShieldCheck className="w-3.5 h-3.5" />
              #1 RECOMMENDED
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              #{route.rank} ALTERNATIVE
            </span>
          )}
          <span className="font-semibold text-xs text-white truncate">{route.name}</span>
        </div>

        <span className="text-xs font-mono font-bold text-slate-300">
          Risk: {summary.average_risk_score.toFixed(1)}/5
        </span>
      </div>

      {/* Stats: Distance & Duration */}
      <div className="grid grid-cols-2 gap-2 mb-2.5 bg-slate-950/70 p-2 rounded-lg text-xs">
        <div className="flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono font-bold text-white">{route.distance_miles}</span>
          <span className="text-slate-400">miles</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono font-bold text-white">{route.duration_hours}</span>
          <span className="text-slate-400">hrs</span>
        </div>
      </div>

      {/* Hazard Miles Summary */}
      <div className="flex items-center justify-between text-[11px] mb-2 px-1">
        <span className="text-rose-400 font-semibold">{summary.severe_miles}m Severe</span>
        <span className="text-orange-400 font-semibold">{summary.high_miles}m High</span>
        <span className="text-amber-400 font-semibold">{summary.moderate_miles}m Mod</span>
        <span className="text-emerald-400 font-semibold">{summary.low_miles}m Low</span>
      </div>

      {/* Recommendation Rationale */}
      <div
        className={`text-xs p-2 rounded-lg border mb-2 flex items-start gap-1.5 ${
          route.is_recommended
            ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-200'
            : 'bg-slate-950/40 border-slate-800 text-slate-400'
        }`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">{route.recommendation_rationale}</p>
      </div>

      {/* Checkpoints Link */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenCheckpoints();
          }}
          className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-0.5 cursor-pointer"
        >
          View Checkpoint Timeline ({route.checkpoints.length})
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <span className="text-[10px] text-slate-500">
          {isSelected ? 'Selected' : 'Click to Select'}
        </span>
      </div>
    </div>
  );
};
