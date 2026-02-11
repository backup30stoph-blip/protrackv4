import React from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { SHIFTS } from '../../constants.ts';
import { ShiftType } from '../../types.ts';

interface ShiftSelectorProps {
  value: ShiftType;
  onChange: (value: ShiftType) => void;
}

export const ShiftSelector: React.FC<ShiftSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-1.5 w-full">
      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">
        Current Shift
      </label>
      
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
          <Clock className="h-5 w-5 text-indigo-500" />
        </div>

        <select
          value={value}
          onChange={(e) => onChange(e.target.value as ShiftType)}
          className="
            block w-full pl-10 pr-10 py-3.5
            bg-white text-slate-900
            border border-slate-200 hover:border-indigo-400/50
            rounded-xl
            text-sm font-bold uppercase tracking-wide
            focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500
            appearance-none cursor-pointer
            transition-all duration-200
            shadow-sm
          "
        >
          {SHIFTS.map((shift) => (
            <option key={shift.id} value={shift.id} className="text-slate-900 py-2">
              {shift.label}
            </option>
          ))}
        </select>

        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>
      </div>
    </div>
  );
};