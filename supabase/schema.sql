-- Project Hail Mary — Supabase schema (Phase 2: cloud sync + auth)
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run (idempotent: IF NOT EXISTS + drop/recreate policies & triggers).
--
-- Mirrors the Dexie/IndexedDB tables (lib/data/types.ts) with two additions:
--   • user_id     — row owner; defaults to auth.uid(); RLS confines each user
--                   to their own rows (single-user-multi-device today, coach
--                   multi-tenant later).
--   • updated_at  — last-write-wins clock for sync (auto-touched on update).
-- Table + column names deliberately match the TypeScript field names (camelCase,
-- quoted) so a synced row maps 1:1 to a Dexie record — the sync layer needs no
-- field renaming. Stable text `id`s are shared across users, so every primary
-- key is composite: (user_id, id).

-- ---------- helper: bump updated_at on every UPDATE ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- exercises ----------
create table if not exists public.exercises (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  "aliasZh" text,
  pattern text,
  "targetMuscle" text not null,
  category text not null,
  "biomechanicNotes" text,
  link text,
  "isWeighted" boolean not null default false,
  media jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------- programs ----------
create table if not exists public.programs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  "createdAt" bigint not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------- workouts ----------
create table if not exists public.workouts (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  "programId" text not null,
  name text not null,
  "dayOrder" integer not null,
  subtitle text,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------- workoutExercises ----------
create table if not exists public."workoutExercises" (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  "workoutId" text not null,
  "exerciseId" text not null,
  "order" integer not null,
  section text not null,
  "targetSets" integer not null,
  "targetRepsRange" text not null,
  "targetRir" text,
  notes text,
  "cardioSpec" text,
  optional boolean,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------- sessions ----------
create table if not exists public.sessions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  "workoutId" text,
  date text not null,
  "startedAt" bigint not null,
  "completedAt" bigint,
  source text,
  kind text,
  "durationSec" integer,
  kcal integer,
  "avgHr" integer,
  "importedVolumeLbs" double precision,
  "clockTime" text,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------- setLogs ----------
create table if not exists public."setLogs" (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  "sessionId" text not null,
  "workoutExerciseId" text,
  "exerciseId" text,
  "setNumber" integer not null,
  weight double precision,
  reps integer,
  rir integer,
  done boolean not null default false,
  timestamp bigint not null,
  variant text,
  estimated boolean,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------- readinessChecks ----------
create table if not exists public."readinessChecks" (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  date text not null,
  energy integer not null,
  soreness integer not null,
  sleep integer not null,
  stress integer not null,
  mood integer not null,
  "jointPain" integer not null,
  "totalScore" integer not null,
  level text not null,
  recommendation text not null,
  timestamp bigint not null,
  "soreMap" jsonb,
  "noteToCoach" text,
  "sleepHours" double precision,
  "proteinTaken" boolean,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------- exerciseGear ----------
create table if not exists public."exerciseGear" (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  "exerciseId" text not null,
  values jsonb not null,
  "updatedAt" bigint not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, "exerciseId")
);

-- ---------- RLS + grants + updated_at trigger (uniform across tables) ----------
do $$
declare t text;
begin
  foreach t in array array[
    'exercises','programs','workouts','workoutExercises',
    'sessions','setLogs','readinessChecks','exerciseGear'
  ] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);

    execute format('grant select, insert, update, delete on public.%I to authenticated', t);

    execute format('drop trigger if exists touch_updated_at on public.%I', t);
    execute format(
      'create trigger touch_updated_at before update on public.%I
         for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------- planOverrides (added Aug 2026 — coach edits to the engine's draft) ----------
-- Run this block on an existing project; the DO block below re-applies RLS,
-- grants and the trigger to it. Keyed by the assignment it overrides.
create table if not exists public."planOverrides" (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  "workoutExerciseId" text not null,
  weight double precision,
  reps integer,
  sets integer,
  skip boolean,
  note text,
  "updatedAt" bigint not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, "workoutExerciseId")
);

do $$
begin
  execute 'alter table public."planOverrides" enable row level security';
  execute 'drop policy if exists "own rows" on public."planOverrides"';
  execute 'create policy "own rows" on public."planOverrides" for all to authenticated
             using (user_id = auth.uid()) with check (user_id = auth.uid())';
  execute 'grant select, insert, update, delete on public."planOverrides" to authenticated';
  execute 'drop trigger if exists touch_updated_at on public."planOverrides"';
  execute 'create trigger touch_updated_at before update on public."planOverrides"
             for each row execute function public.touch_updated_at()';
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'planOverrides'
  ) then
    execute 'alter publication supabase_realtime add table public."planOverrides"';
  end if;
end $$;
