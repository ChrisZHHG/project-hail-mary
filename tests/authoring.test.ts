import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { indexAssignments, resolveExerciseId } from "@/lib/data/resolve";
import { lastSessionSetsFor, prescribe, topSet } from "@/lib/coach";

let repo: (typeof import("@/lib/data/repository"))["repo"];
let db: (typeof import("@/lib/data/db"))["db"];

beforeAll(async () => {
  ({ repo } = await import("@/lib/data/repository"));
  ({ db } = await import("@/lib/data/db"));
  await db.open();
});

/** A program with one day, two movements, and history logged against both. */
async function buildFixture() {
  await db.programs.clear();
  await db.workouts.clear();
  await db.workoutExercises.clear();
  await db.sessions.clear();
  await db.setLogs.clear();
  await db.planPublications.clear();

  // Self-contained rather than leaning on whatever the seed catalog happens to
  // hold: getExerciseInstances now drops assignments whose exercise is missing,
  // so a fixture referencing an unseeded id would silently test nothing.
  await db.exercises.bulkPut(
    ["ex-press", "ex-curl", "ex-squat", "ex-legCurl"].map((id) => ({
      id,
      name: id,
      targetMuscle: "Chest",
      category: "compound" as const,
      isWeighted: true,
    }))
  );

  const program = await repo.createProgram("Block 1");
  const day = await repo.createWorkout(program.id, { name: "Full Body 1", scheduledDow: 2 });
  const press = await repo.addAssignment(day.id, {
    exerciseId: "ex-press",
    section: "main",
    targetSets: 2,
    targetRepsRange: "4-8",
    targetRir: "1-2",
  });
  const curl = await repo.addAssignment(day.id, {
    exerciseId: "ex-curl",
    section: "main",
    targetSets: 2,
    targetRepsRange: "4-8",
  });

  await db.sessions.add({ id: "s1", workoutId: day.id, date: "2026-08-01", startedAt: 1, completedAt: 2 });
  await repo.upsertSet({ sessionId: "s1", workoutExerciseId: press.id, setNumber: 1, weight: 130, reps: 6, done: true });
  await repo.upsertSet({ sessionId: "s1", workoutExerciseId: press.id, setNumber: 2, weight: 130, reps: 7, done: true });
  await repo.upsertSet({ sessionId: "s1", workoutExerciseId: curl.id, setNumber: 1, weight: 25, reps: 8, done: true });

  return { program, day, press, curl };
}

/** What every existing set currently resolves to. The thing that must not move. */
async function attributionSnapshot(): Promise<Record<string, string | undefined>> {
  const byAssignment = indexAssignments(await db.workoutExercises.toArray());
  const logs = await db.setLogs.toArray();
  return Object.fromEntries(logs.map((l) => [l.id, resolveExerciseId(l, byAssignment)]));
}

/**
 * The gatekeeper for the whole authoring layer, stated once:
 *
 *   **No editing operation may change which exercise an existing set resolves to.**
 *
 * Table-driven so a new operation is one line here, and can't ship without
 * being held to it.
 */
describe("no authoring operation rewrites history", () => {
  const operations: { name: string; run: (f: Awaited<ReturnType<typeof buildFixture>>) => Promise<unknown> }[] = [
    { name: "adding an assignment", run: (f) => repo.addAssignment(f.day.id, { exerciseId: "ex-squat", section: "main", targetSets: 3, targetRepsRange: "4-8" }) },
    { name: "reordering assignments", run: (f) => repo.reorderAssignments(f.day.id, [f.curl.id, f.press.id]) },
    { name: "archiving an assignment that has history", run: (f) => repo.archiveAssignment(f.press.id) },
    { name: "renaming a workout", run: (f) => repo.updateWorkout(f.day.id, { name: "Renamed" }) },
    { name: "archiving a workout", run: (f) => repo.archiveWorkout(f.day.id) },
    { name: "adding a second workout", run: (f) => repo.createWorkout(f.program.id, { name: "Day 2" }) },
    { name: "reordering workouts", run: (f) => repo.createWorkout(f.program.id, { name: "Day 2" }).then((w) => repo.reorderWorkouts(f.program.id, [w.id, f.day.id])) },
    { name: "archiving the whole program", run: (f) => repo.archiveProgram(f.program.id) },
    { name: "archiving then restoring the program", run: (f) => repo.archiveProgram(f.program.id).then(() => repo.restoreProgram(f.program.id)) },
    { name: "duplicating the program", run: (f) => repo.duplicateProgram(f.program.id) },
    { name: "creating a second program", run: () => repo.createProgram("Block 2") },
    { name: "updating an assignment's targets", run: (f) => repo.updateAssignment(f.press.id, { targetSets: 5, targetRir: "0" }) },
  ];

  for (const op of operations) {
    it(op.name, async () => {
      const fixture = await buildFixture();
      const before = await attributionSnapshot();
      expect(Object.values(before).every(Boolean)).toBe(true); // fixture is meaningful

      await op.run(fixture);

      expect(await attributionSnapshot()).toEqual(before);
    });
  }
});

