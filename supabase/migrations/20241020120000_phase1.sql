-- RigDesk Phase 1 schema + RLS
create extension if not exists "pgcrypto";

create type public.app_role as enum ('owner', 'sales', 'mechanic', 'office');

create type public.truck_type as enum ('sleeper', 'day_cab', 'box_truck', 'trailer');
create type public.truck_status as enum (
  'incoming', 'in_prep', 'available', 'on_hold', 'sold', 'delivered'
);
create type public.truck_source as enum ('auction', 'fleet', 'trade_in', 'consignment', 'private');

create type public.photo_slot as enum (
  'front', 'driver_side', 'passenger_side', 'rear',
  'cab_interior', 'sleeper', 'dash', 'engine', 'tires', 'fifth_wheel'
);

create type public.prep_step_kind as enum (
  'mechanical_inspection', 'service_records', 'dot_inspection',
  'detailing', 'clean_title'
);

create type public.customer_type as enum ('owner_operator', 'fleet');

create type public.document_type as enum (
  'inspection_report', 'spec_sheet', 'dot_certificate', 'title',
  'deposit_receipt', 'buyer_order', 'bill_of_sale',
  'odometer_statement', 'delivery_checklist'
);
create type public.document_status as enum (
  'not_yet', 'waiting_for_signature', 'signed', 'in_hand'
);

create sequence public.truck_stock_seq start 2000;

create or replace function public.set_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles
  where id = auth.uid() and active = true;
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role() = 'owner';
$$;

create or replace function public.is_office()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role() = 'office';
$$;

create or replace function public.is_sales()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role() = 'sales';
$$;

create or replace function public.is_mechanic()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role() = 'mechanic';
$$;

create or replace function public.can_see_financials()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role() in ('owner', 'office');
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role() is not null;
$$;

-- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  name text not null,
  role public.app_role not null,
  active boolean not null default true
);

create index profiles_role_idx on public.profiles (role);
create index profiles_active_idx on public.profiles (active);

create trigger profiles_created_by
  before insert on public.profiles
  for each row execute function public.set_created_by();

-- trucks
create table public.trucks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  stock_no integer not null unique default nextval('public.truck_stock_seq'),
  vin text not null unique,
  year int not null check (year >= 1980 and year <= 2100),
  make text not null,
  model text not null,
  type public.truck_type not null,
  miles int not null default 0 check (miles >= 0),
  engine text,
  hp int check (hp is null or hp > 0),
  transmission text,
  ratio text,
  axles int,
  apu boolean not null default false,
  color text,
  lot_location text,
  status public.truck_status not null default 'incoming',
  purchase_price numeric(12,2) check (purchase_price is null or purchase_price >= 0),
  purchase_date date,
  source public.truck_source,
  asking_price numeric(12,2) check (asking_price is null or asking_price >= 0),
  min_price numeric(12,2) check (min_price is null or min_price >= 0),
  sales_rep_id uuid references public.profiles (id),
  notes text,
  hold_expires_at timestamptz
);

create index trucks_status_idx on public.trucks (status);
create index trucks_sales_rep_idx on public.trucks (sales_rep_id);
create index trucks_vin_idx on public.trucks (vin);
create index trucks_make_model_idx on public.trucks (make, model);

create trigger trucks_created_by
  before insert on public.trucks
  for each row execute function public.set_created_by();

create or replace view public.trucks_visible
with (security_invoker = true)
as
select
  id, created_at, created_by, stock_no, vin, year, make, model, type, miles,
  engine, hp, transmission, ratio, axles, apu, color, lot_location, status,
  case when public.can_see_financials() then purchase_price end as purchase_price,
  purchase_date, source, asking_price,
  case when public.can_see_financials() then min_price end as min_price,
  sales_rep_id, notes, hold_expires_at
from public.trucks;

-- truck_photos
create table public.truck_photos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  truck_id uuid not null references public.trucks (id) on delete cascade,
  slot public.photo_slot not null,
  file_path text not null,
  sort int not null default 0,
  unique (truck_id, slot)
);

create index truck_photos_truck_idx on public.truck_photos (truck_id);

create trigger truck_photos_created_by
  before insert on public.truck_photos
  for each row execute function public.set_created_by();

