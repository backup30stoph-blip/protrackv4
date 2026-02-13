import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { ProductionLog } from '../types.ts';
import { SHIFTS } from '../constants.ts';
import { formatNumber } from '../utils/calculations.ts';
import { TrendingUp, Scale, Truck, Briefcase } from 'lucide-react';

interface DashboardProps {
  orders: ProductionLog[];
}

// COSUMAR PALETTE FOR CHARTS
const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6']; // Gold, Blue, Emerald, Red, Purple

const Dashboard: React.FC<DashboardProps> = ({ orders }) => {
  // 1. Safe Empty State
  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-500 bg-blue-950/20 rounded-xl border border-blue-900/30 border-dashed animate-in fade-in">
        <Scale size={48} className="mb-4 opacity-50 text-blue-400" />
        <h3 className="text-lg font-bold text-blue-200">No Analytics Data</h3>
        <p className="text-sm">Record production entries to generate insights.</p>
      </div>
    );
  }

  const totalTonnage = orders.reduce((sum, o) => sum + o.total_tonnage, 0);
  const totalTrucks = orders.reduce((sum, o) => sum + o.truck_count, 0);

  const activeDossiers = new Set(
    orders
      .filter(o => o.category === 'EXPORT' && o.file_number)
      .map(o => o.file_number)
  ).size;

  const shiftData = SHIFTS.map(shift => {
    const shiftOrders = orders.filter(o => o.shift === shift.id);
    return {
      name: shift.shortLabel,
      tonnage: shiftOrders.reduce((sum, o) => sum + o.total_tonnage, 0)
    };
  });

  const categoryDataRaw = orders.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.total_tonnage;
    return acc;
  }, {} as Record<string, number>);

  const categoryData = Object.entries(categoryDataRaw).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-950/40 p-5 rounded-xl border border-blue-800/50 flex items-center justify-between shadow-lg hover:border-cosumar-gold/30 transition-colors group">
           <div>
             <p className="text-[10px] uppercase font-bold text-blue-300 tracking-wider group-hover:text-cosumar-gold transition-colors">Total Output</p>
             <h3 className="text-2xl font-black text-white mt-1">{formatNumber(totalTonnage)} <span className="text-sm text-blue-400 font-medium">T</span></h3>
           </div>
           <div className="bg-blue-950 p-3 rounded-lg text-cosumar-gold border border-blue-900 shadow-inner">
             <Scale size={24} />
           </div>
        </div>

        <div className="bg-blue-950/40 p-5 rounded-xl border border-blue-800/50 flex items-center justify-between shadow-lg hover:border-cosumar-gold/30 transition-colors group">
           <div>
             <p className="text-[10px] uppercase font-bold text-blue-300 tracking-wider group-hover:text-cosumar-gold transition-colors">Total Trucks</p>
             <h3 className="text-2xl font-black text-white mt-1">{totalTrucks}</h3>
           </div>
           <div className="bg-blue-950 p-3 rounded-lg text-emerald-400 border border-blue-900 shadow-inner">
             <Truck size={24} />
           </div>
        </div>

        <div className="bg-blue-950/40 p-5 rounded-xl border border-blue-800/50 flex items-center justify-between shadow-lg hover:border-cosumar-gold/30 transition-colors group">
           <div>
             <p className="text-[10px] uppercase font-bold text-blue-300 tracking-wider group-hover:text-cosumar-gold transition-colors">Avg Tonnage/Load</p>
             <h3 className="text-2xl font-black text-white mt-1">
               {totalTrucks > 0 ? formatNumber(totalTonnage / totalTrucks) : '0'} <span className="text-sm text-blue-400 font-medium">T</span>
             </h3>
           </div>
           <div className="bg-blue-950 p-3 rounded-lg text-amber-400 border border-blue-900 shadow-inner">
             <TrendingUp size={24} />
           </div>
        </div>

        <div className="bg-blue-950/40 p-5 rounded-xl border border-blue-800/50 flex items-center justify-between shadow-lg hover:border-cosumar-gold/30 transition-colors group">
           <div>
             <p className="text-[10px] uppercase font-bold text-blue-300 tracking-wider group-hover:text-cosumar-gold transition-colors">Active Dossiers</p>
             <h3 className="text-2xl font-black text-white mt-1">{activeDossiers}</h3>
           </div>
           <div className="bg-blue-950 p-3 rounded-lg text-blue-400 border border-blue-900 shadow-inner">
             <Briefcase size={24} />
           </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Bar Chart: Shift Performance */}
        <div className="bg-blue-950/40 p-6 rounded-2xl border border-blue-900/50 shadow-lg flex flex-col">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-6 border-l-4 border-cosumar-gold pl-3">Production by Shift</h3>
          {/* Robust Container: Explicit Height (h-64 = 256px) and Width required for Recharts */}
          <div className="h-64 min-h-[16rem] w-full min-w-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shiftData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" stroke="#60a5fa" tick={{fontSize: 12, fontWeight: 600}} tickLine={false} axisLine={false} />
                <YAxis stroke="#60a5fa" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#1e3a8a', color: '#f8fafc', borderRadius: '8px' }}
                  itemStyle={{ color: '#f59e0b' }}
                  cursor={{ fill: '#1e3a8a', opacity: 0.2 }}
                />
                <Bar dataKey="tonnage" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Category Distribution */}
        <div className="bg-blue-950/40 p-6 rounded-2xl border border-blue-900/50 shadow-lg flex flex-col">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-6 border-l-4 border-cosumar-gold pl-3">Category Distribution</h3>
          {/* Robust Container */}
          <div className="h-64 min-h-[16rem] w-full min-w-0 relative">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#020617', borderColor: '#1e3a8a', color: '#f8fafc', borderRadius: '8px' }}
                   itemStyle={{ color: '#f1f5f9' }}
                />
                <Legend 
                  iconType="circle" 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right"
                  formatter={(value) => <span className="text-slate-300 text-xs font-bold ml-1">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;