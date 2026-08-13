/** Domain model — mirrors the coach's program structure (program → workout →
 *  exercise → sets/reps/RIR/weight) plus readiness checks. Local-first; ids are
 *  stable strings so seeded rows are idempotent and logs reference them safely. */

export type ExerciseCategory = "compound" | "isolation" | "cardio" | "mobility";
export type WorkoutSection = "warmup" | "main" | "cardio";

export interface Exercise {
  id: string;
  name: string;
  /** Chinese name — Chris recognizes movements by 中文名 + picture, not English. */
  aliasZh?: string;
  /** Movement-pattern key → pictogram in components/ExerciseIcon.tsx. */
  pattern?: string;
  /** Primary muscle group — drives the workload heatmap. */
  targetMuscle: string;
  category: ExerciseCategory;
  /** Hardcore coaching cue surfaced as a tooltip (from the sheet's NOTES). */
  biomechanicNotes?: string;
  /** Optional form-video URL. */
  link?: string;
  /** Whether a weight is logged (false for cardio / bodyweight isometrics). */
  isWeighted: boolean;
  /** Visual reference, best available layer: coach video > line-art image > pictogram fallback. */
  media?: { kind: "video" | "image"; src: string; attribution?: string };
}

export interface Program {
  id: string;
  name: string;
  createdAt: number;
  /**
   * When this program was last made the active one. The program with the
   * greatest `activatedAt` is active; undefined means never activated.
   *
   * A timestamp rather than an `isActive` boolean on purpose: sync is
   * last-write-wins per row, so two devices could each set a boolean true with
   * no way to arbitrate, and "exactly one is true" is an invariant something has
   * to enforce transactionally. A max has neither problem. It also isn't a
   * preference in localStorage — that isn't in ALL_TABLES, so it wouldn't be
   * backed up or synced, and each device would quietly disagree about which
   * program the lifter is on.
   */
  activatedAt?: number;
  /**
   * When this was archived, i.e. "deleted" in the UI. See the note on
   * `Workout.archivedAt` for why nothing here is ever really deleted.
   */
  archivedAt?: number;
}

export interface Workout {
  id: string;
  programId: string;
  name: string;
  dayOrder: number;
  /** e.g. "Tuesday" / "Saturday/Sunday". */
  subtitle?: string;
  /** JS weekday this day is scheduled on (0 = Sunday). Drives the calendar
   *  reminder and the 24h auto-publish deadline. Undefined = unscheduled, which
   *  is a valid state: the rotation still advances, there's just no clock on it. */
  scheduledDow?: number;
  /**
   * When this was archived. "Delete" in the UI archives rather than removes,
   * for three separate reasons — any one of them sufficient:
   *
   *  1. A hard delete does not currently work. `lib/data/autoSync.ts` registers
   *     `creating` and `updating` Dexie hooks but no `deleting` one, so a local
   *     delete is invisible to the sync layer and the cloud row survives; the
   *     inbound side drops DELETE events too. The next startup pull puts the row
   *     straight back. An archive is an UPDATE, which syncs today.
   *  2. `Session.workoutId` points here, and the progress page names historical
   *     sessions from it. Removing the row leaves that history anonymous.
   *  3. Ids are never reused, so an archived day can't collide with a stale
   *     `planPublications` row and silently publish a plan nobody signed off.
   *
   * A real delete becomes possible once delete-sync (tombstones) exists.
   */
  archivedAt?: number;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  order: number;
  section: WorkoutSection;
  targetSets: number;
  /** e.g. "4-8". */
  targetRepsRange: string;
  /** e.g. "2" or "3-4". Undefined where the coach left it blank. */
  targetRir?: string;
  /** Per-assignment note (optionality, cardio spec, etc.). */
  notes?: string;
  /** Cardio prescription text, e.g. "Zone 2 Cardio". */
  cardioSpec?: string;
  optional?: boolean;
  /** When this was archived — see `Workout.archivedAt`. Archived assignments
   *  drop out of the session and out of planned volume, but stay readable so
   *  the sets logged against them keep resolving. */
  archivedAt?: number;
}