describe("archiving an assignment", () => {
  it("removes it from the session without erasing what was logged against it", async () => {
    const f = await buildFixture();
    await repo.archiveAssignment(f.press.id);

    const instances = await repo.getExerciseInstances(f.day.id);
    expect(instances.map((i) => i.id)).toEqual([f.curl.id]);

    // The engine must still see the history — the whole point of v14.
    const sets = lastSessionSetsFor({
      exerciseId: "ex-press",
      setLogs: await db.setLogs.toArray(),
      workoutExercises: await db.workoutExercises.toArray(),
      sessionDates: new Map([["s1", "2026-08-01"]]),
    });
    expect(sets).toHaveLength(2);
    expect(
      prescribe({ targetSets: 2, targetRepsRange: "4-8", isWeighted: true, last: topSet(sets) })
        .reasonCode
    ).not.toBe("firstTime");
  });

  it("drops it from planned volume but keeps it resolving logged sets", async () => {
    const f = await buildFixture();
    await repo.archiveAssignment(f.press.id);
    expect((await repo.getActiveWorkoutExercises()).map((a) => a.id)).toEqual([f.curl.id]);
    // Still present in the unfiltered read that history resolution uses.
    expect((await repo.getWorkoutExercises()).map((a) => a.id)).toContain(f.press.id);
  });
});

describe("archiving a workout", () => {
  it("archives its assignments and drops the sign-off it carried", async () => {
    const f = await buildFixture();
    await repo.publishPlan(f.day.id, "coach");
    expect(await repo.getPublication(f.day.id)).toBeTruthy();

    await repo.archiveWorkout(f.day.id);

    expect((await repo.getActiveWorkouts()).map((w) => w.id)).not.toContain(f.day.id);
    for (const a of await db.workoutExercises.where("workoutId").equals(f.day.id).toArray()) {
      expect(a.archivedAt).toBeTruthy();
    }
    // Left behind, `draftState` would short-circuit on it and publish a plan
    // nobody signed off.
    expect(await repo.getPublication(f.day.id)).toBeUndefined();
  });

  it("stays readable, so historical sessions keep their name", async () => {
    const f = await buildFixture();
    await repo.archiveWorkout(f.day.id);
    const all = await repo.getAllWorkouts();
    expect(all.find((w) => w.id === f.day.id)?.name).toBe("Full Body 1");
  });
});

describe("archiving a program", () => {
  it("cascades to its days and assignments", async () => {
    const f = await buildFixture();
    await repo.archiveProgram(f.program.id);
    expect((await db.workouts.get(f.day.id))!.archivedAt).toBeTruthy();
    expect((await db.workoutExercises.get(f.press.id))!.archivedAt).toBeTruthy();
  });

  it("hands over to the next unarchived program", async () => {
    const f = await buildFixture();
    const other = await repo.createProgram("Block 2");
    await repo.setActiveProgram(f.program.id);
    expect((await repo.getActiveProgram())!.id).toBe(f.program.id);

    await repo.archiveProgram(f.program.id);
    expect((await repo.getActiveProgram())!.id).toBe(other.id);
  });

  it("activation wins even when two programs are created in the same millisecond", async () => {
    // `activatedAt: Date.now()` alone doesn't guarantee "greatest": a tie sends
    // getActiveProgram to its createdAt tiebreak, which can hand the win to the
    // program you didn't pick. Fast enough to reproduce every run here; rare but
    // real in a user's hands.
    const f = await buildFixture();
    await repo.createProgram("Block 2");
    await repo.setActiveProgram(f.program.id);
    expect((await repo.getActiveProgram())!.id).toBe(f.program.id);
  });

  it("leaves no active program when it was the only one", async () => {
    const f = await buildFixture();
    await repo.archiveProgram(f.program.id);
    expect(await repo.getActiveProgram()).toBeUndefined();
    expect(await repo.getActiveWorkouts()).toEqual([]);
  });

  it("restoring brings back the days and assignments and reactivates it", async () => {
    const f = await buildFixture();
    await repo.archiveProgram(f.program.id);
    await repo.restoreProgram(f.program.id);

    expect((await repo.getActiveProgram())!.id).toBe(f.program.id);
    expect((await repo.getActiveWorkouts()).map((w) => w.id)).toEqual([f.day.id]);
    expect((await repo.getActiveWorkoutExercises()).map((a) => a.id).sort()).toEqual(
      [f.press.id, f.curl.id].sort()
    );
  });
});

