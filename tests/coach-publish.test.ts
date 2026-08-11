import { describe, expect, it } from "vitest";
import {
  AUTO_PUBLISH_LEAD_MS,
  coachEditsAreLive,
  draftState,
  hoursUntilAutoPublish,
  stallLength,
} from "@/lib/coach";
import type { PlanPublication, SetLog } from "@/lib/data/types";

const set = (weight: number | undefined, reps: number, id = Math.random().toString(36)): SetLog => ({
  id,
  sessionId: id,
  setNumber: 1,
  done: true,
  timestamp: 0,
  weight,
  reps,
});

const SESSION_AT = new Date("2026-08-13T18:00:00");
const H = 3_600_000;

describe("draft publication — coach gets first refusal, the deadline is the backstop", () => {
  it("stays a draft while the coach still has time", () => {
    const input = { scheduledAt: SESSION_AT, now: SESSION_AT.getTime() - 72 * H };
    expect(draftState(input)).toBe("draft");
    expect(coachEditsAreLive(input)).toBe(false);
  });

  it("goes live the moment the coach sends it", () => {
    const publication: PlanPublication = { workoutId: "wo-fb2", publishedAt: 1, by: "coach" };
    const input = { publication, scheduledAt: SESSION_AT, now: SESSION_AT.getTime() - 72 * H };
    expect(draftState(input)).toBe("published");
    expect(coachEditsAreLive(input)).toBe(true);
  });

  it("releases itself 24h before the session when nobody sent it", () => {
    const input = { scheduledAt: SESSION_AT, now: SESSION_AT.getTime() - 23 * H };
    expect(draftState(input)).toBe("auto");
    expect(coachEditsAreLive(input)).toBe(true);
  });

  it("uses exactly the 24h lead", () => {
    expect(AUTO_PUBLISH_LEAD_MS).toBe(24 * H);
    const at = { scheduledAt: SESSION_AT, now: SESSION_AT.getTime() - AUTO_PUBLISH_LEAD_MS };
    expect(draftState(at)).toBe("auto");
    const justBefore = { scheduledAt: SESSION_AT, now: SESSION_AT.getTime() - AUTO_PUBLISH_LEAD_MS - 1 };
    expect(draftState(justBefore)).toBe("draft");
  });

  it("stays a draft with no schedule to count down from", () => {
    // An unscheduled day has no deadline — it waits for a human.
    expect(draftState({ scheduledAt: null, now: Date.now() })).toBe("draft");
    expect(hoursUntilAutoPublish({ scheduledAt: null })).toBeNull();
  });

  it("counts down the hours left, and stops at zero", () => {
    expect(
      hoursUntilAutoPublish({ scheduledAt: SESSION_AT, now: SESSION_AT.getTime() - 30 * H })
    ).toBe(6);
    expect(
      hoursUntilAutoPublish({ scheduledAt: SESSION_AT, now: SESSION_AT.getTime() - 2 * H })
    ).toBe(0);
  });

  it("has no countdown once it's been sent", () => {
    const publication: PlanPublication = { workoutId: "wo-fb2", publishedAt: 1, by: "coach" };
    expect(hoursUntilAutoPublish({ publication, scheduledAt: SESSION_AT })).toBeNull();
  });
});

describe("stallLength — what the engine can't see on its own", () => {
  it("is zero while the client is still progressing", () => {
    expect(stallLength([set(100, 5), set(100, 6), set(105, 5)])).toBe(0);
  });

  it("counts consecutive sessions with no improvement", () => {
    // Chris's real shape: stuck at the same load and reps three sessions running.
    expect(stallLength([set(120, 4), set(130, 4), set(130, 4), set(130, 4)])).toBe(2);
  });

  it("counts a regression as a stall too", () => {
    expect(stallLength([set(130, 6), set(130, 4)])).toBe(1);
  });

  it("treats more reps at the same load as progress", () => {
    expect(stallLength([set(130, 4), set(130, 5)])).toBe(0);
  });

  it("is zero with nothing to compare against", () => {
    expect(stallLength([])).toBe(0);
    expect(stallLength([set(100, 5)])).toBe(0);
  });

  it("handles bodyweight movements", () => {
    expect(stallLength([set(undefined, 6), set(undefined, 6)])).toBe(1);
    expect(stallLength([set(undefined, 6), set(undefined, 7)])).toBe(0);
  });
});
