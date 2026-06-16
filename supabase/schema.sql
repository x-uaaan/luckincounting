-- LuckinCounting database schema
-- Run this in Supabase SQL Editor: project → SQL Editor → New query → paste → Run

-- ── items ────────────────────────────────────────────────────────────────────
create table if not exists items (
  id                        text primary key,
  name                      text not null,
  category                  text not null,
  sort_order                integer not null,
  final_sort_order          integer,
  closing_sort_order        integer,
  appears_in                text[] not null,
  unit                      text,
  per_bag_pcs               integer,
  back_loose_formula        text,
  per_box_pcs               integer,
  front_per_box_pcs         integer,
  closing_per_box_pcs       integer,
  bag_size_g                numeric,
  inventory_bag_size_g      numeric,
  loss_formula              text not null default 'none',
  loss_rate                 numeric,
  loss_components           jsonb,
  loss_role                 text not null default 'input_and_summary',
  default_container_id      text,
  closing_inventory_formula text,
  closing_container_input   boolean not null default false,
  unopened_stack_size       integer,
  closing_box_row           boolean not null default true,
  loose_grid                boolean not null default false,
  closing_input_type        text not null default 'count',
  notes                     text,
  updated_at                timestamptz default now()
);

-- ── containers ───────────────────────────────────────────────────────────────
create table if not exists containers (
  id         text primary key,
  name       text not null,
  tare_g     numeric not null,
  updated_at timestamptz default now()
);

-- ── daily_records ─────────────────────────────────────────────────────────────
create table if not exists daily_records (
  date          text primary key,
  status        text not null default 'draft',
  back          jsonb not null default '{}',
  front         jsonb not null default '{}',
  material_loss jsonb not null default '{}',
  closing       jsonb not null default '{}',
  sheet2        jsonb not null default '{}',
  approved_by   text,
  approved_at   timestamptz,
  drive_file_id text,
  updated_at    timestamptz default now()
);

-- auto-update updated_at on every row change
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace trigger items_updated_at
  before update on items for each row execute procedure set_updated_at();
create or replace trigger containers_updated_at
  before update on containers for each row execute procedure set_updated_at();
create or replace trigger daily_records_updated_at
  before update on daily_records for each row execute procedure set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Open policies for now — tighten once auth/approval is wired up.
alter table items enable row level security;
alter table containers enable row level security;
alter table daily_records enable row level security;

create policy "public read-write items"
  on items for all using (true) with check (true);
create policy "public read-write containers"
  on containers for all using (true) with check (true);
create policy "public read-write daily_records"
  on daily_records for all using (true) with check (true);
