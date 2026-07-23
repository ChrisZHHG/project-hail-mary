-- Project Hail Mary — enable Supabase Realtime for auto-sync (Phase 2, option B)
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Idempotent: only adds tables not already in the publication; safe to re-run.
--
-- Adds the 8 app tables to the `supabase_realtime` publication so the client
-- receives INSERT/UPDATE streams for the signed-in user's rows (RLS still
-- filters each subscriber to their own rows). DELETEs are not synced yet
-- (option B) — that needs tombstones + `replica identity full`, a later step.

-- Ensure the publication exists (Supabase creates it by default; guard anyway).
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

-- Add each app table to the publication if not already a member.
do $$
declare t text;
begin
  foreach t in array array[
    'exercises','programs','workouts','workoutExercises',
    'sessions','setLogs','readinessChecks','exerciseGear'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Verify what's published (optional):
-- select tablename from pg_publication_tables
--   where pubname = 'supabase_realtime' and schemaname = 'public' order by 1;
