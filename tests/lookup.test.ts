import { describe, it, expect } from "vitest";
import { buildExerciseMemory } from "@/lib/lookup";
import type { Exercise, SetLog, WorkoutExercise } from "@/lib/data/types";

const ex = (o: Partial<Exercise>): Exercise => ({ id: "ex1", name: "Bench", targetMuscle: "Chest", category: "compound", isWeighted: true, ...o });
const log = (o: Partial<SetLog>): SetLog => ({ id: `l${Math.random()}`, sessionId: "s1", setNumber: 1, done: true, timestamp: 0, ...o });

describe("buildExerciseMemory", () => {
  it("aggregates by direct exerciseId and picks the newest set as `last`", () => {
    const dates = new Map([["s1", "2026-06-01"], ["s2", "2026-06-08"]]);
    const mem = buildExerciseMemory(
      [ex({})],
      [],
      [
        log({ exerciseId: "ex1", weight: 100, reps: 5, timestamp: 1, sessionId: "s1" }),
        log({ exerciseId: "ex1", weight: 110, reps: 5, timestamp: 2, sessionId: "s2" }),
      ],
      dates
    );
    expect(mem).toHaveLength(1);
    expect(mem[0].last?.weight).toBe(110);
    expect(mem[0].last?.date).toBe("2026-06-08");
    expect(mem[0].totalSets).toBe(2);
  });

  it("resolves program sets via workoutExerciseId", () => {
    const wex: WorkoutExercise[] = [
      { id: "we1", workoutId: "w", exerciseId: "ex1", order: 0, section: "main", targetSets: 3, targetRepsRange: "5" },
    ];
    const mem = buildExerciseMemory([ex({})], wex, [log({ workoutExerciseId: "we1", weight: 90, reps: 6, timestamp: 5 })], new Map([["s1", "2026-06-01"]]));
    expect(mem[0].last?.weight).toBe(90);
  });

  it("excludes cardio and mobility exercises", () => {
    expect(buildExerciseMemory([ex({ id: "c", category: "cardio" })], [], [], new Map())).toHaveLength(0);
    expect(buildExerciseMemory([ex({ id: "m", category: "mobility" })], [], [], new Map())).toHaveLength(0);
  });

  it("ignores not-done and empty sets", () => {
    const mem = buildExerciseMemory([ex({})], [], [log({ exerciseId: "ex1", weight: 100, reps: 5, done: false })], new Map([["s1", "x"]]));
    expect(mem[0].totalSets).toBe(0);
    expect(mem[0].last).toBeUndefined();
  });

  it("collapses to the top-weight set per session for recent/series", () => {
    const mem = buildExerciseMemory(
      [ex({})],
      [],
      [
        log({ exerciseId: "ex1", weight: 100, reps: 5, timestamp: 1, sessionId: "s1" }),
        log({ exerciseId: "ex1", weight: 120, reps: 3, timestamp: 2, sessionId: "s1" }),
      ],
      new Map([["s1", "2026-06-01"]])
    );
    expect(mem[0].recent[0].weight).toBe(120); // top set of the session
    expect(mem[0].series).toHaveLength(1); // one session
    expect(mem[0].totalSets).toBe(2); // all sets counted
  });
});
