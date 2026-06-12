-- Luckin Counting — Supabase schema
-- See APP_ARCHITECTURE.md sections 1, 3, 5

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- items: admin-managed master list (CRUD via /admin/items)
-- ---------------------------------------------------------------------
create table if not exists items (
  id text primary key,
  name text not null,
  category text not null,
  sort_order int not null default 0,
  appears_in text[] not null default '{}',       -- subset of: back, front, expired, closing, sheet2

  unit text,                  -- display unit, e.g. "pcs", "bag", "bottle", "box", "pack", "can", "g"

  per_bag_pcs numeric,        -- null = "-" (whole-unit item)
  per_box_pcs numeric,
  front_per_box_pcs numeric,      -- Front box pcs (may differ from per_box_pcs)
  closing_per_box_pcs numeric,    -- Closing storage-box pcs (may differ from per_box_pcs)
  bag_size_g numeric,
  inventory_bag_size_g numeric,   -- bag size used by closing_inventory_formula (falls back to bag_size_g)

  loss_formula text not null default 'none'
    check (loss_formula in ('multiply', 'subtract', 'add', 'none')),
  loss_rate numeric,
  loss_subtract_ml numeric,
  loss_addend_item_id text references items(id),

  default_container_id text,  -- Material Expired container-tare preset (see containers.ts)

  closing_inventory_formula text
    check (closing_inventory_formula in ('non_coffee', 'under_cabinet', 'whipping_cream')),

  loose_grid boolean not null default false, -- row x line + loose entry (Raw Material/Syrup/Frozen)

  closing_input_type text not null default 'weight'
    check (closing_input_type in ('weight', 'count', 'sleeves')),

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- containers: admin-managed container-tare presets (CRUD via /admin/containers)
-- ---------------------------------------------------------------------
create table if not exists containers (
  id text primary key,
  name text not null,
  tare_g numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- daily_records: one row per counting day (YYMMDD)
-- ---------------------------------------------------------------------
create table if not exists daily_records (
  date text primary key,      -- 'YYMMDD'
  status text not null default 'draft'
    check (status in ('draft', 'pending_approval', 'approved')),

  back jsonb not null default '{}',               -- { [item_id]: BackEntry }
  front jsonb not null default '{}',              -- { [item_id]: FrontEntry }
  material_loss jsonb not null default '{}',      -- { [item_id]: MaterialLossEntry } (Loss only, §A.6)
  closing jsonb not null default '{}',            -- { [item_id]: ClosingEntry } (incl. former Inventory fields, §A.7)
  sheet2 jsonb not null default '{}',             -- { [item_id]: Sheet2Entry } (computed)

  approved_by text,
  approved_at timestamptz,
  drive_file_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- app_settings: singleton row for Drive folder, etc. (Admin > Settings)
-- ---------------------------------------------------------------------
create table if not exists app_settings (
  id int primary key default 1,
  google_drive_folder_id text,
  constraint single_row check (id = 1)
);

insert into app_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- RLS: admin role can read/write everything; authenticated users can
-- read items + read/write today's daily_records. Tighten per Supabase Auth setup.
-- ---------------------------------------------------------------------
alter table items enable row level security;
alter table daily_records enable row level security;
alter table app_settings enable row level security;

create policy "items readable by authenticated" on items
  for select using (auth.role() = 'authenticated');

create policy "items writable by admin" on items
  for all using (auth.jwt() ->> 'role' = 'admin');

create policy "daily_records readable by authenticated" on daily_records
  for select using (auth.role() = 'authenticated');

create policy "daily_records writable by authenticated" on daily_records
  for insert with check (auth.role() = 'authenticated');

create policy "daily_records updatable by authenticated" on daily_records
  for update using (auth.role() = 'authenticated');

create policy "app_settings admin only" on app_settings
  for all using (auth.jwt() ->> 'role' = 'admin');
