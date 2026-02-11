import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Ship, Anchor, TrendingUp, AlertTriangle, CheckCircle, 
  Clock, ArrowRight, Package, Search, Filter, X, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';

interface ProgramStatus {
  file_number: string;
  destination: string;
  shipping_line: string;
  platform: 'BIG_BAG' | '50KG';
  deadline: string;
  
  // Metrics
  planned_qty: number;
  planned_trucks: number;
  actual_qty: number;
  actual_trucks: number;
  
  // Computed
  progress: number; // 0-100
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERBOOKED';
}

type SortField = 'file_number' | 'progress' | 'status' | 'deadline' | 'platform';
type SortDirection = 'asc' | 'desc';

export const LogisticsMonitor: React.FC = () => {
  const [data, setData] = useState<ProgramStatus[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter State
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERBOOKED'>('ALL');
  const [platformFilter, setPlatformFilter] = useState<'ALL' | 'BIG_BAG' | '50KG'>('ALL');
  const [search, setSearch] = useState('');
  
  // Sort State
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // --- DATA ENGINE ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch The Plan (Shipping Program)
        const { data: programs, error: progError } = await supabase
          .from('shipping_program')
          .select('*')
          .order('created_at', { ascending: false });

        if (progError) throw progError;

        // 2. Fetch The Reality (Production Logs)
        const { data: logs, error: logError } = await supabase
          .from('production_logs')
          .select('file_number, total_tonnage, truck_count');

        if (logError) throw logError;

        // 3. Merge & Calculate
        const actualsMap = new Map<string, { tons: number, trucks: number }>();

        logs?.forEach(log => {
          if (!log.file_number) return;
          const current = actualsMap.get(log.file_number) || { tons: 0, trucks: 0 };
          actualsMap.set(log.file_number, {
            tons: current.tons + (Number(log.total_tonnage) || 0),
            trucks: current.trucks + (log.truck_count || 0)
          });
        });

        // Build the final dashboard data
        const dashboardData: ProgramStatus[] = (programs || []).map(prog => {
          const actual = actualsMap.get(prog.file_number) || { tons: 0, trucks: 0 };
          
          const plannedQty = Number(prog.planned_quantity) || 1; // Avoid divide by zero
          const percent = Math.min(100, Math.round((actual.tons / plannedQty) * 100));
          
          let status: ProgramStatus['status'] = 'PENDING';
          if (actual.tons > 0) status = 'IN_PROGRESS';
          if (percent >= 98 && percent <= 100) status = 'COMPLETED'; // Tolerance
          if (actual.tons > plannedQty) status = 'OVERBOOKED';

          return {
            file_number: prog.file_number,
            destination: prog.destination,
            shipping_line: prog.shipping_line,
            platform: prog.platform_section || 'BIG_BAG',
            deadline: prog.deadline_raw,
            planned_qty: prog.planned_quantity,
            planned_trucks: prog.planned_count,
            actual_qty: actual.tons,
            actual_trucks: actual.trucks,
            progress: percent,
            status: status
          };
        });

        setData(dashboardData);

      } catch (err) {
        console.error("Monitor Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- FILTERING & SORTING ---
  const filteredAndSortedData = useMemo(() => {
    // 1. Filter
    let filtered = data.filter(item => {
      const matchesSearch = search === '' ||
        item.file_number.toLowerCase().includes(search.toLowerCase()) || 
        item.destination.toLowerCase().includes(search.toLowerCase()) ||
        item.shipping_line.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = filter === 'ALL' || item.status === filter;
      const matchesPlatform = platformFilter === 'ALL' || item.platform === platformFilter;

      return matchesSearch && matchesStatus && matchesPlatform;
    });

    // 2. Sort
    const statusPriority = {
      'OVERBOOKED': 1,    // Critical first
      'IN_PROGRESS': 2,   // Active second
      'PENDING': 3,       // Waiting third
      'COMPLETED': 4      // Done last
    };

    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortField) {
        case 'status':
          compareValue = statusPriority[a.status] - statusPriority[b.status];
          break;
        case 'progress':
          compareValue = a.progress - b.progress;
          break;
        case 'file_number':
          compareValue = a.file_number.localeCompare(b.file_number);
          break;
        case 'deadline':
          // Handle potential missing dates or string comparison
          compareValue = new Date(a.deadline || '2099-12-31').getTime() - new Date(b.deadline || '2099-12-31').getTime();
          break;
        case 'platform':
          compareValue = a.platform.localeCompare(b.platform);
          break;
        default:
          compareValue = 0;
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [data, search, filter, platformFilter, sortField, sortDirection]);

  // --- KPI CALCULATIONS ---
  // Note: KPI always reflects the GLOBAL state (unfiltered) to provide context
  const kpi = useMemo(() => {
    const totalPlanned = data.reduce((sum, item) => sum + (Number(item.planned_qty) || 0), 0);
    const totalExecuted = data.reduce((sum, item) => sum + item.actual_qty, 0);
    const globalProgress = totalPlanned > 0 ? (totalExecuted / totalPlanned) * 100 : 0;
    
    const activeFiles = data.filter(i => i.status === 'IN_PROGRESS').length;
    const completedFiles = data.filter(i => i.status === 'COMPLETED').length;
    const overbookedFiles = data.filter(i => i.status === 'OVERBOOKED').length;
    const pendingFiles = data.filter(i => i.status === 'PENDING').length;

    return { totalPlanned, totalExecuted, globalProgress, activeFiles, completedFiles, overbookedFiles, pendingFiles };
  }, [data]);

  // --- HANDLERS ---
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setFilter('ALL');
    setPlatformFilter('ALL');
    setSearch('');
    setSortField('status'); // Reset to default sort
    setSortDirection('asc');
  };

  const handleStatusCardClick = (status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERBOOKED') => {
    // Toggle logic: if already selected, clear it (set to ALL)
    setFilter(filter === status ? 'ALL' : status);
  };

  const hasActiveFilters = filter !== 'ALL' || platformFilter !== 'ALL' || search !== '';

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-300 inline ml-1" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-indigo-600 inline ml-1" />
      : <ArrowDown className="w-3 h-3 text-indigo-600 inline ml-1" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER & GLOBAL KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Title Box */}
        <div className="md:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Anchor className="w-6 h-6 text-indigo-600" />
              Logistics Monitor
            </h2>
            <p className="text-slate-500 text-sm">Real-time tracking of shipping plan execution.</p>
          </div>
          
          {/* Global Progress Bar */}
          <div className="flex-1 w-full md:max-w-md bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
              <span>Global Execution</span>
              <span>{kpi.globalProgress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-1000" 
                style={{ width: `${kpi.globalProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>{kpi.totalExecuted.toLocaleString()} T Shipped</span>
              <span>{kpi.totalPlanned.toLocaleString()} T Planned</span>
            </div>
          </div>
        </div>

        {/* Interactive Stats Cards - Toggle Logic */}
        <button 
          onClick={() => handleStatusCardClick('IN_PROGRESS')}
          className={`bg-white p-4 rounded-xl border shadow-sm flex items-center gap-3 transition-all text-left group ${
            filter === 'IN_PROGRESS' 
              ? 'ring-2 ring-blue-500 border-transparent bg-blue-50/10' 
              : 'border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform"><Ship className="w-6 h-6"/></div>
          <div>
            <div className="text-xs text-slate-500 font-bold uppercase">Active Files</div>
            <div className="text-2xl font-black text-slate-800">{kpi.activeFiles}</div>
          </div>
        </button>

        <button 
          onClick={() => handleStatusCardClick('COMPLETED')}
          className={`bg-white p-4 rounded-xl border shadow-sm flex items-center gap-3 transition-all text-left group ${
            filter === 'COMPLETED' 
              ? 'ring-2 ring-emerald-500 border-transparent bg-emerald-50/10' 
              : 'border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform"><CheckCircle className="w-6 h-6"/></div>
          <div>
            <div className="text-xs text-slate-500 font-bold uppercase">Completed</div>
            <div className="text-2xl font-black text-slate-800">{kpi.completedFiles}</div>
          </div>
        </button>

        <button 
          onClick={() => handleStatusCardClick('OVERBOOKED')}
          className={`bg-white p-4 rounded-xl border shadow-sm flex items-center gap-3 transition-all text-left group ${
            filter === 'OVERBOOKED' 
              ? 'ring-2 ring-rose-500 border-transparent bg-rose-50/10' 
              : 'border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg group-hover:scale-110 transition-transform"><AlertTriangle className="w-6 h-6"/></div>
          <div>
            <div className="text-xs text-slate-500 font-bold uppercase">Overbooked</div>
            <div className="text-2xl font-black text-slate-800">{kpi.overbookedFiles}</div>
          </div>
        </button>

        <button 
          onClick={() => handleStatusCardClick('PENDING')}
          className={`bg-white p-4 rounded-xl border shadow-sm flex items-center gap-3 transition-all text-left group ${
            filter === 'PENDING' 
              ? 'ring-2 ring-amber-500 border-transparent bg-amber-50/10' 
              : 'border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-110 transition-transform"><Clock className="w-6 h-6"/></div>
          <div>
            <div className="text-xs text-slate-500 font-bold uppercase">Pending Start</div>
            <div className="text-2xl font-black text-slate-800">{kpi.pendingFiles}</div>
          </div>
        </button>
      </div>

      {/* CONTROLS */}
      <div className="flex flex-col gap-4">
        {/* Search & Active Filters */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search Dossier Number, Destination, Shipping Line..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {hasActiveFilters && (
           <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-1">
             <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-2">Active Filters:</span>
             
             {filter !== 'ALL' && (
               <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-300 text-xs font-bold text-slate-700 shadow-sm">
                 Status: <span className="text-indigo-600 ml-1">{filter.replace('_', ' ')}</span>
                 <button onClick={() => setFilter('ALL')} className="hover:text-rose-500 ml-1 transition-colors"><X size={12}/></button>
               </span>
             )}

             {platformFilter !== 'ALL' && (
               <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-300 text-xs font-bold text-slate-700 shadow-sm">
                 Platform: <span className="text-indigo-600 ml-1">{platformFilter.replace('_', ' ')}</span>
                 <button onClick={() => setPlatformFilter('ALL')} className="hover:text-rose-500 ml-1 transition-colors"><X size={12}/></button>
               </span>
             )}

             {search && (
               <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-300 text-xs font-bold text-slate-700 shadow-sm">
                 Search: <span className="text-indigo-600 ml-1">"{search}"</span>
                 <button onClick={() => setSearch('')} className="hover:text-rose-500 ml-1 transition-colors"><X size={12}/></button>
               </span>
             )}

             <button 
               onClick={clearFilters}
               className="ml-auto text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
             >
               Clear All
             </button>
           </div>
        )}

        {/* Filter Buttons Group */}
        <div className="flex flex-col sm:flex-row gap-4">
          
          {/* Status Buttons */}
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto flex-1">
            {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERBOOKED'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                  filter === f 
                    ? (f === 'IN_PROGRESS' ? 'bg-blue-600 text-white shadow-md shadow-blue-200 border-blue-600' :
                       f === 'COMPLETED' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 border-emerald-600' :
                       f === 'OVERBOOKED' ? 'bg-rose-600 text-white shadow-md shadow-rose-200 border-rose-600' :
                       f === 'PENDING' ? 'bg-amber-500 text-white shadow-md shadow-amber-200 border-amber-500' :
                       'bg-slate-800 text-white shadow-md border-slate-800')
                    : 'text-slate-500 hover:bg-slate-50 border-transparent'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Platform Buttons */}
           <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            {(['ALL', 'BIG_BAG', '50KG'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                  platformFilter === p 
                    ? (p === 'BIG_BAG' ? 'bg-indigo-600 text-white shadow-md border-indigo-600' :
                       p === '50KG' ? 'bg-emerald-600 text-white shadow-md border-emerald-600' :
                       'bg-slate-800 text-white shadow-md border-slate-800')
                    : 'text-slate-500 hover:bg-slate-50 border-transparent'
                }`}
              >
                {p === 'ALL' ? 'ALL PLATFORMS' : p.replace('_', ' ')}
              </button>
            ))}
          </div>

        </div>

        {/* Results Count */}
        <div className="flex justify-between items-center px-1">
           <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-800">{filteredAndSortedData.length}</span> of <span className="font-bold text-slate-800">{data.length}</span> programs
           </div>
           <div className="text-xs text-slate-400 font-mono hidden sm:block">
              Sorted by: <span className="text-slate-600 font-bold uppercase">{sortField.replace('_', ' ')}</span>
           </div>
        </div>
      </div>

      {/* MAIN TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('file_number')}>
                  Dossier <SortIcon field="file_number" />
                </th>
                <th className="p-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('platform')}>
                  Platform / Line <SortIcon field="platform" />
                </th>
                <th className="p-4 font-bold w-1/3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('progress')}>
                  Execution Progress <SortIcon field="progress" />
                </th>
                <th className="p-4 font-bold text-center">Trucks</th>
                <th className="p-4 font-bold text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('deadline')}>
                  Deadline <SortIcon field="deadline" />
                </th>
                <th className="p-4 font-bold text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('status')}>
                  Status <SortIcon field="status" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading Monitor Data...</td></tr>
              ) : filteredAndSortedData.length === 0 ? (
                <tr>
                   <td colSpan={6} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Filter className="w-10 h-10 text-slate-300" />
                        <div className="text-slate-500 font-medium">No matching shipping programs found.</div>
                        {hasActiveFilters && (
                          <button onClick={clearFilters} className="text-indigo-600 text-sm font-bold hover:underline">
                            Clear all filters
                          </button>
                        )}
                      </div>
                   </td>
                </tr>
              ) : (
                filteredAndSortedData.map((row) => (
                  <tr key={row.file_number} className="hover:bg-slate-50 transition-colors text-sm text-slate-700">
                    
                    {/* Dossier Info */}
                    <td className="p-4">
                      <div className="font-black text-indigo-700 font-mono text-base">{row.file_number}</div>
                      <div className="text-xs text-slate-500">{row.destination}</div>
                    </td>

                    {/* Platform Info */}
                    <td className="p-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-1 ${
                        row.platform === 'BIG_BAG' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {row.platform.replace('_', ' ')}
                      </span>
                      <div className="text-xs text-slate-400">{row.shipping_line}</div>
                    </td>

                    {/* Progress Bar */}
                    <td className="p-4">
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className={row.actual_qty > row.planned_qty ? 'text-rose-600' : 'text-slate-700'}>
                          {row.actual_qty.toLocaleString()} T
                        </span>
                        <span className="text-slate-400">
                          / {Number(row.planned_qty).toLocaleString()} T
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                        <div 
                          className={`h-2 rounded-full transition-all duration-1000 ${
                            row.status === 'OVERBOOKED' ? 'bg-rose-500' :
                            row.status === 'COMPLETED' ? 'bg-emerald-500' :
                            'bg-indigo-500'
                          }`} 
                          style={{ width: `${Math.min(row.progress, 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 font-bold">{row.progress}% Complete</div>
                    </td>

                    {/* Truck Count */}
                    <td className="p-4 text-center">
                      <div className="font-bold text-slate-800">{row.actual_trucks}</div>
                      <div className="text-[10px] text-slate-400">/ {row.planned_trucks} Plan</div>
                    </td>

                    {/* Deadline */}
                    <td className="p-4 text-right">
                      <div className="text-slate-600 font-medium">{row.deadline}</div>
                    </td>

                    {/* Status Badge */}
                    <td className="p-4 text-center">
                      <button 
                        onClick={(e) => {
                           e.stopPropagation();
                           handleStatusCardClick(row.status);
                        }}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide transition-all active:scale-95 hover:brightness-95 ${
                        row.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                        row.status === 'OVERBOOKED' ? 'bg-rose-100 text-rose-700' :
                        row.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {row.status === 'OVERBOOKED' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {row.status === 'COMPLETED' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {row.status.replace('_', ' ')}
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};