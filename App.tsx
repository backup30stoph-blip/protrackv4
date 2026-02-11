import React, { Component, useState, useEffect, ReactNode } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { LoginPage } from './components/auth/LoginPage.tsx';
import { SettingsModal } from './components/auth/SettingsModal.tsx';
import { PlatformSelector } from './components/ui/PlatformSelector.tsx';
import { EntryForm } from './components/forms/EntryForm.tsx';
import { HistoryView } from './components/history/HistoryView.tsx';
import { AnalyticsView } from './components/analytics/AnalyticsView.tsx';
import { ProgramView } from './components/history/ProgramView.tsx';
import { LogisticsMonitor } from './components/analytics/LogisticsMonitor.tsx';
import { PlatformType, ProductionLog } from './types.ts';
import { isSupabaseConfigured } from './lib/supabase.ts';
import { 
  LogOut, 
  Loader2, 
  Settings, 
  LayoutDashboard, 
  History, 
  Database, 
  ArrowLeft,
  PieChart,
  Anchor,
  WifiOff
} from 'lucide-react';

type ViewState = 'ENTRY' | 'HISTORY' | 'ANALYTICS' | 'PROGRAM' | 'MONITOR';

// Wrapper Component to handle Auth Logic & Layout
const AppContent = () => {
  const { session, loading, signOut, username, userRole, fullName } = useAuth(); 
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | null>(null);
  const [view, setView] = useState<ViewState>('ENTRY');
  
  const [showSettings, setShowSettings] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ProductionLog | null>(null);
  const [isPlatformLocked, setIsPlatformLocked] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) return;

    const upperName = username ? username.toUpperCase() : '';
    const userEmail = session.user.email ? session.user.email.toUpperCase() : '';

    if (userRole === 'admin') {
      setIsPlatformLocked(false);
      setView((v) => (v === 'ENTRY' ? 'HISTORY' : v));
      return;
    }

    if (upperName.includes('BIGBAG') || userEmail.includes('BACKUP30STOPH')) {
      setSelectedPlatform('BIG_BAG');
      setIsPlatformLocked(true);
    } 
    else if (upperName.includes('50KG')) {
      setSelectedPlatform('50KG');
      setIsPlatformLocked(true);
    } 
    else {
      setIsPlatformLocked(false);
    }
  }, [username, userRole, loading, session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-slate-800">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Initializing System...</span>
      </div>
    );
  }

  if (!session) return <LoginPage />;

  const handleEditRequest = (order: ProductionLog) => {
    setEditingOrder(order);
    setSelectedPlatform(order.platform);
    setView('ENTRY');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditComplete = () => {
    setEditingOrder(null);
    if (!isPlatformLocked) {
       setSelectedPlatform(null);
    }
    if (userRole === 'admin') {
      setView('HISTORY');
    }
  };

  const handleEditCancel = () => {
    setEditingOrder(null);
    if (!isPlatformLocked) {
       setSelectedPlatform(null);
    }
    if (userRole === 'admin') {
      setView('HISTORY');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 pb-10">
      
      {/* OFFLINE/DEMO BANNER */}
      {!isSupabaseConfigured && (
        <div className="bg-amber-50 text-white px-4 py-1 text-center text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
           <WifiOff size={14} /> DEMO MODE: DATABASE DISCONNECTED
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* HEADER */}
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-4">
            {/* Logo Area */}
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg shadow-md shadow-indigo-200 text-white">
                <LayoutDashboard size={20} />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                  PRO<span className="text-indigo-600">TRACK</span>
                </h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                  Logistics OS {selectedPlatform && `:: ${selectedPlatform.replace('_', ' ')}`}
                </p>
              </div>
            </div>
          </div>
          
          {/* User Controls */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-800">{fullName || username}</div>
              <div className="text-[10px] uppercase font-bold text-indigo-500">{userRole}</div>
            </div>
            
            <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                title="Account Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              <button 
                onClick={() => { setSelectedPlatform(null); signOut(); }}
                className="p-2.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* VIEW NAVIGATION (Visible if platform selected or admin) */}
        {(selectedPlatform || userRole === 'admin') && (
           <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
              {[
                { id: 'ENTRY', label: 'Entry Log', icon: LayoutDashboard, show: userRole !== 'admin' },
                { id: 'HISTORY', label: 'History', icon: History, show: true },
                { id: 'PROGRAM', label: 'Schedule', icon: Database, show: true },
                { id: 'MONITOR', label: 'Logistics Monitor', icon: Anchor, show: userRole === 'admin' },
                { id: 'ANALYTICS', label: 'Insights', icon: PieChart, show: userRole === 'admin' },
              ].filter(t => t.show).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id as ViewState)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                    view === tab.id
                      ? 'bg-indigo-600 text-white shadow-indigo-200 ring-2 ring-indigo-100'
                      : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200 hover:border-indigo-200'
                  }`}
                >
                  <tab.icon className={`w-4 h-4 ${view === tab.id ? 'text-white' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              ))}
           </div>
        )}

        {/* CONTENT AREA */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {view === 'ENTRY' && !selectedPlatform && userRole !== 'admin' ? (
            <PlatformSelector onSelect={setSelectedPlatform} />
          ) : (
            <>
               {view === 'ENTRY' && !editingOrder && !isPlatformLocked && userRole !== 'admin' && (
                 <button 
                   onClick={() => setSelectedPlatform(null)}
                   className="mb-6 group flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors pl-1"
                 >
                   <div className="p-1 rounded bg-slate-200 group-hover:bg-indigo-100 transition-colors">
                     <ArrowLeft className="w-3 h-3 text-slate-600 group-hover:text-indigo-600" />
                   </div>
                   SWITCH PLATFORM
                 </button>
               )}

               {view === 'ENTRY' && selectedPlatform && (
                 <EntryForm 
                   platform={selectedPlatform} 
                   initialData={editingOrder}
                   onSuccess={handleEditComplete}
                   onCancel={handleEditCancel}
                 />
               )}
               
               {view === 'HISTORY' && <HistoryView onEdit={handleEditRequest} />}
               
               {view === 'ANALYTICS' && <AnalyticsView />}
               
               {view === 'PROGRAM' && <ProgramView />}

               {view === 'MONITOR' && <LogisticsMonitor />}
            </>
          )}
        </div>

      </main>

      {/* FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-slate-200 text-[10px] text-slate-500 p-1 text-center font-mono pointer-events-none z-[100] hidden sm:block">
        Session: <span className="text-slate-800 font-bold">{username || session.user.email}</span> • Mode: <span className={isPlatformLocked ? 'text-amber-600 font-bold' : 'text-slate-400'}>{isPlatformLocked ? 'LOCKED' : 'MANUAL'}</span>
      </div>
    </div>
  );
};

// Error Boundary Implementation
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Fixed ErrorBoundary inheritance by using Component directly to ensure 'this.props' is correctly typed within the class instance
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
           <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-rose-100">
             <h2 className="text-xl font-black text-rose-600 mb-4">Application Error</h2>
             <p className="text-slate-600 mb-4">Something went wrong while rendering the application.</p>
             <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-xs overflow-auto mb-6">
               {this.state.error?.message}
             </pre>
             <button onClick={() => window.location.reload()} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500">
               Reload Application
             </button>
           </div>
        </div>
      );
    }
    // Correctly accessing 'this.props' from the Component base class
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
