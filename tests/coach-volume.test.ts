import { describe, expect, it } from "vitest";
import {
  EVIDENCE_MIN_SETS,
  lastSessionSetsFor,
  recentTopSets,
  weeklyMuscleVolume,
} from "@/lib/coach";
import type { Exercise, SetLog, WorkoutExercise } from "@/lib/data/types";

const ex = (id: string, targetMuscle: string): Exercise => ({
  id,
  name: id,
  targetMuscle,
  category: "compound",
  isWeighted: true,
});

const we = (id: string, workoutId: string, exerciseId: string, targetSets: number): WorkoutExercise => ({
  id,
  workoutId,
  exerciseId,
  order: 0,
  section: "main",
  targetSets,
  targetRepsRange: "4-8",
});

const log = (p: Partial<SetLog> & { sessionId: string }): SetLog => ({
  id: p.id ?? Math.random().toString(36).slice(2),
  setNumber: p.setNumber ?? 1,
  done: p.done ?? true,
  timestamp: p.timestamp ?? 0,
  ...p,
});

describe("lastSessionSetsFor — history follows the movement, not the assignment", () => {
  // The same movement carries a different workoutExercise id on each block day.
  const wexs = [
    we("we-fb1-2", "wo-fb1", "ex-press", 2),
    we("we-fb2-2", "wo-fb2", "ex-press", 2),
  ];
  const dates = new Map([
    ["s1", "2026-07-20"],
    ["s2", "2026-07-23"],
  ]);

  it("sees Full Body 1's sets when prescribing Full Body 2", () => {
    const logs = [log({ sessionId: "s1", workoutExerciseId: "we-fb1-2", weight: 130, reps: 4 })];
    const found = lastSessionSetsFor({
      exerciseId: "ex-press",
      setLogs: logs,
      workoutExercises: wexs,
      sessionDates: dates,
    });
    expect(found).toHaveLength(1);
    expect(found[0].weight).toBe(130);
  });

  it("uses only the most recent session", () => {
    const logs = [
      log({ sessionId: "s1", workoutExerciseId: "we-fb1-2", weight: 130, reps: 4 }),
      log({ sessionId: "s2", workoutExerciseId: "we-fb2-2", weight: 135, reps: 5 }),
    ];
    const found = lastSessionSetsFor({
      exerciseId: "ex-press",
      setLogs: logs,
      workoutExercises: wexs,
      sessionDates: dates,
    });
    expect(found.map((l) => l.weight)).toEqual([135]);
  });

  it("counts freestyle sets logged straight against the exercise", () => {
    const logs = [log({ sessionId: "s2", exerciseId: "ex-press", weight: 140, reps: 6 })];
    expect(
      lastSessionSetsFor({
        exerciseId: "ex-press",
        setLogs: logs,
        workoutExercises: wexs,
        sessionDates: dates,
      })
    ).toHaveLength(1);
  });

  it("excludes the session in progress", () => {
    const logs = [log({ sessionId: "s2", exerciseId: "ex-press", weight: 140, reps: 6 })];
    expect(
      lastSessionSetsFor({
        exerciseId: "ex-press",
        setLogs: logs,
        workoutExercises: wexs,
        sessionDates: dates,
        excludeSessionId: "s2",
      })
    ).toEqual([]);
  });

  it("keeps one loading style when a session mixed pull-ups and pulldowns", () => {
    const logs = [
      log({ sessionId: "s2", exerciseId: "ex-press", reps: 6, timestamp: 1 }),
      log({ sessionId: "s2", exerciseId: "ex-press", weight: 165, reps: 3, timestamp: 2 }),
    ];
    const found = lastSessionSetsFor({
      exerciseId: "ex-press",
      setLogs: logs,
      workoutExercises: wexs,
      sessionDates: dates,
    });
    // Finished on the stack, so that's the lineage being progressed.
    expect(found).toHaveLength(1);
    expect(found[0].weight).toBe(165);
  });
});

