

-- ==========================================
-- PROTRACK: Industrial Production Log Schema
-- ==========================================

-- 0. Profiles Table (CRITICAL: Must exist for Auth & Operator Tracking)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  username text,
  full_name text,
  role text default 'operator' check (role in ('admin', 'operator')),
  platform_assignment text check (platform_assignment in ('BIG_BAG', '50KG', 'BOTH')) default 'BIG_BAG',
  created_at timestamptz default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Policies for Profiles
drop policy if exists "Public profiles are viewable by everyone" on profiles;
create policy "Public profiles are viewable by everyone" on profiles for select using ( true );

drop policy if exists "Users can insert their own profile" on profiles;
create policy "Users can insert their own profile" on profiles for insert with check ( auth.uid() = id );

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles for update using ( auth.uid() = id );

-- Trigger to create profile on signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, username, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'username', 
    new.raw_user_meta_data->>'full_name', 
    'operator'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 1. Production Logs Table
create table if not exists production_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  
  -- Link to Profile (Operator)
  user_id uuid references public.profiles(id),
  
  -- Core Dimensions
  category text not null check (category in ('EXPORT', 'LOCAL', 'DEBARDAGE')),
  shift text not null check (shift in ('MORNING', 'AFTERNOON', 'NIGHT', 'EVENING')),
  article_code text not null,
  platform text not null default 'BIG_BAG', 
  
  -- Quantitative Metrics
  truck_count int not null check (truck_count > 0),
  units_per_truck int, 
  weight_per_unit numeric(10, 3) not null, 
  total_tonnage numeric(12, 3) not null,   
  
  -- Optional Operational Data
  reste_count int default 0,
  pallet_type text,
  
  -- Logistics Data
  bl_number text,
  tc_number text,
  seal_number text,

  -- Extended Export Program Data
  file_number text,
  booking_ref text,
  customer text,
  maritime_agent text,
  destination text,
  sap_code text,

  -- Local Market Data
  truck_matricul text,

  -- New Fields for Evidence and Notes
  images text[], -- Array of base64 strings or URLs
  comments text  -- Observations or special instructions
);

-- Performance Indexes
create index if not exists idx_production_logs_created_at on production_logs (created_at desc);
create index if not exists idx_production_logs_file_number on production_logs (file_number);
create index if not exists idx_shipping_program_file_number on shipping_program (file_number);

-- Row Level Security (RLS)
alter table production_logs enable row level security;
drop policy if exists "Enable all access for all users" on production_logs;
create policy "Enable all access for all users" on production_logs for all using (true) with check (true);

-- 1b. Shipping Program Table
create table if not exists shipping_program (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  external_id serial, 
  file_number text not null unique, 
  sap_order_code text,
  destination text,
  shipping_line text,
  platform_section text, 
  planned_count int default 0,
  planned_quantity numeric(10, 3) default 0,
  start_date_raw text,
  deadline_raw text,
  special_instructions text, 
  status text check (status in ('PENDING', 'IN_PROGRESS', 'COMPLETED')) default 'PENDING'
);

alter table shipping_program enable row level security;
drop policy if exists "Authenticated users can view program" on shipping_program;
create policy "Authenticated users can view program" on shipping_program for select to authenticated using (true);
create policy "Enable insert/update for all users" on shipping_program for all using (true) with check (true);

-- Functions & Triggers (same as before)
CREATE OR REPLACE FUNCTION public.decrease_container_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.shipping_program
  SET planned_count = planned_count - NEW.truck_count
  WHERE file_number = NEW.file_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_planned_count_trigger ON public.production_logs;
CREATE TRIGGER update_planned_count_trigger
AFTER INSERT ON public.production_logs
FOR EACH ROW
EXECUTE FUNCTION public.decrease_container_count();

-- ==========================================
-- 2. Smart Alerts & Operator HUD Updates
-- ==========================================

-- Add columns to help with Smart Alerts and Sorting
ALTER TABLE public.shipping_program
ADD COLUMN IF NOT EXISTS priority_flag BOOLEAN DEFAULT FALSE, -- Manually flagged 'Hot' files
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW(), -- To find stale dossiers
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ; -- To filter out old history quickly

-- Index for the "Closing Soon" query
CREATE INDEX IF NOT EXISTS idx_shipping_program_planned_count 
ON public.shipping_program (planned_count) 
WHERE status != 'COMPLETED';

-- Index for the Operator HUD (Queries by User + Date + Shift)
CREATE INDEX IF NOT EXISTS idx_production_logs_user_date 
ON public.production_logs (user_id, created_at DESC);

-- Index for the Analytics View (Queries by Date Range)
CREATE INDEX IF NOT EXISTS idx_production_logs_created_at_brin
ON public.production_logs USING BRIN (created_at);

-- ==========================================
-- 3. Shift Targets Table (For Operator HUD)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.shift_targets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    platform TEXT NOT NULL, -- 'BIG_BAG' or '50KG'
    shift TEXT NOT NULL,    -- 'MORNING', 'AFTERNOON', 'NIGHT'
    target_trucks INTEGER DEFAULT 25,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(platform, shift) -- Only one target per shift type
);

-- Insert default targets
INSERT INTO public.shift_targets (platform, shift, target_trucks) VALUES
('BIG_BAG', 'MORNING', 25),
('BIG_BAG', 'AFTERNOON', 25),
('BIG_BAG', 'NIGHT', 20),
('50KG', 'MORNING', 15),
('50KG', 'AFTERNOON', 15),
('50KG', 'NIGHT', 10)
ON CONFLICT (platform, shift) DO NOTHING;

-- Enable RLS
ALTER TABLE public.shift_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read targets" ON public.shift_targets;
CREATE POLICY "Read targets" ON public.shift_targets FOR SELECT USING (true);

-- ==========================================
-- 4. Create a "Smart View" for Admins
-- ==========================================

DROP VIEW IF EXISTS public.shipping_program_dashboard;

CREATE VIEW public.shipping_program_dashboard WITH (security_invoker = true) AS
SELECT 
    sp.id,
    sp.file_number,
    sp.destination,
    sp.planned_count,
    sp.status,
    
    -- Total Loaded
    COALESCE(sum(pl.truck_count), 0)::bigint AS total_loaded,
    
    -- Remaining
    GREATEST(0::bigint, sp.planned_count - COALESCE(sum(pl.truck_count), 0)::bigint) AS remaining_trucks,
    
    -- Loaded Today
    COALESCE(sum(
        CASE
            WHEN pl.created_at >= CURRENT_DATE THEN pl.truck_count
            ELSE 0
        END), 0)::bigint AS loaded_today

FROM public.shipping_program sp
LEFT JOIN public.production_logs pl ON sp.file_number = pl.file_number
WHERE sp.status <> 'COMPLETED'
GROUP BY sp.id, sp.file_number, sp.destination, sp.planned_count, sp.status;
