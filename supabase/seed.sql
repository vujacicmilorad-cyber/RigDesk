-- Seed: 6 team, 7 trucks, 6 customers (demo data). Password for all: magnum123
-- Fixed UUIDs so re-seeds are deterministic.

create extension if not exists "pgcrypto";

-- Auth users (local Supabase)
-- identities required for email/password login
do $$
declare
  pwd text := crypt('magnum123', gen_salt('bf'));
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) values
    ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111101', 'authenticated', 'authenticated',
      'alex@magnum.local', pwd, now(), '{"provider":"email","providers":["email"]}',
      '{"name":"Alex Morgan","role":"owner"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111102', 'authenticated', 'authenticated',
      'ana@magnum.local', pwd, now(), '{"provider":"email","providers":["email"]}',
      '{"name":"Ana Ruiz","role":"sales"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111103', 'authenticated', 'authenticated',
      'sam@magnum.local', pwd, now(), '{"provider":"email","providers":["email"]}',
      '{"name":"Sam Keller","role":"sales"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111104', 'authenticated', 'authenticated',
      'mike@magnum.local', pwd, now(), '{"provider":"email","providers":["email"]}',
      '{"name":"Mike Dawson","role":"sales"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111105', 'authenticated', 'authenticated',
      'ray@magnum.local', pwd, now(), '{"provider":"email","providers":["email"]}',
      '{"name":"Ray Lopez","role":"mechanic"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111106', 'authenticated', 'authenticated',
      'tina@magnum.local', pwd, now(), '{"provider":"email","providers":["email"]}',
      '{"name":"Tina Park","role":"office"}', now(), now(), '', '', '', '')
  on conflict (id) do nothing;

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) values
    ('11111111-1111-1111-1111-111111111101', '11111111-1111-1111-1111-111111111101',
      jsonb_build_object('sub', '11111111-1111-1111-1111-111111111101', 'email', 'alex@magnum.local'),
      'email', '11111111-1111-1111-1111-111111111101', now(), now(), now()),
    ('11111111-1111-1111-1111-111111111102', '11111111-1111-1111-1111-111111111102',
      jsonb_build_object('sub', '11111111-1111-1111-1111-111111111102', 'email', 'ana@magnum.local'),
      'email', '11111111-1111-1111-1111-111111111102', now(), now(), now()),
    ('11111111-1111-1111-1111-111111111103', '11111111-1111-1111-1111-111111111103',
      jsonb_build_object('sub', '11111111-1111-1111-1111-111111111103', 'email', 'sam@magnum.local'),
      'email', '11111111-1111-1111-1111-111111111103', now(), now(), now()),
    ('11111111-1111-1111-1111-111111111104', '11111111-1111-1111-1111-111111111104',
      jsonb_build_object('sub', '11111111-1111-1111-1111-111111111104', 'email', 'mike@magnum.local'),
      'email', '11111111-1111-1111-1111-111111111104', now(), now(), now()),
    ('11111111-1111-1111-1111-111111111105', '11111111-1111-1111-1111-111111111105',
      jsonb_build_object('sub', '11111111-1111-1111-1111-111111111105', 'email', 'ray@magnum.local'),
      'email', '11111111-1111-1111-1111-111111111105', now(), now(), now()),
    ('11111111-1111-1111-1111-111111111106', '11111111-1111-1111-1111-111111111106',
      jsonb_build_object('sub', '11111111-1111-1111-1111-111111111106', 'email', 'tina@magnum.local'),
      'email', '11111111-1111-1111-1111-111111111106', now(), now(), now())
  on conflict (id) do nothing;
end $$;

