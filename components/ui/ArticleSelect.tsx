import React from 'react';
import { Package, ChevronDown } from 'lucide-react';

interface ArticleSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
}

export const ArticleSelect: React.FC<ArticleSelectProps> = ({ 
  value, 
  onChange, 
  options, 
  disabled 
}) => {
  return (
    <div className="space-y-1.5 w-full">
      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">
        Article Code
      </label>
      
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
          <Package className="h-6 w-6 text-amber-500" />
        </div>

        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="
            block w-full pl-12 pr-10 py-3.5
            bg-white text-slate-900
            border border-slate-200 hover:border-amber-400/50
            rounded-xl
            text-xl font-black tracking-tight
            focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500
            appearance-none cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
            shadow-sm
          "
        >
          <option value="" disabled className="text-slate-400">Select Article...</option>
          {options.map((opt) => (
            <option key={opt} value={opt} className="text-base font-medium text-slate-900 py-2">
              {opt}
            </option>
          ))}
        </select>

        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
          <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>
      </div>
    </div>
  );
};