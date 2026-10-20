-- RigDesk Phase 3: owner tools tables + RLS

create type public.consignment_fee_type as enum ('flat', 'percent', 'over_net');
create type public.payout_status as enum ('pending', 'partial', 'paid');
create type public.appraisal_condition as enum ('excellent', 'good', 'fair', 'rough');

-- When truck became Available (time-to-line)
alter table public.trucks
  add column if not exists available_at timestamptz;

-- Refresh trucks_visible to include available_at
create or replace view public.trucks_visible
with (security_invoker = true)
as
select
  id, created_at, created_by, stock_no, vin, year, make, model, type, miles,
  engine, hp, transmission, ratio, axles, apu, color, lot_location, status,
  case when public.can_see_financials() then purchase_price end as purchase_price,
  purchase_date, source, asking_price,
  case when public.can_see_financials() then min_price end as min_price,
  sales_rep_id, notes, hold_expires_at, available_at
from public.trucks;

-- Owner override when selling without title in hand
alter table public.deals
  add column if not exists title_override_by uuid references public.profiles (id),
  add column if not exists title_override_at timestamptz;

-- rep_goals
create table public.rep_goals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  sales_rep_id uuid not null references public.profiles (id) on delete cascade,
  month date not null,
  target_units int not null default 0 check (target_units >= 0),
  target_profit numeric(12,2) not null default 0 check (target_profit >= 0),
  unique (sales_rep_id, month)
);
create index rep_goals_month_idx on public.rep_goals (month);
create trigger rep_goals_created_by
  before insert on public.rep_goals
  for each row execute function public.set_created_by();

-- floor_plan
create table public.floor_plan (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  truck_id uuid not null unique references public.trucks (id) on delete cascade,
  lender_name text not null,
  financed_amount numeric(12,2) not null check (financed_amount >= 0),
  daily_interest_rate numeric(8,6) not null check (daily_interest_rate >= 0),
  start_date date not null default current_date,
  next_curtailment_date date
);
create index floor_plan_curtailment_idx on public.floor_plan (next_curtailment_date);
create trigger floor_plan_created_by
  before insert on public.floor_plan
  for each row execute function public.set_created_by();

-- ecm_reports
create table public.ecm_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  truck_id uuid not null references public.trucks (id) on delete cascade,
  engine_hours numeric(12,1) not null check (engine_hours >= 0),
  idle_hours numeric(12,1) not null check (idle_hours >= 0),
  fault_codes text,
  file_path text
);
create index ecm_reports_truck_idx on public.ecm_reports (truck_id);
create trigger ecm_reports_created_by
  before insert on public.ecm_reports
  for each row execute function public.set_created_by();

-- appraisals
create table public.appraisals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  vin text not null,
  year int,
  make text,
  model text,
  miles int not null default 0 check (miles >= 0),
  condition public.appraisal_condition not null default 'good',
  expected_sale_price numeric(12,2) not null check (expected_sale_price >= 0),
  planned_prep numeric(12,2) not null default 0 check (planned_prep >= 0),
  target_profit numeric(12,2) not null default 0 check (target_profit >= 0),
  notes text
);
create index appraisals_vin_idx on public.appraisals (vin);
create trigger appraisals_created_by
  before insert on public.appraisals
  for each row execute function public.set_created_by();

-- key_log
create table public.key_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  truck_id uuid not null references public.trucks (id) on delete cascade,
  taken_by_id uuid references public.profiles (id),
  taken_by_name text not null,
  taken_at timestamptz not null default now(),
  returned_at timestamptz,
  notes text
);
create index key_log_truck_idx on public.key_log (truck_id);
create index key_log_open_idx on public.key_log (returned_at) where returned_at is null;
create trigger key_log_created_by
  before insert on public.key_log
  for each row execute function public.set_created_by();

-- consignments
create table public.consignments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  truck_id uuid not null references public.trucks (id) on delete cascade,
  owner_name text not null,
  agreed_net numeric(12,2) not null check (agreed_net >= 0),
  fee_type public.consignment_fee_type not null default 'percent',
  fee_value numeric(12,2) not null default 0 check (fee_value >= 0),
  end_date date,
  payout_status public.payout_status not null default 'pending',
  notes text
);
create index consignments_truck_idx on public.consignments (truck_id);
create trigger consignments_created_by
  before insert on public.consignments
  for each row execute function public.set_created_by();

-- titles
create table public.titles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  truck_id uuid not null unique references public.trucks (id) on delete cascade,
  location text not null default 'Unknown',
  due_date date,
  in_hand boolean not null default false,
  notes text
);
create index titles_due_idx on public.titles (due_date);
create trigger titles_created_by
  before insert on public.titles
  for each row execute function public.set_created_by();