-- Ensure profiles (trigger may have created them; upsert correct roles/names)
insert into public.profiles (id, name, role, active, created_by) values
  ('11111111-1111-1111-1111-111111111101', 'Alex Morgan', 'owner', true, '11111111-1111-1111-1111-111111111101'),
  ('11111111-1111-1111-1111-111111111102', 'Ana Ruiz', 'sales', true, '11111111-1111-1111-1111-111111111101'),
  ('11111111-1111-1111-1111-111111111103', 'Sam Keller', 'sales', true, '11111111-1111-1111-1111-111111111101'),
  ('11111111-1111-1111-1111-111111111104', 'Mike Dawson', 'sales', true, '11111111-1111-1111-1111-111111111101'),
  ('11111111-1111-1111-1111-111111111105', 'Ray Lopez', 'mechanic', true, '11111111-1111-1111-1111-111111111101'),
  ('11111111-1111-1111-1111-111111111106', 'Tina Park', 'office', true, '11111111-1111-1111-1111-111111111101')
on conflict (id) do update set name = excluded.name, role = excluded.role, active = true;

-- Trucks (demo stock numbers)
insert into public.trucks (
  id, created_by, stock_no, vin, year, make, model, type, miles, engine, hp,
  transmission, ratio, axles, apu, color, lot_location, status,
  purchase_price, purchase_date, source, asking_price, min_price, sales_rep_id, notes, hold_expires_at
) values
  ('22222222-2222-2222-2222-222222222901', '11111111-1111-1111-1111-111111111106', 9291,
    '1FUJGLDR5JLBD2901', 2025, 'Freightliner', 'Cascadia', 'sleeper', 301229, 'DD15', 425,
    'Automatic', '2.15', 3, false, '#E4E8E6', 'Lot A', 'available',
    98500, current_date - 12, 'auction', 124900, 115000, '11111111-1111-1111-1111-111111111103', null, null),
  ('22222222-2222-2222-2222-222222222902', '11111111-1111-1111-1111-111111111106', 5229,
    '1FUJGLDR8HLBD5229', 2023, 'Freightliner', 'Cascadia', 'sleeper', 411962, 'DD15', 455,
    'Automatic', '2.41', 3, true, '#27507A', 'Lot A', 'on_hold',
    71200, current_date - 34, 'fleet', 94900, 88000, '11111111-1111-1111-1111-111111111102', 'Deposit paid', now() + interval '2 days'),
  ('22222222-2222-2222-2222-222222222903', '11111111-1111-1111-1111-111111111106', 2933,
    '1FUJGLDR2NLBD2933', 2024, 'Freightliner', 'Cascadia', 'sleeper', 461476, 'DD15', 505,
    'Automatic', '2.41', 3, true, '#B5362C', 'Shop', 'in_prep',
    70300, current_date - 5, 'auction', 89900, 82000, '11111111-1111-1111-1111-111111111102', null, null),
  ('22222222-2222-2222-2222-222222222904', '11111111-1111-1111-1111-111111111106', 9409,
    '1XPBD49X5ND794091', 2023, 'Peterbilt', '579', 'sleeper', 400000, 'X15', 450,
    'Automatic', '2.64', 3, false, '#2B2F2E', 'Lot B', 'available',
    55000, current_date - 48, 'trade_in', 71000, 65000, '11111111-1111-1111-1111-111111111103', null, null),
  ('22222222-2222-2222-2222-222222222905', '11111111-1111-1111-1111-111111111106', 4417,
    '3HAEUMML8NL444171', 2022, 'International', 'MV607', 'day_cab', 153000, 'B6.7', 220,
    'Automatic', '5.57', 2, false, '#E9A100', 'Lot B', 'available',
    37500, current_date - 71, 'private', 46900, 42000, '11111111-1111-1111-1111-111111111104', 'Over 60 days', null),
  ('22222222-2222-2222-2222-222222222906', '11111111-1111-1111-1111-111111111106', 6839,
    '1XPBD49X8SD686839', 2027, 'Peterbilt', '579', 'sleeper', 0, 'X15', 450,
    'Automatic', '2.64', 3, true, '#0E5A43', 'Incoming bay', 'incoming',
    158000, current_date, 'fleet', 174000, 165000, '11111111-1111-1111-1111-111111111103', null, null),
  ('22222222-2222-2222-2222-222222222907', '11111111-1111-1111-1111-111111111106', 3071,
    '1FUJGLDR0NLBD3071', 2022, 'Freightliner', 'Cascadia', 'sleeper', 497000, 'DD15', 455,
    'Automatic', '2.41', 3, false, '#8B9892', 'Sold row', 'sold',
    44000, current_date - 27, 'auction', 59900, 54000, '11111111-1111-1111-1111-111111111104', 'Paid in full', null)
