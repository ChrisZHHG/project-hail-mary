# Market Readiness — an honest audit

*Audited 2026-08-12 against `6f79578`. Every claim below is traceable to a file
and line, or to a command you can re-run. Where something is good, it says so.*

---

## The one-sentence diagnosis

**It doesn't feel far from sellable because features are missing — it feels far
because the app has never been used by a second human being, and every hard
problem in a software business lives in the gap between one user and two.**

Right now the unit of "onboarding a new customer" is *a code release*: their
program has to be typed into `lib/data/seed.ts`, shipped as a Dexie migration,
and baked into the static build. That is the whole answer. Everything else in
this document is downstream of it.

---

## Part 0 — What is genuinely good (this matters for strategy)

Don't rebuild these. They're the asset:

- **The coach engine is a real, differentiated product.** `lib/coach/*` +
  `tests/coach-*.test.ts` — the rules are derived from a written program, not
  fitted to data, and they're replay-tested against real history. Nothing in
  TrueCoach / TrainHeroic / Everfit drafts a session *and defends the number*.
- **The repository seam actually holds.** `lib/data/repository.ts` +
  `lib/data/reactive.ts`. Phase 1 was done properly; swapping the backend is a
  contained change. This is the reason a rewrite isn't needed.
- **136 passing tests**, clean typecheck, clean build.
- **The landing page tells the truth** (`app/for-coaches/page.tsx`), including a
  "What it isn't" section. That's rarer and more valuable than it looks.
- **The UX premise — every number shows its work — is a genuine wedge.**

The strategy below is built on protecting these and discarding almost everything
else that's single-user-shaped.

---

## Part 1 — Five structural facts

These are not "nice to fix". Each one, alone, makes the product unsellable.

### 1. Programs are code, not data

The `Repository` interface (`lib/data/repository.ts:46-130`) has **no method to
create or edit a Program, Workout, or WorkoutExercise.** `addExercise()` only
appends to the freestyle catalog. Programs live in `lib/data/seed.ts` and reach
users through Dexie migrations (`lib/data/db.ts:46-195`, thirteen versions of
them).

Consequence: a coach cannot write a program. Signing up customer #2 means you
edit TypeScript, bump a Dexie version, redeploy, and bump `public/sw.js`.

### 2. The static export has one user's program baked into the HTML

```
app/session/[workoutId]/page.tsx:5   generateStaticParams() → SEED_WORKOUTS
```

`pnpm build` emits exactly three session pages: `wo-fb1`, `wo-fb2`, `wo-fb3`.
With `output: "export"` (`next.config.ts:10`) there is no fallback — a user
whose program has different workout ids gets a 404 on their own session screen.

This makes `output: export` the **binding architectural constraint**. It also
blocks Stripe webhooks, server-side entitlement checks, email, and OG image
generation. Removing it is cheap today and expensive later; it should be the
first commit of the real work.

### 3. "Coach" currently means "whoever is holding this phone"

`app/coach/page.tsx:81` — `<h1 className="...">Chris</h1>`, hardcoded. Every
hook on that page reads the **local device's** IndexedDB. There is no client
list, no invitation, no coach→client write path, no client→coach read path.

Meanwhile `/for-coaches` sells "each client's next session… you approve it."
The distance between that sentence and the code *is* the product.

### 4. Every new install is pre-loaded with Chris's training history

`lib/data/db.ts:199-218` seeds the demo session, `WATCH_SESSIONS`,
`JULY14_TOEPRESS_*`, and `JULY15_*` into every fresh database. A new user's
Progress chart opens showing someone else's lifts.

Worse, this becomes **data loss** the moment cloud sync is real:

```
lib/data/autoSync.ts:114-116   await pushToCloud(userId);   // push FIRST
                               await pullFromCloud();       // then pull
```

A fresh device seeds Chris's rows with *stable ids* (`sess-demo-fb1`,
`we-wo-fb1-0`, …), then pushes them into the signed-in user's cloud account
before pulling anything down. Those upserts collide by primary key with the
user's real rows. Install on a second phone → your real data is overwritten by
seed data. This bug is invisible with one device and one user, which is exactly
why it's still here.

