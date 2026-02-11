import React from 'react';
import { OperationCategory } from '../../types.ts';
import { ArrowsUpFromLine, Truck, Anchor } from 'lucide-react';

interface CategoryTabsProps {
  activeCategory: OperationCategory;
  onCategoryChange: (cat: OperationCategory) => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({ activeCategory, onCategoryChange }) => {
  
  const tabs: { id: OperationCategory; label: string; icon: any }[] = [
    { id: 'EXPORT', label: 'Export', icon: Anchor },
    { id: 'LOCAL', label: 'Local', icon: Truck },
    { id: 'DEBARDAGE', label: 'Débardage', icon: ArrowsUpFromLine },
  ];

  return (
    <div className="flex p-1.5 bg-slate-100 rounded-xl mb-6 border border-slate-200">
      {tabs.map((tab) => {
        const isActive = activeCategory === tab.id;
        const Icon = tab.icon;
        
        return (
          <button
            key={tab.id}
            onClick={() => onCategoryChange(tab.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-black uppercase tracking-wide transition-all duration-200
              ${isActive 
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200 ring-1 ring-slate-200' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }
            `}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};