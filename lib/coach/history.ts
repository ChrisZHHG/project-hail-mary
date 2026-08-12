import type { SetLog, WorkoutExercise } from "../data/types";
import { indexAssignments, resolveExerciseId } from "../data/resolve";
import { loadingKind, topSet, type LoadingKind } from "./progression";

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

/**
 * The top set of each of the last `limit` sessions, oldest → newest.
 *
 * This is the evidence behind a recommendation. The engine reasons from the
 * most recent session alone, so showing only its output asks the coach to take
 * the number on faith; showing the trajectory lets them see what it saw.
 */
export function recentTopSets(input: HistoryInput & { limit?: number }): SetLog[] {
  const { exerciseId, setLogs, workoutExercises, sessionDates, excludeSessionId } = input;
  const limit = input.limit ?? 5;
  const byAssignment = indexAssignments(workoutExercises);

  const bySession = new Map<string, SetLog[]>();
  for (const l of setLogs) {
    if (!l.done || l.sessionId === excludeSessionId) continue;
    if (l.weight == null && l.reps == null) continue;
    if (resolveExerciseId(l, byAssignment) !== exerciseId) continue;
    bySession.set(l.sessionId, [...(bySession.get(l.sessionId) ?? []), l]);
  }

  const perSession = [...bySession.entries()]
    .map(([sid, logs]) => ({ date: sessionDates.get(sid) ?? "", logs }))
    .filter((s) => s.date)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (perSession.length === 0) return [];

  // Stay in one loading lineage, as progression does. A trend that reads
  // "120×15 › BW×6" looks like a collapse when it's really two different
  // movements sharing an id ("pull-ups OR pulldown").
  const latest = perSession[perSession.length - 1].logs;
  const kind = loadingKind(latest.reduce((a, b) => (b.timestamp > a.timestamp ? b : a), latest[0]));

  return perSession
    .map((s) => topSet(s.logs, kind))
    .filter((s): s is SetLog => s != null)
    .slice(-limit);
}

/**
 * How many of the most recent sessions showed no improvement.
 *
 * A coach notices "he's been stuck at 130 for three weeks" instantly; the engine
 * only ever compares against the single previous session, so it cannot. This
 * surfaces the stall — it deliberately does **not** change the prescription,
 * because what to *do* about a plateau (deload, swap the movement, push through)
 * is a coaching decision, not one to guess at in code. See docs/COACH-ENGINE.md Q3.
 */
export function stallLength(series: SetLog[]): number {
  let stalled = 0;
  for (let i = series.length - 1; i > 0; i--) {
    const cur = series[i];
    const prev = series[i - 1];
    const improved =
      (cur.weight ?? 0) > (prev.weight ?? 0) ||
      ((cur.weight ?? 0) === (prev.weight ?? 0) && (cur.reps ?? 0) > (prev.reps ?? 0));
    if (improved) break;
    stalled++;
  }
  return stalled;
}

export function lastSessionSetsFor(input: HistoryInput): SetLog[] {
  const { exerciseId, setLogs, workoutExercises, sessionDates, excludeSessionId } = input;
  const byAssignment = indexAssignments(workoutExercises);

  const mine = setLogs.filter((l) => {
    if (!l.done || l.sessionId === excludeSessionId) return false;
    if (l.weight == null && l.reps == null) return false;
    return resolveExerciseId(l, byAssignment) === exerciseId;
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
