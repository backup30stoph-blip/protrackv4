import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Target, TrendingUp, Truck, Award, Flame, Loader2 } from 'lucide-react';

export const OperatorHUD: React.FC = () => {
  const { session, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    count: 0,
    tonnage: 0
  });

  // DAILY TARGET (Gamification)
  const DAILY_TARGET = 25; // Trucks per shift target

  const getIndustrialDayRange = () => {
    const now = new Date();
    // If we are before 06:00 AM, we are still in the "previous" industrial day
    if (now.getHours() < 6) {
      now.setDate(now.getDate() - 1);
    }
    
    // Start of shift: 06:00 AM today
    const start = new Date(now);
    start.setHours(6, 0, 0, 0);

    // End of shift: 06:00 AM tomorrow
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return { start: start.toISOString(), end: end.toISOString() };
  };

  const fetchProgress = async () => {
    if (!session?.user?.id) return;
    
    try {
      const { start, end } = getIndustrialDayRange();
      
      // Fetch logs for CURRENT USER in CURRENT INDUSTRIAL DAY
      const { data, error } = await supabase
        .from('production_logs')
        .select('total_tonnage, truck_count')
        .eq('user_id', session.user.id)
        .gte('created_at', start)
        .lt('created_at', end);

      if (error) throw error;

      const totalTrucks = data?.reduce((acc, curr) => acc + curr.truck_count, 0) || 0;
      const totalTonnage = data?.reduce((acc, curr) => acc + curr.total_tonnage, 0) || 0;

      setMetrics({ count: totalTrucks, tonnage: totalTonnage });
    } catch (err) {
      console.error('Error fetching HUD metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();

    // Real-time listener for THIS user's updates
    const channel = supabase
      .channel('hud_updates')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'production_logs', 
          filter: `user_id=eq.${session?.user?.id}` 
        },
        () => fetchProgress()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const progressPercentage = Math.min(100, Math.round((metrics.count / DAILY_TARGET) * 100));
  
  // Dynamic Color Logic
  let progressColor = 'bg-indigo-600';
  let textColor = 'text-indigo-600';
  if (progressPercentage >= 100) {
    progressColor = 'bg-emerald-500';
    textColor = 'text-emerald-600';
  } else if (progressPercentage >= 75) {
     progressColor = 'bg-blue-600';
     textColor = 'text-blue-600';
  }

  if (loading) return null; // Or a small skeleton

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-6 mb-8 border border-slate-700 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-4">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Target size={120} />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* LEFT: MAIN COUNTER */}
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-2xl bg-slate-800 border border-slate-700 shadow-inner ${progressPercentage >= 100 ? 'text-emerald-400' : 'text-indigo-400'}`}>
            {progressPercentage >= 100 ? <Award size={32} /> : <Truck size={32} />}
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Shift Output</div>
            <div className="text-4xl font-black font-mono tracking-tighter">
              {metrics.count} <span className="text-lg text-slate-500 font-bold">/ {DAILY_TARGET}</span>
            </div>
            <div className="text-xs font-bold text-slate-500 mt-0.5">
              {metrics.tonnage.toFixed(1)} T Total Volume
            </div>
          </div>
        </div>

        {/* CENTER: PROGRESS BAR */}
        <div className="flex-1 w-full max-w-md">
           <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                {progressPercentage >= 100 ? <Flame size={14} className="text-emerald-500 animate-pulse" /> : <TrendingUp size={14} />}
                Daily Goal
              </span>
              <span className={`text-xl font-black ${progressPercentage >= 100 ? 'text-emerald-400' : 'text-white'}`}>
                {progressPercentage}%
              </span>
           </div>
           <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
              <div 
                className={`h-full ${progressColor} transition-all duration-1000 ease-out relative`} 
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
              </div>
           </div>
        </div>

        {/* RIGHT: STATUS */}
        <div className="hidden md:block text-right">
           <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Status</div>
           {progressPercentage >= 100 ? (
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black uppercase">
               Goal Reached
             </div>
           ) : progressPercentage >= 50 ? (
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-black uppercase">
               On Track
             </div>
           ) : (
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-black uppercase">
               Starting Up
             </div>
           )}
        </div>

      </div>
    </div>
  );
};