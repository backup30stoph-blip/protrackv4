import React from 'react';
import { Box, Package, ArrowRight, Activity } from 'lucide-react';
import { PlatformType } from '../../types.ts';

interface PlatformSelectorProps {
  onSelect: (platform: PlatformType) => void;
}

export const PlatformSelector: React.FC<PlatformSelectorProps> = ({ onSelect }) => {
  return (
    <div className="max-w-5xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-4 animate-pulse">
          <Activity size={14} /> System Ready
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight mb-4">
          Select Operation Platform
        </h2>
        <p className="text-slate-500 text-lg max-w-xl mx-auto font-medium">
          Initialize your workstation by selecting the appropriate production line below.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* OPTION 1: BIG BAG */}
        <button
          onClick={() => onSelect('BIG_BAG')}
          className="group relative overflow-hidden bg-white border border-slate-200 hover:border-indigo-500 rounded-[2rem] p-8 text-left transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1"
        >
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity group-hover:opacity-100 opacity-50"></div>
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex justify-between items-start mb-8">
              <div className="p-5 bg-slate-50 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 text-indigo-600 border border-slate-100 group-hover:border-indigo-500 shadow-sm">
                <Box className="w-10 h-10" />
              </div>
              <div className="bg-slate-50 p-2 rounded-full group-hover:bg-indigo-600 group-hover:rotate-45 transition-all duration-300 border border-slate-100">
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white" />
              </div>
            </div>
            
            <div className="mt-auto">
              <h3 className="text-3xl font-black text-slate-800 mb-2 tracking-tight group-hover:text-indigo-600 transition-colors">
                BIG BAG
              </h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed border-t border-slate-100 pt-4 mt-2">
                Standard industrial units (1T - 1.2T).
                <br />
                Configured for Export & Local logistics.
              </p>
            </div>
          </div>
        </button>

        {/* OPTION 2: 50KG */}
        <button
          onClick={() => onSelect('50KG')}
          className="group relative overflow-hidden bg-white border border-slate-200 hover:border-emerald-500 rounded-[2rem] p-8 text-left transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1"
        >
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity group-hover:opacity-100 opacity-50"></div>

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex justify-between items-start mb-8">
              <div className="p-5 bg-slate-50 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 text-emerald-600 border border-slate-100 group-hover:border-emerald-500 shadow-sm">
                <Package className="w-10 h-10" />
              </div>
              <div className="bg-slate-50 p-2 rounded-full group-hover:bg-emerald-500 group-hover:rotate-45 transition-all duration-300 border border-slate-100">
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white" />
              </div>
            </div>
            
            <div className="mt-auto">
              <h3 className="text-3xl font-black text-slate-800 mb-2 tracking-tight group-hover:text-emerald-600 transition-colors">
                50 KG
              </h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed border-t border-slate-100 pt-4 mt-2">
                High-volume palletized bags.
                <br />
                Automated 24-26 Pallet configuration.
              </p>
            </div>
          </div>
        </button>

      </div>
    </div>
  );
};