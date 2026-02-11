import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase.ts';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Users, Scale, Clock, TrendingUp, Calendar, Filter, Loader2, FileText, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { DailyProductionStat } from '../../types.ts';

// --- TYPES ---
interface AggregatedData {
  name: string; // Operator Name
  MORNING: number;
  AFTERNOON: number; // Or EVENING
  NIGHT: number;
  totalTonnage: number;
  totalTrucks: number;
}

// Updated Colors for Light Theme
const COLORS = {
  MORNING: '#f59e0b',   // Amber
  AFTERNOON: '#8b5cf6', // Violet
  EVENING: '#8b5cf6',   
  NIGHT: '#3b82f6',     // Blue
};

// --- SUB-COMPONENT: REAL-TIME DASHBOARD (Existing Logic) ---
const LiveDashboard = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('MONTH');

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('production_logs')
        .select(`
          total_tonnage,
          truck_count,
          shift,
          created_at,
          profiles:user_id ( full_name, username )
        `);

      const now = new Date();
      if (dateRange === 'TODAY') {
        query = query.gte('created_at', new Date(now.setHours(0,0,0,0)).toISOString());
      } else if (dateRange === 'WEEK') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (dateRange === 'MONTH') {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        query = query.gte('created_at', monthAgo.toISOString());
      }

      const { data: logs, error } = await query;
      if (error) throw error;
      setData(logs || []);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const { chartData, shiftTotals, grandTotal, totalTrucks, topPerformer } = useMemo(() => {
    const operatorMap = new Map<string, AggregatedData>();
    const shiftMap = { MORNING: 0, AFTERNOON: 0, EVENING: 0, NIGHT: 0 };
    let gTotal = 0;
    let tTrucks = 0;

    data.forEach(log => {
      // @ts-ignore
      const name = log.profiles?.full_name || log.profiles?.username || 'Unknown';
      const tonnage = Number(log.total_tonnage) || 0;
      const trucks = Number(log.truck_count) || 0;
      let shift = (log.shift || 'MORNING').toUpperCase();
      if (shift === 'EVENING') shift = 'AFTERNOON'; 

      gTotal += tonnage;
      tTrucks += trucks;
      // @ts-ignore
      if (shiftMap[shift] !== undefined) shiftMap[shift] += tonnage;

      if (!operatorMap.has(name)) {
        operatorMap.set(name, { 
          name, MORNING: 0, AFTERNOON: 0, NIGHT: 0, totalTonnage: 0, totalTrucks: 0 
        });
      }
      const opStats = operatorMap.get(name)!;
      // @ts-ignore
      opStats[shift] = (opStats[shift] || 0) + tonnage;
      opStats.totalTonnage += tonnage;
      opStats.totalTrucks += trucks;
    });

    const sortedChartData = Array.from(operatorMap.values())
      .sort((a, b) => b.totalTonnage - a.totalTonnage);

    const shiftPieData = [
      { name: 'Morning', value: shiftMap.MORNING, color: COLORS.MORNING },
      { name: 'Afternoon', value: shiftMap.AFTERNOON + shiftMap.EVENING, color: COLORS.AFTERNOON },
      { name: 'Night', value: shiftMap.NIGHT, color: COLORS.NIGHT },
    ].filter(s => s.value > 0);

    return { 
      chartData: sortedChartData, 
      shiftTotals: shiftPieData, 
      grandTotal: gTotal,
      totalTrucks: tTrucks,
      topPerformer: sortedChartData[0]
    };
  }, [data]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* FILTERS */}
      <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-fit">
        {(['TODAY', 'WEEK', 'MONTH', 'ALL'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setDateRange(range)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              dateRange === range 
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center text-slate-500 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
          <span className="text-xs font-bold uppercase tracking-widest">Crunching Data...</span>
        </div>
      ) : (
        <>
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-10 transition-opacity"><Scale className="w-24 h-24 text-emerald-600" /></div>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Total Tonnage</p>
              <div className="text-5xl font-black text-slate-800 mt-2 relative z-10">{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xl text-emerald-600">T</span></div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-10 transition-opacity"><Clock className="w-24 h-24 text-indigo-600" /></div>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Total Trucks</p>
              <div className="text-5xl font-black text-slate-800 mt-2 relative z-10">{totalTrucks}</div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
               <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-10 transition-opacity"><Users className="w-24 h-24 text-amber-600" /></div>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Top Performer</p>
              <div className="text-2xl font-black text-slate-800 mt-3 truncate relative z-10">{topPerformer?.name || 'N/A'}</div>
              <div className="text-sm text-emerald-600 font-bold relative z-10">{topPerformer?.totalTonnage.toFixed(0)} T</div>
            </div>
          </div>

          {/* CHARTS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 uppercase mb-8 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" /> Operator Tonnage by Shift
              </h3>
              <div className="h-[400px] min-h-[400px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      cursor={{ fill: '#f1f5f9' }}
                    />
                    <Legend iconType="circle" />
                    <Bar dataKey="MORNING" stackId="a" fill={COLORS.MORNING} name="Morning" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="AFTERNOON" stackId="a" fill={COLORS.AFTERNOON} name="Afternoon" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="NIGHT" stackId="a" fill={COLORS.NIGHT} name="Night" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 uppercase mb-8 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" /> Shift Distribution
              </h3>
              <div className="h-[400px] min-h-[400px] w-full min-w-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={shiftTotals}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="#ffffff"
                      strokeWidth={2}
                    >
                      {shiftTotals.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};

// --- SUB-COMPONENT: DAILY REPORTS (New Logic) ---
const ProductionReports = () => {
  const [reportType, setReportType] = useState<'DAILY' | 'MONTHLY'>('DAILY');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  
  const [stats, setStats] = useState<DailyProductionStat[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let query = supabase.from('daily_production_stats').select('*');

      if (reportType === 'DAILY') {
         query = query.eq('production_date', selectedDate);
      } else {
         query = query.eq('production_month', selectedMonth);
      }

      const { data, error } = await query;
      if (error) throw error;
      setStats(data as DailyProductionStat[] || []);
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [reportType, selectedDate, selectedMonth]);

  // Calculations for Summary
  const totals = useMemo(() => {
    return stats.reduce((acc, curr) => ({
      tonnage: acc.tonnage + curr.total_tonnage,
      trucks: acc.trucks + curr.total_trucks,
      morning: acc.morning + curr.morning_tonnage,
      afternoon: acc.afternoon + curr.afternoon_tonnage,
      night: acc.night + curr.night_tonnage
    }), { tonnage: 0, trucks: 0, morning: 0, afternoon: 0, night: 0 });
  }, [stats]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      
      {/* CONTROLS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
           <button 
             onClick={() => setReportType('DAILY')}
             className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${reportType === 'DAILY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
           >
             Daily Report
           </button>
           <button 
             onClick={() => setReportType('MONTHLY')}
             className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${reportType === 'MONTHLY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
           >
             Monthly Summary
           </button>
        </div>

        <div className="flex items-center gap-3">
           <span className="text-xs font-bold text-slate-500 uppercase">Select Period:</span>
           {reportType === 'DAILY' ? (
             <input 
               type="date" 
               value={selectedDate}
               onChange={(e) => setSelectedDate(e.target.value)}
               className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
             />
           ) : (
             <input 
               type="month" 
               value={selectedMonth}
               onChange={(e) => setSelectedMonth(e.target.value)}
               className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
             />
           )}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center text-slate-400">
           <Loader2 className="animate-spin w-8 h-8" />
        </div>
      ) : stats.length === 0 ? (
        <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
           <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
           <p className="font-medium">No production data found for this period.</p>
        </div>
      ) : (
        <>
          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Output</div>
               <div className="text-2xl font-black text-slate-800 mt-1">{totals.tonnage.toFixed(0)} <span className="text-sm text-slate-400">T</span></div>
            </div>
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Morning Shift</div>
               <div className="text-2xl font-black text-amber-500 mt-1">{totals.morning.toFixed(0)} <span className="text-sm text-amber-300">T</span></div>
            </div>
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Afternoon Shift</div>
               <div className="text-2xl font-black text-purple-500 mt-1">{totals.afternoon.toFixed(0)} <span className="text-sm text-purple-300">T</span></div>
            </div>
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Night Shift</div>
               <div className="text-2xl font-black text-blue-500 mt-1">{totals.night.toFixed(0)} <span className="text-sm text-blue-300">T</span></div>
            </div>
          </div>

          {/* DETAILED TABLE */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  {reportType === 'DAILY' ? 'Daily Breakdown' : 'Monthly Aggregation'}
                </h3>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-slate-50/50 text-xs text-slate-500 font-bold uppercase tracking-wider">
                   <tr>
                     <th className="px-6 py-3 border-b border-slate-100">Date</th>
                     <th className="px-6 py-3 border-b border-slate-100">Platform</th>
                     <th className="px-6 py-3 border-b border-slate-100">Category</th>
                     <th className="px-6 py-3 border-b border-slate-100 text-right text-amber-600">Morning</th>
                     <th className="px-6 py-3 border-b border-slate-100 text-right text-purple-600">Afternoon</th>
                     <th className="px-6 py-3 border-b border-slate-100 text-right text-blue-600">Night</th>
                     <th className="px-6 py-3 border-b border-slate-100 text-right">Total</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
                    {stats.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-mono text-xs">{row.production_date}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                            row.platform === 'BIG_BAG' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {row.platform.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-bold text-xs">{row.category}</td>
                        <td className="px-6 py-3 text-right font-mono text-slate-500">{row.morning_tonnage > 0 ? row.morning_tonnage.toFixed(3) : '-'}</td>
                        <td className="px-6 py-3 text-right font-mono text-slate-500">{row.afternoon_tonnage > 0 ? row.afternoon_tonnage.toFixed(3) : '-'}</td>
                        <td className="px-6 py-3 text-right font-mono text-slate-500">{row.night_tonnage > 0 ? row.night_tonnage.toFixed(3) : '-'}</td>
                        <td className="px-6 py-3 text-right font-black text-slate-800">{row.total_tonnage.toFixed(3)}</td>
                      </tr>
                    ))}
                 </tbody>
               </table>
             </div>
          </div>
        </>
      )}
    </div>
  );
};

// --- MAIN COMPONENT ---
export const AnalyticsView: React.FC = () => {
  const { userRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'LIVE' | 'REPORTS'>('LIVE');

  if (userRole !== 'admin') {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        <Scale className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-slate-800">Analytics Restricted</h2>
        <p>Only Administrators can view global performance charts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER & TABS */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          Production Analytics
        </h2>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
           <button 
             onClick={() => setActiveTab('LIVE')}
             className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'LIVE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
           >
             <TrendingUp size={14} /> Live Dashboard
           </button>
           <button 
             onClick={() => setActiveTab('REPORTS')}
             className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'REPORTS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
           >
             <FileText size={14} /> Production Reports
           </button>
        </div>
      </div>

      {activeTab === 'LIVE' ? <LiveDashboard /> : <ProductionReports />}

    </div>
  );
};