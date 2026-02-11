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

-- Trigger to create profile on signup (Handles Auth -> Public Profile sync)
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
  platform_type text, -- Legacy
  
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
  truck_matricul text
);

-- Add Foreign Key if missing (Safe Migration)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'production_logs' and column_name = 'user_id') then
    alter table production_logs add column user_id uuid references public.profiles(id);
  end if;
end $$;

-- 1b. Shipping Program Table
create table if not exists shipping_program (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  external_id serial, 
  
  file_number text not null unique, 
  sap_order_code text,
  destination text,
  shipping_line text,
  platform_section text, -- 'BIG_BAG' or '50KG'
  
  planned_count int default 0,
  planned_quantity numeric(10, 3) default 0,
  
  start_date_raw text,
  deadline_raw text,
  
  special_instructions text, 
  status text check (status in ('PENDING', 'IN_PROGRESS', 'COMPLETED')) default 'PENDING'
);

-- 2. Performance Indexes
create index if not exists idx_production_logs_created_at on production_logs (created_at desc);
create index if not exists idx_production_logs_file_number on production_logs (file_number);
create index if not exists idx_shipping_program_file_number on shipping_program (file_number);

-- 3. Row Level Security (RLS)
alter table production_logs enable row level security;
alter table shipping_program enable row level security;

-- 4. Access Policies
drop policy if exists "Enable all access for all users" on production_logs;
create policy "Enable all access for all users" on production_logs for all using (true) with check (true);

drop policy if exists "Authenticated users can view program" on shipping_program;
drop policy if exists "Enable all access for all users" on shipping_program;
create policy "Authenticated users can view program" on shipping_program for select to authenticated using (true);
create policy "Enable insert/update for all users" on shipping_program for all using (true) with check (true);

-- ==========================================
-- 5. AUTOMATIC REPORTING VIEWS
-- ==========================================

DROP VIEW IF EXISTS public.daily_production_stats;

CREATE OR REPLACE VIEW public.daily_production_stats AS
WITH formatted_logs AS (
    SELECT 
        *,
        -- 1. ADJUST THE DATE: If hour < 06:00, it belongs to yesterday
        CASE 
            WHEN EXTRACT(HOUR FROM created_at) < 6 THEN (created_at - INTERVAL '1 day')::date
            ELSE created_at::date
        END as production_date,
        -- 2. EXTRACT MONTH & YEAR for easy filtering
        TO_CHAR(
            CASE 
                WHEN EXTRACT(HOUR FROM created_at) < 6 THEN (created_at - INTERVAL '1 day')
                ELSE created_at
            END, 'YYYY-MM'
        ) as production_month,
        EXTRACT(YEAR FROM 
            CASE 
                WHEN EXTRACT(HOUR FROM created_at) < 6 THEN (created_at - INTERVAL '1 day')
                ELSE created_at
            END
        ) as production_year
    FROM public.production_logs
)
SELECT 
    -- Grouping Keys
    production_date,
    production_month,
    production_year,
    platform,       
    category,       

    -- Aggregate Metrics
    COUNT(id) as total_trucks,
    SUM(total_tonnage) as total_tonnage,
    
    -- Shift Breakdowns (Pivot)
    SUM(CASE WHEN shift = 'MORNING' THEN total_tonnage ELSE 0 END) as morning_tonnage,
    SUM(CASE WHEN shift IN ('AFTERNOON', 'EVENING') THEN total_tonnage ELSE 0 END) as afternoon_tonnage,
    SUM(CASE WHEN shift = 'NIGHT' THEN total_tonnage ELSE 0 END) as night_tonnage,
    
    -- Operator count (Distinct people who worked that day)
    COUNT(DISTINCT user_id) as active_operators

FROM formatted_logs
GROUP BY 
    production_date, 
    production_month, 
    production_year, 
    platform, 
    category;

-- Grant access to your frontend
GRANT SELECT ON public.daily_production_stats TO authenticated;
GRANT SELECT ON public.daily_production_stats TO anon;

-- ==========================================
-- HELPER FUNCTIONS & TRIGGERS
-- ==========================================

-- Trigger to decrease planned count in shipping program
CREATE OR REPLACE FUNCTION public.decrease_container_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.shipping_program
  SET planned_count = planned_count - NEW.truck_count
  WHERE file_number = NEW.file_number;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_planned_count_trigger ON public.production_logs;
CREATE TRIGGER update_planned_count_trigger
AFTER INSERT ON public.production_logs
FOR EACH ROW
EXECUTE FUNCTION public.decrease_container_count();

-- Trigger to auto-activate program status
CREATE OR REPLACE FUNCTION public.auto_activate_program()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shipping_program
  SET status = 'IN_PROGRESS'
  WHERE file_number = NEW.file_number
  AND status = 'PENDING';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_activate_program ON public.production_logs;
CREATE TRIGGER trigger_activate_program
AFTER INSERT ON public.production_logs
FOR EACH ROW
EXECUTE FUNCTION public.auto_activate_program();

-- Function to check dossier platform (Used by EntryForm)
CREATE OR REPLACE FUNCTION public.check_dossier_platform(lookup_number text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  select platform_section from shipping_program where file_number = lookup_number limit 1;
$$;