import { describe, it, expect, beforeAll } from "vitest";
import "fake-indexeddb/auto";
import Dexie from "dexie";
import type { SetLog } from "@/lib/data/types";

// Dexie's module-level `db` singleton reads the global indexedDB, so
// fake-indexeddb/auto must be imported before these dynamic imports.
let repo: (typeof import("@/lib/data/repository"))["repo"];
let db: (typeof import("@/lib/data/db"))["db"];

beforeAll(async () => {
  ({ repo } = await import("@/lib/data/repository"));
  ({ db } = await import("@/lib/data/db"));
  await db.open(); // triggers populate → seed on the fresh in-memory DB
});

describe("seed", () => {
  it("populates the coach program, 3 workouts, and the exercise catalog", async () => {
    expect((await repo.getPrograms()).length).toBeGreaterThan(0);
    expect((await db.workouts.toArray()).length).toBe(3);
    expect((await db.exercises.toArray()).length).toBeGreaterThan(10);
  });

  it("has no orphan set logs (every workoutExerciseId resolves)", async () => {
    const weIds = new Set((await db.workoutExercises.toArray()).map((w) => w.id));
    const logs = await db.setLogs.toArray();
    for (const l of logs) {
      if (l.workoutExerciseId) expect(weIds.has(l.workoutExerciseId)).toBe(true);
    }
  });
});

describe("sessions", () => {
  it("startSession resumes the open session instead of creating duplicates", async () => {
    const a = await repo.startSession("wo-fb1");
    const b = await repo.startSession("wo-fb1");
    expect(a.id).toBe(b.id);
  });

  it("upsertSet inserts a new set, then updates it by id", async () => {
    const s = await repo.startFreestyleSession();
    const set = await repo.upsertSet({ sessionId: s.id, exerciseId: "ex-press", setNumber: 1, weight: 100, reps: 5, done: true });
    expect(set.id).toBeTruthy();

    const again = await repo.upsertSet({ id: set.id, sessionId: s.id, exerciseId: "ex-press", setNumber: 1, weight: 110, reps: 5, done: true });
    expect(again.id).toBe(set.id);

    const logs = await repo.getSetLogs(s.id);
    expect(logs.filter((l) => l.id === set.id)).toHaveLength(1);
    expect(logs.find((l) => l.id === set.id)!.weight).toBe(110);
  });

  it("upsertSet records the exercise even when only the assignment is passed", async () => {
    // The program logger passes workoutExerciseId alone. If the exercise isn't
    // captured here, deleting that assignment later detaches the set from its
    // movement and its history silently disappears.
    const s = await repo.startSession("wo-fb2");
    const we = (await db.workoutExercises.where("workoutId").equals("wo-fb2").toArray())[0];
    const set = await repo.upsertSet({
      sessionId: s.id,
      workoutExerciseId: we.id,
      setNumber: 1,
      weight: 100,
      reps: 5,
      done: true,
    });
    expect(set.exerciseId).toBe(we.exerciseId);
    expect((await db.setLogs.get(set.id))!.exerciseId).toBe(we.exerciseId);
  });

  it("upsertSet does not overwrite an exercise the caller recorded itself", async () => {
    const s = await repo.startFreestyleSession();
    const we = (await db.workoutExercises.toArray())[0];
    const set = await repo.upsertSet({
      sessionId: s.id,
      exerciseId: "ex-squat",
      workoutExerciseId: we.id,
      setNumber: 1,
      weight: 100,
      reps: 5,
      done: true,
    });
    expect(set.exerciseId).toBe("ex-squat");
  });
});

