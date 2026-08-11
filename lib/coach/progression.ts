import type { ReadinessLevel, SetLog } from "../data/types";

/**
 * Austin's progression rules, as pure functions (see docs/COACH-ENGINE.md).
 *
 * The block fixes *what* you do — 1-2 sets, 4-8 reps, RIR 1-2 (squat 3). It is
 * never trained to failure, which is what makes the same movements repeatable
 * 3×/week. So progression does NOT add sets (that would be the RP model and
 * would contradict him); it moves load and reps *inside* the prescribed sets.
 *
 * Reasons are returned as codes, not sentences, so the UI can render them in
 * either language (lib/i18n.ts owns the wording).
 */

export interface RepRange {
  min: number;
  max: number;
}

export type ProgressionAction =
  | "first-time"
  | "add-load"
  | "add-rep"
  | "hold"
  | "reduce-load"
  | "skip";

export type ReasonCode =
  | "firstTime"
  /** Hit the top of the rep range with reps still in reserve → heavier. */
  | "topOfRange"
  /** Sailed well past the range — the load is plainly too light, jump it. */
  | "wellOverRange"
  /** Inside the range → same load, one more rep. */
  | "insideRange"
  /** Fell short of the range → the load is too heavy. */
  | "belowRange"
  /** Hit the top, but only by digging past the prescribed RIR → hold. */
  | "overreached"
  /** No rep target to progress (mobility, cardio, timed bursts). */
  | "noRepTarget"
  /** Readiness is middling → hold the load, chase the rep. */
  | "readinessHold"
  /** Readiness is poor → back off. */
  | "readinessBackOff"
  /** This muscle is still sore → leave it alone today. */
  | "soreSkip";

export interface Prescription {
  action: ProgressionAction;
  /** Recommended load in lbs. Undefined for bodyweight / unweighted work. */
  weight?: number;
  /** Recommended rep target. Undefined when the movement has no rep target. */
  reps?: number;
  /** Sets to perform today — trimmed from the program's target when backing off. */
  sets: number;
  /** The program's RIR string, passed through verbatim (e.g. "1-2", "3"). */
  rir?: string;
  reasonCode: ReasonCode;
  /** Values the UI interpolates into the reason sentence. */
  reasonParams?: Record<string, string | number>;
}

/** "4-8" → {4,8}. Returns null for "—", "4x4 bursts" and anything non-numeric. */
export function parseRepRange(range?: string): RepRange | null {
  if (!range) return null;
  const m = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(range);
  if (m) return { min: Number(m[1]), max: Number(m[2]) };
  const single = /^\s*(\d+)\s*$/.exec(range);
  return single ? { min: Number(single[1]), max: Number(single[1]) } : null;
}

/** "1-2" → {1,2}; "3" → {3,3}. The band of reps the coach wants left over. */
export function parseRirTarget(rir?: string): RepRange | null {
  return parseRepRange(rir);
}

/** Epley 1RM estimate — used only to rank sets against each other. */
export function e1rm(weight?: number, reps?: number): number {
  if (reps == null || reps <= 0) return 0;
  if (weight == null) return reps; // bodyweight: more reps is the better set
  return weight * (1 + reps / 30);
}

/**
 * How a set was loaded. Several movements in the block are written as an either/or
 * ("Band Assisted Pullups OR Lat Pulldown") and share one exercise id, so their
 * logs interleave bodyweight and stack loads. Comparing across the two is
 * meaningless — BW×6 says nothing about what to do on the pulldown machine — so
 * progression runs on one lineage at a time.
 */
export type LoadingKind = "weighted" | "bodyweight";

export const loadingKind = (l: SetLog): LoadingKind =>
  l.weight != null ? "weighted" : "bodyweight";

/**
 * The set to progress against: the hardest set of the group, by estimated 1RM.
 *
 * Deliberately NOT "the most recent set". On a 2-set movement the second set is
 * a back-off, dulled by fatigue from the first — benchmarking against it would
 * read normal fatigue as regression and walk the load down every session.
 *
 * Pass `kind` to stay within one loading lineage (see LoadingKind).
 */
export function topSet(logs: SetLog[], kind?: LoadingKind): SetLog | undefined {
  return logs
    .filter((l) => l.done && (l.weight != null || l.reps != null))
    .filter((l) => kind == null || loadingKind(l) === kind)
    .reduce<SetLog | undefined>(
      (best, l) => (best && e1rm(best.weight, best.reps) >= e1rm(l.weight, l.reps) ? best : l),
      undefined
    );
}

/** Fatigue signal: how much the work set dropped off from the top set. */
export function backOffGap(logs: SetLog[]): number | null {
  const done = logs.filter((l) => l.done && l.reps != null);
  if (done.length < 2) return null;
  const top = topSet(done);
  const last = done[done.length - 1];
  if (!top || top.id === last.id) return null;
  return (top.reps ?? 0) - (last.reps ?? 0);
}

const roundToStep = (w: number, step: number) => Math.max(step, Math.round(w / step) * step);

/** Reps past the top of the range that mean "the load is wrong", not "nice set". */
const BIG_OVERSHOOT = 2;