on conflict (stock_no) do nothing;

-- Bump sequence past seeded stock numbers
select setval('public.truck_stock_seq', greatest(9500, (select max(stock_no) from public.trucks)));

-- Prep steps for each truck
insert into public.prep_steps (truck_id, step, assigned_role, done, done_by, done_at, created_by)
select t.id, s.step, s.assigned_role,
  case
    when t.stock_no = 2933 and s.step in ('mechanical_inspection', 'service_records', 'clean_title') then true
    when t.stock_no = 2933 then false
    when t.stock_no = 6839 then false
    when t.status in ('available', 'on_hold', 'sold', 'delivered') then true
    else false
  end,
  case
    when t.stock_no = 2933 and s.step = 'mechanical_inspection' then '11111111-1111-1111-1111-111111111105'::uuid
    when t.status in ('available', 'on_hold', 'sold', 'delivered') and s.assigned_role = 'mechanic'
      then '11111111-1111-1111-1111-111111111105'::uuid
    when t.status in ('available', 'on_hold', 'sold', 'delivered') and s.assigned_role = 'office'
      then '11111111-1111-1111-1111-111111111106'::uuid
    else null
  end,
  case
    when t.stock_no = 6839 then null
    when t.stock_no = 2933 and s.step in ('dot_inspection', 'detailing') then null
    else now() - interval '2 days'
  end,
  '11111111-1111-1111-1111-111111111106'
from public.trucks t
cross join (
  values
    ('mechanical_inspection'::public.prep_step_kind, 'mechanic'::public.app_role),
    ('service_records', 'office'),
    ('dot_inspection', 'mechanic'),
    ('detailing', 'mechanic'),
    ('clean_title', 'office')
) as s(step, assigned_role)
on conflict (truck_id, step) do nothing;

-- Costs from demo
insert into public.costs (truck_id, category, vendor, amount, date, created_by)
select t.id, c.category, c.vendor, c.amount, current_date - c.days_ago, '11111111-1111-1111-1111-111111111106'
from public.trucks t
join (
  values
    (9291, 'Auction fee', 'Tri-State Auction', 850::numeric, 11),
    (9291, 'Transport', 'Rojas Hauling', 1200, 10),
    (9291, 'Mechanic', 'Lakeside Diesel', 1900, 8),
    (9291, 'DOT inspection', 'Lakeside Diesel', 150, 7),
    (9291, 'Detailing', 'ShineLine Detail', 400, 6),
    (9291, 'Tires', 'Route 30 Tire', 600, 5),
    (5229, 'Transport', 'Rojas Hauling', 900, 30),
    (5229, 'Mechanic', 'Lakeside Diesel', 2400, 25),
    (5229, 'DOT inspection', 'Lakeside Diesel', 150, 20),
    (5229, 'Detailing', 'ShineLine Detail', 400, 18),
    (5229, 'Parts', 'Midway Parts', 300, 15),
    (2933, 'Auction fee', 'Tri-State Auction', 850, 4),
    (2933, 'Transport', 'Rojas Hauling', 420, 4),
    (2933, 'Mechanic', 'Lakeside Diesel', 2680, 2),
    (2933, 'Parts', 'Midway Parts', 850, 1),
    (9409, 'Transport', 'Rojas Hauling', 1100, 40),
    (9409, 'Mechanic', 'Lakeside Diesel', 2250, 35),
    (9409, 'DOT inspection', 'Lakeside Diesel', 150, 30),
    (9409, 'Detailing', 'ShineLine Detail', 400, 28),
    (4417, 'Transport', 'Rojas Hauling', 700, 60),
    (4417, 'Mechanic', 'Lakeside Diesel', 1650, 55),
    (4417, 'DOT inspection', 'Lakeside Diesel', 150, 50),
    (4417, 'Detailing', 'ShineLine Detail', 350, 48),
    (4417, 'Paint', 'ColorWorks', 350, 45),
    (6839, 'Transport', 'Rojas Hauling', 600, 0),
    (3071, 'Transport', 'Rojas Hauling', 800, 20),
    (3071, 'Mechanic', 'Lakeside Diesel', 2250, 18),
    (3071, 'DOT inspection', 'Lakeside Diesel', 150, 15),
    (3071, 'Detailing', 'ShineLine Detail', 400, 12)
) as c(stock_no, category, vendor, amount, days_ago)
  on t.stock_no = c.stock_no;

