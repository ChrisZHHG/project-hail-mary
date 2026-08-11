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
}

export interface Workout {
  id: string;
  programId: string;
  name: string;
  dayOrder: number;
  /** e.g. "Tuesday" / "Saturday/Sunday". */
  subtitle?: string;
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
   *  reconstructed/imported sets, which carry `exerciseId` directly instead. */
  workoutExerciseId?: string;
  /** Direct exercise reference for sets with no program assignment. */
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

export interface ExerciseGear {
  exerciseId: string;
  /** Free-form setup values keyed by canonical english key, e.g. { seat: "4", pulley: "3", grip: "wide" }. */
  values: Record<string, string>;
  updatedAt: number;
}
