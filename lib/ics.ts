import type { Workout } from "./data/types";

/** Client-side .ics generation — works fully offline/static; iOS hands the
 *  file straight to Calendar. Floating local times (no TZID) are correct for a
 *  personal training calendar and avoid shipping timezone tables. CRLF line
 *  endings are mandatory (iOS rejects bare \n). */

/** Program schedule: workout id → JS weekday (0=Sun). FB3 is "Sat / Sun" — Sat. */
const SCHEDULE: Record<string, number> = {
  "wo-fb1": 2, // Tuesday
  "wo-fb2": 4, // Thursday
  "wo-fb3": 6, // Saturday
};

const DEFAULT_HOUR = 17; // 5 PM start; easy to edit in the calendar

/** Next occurrence of the workout's weekday (today counts if before 6 PM). */
export function nextOccurrence(workoutId: string, from = new Date()): Date | null {
  const dow = SCHEDULE[workoutId];
  if (dow == null) return null;
  const d = new Date(from);
  let delta = (dow - d.getDay() + 7) % 7;
  if (delta === 0 && d.getHours() >= 18) delta = 7;
  d.setDate(d.getDate() + delta);
  d.setHours(DEFAULT_HOUR, 0, 0, 0);
  return d;
}

const pad = (n: number) => String(n).padStart(2, "0");
const icsLocal = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

export function buildWorkoutIcs(workout: Workout, start: Date, durationMin = 75): string {
  const end = new Date(start.getTime() + durationMin * 60 * 1000);
  const uid = `${workout.id}-${icsLocal(start)}@hailmary`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hail Mary//Training//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${icsLocal(new Date())}`,
    `DTSTART:${icsLocal(start)}`,
    `DTEND:${icsLocal(end)}`,
    `SUMMARY:${workout.name} — Hail Mary`,
    `DESCRIPTION:${workout.subtitle ?? ""} · Train with intention.`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${workout.name} in 30 minutes`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

/** Trigger a download of the event; the OS offers to add it to the calendar. */
export function downloadWorkoutIcs(workout: Workout): boolean {
  const start = nextOccurrence(workout.id);
  if (!start) return false;
  const blob = new Blob([buildWorkoutIcs(workout, start)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${workout.name.replace(/\s+/g, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}
