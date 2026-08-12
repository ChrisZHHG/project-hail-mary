import { describe, it, expect, beforeAll } from "vitest";
import "fake-indexeddb/auto";
import Dexie from "dexie";
import type { SetLog } from "@/lib/data/types";

/**
 * The v14 upgrade over a real v13 database — the path an existing install takes.
 *
 * Every other test opens a fresh database, which Dexie creates directly at the
 * latest version, so the upgrade closures never execute. That leaves the one
 * code path that touches the owner's actual training history completely
 * unexercised. This builds a v13 database by hand, with untagged program sets in
 * it, then opens the app's own `db` on top and checks what the migration did.
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
  // 1. Stand up a v13 database under the app's own name, pre-v14 shaped:
  //    program sets carry only `workoutExerciseId`, exactly as they were written
  //    before the backfill existed.
  const legacy = new Dexie("hailmary");
  legacy.version(13).stores(V13_STORES);
  await legacy.open();
  expect(legacy.verno).toBe(13);

  await legacy.table("workoutExercises").bulkAdd([
    { id: "we-wo-fb1-2", workoutId: "wo-fb1", exerciseId: "ex-press", order: 2, section: "main", targetSets: 2, targetRepsRange: "4-8" },
    { id: "we-wo-fb1-5", workoutId: "wo-fb1", exerciseId: "ex-legCurl", order: 5, section: "main", targetSets: 1, targetRepsRange: "4-8" },
  ]);
  await legacy.table("setLogs").bulkAdd([
    { id: "old-1", sessionId: "s1", workoutExerciseId: "we-wo-fb1-2", setNumber: 1, weight: 130, reps: 6, done: true, timestamp: 1 },
    { id: "old-2", sessionId: "s1", workoutExerciseId: "we-wo-fb1-5", setNumber: 1, weight: 45, reps: 8, done: true, timestamp: 2 },
    // A freestyle set that already recorded its own movement.
    { id: "old-3", sessionId: "s1", exerciseId: "ex-squat", setNumber: 1, weight: 185, reps: 5, done: true, timestamp: 3 },
    // Already detached before v14 — the migration can report it, not fix it.
    { id: "old-4", sessionId: "s1", workoutExerciseId: "we-deleted", setNumber: 1, weight: 20, reps: 10, done: true, timestamp: 4 },
  ]);
  legacy.close();

  // 2. Open the app's database on top. Dexie runs the v14 upgrader.
  ({ db } = await import("@/lib/data/db"));
  await db.open();
});

describe("v14 upgrade over an existing v13 install", () => {
  it("upgrades rather than repopulating (the history survives)", async () => {
    expect(db.verno).toBe(14);
    expect(await db.setLogs.count()).toBe(4);
  });

  it("recovers the movement for every program set", async () => {
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

  it("does not seed the owner's database with template data", async () => {
    // populate must not fire on an upgrade — otherwise an existing install would
    // suddenly acquire a second program.
    expect(await db.workoutExercises.count()).toBe(2);
    expect(await db.programs.count()).toBe(0);
  });
});