export interface Session {
  id: string;
  /** Undefined for imported sessions (e.g. elliptical) with no program day. */
  workoutId?: string;
  /** YYYY-MM-DD (local). */
  date: string;
  startedAt: number;
  completedAt?: number;
  /** Where the record came from. Absent = logged in-app. */
  source?: "app" | "watch";
  kind?: "strength" | "cardio";
  durationSec?: number;
  kcal?: number;
  avgHr?: number;
  /** Manually-entered session total, in lbs (the watch never measured lifting
   *  volume, so this is an estimate). */
  importedVolumeLbs?: number;
  /** Original clock time as recorded, e.g. "8:29 AM". */
  clockTime?: string;
}

export interface SetLog {
  id: string;
  sessionId: string;
  /** Program assignment this set was logged against (in-app sets). Absent for
   *  freestyle / reconstructed / imported sets. */
  workoutExerciseId?: string;
  /** The movement performed — recorded at log time on *every* set since v14, not
   *  only unassigned ones. This is the authoritative reference: the assignment
   *  above is plan data that can be retargeted or deleted, and history must not
   *  move when the plan does. Read both through `resolveExerciseId`, never
   *  ad-hoc. Undefined only on pre-v14 rows whose assignment was already gone. */
  exerciseId?: string;
  setNumber: number;
  weight?: number;
  reps?: number;
  rir?: number;
  done: boolean;
  timestamp: number;
  /** Grip/stance variation for this set, e.g. "narrow" / "wide". */
  variant?: string;
  /** True when reconstructed from a described routine, not logged live. */
  estimated?: boolean;
}

export type ReadinessLevel = "go" | "steady" | "caution" | "down";

export interface ReadinessCheck {
  id: string;
  /** YYYY-MM-DD (local). */
  date: string;
  energy: number; // 1-5, higher better
  soreness: number; // 1-5, higher worse
  sleep: number; // 1-5, higher better
  stress: number; // 1-5, higher worse
  mood: number; // 1-5, higher better
  jointPain: number; // 1-5, higher worse
  totalScore: number; // 0-100
  level: ReadinessLevel;
  recommendation: string;
  timestamp: number;
  /** Where it's sore, the way the coach actually asks: area → 0-10 intensity. */
  soreMap?: Record<string, number>;
  /** Free-text answer to "how's the body feeling?" — surfaced in the coach view. */
  noteToCoach?: string;
  sleepHours?: number;
  proteinTaken?: boolean;
}

/** A workout assignment joined with its exercise — the shape the logger renders. */
export interface ExerciseInstance extends WorkoutExercise {
  exercise: Exercise;
}

/**
 * A coach's edit to what the engine proposed for one movement's next session.
 *
 * The engine computes; the coach decides. An override is the coach's verdict on
 * a single line of the draft — different numbers, fewer sets, or skip it — and
 * it always wins over the computed prescription.
 *
 * Deliberately scoped to the *next* session: once a set has been logged against
 * the assignment after `updatedAt`, the override is spent and the engine takes
 * over again. A standing override would quietly freeze that movement's
 * progression, which is the opposite of what a coach means by "this week, do X".
 */
export interface PlanOverride {
  /** The assignment being overridden — one live override per assignment. */
  workoutExerciseId: string;
  weight?: number;
  reps?: number;
  sets?: number;
  /** Coach struck this movement from the next session. */
  skip?: boolean;
  /** Coach's note to the client, shown alongside the numbers. */
  note?: string;
  updatedAt: number;
}

/**
 * The coach's sign-off on one day's draft.
 *
 * A coach's edits stay private until they say "send" — otherwise the client's
 * numbers shift under them while the coach is still mid-thought. But the client
 * must never be blocked waiting on a coach who got busy, so an unsent draft
 * goes live on its own 24h before the session is due (`AUTO_PUBLISH_LEAD_MS`).
 * Publishing early is what buys the coach: the client sees it sooner.
 */
export interface PlanPublication {
  workoutId: string;
  publishedAt: number;
  /** Who sent it — the coach, or the deadline. */
  by: "coach" | "auto";
  /** Optional message shown to the client with the session. */
  note?: string;
}

export interface ExerciseGear {
  exerciseId: string;
  /** Free-form setup values keyed by canonical english key, e.g. { seat: "4", pulley: "3", grip: "wide" }. */
  values: Record<string, string>;
  updatedAt: number;
}
