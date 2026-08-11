import type { Session, Workout } from "../data/types";

/**
 * Which day of the block is up (see docs/COACH-ENGINE.md, R1/R2).
 *
 * The engine never invents a session — it walks the coach's rotation in order.
 * A missed day is simply the next one up; it is never doubled up to "catch
 * up", because the low per-session dose only works if the recovery gap holds.
 */

export type ScheduleReason = "due" | "resting" | "firstSession" | "noProgram";

export interface ScheduleResult {
  /** The block day that is next in rotation, or null with no program. */
  workoutId: string | null;
  /** Whether enough recovery has passed to train it today. */
  dueToday: boolean;
  reasonCode: ScheduleReason;
  /** Days since the last completed session of any kind (incl. freestyle). */
  daysSinceLast?: number;
  lastDate?: string;
}

/** Calendar-day index; UTC math keeps it immune to DST. */
const toDays = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1) / 86_400_000;
};

export interface ScheduleInput {
  workouts: Workout[];
  sessions: Session[];
  /** Today as YYYY-MM-DD (local), i.e. `today()` from the repository. */
  today: string;
  /** Rest days required between sessions. 2 ≈ the block's Tue/Thu/Sat spacing. */
  minRestDays?: number;
}

export function nextWorkout(input: ScheduleInput): ScheduleResult {
  const { sessions, today } = input;
  const minRest = input.minRestDays ?? 2;
  const workouts = [...input.workouts].sort((a, b) => a.dayOrder - b.dayOrder);
  if (workouts.length === 0) {
    return { workoutId: null, dueToday: false, reasonCode: "noProgram" };
  }

  const completed = sessions
    .filter((s) => s.completedAt != null)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Rotation advances on program days only...
  const lastProgram = [...completed].reverse().find((s) => s.workoutId);
  // ...but recovery is spent by any training, freestyle included.
  const lastAny = completed[completed.length - 1];

  const nextIdx = lastProgram
    ? (workouts.findIndex((w) => w.id === lastProgram.workoutId) + 1) % workouts.length
    : 0;
  const workoutId = workouts[nextIdx]?.id ?? workouts[0].id;

  if (!lastAny) {
    return { workoutId, dueToday: true, reasonCode: "firstSession" };
  }

  const daysSinceLast = toDays(today) - toDays(lastAny.date);
  const dueToday = daysSinceLast >= minRest;
  return {
    workoutId,
    dueToday,
    reasonCode: dueToday ? "due" : "resting",
    daysSinceLast,
    lastDate: lastAny.date,
  };
}
