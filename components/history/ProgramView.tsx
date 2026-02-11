import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase.ts';
import { ShippingProgram } from '../../types.ts';
import { FileText, Ship, Calendar, AlertCircle, Search, Flame, TrendingUp } from 'lucide-react';

export const ProgramView: React.FC = () => {
  const [programs, setPrograms] = useState<ShippingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Logic
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const { data, error } = await supabase
          .from('shipping_program')
          .select('*')
          // We fetch all, but we will sort client-side to handle complex "Low Stock" logic
          .order('external_id', { ascending: true }); 

        if (error) throw error;
        setPrograms(data as ShippingProgram[] || []);
      } catch (error) {
        console.error('Error loading programs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, []);

  // Filter & Sort Logic
  const sortedPrograms = useMemo(() => {
    let filtered = programs.filter(prog => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        prog.file_number?.toLowerCase().includes(term) ||
        prog.sap_order_code?.toLowerCase().includes(term) ||
        prog.destination?.toLowerCase().includes(term) ||
        prog.shipping_line?.toLowerCase().includes(term)
      );
    });

    // PRIORITY SORT: Low stock (<10) goes to top
    return filtered.sort((a, b) => {
      const stockA = a.planned_count || 0;
      const stockB = b.planned_count || 0;
      
      const isLowA = stockA > 0 && stockA < 10;
      const isLowB = stockB > 0 && stockB < 10;

      if (isLowA && !isLowB) return -1;
      if (!isLowA && isLowB) return 1;
      
      // Secondary sort: File number
      return a.file_number.localeCompare(b.file_number);
    });

  }, [programs, searchTerm]);

  if (loading) return <div className="text-slate-500 text-center py-10 flex items-center justify-center gap-2"><div className="animate-spin h-4 w-4 border-2 border-indigo-600 rounded-full border-t-transparent"></div> Loading Shipping Schedule...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Ship className="w-6 h-6 text-indigo-600" />
          Shipping Program
        </h2>
        
        {/* Search Bar */}
        <div className="relative w-full md:w-64">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
             <Search className="h-4 w-4 text-slate-400" />
           </div>
           <input
             type="text"
             placeholder="Search Dossier or SAP Code..."
             className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

      {sortedPrograms.length === 0 && (
         <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">No matching shipping programs found.</p>
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {sortedPrograms.map((prog) => {
          const isLowStock = (prog.planned_count || 0) > 0 && (prog.planned_count || 0) < 10;
          
          return (
            <div 
              key={prog.id} 
              className={`
                relative bg-white border rounded-xl p-4 transition-all flex flex-col justify-between shadow-sm hover:shadow-md group
                ${isLowStock ? 'border-orange-300 ring-1 ring-orange-100' : 'border-slate-200 hover:border-indigo-300'}
              `}
            >
              {/* LOW STOCK BADGE */}
              {isLowStock && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 animate-in zoom-in">
                  <Flame size={10} className="animate-pulse" /> PRIORITY
                </div>
              )}

              {/* Header: File Number & Destination */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className={`flex items-center gap-2 mb-1 ${isLowStock ? 'text-orange-600' : 'text-indigo-600'}`}>
                    <FileText className="w-3 h-3" />
                    <span className="text-xs font-bold uppercase tracking-wider">{prog.file_number}</span>
                  </div>
                  <div className="text-slate-900 font-bold text-lg leading-tight">{prog.destination}</div>
                </div>
                <div className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded uppercase tracking-wider">
                  {prog.shipping_line}
                </div>
              </div>

              {/* Metrics Grid */}
              <div className={`grid grid-cols-2 gap-2 mb-4 p-3 rounded-lg border ${isLowStock ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-slate-100'}`}>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Planned Qty</div>
                  <div className="text-slate-800 font-bold">{prog.planned_quantity} T</div>
                </div>
                <div>
                  <div className={`text-[10px] uppercase font-bold ${isLowStock ? 'text-orange-600' : 'text-slate-400'}`}>Containers</div>
                  <div className={`font-black ${isLowStock ? 'text-orange-600 text-lg' : 'text-slate-800'}`}>
                     {prog.planned_count}
                     {isLowStock && <span className="text-[10px] ml-1 animate-pulse">🔥</span>}
                  </div>
                </div>
                <div className={`col-span-2 mt-1 pt-1 border-t flex items-center gap-1.5 ${isLowStock ? 'border-orange-200' : 'border-slate-200'}`}>
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span className="text-xs text-slate-500">
                    {prog.start_date_raw} — {prog.deadline_raw}
                  </span>
                </div>
              </div>

              {/* Footer: Instructions */}
              {prog.special_instructions && (
                <div className="mt-auto">
                  <div className="flex items-start gap-1.5 bg-rose-50 p-2 rounded border border-rose-100">
                    <AlertCircle className="w-3 h-3 text-rose-500 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-rose-700 line-clamp-2 leading-relaxed">
                      {prog.special_instructions}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};