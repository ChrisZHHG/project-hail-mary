import type { SetLog, WorkoutExercise } from "./types";

/**
 * Which exercise a logged set belongs to — one answer, used everywhere.
 *
 * Two fields can carry it. `exerciseId` is written at log time and is a fact
 * about what happened. `workoutExerciseId` points at a row in the *plan*, which
 * a coach can reorder, retarget, or delete later. So the direct field wins and
 * the assignment is only a fallback: **history must not change when the plan
 * changes.**
 *
 * This was inlined at four call sites with two opposite precedences —
 * `lib/coach/history.ts` and `lib/coach/volume.ts` preferred the direct field,
 * `lib/lookup.ts` and `app/progress/page.tsx` preferred the assignment. That was
 * invisible only because no set ever carried both: the program logger writes
 * `workoutExerciseId` alone (`components/ExecutionCard.tsx`), freestyle and
 * manual entry write `exerciseId` alone. Backfilling `exerciseId` onto every log
 * makes both present, and the divergence would have become real — the same set
 * reading as a bench press to the engine and a leg curl to the lookup page.
 */
export function resolveExerciseId(
  log: Pick<SetLog, "exerciseId" | "workoutExerciseId">,
  exerciseIdByAssignment: ReadonlyMap<string, string>
): string | undefined {
  if (log.exerciseId) return log.exerciseId;
  return log.workoutExerciseId ? exerciseIdByAssignment.get(log.workoutExerciseId) : undefined;
}

/** assignment id → exercise id: the index `resolveExerciseId` reads. */
export function indexAssignments(
  workoutExercises: readonly WorkoutExercise[]
): Map<string, string> {
  return new Map(workoutExercises.map((w) => [w.id, w.exerciseId]));
}
