import type { SetLog, WorkoutExercise } from "../data/types";
import { loadingKind, type LoadingKind } from "./progression";

/**
 * The previous session's sets for a *movement* — across every day of the block.
 *
 * Austin's block trains the same movements on all three days, so each one has a
 * separate `workoutExercise` id per day. Keying history off the assignment id
 * would make Full Body 2 blind to what happened on Full Body 1, and every
 * session would look like a first attempt. That would destroy the feature the
 * method depends on: training a movement 3×/week means three chances a week to
 * beat it, and the engine has to see all of them.
 *
 * Freestyle sets (logged by `exerciseId`) count too — a rep is a rep.
 */

export interface HistoryInput {
  exerciseId: string;
  setLogs: SetLog[];
  workoutExercises: WorkoutExercise[];
  /** sessionId → YYYY-MM-DD. */
  sessionDates: Map<string, string>;
  /** The in-progress session, excluded so today doesn't benchmark itself. */
  excludeSessionId?: string;
}

export function lastSessionSetsFor(input: HistoryInput): SetLog[] {
  const { exerciseId, setLogs, workoutExercises, sessionDates, excludeSessionId } = input;
  const weToExercise = new Map(workoutExercises.map((w) => [w.id, w.exerciseId]));

  const mine = setLogs.filter((l) => {
    if (!l.done || l.sessionId === excludeSessionId) return false;
    if (l.weight == null && l.reps == null) return false;
    const exId = l.exerciseId ?? (l.workoutExerciseId ? weToExercise.get(l.workoutExerciseId) : undefined);
    return exId === exerciseId;
  });
  if (mine.length === 0) return [];

  // Most recent session by date, falling back to timestamp within a day.
  const keyOf = (l: SetLog) => `${sessionDates.get(l.sessionId) ?? ""}|${l.sessionId}`;
  const latestKey = mine.reduce((best, l) => (keyOf(l) > best ? keyOf(l) : best), "");
  const sets = mine.filter((l) => keyOf(l) === latestKey);

  // An either/or movement ("pull-ups OR pulldown") can mix bodyweight and stack
  // sets in one session. Progress whichever the client actually finished on.
  const newest = sets.reduce((a, b) => (b.timestamp > a.timestamp ? b : a), sets[0]);
  const kind: LoadingKind = loadingKind(newest);
  const sameKind = sets.filter((l) => loadingKind(l) === kind);
  return sameKind.length ? sameKind : sets;
}
