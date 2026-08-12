# Project Hail Mary — Roadmap

Turn the single-user, local-first PWA into a cloud-backed app that can eventually
support coach ↔ client (the "sell" path) — without losing the offline-first UX.

## Guiding decisions

- **Supabase free tier is fine for personal + demo** (500 MB DB, 1 GB storage,
  50k monthly users, auth, unlimited API). **Caveat: free projects PAUSE after 7
  days idle** — first load after a pause is slow / needs a manual resume. Fine
  for a workout app opened a few times a week; a 24/7 *sellable* product needs
  Pro (~$25/mo).
- ~~**Keep `output: export` (static).**~~ **Reversed Aug 2026.** A static export
  has to enumerate every dynamic route at build time, so `/session/[workoutId]`
  could only ever serve the three seeded workout ids — which made user-authored
  programs impossible. Now a normal Vercel server build. The app is still
  client-rendered and offline-first; nothing reads a request.
- **Stay local-first.** Dexie remains the offline cache; Supabase becomes the
  sync layer / source of truth. Offline keeps working.

## Phase 1 — Repository-seam refactor + robustness  ✅ DONE (2026-07-23)

Supabase can only "drop in" if every component talks to the `Repository`
interface. This prerequisite (pure code, no external deps) is now complete:

- ✅ Extended `Repository` with every query/mutation the app needs — all-table
  reads, gear read/save, `setLog` update/delete, session import bulkPut,
  `addExercise`, plus `exportAll`/`importAll`/`schemaVersion` for backup.
- ✅ Moved every `useLiveQuery(db…)` into `lib/data/hooks.ts` (backed by the
  repo); components import hooks, never `db`.
- ✅ Added the reactive-subscribe seam: `useReactiveQuery` in
  `lib/data/reactive.ts` is the *only* `useLiveQuery` importer — a non-Dexie
  backend swaps just that one function for realtime subscriptions.
- ✅ Added `app/error.tsx` (client: retry + export-backup + hard-refresh) and
  `app/not-found.tsx`.
- **Done:** `db` is imported only by `lib/data/*` (+ tests); 11 files migrated
  off direct `db` (the 9 above + `SessionDetail` + `lib/backup.ts`);
  typecheck / lint / test / build all green.

## Phase 2 — Supabase cloud + auth (single user, multi-device)

**Human step (Chris):** create a free Supabase project → send me the Project URL
+ anon (public) key. The service-role key stays secret, never in the repo.

- Schema mirrors the Dexie tables + a `user_id` column + Row-Level Security
  (each user sees only their own rows).
- `SupabaseRepository` implements the `Repository` interface; realtime
  subscriptions feed the hooks layer.
- Auth: email magic-link (simplest). Offline/local mode still available.
- Sync: local-first — Dexie is the offline cache, push/pull to Supabase on
  connectivity; last-write-wins by timestamp (stable ids make this safe).
- **Done when:** sign in on two devices → same data; offline edits sync back.

## Phase 3 — Multi-tenant coach ↔ client  (the "sell" enabler; only after demand is validated)

- Roles: coach + client. A coach invites clients and sees a multi-client
  dashboard (today's `/coach` page, generalized).
- Editable, per-coach programs (today they're hardcoded seed data).
- New-user onboarding (assign a program, enter bodyweight/units).
- Billing (Stripe) + a landing page.
- Needs Supabase Pro (24/7) and a content/partnership agreement with Austin if
  his methodology is being sold.

## Phase 4 — Nutrition (optional, separate track)

- **Don't rebuild food logging** — MyFitnessPal's food database is better.
- If wanted later: import the MFP export ("Download Your Data" ZIP → food-diary
  CSV) into a 14-day **bodyweight + calories + macros + steps** trend with an
  over/under-eating assessment — i.e. auto-compute what Chris's Google tracking
  sheet does by hand.
- Until then: the Google Sheet + MFP is the workflow.

## Execution order

1. ~~**Phase 1**~~ — ✅ done (2026-07-23).
2. **Phase 2** — next; after Chris creates the Supabase project (Project URL +
   anon key).
3. **Phases 3–4** — decisions, not yet scheduled.
