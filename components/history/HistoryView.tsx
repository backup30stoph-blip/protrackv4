import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase.ts';
import { ProductionLog, PlatformType } from '../../types.ts';
import { 
  FileDown, 
  Search, 
  RefreshCw, 
  User, 
  Edit3, 
  Filter, 
  Layout, 
  Calendar,
  Truck,
  Box,
  Trash2,
  Eye,
  X
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
  
  // Data State
  const [logs, setLogs] = useState<ExtendedLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState<PlatformType | 'ALL'>('ALL');
  
  // Modal State
  const [selectedLog, setSelectedLog] = useState<ProductionLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- 1. DATA FETCHING ---
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('production_logs')
        .select(`
          *,
          profiles:user_id ( full_name, username )
        `)
        .order('created_at', { ascending: false })
        .limit(2000);

      // Enforce Role-Based Access for Non-Admins
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
    
    // Realtime subscription
    const channel = supabase
      .channel('realtime_history')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_logs' }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchLogs]);

  // --- 2. ADVANCED FILTERING ---
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const opName = log.profiles?.full_name || log.profiles?.username || '';
      const searchLower = searchQuery.toLowerCase();
      
      const matchesSearch = 
        !searchQuery ||
        log.file_number?.toLowerCase().includes(searchLower) ||
        log.destination?.toLowerCase().includes(searchLower) ||
        log.sap_code?.toLowerCase().includes(searchLower) ||
        log.article_code.toLowerCase().includes(searchLower);
      
      const matchesPlatform = platformFilter === 'ALL' || log.platform === platformFilter;
      
      const matchesOperator = 
        !operatorFilter || 
        opName.toLowerCase().includes(operatorFilter.toLowerCase());

      return matchesSearch && matchesPlatform && matchesOperator;
    });
  }, [logs, searchQuery, platformFilter, operatorFilter]);

  // --- 3. CSV EXPORT LOGIC ---
  const handleExport = () => {
    setExporting(true);
    try {
      if (filteredLogs.length === 0) {
        alert("No data to export");
        setExporting(false);
        return;
      }

      // Sort chronologically for the report
      const sortedForExport = [...filteredLogs].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      const headers = [
        "Date", "Time", "Operator", "Shift", "Platform", 
        "Category", "Article Code", "File No.", "Destination", 
        "BL No.", "TC No.", "Trucks", "Tonnage"
      ];
      
      const csvRows = sortedForExport.map(log => {
        const date = new Date(log.created_at);
        return [
          date.toLocaleDateString(),
          date.toLocaleTimeString(),
          `"${log.profiles?.full_name || 'N/A'}"`,
          log.shift,
          log.platform,
          log.category,
          `"${log.article_code}"`, // Added Article Code
          `"${log.file_number || '-'}"`,
          `"${log.destination || '-'}"`,
          `"${log.bl_number || '-'}"`,
          `"${log.tc_number || '-'}"`,
          log.truck_count,
          log.total_tonnage
        ].join(",");
      });

      const csvContent = ["\uFEFF" + headers.join(","), ...csvRows].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `PROTRACK_EXPORT_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export Error:", err);
    } finally {
      setExporting(false);
    }
  };

  // --- 4. HANDLERS ---
  const handleViewDetails = (log: ProductionLog) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setOperatorFilter('');
    setPlatformFilter('ALL');
  };

  return (
    <main className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 flex items-center gap-2">
            <Layout className="text-indigo-600 w-6 h-6" />
            Production History
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Manage loading entries, track operator performance, and export reports.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchLogs()} 
            className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-transparent hover:border-indigo-100"
            title="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={handleExport}
            disabled={exporting || loading}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-slate-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* FILTERS BAR */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
        
        {/* Search Filter */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Search Dossier / Dest</label>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 w-4 h-4 transition-colors" />
            <input 
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
              placeholder="e.g. 8267, Marseille..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Operator Filter */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Operator Name</label>
          <div className="relative group">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 w-4 h-4 transition-colors" />
            <input 
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
              placeholder="Filter by name..."
              value={operatorFilter}
              onChange={(e) => setOperatorFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Platform Filter */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Platform Type</label>
          <div className="relative group">
            <Box className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 w-4 h-4 transition-colors" />
            <select 
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as any)}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none appearance-none cursor-pointer transition-all text-slate-700"
            >
              <option value="ALL">All Platforms</option>
              <option value="BIG_BAG">Big Bag</option>
              <option value="50KG">50kg (Sacs)</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-3.5 h-3.5" />
          </div>
        </div>

        {/* Reset Button */}
        <button 
          onClick={resetFilters}
          className="h-[42px] flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold transition-colors"
        >
          <X className="w-4 h-4" /> Reset
        </button>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Date / Time</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Operator</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Platform</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">File / Article</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Destination</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Trucks</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Output</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                       <RefreshCw className="animate-spin w-6 h-6 text-indigo-500" />
                       <span className="text-sm font-medium">Loading production history...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                       <Search className="w-8 h-8 opacity-20" />
                       <span className="text-sm font-medium">No records found matching your filters.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-indigo-50/30 transition-colors group">
                    {/* Date/Time */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 pl-5">
                          {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </td>

                    {/* Operator */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-black border border-slate-200">
                          {log.profiles?.full_name?.charAt(0) || '?'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">{log.profiles?.full_name || 'Unknown'}</span>
                          <span className="text-[10px] text-slate-400 uppercase">{log.shift} Shift</span>
                        </div>
                      </div>
                    </td>

                    {/* Platform Badge */}
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide border ${
                        log.platform === 'BIG_BAG' 
                          ? 'bg-indigo-50 text-indigo-600 border-indigo-100' 
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        {log.platform.replace('_', ' ')}
                      </span>
                    </td>

                    {/* File/Article */}
                    <td className="px-6 py-4">
                      <div className="font-mono text-sm font-bold text-slate-700">{log.file_number || '-'}</div>
                      <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                        <Box className="w-3 h-3 text-slate-400" />
                        {log.article_code}
                      </div>
                    </td>

                    {/* Destination */}
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-600 max-w-[150px] truncate" title={log.destination}>
                        {log.destination || '-'}
                      </div>
                    </td>

                    {/* Trucks */}
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600">
                        <Truck className="w-3 h-3" /> {log.truck_count}
                      </div>
                    </td>

                    {/* Tonnage */}
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-black text-slate-800">{log.total_tonnage} <span className="text-[10px] text-slate-400 font-normal">T</span></div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleViewDetails(log)}
                          className="p-2 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {onEdit && (
                          <button 
                            onClick={() => onEdit(log)}
                            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-amber-600 rounded-lg transition-colors"
                            title="Edit Record"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer Count */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-xs text-slate-500 font-medium flex justify-between items-center">
          <span>Showing {filteredLogs.length} records</span>
          <span className="hidden sm:inline">Sorted by Date (Newest First)</span>
        </div>
      </div>

      <LogDetailsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        log={selectedLog} 
      />
    </main>
  );
};