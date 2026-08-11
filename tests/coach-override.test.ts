import { describe, expect, it } from "vitest";
import { applyOverride, isSpent, prescribe } from "@/lib/coach";
import type { PlanOverride, SetLog } from "@/lib/data/types";

const log = (p: Partial<SetLog>): SetLog => ({
  id: p.id ?? Math.random().toString(36).slice(2),
  sessionId: "s1",
  setNumber: 1,
  done: true,
  timestamp: 0,
  ...p,
});

const ov = (p: Partial<PlanOverride>): PlanOverride => ({
  workoutExerciseId: "we-wo-fb1-4",
  updatedAt: 1000,
  ...p,
});

/** Engine baseline: 2×4-8 @RIR 1-2, last time 100×6 → "same load, one more rep". */
const engine = () =>
  prescribe({
    targetSets: 2,
    targetRepsRange: "4-8",
    targetRir: "1-2",
    isWeighted: true,
    last: log({ weight: 100, reps: 6, rir: 2 }),
  });

describe("applyOverride", () => {
  it("passes the engine's call through untouched when there's no override", () => {
    const rx = applyOverride(engine(), undefined);
    expect(rx.overridden).toBe(false);
    expect(rx.weight).toBe(100);
    expect(rx.reps).toBe(7);
  });

  it("lets the coach's numbers win, and says they did", () => {
    const rx = applyOverride(engine(), ov({ weight: 85, reps: 10, sets: 1 }));
    expect(rx.overridden).toBe(true);
    expect(rx.weight).toBe(85);
    expect(rx.reps).toBe(10);
    expect(rx.sets).toBe(1);
  });

  it("keeps the engine's value for fields the coach left alone", () => {
    const rx = applyOverride(engine(), ov({ weight: 85 }));
    expect(rx.weight).toBe(85);
    expect(rx.reps).toBe(7); // still the engine's
  });

  it("honours a coach load the engine would never propose", () => {
    // Engine wanted to add a rep; the coach wants the load held down anyway.
    const rx = applyOverride(engine(), ov({ weight: 60 }));
    expect(rx.weight).toBe(60);
  });

  it("strikes a movement when the coach skips it", () => {
    const rx = applyOverride(engine(), ov({ skip: true, note: "shoulder is cranky" }));
    expect(rx.action).toBe("skip");
    expect(rx.sets).toBe(0);
    expect(rx.coachNote).toBe("shoulder is cranky");
  });

  it("puts a movement back that the engine wanted to skip", () => {
    // Engine skipped it for soreness; the coach overrode with real numbers.
    const sore = prescribe({
      targetSets: 2,
      targetRepsRange: "4-8",
      targetRir: "1-2",
      isWeighted: true,
      last: log({ weight: 100, reps: 6 }),
      soreness: 9,
    });
    expect(sore.action).toBe("skip");
    const rx = applyOverride(sore, ov({ weight: 70, reps: 5 }));
    expect(rx.action).not.toBe("skip");
    expect(rx.weight).toBe(70);
  });

  it("carries the coach's note through", () => {
    expect(applyOverride(engine(), ov({ weight: 90, note: "stay tight" })).coachNote).toBe(
      "stay tight"
    );
  });
});

describe("override expiry — a one-week call must not become permanent policy", () => {
  it("is spent once a set is logged under it", () => {
    const o = ov({ weight: 85 });
    const after = [log({ weight: 85, reps: 8, timestamp: 2000 })];
    expect(isSpent(o, after)).toBe(true);
    expect(applyOverride(engine(), o, after).overridden).toBe(false);
  });

  it("survives sets logged before the coach made the call", () => {
    const o = ov({ weight: 85 });
    const before = [log({ weight: 100, reps: 6, timestamp: 500 })];
    expect(isSpent(o, before)).toBe(false);
    expect(applyOverride(engine(), o, before).weight).toBe(85);
  });

  it("ignores unfinished sets — browsing the session doesn't spend it", () => {
    const o = ov({ weight: 85 });
    const touched = [log({ weight: 85, reps: 8, timestamp: 2000, done: false })];
    expect(isSpent(o, touched)).toBe(false);
    expect(applyOverride(engine(), o, touched).weight).toBe(85);
  });

  it("hands control back to the engine after the session it applied to", () => {
    const o = ov({ weight: 60 });
    const rx = applyOverride(engine(), o, [log({ weight: 60, reps: 8, timestamp: 3000 })]);
    expect(rx.weight).toBe(100); // engine's number again
    expect(rx.overridden).toBe(false);
  });
});
