import { describe, expect, it } from "vitest";
import { indexAssignments, resolveExerciseId } from "@/lib/data/resolve";
import { lastSessionSetsFor, weeklyMuscleVolume } from "@/lib/coach";
import { buildExerciseMemory } from "@/lib/lookup";
import type { Exercise, SetLog, WorkoutExercise } from "@/lib/data/types";

const ex = (id: string, targetMuscle: string): Exercise => ({
  id,
  name: id,
  targetMuscle,
  category: "compound",
  isWeighted: true,
});

const we = (id: string, exerciseId: string): WorkoutExercise => ({
  id,
  workoutId: "wo-1",
  exerciseId,
  order: 0,
  section: "main",
  targetSets: 2,
  targetRepsRange: "4-8",
});

const log = (p: Partial<SetLog> & { sessionId: string }): SetLog => ({
  id: p.id ?? Math.random().toString(36).slice(2),
  setNumber: p.setNumber ?? 1,
  done: p.done ?? true,
  timestamp: p.timestamp ?? 0,
  weight: p.weight ?? 100,
  reps: p.reps ?? 5,
  ...p,
});

describe("resolveExerciseId", () => {
  const byAssignment = indexAssignments([we("we-1", "ex-legCurl")]);

  it("prefers the directly logged exercise over the assignment", () => {
    const l = log({ sessionId: "s1", exerciseId: "ex-press", workoutExerciseId: "we-1" });
    expect(resolveExerciseId(l, byAssignment)).toBe("ex-press");
  });

  it("falls back to the assignment when the set carries no exercise", () => {
    const l = log({ sessionId: "s1", workoutExerciseId: "we-1" });
    expect(resolveExerciseId(l, byAssignment)).toBe("ex-legCurl");
  });

  it("is undefined when the assignment is gone and nothing was logged directly", () => {
    const l = log({ sessionId: "s1", workoutExerciseId: "we-deleted" });
    expect(resolveExerciseId(l, byAssignment)).toBeUndefined();
  });

  it("is undefined when the set references nothing at all", () => {
    expect(resolveExerciseId(log({ sessionId: "s1" }), byAssignment)).toBeUndefined();
  });
});

/**
 * The reason `resolveExerciseId` exists. These four readers used to inline the
 * resolution with two opposite precedences, which was invisible only because no
 * set ever carried both fields. Backfilling `exerciseId` onto every log makes
 * both present on every program set — so if they ever disagree again, the same
 * set would be a bench press to the coach engine and a leg curl to the lookup
 * page, silently and forever.
 *
 * The fixture is that disagreement, made deliberately: a set logged as a bench
 * press against an assignment that now says leg curl (a coach retargeted the
 * plan row after the fact). Every reader must say bench press — what happened,
 * not what the plan currently claims.
 */
describe("every reader resolves a conflicted set the same way", () => {
  const exercises = [ex("ex-press", "Chest"), ex("ex-legCurl", "Hamstrings")];
  const wexs = [we("we-1", "ex-legCurl")];
  const conflicted = log({
    id: "l1",
    sessionId: "s1",
    exerciseId: "ex-press",
    workoutExerciseId: "we-1",
    weight: 130,
    reps: 6,
  });
  const dates = new Map([["s1", "2026-07-20"]]);

  it("lib/coach/history.ts — the set counts as chest history", () => {
    expect(
      lastSessionSetsFor({
        exerciseId: "ex-press",
        setLogs: [conflicted],
        workoutExercises: wexs,
        sessionDates: dates,
      })
    ).toHaveLength(1);

    expect(
      lastSessionSetsFor({
        exerciseId: "ex-legCurl",
        setLogs: [conflicted],
        workoutExercises: wexs,
        sessionDates: dates,
      })
    ).toHaveLength(0);
  });

  it("lib/coach/volume.ts — the hard set lands on Chest, not Hamstrings", () => {
    const volume = weeklyMuscleVolume({
      exercises,
      workoutExercises: wexs,
      setLogs: [conflicted],
      sessionDates: dates,
      weekStart: "2026-07-20",
      today: "2026-07-22",
    });
    expect(volume.find((v) => v.muscle === "Chest")?.done).toBe(1);
    expect(volume.find((v) => v.muscle === "Hamstrings")?.done ?? 0).toBe(0);
  });

  it("lib/lookup.ts — the set shows up under the bench press", () => {
    const memory = buildExerciseMemory(exercises, wexs, [conflicted], dates);
    expect(memory.find((m) => m.exercise.id === "ex-press")?.totalSets).toBe(1);
    expect(memory.find((m) => m.exercise.id === "ex-legCurl")?.totalSets).toBe(0);
  });

  /* app/progress/page.tsx resolves muscle through the same helper (it is a React
   * component, so it is covered by the helper's own tests plus the three above
   * rather than rendered here). */
});
