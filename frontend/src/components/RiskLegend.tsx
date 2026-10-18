import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ShieldAlert, Scale, Wind, CloudRain, Snowflake } from 'lucide-react';

export const RiskLegend: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-xl text-xs space-y-2">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 font-bold text-white">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          <span>Weather Risk & Load Weight Rules</span>
        </div>
        <button type="button" className="text-slate-400 hover:text-white transition-colors">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Primary Color Legend Bar */}
      <div className="grid grid-cols-5 gap-1 pt-1">
        <div className="text-center p-1 rounded-lg bg-emerald-950/60 border border-emerald-800/60">
          <div className="font-bold text-emerald-400 text-[11px]">Low</div>
          <div className="text-[9px] text-slate-400">&lt;25 mph</div>
        </div>
        <div className="text-center p-1 rounded-lg bg-amber-950/60 border border-amber-800/60">
          <div className="font-bold text-amber-400 text-[11px]">Moderate</div>
          <div className="text-[9px] text-slate-400">25–34 mph</div>
        </div>
        <div className="text-center p-1 rounded-lg bg-orange-950/60 border border-orange-800/60">
          <div className="font-bold text-orange-400 text-[11px]">High</div>
          <div className="text-[9px] text-slate-400">35–44 mph</div>
        </div>
        <div className="text-center p-1 rounded-lg bg-rose-950/60 border border-rose-800/60">
          <div className="font-bold text-rose-400 text-[11px]">Severe</div>
          <div className="text-[9px] text-slate-400">45–54 mph</div>
        </div>
        <div className="text-center p-1 rounded-lg bg-red-950/90 border border-red-700/80">
          <div className="font-bold text-red-400 text-[11px]">No Travel</div>
          <div className="text-[9px] text-slate-300">≥55 mph</div>
        </div>
      </div>

      {/* Expanded Table & Load Rules */}
      {isExpanded && (
        <div className="pt-2 border-t border-slate-800 space-y-3">
          {/* Weather Thresholds Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 font-semibold">
                  <th className="py-1 px-1.5">Condition</th>
                  <th className="py-1 px-1.5 text-emerald-400">Low</th>
                  <th className="py-1 px-1.5 text-amber-400">Moderate</th>
                  <th className="py-1 px-1.5 text-orange-400">High</th>
                  <th className="py-1 px-1.5 text-rose-400">Severe</th>
                  <th className="py-1 px-1.5 text-red-500">No Travel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300 font-mono">
                <tr>
                  <td className="py-1 px-1.5 font-sans font-medium flex items-center gap-1 text-slate-200">
                    <Wind className="w-3 h-3 text-cyan-400" /> Wind
                  </td>
                  <td className="py-1 px-1.5">&lt;25 mph</td>
                  <td className="py-1 px-1.5">25–34</td>
                  <td className="py-1 px-1.5">35–44</td>
                  <td className="py-1 px-1.5">45–54</td>
                  <td className="py-1 px-1.5 text-rose-400 font-bold">≥55 mph</td>
                </tr>
                <tr>
                  <td className="py-1 px-1.5 font-sans font-medium flex items-center gap-1 text-slate-200">
                    <CloudRain className="w-3 h-3 text-blue-400" /> Rain
                  </td>
                  <td className="py-1 px-1.5">&lt;0.10 in/hr</td>
                  <td className="py-1 px-1.5">0.10–0.25</td>
                  <td className="py-1 px-1.5">0.25–0.50</td>
                  <td className="py-1 px-1.5">0.50–1.00</td>
                  <td className="py-1 px-1.5 text-rose-400 font-bold">&gt;1.00</td>
                </tr>
                <tr>
                  <td className="py-1 px-1.5 font-sans font-medium flex items-center gap-1 text-slate-200">
                    <Snowflake className="w-3 h-3 text-cyan-200" /> Snow
                  </td>
                  <td className="py-1 px-1.5">&lt;0.5 in/hr</td>
                  <td className="py-1 px-1.5">0.5–1.0</td>
                  <td className="py-1 px-1.5">1.0–2.0</td>
                  <td className="py-1 px-1.5">2.0–3.0</td>
                  <td className="py-1 px-1.5 text-rose-400 font-bold">&gt;3.0</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Load Weight Override Rules */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="font-bold text-amber-400 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" /> Truck Load Weight Rules:
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
              <li>
                <strong className="text-white">≥55 mph wind:</strong> <span className="text-rose-400 font-bold">No Travel</span> for any load.
              </li>
              <li>
                <strong className="text-white">45–54 mph wind + &gt;30,000 lb:</strong> Escalates from Severe to <span className="text-rose-400 font-bold">No Travel</span>.
              </li>
              <li>
                <strong className="text-white">35–44 mph wind + &gt;40,000 lb:</strong> Escalates from High to <span className="text-rose-400 font-bold">Severe</span>.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
