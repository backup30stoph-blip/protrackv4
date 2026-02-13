import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase.ts';
import { ProductionLog, PlatformType } from '../../types.ts';
import { 
  FileDown, 
  Search, 
  RefreshCw, 
  User, 
  Edit3, 
  Layout, 
  Calendar,
  X,
  Eye,
  CheckSquare,
  Square,
  Filter
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { LogDetailsModal } from './LogDetailsModal.tsx';

interface HistoryViewProps {
  onEdit?: (log: ProductionLog) => void;
}

interface ExtendedLog extends ProductionLog {
  profiles?: {
    full_name?: string;
    username?: string;
  };
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onEdit }) => {
  const { userRole, platformAssignment } = useAuth();
  
  const [logs, setLogs] = useState<ExtendedLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection & Filtering State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [selectedLog, setSelectedLog] = useState<ProductionLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('production_logs')
        .select(`*, profiles:user_id ( full_name, username )`)
        .order('created_at', { ascending: false })
        .limit(2000);

      if (userRole !== 'admin' && platformAssignment && platformAssignment !== 'BOTH') {
         query = query.eq('platform', platformAssignment);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data as unknown as ExtendedLog[] || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  }, [userRole, platformAssignment]);

  useEffect(() => {
    fetchLogs();
    const channel = supabase.channel('realtime_history').on('postgres_changes', { event: '*', schema: 'public', table: 'production_logs' }, () => {
      fetchLogs();
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLogs]);

  // --- FILTERING LOGIC ---
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const logDate = new Date(log.created_at);
      
      // 1. Date Range Check
      let inDateRange = true;
      if (dateRange.start) {
        const start = new Date(dateRange.start);
        start.setHours(0, 0, 0, 0); 
        if (logDate < start) inDateRange = false;
      }
      if (dateRange.end) {
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999); 
        if (logDate > end) inDateRange = false;
      }

      // 2. Search Text Check
      const opName = log.profiles?.full_name || log.profiles?.username || '';
      const searchContent = `
        ${log.file_number || ''} 
        ${log.destination || ''} 
        ${opName} 
        ${log.article_code}
        ${log.sap_code || ''}
      `.toLowerCase();
      const matchesSearch = !searchQuery || searchContent.includes(searchQuery.toLowerCase());

      return inDateRange && matchesSearch;
    });
  }, [logs, dateRange, searchQuery]);

  // --- SELECTION LOGIC ---
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLogs.length && filteredLogs.length > 0) {
      setSelectedIds(new Set()); 
    } else {
      setSelectedIds(new Set(filteredLogs.map(log => log.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  // --- EXPORT LOGIC ---
  const handleExport = () => {
    const logsToExport = selectedIds.size > 0 
      ? logs.filter(l => selectedIds.has(l.id)) 
      : filteredLogs;

    if (logsToExport.length === 0) return alert("No logs available to export.");

    // Headers - Includes Comments, Truck Matricul, and split Date/Time
    const headers = [
      "Timestamp (ISO)", "Date", "Time", "Shift", "Operator", "Platform", "Category", 
      "Article Code", "File Number", "SAP Code", "Booking Ref", 
      "Destination", "TC Number", "Seal Number", "Truck Matricul", "Pallet Type", 
      "Trucks", "Weight/Unit", "Total Tonnage", "Comments"
    ];

    const escape = (val: string | number | undefined | null) => `"${(val || '').toString().replace(/"/g, '""')}"`;

    const rows = logsToExport.map(log => {
      const opName = log.profiles?.full_name || log.profiles?.username || "Unknown";
      const logDate = new Date(log.created_at);
      
      return [
        escape(logDate.toISOString().replace('T', ' ').substring(0, 16)), // ISO Format for easy sorting
        logDate.toLocaleDateString(), // Local Date
        logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), // Local Time
        escape(log.shift),
        escape(opName),
        escape(log.platform),
        escape(log.category),
        escape(log.article_code),
        escape(log.file_number),
        escape(log.sap_code),
        escape(log.booking_ref),
        escape(log.destination),
        escape(log.tc_number),
        escape(log.seal_number),
        escape(log.truck_matricul),
        escape(log.pallet_type),
        log.truck_count,
        log.weight_per_unit,
        log.total_tonnage,
        escape(log.comments)
      ].join(",");
    });

    // Summary Calculation: Group by Article AND Weight/Unit
    // This allows separating 1.1T from 1.2T even if Article Code is the same
    const summaryMap: Record<string, { count: number, tonnage: number, code: string, weight: string }> = {};
    
    logsToExport.forEach(log => {
      const code = log.article_code || 'Unknown';
      const weight = log.weight_per_unit !== undefined && log.weight_per_unit !== null 
        ? log.weight_per_unit.toString() 
        : '0';
      
      const key = `${code}-${weight}`;
      
      if (!summaryMap[key]) {
        summaryMap[key] = { 
          count: 0, 
          tonnage: 0,
          code: code,
          weight: weight
        };
      }
      summaryMap[key].count += (log.truck_count || 0);
      summaryMap[key].tonnage += (log.total_tonnage || 0);
    });

    // Generate Summary Rows
    const summaryRows = Object.values(summaryMap).map(stats => {
      return [
        "SUMMARY",
        escape(`${stats.code}-(${stats.weight}T)`),
        escape(`Total Trucks: ${stats.count}TCs`),
        escape(`${stats.tonnage.toFixed(3)}T`)
      ].join(",");
    });

    const csvContent = [
      `REPORT GENERATED BY ADMIN,${new Date().toLocaleString()}`,
      `RECORDS INCLUDED,${logsToExport.length}`,
      "",
      headers.join(","),
      ...rows,
      "",
      "--- PRODUCTION SUMMARY (BY ARTICLE & WEIGHT) ---",
      ...summaryRows
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `PROTRACK_EXPORT_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDateRange({ start: '', end: '' });
    setSelectedIds(new Set());
  };

  return (
    <main className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Layout className="text-indigo-600 w-6 h-6" /> Production Audit
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            Manage logs, filter by date, and generate audit reports.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={() => fetchLogs()} className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-transparent hover:border-indigo-100">
             <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      {/* FILTERS & ACTIONS BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4 md:space-y-0 md:flex md:items-end md:justify-between gap-4">
        
        {/* Left: Filters */}
        <div className="flex flex-col md:flex-row gap-4 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Search Records</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Dossier, Operator, Dest..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">From Date</label>
              <input 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">To Date</label>
              <input 
                type="date" 
                value={dateRange.end}
                min={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          {(dateRange.start || dateRange.end || searchQuery) && (
            <div className="flex items-end">
              <button 
                onClick={clearFilters}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                title="Clear Filters"
              >
                <X size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col items-end gap-2">
           <div className="text-[10px] uppercase font-bold text-slate-400">
             {selectedIds.size > 0 ? <span className="text-indigo-600">{selectedIds.size} Selected</span> : <span>{filteredLogs.length} Records</span>}
           </div>
           <div className="flex gap-2">
             <button 
               onClick={toggleSelectAll}
               disabled={filteredLogs.length === 0}
               className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
             >
               {selectedIds.size === filteredLogs.length && filteredLogs.length > 0 ? <CheckSquare size={18} className="text-indigo-600"/> : <Square size={18}/>}
               {selectedIds.size === filteredLogs.length ? 'Deselect' : 'Select All'}
             </button>

             <button 
               onClick={handleExport}
               disabled={filteredLogs.length === 0}
               className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-slate-300"
             >
               <FileDown size={18} />
               {selectedIds.size > 0 ? 'Export Selection' : 'Export View'}
             </button>
           </div>
        </div>
      </div>

      {/* TABLE AREA */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                <th className="p-4 w-10 text-center">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.size === filteredLogs.length && filteredLogs.length > 0}
                    onChange={toggleSelectAll}
                    disabled={filteredLogs.length === 0}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="p-4">Date / Operator</th>
                <th className="p-4">Dossier / Article</th>
                <th className="p-4 text-center">Metrics</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-bold animate-pulse">Loading logs...</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                   <td colSpan={5} className="p-12 text-center text-slate-400">
                     <div className="flex flex-col items-center gap-2">
                       <Filter className="w-8 h-8 opacity-20" />
                       <p>No records found matching your filters.</p>
                     </div>
                   </td>
                </tr>
              ) : filteredLogs.map(log => (
                <tr 
                  key={log.id} 
                  className={`transition-colors ${selectedIds.has(log.id) ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}
                >
                  <td className="p-4 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(log.id)}
                      onChange={() => toggleSelectRow(log.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-4">
                    <div className="text-sm font-bold text-slate-800">{new Date(log.created_at).toLocaleDateString()}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                        {log.profiles?.full_name || 'Unknown'}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">• {log.shift}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm font-mono font-bold text-slate-700">{log.file_number || '-'}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <span className="font-bold text-slate-400">ART:</span> {log.article_code}
                      {log.destination && <span className="text-slate-300 mx-1">|</span>}
                      {log.destination && <span className="truncate max-w-[150px]" title={log.destination}>{log.destination}</span>}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="font-black text-emerald-600">{log.total_tonnage} T</div>
                    <div className="text-[10px] text-slate-400 font-bold">{log.truck_count} Trucks</div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => { setSelectedLog(log); setIsModalOpen(true); }} 
                        className="p-2 hover:bg-slate-200 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      {onEdit && (
                        <button 
                          onClick={() => onEdit(log)} 
                          className="p-2 hover:bg-slate-200 text-slate-400 hover:text-amber-600 rounded-lg transition-colors"
                          title="Edit Log"
                        >
                          <Edit3 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <LogDetailsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} log={selectedLog} />
    </main>
  );
};