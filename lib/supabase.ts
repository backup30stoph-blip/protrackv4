import { createClient } from '@supabase/supabase-js';

// Safe environment variable access
const getEnvVar = (key: string) => {
  try {
    const meta = import.meta as any;
    if (meta && meta.env && meta.env[key]) {
      return meta.env[key];
    }
  } catch (e) {
    console.warn('Error accessing import.meta.env', e);
  }
  return '';
};

// Helper to clean keys of accidentally included quotes or whitespace
const cleanStr = (str: string) => str ? str.replace(/["']/g, '').trim() : '';

// Configuration
// Priority: 1. Environment Variable, 2. Hardcoded Fallback (Valid JWT)
const supabaseUrl = cleanStr(getEnvVar('VITE_SUPABASE_URL') || 'https://oqzfpyhazbnuxdpwkytt.supabase.co');
const supabaseAnonKey = cleanStr(getEnvVar('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xemZweWhhemJudXhkcHdreXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MDUwNTYsImV4cCI6MjA4NTQ4MTA1Nn0.CYMd_EIXbdrQuzXRGAgVFZ8KZl-fxA1Gs73UMF-0aTw');

// Check configuration status
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey && supabaseAnonKey.length > 20;

// --- MOCK DATA FOR OFFLINE MODE ---
const MOCK_USER = {
  id: 'demo-user-123',
  email: 'demo@protrack.com',
  user_metadata: { full_name: 'Demo Admin', username: 'admin' }
};

const MOCK_PROFILE = {
  id: MOCK_USER.id,
  role: 'admin',
  username: 'admin',
  full_name: 'Demo Admin',
  platform_assignment: 'BOTH'
};

const MOCK_LOGS = [
  {
    id: 'log-mock-1',
    created_at: new Date().toISOString(),
    user_id: MOCK_USER.id,
    category: 'EXPORT',
    shift: 'MORNING',
    article_code: '4301',
    platform: 'BIG_BAG',
    truck_count: 12,
    units_per_truck: 20,
    weight_per_unit: 1.1,
    total_tonnage: 264,
    bl_number: 'BL-DEMO-001',
    tc_number: 'TC-DEMO-99',
    destination: 'Marseille',
    profiles: MOCK_PROFILE
  },
  {
    id: 'log-mock-2',
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    user_id: MOCK_USER.id,
    category: 'LOCAL',
    shift: 'MORNING',
    article_code: '4500',
    platform: '50KG',
    truck_count: 5,
    units_per_truck: 600,
    weight_per_unit: 0.05,
    total_tonnage: 150,
    truck_matricul: '12345-A-1',
    profiles: MOCK_PROFILE
  }
];

const MOCK_DAILY_STATS = [
  {
    production_date: new Date().toISOString().split('T')[0],
    production_month: new Date().toISOString().slice(0, 7),
    production_year: new Date().getFullYear(),
    platform: 'BIG_BAG',
    category: 'EXPORT',
    total_trucks: 15,
    total_tonnage: 330,
    morning_tonnage: 110,
    afternoon_tonnage: 110,
    night_tonnage: 110,
    active_operators: 3
  },
  {
    production_date: new Date().toISOString().split('T')[0],
    production_month: new Date().toISOString().slice(0, 7),
    production_year: new Date().getFullYear(),
    platform: '50KG',
    category: 'LOCAL',
    total_trucks: 5,
    total_tonnage: 150,
    morning_tonnage: 150,
    afternoon_tonnage: 0,
    night_tonnage: 0,
    active_operators: 1
  }
];

// --- MOCK CLIENT FACTORY ---
const createMockClient = () => {
  console.warn("PROTRACK SYSTEM: Database disconnected or invalid keys. Running in MOCK MODE.");
  
  const mockChain = (data: any = []) => ({
    select: () => mockChain(data),
    insert: () => ({ select: () => ({ single: () => ({ data: data[0], error: null }), error: null }), error: null }),
    update: () => ({ eq: () => ({ error: null }), error: null }),
    delete: () => ({ eq: () => ({ error: null }), error: null }),
    eq: function(col: string, val: any) { 
        // Simple mock filtering for profiles
        if (col === 'id' && val === MOCK_USER.id) return mockChain([MOCK_PROFILE]);
        if (col === 'production_date') return mockChain(data); // Simple mock for date filter
        if (col === 'production_month') return mockChain(data);
        return this; 
    },
    gte: function() { return this; },
    lte: function() { return this; },
    ilike: function() { return this; },
    order: function() { return this; },
    limit: function() { return this; },
    maybeSingle: () => ({ data: null, error: null }),
    single: () => ({ data: data[0] || null, error: null }),
    then: (resolve: any) => resolve({ data, error: null })
  });

  return {
    auth: {
      getSession: async () => ({ data: { session: { user: MOCK_USER, access_token: 'mock' } }, error: null }),
      onAuthStateChange: (cb: any) => {
        setTimeout(() => cb('SIGNED_IN', { user: MOCK_USER }), 100);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signInWithPassword: async () => ({ data: { user: MOCK_USER, session: { user: MOCK_USER } }, error: null }),
      signOut: async () => ({ error: null }),
      updateUser: async () => ({ data: { user: MOCK_USER }, error: null }),
    },
    from: (table: string) => {
      if (table === 'production_logs') return mockChain(MOCK_LOGS);
      if (table === 'profiles') return mockChain([MOCK_PROFILE]);
      if (table === 'shipping_program') return mockChain([]);
      if (table === 'daily_production_stats') return mockChain(MOCK_DAILY_STATS);
      return mockChain([]);
    },
    rpc: () => ({ data: null, error: null }),
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
    }),
    removeChannel: () => {}
  } as any;
};

// Initialize real client if configured, otherwise use mock
export const supabase = isSupabaseConfigured 
  ? createClient(
      supabaseUrl, 
      supabaseAnonKey, 
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    ) 
  : createMockClient();