describe("importAll — restore and cloud-pull are the unversioned door", () => {
  it("tags a pre-v14 backup's sets on the way in", async () => {
    // The realistic way the invariant gets undone: restoring a backup taken
    // before the migration existed. It bypasses the Dexie upgrade chain
    // entirely, so it has to enforce the same rules itself.
    await repo.importAll({
      workoutExercises: [
        { id: "we-restored", workoutId: "wo-restored", exerciseId: "ex-press", order: 0, section: "main", targetSets: 2, targetRepsRange: "4-8" },
      ],
      setLogs: [
        { id: "restored-1", sessionId: "s-restored", workoutExerciseId: "we-restored", setNumber: 1, weight: 100, reps: 5, done: true, timestamp: 1 },
      ],
    });
    expect((await db.setLogs.get("restored-1"))!.exerciseId).toBe("ex-press");
  });

  it("normalizes an unindexable order from a restored backup", async () => {
    await repo.importAll({
      workoutExercises: [
        { id: "we-ord-a", workoutId: "wo-ord", exerciseId: "ex-press", section: "main", targetSets: 1, targetRepsRange: "4-8" },
        { id: "we-ord-b", workoutId: "wo-ord", exerciseId: "ex-press", order: "7", section: "main", targetSets: 1, targetRepsRange: "4-8" },
      ] as unknown[],
    });
    const rows = await db.workoutExercises.where("workoutId").equals("wo-ord").toArray();
    for (const r of rows) expect(typeof r.order).toBe("number");
    // Both are reachable through the index the session screen actually reads.
    const viaIndex = await db.workoutExercises
      .where("[workoutId+order]")
      .between(["wo-ord", Dexie.minKey], ["wo-ord", Dexie.maxKey])
      .toArray();
    expect(viaIndex).toHaveLength(2);
  });

  it("resolves a restored set against assignments already in the database", async () => {
    const we = (await db.workoutExercises.where("workoutId").equals("wo-fb2").toArray())[0];
    await repo.importAll({
      setLogs: [
        { id: "restored-2", sessionId: "s-restored", workoutExerciseId: we.id, setNumber: 1, weight: 90, reps: 5, done: true, timestamp: 2 },
      ],
    });
    expect((await db.setLogs.get("restored-2"))!.exerciseId).toBe(we.exerciseId);
  });
});

describe("the exercise-on-every-set invariant", () => {
  it("holds for a freshly seeded database (populate skips the v14 upgrade)", async () => {
    const logs = await db.setLogs.toArray();
    const assigned = logs.filter((l) => l.workoutExerciseId);
    expect(assigned.length).toBeGreaterThan(0);
    for (const l of assigned) {
      expect(l.exerciseId, `set ${l.id} has no exercise recorded`).toBeTruthy();
    }
  });
});

describe("saveReadiness", () => {
  it("computes the score/level from the input and stores it", async () => {
    const r = await repo.saveReadiness({ energy: 5, soreness: 1, sleep: 5, stress: 1, mood: 5, jointPain: 1 });
    expect(r.totalScore).toBe(100);
    expect(r.level).toBe("go");
    expect(await repo.getReadiness(r.date)).toBeTruthy();
  });
});

describe("cleanupStaleOpenSessions (the 'did my data survive?' logic)", () => {
  const mk = (id: string) => ({ id, date: "2020-01-01", startedAt: Date.parse("2020-01-01"), source: "app" as const, kind: "strength" as const });

  it("auto-completes a previous-day open session that HAS logged sets", async () => {
    await db.sessions.add(mk("stale-with-sets"));
    const l: SetLog = { id: "sws-1", sessionId: "stale-with-sets", exerciseId: "ex-press", setNumber: 1, weight: 50, reps: 5, done: true, timestamp: 0 };
    await db.setLogs.add(l);

    await repo.cleanupStaleOpenSessions();

    const s = await db.sessions.get("stale-with-sets");
    expect(s?.completedAt).toBeTruthy(); // kept + completed, data preserved
  });

  it("deletes a previous-day open session that has NO logged sets (empty shell)", async () => {
    await db.sessions.add(mk("stale-empty"));
    await repo.cleanupStaleOpenSessions();
    expect(await db.sessions.get("stale-empty")).toBeUndefined();
  });
});