-- Customers
insert into public.customers (id, name, type, fleet_size, looking_for, sales_rep_id, city, state, created_by) values
  ('33333333-3333-3333-3333-333333333001', 'Great Lakes Freight', 'fleet', 7, 'Day cabs under 400k miles', '11111111-1111-1111-1111-111111111104', 'Chicago', 'IL', '11111111-1111-1111-1111-111111111101'),
  ('33333333-3333-3333-3333-333333333002', 'Midwest Haul LLC', 'fleet', 12, '3 sleepers under 350k miles', '11111111-1111-1111-1111-111111111103', 'Aurora', 'IL', '11111111-1111-1111-1111-111111111101'),
  ('33333333-3333-3333-3333-333333333003', 'Karen Whitfield', 'owner_operator', null, 'None', '11111111-1111-1111-1111-111111111102', 'Naperville', 'IL', '11111111-1111-1111-1111-111111111101'),
  ('33333333-3333-3333-3333-333333333004', 'Luis Ortega', 'owner_operator', null, '2024 Cascadia under $90k', '11111111-1111-1111-1111-111111111102', 'Joliet', 'IL', '11111111-1111-1111-1111-111111111101'),
  ('33333333-3333-3333-3333-333333333005', 'Tom Nguyen', 'owner_operator', null, 'Peterbilt 579, any year', '11111111-1111-1111-1111-111111111103', 'Evanston', 'IL', '11111111-1111-1111-1111-111111111101'),
  ('33333333-3333-3333-3333-333333333006', 'Darnell Brooks', 'owner_operator', null, '2023 Cascadia with APU', '11111111-1111-1111-1111-111111111102', 'Chicago', 'IL', '11111111-1111-1111-1111-111111111101')
on conflict (id) do nothing;

-- Sample documents on a few trucks
insert into public.documents (truck_id, type, status, created_by)
select t.id, d.type, d.status, '11111111-1111-1111-1111-111111111106'
from public.trucks t
join (
  values
    (9291, 'spec_sheet'::public.document_type, 'in_hand'::public.document_status),
    (9291, 'dot_certificate', 'in_hand'),
    (5229, 'title', 'in_hand'),
    (5229, 'deposit_receipt', 'signed'),
    (3071, 'bill_of_sale', 'signed'),
    (3071, 'title', 'in_hand')
) as d(stock_no, type, status) on t.stock_no = d.stock_no;

-- Activity log
insert into public.activity_log (user_id, truck_id, action, created_by, created_at)
select p.id, t.id, a.action, p.id, now() - a.ago
from (
  values
    ('Ana Ruiz', 5229, 'recorded a deposit on stock 5229', interval '2 hours'),
    ('Ray Lopez', 2933, 'finished the mechanical inspection on stock 2933', interval '3 hours'),
    ('Tina Park', 2933, 'added a $420 transport receipt to stock 2933', interval '4 hours'),
    ('Sam Keller', 9291, 'logged a new lead for stock 9291', interval '5 hours'),
    ('Mike Dawson', 3071, 'recorded the sale of stock 3071', interval '1 day'),
    ('Tina Park', 9291, 'added the truck from a VIN scan', interval '12 days'),
    ('Tina Park', 5229, 'added the truck from a VIN scan', interval '34 days')
) as a(who, stock_no, action, ago)
join public.profiles p on p.name = a.who
join public.trucks t on t.stock_no = a.stock_no;

