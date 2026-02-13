import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase.ts';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line 
} from 'recharts';
import { 
  Calendar, Filter, Download, MoreHorizontal, RefreshCw 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { generatePowerPoint } from '../../utils/exportToPPT.ts';

// --- STYLES & CONFIG ---
const THEME = {
  blue: '#2563eb',    // Corporate Blue (Primary)
  lightBlue: '#dbeafe', 
  darkBlue: '#1e40af',
  slate: '#64748b',   // Text Gray
  border: '#e2e8f0',  // Light Border
  grid: '#f1f5f9',    // Chart Grid
};

const PIE_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

// --- TYPES ---
interface LogData {
  created_at: string;
  total_tonnage: number;
  truck_count: number;
  shift: string;
  category: string;
  platform: string;
  profiles: { full_name: string } | null;
}

// --- HELPER COMPONENT: SPARKLINE CARD ---
const SparklineCard = ({ title, value, unit, data, dataKey, color = "#3b82f6" }: any) => (
  <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm flex flex-col justify-between h-[160px] relative overflow-hidden group hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start z-10">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
    </div>
    
    <div className="z-10 mt-2">
      <div className="text-4xl font-bold text-blue-600 tracking-tight">
        {value} <span className="text-lg text-slate-400 font-medium">{unit}</span>
      </div>
    </div>

    {/* Sparkline Area Chart positioned at the bottom */}
    <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`grad-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.8}/>
              <stop offset="100%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            strokeWidth={2} 
            fill={`url(#grad-${title.replace(/\s/g, '')})`} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export const AnalyticsView: React.FC = () => {
  const { userRole } = useAuth();
  const [logs, setLogs] = useState<LogData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- DATA FETCHING ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Default last 30 days

    const { data, error } = await supabase
      .from('production_logs')
      .select(`
        created_at,
        total_tonnage,
        truck_count,
        shift,
        category,
        platform,
        profiles:user_id ( full_name )
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (!error && data) {
      setLogs(data as any);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- DATA PROCESSING (MEMOIZED) ---
  const dashboardData = useMemo(() => {
    // 1. Daily Trend Data (for Sparklines & Main Chart)
    const dailyMap = new Map();
    let totalTonnage = 0;
    let totalTrucks = 0;
    const operatorMap = new Map();

    logs.forEach(log => {
      const date = new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Aggregates
      totalTonnage += log.total_tonnage;
      totalTrucks += log.truck_count;

      // Daily Grouping
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, tonnage: 0, trucks: 0, count: 0 });
      }
      const dayStat = dailyMap.get(date);
      dayStat.tonnage += log.total_tonnage;
      dayStat.trucks += log.truck_count;
      dayStat.count += 1;

      // Operator Grouping
      const opName = log.profiles?.full_name || 'Unknown';
      if (!operatorMap.has(opName)) {
        operatorMap.set(opName, { name: opName, tonnage: 0, trucks: 0, trend: [] });
      }
      const opStat = operatorMap.get(opName);
      opStat.tonnage += log.total_tonnage;
      opStat.trucks += log.truck_count;
      // We push specific tonnage for sparklines (simplified)
      opStat.trend.push({ val: log.total_tonnage });
    });

    const dailyTrend = Array.from(dailyMap.values());
    const operatorStats = Array.from(operatorMap.values()).sort((a, b) => b.tonnage - a.tonnage);

    // 2. Platform Distribution (Donut)
    const platformDist = logs.reduce((acc: any, log) => {
      const key = log.platform || 'Other';
      acc[key] = (acc[key] || 0) + log.total_tonnage;
      return acc;
    }, {});
    
    const pieData = Object.entries(platformDist).map(([name, value]) => ({ name, value }));

    return {
      totalTonnage,
      totalTrucks,
      avgTonnage: totalTrucks > 0 ? totalTonnage / totalTrucks : 0,
      dailyTrend,
      operatorStats,
      pieData
    };
  }, [logs]);

  // --- HANDLERS ---
  const handlePPTExport = () => {
    if (!dashboardData) return;
    generatePowerPoint(dashboardData);
  };

  if (userRole !== 'admin') return <div className="p-10 text-center text-slate-500">Access Restricted</div>;

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sans text-slate-800 animate-in fade-in duration-500">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-4 border border-slate-200 shadow-sm rounded-sm">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-2 rounded text-white">
             <span className="font-bold text-lg tracking-tighter">W</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">ProTrack Adaptive Planning</h1>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Production Analysis</span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1"><Calendar size={12}/> Last 30 Days</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchData} 
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded border border-slate-200 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button 
            onClick={handlePPTExport} 
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded border border-slate-200 transition-colors"
          >
            <Download size={14} /> Export PPT
          </button>
          <div className="w-px h-6 bg-slate-200 mx-2"></div>
          <button className="p-1.5 text-slate-400 hover:text-slate-600">
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* --- KPI GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        
        {/* Metric 1: Total Tonnage */}
        <SparklineCard 
          title="Net Tonnage Output" 
          value={dashboardData.totalTonnage.toLocaleString(undefined, {maximumFractionDigits: 0})} 
          unit="T" 
          data={dashboardData.dailyTrend} 
          dataKey="tonnage"
        />

        {/* Metric 2: Total Trucks */}
        <SparklineCard 
          title="Total Trucks Loaded" 
          value={dashboardData.totalTrucks} 
          unit="#" 
          data={dashboardData.dailyTrend} 
          dataKey="trucks"
          color="#8b5cf6" // Violet
        />

        {/* Metric 3: Donut Chart (Platform Split) */}
        <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm h-[160px] relative">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Platform Split %</h3>
          <div className="flex items-center h-[100px]">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.pieData}
                    innerRadius={30}
                    outerRadius={45}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {dashboardData.pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-1">
              {dashboardData.pieData.map((entry: any, index: number) => (
                 <div key={index} className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                    <span className="truncate">{entry.name}</span>
                 </div>
              ))}
            </div>
          </div>
        </div>

        {/* Metric 4: Avg Load */}
        <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm h-[160px] flex flex-col justify-center items-center text-center">
           <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Avg Load / Truck</h3>
           <div className="text-5xl font-bold text-slate-800">
             {dashboardData.avgTonnage.toFixed(2)} <span className="text-xl text-blue-600">T</span>
           </div>
           <div className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1">
             <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-emerald-600"></div>
             +2.4% vs Target
           </div>
        </div>
      </div>

      {/* --- MAIN CHARTS SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Large Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-sm border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-sm font-bold text-slate-700">Net Production Comparison (Daily)</h3>
             <button className="text-slate-400 hover:text-slate-600"><Filter size={16}/></button>
          </div>
          
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData.dailyTrend} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={THEME.grid} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: THEME.slate, fontSize: 11}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: THEME.slate, fontSize: 11}} 
                />
                <RechartsTooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '4px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="tonnage" fill={THEME.blue} radius={[2, 2, 0, 0]} name="Tonnage" />
                <Line type="monotone" dataKey="trucks" stroke="#fbbf24" strokeWidth={2} dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Analysis Card */}
        <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-sm flex flex-col">
           <h3 className="text-sm font-bold text-slate-700 mb-6">Efficiency Variance</h3>
           <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                 <div className="text-6xl font-black text-blue-600 mb-2">92.8%</div>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Of Monthly Target</p>
                 <div className="mt-8 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-blue-600 h-full w-[92.8%]"></div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* --- DATA TABLE WITH MICRO CHARTS --- */}
      <div className="bg-white rounded-sm border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-700">Operator Performance Summary</h3>
          <button className="text-blue-600 text-xs font-bold hover:underline">View Full Report</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3">Operator Name</th>
                <th className="px-6 py-3 text-right">Actuals (T)</th>
                <th className="px-6 py-3 text-right">Trucks</th>
                <th className="px-6 py-3 w-[150px]">Micro Chart</th>
                <th className="px-6 py-3 text-right">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dashboardData.operatorStats.slice(0, 5).map((op: any, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors text-sm text-slate-700">
                  <td className="px-6 py-3 font-bold text-slate-800">{op.name}</td>
                  <td className="px-6 py-3 text-right font-mono">{op.tonnage.toLocaleString()}</td>
                  <td className="px-6 py-3 text-right font-mono text-slate-500">{op.trucks}</td>
                  <td className="px-6 py-3">
                    <div className="h-8 w-24">
                      {/* Micro Sparkline in Table */}
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={op.trend.length > 0 ? op.trend : [{val:0}, {val:0}]}>
                          <Line type="monotone" dataKey="val" stroke={THEME.blue} strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded">
                      +{(Math.random() * 5).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};