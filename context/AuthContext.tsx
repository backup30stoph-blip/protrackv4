import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.ts';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  userRole: 'admin' | 'operator' | null;
  username: string | null;
  fullName: string | null;
  platformAssignment: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  session: null, 
  userRole: null, 
  username: null, 
  fullName: null, 
  platformAssignment: null,
  loading: true, 
  signOut: async () => {},
  refreshProfile: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'operator' | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [platformAssignment, setPlatformAssignment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // 1. Get the session with a timeout race
        // This prevents the app from hanging if Supabase is unreachable or misconfigured (e.g. wrong API key)
        const sessionPromise = supabase.auth.getSession();
        
        // Timeout after 5 seconds to prevent white screen of death
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth Timeout')), 5000)
        );

        const { data } = await Promise.race([
          sessionPromise, 
          timeoutPromise
        ]) as { data: { session: Session | null }, error: any };
        
        if (mounted) {
           if (data?.session) {
             setSession(data.session);
             await fetchProfile(data.session.user.id);
           } else {
             // No session found, user needs to login
             // Ensure loading is set to false to show Login Page
             setLoading(false);
           }
        }
      } catch (err) {
        console.warn("Auth initialization timed out or failed:", err);
        // Critical: Release loading state so user sees Login screen instead of infinite spinner
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // 2. Listen for auth state changes (Sign In, Sign Out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      
      setSession(session);
      
      if (session?.user) {
        // If a new session starts (sign in), fetch profile
        // Note: fetchProfile handles setLoading(false) internally
        fetchProfile(session.user.id);
      } else {
        // If signed out, reset state immediately
        resetState();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, username, full_name, platform_assignment')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.warn("Profile fetch warning:", error.message);
        // Don't throw, allow app to proceed with basic auth info
      }

      if (data) {
        setUserRole(data.role);
        setUsername(data.username);
        setFullName(data.full_name || data.username);
        setPlatformAssignment(data.platform_assignment);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      // Ensure app unlocks
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  };

  const resetState = () => {
    setUserRole(null);
    setUsername(null);
    setFullName(null);
    setPlatformAssignment(null);
    setLoading(false);
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Sign out error", e);
    }
    resetState();
  };

  return (
    <AuthContext.Provider value={{ session, userRole, username, fullName, platformAssignment, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);