/**
 * The load that should land you at the bottom of the rep range, back-calculated
 * from what the set actually demonstrated (Epley e1RM).
 *
 * One 2.5 lb step is the right nudge after hitting 8 in a 4-8 range. It is the
 * wrong answer after *15* reps in a 3-8 range — that says the load is simply set
 * too light, and creeping up 2.5 lb at a time wastes weeks. The 1.5× guard is
 * only there to absorb a mis-logged rep count, not to cap real progress: if the
 * new load turns out too heavy, next session's reps fall short of the range and
 * `belowRange` walks it back down. The loop is self-correcting.
 */
function loadForRangeBottom(last: SetLog, range: RepRange, step: number): number | undefined {
  if (last.weight == null || last.reps == null) return undefined;
  const target = e1rm(last.weight, last.reps) / (1 + range.min / 30);
  return roundToStep(Math.min(target, last.weight * 1.5), step);
}

export interface PrescribeInput {
  /** Straight from the program assignment. */
  targetSets: number;
  targetRepsRange: string;
  targetRir?: string;
  /** Top set from the last session that trained this movement. */
  last?: SetLog;
  /** Whether a load is logged for this movement at all. */
  isWeighted: boolean;
  readiness?: ReadinessLevel;
  /** 0-10 soreness for this movement's muscle, from the check-in's soreMap. */
  soreness?: number;
  /** Smallest sensible load increment (BRAND.weightStep by default). */
  step?: number;
}

/**
 * What to do today for one movement. Order of decisions: local soreness and
 * readiness can veto or damp the session; otherwise double progression runs
 * inside the prescribed rep range.
 */
export function prescribe(input: PrescribeInput): Prescription {
  const { targetSets, targetRepsRange, targetRir, last, isWeighted, readiness, soreness } = input;
  const step = input.step ?? 2.5;
  const range = parseRepRange(targetRepsRange);
  const rirTarget = parseRirTarget(targetRir);
  const base = { sets: targetSets, rir: targetRir };

  // R5 — a muscle that is still sore doesn't get loaded today.
  if (soreness != null && soreness >= 7) {
    return { ...base, action: "skip", sets: 0, reasonCode: "soreSkip", reasonParams: { soreness } };
  }
  // R4 — a bad week is a rest/mobility day, not a heroic one.
  if (readiness === "down") {
    return { ...base, action: "skip", sets: 0, reasonCode: "readinessBackOff" };
  }

  // Movements with no numeric rep target (mobility, cardio, timed bursts) just
  // get performed as written.
  if (!range) {
    return { ...base, action: "hold", weight: last?.weight, reasonCode: "noRepTarget" };
  }

  if (!last || (last.weight == null && last.reps == null)) {
    return { ...base, action: "first-time", reps: range.min, reasonCode: "firstTime" };
  }

  const lastReps = last.reps ?? 0;
  const lastWeight = last.weight;

  // Caution: hold everything, minimum sets, repeat rather than push.
  if (readiness === "caution") {
    return {
      ...base,
      action: "hold",
      sets: Math.min(1, targetSets),
      weight: lastWeight,
      reps: lastReps,
      reasonCode: "readinessHold",
    };
  }

  // R3 — double progression.
  if (lastReps >= range.max) {
    // Hitting the top only by burning past the prescribed reserve isn't a green
    // light: the whole method depends on stopping short of failure.
    const dugTooDeep = rirTarget != null && last.rir != null && last.rir < rirTarget.min;
    if (dugTooDeep) {
      return {
        ...base,
        action: "hold",
        weight: lastWeight,
        reps: lastReps,
        reasonCode: "overreached",
        reasonParams: { rir: last.rir!, target: targetRir ?? "" },
      };
    }
    // Steady week: bank the reps rather than the load.
    if (readiness === "steady") {
      return {
        ...base,
        action: "hold",
        weight: lastWeight,
        reps: lastReps,
        reasonCode: "readinessHold",
      };
    }
    // A big overshoot means the load is mis-set, not that a nudge is due.
    const wellOver = lastReps - range.max >= BIG_OVERSHOOT;
    const jumped = wellOver ? loadForRangeBottom(last, range, step) : undefined;
    return {
      ...base,
      action: "add-load",
      weight:
        isWeighted && lastWeight != null
          ? (jumped ?? roundToStep(lastWeight + step, step))
          : undefined,
      reps: range.min,
      reasonCode: jumped != null ? "wellOverRange" : "topOfRange",
      reasonParams: { reps: lastReps, max: range.max },
    };
  }

  if (lastReps < range.min) {
    return {
      ...base,
      action: "reduce-load",
      weight:
        isWeighted && lastWeight != null ? roundToStep(lastWeight * 0.925, step) : undefined,
      reps: range.min,
      reasonCode: "belowRange",
      reasonParams: { reps: lastReps, min: range.min },
    };
  }

  return {
    ...base,
    action: "add-rep",
    weight: lastWeight,
    reps: Math.min(lastReps + 1, range.max),
    reasonCode: "insideRange",
    reasonParams: { reps: lastReps, max: range.max },
  };
}
