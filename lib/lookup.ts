import type { Exercise, SetLog, WorkoutExercise } from "./data/types";

/** "What did I do last time on this machine?" — aggregates history per
 *  exercise (across every workout it appears in: the same leg curl spans
 *  FB1/FB2/FB3 with different assignment ids). Pure function over the three
 *  small tables; no extra indexes needed. */

export interface ExerciseSetEntry {
  date: string; // session date YYYY-MM-DD
  weight?: number;
  reps?: number;
  rir?: number;
  timestamp: number;
  /** Reconstructed from a described routine, not logged live — shown as "~". */
  estimated?: boolean;
}

export interface ExerciseMemory {
  exercise: Exercise;
  /** Most recent completed set (the "last time" answer). */
  last?: ExerciseSetEntry;
  /** Best (top-weight) set per recent session, newest first, max 3. */
  recent: ExerciseSetEntry[];
  totalSets: number;
}

export function buildExerciseMemory(
  exercises: Exercise[],
  wexs: WorkoutExercise[],
  logs: SetLog[],
  sessionDates: Map<string, string> // sessionId → date
): ExerciseMemory[] {
  const weToExercise = new Map(wexs.map((w) => [w.id, w.exerciseId]));
  const byExercise = new Map<string, SetLog[]>();
  for (const log of logs) {
    if (!log.done || (log.weight == null && log.reps == null)) continue;
    // Program-assigned sets resolve via the assignment; freestyle/reconstructed
    // sets carry the exercise directly.
    const exId =
      (log.workoutExerciseId && weToExercise.get(log.workoutExerciseId)) || log.exerciseId;
    if (!exId) continue;
    const arr = byExercise.get(exId);
    if (arr) arr.push(log);
    else byExercise.set(exId, [log]);
  }

  return exercises
    .filter((ex) => ex.category !== "cardio" && ex.category !== "mobility")
    .map((exercise) => {
      const sets = (byExercise.get(exercise.id) ?? []).sort((a, b) => b.timestamp - a.timestamp);
      const entry = (l: SetLog): ExerciseSetEntry => ({
        date: sessionDates.get(l.sessionId) ?? "",
        weight: l.weight,
        reps: l.reps,
        rir: l.rir,
        timestamp: l.timestamp,
        estimated: l.estimated,
      });
      // Collapse to the top-weight set per session, newest session first.
      const bySession = new Map<string, SetLog>();
      for (const l of sets) {
        const cur = bySession.get(l.sessionId);
        if (!cur || (l.weight ?? 0) > (cur.weight ?? 0)) bySession.set(l.sessionId, l);
      }
      const recent = [...bySession.values()]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 3)
        .map(entry);
      return {
        exercise,
        last: sets[0] ? entry(sets[0]) : undefined,
        recent,
        totalSets: sets.length,
      };
    })
    .sort((a, b) => (b.last?.timestamp ?? 0) - (a.last?.timestamp ?? 0));
}
