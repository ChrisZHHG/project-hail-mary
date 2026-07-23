import { describe, it, expect } from "vitest";
import { nextOccurrence, buildWorkoutIcs } from "@/lib/ics";
import type { Workout } from "@/lib/data/types";

/** First matching weekday on/after `from`, at the given hour. */
function onWeekday(from: Date, dow: number): Date {
  const d = new Date(from);
  while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
  return d;
}

describe("nextOccurrence", () => {
  it("returns null for an unknown workout id", () => expect(nextOccurrence("nope")).toBeNull());

  it("wo-fb1 lands on a Tuesday at 17:00", () => {
    const d = nextOccurrence("wo-fb1", new Date(2026, 5, 1, 9, 0));
    expect(d).not.toBeNull();
    expect(d!.getDay()).toBe(2);
    expect(d!.getHours()).toBe(17);
  });

  it("still counts today when before the 17:00 start", () => {
    const tueMorning = onWeekday(new Date(2026, 5, 1, 10, 0), 2); // a Tuesday, 10:00
    const d = nextOccurrence("wo-fb1", tueMorning)!;
    expect(d.getDate()).toBe(tueMorning.getDate()); // same day
    expect(d.getHours()).toBe(17);
    expect(d.getTime()).toBeGreaterThan(tueMorning.getTime());
  });

  it("does NOT schedule in the past: at/after 17:00 on the day → next week", () => {
    const tueEvening = onWeekday(new Date(2026, 5, 1, 18, 0), 2); // a Tuesday, 18:00
    const d = nextOccurrence("wo-fb1", tueEvening)!;
    expect(d.getDay()).toBe(2);
    expect(d.getTime()).toBeGreaterThan(tueEvening.getTime()); // in the future, not today-past
  });
});

describe("buildWorkoutIcs", () => {
  const wo: Workout = { id: "wo-fb1", programId: "p", name: "Full Body 1", dayOrder: 0 };
  const ics = buildWorkoutIcs(wo, new Date(2026, 5, 2, 17, 0));

  it("uses CRLF line endings (iOS requires them)", () => expect(ics).toContain("\r\n"));
  it("contains the required calendar/event/alarm blocks", () => {
    for (const tag of ["BEGIN:VCALENDAR", "BEGIN:VEVENT", "SUMMARY:Full Body 1", "BEGIN:VALARM", "END:VCALENDAR"]) {
      expect(ics).toContain(tag);
    }
  });
});