describe("ordering", () => {
  it("gives new assignments an increasing, indexable order", async () => {
    const f = await buildFixture();
    const third = await repo.addAssignment(f.day.id, { exerciseId: "ex-squat", section: "main", targetSets: 3, targetRepsRange: "4-8" });
    const viaIndex = await db.workoutExercises
      .where("[workoutId+order]")
      .between([f.day.id, Dexie.minKey], [f.day.id, Dexie.maxKey])
      .toArray();
    expect(viaIndex.map((a) => a.id)).toEqual([f.press.id, f.curl.id, third.id]);
  });

  it("reordering is reflected in the session, and keeps the per-assignment prefill", async () => {
    const f = await buildFixture();
    const before = await repo.getLastEntry(f.press.id);

    await repo.reorderAssignments(f.day.id, [f.curl.id, f.press.id]);

    expect((await repo.getExerciseInstances(f.day.id)).map((i) => i.id)).toEqual([
      f.curl.id,
      f.press.id,
    ]);
    expect(await repo.getLastEntry(f.press.id)).toEqual(before);
  });

  it("reordering leaves orders unique and numeric", async () => {
    const f = await buildFixture();
    await repo.reorderAssignments(f.day.id, [f.curl.id, f.press.id]);
    const orders = (await db.workoutExercises.where("workoutId").equals(f.day.id).toArray()).map(
      (a) => a.order
    );
    expect(orders.every((o) => typeof o === "number")).toBe(true);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("workouts get an increasing dayOrder, and reorder rewrites it", async () => {
    const f = await buildFixture();
    const second = await repo.createWorkout(f.program.id, { name: "Day 2" });
    expect(second.dayOrder).toBe(1);

    await repo.reorderWorkouts(f.program.id, [second.id, f.day.id]);
    expect((await repo.getActiveWorkouts()).map((w) => w.id)).toEqual([second.id, f.day.id]);
  });
});

describe("the same exercise twice in one workout", () => {
  it("stays two independent assignments, with history collected by movement", async () => {
    const f = await buildFixture();
    // Legal now that programs are editable — e.g. a heavy top set and a back-off.
    const again = await repo.addAssignment(f.day.id, { exerciseId: "ex-press", section: "main", targetSets: 1, targetRepsRange: "8-12" });
    expect(again.id).not.toBe(f.press.id);

    await repo.upsertSet({ sessionId: "s1", workoutExerciseId: again.id, setNumber: 1, weight: 95, reps: 10, done: true });

    const sets = lastSessionSetsFor({
      exerciseId: "ex-press",
      setLogs: await db.setLogs.toArray(),
      workoutExercises: await db.workoutExercises.toArray(),
      sessionDates: new Map([["s1", "2026-08-01"]]),
    });
    expect(sets).toHaveLength(3); // both assignments' sets, one movement
  });
});

describe("duplicateProgram", () => {
  let f: Awaited<ReturnType<typeof buildFixture>>;
  beforeEach(async () => {
    f = await buildFixture();
  });

  it("copies the structure under fresh ids", async () => {
    const copy = await repo.duplicateProgram(f.program.id, "Block 2");
    expect(copy.id).not.toBe(f.program.id);
    expect(copy.name).toBe("Block 2");

    const days = await repo.getWorkouts(copy.id);
    expect(days.map((w) => w.name)).toEqual(["Full Body 1"]);
    expect(days[0].id).not.toBe(f.day.id);
    expect(days[0].scheduledDow).toBe(2);

    const assignments = (await db.workoutExercises.toArray()).filter(
      (a) => a.workoutId === days[0].id
    );
    expect(assignments.map((a) => a.exerciseId).sort()).toEqual(["ex-curl", "ex-press"]);
    expect(assignments.map((a) => a.id)).not.toContain(f.press.id);
  });

  it("carries no history into the copy", async () => {
    const copy = await repo.duplicateProgram(f.program.id);
    const copyDays = new Set((await repo.getWorkouts(copy.id)).map((w) => w.id));
    const copyAssignments = new Set(
      (await db.workoutExercises.toArray()).filter((a) => copyDays.has(a.workoutId)).map((a) => a.id)
    );
    for (const l of await db.setLogs.toArray()) {
      expect(copyAssignments.has(l.workoutExerciseId ?? "")).toBe(false);
    }
  });

  it("leaves the original untouched and becomes the active program", async () => {
    const copy = await repo.duplicateProgram(f.program.id);
    expect((await repo.getWorkouts(f.program.id)).map((w) => w.id)).toEqual([f.day.id]);
    expect((await repo.getActiveProgram())!.id).toBe(copy.id);
  });

  it("defaults the name rather than silently duplicating it", async () => {
    const copy = await repo.duplicateProgram(f.program.id);
    expect(copy.name).toBe("Block 1 (copy)");
  });

  it("does not copy archived days", async () => {
    await repo.archiveWorkout(f.day.id);
    const copy = await repo.duplicateProgram(f.program.id);
    expect(await repo.getWorkouts(copy.id)).toEqual([]);
  });
});

describe("updateAssignment", () => {
  it("cannot retarget the movement — that is archive-then-add", async () => {
    const f = await buildFixture();
    // @ts-expect-error exerciseId is deliberately excluded from the patch type
    await repo.updateAssignment(f.press.id, { exerciseId: "ex-legCurl" });
    // The type is the guard; at runtime Dexie would happily write it, which is
    // exactly why the signature has to forbid it at the call site.
    await db.workoutExercises.update(f.press.id, { exerciseId: "ex-press" }); // undo
    expect((await db.workoutExercises.get(f.press.id))!.exerciseId).toBe("ex-press");
  });
});
