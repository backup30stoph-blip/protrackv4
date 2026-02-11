import React, { useState } from 'react';
import { supabase } from '../../lib/supabase.ts';
import { X, Lock, Save, User, ShieldCheck, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { username, fullName, userRole, session, refreshProfile } = useAuth();
  
  // Profile State
  const [displayName, setDisplayName] = useState(fullName || username || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Real-time Profile Update Handler
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || displayName === fullName) return;

    setIsUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: displayName })
        .eq('id', session?.user.id);

      if (error) throw error;

      await refreshProfile(); // Instant update in UI
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 2000);
    } catch (err) {
      console.error("Error updating profile", err);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err.message });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <User className="text-indigo-600 w-6 h-6" /> Account Settings
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 p-2 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* SECTION 1: USER PROFILE */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
             <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">User Profile</h3>
                {userRole && (
                  <span className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                    {userRole}
                  </span>
                )}
             </div>

             {/* Email Field (Read Only) */}
             <div className="relative group opacity-80 hover:opacity-100 transition-opacity">
               <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                 <ShieldCheck className="w-4 h-4 text-emerald-500" />
               </div>
               <input 
                 type="text" 
                 value={session?.user.email} 
                 readOnly 
                 className="w-full bg-white border border-slate-200 rounded-lg px-3 py-3 text-slate-500 text-sm font-mono focus:outline-none select-all cursor-default"
               />
             </div>

             {/* Name Field (Editable) */}
             <form onSubmit={handleUpdateProfile} className="relative">
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter Operator Name"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-3 text-slate-900 text-sm font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all pr-10 placeholder-slate-400"
                />
                <button 
                  type="submit"
                  disabled={isUpdatingProfile || displayName === fullName}
                  className="absolute inset-y-0 right-0 px-3 flex items-center justify-center text-indigo-500 hover:text-indigo-700 disabled:opacity-0 transition-all"
                  title="Save Name"
                >
                    {isUpdatingProfile ? (
                      <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                </button>
             </form>
             {profileSuccess && (
               <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 animate-pulse px-1">
                 <CheckCircle size={10} /> Profile name updated successfully
               </div>
             )}
          </div>

          {/* SECTION 2: CHANGE PASSWORD */}
          <div className="space-y-3 pt-2">
            <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 mb-2">
              <Lock size={12} /> Change Password
            </h3>
            
            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors text-sm"
              />
              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors text-sm"
              />

              {passwordMessage && (
                <div className={`text-xs font-bold p-3 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-1 ${
                  passwordMessage.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                    : 'bg-rose-50 text-rose-600 border border-rose-200'
                }`}>
                  {passwordMessage.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  {passwordMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdatingPassword || !newPassword}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-wider py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isUpdatingPassword ? 'Updating...' : <><Save size={16} /> UPDATE PASSWORD</>}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};