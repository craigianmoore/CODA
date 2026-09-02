-- CODA schema — one table per storage prefix the app used to use
-- (coach: -> coaches, cet: -> cets, obs: -> observations, course: -> courses)
-- Run this once in the Supabase SQL editor for your new CODA project.

create table if not exists coaches (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists cets (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists courses (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists observations (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists admin_settings (
  id int primary key default 1,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Completed Tasks: attendance/coursework tracking per coach, per course.
-- Same per-record pattern as the other tables above.
create table if not exists completed_tasks (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table completed_tasks enable row level security;
create policy "public read/write completed_tasks" on completed_tasks for all using (true) with check (true);

-- kv_settings: small singleton settings that used to live under single
-- window.storage keys (adminSettings, adminLockouts, closedCourseNumbers,
-- and the Lead-Admin session lock, adminSession). One row per key.
create table if not exists kv_settings (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table kv_settings enable row level security;
create policy "public read/write kv_settings" on kv_settings for all using (true) with check (true);

-- Trial users: named PIN access for your CET trial group.
-- You add/remove rows here any time — no redeploy needed.
create table if not exists trial_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Row Level Security: open for now since access is gated by the app's PIN
-- screen rather than Supabase auth. Tighten this later if you add real auth.
alter table coaches enable row level security;
alter table cets enable row level security;
alter table courses enable row level security;
alter table observations enable row level security;
alter table admin_settings enable row level security;
alter table trial_users enable row level security;

create policy "public read/write coaches" on coaches for all using (true) with check (true);
create policy "public read/write cets" on cets for all using (true) with check (true);
create policy "public read/write courses" on courses for all using (true) with check (true);
create policy "public read/write observations" on observations for all using (true) with check (true);
create policy "public read/write admin_settings" on admin_settings for all using (true) with check (true);
create policy "public read trial_users" on trial_users for select using (true);

-- Example: add your trial users here, or do it via the Supabase Table Editor UI.
-- insert into trial_users (name, pin, is_admin) values
--   ('Craig Moore', '2468', true),
--   ('Jane Smith', '1357', false);
