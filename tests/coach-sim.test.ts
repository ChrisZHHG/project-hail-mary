import { describe, expect, it } from "vitest";
import { prescribe } from "@/lib/coach";
import type { ReadinessLevel, SetLog } from "@/lib/data/types";

/**
 * Closed-loop simulation: a virtual lifter trains against the engine's own
 * prescriptions for months, and the engine only ever sees what that lifter did.
 *
 * Unit tests prove single decisions. This proves the *loop* is stable — that
 * feeding the engine its own output can't drive the load to infinity, spiral it
 * to zero, or oscillate forever. Those failures only appear over many
 * iterations, and they are exactly the failures that would hurt a real person.
 */

/** Epley inverted: how many reps a lifter with this 1RM gets at this load. */
const maxReps = (e1rm: number, weight: number) => 30 * (e1rm / weight - 1);

/** Deterministic noise — a flaky strength test is a useless strength test. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

interface SimOpts {
  /** The lifter's real capacity at the start. */
  e1rm: number;
  /** Per-session multiplier on capacity (1.01 = fast novice, 1 = plateaued). */
  growth?: number;
  startWeight: number;
  sessions?: number;
  /** Reps the lifter leaves in the tank — the block asks for 1-2. */
  rir?: number;
  repRange?: string;
  readiness?: ReadinessLevel;
  /** ±reps of day-to-day variability. */
  jitter?: number;
  seed?: number;
  /** Session index → capacity multiplier, for injuries/layoffs. */
  shock?: (i: number) => number;
  /** Session index → reps to log instead of the true value (mis-entry). */
  misLog?: (i: number) => number | undefined;
}

interface Step {
  session: number;
  weight: number;
  reps: number;
  e1rm: number;
  action: string;
}

function simulate(o: SimOpts): Step[] {
  const rand = rng(o.seed ?? 42);
  const rir = o.rir ?? 2;
  const repRange = o.repRange ?? "4-8";
  const sessions = o.sessions ?? 40;
  const jitter = o.jitter ?? 0;
  let e1rm = o.e1rm;
  let weight = o.startWeight;
  const trace: Step[] = [];

  for (let i = 0; i < sessions; i++) {
    if (o.shock) e1rm *= o.shock(i);

    // What the lifter actually manages at the prescribed load, stopping short
    // of failure by `rir`, then rounded to whole reps and clamped at zero.
    const noise = jitter ? Math.round((rand() * 2 - 1) * jitter) : 0;
    const trueReps = Math.max(0, Math.round(maxReps(e1rm, weight) - rir) + noise);
    const reps = o.misLog?.(i) ?? trueReps;

    const last: SetLog = {
      id: `s${i}`,
      sessionId: `sess${i}`,
      setNumber: 1,
      done: true,
      timestamp: i,
      weight,
      reps,
      rir,
    };
    const rx = prescribe({
      targetSets: 2,
      targetRepsRange: repRange,
      targetRir: "1-2",
      last,
      isWeighted: true,
      readiness: o.readiness,
      step: 2.5,
    });

    trace.push({ session: i, weight, reps, e1rm, action: rx.action });
    if (rx.weight != null) weight = rx.weight;
    e1rm *= o.growth ?? 1;
  }
  return trace;
}

/**
 * The load that lands a lifter inside a 4-8 range at RIR 2 sits at roughly
 * 0.75-0.83 × e1RM. Allow slack for rounding and for chasing a moving target.
 */
const inBand = (weight: number, e1rm: number) => weight >= 0.68 * e1rm && weight <= 0.92 * e1rm;

