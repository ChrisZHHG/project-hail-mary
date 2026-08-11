-- Early-access waitlist. Run in Supabase → SQL Editor. Idempotent.
--
-- Security posture: the anon key ships in the browser, so this table grants
-- INSERT and nothing else. Anyone can add themselves; nobody can read the list
-- back with the public key. Read it in the Supabase dashboard, or with the
-- service-role key server-side — never from the client.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  clients text,
  source text,
  created_at timestamptz not null default now()
);

-- One row per address; a repeat signup collides and is treated as success.
create unique index if not exists waitlist_email_key on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

drop policy if exists "anyone can join" on public.waitlist;
create policy "anyone can join" on public.waitlist
  for insert to anon, authenticated
  with check (true);

-- INSERT only. Deliberately no SELECT/UPDATE/DELETE for anon or authenticated:
-- a public key that can read the list is a public list.
grant insert on public.waitlist to anon, authenticated;
