-- Catch-up migration for an EXISTING Supabase project whose live database
-- was created before CET Observations / RAPA existed. Safe to re-run.
-- (supabase-schema.sql already defines these for brand-new projects.)
create table if not exists public.cet_assessments (id text primary key, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.rapa_assessments (id text primary key, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.rapa_incidents (id text primary key, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.rapa_proposals (id text primary key, data jsonb not null, updated_at timestamptz not null default now());

do $$
declare t text;
begin
  foreach t in array array['cet_assessments','rapa_assessments','rapa_incidents','rapa_proposals'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "public read/write %s" on public.%I', t, t);
    execute format('create policy "public read/write %s" on public.%I for all using (true) with check (true)', t, t);
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated, service_role', t);
  end loop;
end $$;

notify pgrst, 'reload schema';
