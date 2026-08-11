# The Coach Engine — encoding Austin's method as a recommendation algorithm

**Status: PLAN / for coach review. Nothing here is built yet.**

Goal: the app should tell Chris *what to do today and what numbers to hit*, so he
never has to remember the plan or decide the load — while staying **strictly on
the coach's program**. Freestyle stays a side path for ad-hoc gym days.

This document is written to be read by **Austin** — every rule below is stated in
plain language so he can confirm, correct, or veto it. The numbers in §1 are
measured from the program he actually prescribed, not invented.

---

## 1. What Austin actually prescribes (measured from the current block)

Program v2 (June 2026 sheet), 3 full-body days — Tue / Thu / Sat-or-Sun.

| | Value |
|---|---|
| Sets per exercise | **1 or 2 — never 3+** (29 main assignments: 15×1 set, 14×2 sets) |
| Rep range | **4-8** (22/29); pulldown 3-8; cable crunch 5-10 |
| RIR | **1-2** everywhere (FB2 written as plain "2"); **squat RIR 3** |
| Session size | ~14 main sets, 9-11 exercises |
| Weekly volume | 43 main sets total |

Weekly sets per muscle: Back 9 · Chest 6 · Biceps 6 · Quads 6 · Shoulders 4 ·
Core 3 · Hamstrings 3 · Calves 3 · Triceps 2 · Adductors 1.

Every day also carries: CARS + anterior-tilt stretches (warm-up), and FB1/FB3
add steps + Zone 2 bike (cardio).

> **Source of truth = the coach's sheet** ("Chris (Block 1)"), read Aug 2026.
> ⚠️ The app's seed data currently contradicts it: seed says RIR **0-1** on 28/29
> movements and squat 1-2, and gives FB1 one set of lateral raises. The sheet says
> RIR **1-2** (squat **3**) and FB1 lateral raise **2 sets**. Chris's recollection
> ("leave one or two in the tank") matches the sheet. Treat the sheet as correct
> and fix the seed (see Q1).

**Read of the method** (to be confirmed by Austin): this is a *minimum effective
dose kept deliberately submaximal, repeated often*. It is far below mainstream
hypertrophy volume — matching his own account that thinking "more was better"
was the mistake of his first four years. Because each muscle only sees 1-2 sets
per session **and none of them are taken to failure** (RIR 1-2, squat 3),
recovery is fast enough to train it again ~48h later. That is the mechanism
behind "frequency > load": low dose + never to failure = repeatable often.

**Top set vs back-off set.** The sheet gives one RIR per exercise, but Chris's
in-person coaching adds a nuance: on a 2-set exercise he is told to push the
*first* set and keep reps in reserve on the *second*. If Austin confirms this,
it has a direct engine consequence — **progression must be judged on the top
(first) set**, not on the most recent set logged, which is today's behaviour of
`repo.getLastEntry()` and would otherwise read the back-off set as a regression.

**Therefore progression is NOT more sets.** Sets are fixed by the block.
Progression happens *inside* the 1-2 prescribed sets, as load and reps. This is
the single most important design constraint of the engine.

---

## 2. The method as rules (the rulebook Austin reviews)

- **R1 — Follow the block.** The engine never invents exercises. It executes the
  coach's day (FB1/FB2/FB3) and only adjusts loads, reps, and whether to back
  off. New exercises come from the coach's monthly block, not the algorithm.
- **R2 — Rotate, don't cram.** Days run in order with **≥48h between sessions**.
  A missed day is skipped, never doubled up — cramming breaks the recovery the
  low volume depends on.
- **R3 — Double progression inside the range.** Per exercise, versus last time:
  - hit the **top** of the range (e.g. 8) at target RIR → **+1 load step**, restart at the bottom of the range
  - **well past** the top (≥2 reps over) → the load is mis-set, not merely light:
    jump straight to the load that Epley says lands at the bottom of the range
    (guarded at 1.5× against a mis-logged rep count). Replayed against Chris's
    real history this reproduces his own corrections — 120×15 → **162.5** (he
    went to 165) and 15×15 → **20** (exactly what he did).
  - **inside** the range → same load, **+1 rep**
  - **below** the range (e.g. <4) → **−7.5% load**
  - hit the top only by **digging past the prescribed RIR** → hold, don't reward
    it; the method depends on stopping short of failure.
- **R3b — One lineage per loading style.** Movements written as either/or
  ("Band Assisted Pullups OR Lat Pulldown") share an exercise id but mix
  bodyweight and stack sets. BW×6 says nothing about the pulldown stack, so
  progression compares bodyweight with bodyweight and load with load.
