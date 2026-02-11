import React from 'react';
import { LucideIcon, ChevronDown } from 'lucide-react';

interface Option {
  id: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  icon?: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  error?: string;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className,
  error
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">
        {label}
      </label>
      <div className="relative group">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            <Icon size={18} className={`transition-colors duration-300 ${error ? 'text-rose-500' : 'text-slate-400 group-focus-within:text-indigo-600'}`} />
          </div>
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`
            w-full appearance-none 
            bg-white
            text-slate-800 font-medium 
            border ${error ? 'border-rose-500' : 'border-slate-200 hover:border-slate-300'} 
            rounded-xl py-3 ${Icon ? 'pl-10' : 'pl-4'} pr-10 
            focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500
            transition-all duration-200 cursor-pointer
            shadow-sm
          `}
        >
          <option value="" disabled className="text-slate-400">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id} className="text-slate-800">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-600 transition-colors">
          <ChevronDown size={16} />
        </div>
      </div>
      {error && <span className="text-xs text-rose-500 font-medium ml-1">{error}</span>}
    </div>
  );
};

export default SelectField;