-- prep_steps
create table public.prep_steps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  truck_id uuid not null references public.trucks (id) on delete cascade,
  step public.prep_step_kind not null,
  assigned_role public.app_role not null,
  done boolean not null default false,
  done_by uuid references public.profiles (id),
  done_at timestamptz,
  photo_path text,
  unique (truck_id, step)
);

create index prep_steps_truck_idx on public.prep_steps (truck_id);
create index prep_steps_done_idx on public.prep_steps (done);

create trigger prep_steps_created_by
  before insert on public.prep_steps
  for each row execute function public.set_created_by();

-- costs
create table public.costs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  truck_id uuid references public.trucks (id) on delete set null,
  category text not null,
  vendor text,
  amount numeric(12,2) not null check (amount >= 0),
  date date not null default current_date,
  receipt_path text
);

create index costs_truck_idx on public.costs (truck_id);
create index costs_date_idx on public.costs (date);

create trigger costs_created_by
  before insert on public.costs
  for each row execute function public.set_created_by();

create or replace view public.costs_visible
with (security_invoker = true)
as
select
  id, created_at, created_by, truck_id, category, vendor,
  case when public.can_see_financials() then amount end as amount,
  date, receipt_path
from public.costs;

-- documents
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  truck_id uuid references public.trucks (id) on delete cascade,
  deal_id uuid,
  type public.document_type not null,
  status public.document_status not null default 'not_yet',
  file_path text
);

create index documents_truck_idx on public.documents (truck_id);

create trigger documents_created_by
  before insert on public.documents
  for each row execute function public.set_created_by();

-- customers
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  name text not null,
  type public.customer_type not null,
  fleet_size int check (fleet_size is null or fleet_size >= 0),
  phone text,
  email text,
  city text,
  state text,
  dot_number text,
  looking_for text,
  sales_rep_id uuid references public.profiles (id)
);

create index customers_sales_rep_idx on public.customers (sales_rep_id);
create index customers_name_idx on public.customers (name);

create trigger customers_created_by
  before insert on public.customers
  for each row execute function public.set_created_by();

-- activity_log
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  user_id uuid not null references public.profiles (id),
  truck_id uuid references public.trucks (id) on delete set null,
  action text not null
);

create index activity_log_created_at_idx on public.activity_log (created_at desc);
create index activity_log_truck_idx on public.activity_log (truck_id);
create index activity_log_user_idx on public.activity_log (user_id);

create trigger activity_log_created_by
  before insert on public.activity_log
  for each row execute function public.set_created_by();

-- Storage buckets
insert into storage.buckets (id, name, public)
values
  ('truck-photos', 'truck-photos', true),
  ('receipts', 'receipts', false),
  ('documents', 'documents', false)
on conflict (id) do nothing;

create policy truck_photos_storage_read on storage.objects
  for select to authenticated
  using (bucket_id = 'truck-photos');

create policy truck_photos_storage_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'truck-photos' and public.is_staff());

create policy truck_photos_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'truck-photos' and public.is_staff());

create policy receipts_storage on storage.objects
  for all to authenticated
  using (bucket_id = 'receipts' and (public.is_owner() or public.is_office() or public.is_mechanic()))
  with check (bucket_id = 'receipts' and (public.is_owner() or public.is_office() or public.is_mechanic()));

create policy documents_storage on storage.objects
  for all to authenticated
  using (bucket_id = 'documents' and (public.is_owner() or public.is_office()))
  with check (bucket_id = 'documents' and (public.is_owner() or public.is_office()));

-- RLS
alter table public.profiles enable row level security;
alter table public.trucks enable row level security;
alter table public.truck_photos enable row level security;
alter table public.prep_steps enable row level security;
alter table public.costs enable row level security;
alter table public.documents enable row level security;
alter table public.customers enable row level security;
alter table public.activity_log enable row level security;

create policy profiles_select_staff on public.profiles
  for select to authenticated
  using (public.is_staff() and (active = true or public.is_owner()));

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_owner())
  with check (
    public.is_owner()
    or (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()))
  );

create policy profiles_insert_owner on public.profiles
  for insert to authenticated
  with check (public.is_owner() or id = auth.uid());

