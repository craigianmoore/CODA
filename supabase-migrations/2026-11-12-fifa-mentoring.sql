-- FIFA Mentoring tracker (admin-only area). Safe to re-run.
-- Unlike CODA's other tables this one is NOT open to the anon key: RLS is on
-- with no policy and anon/authenticated have no grants, so only the server
-- (service_role, used by /api/fifa/*) can read or write it.
create table if not exists public.fifa_mentees (
  owner text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner, id)
);
alter table public.fifa_mentees enable row level security;
revoke all on public.fifa_mentees from anon, authenticated;
grant select, insert, update, delete on public.fifa_mentees to service_role;

-- Private storage bucket for the tracker page and the five FIFA toolkit PDFs
-- (uploaded by hand: tracker.html, meeting-1.pdf ... meeting-5.pdf).
insert into storage.buckets (id, name, public)
values ('fifa-mentoring', 'fifa-mentoring', false)
on conflict (id) do update set public = false;

notify pgrst, 'reload schema';