describe("coach engine — closed-loop simulation", () => {
  it("converges on a plateaued lifter and stays there", () => {
    const trace = simulate({ e1rm: 200, growth: 1, startWeight: 100, sessions: 40 });
    const tail = trace.slice(-10);
    for (const s of tail) expect(inBand(s.weight, s.e1rm)).toBe(true);
    // Settled, not sawing up and down by large amounts.
    const spread = Math.max(...tail.map((s) => s.weight)) - Math.min(...tail.map((s) => s.weight));
    expect(spread).toBeLessThanOrEqual(0.15 * 200);
  });

  it("corrects a far-too-light starting load within a few sessions", () => {
    // The load is a third of what it should be — the `wellOverRange` rule exists
    // for exactly this, and creeping 2.5 lb at a time would take ~40 sessions.
    const trace = simulate({ e1rm: 300, growth: 1, startWeight: 60, sessions: 12 });
    const arrived = trace.findIndex((s) => inBand(s.weight, s.e1rm));
    expect(arrived).toBeGreaterThanOrEqual(0);
    expect(arrived).toBeLessThanOrEqual(5);
  });

  it("keeps up with a fast-gaining novice without running away", () => {
    const trace = simulate({ e1rm: 150, growth: 1.01, startWeight: 100, sessions: 40 });
    for (const s of trace.slice(-10)) {
      expect(inBand(s.weight, s.e1rm)).toBe(true);
      expect(s.weight).toBeLessThan(s.e1rm); // never prescribes above true max
    }
  });

  it("walks the load back down after a layoff", () => {
    // Eight weeks off at session 20: capacity drops 25%.
    const trace = simulate({
      e1rm: 200,
      growth: 1,
      startWeight: 150,
      sessions: 45,
      shock: (i) => (i === 20 ? 0.75 : 1),
    });
    const before = trace[19].weight;
    const after = trace[trace.length - 1].weight;
    expect(after).toBeLessThan(before);
    expect(inBand(after, trace[trace.length - 1].e1rm)).toBe(true);
  });

  it("recovers from a mis-logged rep count instead of exploding", () => {
    // Session 5 records 50 reps by accident. The 1.5× guard caps the jump, then
    // the load falls short of the range and the engine walks it back.
    const trace = simulate({
      e1rm: 200,
      growth: 1,
      startWeight: 150,
      sessions: 30,
      misLog: (i) => (i === 5 ? 50 : undefined),
    });
    // The guard is 1.5× the load *at that moment*, not the starting load.
    const atMisLog = trace[5].weight;
    const peak = Math.max(...trace.map((s) => s.weight));
    expect(peak).toBeLessThanOrEqual(atMisLog * 1.5 + 2.5); // guard held (+rounding)
    for (const s of trace.slice(-8)) expect(inBand(s.weight, s.e1rm)).toBe(true);
  });

  it("survives day-to-day variability without thrashing", () => {
    const trace = simulate({ e1rm: 200, growth: 1, startWeight: 150, sessions: 50, jitter: 2, seed: 7 });
    const tail = trace.slice(-15);
    for (const s of tail) expect(inBand(s.weight, s.e1rm)).toBe(true);
    // Noise must not translate into ever-widening load swings.
    const spread = Math.max(...tail.map((s) => s.weight)) - Math.min(...tail.map((s) => s.weight));
    expect(spread).toBeLessThanOrEqual(0.2 * 200);
  });

  it("never drives the load to zero, even for someone who keeps failing", () => {
    // Capacity collapses steadily — an injury, illness, or a badly-set machine.
    const trace = simulate({
      e1rm: 200,
      growth: 0.97,
      startWeight: 150,
      sessions: 60,
    });
    for (const s of trace) expect(s.weight).toBeGreaterThan(0);
    expect(trace[trace.length - 1].weight).toBeLessThan(trace[0].weight);
  });

  it("holds the load flat through a run of steady weeks", () => {
    const trace = simulate({
      e1rm: 200,
      growth: 1,
      startWeight: 150,
      sessions: 15,
      readiness: "steady",
    });
    const weights = new Set(trace.map((s) => s.weight));
    expect(weights.size).toBe(1); // "steady" banks reps, never load
  });

  it("stops prescribing entirely while readiness is down", () => {
    const trace = simulate({
      e1rm: 200,
      growth: 1,
      startWeight: 150,
      sessions: 10,
      readiness: "down",
    });
    expect(trace.every((s) => s.action === "skip")).toBe(true);
  });
});
