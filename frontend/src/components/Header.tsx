import React from 'react';
import { Truck } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <Truck className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white tracking-tight">Spotter</h1>
            <p className="text-[11px] text-slate-400">Weather-Aware Truck Routing</p>
          </div>
        </div>
      </div>
    </header>
  );
};