-- =============================================================================
-- Phase 2 seed: extra customers for leads, leads, deals, lender apps
-- =============================================================================

insert into public.customers (id, name, type, fleet_size, looking_for, sales_rep_id, city, state, created_by) values
  ('33333333-3333-3333-3333-333333333007', 'Chris Patel', 'owner_operator', null, 'Day cab under 200k miles', '11111111-1111-1111-1111-111111111104', 'Oak Park', 'IL', '11111111-1111-1111-1111-111111111101'),
  ('33333333-3333-3333-3333-333333333008', 'B and R Logistics', 'fleet', 4, 'Sleeper under $75k', '11111111-1111-1111-1111-111111111103', 'Gary', 'IN', '11111111-1111-1111-1111-111111111101')
on conflict (id) do nothing;

insert into public.leads (id, customer_id, truck_id, source, status, sales_rep_id, lost_reason, created_by, created_at)
select
  l.id,
  c.id,
  t.id,
  l.source::public.lead_source,
  l.status::public.lead_status,
  p.id,
  l.lost_reason,
  '11111111-1111-1111-1111-111111111101',
  now() - l.ago
from (
  values
    ('44444444-4444-4444-4444-444444444001', 'Darnell Brooks', 5229, 'website', 'new', 'Ana Ruiz', null, interval '4 hours'),
    ('44444444-4444-4444-4444-444444444002', 'Midwest Haul LLC', 9291, 'phone', 'contacted', 'Sam Keller', null, interval '5 hours'),
    ('44444444-4444-4444-4444-444444444003', 'Chris Patel', 4417, 'walk_in', 'new', 'Mike Dawson', null, interval '6 hours'),
    ('44444444-4444-4444-4444-444444444004', 'Luis Ortega', 2933, 'truck_paper', 'contacted', 'Ana Ruiz', null, interval '1 day'),
    ('44444444-4444-4444-4444-444444444005', 'Tom Nguyen', 9409, 'instagram', 'viewing', 'Sam Keller', null, interval '3 days'),
    ('44444444-4444-4444-4444-444444444006', 'Great Lakes Freight', 3071, 'referral', 'won', 'Mike Dawson', null, interval '7 days'),
    ('44444444-4444-4444-4444-444444444007', 'B and R Logistics', 9409, 'phone', 'lost', 'Sam Keller', 'Bought elsewhere', interval '8 days')
) as l(id, customer_name, stock_no, source, status, rep_name, lost_reason, ago)
join public.customers c on c.name = l.customer_name
join public.trucks t on t.stock_no = l.stock_no
join public.profiles p on p.name = l.rep_name
on conflict (id) do nothing;

insert into public.deals (
  id, customer_id, truck_id, sales_rep_id, stage, price, warranty_price,
  down_payment, deposit_amount, deposit_expires_at, sold_at, notes, created_by
)
select
  d.id, c.id, t.id, p.id,
  d.stage::public.deal_stage,
  d.price, d.warranty, d.down,
  d.deposit, d.expires, d.sold_at, d.notes,
  '11111111-1111-1111-1111-111111111101'
