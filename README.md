# Project Hail Mary

An offline-first **strength & conditioning logger** PWA — a thumb-friendly replacement
for the Google-Sheet workout tracker. Built for the gym floor: sweaty fingers, big
targets, smart defaults, zero spreadsheet pinch-zoom.

> Repo codename **"Project Hail Mary."** The in-app display name is a placeholder
> (`Hail Mary`) until Austin + Chris pick the final one — change it once in
> [`lib/brand.ts`](lib/brand.ts).

Built from the *Project Kinesis* architecture doc. Coaching content + seed program
courtesy of **Austin Johansen** (BCRPA PT), used with consent.

## What's in the MVP

- **Execution Engine** — today's workout, in order, by section (warm-up / work / cardio).
  Big `+/-` steppers, one-tap **RIR** picker, **last-time prefill** (`Last: 130lbs × 4 @2 RIR`),
  hardcore coaching **cues** + form-video links, edit/resume, live volume HUD.
- **Readiness** — 6 sliders (energy, sleep, mood, soreness, stress, joint pain) →
  live 0–100 score + a volume recommendation. Joint pain > 3 forces a downscale.
- **Workload Visualizer** — per-session tonnage trend + all-time muscle-load heatmap.
- **PWA** — installable ("Add to Home Screen"), works offline (service worker + IndexedDB).

## Tech

- **Next.js 16** (App Router) · **React 19** · **TypeScript** · **Tailwind v4**
- **Dexie** (IndexedDB) for local-first storage
- Hand-written service worker (`public/sw.js`) + native `app/manifest.ts`
- Deep-space / sci-fi theme: true black, laser-orange + neon-cyan accents

## Run locally

```bash
pnpm install
pnpm dev                   # http://localhost:3000
pnpm build && pnpm start   # production
pnpm gen:icons             # regenerate PWA icons from public/icons/mark.svg
```

Data is stored **on-device** in IndexedDB (DB name `hailmary`). It seeds Austin's
3-day full-body block on first launch. To wipe and re-seed: clear site data, or in
DevTools → Application → IndexedDB → delete `hailmary`.

## Architecture notes

- **Repository seam.** Every component talks to the `Repository` interface in
  [`lib/data/repository.ts`](lib/data/repository.ts), not to Dexie directly. The current
  impl is `DexieRepository` (local). Going multi-user later = write a `SupabaseRepository`
  (Postgres + Auth + coach/client roles) behind the same interface — no component changes.
- **Domain model** ([`lib/data/types.ts`](lib/data/types.ts)) mirrors the coach's structure:
  `program → workout → workoutExercise → setLog`, plus `readinessCheck`.
- **Seed** ([`lib/data/seed.ts`](lib/data/seed.ts)) is transcribed from the shared sheet,
  including NOTES (the cues) and a small prior session so prefill + the chart aren't empty.

## Deploy (Vercel)

```bash
pnpm dlx vercel          # first run: log in, link the project
pnpm dlx vercel --prod   # production deploy
```

Or import the GitHub repo at vercel.com/new (zero config — Next.js is detected).

## Deferred (not in this trial)

Supabase sync + auth + coach/client roles · AI Q&A (RAG over the coach's theory docs) ·
supplement-timing cards · Cal.com scheduling · HRV-based programming · sales/SaaS.