-- test_drives (schema only; light UI on truck/tools)
create table public.test_drives (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  truck_id uuid not null references public.trucks (id) on delete cascade,
  driver_name text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text
);
create index test_drives_truck_idx on public.test_drives (truck_id);
create trigger test_drives_created_by
  before insert on public.test_drives
  for each row execute function public.set_created_by();

-- inventory audit
create table public.audit_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  completed_at timestamptz,
  notes text
);
create trigger audit_sessions_created_by
  before insert on public.audit_sessions
  for each row execute function public.set_created_by();

create table public.audit_scans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  session_id uuid not null references public.audit_sessions (id) on delete cascade,
  vin text not null,
  matched_truck_id uuid references public.trucks (id) on delete set null
);
create index audit_scans_session_idx on public.audit_scans (session_id);
create trigger audit_scans_created_by
  before insert on public.audit_scans
  for each row execute function public.set_created_by();

-- RLS helpers: owner/office for most owner tools; sales read-only where sensible
alter table public.rep_goals enable row level security;
alter table public.floor_plan enable row level security;
alter table public.ecm_reports enable row level security;
alter table public.appraisals enable row level security;
alter table public.key_log enable row level security;
alter table public.consignments enable row level security;
alter table public.titles enable row level security;
alter table public.test_drives enable row level security;
alter table public.audit_sessions enable row level security;
alter table public.audit_scans enable row level security;

-- rep_goals: owner manages; sales see own; office see all
create policy rep_goals_select on public.rep_goals for select to authenticated
  using (public.is_owner() or public.is_office() or (public.is_sales() and sales_rep_id = auth.uid()));
create policy rep_goals_write on public.rep_goals for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- floor_plan: owner/office
create policy floor_plan_select on public.floor_plan for select to authenticated
  using (public.is_owner() or public.is_office());
create policy floor_plan_write on public.floor_plan for all to authenticated
  using (public.is_owner() or public.is_office())
  with check (public.is_owner() or public.is_office());

-- ecm: owner/office/mechanic
create policy ecm_select on public.ecm_reports for select to authenticated
  using (public.is_owner() or public.is_office() or public.is_mechanic());
create policy ecm_write on public.ecm_reports for all to authenticated
  using (public.is_owner() or public.is_office() or public.is_mechanic())
  with check (public.is_owner() or public.is_office() or public.is_mechanic());

-- appraisals: owner/office/sales
create policy appraisals_select on public.appraisals for select to authenticated
  using (public.is_owner() or public.is_office() or public.is_sales());
create policy appraisals_write on public.appraisals for all to authenticated
  using (public.is_owner() or public.is_office() or public.is_sales())
  with check (public.is_owner() or public.is_office() or public.is_sales());

-- key_log: all staff
create policy key_log_select on public.key_log for select to authenticated
  using (public.is_staff());
create policy key_log_write on public.key_log for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- consignments: owner/office
create policy consignments_select on public.consignments for select to authenticated
  using (public.is_owner() or public.is_office());
create policy consignments_write on public.consignments for all to authenticated
  using (public.is_owner() or public.is_office())
  with check (public.is_owner() or public.is_office());

-- titles: owner/office
create policy titles_select on public.titles for select to authenticated
  using (public.is_owner() or public.is_office() or public.is_sales());
create policy titles_write on public.titles for all to authenticated
  using (public.is_owner() or public.is_office())
  with check (public.is_owner() or public.is_office());

-- test_drives: staff
create policy test_drives_select on public.test_drives for select to authenticated
  using (public.is_staff());
create policy test_drives_write on public.test_drives for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- audit: owner/office
create policy audit_sessions_select on public.audit_sessions for select to authenticated
  using (public.is_owner() or public.is_office());
create policy audit_sessions_write on public.audit_sessions for all to authenticated
  using (public.is_owner() or public.is_office())
  with check (public.is_owner() or public.is_office());
create policy audit_scans_select on public.audit_scans for select to authenticated
  using (public.is_owner() or public.is_office());
create policy audit_scans_write on public.audit_scans for all to authenticated
  using (public.is_owner() or public.is_office())
  with check (public.is_owner() or public.is_office());

-- Storage for ECM files
insert into storage.buckets (id, name, public)
values ('ecm-files', 'ecm-files', false)
on conflict (id) do nothing;

create policy ecm_storage on storage.objects
  for all to authenticated
  using (bucket_id = 'ecm-files' and (public.is_owner() or public.is_office() or public.is_mechanic()))
  with check (bucket_id = 'ecm-files' and (public.is_owner() or public.is_office() or public.is_mechanic()));
