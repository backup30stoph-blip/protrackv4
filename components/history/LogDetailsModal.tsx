import React from 'react';
import { ProductionLog } from '../../types';
import { X, Calendar, User, Truck, FileText, Scale, Tag } from 'lucide-react';

interface LogDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: ProductionLog | null;
}

export const LogDetailsModal: React.FC<LogDetailsModalProps> = ({ isOpen, onClose, log }) => {
  if (!isOpen || !log) return null;

  // Format Date and Time
  const dateObj = new Date(log.created_at);
  const formattedDate = dateObj.toLocaleDateString();
  const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* --- Header --- */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${log.platform === 'BIG_BAG' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Record Details</h3>
              <p className="text-xs text-slate-500 font-mono">ID: {log.id.split('-')[0]}...</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* --- Body (Scrollable) --- */}
        <div className="p-6 overflow-y-auto custom-scrollbar grow">
          
          {/* Section 1: Operator & Time */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase text-slate-400 font-bold flex items-center gap-1 mb-1"><User className="w-3 h-3"/> Operator</span>
              {/* @ts-ignore */}
              <div className="font-bold text-slate-700">{log.profiles?.full_name || 'Unknown'}</div>
              <div className="text-xs text-slate-500">{log.platform} Operator</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase text-slate-400 font-bold flex items-center gap-1 mb-1"><Calendar className="w-3 h-3"/> Date & Time</span>
              <div className="font-bold text-slate-700">{formattedDate}</div>
              <div className="text-xs text-slate-500">{formattedTime}</div>
            </div>
          </div>

          <div className="border-t border-slate-100 my-4"></div>

          {/* Section 2: Logistics Info */}
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4" /> Logistics Info
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
            
            <div>
              <span className="block text-slate-400 text-xs font-bold uppercase">N° Dossier</span>
              <span className="font-mono font-bold text-slate-700 bg-indigo-50 px-2 py-0.5 rounded inline-block mt-1">{log.file_number || '-'}</span>
            </div>
            
            <div>
              <span className="block text-slate-400 text-xs font-bold uppercase">Destination</span>
              <span className="font-bold text-slate-700 mt-1 block">{log.destination || '-'}</span>
            </div>

            <div>
              <span className="block text-slate-400 text-xs font-bold uppercase">SAP Code</span>
              <span className="font-mono text-slate-600 mt-1 block">{log.sap_code || '-'}</span>
            </div>

             <div>
              <span className="block text-slate-400 text-xs font-bold uppercase">Category / Shift</span>
              <span className="font-bold text-slate-700 mt-1 block">{log.category} / <span className="text-indigo-500">{log.shift}</span></span>
            </div>

            {log.truck_matricul && (
              <div className="col-span-1 md:col-span-2 bg-orange-50 p-2 rounded border border-orange-100">
                <span className="block text-orange-400 text-xs font-bold uppercase">Truck Matricule</span>
                <span className="font-mono font-bold text-orange-700">{log.truck_matricul}</span>
              </div>
            )}

            <div>
              <span className="block text-slate-400 text-xs font-bold uppercase">N° BL</span>
              <span className="font-mono text-slate-600 mt-1 block">{log.bl_number || '-'}</span>
            </div>
            <div>
              <span className="block text-slate-400 text-xs font-bold uppercase">N° TC (Container)</span>
              <span className="font-mono text-slate-600 mt-1 block">{log.tc_number || '-'}</span>
            </div>
             <div>
              <span className="block text-slate-400 text-xs font-bold uppercase">N° Plombe (Seal)</span>
              <span className="font-mono text-slate-600 mt-1 block">{log.seal_number || '-'}</span>
            </div>
            <div>
              <span className="block text-slate-400 text-xs font-bold uppercase">Article Code</span>
              <span className="font-mono text-slate-600 mt-1 block">{log.article_code}</span>
            </div>
          </div>

          <div className="border-t border-slate-100 my-4"></div>

          {/* Section 3: Weight & Calculations */}
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
            <Scale className="w-4 h-4" /> Weight & Calculations
          </h4>
          
          <div className="bg-slate-800 p-4 rounded-xl text-white grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-bold">Trucks</div>
              <div className="font-black text-xl">{log.truck_count}</div>
            </div>
             <div>
              <div className="text-slate-400 text-[10px] uppercase font-bold">Units/Truck</div>
              <div className="font-bold text-lg">{log.units_per_truck} <span className="text-xs font-normal opacity-50">unit</span></div>
            </div>
            <div>
              <div className="text-emerald-400 text-[10px] uppercase font-bold">Total Tonnage</div>
              <div className="font-black text-xl text-emerald-400">{log.total_tonnage} <span className="text-sm">T</span></div>
            </div>
          </div>
          <div className="mt-2 text-center text-xs text-slate-400 font-mono">
            Calculation: {log.truck_count} Trucks × {log.units_per_truck} Units × {log.weight_per_unit} T
          </div>

        </div>

        {/* --- Footer --- */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 text-right shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-100 transition-colors shadow-sm text-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};