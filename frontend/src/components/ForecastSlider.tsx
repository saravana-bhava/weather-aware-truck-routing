import React, { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Clock, Eye, EyeOff } from 'lucide-react';

interface ForecastSliderProps {
  currentHour: number;
  maxHours: number;
  displayTime: string;
  isVisible: boolean;
  onChangeHour: (updater: number | ((prev: number) => number)) => void;
  onToggleVisibility: () => void;
}

export const ForecastSlider: React.FC<ForecastSliderProps> = ({
  currentHour,
  maxHours = 48,
  displayTime,
  isVisible,
  onChangeHour,
  onToggleVisibility,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play loop
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) {
      interval = setInterval(() => {
        onChangeHour((prev: number) => (prev >= maxHours ? 0 : prev + 1));
      }, 700);
    }
    return () => clearInterval(interval);
  }, [isPlaying, maxHours, onChangeHour]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xl space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white">Weather Forecast Timeline</span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-semibold">
            +{currentHour} hrs ({displayTime || 'Departure'})
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleVisibility}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded bg-slate-800 cursor-pointer transition-colors"
        >
          {isVisible ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>{isVisible ? 'Hide Heatmap' : 'Show Heatmap'}</span>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold cursor-pointer transition-colors shrink-0"
          title={isPlaying ? 'Pause' : 'Play 48h Timeline'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsPlaying(false);
            onChangeHour(0);
          }}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition-colors shrink-0"
          title="Reset to 0h"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="flex-1 relative">
          <input
            type="range"
            min="0"
            max={maxHours}
            step="1"
            value={currentHour}
            onChange={(e) => {
              setIsPlaying(false);
              onChangeHour(Number(e.target.value));
            }}
            className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="flex gap-1 text-[11px] text-slate-400 font-mono">
          {[0, 12, 24, 36, 48].map((hr) => (
            <button
              key={hr}
              type="button"
              onClick={() => {
                setIsPlaying(false);
                onChangeHour(hr);
              }}
              className={`px-1.5 py-0.5 rounded hover:bg-slate-800 cursor-pointer transition-colors ${
                currentHour === hr ? 'text-emerald-400 font-bold bg-slate-800' : ''
              }`}
            >
              {hr}h
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
