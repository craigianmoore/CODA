-- FIFA CE: private read-only share links for mentees.
-- Closed to anon: RLS on, no policy, no anon grant. Only the server (service_role) touches it.
create table if not exists public.fifa_mentee_shares (
  token text primary key,
  owner text not null,
  mentee_id text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_viewed_at timestamptz
);
create index if not exists fifa_mentee_shares_mentee_idx on public.fifa_mentee_shares (owner, mentee_id);
alter table public.fifa_mentee_shares enable row level security;
revoke all on public.fifa_mentee_shares from anon, authenticated;
grant select, insert, update, delete on public.fifa_mentee_shares to service_role;
