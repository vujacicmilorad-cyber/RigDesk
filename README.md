# RigDesk (Phase 1–3)

Inventory and team app for **Magnum Truck Sales** (Chicago).

Visual reference: [`reference/truck-dealer-demo.html`](./reference/truck-dealer-demo.html)

## Requirements

- Node.js 20+
- Docker (for local Supabase)
- npm

## Local setup (entirely on localhost)

```bash
cd rigdesk
npm install

npx supabase start
npx supabase status -o env
# Map API_URL / ANON_KEY / SERVICE_ROLE_KEY into .env.local
cp .env.local.example .env.local

npx supabase db reset   # Phase 1–3 migrations and seed
npm run dev             # http://127.0.0.1:3000
```

### Seed logins

Password for all: `magnum123`

| Email | Role |
|---|---|
| alex@magnum.local | Owner |
| ana@magnum.local | Sales |
| sam@magnum.local | Sales |
| mike@magnum.local | Sales |
| ray@magnum.local | Mechanic |
| tina@magnum.local | Office |

## What’s included

**Phase 1:** Auth/roles, Inventory, Truck detail, Add truck + VIN decode, photos, activity log  
**Phase 2:** Today dashboard (needs-attention + live/poll activity), Prep, Costs, Leads, Deals (+ payment calculator), Customers  
**Phase 3:** Reports, Team + rep goals, Floor plan, Time to line, ECM, Appraisals, Key log, Consignment, Titles (sold gate + owner override), Inventory audit  

**Client-demo polish:** New deal UI, min-price owner gate, Mark delivered, Today sold-this-month + expired holds, documents upload/checklist, Team Auth create (service role) or Dashboard instructions, light PWA (Add to Home Screen), dark mode toggle.

Migration: `supabase/migrations/20241020160000_phase3.sql`  
Tables: `rep_goals`, `floor_plan`, `ecm_reports`, `appraisals`, `key_log`, `consignments`, `titles`, `test_drives`, `audit_sessions`, `audit_scans`; plus `trucks.available_at`, `deals.title_override_*`.

## Deferred

Vercel/GitHub deploy, truck side drawer, commission settings, full Settings.

## Fallback if local Supabase won’t start

1. Free project at [supabase.com](https://supabase.com)  
2. Run SQL files in order:  
   `supabase/migrations/20241020120000_phase1.sql`  
   `supabase/migrations/20241020140000_phase2.sql`  
   `supabase/migrations/20241020160000_phase3.sql`  
3. Seed via `supabase/seed.sql` (or create the six auth users and adjust UUIDs)  
4. Create Storage bucket `ecm-files` (migration does this on local)  
5. Enable Realtime for `activity_log` in the dashboard (optional — UI polls every 8s if Realtime fails)  
6. Put URL + anon + service_role in `.env.local` and `npm run dev`

See also: project handoffs under `/cursor/stores/self/docs/phase-*-local-handoff.md`.
