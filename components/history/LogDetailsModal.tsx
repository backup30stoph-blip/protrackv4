import React from 'react';
import { ProductionLog } from '../../types';
import { X, Calendar, User, Truck, FileText, Scale, Tag, Image as ImageIcon, MessageSquare } from 'lucide-react';
import { ImageCarousel } from '../ui/ImageCarousel.tsx';

interface LogDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: ProductionLog | null;
}

export const LogDetailsModal: React.FC<LogDetailsModalProps> = ({ isOpen, onClose, log }) => {
  if (!isOpen || !log) return null;

  const dateObj = new Date(log.created_at);
  const formattedDate = dateObj.toLocaleDateString();
  const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* --- Header --- */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${log.platform === 'BIG_BAG' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Record Verification</h3>
              <p className="text-xs text-slate-500 font-mono">ID: {log.id.split('-')[0]}...</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* --- Body --- */}
        <div className="p-0 overflow-y-auto custom-scrollbar flex flex-col md:flex-row">
          
          {/* Left: Gallery (if images exist) */}
          {log.images && log.images.length > 0 && (
            <div className="w-full md:w-1/2 p-6 border-r border-slate-100 bg-slate-50/30">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-500" /> Photo Evidence
              </h4>
              <ImageCarousel images={log.images} />
            </div>
          )}

          {/* Right: Data Details */}
          <div className={`p-6 space-y-6 ${log.images && log.images.length > 0 ? 'md:w-1/2' : 'w-full'}`}>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase text-slate-400 font-bold flex items-center gap-1 mb-1"><User className="w-3 h-3"/> Operator</span>
                {/* @ts-ignore */}
                <div className="font-bold text-slate-700 truncate">{log.profiles?.full_name || 'Unknown'}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase text-slate-400 font-bold flex items-center gap-1 mb-1"><Calendar className="w-3 h-3"/> Date</span>
                <div className="font-bold text-slate-700">{formattedDate}</div>
              </div>
            </div>

            {/* Observations / Comments */}
            {log.comments && (
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                <h4 className="text-[10px] font-bold text-amber-600 uppercase mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" /> Observation
                </h4>
                <p className="text-sm text-slate-700 italic leading-relaxed">"{log.comments}"</p>
              </div>
            )}

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-100 pb-2">Logistics</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-slate-400 text-[10px] font-bold uppercase">Dossier</span>
                  <span className="font-mono font-bold text-indigo-700">{log.file_number || '-'}</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[10px] font-bold uppercase">Destination</span>
                  <span className="font-bold text-slate-700 truncate block">{log.destination || '-'}</span>
                </div>
                {log.truck_matricul && (
                  <div className="col-span-2 bg-orange-50 p-2 rounded border border-orange-100">
                    <span className="block text-orange-400 text-[10px] font-bold uppercase tracking-widest">Plate N°</span>
                    <span className="font-mono font-bold text-orange-700">{log.truck_matricul}</span>
                  </div>
                )}
                <div className="col-span-2 grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                  <div>
                    <span className="text-slate-400 text-[9px] uppercase font-bold">BL</span>
                    <div className="text-xs font-mono">{log.bl_number || '-'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[9px] uppercase font-bold">Container</span>
                    <div className="text-xs font-mono">{log.tc_number || '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-100 pb-2">Output</h4>
              <div className="bg-slate-900 p-4 rounded-xl text-white flex justify-between items-center">
                <div>
                  <div className="text-slate-500 text-[9px] uppercase font-bold">Trucks / Units</div>
                  <div className="font-bold">{log.truck_count} trk <span className="text-slate-600 px-1">×</span> {log.units_per_truck} u</div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 text-[9px] uppercase font-bold">Total Volume</div>
                  <div className="font-black text-2xl text-emerald-400">{log.total_tonnage} <span className="text-xs">T</span></div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-200 text-right shrink-0">
          <button onClick={onClose} className="px-6 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-100 transition-colors shadow-sm text-sm">
            Close
          </button>
        </div>

      </div>
    </div>
  );
};