- **R4 — Autoregulate to readiness.** The weekly check-in scales the day:
  `go` → take the progression step · `steady` → hold load, chase the rep ·
  `caution` → drop to the minimum sets and stop 1 rep earlier ·
  `down` → isometric / mobility version of the day, or rest.
- **R5 — Respect local soreness.** If a body area is still sore ≥7/10, that
  muscle's exercises are reduced or skipped today, and the reason is shown.
- **R6 — Always say why.** Every recommendation shows its reason and links to
  the relevant theory (`lib/theory.ts`). No black box.

R3's load step comes from `BRAND.weightStep`; machines/cables and dumbbells may
need different steps (open question Q4).

---

## 3. Why this is not RP / Fitbod / Trainerize

- **RP Hypertrophy** adds sets weekly toward MRV and forces a deload. Austin
  fixes sets at 1-2 and progresses load/reps. Copying RP would contradict him.
- **Fitbod** invents a fresh workout each session. That breaks R1 — the coach's
  block *is* the product.
- **Trainerize** is a delivery pipe with no algorithm: the coach writes every
  session by hand. Our engine is what would sit *on top* of such a platform.

Our niche is the intersection: **a specific coach's method, encoded, with the
reasoning visible** — plus the Chinese-first / recognize-the-machine-by-picture
layer that none of them have.

---

## 4. What the engine consumes and emits

**Already in the app** — no new capture needed:
`setLogs` (load/reps/RIR per set) · `sessions.date` · `exercise.targetMuscle` ·
`workoutExercise.targetSets/targetRepsRange/targetRir` · `readinessCheck`
(energy, soreness, sleep, stress, mood, jointPain, `soreMap` area→0-10,
`totalScore`, `level`) · `repo.getLastEntry()`.

**Missing = the engine itself**, as pure functions in `lib/coach/`:

| Function | Answers |
|---|---|
| `nextSession(history, today)` | which day is due (R2), or "rest" |
| `prescribe(instance, lastEntry, readiness)` | load + reps for each exercise (R3+R4) |
| `muscleStatus(logs, readiness)` | per-muscle: hours since trained, weekly sets vs the block's target, soreness (R5) |
| `explain(...)` | the human-readable reason for each of the above |

Pure functions, no Dexie — fully unit-testable against Chris's real history, and
runnable *before* any UI exists.

---

## 5. Build order

1. ~~Rulebook + `lib/coach/` pure functions + tests, replayed over real logs.~~
   ✅ **Done (Aug 2026)** — `lib/coach/{progression,schedule}.ts`, 34 unit tests,
   plus `tests/coach-replay.test.ts`:
   ```
   HM_BACKUP=~/Downloads/hailmary-backup-*.json HM_REPORT=/tmp/r.txt pnpm test replay
   ```
   Replaying 67 real session-to-session transitions, the engine's calls track
   what Chris actually did, and are more conservative where they differ.
2. **Coach review pass** — send Austin §1-2 + the replay output; settle §6.
3. **"Today" surface** — home page shows the due day, each exercise pre-filled
   with the recommended numbers and its reason.
4. Only then: heatmap/status polish, deload handling, block editing.

⚠️ The replay reads a *backup file*, so it reflects whatever program targets
that export contained. Backups taken before the RIR fix still show `@RIR 0-1`;
re-export from the app (v25+) to replay against the corrected 1-2.

---

## 6. Open questions for Austin

- **Q1 — RIR (resolved against the app, pending Austin).** The sheet says 1-2
  (squat 3); the app's seed says 0-1 (squat 1-2). The sheet + Chris agree, so the
  seed looks wrong and should be corrected. Remaining question for Austin: is
  there a *newer* block than "Chris (Block 1)" that tightened RIR — or was 0-1
  never his instruction?
- **Q1b — Top set vs back-off.** Confirm the two-set pattern: first set pushed,
  second set with more in reserve? If yes, the engine benchmarks the first set.
- **Q2 — Progression rate.** Is "top of range at target RIR → add load" the right
  trigger, or should it require hitting the top on *all* prescribed sets?
- **Q3 — Deload.** Blocks are re-written monthly. Should the engine schedule a
  lighter week (e.g. week 4), or does the new block handle that?
- **Q4 — Load steps.** Smallest sensible jump per equipment type (machine stack,
  cable, dumbbell, barbell)?
- **Q5 — Missed sessions.** After a week off, restart the block, or resume where
  it left off with reduced load?
- **Q6 — Sore-area rule.** Is "skip at ≥7/10" his actual threshold, and does he
  prefer skipping the movement or substituting the isometric variant?
- **Q7 — Cardio/steps.** Should Zone 2 and the 8000-step target be part of the
  daily recommendation, or stay background habits?
