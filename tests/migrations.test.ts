import { describe, expect, it } from "vitest";
import { backfillExerciseId, tagLogsWithExercise } from "@/lib/data/migrations";
import { indexAssignments } from "@/lib/data/resolve";
import { lastSessionSetsFor, prescribe, topSet } from "@/lib/coach";
import type { SetLog, WorkoutExercise } from "@/lib/data/types";

const we = (id: string, exerciseId: string): WorkoutExercise => ({
  id,
  workoutId: "wo-1",
  exerciseId,
  order: 0,
  section: "main",
  targetSets: 2,
  targetRepsRange: "4-8",
});

const log = (p: Partial<SetLog> & { id: string; sessionId: string }): SetLog => ({
  setNumber: p.setNumber ?? 1,
  done: p.done ?? true,
  timestamp: p.timestamp ?? 0,
  weight: p.weight ?? 130,
  reps: p.reps ?? 6,
  ...p,
});

const WEXS = [we("we-1", "ex-press"), we("we-2", "ex-legCurl")];

describe("backfillExerciseId", () => {
  const byAssignment = indexAssignments(WEXS);

  it("recovers the exercise from the assignment", () => {
    expect(backfillExerciseId({ workoutExerciseId: "we-1" }, byAssignment)).toBe("ex-press");
  });

  it("leaves a set that already recorded its exercise alone", () => {
    expect(
      backfillExerciseId({ exerciseId: "ex-press", workoutExerciseId: "we-2" }, byAssignment)
    ).toBeUndefined();
  });

  it("has nothing to recover for a freestyle set with neither field", () => {
    expect(backfillExerciseId({}, byAssignment)).toBeUndefined();
  });

  it("cannot invent history for a set whose assignment is already gone", () => {
    expect(backfillExerciseId({ workoutExerciseId: "we-gone" }, byAssignment)).toBeUndefined();
  });
});

describe("tagLogsWithExercise", () => {
  it("stamps program sets, counts pre-tagged ones, and reports the unresolvable", () => {
    const logs = [
      log({ id: "a", sessionId: "s1", workoutExerciseId: "we-1" }),
      log({ id: "b", sessionId: "s1", workoutExerciseId: "we-2" }),
      log({ id: "c", sessionId: "s1", exerciseId: "ex-squat" }), // freestyle
      log({ id: "d", sessionId: "s1", workoutExerciseId: "we-gone" }), // already detached
    ];

    const report = tagLogsWithExercise(logs, WEXS);

    expect(logs[0].exerciseId).toBe("ex-press");
    expect(logs[1].exerciseId).toBe("ex-legCurl");
    expect(logs[2].exerciseId).toBe("ex-squat"); // untouched
    expect(logs[3].exerciseId).toBeUndefined();

    expect(report).toEqual({ stamped: 2, alreadyTagged: 1, unresolvable: ["d"] });
  });

  it("never changes which exercise an already-tagged set resolves to", () => {
    // A set logged as a bench press against an assignment since retargeted to a
    // leg curl. The migration must not "correct" it to match the current plan.
    const logs = [log({ id: "a", sessionId: "s1", exerciseId: "ex-press", workoutExerciseId: "we-2" })];
    tagLogsWithExercise(logs, WEXS);
    expect(logs[0].exerciseId).toBe("ex-press");
  });

  it("is idempotent", () => {
    const logs = [log({ id: "a", sessionId: "s1", workoutExerciseId: "we-1" })];
    const first = tagLogsWithExercise(logs, WEXS);
    const second = tagLogsWithExercise(logs, WEXS);
    expect(first).toEqual({ stamped: 1, alreadyTagged: 0, unresolvable: [] });
    expect(second).toEqual({ stamped: 0, alreadyTagged: 1, unresolvable: [] });
    expect(logs[0].exerciseId).toBe("ex-press");
  });

  it("leaves nothing unresolvable across a well-formed history", () => {
    const logs = [
      log({ id: "a", sessionId: "s1", workoutExerciseId: "we-1" }),
      log({ id: "b", sessionId: "s1", workoutExerciseId: "we-2" }),
      log({ id: "c", sessionId: "s1", exerciseId: "ex-squat" }),
    ];
    expect(tagLogsWithExercise(logs, WEXS).unresolvable).toEqual([]);
  });
});

/**
 * The failure this whole migration exists to prevent, stated end to end.
 *
 * A user-editable program means a user can delete an assignment. Before the
 * backfill, that severed the only link between a set and its movement: every
 * history query dropped the set, and the engine greeted a months-old lift with
 * "first time, start at the bottom of the range" — plausible-looking, wrong, and
 * completely silent.
 */
describe("deleting an assignment must not erase the history logged against it", () => {
  const dates = new Map([["s1", "2026-07-20"]]);
  const tagged = [
    log({ id: "a", sessionId: "s1", workoutExerciseId: "we-1", weight: 130, reps: 6 }),
    log({ id: "b", sessionId: "s1", workoutExerciseId: "we-1", weight: 130, reps: 7, setNumber: 2 }),
  ];
  tagLogsWithExercise(tagged, WEXS);

  // The coach deletes the bench press assignment from the program.
  const afterDelete = WEXS.filter((w) => w.id !== "we-1");

  it("the sets still resolve to the movement", () => {
    const sets = lastSessionSetsFor({
      exerciseId: "ex-press",
      setLogs: tagged,
      workoutExercises: afterDelete,
      sessionDates: dates,
    });
    expect(sets).toHaveLength(2);
  });

  it("the engine does not call a months-old lift a first attempt", () => {
    const sets = lastSessionSetsFor({
      exerciseId: "ex-press",
      setLogs: tagged,
      workoutExercises: afterDelete,
      sessionDates: dates,
    });
    const rx = prescribe({
      targetSets: 2,
      targetRepsRange: "4-8",
      targetRir: "1-2",
      isWeighted: true,
      last: topSet(sets),
    });
    expect(rx.reasonCode).not.toBe("firstTime");
    expect(rx.action).not.toBe("first-time");
  });

  it("without the backfill it would have — the untagged control", () => {
    const untagged = [log({ id: "a", sessionId: "s1", workoutExerciseId: "we-1" })];
    const sets = lastSessionSetsFor({
      exerciseId: "ex-press",
      setLogs: untagged,
      workoutExercises: afterDelete,
      sessionDates: dates,
    });
    expect(sets).toHaveLength(0);
    expect(
      prescribe({
        targetSets: 2,
        targetRepsRange: "4-8",
        isWeighted: true,
        last: topSet(sets),
      }).reasonCode
    ).toBe("firstTime");
  });
});
