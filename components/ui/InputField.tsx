import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  error?: string;
}

export const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  icon: Icon, 
  className = '', 
  error,
  ...props 
}) => {
  return (
    <div className="space-y-1.5 w-full">
      <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">
        {label}
      </label>
      
      <div className="relative group">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
            <Icon className={`h-5 w-5 transition-colors duration-300 ${error ? 'text-rose-500' : 'text-slate-400 group-focus-within:text-indigo-600'}`} />
          </div>
        )}
        
        <input
          className={`
            block w-full 
            ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3
            bg-white
            border ${error ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-slate-200 hover:border-slate-300'}
            rounded-xl
            text-slate-800 placeholder-slate-400 font-medium
            focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500
            transition-all duration-200
            shadow-sm
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-rose-500 font-medium ml-1 animate-in slide-in-from-top-1">{error}</span>}
    </div>
  );
};

export default InputField;