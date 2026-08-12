import { describe, it, expect, beforeAll } from "vitest";
import "fake-indexeddb/auto";
import Dexie from "dexie";
import type { SetLog, Workout, WorkoutExercise } from "@/lib/data/types";

/**
 * The upgrade chain over a real v13 database — the path an existing install
 * takes.
 *
 * Every other test opens a fresh database, which Dexie creates directly at the
 * latest version, so the upgrade closures never execute. That leaves the one
 * code path that touches the owner's actual training history completely
 * unexercised. This builds a v13 database by hand and opens the app's own `db`
 * on top, then checks what the migrations did.
 */

/** The cumulative store definitions as of v13 (v1 + v7 + v12 + v13). */
const V13_STORES = {
  exercises: "id, name, category",
  programs: "id",
  workouts: "id, programId, dayOrder",
  workoutExercises: "id, workoutId, [workoutId+order]",
  sessions: "id, workoutId, date, completedAt",
  setLogs: "id, sessionId, workoutExerciseId, [workoutExerciseId+timestamp]",
  readinessChecks: "id, date, timestamp",
  exerciseGear: "exerciseId",
  planOverrides: "workoutExerciseId",
  planPublications: "workoutId",
};

let db: (typeof import("@/lib/data/db"))["db"];

beforeAll(async () => {
  // Stand up a v13 database under the app's own name, pre-migration shaped:
  // program sets carry only `workoutExerciseId`, workouts have no weekday, and
  // one assignment has an `order` IndexedDB can't index on.
  const legacy = new Dexie("hailmary");
  legacy.version(13).stores(V13_STORES);
  await legacy.open();
  expect(legacy.verno).toBe(13);

  await legacy.table("workouts").bulkAdd([
    { id: "wo-fb1", programId: "prog-fullbody", name: "Full Body 1", dayOrder: 0 },
    { id: "wo-fb2", programId: "prog-fullbody", name: "Full Body 2", dayOrder: 1 },
    { id: "wo-custom", programId: "prog-fullbody", name: "Custom", dayOrder: 2 },
  ]);
  await legacy.table("workoutExercises").bulkAdd([
    { id: "we-wo-fb1-2", workoutId: "wo-fb1", exerciseId: "ex-press", order: 2, section: "main", targetSets: 2, targetRepsRange: "4-8" },
    { id: "we-wo-fb1-5", workoutId: "wo-fb1", exerciseId: "ex-legCurl", order: 5, section: "main", targetSets: 1, targetRepsRange: "4-8" },
    // Would be invisible to `[workoutId+order]` — a compound index skips records
    // whose key path is partly undefined.
    { id: "we-wo-fb1-x", workoutId: "wo-fb1", exerciseId: "ex-squat", section: "main", targetSets: 3, targetRepsRange: "4-8" },
  ]);
  await legacy.table("setLogs").bulkAdd([
    { id: "old-1", sessionId: "s1", workoutExerciseId: "we-wo-fb1-2", setNumber: 1, weight: 130, reps: 6, done: true, timestamp: 1 },
    { id: "old-2", sessionId: "s1", workoutExerciseId: "we-wo-fb1-5", setNumber: 1, weight: 45, reps: 8, done: true, timestamp: 2 },
    // A freestyle set that already recorded its own movement.
    { id: "old-3", sessionId: "s1", exerciseId: "ex-squat", setNumber: 1, weight: 185, reps: 5, done: true, timestamp: 3 },
    // Already detached before the migration — it can report this, not fix it.
    { id: "old-4", sessionId: "s1", workoutExerciseId: "we-deleted", setNumber: 1, weight: 20, reps: 10, done: true, timestamp: 4 },
  ]);
  legacy.close();

  ({ db } = await import("@/lib/data/db"));
  await db.open();
});

describe("upgrading an existing install", () => {
  it("upgrades rather than repopulating (the history survives)", async () => {
    expect(db.verno).toBe(15);
    expect(await db.setLogs.count()).toBe(4);
  });

  it("does not seed the owner's database with template data", async () => {
    // populate must not fire on an upgrade — an existing install acquiring a
    // second program would be a data bug that looks like a feature.
    expect(await db.workoutExercises.count()).toBe(3);
    expect(await db.programs.count()).toBe(0);
  });
});

describe("v14 — record the movement on every set", () => {
  it("recovers it for every program set", async () => {
    expect((await db.setLogs.get("old-1"))!.exerciseId).toBe("ex-press");
    expect((await db.setLogs.get("old-2"))!.exerciseId).toBe("ex-legCurl");
  });

  it("leaves a set that already recorded its own movement untouched", async () => {
    expect((await db.setLogs.get("old-3"))!.exerciseId).toBe("ex-squat");
  });

  it("cannot invent an exercise for a set whose assignment was already gone", async () => {
    expect((await db.setLogs.get("old-4"))!.exerciseId).toBeUndefined();
  });

  it("changes nothing else about the rows", async () => {
    const l = (await db.setLogs.get("old-1")) as SetLog;
    expect(l.workoutExerciseId).toBe("we-wo-fb1-2");
    expect(l.weight).toBe(130);
    expect(l.reps).toBe(6);
    expect(l.timestamp).toBe(1);
  });
});

describe("v15 — the workout carries its own schedule and order", () => {
  it("backfills the weekday for the seeded block days", async () => {
    expect((await db.workouts.get("wo-fb1"))!.scheduledDow).toBe(2);
    expect((await db.workouts.get("wo-fb2"))!.scheduledDow).toBe(4);
  });

  it("leaves a workout it has no schedule for unscheduled, rather than guessing", async () => {
    expect((await db.workouts.get("wo-custom"))!.scheduledDow).toBeUndefined();
  });

  it("gives every assignment a numeric order, preserving how they read", async () => {
    const wexs = (await db.workoutExercises
      .where("workoutId")
      .equals("wo-fb1")
      .toArray()) as WorkoutExercise[];
    for (const w of wexs) expect(typeof w.order).toBe("number");

    // 2 and 5 keep their relative order; the one with no order sorts last.
    const byOrder = [...wexs].sort((a, b) => a.order - b.order).map((w) => w.id);
    expect(byOrder).toEqual(["we-wo-fb1-2", "we-wo-fb1-5", "we-wo-fb1-x"]);
  });

  it("makes the previously unindexed assignment readable again", async () => {
    // The whole point: before normalising, this row was absent from
    // [workoutId+order] and so invisible to getExerciseInstances.
    const viaIndex = await db.workoutExercises
      .where("[workoutId+order]")
      .between(["wo-fb1", Dexie.minKey], ["wo-fb1", Dexie.maxKey])
      .toArray();
    expect(viaIndex.map((w) => w.id)).toContain("we-wo-fb1-x");
    expect(viaIndex).toHaveLength(3);
  });
});

describe("workouts unchanged by the upgrade keep their identity", () => {
  it("keeps names and ids", async () => {
    const w = (await db.workouts.get("wo-fb1")) as Workout;
    expect(w.name).toBe("Full Body 1");
    expect(w.dayOrder).toBe(0);
  });
});