from (
  values
    ('55555555-5555-5555-5555-555555555001', 'Luis Ortega', 2933, 'Ana Ruiz', 'inquiry', 89900::numeric, 0::numeric, 12000::numeric, null::numeric, null::timestamptz, null::timestamptz, 'On the wish list, waiting for prep to finish'),
    ('55555555-5555-5555-5555-555555555002', 'Tom Nguyen', 9409, 'Sam Keller', 'viewing', 71000, 2400, 10000, null, null, null, 'Viewing booked for Thursday 2 PM'),
    ('55555555-5555-5555-5555-555555555003', 'Midwest Haul LLC', 9291, 'Sam Keller', 'credit_app', 124900, 3200, 25000, null, null, null, 'Wants 3 units this month'),
    ('55555555-5555-5555-5555-555555555004', 'Karen Whitfield', 5229, 'Ana Ruiz', 'deposit', 93500, 2900, 14000, 5000, now() + interval '2 days', null, 'Deposit paid, hold expires in 2 days'),
    ('55555555-5555-5555-5555-555555555005', 'Great Lakes Freight', 3071, 'Mike Dawson', 'sold', 58500, 1900, 58500, null, null, now() - interval '2 days', 'Paid in full, delivery Friday')
) as d(id, customer_name, stock_no, rep_name, stage, price, warranty, down, deposit, expires, sold_at, notes)
join public.customers c on c.name = d.customer_name
join public.trucks t on t.stock_no = d.stock_no
join public.profiles p on p.name = d.rep_name
on conflict (id) do nothing;

insert into public.lender_applications (deal_id, lender_name, status, created_by)
select d.id, x.lender, x.status::public.lender_status, '11111111-1111-1111-1111-111111111101'
from (
  values
    ('55555555-5555-5555-5555-555555555003', 'Northline Capital', 'reviewing'),
    ('55555555-5555-5555-5555-555555555003', 'Prairie Equipment Finance', 'reviewing'),
    ('55555555-5555-5555-5555-555555555004', 'Northline Capital', 'approved'),
    ('55555555-5555-5555-5555-555555555004', 'Prairie Equipment Finance', 'declined')
) as x(deal_id, lender, status)
join public.deals d on d.id = x.deal_id::uuid
where not exists (
  select 1 from public.lender_applications la
  where la.deal_id = d.id and la.lender_name = x.lender
);

-- =============================================================================
-- Phase 3 seed
-- =============================================================================

-- available_at for trucks that reached Available+
update public.trucks set available_at = purchase_date::timestamptz + interval '3 days'
where status in ('available', 'on_hold', 'sold', 'delivered') and available_at is null;

update public.trucks set available_at = purchase_date::timestamptz + interval '5 days'
where stock_no = 2933 and available_at is null;

-- Titles
insert into public.titles (truck_id, location, due_date, in_hand, created_by)
select t.id, x.loc, current_date + x.due_offset, x.in_hand, '11111111-1111-1111-1111-111111111106'
from public.trucks t
join (
  values
    (9291, 'File cabinet A', 0, true),
    (5229, 'File cabinet A', 0, true),
    (2933, 'Ordered from auction', 14, false),
    (9409, 'In hand — drawer 2', 0, true),
    (4417, 'DMV hold', 7, false),
    (6839, 'Not yet — incoming', 30, false),
    (3071, 'Transferred to buyer', -5, true)
) as x(stock_no, loc, due_offset, in_hand) on t.stock_no = x.stock_no
on conflict (truck_id) do nothing;

-- Floor plan (unsold financed units)
insert into public.floor_plan (truck_id, lender_name, financed_amount, daily_interest_rate, start_date, next_curtailment_date, created_by)
select t.id, x.lender, x.amt, x.rate, current_date - x.days_on, current_date + x.curt_in, '11111111-1111-1111-1111-111111111106'
from public.trucks t
join (
  values
    (9291, 'Northline Capital', 98500::numeric, 0.00045::numeric, 12, 5),
    (5229, 'Prairie Equipment Finance', 71200, 0.00050, 34, 3),
    (9409, 'Northline Capital', 55000, 0.00042, 48, 12),
    (4417, 'Tri-State Floorplan', 37500, 0.00055, 71, 2),
    (2933, 'Northline Capital', 70300, 0.00048, 5, 20)
) as x(stock_no, lender, amt, rate, days_on, curt_in) on t.stock_no = x.stock_no
on conflict (truck_id) do nothing;