Related, and stated openly in the file's own header comment
(`lib/data/autoSync.ts:16-17`): **deletes are not synced.** A set deleted on the
phone comes back from the other device. For a paid app that is a correctness
bug, not a known limitation.

### 5. You are flying blind, and CI has been red for weeks

- **CI has failed on every one of the last 6 commits to `main`** (verified via
  the Actions API, 2026-08-11 back through 2026-08-10). Cause:
  `tests/coach-replay.test.ts:16` defaults to
  `~/Downloads/hailmary-backup-2026-07-28.json`. The `describe.skipIf` guard on
  line 35 doesn't help — Vitest still runs the suite factory to collect tests,
  so the `readFileSync` on line 37 throws `ENOENT` on any machine that isn't the
  owner's laptop. `pnpm test` fails for every other developer and for CI.
- **No error tracking, no analytics.** `grep -riE "sentry|posthog|plausible"` →
  zero hits. When a paying customer hits `app/error.tsx`, you never find out.
- **Deploys are manual** (`npx vercel --prod --yes`) with a manual `sw.js`
  `VERSION` bump as the only cache-invalidation signal. No staging, no rollback.
  (`AGENTS.md` says `phm-v24`; the file says `phm-v32` — the drift is the point.)
- **Supabase free tier pauses after 7 days idle** (your own `docs/ROADMAP.md:9`).
  A customer opening the app on Monday would find it dead.

---

## Part 2 — The strategic fork: who is actually the buyer?

There are two products in this repo, and trying to ship both is the main reason
"market ready" feels infinitely far away. Pick one *now*; it changes what you
build next week.

| | **A — Lifters (B2C)** | **B — Coaches (B2B)** ✅ |
|---|---|---|
| Price point | $5–10/mo | $50–200/mo |
| Competitors | Strong, Hevy, Boostcamp — excellent, cheap, huge catalogs | TrueCoach, TrainHeroic, Everfit — expensive, clunky, no reasoning |
| Your edge | "It explains why" — real, but hard to monetize at $8 | "It drafts the session and defends the number" — nobody does this |
| Table stakes | Enormous exercise DB, Apple Health, social, Watch app | Client list, program builder, sign-off |
| Users needed for $2k MRR | ~300 paying consumers | ~20 coaches |

**Recommendation: B.** Not close. B2C fitness is a brutal, saturated, low-ARPU
market where you'd spend a year building catalog parity before anyone notices
the thing that makes you good. Coaches have budget, a specific expensive pain
(programming is hours a week), and are reachable one at a time. Your existing
asset — an engine that proposes and justifies — is a coach's tool, and your
landing page already knows this.

Committing to B means accepting some losses, listed in Part 5.

### The most valuable advice in this document

**Sell it before it's multi-tenant.**

Making the software multi-tenant is 2–3 months. Finding out whether coaches will
pay is 2 weeks, and you can do it now, at `6f79578`, with zero code:

1. Take 3–5 coaches. Ask for one client each and their current program.
2. Run the engine for them **manually** — you have `tests/coach-replay.test.ts`,
   which replays the rules over a real backup and prints what it would have
   prescribed. That's the product, minus the UI.
3. Email them the drafted session each week. Charge $50/month from week one.
   Money changing hands is the only signal that isn't flattery.
4. Count how many weeks they keep paying and what they argue with.

If it works, you'll build Tier 0 knowing exactly which parts matter, and you'll
have revenue and reference customers. If it doesn't work, you saved a quarter.
Concierge-first is not a shortcut around building the product — it is how you
find out which product to build.

---

## Part 3 — The gap ledger

Ordered by dependency, not by effort. Nothing in a later tier is worth starting
before its predecessors, with the single exception of Tier 2's legal work, which
has long lead times and should run in parallel from day one.

### Tier 0 — Can a second person use it at all? *(~3–4 weeks)*

Nothing else in this document is reachable until these are true.

- [ ] **Drop `output: "export"`.** Move to a real Vercel build with dynamic
      routes. Unblocks Tiers 1–4. Do this first; it's a small diff now.
- [ ] **Delete the seed for new accounts.** `lib/data/db.ts:199-218` seeds one
      person's history into everyone. Keep it behind a `?demo=1` flag if you
      want a sales demo; never as the default.
