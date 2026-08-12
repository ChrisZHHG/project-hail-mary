import type { Exercise, SetLog, WorkoutExercise } from "../data/types";
import { indexAssignments, resolveExerciseId } from "../data/resolve";

/**
 * Weekly hard-set count per muscle — the most evidence-backed training variable,
 * and the one the block is deliberately quiet about.
 *
 * Two reference points, kept separate on purpose:
 *
 *  - `planned`  — what Austin's block actually prescribes per week. This is the
 *                 target the client is accountable to.
 *  - `EVIDENCE_MIN_SETS` — the ~10 sets/week/muscle that an umbrella review of
 *                 14 meta-analyses (4,784 participants) reports as optimal for
 *                 hypertrophy. Austin's block sits below it for most muscles.
 *
 * We show both rather than "correcting" the coach. The literature figure is a
 * population average; a coach trading volume for joint health, recovery and
 * adherence is making a defensible call. Surfacing the gap is a conversation
 * starter for the coach, not a verdict on him — and per SOUL.md, never a
 * black box.
 */

/** Sets/week/muscle reported as optimal for hypertrophy (umbrella review, 2022). */
export const EVIDENCE_MIN_SETS = 10;

export interface MuscleVolume {
  muscle: string;
  /** Hard sets logged for this muscle so far this week. */
  done: number;
  /** Sets the block prescribes for this muscle per week. */
  planned: number;
  /** Days since this muscle was last trained; null if never. */
  daysSinceTrained: number | null;
  /** Below the block's own weekly target. */
  underPlan: boolean;
  /** Below the volume the literature associates with optimal hypertrophy. */
  underEvidence: boolean;
}

const toDays = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1) / 86_400_000;
};

export interface VolumeInput {
  exercises: Exercise[];
  /**
   * **Every** assignment, including retired programs' — this resolves *logged*
   * sets to muscles, so narrowing it would make sets logged under an old program
   * unresolvable and silently drop them from the "done" count.
   */
  workoutExercises: WorkoutExercise[];
  /**
   * The **active** program's assignments only — this is what the week is
   * supposed to contain. Separate from the above because the two answer
   * different questions; sharing one array was fine only while there could
   * never be a second program.
   */
  plan: WorkoutExercise[];
  setLogs: SetLog[];
  /** sessionId → YYYY-MM-DD, so sets can be placed in a week. */
  sessionDates: Map<string, string>;
  /** Monday-anchored start of the current week (repository `weekStart()`). */
  weekStart: string;
  today: string;
}

/**
 * Per-muscle weekly load, newest-pressure first (largest shortfall at the top).
 * Only completed sets count — a planned set that never happened isn't stimulus.
 */
export function weeklyMuscleVolume(input: VolumeInput): MuscleVolume[] {
  const { exercises, workoutExercises, plan, setLogs, sessionDates, weekStart, today } = input;
  const exById = new Map(exercises.map((e) => [e.id, e]));
  const byAssignment = indexAssignments(workoutExercises);

  const muscleOf = (l: SetLog): string | undefined => {
    const exId = resolveExerciseId(l, byAssignment);
    return exId ? exById.get(exId)?.targetMuscle : undefined;
  };

  const done = new Map<string, number>();
  const lastTrained = new Map<string, string>();
  for (const l of setLogs) {
    if (!l.done) continue;
    const muscle = muscleOf(l);
    const date = sessionDates.get(l.sessionId);
    if (!muscle || !date) continue;
    const prev = lastTrained.get(muscle);
    if (!prev || date > prev) lastTrained.set(muscle, date);
    if (date >= weekStart) done.set(muscle, (done.get(muscle) ?? 0) + 1);
  }

  // What the block asks for in a full week, across every training day.
  const planned = new Map<string, number>();
  for (const w of plan) {
    if (w.section !== "main") continue;
    const muscle = exById.get(w.exerciseId)?.targetMuscle;
    if (!muscle) continue;
    planned.set(muscle, (planned.get(muscle) ?? 0) + w.targetSets);
  }

  const muscles = new Set([...planned.keys(), ...done.keys()]);
  return [...muscles]
    .map((muscle) => {
      const d = done.get(muscle) ?? 0;
      const p = planned.get(muscle) ?? 0;
      const last = lastTrained.get(muscle);
      return {
        muscle,
        done: d,
        planned: p,
        daysSinceTrained: last ? toDays(today) - toDays(last) : null,
        underPlan: p > 0 && d < p,
        underEvidence: p > 0 && p < EVIDENCE_MIN_SETS,
      };
    })
    .sort((a, b) => b.planned - a.planned || b.done - a.done);
}
