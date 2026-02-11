import React from 'react';
import { ProductionLog } from '../../types';
import { X, Calendar, User, Truck, FileText, Scale, Tag, Image as ImageIcon, MessageSquare, MapPin, Hash, ShieldCheck, Box } from 'lucide-react';
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* --- Header --- */}
        <div className="bg-slate-50 p-5 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl shadow-sm ${log.platform === 'BIG_BAG' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}>
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-800 text-xl tracking-tight">Record Verification</h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                  log.category === 'EXPORT' ? 'bg-indigo-100 text-indigo-700' :
                  log.category === 'LOCAL' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {log.category}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest mt-0.5">Reference ID: {log.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400 hover:text-slate-600 active:scale-90">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* --- Body --- */}
        <div className="p-0 overflow-y-auto custom-scrollbar flex flex-col lg:flex-row">
          
          {/* Left Side: Images & Evidence */}
          <div className="w-full lg:w-[60%] p-6 bg-slate-50/50 border-r border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-500" /> Photographic Evidence
              </h4>
              {log.images && log.images.length > 0 && (
                <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {log.images.length} FILES
                </span>
              )}
            </div>

            {log.images && log.images.length > 0 ? (
              <div className="h-[400px] rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-black">
                <ImageCarousel images={log.images} />
              </div>
            ) : (
              <div className="h-[300px] rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 bg-white/50">
                <ImageIcon size={48} className="opacity-10 mb-2" />
                <p className="text-sm font-bold uppercase tracking-widest opacity-30">No Photo Evidence Attached</p>
              </div>
            )}

            {/* Observation Box - Positioned under images if they exist */}
            {log.comments && (
              <div className="mt-6 bg-amber-50 p-5 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <MessageSquare size={64} className="text-amber-900" />
                </div>
                <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" /> Operational Observation
                </h4>
                <p className="text-sm text-slate-800 leading-relaxed font-medium italic">
                  "{log.comments}"
                </p>
              </div>
            )}
          </div>

          {/* Right Side: Data Grid */}
          <div className="flex-1 p-6 space-y-8">
            
            {/* Operator & Time Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[10px] uppercase text-slate-400 font-black tracking-widest flex items-center gap-1.5 mb-2">
                  <User className="w-3.5 h-3.5 text-indigo-500"/> Operator
                </span>
                {/* @ts-ignore */}
                <div className="font-black text-slate-800 text-base">{log.profiles?.full_name || 'N/A'}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{log.shift} SHIFT</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[10px] uppercase text-slate-400 font-black tracking-widest flex items-center gap-1.5 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500"/> Timestamp
                </span>
                <div className="font-black text-slate-800 text-base">{formattedDate}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{formattedTime}</div>
              </div>
            </div>

            {/* Logistics Section */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Logistics Parameters</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><FileText size={18} /></div>
                  <div>
                    <span className="block text-slate-400 text-[9px] font-black uppercase tracking-widest">Dossier</span>
                    <span className="font-mono font-black text-indigo-700 text-base">{log.file_number || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><MapPin size={18} /></div>
                  <div>
                    <span className="block text-slate-400 text-[9px] font-black uppercase tracking-widest">Destination</span>
                    <span className="font-black text-slate-800 text-sm truncate block max-w-[150px]">{log.destination || 'LOCAL MARKET'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><Hash size={18} /></div>
                  <div>
                    <span className="block text-slate-400 text-[9px] font-black uppercase tracking-widest">Article Code</span>
                    <span className="font-black text-slate-800 text-sm">{log.article_code}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><Truck size={18} /></div>
                  <div>
                    <span className="block text-slate-400 text-[9px] font-black uppercase tracking-widest">Truck Matricul</span>
                    <span className="font-mono font-black text-slate-800 text-sm">{log.truck_matricul || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {log.category === 'EXPORT' && (
                <div className="bg-slate-900 rounded-2xl p-5 text-white grid grid-cols-2 gap-4 mt-4 shadow-xl">
                  <div>
                    <span className="flex items-center gap-1.5 text-indigo-300 text-[9px] font-black uppercase mb-1 tracking-widest">
                      <ShieldCheck size={12} /> BL Number
                    </span>
                    <div className="font-mono font-bold text-sm tracking-tight">{log.bl_number || '-'}</div>
                  </div>
                  <div>
                    <span className="flex items-center gap-1.5 text-indigo-300 text-[9px] font-black uppercase mb-1 tracking-widest">
                      <Box size={12} /> Container (TC)
                    </span>
                    <div className="font-mono font-bold text-sm tracking-tight">{log.tc_number || '-'}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Output Metrics */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Load Metrics</h4>
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl text-white flex justify-between items-center shadow-xl border border-slate-700">
                <div className="space-y-4">
                  <div>
                    <div className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-1">Total Volume</div>
                    <div className="font-black text-4xl text-emerald-400 leading-none">
                      {log.total_tonnage} <span className="text-lg font-bold">T</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 border-t border-slate-700 pt-3 mt-3">
                    <div>
                      <div className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Trucks</div>
                      <div className="text-base font-black">{log.truck_count}</div>
                    </div>
                    <div className="h-6 w-[1px] bg-slate-700"></div>
                    <div>
                      <div className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Weight / Unit</div>
                      <div className="text-base font-black">{log.weight_per_unit} T</div>
                    </div>
                  </div>
                </div>
                <div className="h-24 w-24 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                   <Scale size={40} className="text-emerald-500 opacity-80" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* --- Footer Actions --- */}
        <div className="bg-slate-50 p-5 border-t border-slate-200 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose} 
            className="px-8 py-3 bg-white border border-slate-200 text-slate-700 font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all shadow-sm text-xs active:scale-95"
          >
            Close Details
          </button>
        </div>

      </div>
    </div>
  );
};