- [ ] **Program authoring.** Add create/update/delete for `Program`, `Workout`,
      `WorkoutExercise` to the `Repository` interface, plus a builder UI. ⚠️ This
      collides with the positional-id rule in `AGENTS.md`
      (`we-<workout>-<idx>`, append-only) — a user-editable program needs
      **opaque, stable ids** (uuid/nanoid) and a separate `order` column. Design
      this migration carefully; it's the riskiest change in the whole plan.
- [ ] **Accounts and roles.** `coach` / `client`, an `org` or `coach_id`, and an
      invitation flow. RLS extended so a coach can read/write their clients'
      rows (`supabase/schema.sql` today only has `user_id = auth.uid()`).
- [ ] **Generalize `/coach` to a client list.** Remove the hardcoded name.
- [ ] **Onboarding.** Empty state → pick or build a program → units, bodyweight,
      training days. Today there is no first-run experience at all.
- [x] **Fix CI.** Done in this branch — `tests/coach-replay.test.ts` now collects
      without the backup file (`pnpm test` → 136 passed, 2 skipped).

### Tier 1 — Won't lose their data *(~2 weeks)*

Trust is the whole product for a training log. One lost month of history and the
customer is gone permanently, and tells their peers.

- [ ] **Pull before push on a device's first sync.** Reverses
      `lib/data/autoSync.ts:114-116` and closes the seed-overwrite path.
- [ ] **Tombstones + per-row last-write-wins on `updated_at`.** Makes deletes
      propagate and stops arrival-order from deciding conflicts.
- [ ] **Server-side automatic backup**, replacing the "you haven't backed up in
      14 days" nudge on `app/page.tsx:247`. Nudging a user to protect their own
      data is a local-first stance; it isn't a paid-product stance.
- [ ] **Cross-device schema-version guard.** An old client must refuse to sync
      against a newer cloud schema rather than corrupt it.
- [ ] **Restore path with a dry-run preview** before it overwrites.

### Tier 2 — Legally sellable *(start now — long lead times)*

This tier can kill the company *after* the product works, which is the worst
possible time. Start it in parallel with Tier 0.

- [ ] **Written license from Austin Johansen.** `SOUL.md:46` says the method is
      "used with consent" — consent for a personal tool is not a commercial
      license. You are proposing to sell his intellectual property. Get a real
      agreement (flat licence, revenue share, or equity) *before* you take money,
      while everyone is still friendly.
- [ ] **Privacy policy + Terms of Service.** Currently zero hits for
      `privacy|terms|gdpr` anywhere in the repo. Non-optional: fitness/health
      data is GDPR Art. 9 special-category data, and PIPEDA applies if any coach
      is Canadian.
- [ ] **Account deletion + data export.** GDPR Art. 15/17. There's an export in
      `lib/backup.ts`; there is no delete-my-account anywhere.
- [ ] **Trademark search on "NextSet."** Your own `lib/brand.ts:11` already flags
      this. Do it before any money goes behind the name — fitness is a crowded
      class 9/41 space.
- [ ] **CC-BY-SA compliance review** for `public/exercises/*`. Share-alike has
      real implications for a commercial product; confirm attribution placement
      satisfies the licence, or commission original art.
- [ ] **A support address that a human reads.**

### Tier 3 — Can charge money *(~2 weeks, needs Tier 0)*

- [ ] Stripe Checkout + Customer Portal (needs a server — see Tier 0).
- [ ] Subscription state enforced **in RLS**, not in the UI.
- [ ] Trial → paid conversion, dunning, failed-card recovery.
- [ ] A pricing page. Suggested opening position: **$79/coach/month, unlimited
      clients, 14-day trial.** Price on the hours of programming you replace,
      never per-client — per-client pricing punishes exactly the customers you
      want most.

### Tier 4 — Can operate it *(~1 week)*

- [ ] Sentry (errors) + PostHog (funnel). You cannot run a business blind.
- [ ] Supabase Pro ($25/mo) so the database stops pausing.
- [ ] CI deploys on merge to `main`, with the `sw.js` version bumped
      automatically. Manual deploy + manual cache bump will eventually ship a
      broken client to every installed PWA.
