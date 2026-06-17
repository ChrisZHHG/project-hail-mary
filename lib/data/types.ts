/** Domain model — mirrors the coach's program structure (program → workout →
 *  exercise → sets/reps/RIR/weight) plus readiness checks. Local-first; ids are
 *  stable strings so seeded rows are idempotent and logs reference them safely. */

export type ExerciseCategory = "compound" | "isolation" | "cardio" | "mobility";
export type WorkoutSection = "warmup" | "main" | "cardio";

export interface Exercise {
  id: string;
  name: string;
  /** Primary muscle group — drives the workload heatmap. */
  targetMuscle: string;
  category: ExerciseCategory;
  /** Hardcore coaching cue surfaced as a tooltip (from the sheet's NOTES). */
  biomechanicNotes?: string;
  /** Optional form-video URL. */
  link?: string;
  /** Whether a weight is logged (false for cardio / bodyweight isometrics). */
  isWeighted: boolean;
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
  workoutId: string;
  /** YYYY-MM-DD (local). */
  date: string;
  startedAt: number;
  completedAt?: number;
}

export interface SetLog {
  id: string;
  sessionId: string;
  workoutExerciseId: string;
  setNumber: number;
  weight?: number;
  reps?: number;
  rir?: number;
  done: boolean;
  timestamp: number;
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
}

/** A workout assignment joined with its exercise — the shape the logger renders. */
export interface ExerciseInstance extends WorkoutExercise {
  exercise: Exercise;
}