create policy trucks_select on public.trucks
  for select to authenticated
  using (
    public.is_owner() or public.is_office() or public.is_sales()
    or (public.is_mechanic() and status in ('incoming', 'in_prep'))
  );

create policy trucks_insert on public.trucks
  for insert to authenticated
  with check (public.is_owner() or public.is_office() or public.is_sales());

create policy trucks_update on public.trucks
  for update to authenticated
  using (
    public.is_owner() or public.is_office()
    or (public.is_sales() and (sales_rep_id = auth.uid() or sales_rep_id is null))
    or (public.is_mechanic() and status in ('incoming', 'in_prep'))
  )
  with check (
    public.is_owner() or public.is_office()
    or public.is_sales() or public.is_mechanic()
  );

create policy trucks_delete_owner on public.trucks
  for delete to authenticated
  using (public.is_owner());

create policy truck_photos_select on public.truck_photos
  for select to authenticated
  using (
    exists (
      select 1 from public.trucks t
      where t.id = truck_id
      and (
        public.is_owner() or public.is_office() or public.is_sales()
        or (public.is_mechanic() and t.status in ('incoming', 'in_prep'))
      )
    )
  );

create policy truck_photos_insert on public.truck_photos
  for insert to authenticated
  with check (public.is_owner() or public.is_office() or public.is_sales() or public.is_mechanic());

create policy truck_photos_update on public.truck_photos
  for update to authenticated
  using (public.is_owner() or public.is_office() or public.is_sales() or public.is_mechanic())
  with check (public.is_owner() or public.is_office() or public.is_sales() or public.is_mechanic());

create policy truck_photos_delete on public.truck_photos
  for delete to authenticated
  using (public.is_owner() or public.is_office() or public.is_sales());

create policy prep_steps_select on public.prep_steps
  for select to authenticated
  using (public.is_staff());

create policy prep_steps_update on public.prep_steps
  for update to authenticated
  using (
    public.is_owner()
    or public.is_office()
    or (public.is_mechanic() and assigned_role = 'mechanic')
  )
  with check (public.is_staff());

create policy prep_steps_insert on public.prep_steps
  for insert to authenticated
  with check (public.is_owner() or public.is_office() or public.is_sales());

create policy costs_select on public.costs
  for select to authenticated
  using (
    public.can_see_financials()
    or (
      public.is_mechanic()
      and truck_id is not null
      and exists (
        select 1 from public.trucks t
        where t.id = truck_id and t.status in ('incoming', 'in_prep')
      )
    )
  );

create policy costs_insert on public.costs
  for insert to authenticated
  with check (public.is_owner() or public.is_office() or public.is_mechanic());

create policy costs_update on public.costs
  for update to authenticated
  using (public.is_owner() or public.is_office())
  with check (public.is_owner() or public.is_office());

create policy costs_delete on public.costs
  for delete to authenticated
  using (public.is_owner() or public.is_office());

create policy documents_select on public.documents
  for select to authenticated
  using (public.is_staff());

create policy documents_insert on public.documents
  for insert to authenticated
  with check (public.is_owner() or public.is_office());

create policy documents_update on public.documents
  for update to authenticated
  using (public.is_owner() or public.is_office())
  with check (public.is_owner() or public.is_office());

create policy documents_delete on public.documents
  for delete to authenticated
  using (public.is_owner() or public.is_office());

create policy customers_select on public.customers
  for select to authenticated
  using (
    public.is_owner() or public.is_office()
    or (public.is_sales() and (sales_rep_id = auth.uid() or sales_rep_id is null))
  );

create policy customers_insert on public.customers
  for insert to authenticated
  with check (public.is_owner() or public.is_office() or public.is_sales());

create policy customers_update on public.customers
  for update to authenticated
  using (public.is_owner() or public.is_office() or public.is_sales())
  with check (public.is_owner() or public.is_office() or public.is_sales());

create policy customers_delete on public.customers
  for delete to authenticated
  using (public.is_owner() or public.is_office());

create policy activity_log_select on public.activity_log
  for select to authenticated
  using (public.is_staff());

create policy activity_log_insert on public.activity_log
  for insert to authenticated
  with check (public.is_staff() and user_id = auth.uid());

-- Auto-create profile on signup (optional; seed also inserts profiles)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'sales'),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
