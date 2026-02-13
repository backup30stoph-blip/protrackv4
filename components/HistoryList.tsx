import React, { useState } from 'react';
import { 
  Trash2, 
  AlertTriangle, 
  FileText, 
  Package, 
  ShieldCheck, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Clock,
  Layers,
  Search,
  Briefcase,
  MapPin,
  Database,
  ShoppingBag,
  Pencil,
  Box
} from 'lucide-react';
import { ProductionLog } from '../types.ts';
import { formatNumber } from '../utils/calculations.ts';
import { SHIFTS } from '../constants.ts';

interface HistoryListProps {
  orders: ProductionLog[];
  isLoading?: boolean;
  onDelete: (id: string) => void;
  onEdit: (order: ProductionLog) => void;
}

type SortKey = keyof ProductionLog | 'metrics';
type SortDirection = 'asc' | 'desc';

const HistoryList: React.FC<HistoryListProps> = ({ orders, isLoading = false, onDelete, onEdit }) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'created_at',
    direction: 'desc',
  });

  const handleSort = (key: SortKey) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  // Filter Logic
  const filteredOrders = orders.filter((order) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      order.article_code?.toLowerCase().includes(term) ||
      order.bl_number?.toLowerCase().includes(term) ||
      order.tc_number?.toLowerCase().includes(term) ||
      order.file_number?.toLowerCase().includes(term) || 
      order.booking_ref?.toLowerCase().includes(term) || 
      order.customer?.toLowerCase().includes(term) ||
      order.maritime_agent?.toLowerCase().includes(term) ||
      order.sap_code?.toLowerCase().includes(term) ||
      order.destination?.toLowerCase().includes(term) ||
      order.category.toLowerCase().includes(term)
    );
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const { key, direction } = sortConfig;
    let comparison = 0;

    if (key === 'metrics') {
      comparison = a.total_tonnage - b.total_tonnage;
    } else if (key === 'created_at') {
      comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else {
      const valA = a[key as keyof ProductionLog];
      const valB = b[key as keyof ProductionLog];
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.localeCompare(valB);
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      }
    }

    return direction === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="text-blue-700 opacity-50 ml-1 inline" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="text-cosumar-gold ml-1 inline" /> 
      : <ArrowDown size={14} className="text-cosumar-gold ml-1 inline" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-blue-900/20 rounded-xl animate-pulse border border-blue-900/50" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 bg-blue-950/30 rounded-xl border border-dashed border-blue-900">
        <p className="text-blue-400 font-medium">No records found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      
      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-blue-500" />
        </div>
        <input
          type="text"
          placeholder="Search by Dossier, SAP, Client, Agent, or BL..."
          className="w-full bg-[#0f172a] border border-blue-900/50 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-blue-700 focus:outline-none focus:border-cosumar-gold transition-colors"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredOrders.length === 0 && searchTerm && (
         <div className="text-center py-8 text-blue-400 text-sm">
           No matching records found for "{searchTerm}"
         </div>
      )}

      {/* --- DESKTOP VIEW (Grid) --- */}
      <div className="hidden md:block bg-blue-950/40 rounded-xl border border-blue-900/50 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-6 gap-4 p-4 bg-blue-950 border-b border-blue-900 text-[10px] font-bold uppercase tracking-wider text-blue-300 select-none">
          <button onClick={() => handleSort('created_at')} className="flex items-center hover:text-white text-left transition-colors">
            <Clock size={12} className="mr-2" /> Time <SortIcon columnKey="created_at" />
          </button>
          
          <button onClick={() => handleSort('category')} className="flex items-center hover:text-white text-left transition-colors">
            <Layers size={12} className="mr-2" /> Operation <SortIcon columnKey="category" />
          </button>
          
          <button onClick={() => handleSort('article_code')} className="flex items-center hover:text-white text-left transition-colors">
            <Package size={12} className="mr-2" /> Article <SortIcon columnKey="article_code" />
          </button>

          <div className="flex items-center gap-2 cursor-default">
            <ShieldCheck size={12} /> Logistics
          </div>

          <button onClick={() => handleSort('metrics')} className="flex items-center hover:text-white justify-end text-right transition-colors">
            Output <SortIcon columnKey="metrics" />
          </button>

          <div className="text-center">Actions</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-blue-900/30">
          {sortedOrders.map((order) => {
            const shiftLabel = SHIFTS.find(s => s.id === order.shift.toLowerCase())?.shortLabel || order.shift;
            // Handle fallback to platform_type if platform is missing (legacy data)
            const pType = order.platform || (order as any).platform_type;
            const isBigBag = pType === 'BIG_BAG' || pType === 'Big Bag'; 
            
            return (
              <div key={order.id} className="grid grid-cols-6 gap-4 p-4 items-center hover:bg-blue-900/20 transition-colors group">
                
                {/* 1. Time */}
                <div className="text-sm font-mono text-blue-200">
                  {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  <div className="text-[10px] text-blue-500 font-bold">
                    {new Date(order.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* 2. Operation & Shift */}
                <div>
                   <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide border mb-1 ${
                      order.category === 'EXPORT' ? 'bg-blue-900/50 text-blue-300 border-blue-700/50' :
                      order.category === 'LOCAL' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30' :
                      'bg-amber-900/30 text-amber-400 border-amber-500/30'
                    }`}>
                      {order.category}
                    </span>
                    <div className="text-xs text-blue-400 capitalize font-medium">{shiftLabel}</div>
                </div>

                {/* 3. Article */}
                <div className="text-sm font-bold text-white">
                  {order.article_code}
                  <div className="flex flex-wrap gap-2 mt-1">
                    {isBigBag ? (
                       <span className="text-[9px] bg-indigo-900/50 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30 uppercase tracking-wider flex items-center gap-1">
                          <Box size={10} /> BIG BAG
                       </span>
                    ) : (
                       <span className="text-[9px] bg-emerald-900/50 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1">
                          <ShoppingBag size={10} /> 50 KG
                       </span>
                    )}
                  </div>
                  {order.file_number && (
                     <div className="text-[10px] text-cosumar-gold mt-1 flex items-center gap-1 font-mono">
                       <Briefcase size={10} /> {order.file_number}
                     </div>
                  )}
                  {order.destination && (
                    <div className="text-[10px] text-blue-400 flex items-center gap-1">
                      <MapPin size={10} /> {order.destination}
                    </div>
                  )}
                </div>

                {/* 4. Logistics */}
                <div className="text-xs text-blue-300">
                   {order.category === 'EXPORT' ? (
                      <div className="space-y-0.5">
                         {order.sap_code && (
                           <span className="flex items-center gap-1.5 text-amber-500/80 font-mono"><Database size={10} /> {order.sap_code}</span>
                         )}
                        <span className="flex items-center gap-1.5"><FileText size={10} className="text-blue-500" /> {order.bl_number}</span>
                        <span className="flex items-center gap-1.5"><Package size={10} className="text-blue-500" /> {order.tc_number}</span>
                      </div>
                    ) : (
                      <span className="text-blue-600 italic">N/A</span>
                    )}
                </div>

                {/* 5. Metrics */}
                <div className="text-right">
                  <div className="text-sm font-black text-white font-mono">{formatNumber(order.total_tonnage)} <span className="text-blue-500 text-xs">T</span></div>
                  <div className="text-xs text-blue-400 font-bold">{order.truck_count} Trucks</div>
                </div>

                {/* 6. Action */}
                <div className="flex justify-center gap-2">
                   <button 
                      onClick={() => onEdit(order)}
                      className="text-blue-400 hover:text-cosumar-gold p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Edit Entry"
                    >
                      <Pencil size={16} />
                    </button>
                   <button 
                      onClick={() => setDeleteId(order.id)}
                      className="text-blue-600 hover:text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Delete Entry"
                    >
                      <Trash2 size={16} />
                    </button>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* --- MOBILE VIEW (Cards) --- */}
      <div className="md:hidden space-y-3">
        {sortedOrders.map((order) => {
          const pType = order.platform || (order as any).platform_type;
          const isBigBag = pType === 'BIG_BAG' || pType === 'Big Bag';
          
          return (
          <div key={order.id} className="bg-blue-950/40 p-4 rounded-xl border border-blue-900/50 shadow-sm flex flex-col gap-3">
            
            <div className="flex justify-between items-start">
              <div>
                <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${
                      order.category === 'EXPORT' ? 'bg-blue-900/50 text-blue-300 border-blue-700/50' :
                      order.category === 'LOCAL' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30' :
                      'bg-amber-900/30 text-amber-400 border-amber-500/30'
                }`}>
                  {order.category}
                </span>
                <div className="text-xs text-blue-400 mt-1 flex items-center gap-1 font-mono">
                   <Clock size={12} />
                   {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-white font-mono">{formatNumber(order.total_tonnage)} <span className="text-sm text-blue-500">T</span></div>
                <div className="text-xs text-blue-400">{order.truck_count} Trucks</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs border-t border-blue-900/50 pt-3">
              <div>
                <span className="text-blue-500 block uppercase text-[10px] font-bold">Article</span>
                <span className="text-white font-bold">{order.article_code}</span>
                <span className={`block text-[9px] mt-0.5 font-bold uppercase ${isBigBag ? 'text-indigo-400' : 'text-emerald-400'}`}>
                  {isBigBag ? 'Big Bag' : '50kg (Sac)'}
                </span>
              </div>
               <div>
                <span className="text-blue-500 block uppercase text-[10px] font-bold">Shift</span>
                <span className="text-white capitalize">{order.shift}</span>
              </div>
            </div>

            {order.category === 'EXPORT' && (
              <div className="bg-blue-950/80 rounded p-2 text-xs space-y-1 border border-blue-900/50">
                 {order.file_number && (
                    <div className="flex justify-between text-cosumar-gold font-bold mb-1 border-b border-blue-900/50 pb-1">
                       <span>Dossier:</span>
                       <span>{order.file_number}</span>
                    </div>
                 )}
                 {order.destination && (
                    <div className="flex justify-between mb-1">
                      <span className="text-blue-400">Dest:</span>
                      <span className="text-blue-200">{order.destination}</span>
                    </div>
                 )}
                 {order.sap_code && (
                    <div className="flex justify-between mb-1">
                      <span className="text-blue-400">SAP:</span>
                      <span className="text-blue-200 font-mono">{order.sap_code}</span>
                    </div>
                 )}
                 <div className="flex justify-between">
                   <span className="text-blue-400">BL:</span>
                   <span className="text-blue-200 font-mono">{order.bl_number}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-blue-400">TC:</span>
                   <span className="text-blue-200 font-mono">{order.tc_number}</span>
                 </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <button 
                onClick={() => onEdit(order)}
                className="flex-1 py-2 flex items-center justify-center gap-2 text-cosumar-gold hover:bg-amber-500/10 rounded-lg transition-colors text-xs font-bold uppercase border border-amber-500/20"
              >
                <Pencil size={14} /> Edit
              </button>
              <button 
                onClick={() => setDeleteId(order.id)}
                className="flex-1 py-2 flex items-center justify-center gap-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-xs font-bold uppercase border border-rose-500/20"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        )})}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/90 backdrop-blur-sm p-4">
          <div className="bg-[#020617] border border-blue-900 rounded-xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-cosumar-gold mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold text-white">Confirm Deletion</h3>
            </div>
            <p className="text-blue-200 mb-6 text-sm leading-relaxed">
              Are you sure you want to delete this record? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-blue-300 hover:text-white font-medium text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  onDelete(deleteId);
                  setDeleteId(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold shadow-lg shadow-rose-900/20 text-sm"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryList;