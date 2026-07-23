<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Hail Mary — agent guide

Offline-first strength-training logger **PWA**. Next.js 16 (App Router, static
`output: export`) · React 19 · TypeScript · Tailwind v4 · Dexie/IndexedDB.
**Local-first: all data lives on-device — the phone IS the database.** Deployed on
Vercel → https://projecthalimary.vercel.app

> **Mission / the *why*:** see [`SOUL.md`](SOUL.md) — data-driven visible progress +
> science-backed method (Austin's "frequency > load"), not ego lifting.

(For the Next.js version caveat, see the block above — async `params`, the
`metadata`/`viewport` split, and `manifest.ts` `force-static` are already used
correctly; don't "fix" them.)

## Commands
- `pnpm dev` — local dev server
- `pnpm test` — Vitest suite (`tests/`, excluded from the build)
- `pnpm lint` · `pnpm typecheck` · `pnpm build`
- CI (`.github/workflows/ci.yml`) runs typecheck + lint + test + build on push/PR.

## Deploy (important, non-obvious)
- Deploy with `npx vercel --prod --yes`. The project is **NOT git-auto-deploy** —
  pushing `main` alone does not deploy.
- **BUMP `VERSION` in `public/sw.js` on EVERY deploy** meant to reach installed
  PWAs, or the service worker keeps serving the cached old app (it has no other
  update signal). Currently `phm-v20`.
- A stuck client can force-refresh in-app: 数据 · 备份 · 刷新 → 刷新应用.

## Architecture
- **Repository seam:** components should talk to the `Repository` interface
  (`lib/data/repository.ts`) + reactive hooks (`lib/data/hooks.ts`), NOT Dexie
  directly. Currently **leaky** — ~9 files import `db` directly; fixing it is
  Phase 1 of `docs/ROADMAP.md` (prerequisite for the planned Supabase backend).
  Don't add new direct-`db` usage in components.
- **Domain model** (`lib/data/types.ts`): program → workout → workoutExercise →
  setLog, plus readinessCheck and exerciseGear.
- **Seed & migrations** (`lib/data/db.ts`, `lib/data/seed.ts`): Dexie versioned
  upgrades. ⚠️ WorkoutExercise ids are positional (`we-<workout>-<idx>`) and
  **append-only** — historical setLogs reference them. Bump the Dexie version for
  any schema/data change (see the v2 setLog remap and the v10 field rename).

## Conventions & gotchas
- **Units: lbs-first.** Weights are stored canonically in lbs; kg is display-only
  (`lib/prefs.ts`). `session.importedVolumeLbs` is a manually-entered session
  total, in lbs.
- **i18n purity** (`lib/i18n.ts`): the 中/EN toggle switches the WHOLE UI — never
  mix the two languages in one mode. Route user-facing chrome through `t()`.
  Coach-authored *content* (theory bodies, cues, official exercise English names,
  workout names) intentionally stays English.
- **Data reality:** single-device / local only (no cloud yet). The seeded June
  history is the owner's Strava-calibrated *estimates*, not live watch data (the
  watch can't export lifting volume). A user's on-device data isn't remotely
  visible/editable — build features that let the user edit their own data.
- **Exercise images:** clean B&W line-art (Everkinetic + wger, CC-BY-SA) with an
  `ExerciseIcon` pictogram fallback; fetch scripts live in `scripts/`. Never
  bulk-attach low-quality / colored / mismatched art — visuals must stay
  consistent (the invert filter assumes line-art).

## What's next
See **`docs/ROADMAP.md`** — the cloud (Supabase) + coach↔client productization
plan. Start with Phase 1 (repository-seam refactor + error boundaries).