- [ ] A staging environment, and a rollback you have actually rehearsed.
- [ ] Uptime monitoring on the app and on Supabase.

### Tier 5 — Can grow it *(after the first 10 paying coaches)*

- [ ] Fix the landing page (see Part 4 — it's currently broken on desktop).
- [ ] Define one activation metric — suggested: **a coach sends a drafted
      session to a real client in week 1** — and instrument the funnel to it.
- [ ] iOS push notifications (works in an installed PWA on iOS 16.4+), or
      Capacitor for App Store presence. A training app that can't remind you
      loses on retention.
- [ ] Onboarding that imports a coach's existing program from a spreadsheet.
      Their programs live in Google Sheets today; that's your migration path and
      your biggest adoption lever.

---

## Part 4 — Bugs found during the audit

Small, concrete, worth fixing regardless of which path you choose.

1. **The landing page renders as a 448px column on desktop.**
   `app/layout.tsx:44` wraps everything in `max-w-md`, so
   `app/for-coaches/page.tsx:20`'s `max-w-2xl` is clamped to 28rem. Coaches
   evaluate software on a laptop. Your only marketing asset is currently a phone
   column with a lot of whitespace either side. **This is the highest
   value-per-minute fix in the repo.**
2. **`/for-coaches` is an orphan URL** — nothing links to it
   (`BottomNav.tsx:63` only references it to hide the nav). No `robots.txt`, no
   sitemap, no OpenGraph image, so it has no search presence and no link
   preview when a coach shares it.
3. ~~**CI red since 2026-08-10**~~ — `tests/coach-replay.test.ts` (Part 1.5).
   **Fixed in this branch.**
4. **`AGENTS.md` says `phm-v24`; `public/sw.js` says `phm-v32`.**

---

## Part 5 — What to cut

Professional advice includes what to stop doing. Committing to Path B means:

- **Nutrition (ROADMAP Phase 4) — cut.** Correctly identified as out of scope in
  the roadmap already; keep it that way.
- **The watch CSV import (`lib/data/watchCsv.ts`, `watchHistory.ts`) — freeze.**
  It exists to reconstruct one person's June history. It is not a product
  feature; it's archaeology.
- **The 中/EN toggle — decide deliberately.** 282 translated keys
  (`lib/i18n.ts`) maintained under a strict purity rule, serving an audience of
  one. North American coaches read English. Either keep it as a personal
  affordance and accept that it taxes every new screen, or freeze it English-only
  for the coach surfaces. What you shouldn't do is keep paying the tax by
  default without having chosen to.
- **New engine features — freeze.** The engine is the strongest part of the
  product and the weakest use of your next month. It is already better than what
  you can sell; nothing is gated on making it smarter.

---

## Part 6 — Definition of "market ready"

Not a feeling. It's this list, and you can check it off:

1. A coach who has never met you signs up, builds a program, invites a client,
   and sends them a session — **without you touching anything.**
2. That client logs a workout on their phone, offline, and it appears in the
   coach's view.
3. Either of them can delete their account and take their data with them.
4. They pay you, and can cancel without emailing you.
5. When it breaks, **you find out before they tell you.**
6. Nothing in the product is anyone else's IP without a signed agreement.

Six sentences. Today, **zero** of them are true. That's the honest measure of the
distance — and also why it's shorter than it feels: it's one architectural
decision (kill the static export, make programs data) and about eight weeks of
disciplined work, not a rewrite. The engine, the seam, and the reasoning-first
UX all survive intact.

---

## Suggested sequence

| When | What |
|---|---|
| **This week** | ~~Fix CI~~ (done). Fix the landing-page width. Email Austin about a licence. Start the trademark search. |
| **Weeks 1–2** | Concierge test: 3–5 coaches, run the engine by hand, charge money. Build nothing. |
| **Weeks 3–6** | Tier 0, if and only if the concierge test found willing payers. |
| **Weeks 7–8** | Tier 1 (data integrity) + Tier 4 (observability). |
| **Weeks 9–10** | Tier 2 finished, Tier 3 (billing). First paid signup that isn't a friend. |

The order matters more than the schedule. Tier 0 before revenue validation is the
expensive mistake available here — it's three months of work aimed at a guess.
