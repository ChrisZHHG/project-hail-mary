import { describe, expect, it } from "vitest";
import {
  backOffGap,
  e1rm,
  loadingKind,
  nextWorkout,
  parseRepRange,
  prescribe,
  topSet,
} from "@/lib/coach";
import type { Session, SetLog, Workout } from "@/lib/data/types";

const log = (p: Partial<SetLog>): SetLog => ({
  id: p.id ?? Math.random().toString(36).slice(2),
  sessionId: "s1",
  setNumber: p.setNumber ?? 1,
  done: p.done ?? true,
  timestamp: p.timestamp ?? 0,
  ...p,
});

/** The block's default assignment: 2 sets of 4-8 at RIR 1-2. */
const fb = { targetSets: 2, targetRepsRange: "4-8", targetRir: "1-2", isWeighted: true };

describe("parseRepRange", () => {
  it("parses ranges and single numbers", () => {
    expect(parseRepRange("4-8")).toEqual({ min: 4, max: 8 });
    expect(parseRepRange("5")).toEqual({ min: 5, max: 5 });
  });

  it("returns null for the program's non-numeric targets", () => {
    expect(parseRepRange("—")).toBeNull();
    expect(parseRepRange("4x4 bursts")).toBeNull();
    expect(parseRepRange(undefined)).toBeNull();
  });
});

describe("topSet", () => {
  it("picks the hardest set, not the most recent one", () => {
    // Chris's real 7/24 preacher curl: descending weights across three sets.
    const sets = [
      log({ id: "a", weight: 20, reps: 7 }),
      log({ id: "b", weight: 17.5, reps: 3 }),
      log({ id: "c", weight: 15, reps: 11 }),
    ];
    expect(topSet(sets)?.id).toBe("a");
  });

  it("ignores unfinished sets", () => {
    const sets = [log({ id: "a", weight: 200, reps: 10, done: false }), log({ id: "b", weight: 50, reps: 5 })];
    expect(topSet(sets)?.id).toBe("b");
  });

  it("ranks bodyweight sets by reps", () => {
    expect(topSet([log({ id: "a", reps: 3 }), log({ id: "b", reps: 8 })])?.id).toBe("b");
  });

  it("keeps bodyweight and loaded sets in separate lineages", () => {
    // "Band Assisted Pullups OR Lat Pulldown" is one exercise id but two very
    // different movements: BW×6 must not set the target for the pulldown stack.
    const sets = [log({ id: "bw", reps: 6 }), log({ id: "stack", weight: 165, reps: 3 })];
    expect(topSet(sets, "bodyweight")?.id).toBe("bw");
    expect(topSet(sets, "weighted")?.id).toBe("stack");
    expect(loadingKind(sets[0])).toBe("bodyweight");
  });

  it("e1rm rewards more reps at equal load", () => {
    expect(e1rm(100, 8)).toBeGreaterThan(e1rm(100, 5));
  });
});

describe("prescribe — double progression (R3)", () => {
  it("adds load when the top of the range is hit with reserve left", () => {
    const p = prescribe({ ...fb, last: log({ weight: 100, reps: 8, rir: 1 }), step: 2.5 });
    expect(p.action).toBe("add-load");
    expect(p.weight).toBe(102.5);
    expect(p.reps).toBe(4); // restart at the bottom of the range
    expect(p.reasonCode).toBe("topOfRange");
  });

  it("jumps the load when reps sail well past the range, instead of nudging", () => {
    // Chris's real 7/15 pulldown: 15 reps against a 3-8 target — the load is
    // simply set too light, and +2.5 lb would waste weeks catching up.
    const p = prescribe({
      ...fb,
      targetRepsRange: "3-8",
      last: log({ weight: 120, reps: 15 }),
      step: 2.5,
    });
    expect(p.action).toBe("add-load");
    expect(p.reasonCode).toBe("wellOverRange");
    expect(p.weight).toBe(162.5); // he in fact went to 165 next session
  });

  it("matches the real preacher-curl correction", () => {
    // 7/20: 15×15 against 4-8 → engine says 20, which is exactly what he did.
    const p = prescribe({ ...fb, last: log({ weight: 15, reps: 15 }), step: 2.5 });
    expect(p.weight).toBe(20);
  });

  it("still nudges by one step when the range is only just cleared", () => {
    const p = prescribe({ ...fb, last: log({ weight: 100, reps: 9, rir: 1 }), step: 2.5 });
    expect(p.reasonCode).toBe("topOfRange");
    expect(p.weight).toBe(102.5);
  });

  it("guards against a mis-logged rep count", () => {
    const p = prescribe({ ...fb, last: log({ weight: 100, reps: 99 }), step: 2.5 });
    expect(p.weight).toBe(150); // capped at 1.5×, not 300
  });

  it("adds a rep when inside the range", () => {
    const p = prescribe({ ...fb, last: log({ weight: 100, reps: 6, rir: 2 }) });
    expect(p.action).toBe("add-rep");
    expect(p.weight).toBe(100);
    expect(p.reps).toBe(7);
  });

  it("reduces load when reps fall below the range", () => {
    const p = prescribe({ ...fb, last: log({ weight: 100, reps: 3, rir: 0 }), step: 2.5 });
    expect(p.action).toBe("reduce-load");
    expect(p.weight).toBe(92.5);
  });

  it("holds instead of adding load when the reps came from digging past the RIR", () => {
    // 8 reps but RIR 0 against a 1-2 target: earned by going to failure.
    const p = prescribe({ ...fb, last: log({ weight: 100, reps: 8, rir: 0 }) });
    expect(p.action).toBe("hold");
    expect(p.reasonCode).toBe("overreached");
    expect(p.weight).toBe(100);
  });

  it("starts at the bottom of the range with no history", () => {
    const p = prescribe({ ...fb });
    expect(p.action).toBe("first-time");
    expect(p.reps).toBe(4);
  });

  it("never prescribes a load for unweighted movements", () => {
    const p = prescribe({ ...fb, isWeighted: false, last: log({ reps: 8, rir: 1 }) });
    expect(p.action).toBe("add-load");
    expect(p.weight).toBeUndefined();
  });

  it("passes timed/mobility work straight through", () => {
    const p = prescribe({ ...fb, targetRepsRange: "4x4 bursts", last: log({ reps: 4 }) });
    expect(p.reasonCode).toBe("noRepTarget");
  });
});

