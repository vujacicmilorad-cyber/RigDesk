-- RigDesk Phase 2: leads, deals, lender apps, price changes + realtime

create type public.lead_source as enum (
  'website', 'phone', 'walk_in', 'truck_paper', 'instagram', 'tiktok', 'referral'
);
create type public.lead_status as enum (
  'new', 'contacted', 'viewing', 'won', 'lost'
);
create type public.deal_stage as enum (
  'inquiry', 'viewing', 'credit_app', 'deposit', 'sold'
);
create type public.lender_status as enum (
  'reviewing', 'approved', 'declined'
);

-- price_changes
create table public.price_changes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  truck_id uuid not null references public.trucks (id) on delete cascade,
  old_price numeric(12,2) not null,
  new_price numeric(12,2) not null
);
create index price_changes_truck_idx on public.price_changes (truck_id);
create trigger price_changes_created_by
  before insert on public.price_changes
  for each row execute function public.set_created_by();

-- leads
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  customer_id uuid not null references public.customers (id) on delete cascade,
  truck_id uuid references public.trucks (id) on delete set null,
  source public.lead_source not null default 'phone',
  status public.lead_status not null default 'new',
  lost_reason text,
  sales_rep_id uuid references public.profiles (id)
);
create index leads_status_idx on public.leads (status);
create index leads_sales_rep_idx on public.leads (sales_rep_id);
create index leads_customer_idx on public.leads (customer_id);
create trigger leads_created_by
  before insert on public.leads
  for each row execute function public.set_created_by();

-- deals
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  customer_id uuid not null references public.customers (id) on delete restrict,
  truck_id uuid not null references public.trucks (id) on delete restrict,
  sales_rep_id uuid references public.profiles (id),
  stage public.deal_stage not null default 'inquiry',
  price numeric(12,2) not null check (price >= 0),
  warranty_price numeric(12,2) not null default 0 check (warranty_price >= 0),
  down_payment numeric(12,2) not null default 0 check (down_payment >= 0),
  deposit_amount numeric(12,2) check (deposit_amount is null or deposit_amount >= 0),
  deposit_expires_at timestamptz,
  sold_at timestamptz,
  notes text
);
create index deals_stage_idx on public.deals (stage);
create index deals_truck_idx on public.deals (truck_id);
create index deals_sales_rep_idx on public.deals (sales_rep_id);
create trigger deals_created_by
  before insert on public.deals
  for each row execute function public.set_created_by();

-- lender_applications
create table public.lender_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  deal_id uuid not null references public.deals (id) on delete cascade,
  lender_name text not null,
  status public.lender_status not null default 'reviewing'
);
create index lender_applications_deal_idx on public.lender_applications (deal_id);
create trigger lender_applications_created_by
  before insert on public.lender_applications
  for each row execute function public.set_created_by();

-- Wire documents.deal_id FK (column existed in Phase 1)
alter table public.documents
  drop constraint if exists documents_deal_id_fkey;
alter table public.documents
  add constraint documents_deal_id_fkey
  foreign key (deal_id) references public.deals (id) on delete set null;

-- RLS
alter table public.price_changes enable row level security;
alter table public.leads enable row level security;
alter table public.deals enable row level security;
alter table public.lender_applications enable row level security;

-- price_changes: owner/office full; sales read asking changes only via app
create policy price_changes_select on public.price_changes
  for select to authenticated
  using (public.is_staff());

create policy price_changes_insert on public.price_changes
  for insert to authenticated
  with check (public.is_owner() or public.is_office() or public.is_sales());

-- leads: owner/office all; sales own (or unassigned); mechanic none needed for Phase 2 UI
create policy leads_select on public.leads
  for select to authenticated
  using (
    public.is_owner() or public.is_office()
    or (public.is_sales() and (sales_rep_id = auth.uid() or sales_rep_id is null))
  );

create policy leads_insert on public.leads
  for insert to authenticated
  with check (public.is_owner() or public.is_office() or public.is_sales());

create policy leads_update on public.leads
  for update to authenticated
  using (
    public.is_owner() or public.is_office()
    or (public.is_sales() and (sales_rep_id = auth.uid() or sales_rep_id is null))
  )
  with check (
    public.is_owner() or public.is_office()
    or public.is_sales()
  );

create policy leads_delete on public.leads
  for delete to authenticated
  using (public.is_owner() or public.is_office());

-- deals
create policy deals_select on public.deals
  for select to authenticated
  using (
    public.is_owner() or public.is_office()
    or (public.is_sales() and (sales_rep_id = auth.uid() or sales_rep_id is null))
  );

create policy deals_insert on public.deals
  for insert to authenticated
  with check (public.is_owner() or public.is_office() or public.is_sales());

create policy deals_update on public.deals
  for update to authenticated
  using (
    public.is_owner() or public.is_office()
    or (public.is_sales() and (sales_rep_id = auth.uid() or sales_rep_id is null))
  )
  with check (public.is_owner() or public.is_office() or public.is_sales());

create policy deals_delete on public.deals
  for delete to authenticated
  using (public.is_owner() or public.is_office());

-- lender_applications follow deal visibility
create policy lender_apps_select on public.lender_applications
  for select to authenticated
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_id
      and (
        public.is_owner() or public.is_office()
        or (public.is_sales() and (d.sales_rep_id = auth.uid() or d.sales_rep_id is null))
      )
    )
  );

create policy lender_apps_write on public.lender_applications
  for all to authenticated
  using (public.is_owner() or public.is_office() or public.is_sales())
  with check (public.is_owner() or public.is_office() or public.is_sales());

-- Realtime: activity feed + status tables (ignore if already added)
do $$
begin
  begin
    alter publication supabase_realtime add table public.activity_log;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.trucks;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.leads;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.deals;
  exception when others then null;
  end;
end $$;
