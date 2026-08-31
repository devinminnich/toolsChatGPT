create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists homes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references homes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists designs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('existing','proposed')),
  baseline_design_id uuid references designs(id) on delete set null,
  geometry jsonb not null default '{"vertices":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists object_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  width_mm integer not null check (width_mm > 0),
  depth_mm integer not null check (depth_mm > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists design_objects (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references designs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lineage_id uuid not null,
  definition_id uuid references object_definitions(id) on delete set null,
  name text not null,
  category text not null,
  x_mm integer not null,
  y_mm integer not null,
  width_mm integer not null check (width_mm > 0),
  depth_mm integer not null check (depth_mm > 0),
  rotation_deg numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists design_revisions (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references designs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  description text not null,
  snapshot jsonb,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table homes enable row level security;
alter table projects enable row level security;
alter table designs enable row level security;
alter table object_definitions enable row level security;
alter table design_objects enable row level security;
alter table design_revisions enable row level security;

create policy "profiles own rows" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "homes own rows" on homes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "projects own rows" on projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "designs own rows" on designs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "object definitions own rows" on object_definitions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "design objects own rows" on design_objects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "design revisions own rows" on design_revisions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists homes_user_id_idx on homes(user_id);
create index if not exists projects_home_id_idx on projects(home_id);
create index if not exists designs_project_id_idx on designs(project_id);
create index if not exists design_objects_design_id_idx on design_objects(design_id);
create index if not exists design_objects_lineage_id_idx on design_objects(lineage_id);
create index if not exists object_definitions_user_id_idx on object_definitions(user_id);
