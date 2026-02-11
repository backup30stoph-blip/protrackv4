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
  X,
  Camera
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
  const [exporting, setExporting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState<PlatformType | 'ALL'>('ALL');
  
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

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const opName = log.profiles?.full_name || log.profiles?.username || '';
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || log.file_number?.toLowerCase().includes(searchLower) || log.destination?.toLowerCase().includes(searchLower) || log.sap_code?.toLowerCase().includes(searchLower) || log.article_code.toLowerCase().includes(searchLower);
      const matchesPlatform = platformFilter === 'ALL' || log.platform === platformFilter;
      const matchesOperator = !operatorFilter || opName.toLowerCase().includes(operatorFilter.toLowerCase());
      return matchesSearch && matchesPlatform && matchesOperator;
    });
  }, [logs, searchQuery, platformFilter, operatorFilter]);

  const handleExport = () => {
    setExporting(true);
    try {
      if (filteredLogs.length === 0) { alert("No data"); setExporting(false); return; }
      const headers = ["Date", "Time", "Operator", "Shift", "Platform", "Category", "Article", "File", "Destination", "Trucks", "Tonnage"];
      const csvRows = filteredLogs.map(log => [new Date(log.created_at).toLocaleDateString(), new Date(log.created_at).toLocaleTimeString(), `"${log.profiles?.full_name || 'N/A'}"`, log.shift, log.platform, log.category, `"${log.article_code}"`, `"${log.file_number || '-'}"`, `"${log.destination || '-'}"`, log.truck_count, log.total_tonnage].join(","));
      const csvContent = "\uFEFF" + headers.join(",") + "\n" + csvRows.join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `PROTRACK_${new Date().toISOString().split('T')[0]}.csv`);
      link.click();
    } finally { setExporting(false); }
  };

  return (
    <main className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Layout className="text-indigo-600 w-6 h-6" /> History</h1>
          <p className="text-slate-500 text-sm font-medium">Audit logs and photographic evidence.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchLogs()} className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-transparent hover:border-indigo-100"><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
          <button onClick={handleExport} disabled={exporting || loading} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-slate-200">
            {exporting ? <RefreshCw className="animate-spin" /> : <FileDown />} Export
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Search</label>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" /><input className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" placeholder="Dossier..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operator</label>
          <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" /><input className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" placeholder="Name..." value={operatorFilter} onChange={(e) => setOperatorFilter(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform</label>
          <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value as any)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none"><option value="ALL">All</option><option value="BIG_BAG">Big Bag</option><option value="50KG">50kg</option></select>
        </div>
        <button onClick={() => { setSearchQuery(''); setOperatorFilter(''); setPlatformFilter('ALL'); }} className="h-[42px] bg-slate-100 text-slate-600 rounded-xl text-sm font-bold">Reset</button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Date / Time</th>
                <th className="px-6 py-4">Operator</th>
                <th className="px-6 py-4">Logistics</th>
                <th className="px-6 py-4 text-center">Output</th>
                <th className="px-6 py-4 text-center">Photos</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-bold animate-pulse">Loading logs...</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-slate-400">No records found.</td></tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-indigo-50/30 group">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-700">{new Date(log.created_at).toLocaleDateString()}</div>
                      <div className="text-[11px] font-mono text-slate-400">{new Date(log.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-700">{log.profiles?.full_name || 'Unknown'}</div>
                      <div className="text-[10px] text-slate-400 uppercase">{log.platform.replace('_',' ')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-indigo-700 font-mono">{log.file_number || '-'}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{log.destination || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm font-black text-slate-800">{log.total_tonnage} T</div>
                      <div className="text-[10px] text-slate-400">{log.truck_count} Trucks</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       {log.images && log.images.length > 0 ? (
                         <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-black">
                           <Camera size={12} /> {log.images.length}
                         </div>
                       ) : (
                         <span className="text-slate-300">-</span>
                       )}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button onClick={() => { setSelectedLog(log); setIsModalOpen(true); }} className="p-2 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"><Eye size={18} /></button>
                       {onEdit && <button onClick={() => onEdit(log)} className="p-2 hover:bg-slate-100 text-slate-400 hover:text-amber-600 rounded-lg transition-colors"><Edit3 size={18} /></button>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <LogDetailsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} log={selectedLog} />
    </main>
  );
};