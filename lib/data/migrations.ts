import type { SetLog, WorkoutExercise } from "./types";
import { indexAssignments } from "./resolve";

/**
 * Data migrations, as pure functions.
 *
 * Deliberately not inline in `db.ts`. The v2 setLog remap — the most dangerous
 * code in this repo, since a mistake silently detaches history from the movement
 * that produced it — lives inside an upgrade closure and therefore has no tests
 * at all. Anything of that shape belongs out here where it can be run against a
 * fixture.
 */

/**
 * The exerciseId a set should be stamped with, or `undefined` to leave it alone.
 *
 * Program sets have always recorded only `workoutExerciseId` — a pointer into
 * the *plan*. That was safe while the plan was hardcoded seed data that nobody
 * could edit. Once a user can delete or retarget an assignment, that pointer is
 * the single thread holding a set to its movement: cut it and
 * `resolveExerciseId` returns undefined, the set drops out of every history
 * query, and `prescribe` reports "first time" on a lift with months behind it.
 * No error, and the wrong answer looks entirely plausible.
 *
 * So the exercise gets recorded as a fact at log time, and the assignment
 * becomes advisory. This recovers that fact for every set logged before the
 * change, while the assignments that explain them are still intact.
 */
export function backfillExerciseId(
  log: Pick<SetLog, "exerciseId" | "workoutExerciseId">,
  exerciseIdByAssignment: ReadonlyMap<string, string>
): string | undefined {
  if (log.exerciseId) return undefined; // already a recorded fact
  if (!log.workoutExerciseId) return undefined; // nothing to recover it from
  return exerciseIdByAssignment.get(log.workoutExerciseId);
}

/**
 * Make `order` a usable number on every assignment, unique within its workout.
 *
 * Two IndexedDB facts turn a sloppy `order` into a silent bug once a user can
 * author programs:
 *
 *  - A compound index skips any record where part of the key path is
 *    `undefined`. An assignment saved without `order` is therefore absent from
 *    `[workoutId+order]` — which is the *only* index `getExerciseInstances`
 *    reads. The row exists, still counts toward planned volume, and simply never
 *    appears in the session. No error anywhere.
 *  - IDB key order is number < date < string < binary < array. One `order` that
 *    arrived as `"3"` from an uncoerced form input sorts after every number,
 *    pinning that movement to the end of its workout permanently.
 *
 * Duplicates are legal here (the index is `[workoutId+order]`, not unique), and
 * ties break by primary key — which for the legacy positional ids is
 * lexicographic, so `we-wo-fb1-10` would come before `we-wo-fb1-2`.
 *
 * Rewrites in place, preserving the order things currently appear in. Returns
 * the ids it touched.
 */
export function normalizeAssignmentOrder(workoutExercises: WorkoutExercise[]): string[] {
  const byWorkout = new Map<string, WorkoutExercise[]>();
  for (const w of workoutExercises) {
    const group = byWorkout.get(w.workoutId);
    if (group) group.push(w);
    else byWorkout.set(w.workoutId, [w]);
  }

  const changed: string[] = [];
  for (const group of byWorkout.values()) {
    group
      .map((w, i) => ({ w, i, key: Number(w.order) }))
      .sort((a, b) => {
        // Unusable orders sort last, keeping their relative position.
        const av = Number.isFinite(a.key) ? a.key : Infinity;
        const bv = Number.isFinite(b.key) ? b.key : Infinity;
        return av - bv || a.i - b.i;
      })
      .forEach(({ w }, idx) => {
        if (w.order !== idx) {
          w.order = idx;
          changed.push(w.id);
        }
      });
  }
  return changed;
}

export interface BackfillReport {
  /** Sets that gained an exerciseId recovered from their assignment. */
  stamped: number;
  /** Sets that already carried one — freestyle, manual entry, reconstructed. */
  alreadyTagged: number;
  /**
   * Ids of sets that reference an assignment which no longer exists. Their
   * history is *already* unreachable — this migration cannot invent it, it can
   * only report it. Expected to be empty; a non-empty list means something
   * detached history before this ran.
   */
  unresolvable: string[];
}

/** Apply {@link backfillExerciseId} across a set of logs, in place. */
export function tagLogsWithExercise(
  logs: SetLog[],
  workoutExercises: readonly WorkoutExercise[]
): BackfillReport {
  const byAssignment = indexAssignments(workoutExercises);
  const report: BackfillReport = { stamped: 0, alreadyTagged: 0, unresolvable: [] };

  for (const log of logs) {
    if (log.exerciseId) {
      report.alreadyTagged++;
      continue;
    }
    const recovered = backfillExerciseId(log, byAssignment);
    if (recovered) {
      log.exerciseId = recovered;
      report.stamped++;
    } else if (log.workoutExerciseId) {
      report.unresolvable.push(log.id);
    }
  }

  return report;
}
