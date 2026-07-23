import { describe, it, expect } from "vitest";
import { sessionLoad, summarizeLoad, zoneFor } from "@/lib/load";
import type { Session } from "@/lib/data/types";

const DAY = 24 * 60 * 60 * 1000;
const sess = (o: Partial<Session>): Session => ({ id: Math.random().toString(36), date: "2026-06-01", startedAt: 0, ...o });

describe("sessionLoad", () => {
  it("0 when there is no duration", () => expect(sessionLoad(sess({}))).toBe(0));
  it("minutes × HR intensity", () => {
    // (125-60)/130 = 0.5; 60 min × 0.5 = 30
    expect(sessionLoad(sess({ durationSec: 3600, avgHr: 125 }))).toBeCloseTo(30, 5);
  });
  it("assumes 110 bpm for strength sessions without HR", () => {
    expect(sessionLoad(sess({ durationSec: 3600, kind: "strength" }))).toBeCloseTo(60 * ((110 - 60) / 130), 5);
  });
  it("cardio without HR contributes 0", () => expect(sessionLoad(sess({ durationSec: 3600, kind: "cardio" }))).toBe(0));
  it("clamps intensity at 1.0", () => expect(sessionLoad(sess({ durationSec: 6000, avgHr: 999 }))).toBe(100));
  it("derives duration from start/complete when durationSec absent", () => {
    const start = Date.parse("2026-06-01T10:00:00");
    expect(sessionLoad(sess({ startedAt: start, completedAt: start + 3600 * 1000, avgHr: 125 }))).toBeCloseTo(30, 5);
  });
});

describe("zoneFor", () => {
  it("bands: fresh < 0.8 ≤ optimal ≤ 1.3 < high ≤ 1.5 < spike", () => {
    expect(zoneFor(0.5)).toBe("fresh");
    expect(zoneFor(0.8)).toBe("optimal");
    expect(zoneFor(1.3)).toBe("optimal");
    expect(zoneFor(1.4)).toBe("high");
    expect(zoneFor(1.6)).toBe("spike");
  });
});

describe("summarizeLoad", () => {
  it("acr is null until ≥4 sessions in the 28-day window", () => {
    const now = Date.now();
    const s = summarizeLoad([sess({ completedAt: now, startedAt: now - DAY, durationSec: 3600, avgHr: 125 })], now);
    expect(s.acr).toBeNull();
    expect(s.zone).toBeNull();
    expect(s.sessionsIn28d).toBe(1);
  });

  it("computes acr once there are ≥4 recent sessions", () => {
    const now = Date.now();
    const sessions = Array.from({ length: 5 }, (_, i) =>
      sess({ completedAt: now - i * DAY, startedAt: now - i * DAY, durationSec: 3600, avgHr: 125 })
    );
    const s = summarizeLoad(sessions, now);
    expect(s.sessionsIn28d).toBe(5);
    expect(s.acr).not.toBeNull();
    // 5×30 acute over 4-week baseline (150/4) → ratio 4 → spike
    expect(s.zone).toBe("spike");
  });

  it("ignores sessions that were never completed", () => {
    const now = Date.now();
    const s = summarizeLoad([sess({ startedAt: now - DAY, durationSec: 3600, avgHr: 125 })], now);
    expect(s.sessionsIn28d).toBe(0);
  });
});
