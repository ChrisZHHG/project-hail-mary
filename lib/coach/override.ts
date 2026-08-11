import type { PlanOverride, SetLog } from "../data/types";
import type { Prescription } from "./progression";

/**
 * The coach's edit applied over the engine's proposal.
 *
 * The engine computes; the coach decides. Whatever the coach set wins — and the
 * prescription records that it was overridden, so the UI can show *whose* number
 * the client is looking at rather than passing a human decision off as the
 * algorithm's.
 */

export interface OverriddenPrescription extends Prescription {
  /** True when any field below came from the coach rather than the engine. */
  overridden: boolean;
  /** The coach's note, if they left one. */
  coachNote?: string;
}

/**
 * An override is spent once the client has trained that movement under it.
 *
 * Without this, "go lighter this week" silently becomes "go lighter forever" —
 * the movement would never progress again and nobody would notice, because the
 * number still looks deliberate. Scoping to the next session keeps a coach's
 * one-off call from quietly becoming permanent policy.
 */
export function isSpent(override: PlanOverride, sets: SetLog[]): boolean {
  return sets.some((l) => l.done && l.timestamp > override.updatedAt);
}

export function applyOverride(
  rx: Prescription,
  override: PlanOverride | undefined,
  /** Sets logged for this assignment, used to tell whether the override is spent. */
  setsSince: SetLog[] = []
): OverriddenPrescription {
  if (!override || isSpent(override, setsSince)) {
    return { ...rx, overridden: false };
  }

  if (override.skip) {
    return {
      ...rx,
      action: "skip",
      sets: 0,
      overridden: true,
      coachNote: override.note,
    };
  }

  return {
    ...rx,
    // A coach who names a number means that number — even one the engine would
    // never propose, like holding load through a week the client felt strong.
    weight: override.weight ?? rx.weight,
    reps: override.reps ?? rx.reps,
    sets: override.sets ?? rx.sets,
    // An overridden movement is no longer "skip"; the coach put it back in.
    action: rx.action === "skip" ? "hold" : rx.action,
    overridden: true,
    coachNote: override.note,
  };
}