describe("prescribe — autoregulation (R4/R5)", () => {
  it("skips a movement whose muscle is still sore", () => {
    const p = prescribe({ ...fb, last: log({ weight: 100, reps: 8, rir: 1 }), soreness: 8 });
    expect(p.action).toBe("skip");
    expect(p.sets).toBe(0);
    expect(p.reasonCode).toBe("soreSkip");
  });

  it("turns a bad-readiness day into rest", () => {
    const p = prescribe({ ...fb, last: log({ weight: 100, reps: 8 }), readiness: "down" });
    expect(p.action).toBe("skip");
    expect(p.reasonCode).toBe("readinessBackOff");
  });

  it("banks reps instead of load on a steady week", () => {
    const p = prescribe({ ...fb, last: log({ weight: 100, reps: 8, rir: 1 }), readiness: "steady" });
    expect(p.action).toBe("hold");
    expect(p.weight).toBe(100);
  });

  it("drops to a single set and repeats the numbers when cautious", () => {
    const p = prescribe({ ...fb, last: log({ weight: 100, reps: 6, rir: 2 }), readiness: "caution" });
    expect(p.action).toBe("hold");
    expect(p.sets).toBe(1);
    expect(p.reps).toBe(6);
  });

  it("progresses normally on a good week", () => {
    const p = prescribe({ ...fb, last: log({ weight: 100, reps: 8, rir: 1 }), readiness: "go" });
    expect(p.action).toBe("add-load");
  });
});

describe("backOffGap", () => {
  it("measures the drop from the top set to the last set", () => {
    expect(backOffGap([log({ id: "a", weight: 100, reps: 8 }), log({ id: "b", weight: 100, reps: 5 })])).toBe(3);
  });

  it("is null with a single set", () => {
    expect(backOffGap([log({ weight: 100, reps: 8 })])).toBeNull();
  });
});

describe("nextWorkout — rotation and rest (R1/R2)", () => {
  const workouts: Workout[] = [
    { id: "wo-fb1", programId: "p", name: "Full Body 1", dayOrder: 0 },
    { id: "wo-fb2", programId: "p", name: "Full Body 2", dayOrder: 1 },
    { id: "wo-fb3", programId: "p", name: "Full Body 3", dayOrder: 2 },
  ];
  const sess = (p: Partial<Session>): Session => ({
    id: Math.random().toString(36).slice(2),
    date: "2026-07-01",
    startedAt: 0,
    completedAt: 1,
    ...p,
  });

  it("starts the block at day 1", () => {
    const r = nextWorkout({ workouts, sessions: [], today: "2026-07-21" });
    expect(r.workoutId).toBe("wo-fb1");
    expect(r.dueToday).toBe(true);
    expect(r.reasonCode).toBe("firstSession");
  });

  it("advances to the next day in the rotation", () => {
    const sessions = [sess({ workoutId: "wo-fb1", date: "2026-07-21" })];
    const r = nextWorkout({ workouts, sessions, today: "2026-07-23" });
    expect(r.workoutId).toBe("wo-fb2");
    expect(r.dueToday).toBe(true);
  });

  it("wraps around after the last day", () => {
    const sessions = [sess({ workoutId: "wo-fb3", date: "2026-07-21" })];
    expect(nextWorkout({ workouts, sessions, today: "2026-07-25" }).workoutId).toBe("wo-fb1");
  });

  it("calls for rest when the gap is too short", () => {
    const sessions = [sess({ workoutId: "wo-fb1", date: "2026-07-21" })];
    const r = nextWorkout({ workouts, sessions, today: "2026-07-22" });
    expect(r.dueToday).toBe(false);
    expect(r.reasonCode).toBe("resting");
    expect(r.daysSinceLast).toBe(1);
  });

  it("does not double up after a missed day — it just continues the rotation", () => {
    const sessions = [sess({ workoutId: "wo-fb1", date: "2026-07-14" })];
    const r = nextWorkout({ workouts, sessions, today: "2026-07-25" });
    expect(r.workoutId).toBe("wo-fb2");
    expect(r.daysSinceLast).toBe(11);
  });

  it("counts a freestyle session against recovery but not against the rotation", () => {
    const sessions = [
      sess({ workoutId: "wo-fb1", date: "2026-07-21" }),
      sess({ date: "2026-07-24" }), // freestyle — no workoutId
    ];
    const r = nextWorkout({ workouts, sessions, today: "2026-07-25" });
    expect(r.workoutId).toBe("wo-fb2"); // rotation still follows FB1
    expect(r.dueToday).toBe(false); // but freestyle spent the recovery
  });

  it("ignores sessions that were never completed", () => {
    const sessions = [sess({ workoutId: "wo-fb1", date: "2026-07-24", completedAt: undefined })];
    expect(nextWorkout({ workouts, sessions, today: "2026-07-25" }).reasonCode).toBe("firstSession");
  });
});
