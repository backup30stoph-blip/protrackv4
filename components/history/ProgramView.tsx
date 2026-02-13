import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase.ts';
import { 
  Truck, 
  Clock, 
  FileText, 
  ArrowRight, 
  Bell
} from 'lucide-react';

interface ProgramStatus {
  id: string;
  file_number: string;
  sap_code: string;
  destination: string;
  planned_count: number;
  total_loaded_cumulative: number;
  loaded_on_date: number;
  status: string;
}

export const ProgramView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<'YESTERDAY' | 'TODAY' | 'TOMORROW'>('TODAY');
  const [programs, setPrograms] = useState<ProgramStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // --- 1. DATE LOGIC ---
  const getDateObject = (type: string) => {
    const d = new Date();
    if (type === 'YESTERDAY') d.setDate(d.getDate() - 1);
    if (type === 'TOMORROW') d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // --- 2. DATA FETCHING ---
  const fetchProgramData = async () => {
    setLoading(true);
    const targetDate = getDateObject(selectedDate);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    try {
      // A. Get Active Programs
      const { data: programData, error: programError } = await supabase
        .from('shipping_program')
        .select('*')
        .neq('status', 'COMPLETED')
        .order('created_at', { ascending: false });

      if (programError) throw programError;

      // B. Get Logs for these programs
      const fileNumbers = programData.map(p => p.file_number);
      // Only fetch logs if there are programs
      let logsData: any[] = [];
      
      if (fileNumbers.length > 0) {
        const { data } = await supabase
          .from('production_logs')
          .select('file_number, created_at, truck_count')
          .in('file_number', fileNumbers);
        logsData = data || [];
      }

      // C. Process Data
      const processed: ProgramStatus[] = programData.map(prog => {
        const progLogs = logsData.filter(l => l.file_number === prog.file_number) || [];
        
        const totalLoaded = progLogs.reduce((sum: number, l: any) => sum + (l.truck_count || 0), 0);
        
        const dailyLoaded = progLogs
          .filter((l: any) => {
            const logDate = new Date(l.created_at);
            return logDate >= targetDate && logDate < nextDay;
          })
          .reduce((sum: number, l: any) => sum + (l.truck_count || 0), 0);

        return {
          id: prog.id,
          file_number: prog.file_number,
          sap_code: prog.sap_order_code || prog.sap_code || '', // Handle varied naming in types vs DB
          destination: prog.destination,
          planned_count: prog.planned_count || 0,
          total_loaded_cumulative: totalLoaded,
          loaded_on_date: dailyLoaded,
          status: prog.status
        };
      });

      setPrograms(processed);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgramData();
  }, [selectedDate]);

  // --- 3. HEADER STATS CALCULATION ---
  const stats = useMemo(() => {
    return {
      charged: programs.reduce((sum, p) => sum + p.loaded_on_date, 0),
      pending: programs.reduce((sum, p) => sum + Math.max(0, p.planned_count - p.total_loaded_cumulative), 0),
      active: programs.length
    };
  }, [programs]);

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 max-w-5xl mx-auto font-sans animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1">Logistics Manager</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Shipping Program</h1>
        </div>
        <button className="p-3 bg-white rounded-full shadow-sm border border-slate-100 text-slate-600 hover:text-indigo-600 transition-colors">
          <Bell size={20} />
        </button>
      </div>

      {/* DATE TABS (Pill Style) */}
      <div className="bg-slate-200/60 p-1.5 rounded-2xl flex items-center mb-8">
        {['YESTERDAY', 'TODAY', 'TOMORROW'].map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedDate(tab as any)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all duration-200 ${
              selectedDate === tab 
                ? 'bg-white text-slate-900 shadow-sm transform scale-[1.02]' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TOP SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Card 1: Charged */}
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between h-32">
          <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 relative overflow-hidden">
            <Truck size={20} fill="currentColor" className="opacity-20 scale-150 absolute" />
            <Truck size={18} className="relative z-10" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Charged ({selectedDate})</p>
            <p className="text-3xl font-black text-slate-900 leading-none">{stats.charged} <span className="text-sm text-slate-400 font-bold">TRUCKS</span></p>
          </div>
        </div>

        {/* Card 2: Pending */}
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between h-32">
          <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Pending</p>
            <p className="text-3xl font-black text-slate-900 leading-none">{stats.pending} <span className="text-sm text-slate-400 font-bold">TRUCKS</span></p>
          </div>
        </div>

        {/* Card 3: Active */}
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between h-32">
          <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
            <FileText size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Programs</p>
            <p className="text-3xl font-black text-slate-900 leading-none">{stats.active} <span className="text-sm text-slate-400 font-bold">FILES</span></p>
          </div>
        </div>
      </div>

      <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-1">Current Programs</h2>

      {/* PROGRAM LIST */}
      <div className="space-y-4 pb-20">
        {loading ? (
          <div className="text-center py-20 text-slate-400 flex flex-col items-center gap-2">
            <div className="animate-spin h-6 w-6 border-2 border-indigo-600 rounded-full border-t-transparent"></div>
            <span className="text-xs font-bold uppercase tracking-wider">Loading Data...</span>
          </div>
        ) : programs.length === 0 ? (
           <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200">
             <p className="text-slate-400 font-medium">No active shipping programs found.</p>
           </div>
        ) : programs.map((prog) => {
          const remaining = Math.max(0, prog.planned_count - prog.total_loaded_cumulative);
          const progress = prog.planned_count > 0 
            ? Math.min(100, (prog.total_loaded_cumulative / prog.planned_count) * 100) 
            : 0;
          const isHighPriority = remaining < 10 && remaining > 0;

          return (
            <div key={prog.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group hover:border-indigo-100 transition-colors">
              
              {/* Header Row */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-black text-slate-900">{prog.file_number}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">SAP CODE: {prog.sap_code || 'N/A'}</p>
                </div>
                {isHighPriority ? (
                  <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border border-emerald-100">
                    High Priority
                  </span>
                ) : (
                  <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border border-indigo-100">
                    In Progress
                  </span>
                )}
              </div>

              {/* Route Info */}
              <div className="flex items-center gap-3 text-slate-700 font-bold mb-5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-xs uppercase tracking-wide text-slate-400">Route</span>
                <span className="text-sm">Warehouse A</span>
                <ArrowRight size={14} className="text-slate-300" />
                <span className="text-sm">{prog.destination || 'Unknown Dest'}</span>
              </div>

              {/* Metrics Row */}
              <div className="flex justify-between items-end mb-3">
                <div>
                  <p className="text-[11px] text-slate-400 font-bold mb-0.5 uppercase tracking-wide">
                    Daily Loading ({selectedDate})
                  </p>
                  <p className="text-sm font-black text-emerald-600 flex items-center gap-1">
                    {prog.loaded_on_date} <span className="text-[10px] text-emerald-400 uppercase">Trucks</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">
                    Remaining
                  </p>
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-amber-500 font-black text-lg">{remaining}</span>
                    <span className="text-slate-300 text-[10px] font-bold uppercase">/ {prog.planned_count} Total</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${isHighPriority ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};