describe("recentTopSets — the evidence behind the number", () => {
  const wexs = [we("we-fb1-2", "wo-fb1", "ex-press", 2)];

  it("returns one top set per session, oldest first", () => {
    const logs = [
      log({ sessionId: "a", exerciseId: "ex-press", weight: 100, reps: 5 }),
      log({ sessionId: "a", exerciseId: "ex-press", weight: 90, reps: 8 }),
      log({ sessionId: "b", exerciseId: "ex-press", weight: 110, reps: 4 }),
    ];
    const series = recentTopSets({
      exerciseId: "ex-press",
      setLogs: logs,
      workoutExercises: wexs,
      sessionDates: new Map([["a", "2026-07-20"], ["b", "2026-07-23"]]),
    });
    expect(series.map((s) => s.weight)).toEqual([100, 110]);
  });

  it("keeps one loading lineage — a BW session must not read as a collapse", () => {
    const logs = [
      log({ sessionId: "a", exerciseId: "ex-press", weight: 120, reps: 15 }),
      log({ sessionId: "b", exerciseId: "ex-press", reps: 6 }), // bodyweight
    ];
    const series = recentTopSets({
      exerciseId: "ex-press",
      setLogs: logs,
      workoutExercises: wexs,
      sessionDates: new Map([["a", "2026-07-20"], ["b", "2026-07-23"]]),
    });
    // Latest session was bodyweight, so the weighted session isn't in the line.
    expect(series).toHaveLength(1);
    expect(series[0].weight).toBeUndefined();
  });
});

describe("weeklyMuscleVolume", () => {
  const exercises = [ex("ex-press", "Chest"), ex("ex-curl", "Biceps")];
  const wexs = [
    we("we-fb1-2", "wo-fb1", "ex-press", 2),
    we("we-fb2-2", "wo-fb2", "ex-press", 2),
    we("we-fb1-5", "wo-fb1", "ex-curl", 2),
  ];
  const base = {
    exercises,
    // `workoutExercises` resolves logged sets; `plan` is what the week owes.
    // Same array here — there is only one program in this fixture.
    workoutExercises: wexs,
    plan: wexs,
    weekStart: "2026-07-20",
    today: "2026-07-23",
  };

  it("sums the block's weekly plan across every day", () => {
    const v = weeklyMuscleVolume({ ...base, setLogs: [], sessionDates: new Map() });
    expect(v.find((m) => m.muscle === "Chest")?.planned).toBe(4); // 2 sets × 2 days
    expect(v.find((m) => m.muscle === "Biceps")?.planned).toBe(2);
  });

  it("counts only completed sets inside the current week", () => {
    const logs = [
      log({ sessionId: "old", workoutExerciseId: "we-fb1-2", weight: 100, reps: 5 }),
      log({ sessionId: "now", workoutExerciseId: "we-fb1-2", weight: 100, reps: 5 }),
      log({ sessionId: "now", workoutExerciseId: "we-fb1-2", weight: 100, reps: 5, done: false }),
    ];
    const v = weeklyMuscleVolume({
      ...base,
      setLogs: logs,
      sessionDates: new Map([
        ["old", "2026-07-13"], // previous week
        ["now", "2026-07-21"],
      ]),
    });
    const chest = v.find((m) => m.muscle === "Chest")!;
    expect(chest.done).toBe(1);
    expect(chest.underPlan).toBe(true);
  });

  it("reports days since a muscle was last trained, regardless of week", () => {
    const v = weeklyMuscleVolume({
      ...base,
      setLogs: [log({ sessionId: "old", workoutExerciseId: "we-fb1-2", weight: 100, reps: 5 })],
      sessionDates: new Map([["old", "2026-07-13"]]),
    });
    expect(v.find((m) => m.muscle === "Chest")?.daysSinceTrained).toBe(10);
    expect(v.find((m) => m.muscle === "Biceps")?.daysSinceTrained).toBeNull();
  });

  it("flags muscles the block plans below the literature reference", () => {
    const v = weeklyMuscleVolume({ ...base, setLogs: [], sessionDates: new Map() });
    // 4 planned sets for chest is under the ~10 sets/week the umbrella review cites.
    expect(v.find((m) => m.muscle === "Chest")?.underEvidence).toBe(true);
    expect(EVIDENCE_MIN_SETS).toBe(10);
  });
});
