import { describe, it, expect } from "vitest";
import { setVolume, sumVolume, sessionTonnageLbs } from "@/lib/volume";
import type { SetLog, Session } from "@/lib/data/types";

const log = (o: Partial<SetLog>): SetLog => ({ id: "x", sessionId: "s", setNumber: 1, done: true, timestamp: 0, ...o });
const sess = (o: Partial<Session>): Session => ({ id: "s", date: "2026-06-01", startedAt: 0, ...o });

describe("setVolume", () => {
  it("weight × reps for a completed weighted set", () => expect(setVolume(log({ weight: 100, reps: 5 }))).toBe(500));
  it("0 when not done", () => expect(setVolume(log({ weight: 100, reps: 5, done: false }))).toBe(0));
  it("0 when weight missing (bodyweight)", () => expect(setVolume(log({ reps: 5 }))).toBe(0));
  it("0 when reps missing", () => expect(setVolume(log({ weight: 100 }))).toBe(0));
});

describe("sumVolume", () => {
  it("sums only done weighted sets", () => {
    expect(sumVolume([log({ weight: 100, reps: 5 }), log({ weight: 50, reps: 10 }), log({ weight: 20, reps: 3, done: false })])).toBe(1000);
  });
  it("empty → 0", () => expect(sumVolume([])).toBe(0));
});

describe("sessionTonnageLbs", () => {
  it("prefers a manually-entered importedVolumeLbs (no ×2.2 conversion)", () => {
    expect(sessionTonnageLbs(sess({ importedVolumeLbs: 3538 }), [log({ weight: 100, reps: 5 })])).toBe(3538);
  });
  it("falls back to summing set logs when no imported total", () => {
    expect(sessionTonnageLbs(sess({}), [log({ weight: 100, reps: 5 })])).toBe(500);
  });
});