-- ECM
insert into public.ecm_reports (truck_id, engine_hours, idle_hours, fault_codes, created_by)
select t.id, x.eng, x.idle, x.faults, '11111111-1111-1111-1111-111111111105'
from public.trucks t
join (
  values
    (9291, 12400::numeric, 3100::numeric, 'SPN 3216 FMI 2'),
    (5229, 18900, 8200, null),
    (2933, 15200, 7100, 'SPN 94 FMI 3; SPN 157 FMI 18'),
    (9409, 16800, 4200, null),
    (4417, 8900, 2100, null)
) as x(stock_no, eng, idle, faults) on t.stock_no = x.stock_no;

-- Appraisals
insert into public.appraisals (vin, year, make, model, miles, condition, expected_sale_price, planned_prep, target_profit, notes, created_by)
values
  ('1FUJGLDR5JLBD9991', 2021, 'Freightliner', 'Cascadia', 520000, 'fair', 62000, 4500, 8000, 'Fleet trade — check frame', '11111111-1111-1111-1111-111111111101'),
  ('1XPBD49X5ND799992', 2024, 'Peterbilt', '579', 180000, 'good', 145000, 3500, 12000, 'Private seller', '11111111-1111-1111-1111-111111111103');

-- Key log
insert into public.key_log (truck_id, taken_by_id, taken_by_name, taken_at, returned_at, notes, created_by)
select t.id, p.id, p.name, now() - x.ago, x.ret, x.notes, '11111111-1111-1111-1111-111111111106'
from (
  values
    (9291, 'Sam Keller', interval '2 hours', null::timestamptz, 'Showing to Midwest Haul'),
    (4417, 'Mike Dawson', interval '30 hours', null, 'Still out overnight'),
    (9409, 'Ana Ruiz', interval '5 hours', now() - interval '1 hour', 'Returned after viewing'),
    (5229, 'Ana Ruiz', interval '1 day', now() - interval '20 hours', null)
) as x(stock_no, who, ago, ret, notes)
join public.trucks t on t.stock_no = x.stock_no
join public.profiles p on p.name = x.who;

-- Consignments
insert into public.consignments (truck_id, owner_name, agreed_net, fee_type, fee_value, end_date, payout_status, notes, created_by)
select t.id, 'Riverside Fleets LLC', 68000, 'percent', 8, current_date + 45, 'pending', 'Black 579 sleeper', '11111111-1111-1111-1111-111111111101'
from public.trucks t where t.stock_no = 9409
limit 1;

insert into public.consignments (truck_id, owner_name, agreed_net, fee_type, fee_value, end_date, payout_status, notes, created_by)
select t.id, 'Tom Brennan', 42000, 'flat', 2500, current_date + 20, 'pending', 'Yellow day cab', '11111111-1111-1111-1111-111111111101'
from public.trucks t where t.stock_no = 4417
limit 1;

-- Rep goals (current month)
insert into public.rep_goals (sales_rep_id, month, target_units, target_profit, created_by)
select p.id, date_trunc('month', current_date)::date, x.units, x.profit, '11111111-1111-1111-1111-111111111101'
from (
  values
    ('Sam Keller', 4, 45000::numeric),
    ('Ana Ruiz', 3, 38000),
    ('Mike Dawson', 3, 28000)
) as x(name, units, profit)
join public.profiles p on p.name = x.name
on conflict (sales_rep_id, month) do nothing;

-- Test drive sample
insert into public.test_drives (truck_id, driver_name, started_at, ended_at, notes, created_by)
select t.id, 'Tom Nguyen', now() - interval '3 days', now() - interval '3 days' + interval '40 minutes', 'Liked the ride', '11111111-1111-1111-1111-111111111103'
from public.trucks t where t.stock_no = 9409;
