import type { ReadinessLevel } from "./types";

export interface ReadinessInput {
  energy: number;
  soreness: number;
  sleep: number;
  stress: number;
  mood: number;
  jointPain: number;
}

/** The way the coach actually asks ("any soreness? how's the neck?") —
 *  optional detail on top of the six sliders. */
export interface ReadinessExtras {
  /** Sore area → 0-10 intensity ("lats 1/10"). Only touched areas are stored. */
  soreMap?: Record<string, number>;
  noteToCoach?: string;
  sleepHours?: number;
  proteinTaken?: boolean;
}

/** Areas the coach asks about. Finer-grained than targetMuscle on purpose
 *  (e.g. "Lats" + "Upper back" vs the program's coarse "Back"). */
export const SORE_AREAS = [
  "Neck",
  "Shoulders",
  "Chest",
  "Lats",
  "Upper back",
  "Lower back",
  "Biceps",
  "Triceps",
  "Forearms",
  "Core",
  "Glutes",
  "Quads",
  "Hamstrings",
  "Adductors",
  "Calves",
] as const;

export const READINESS_METRICS = [
  { key: "energy", label: "Energy", invert: false, low: "Drained", high: "Wired" },
  { key: "sleep", label: "Sleep", invert: false, low: "Wrecked", high: "Rested" },
  { key: "mood", label: "Mood", invert: false, low: "Flat", high: "Fired up" },
  { key: "soreness", label: "Soreness", invert: true, low: "Fresh", high: "Trashed" },
  { key: "stress", label: "Stress", invert: true, low: "Calm", high: "Maxed" },
  { key: "jointPain", label: "Joint pain", invert: true, low: "None", high: "Sharp" },
] as const satisfies ReadonlyArray<{
  key: keyof ReadinessInput;
  label: string;
  invert: boolean;
  low: string;
  high: string;
}>;

/** Compute a 0-100 readiness score + a coaching recommendation.
 *  "Good" metrics score high when high; "bad" metrics (soreness/stress/pain)
 *  score high when low. Joint pain > 3 forces a downscale per the coach's rule. */
export function scoreReadiness(input: ReadinessInput): {
  totalScore: number;
  level: ReadinessLevel;
  recommendation: string;
} {
  const norm = READINESS_METRICS.map(({ key, invert }) => {
    const v = input[key];
    const good = invert ? 5 - v : v - 1; // 0..4
    return good / 4;
  });
  const totalScore = Math.round((norm.reduce((a, b) => a + b, 0) / norm.length) * 100);

  let level: ReadinessLevel;
  let recommendation: string;

  if (input.jointPain > 3) {
    level = "down";
    recommendation =
      "Joint pain is high. Cut working volume ~30%, avoid loaded end-range, and flag it to your coach before pushing.";
  } else if (totalScore >= 75) {
    level = "go";
    recommendation =
      "Green light. System primed — run the plan and chase the top of every rep range. PRs are on the table.";
  } else if (totalScore >= 55) {
    level = "steady";
    recommendation = "Steady state. Run the plan as written, keep your target RIR honest.";
  } else if (totalScore >= 40) {
    level = "caution";
    recommendation =
      "Running low. Trim ~20% of volume, keep 3+ RIR, and prioritise clean technique over load.";
  } else {
    level = "down";
    recommendation =
      "Reserves are low. Treat today as a maintenance dose — minimum effective volume, no grinders.";
  }

  return { totalScore, level, recommendation };
}

export const LEVEL_META: Record<
  ReadinessLevel,
  { label: string; color: string; ring: string }
> = {
  go: { label: "GO", color: "text-go", ring: "border-go/60" },
  steady: { label: "STEADY", color: "text-cyan", ring: "border-cyan/50" },
  caution: { label: "CAUTION", color: "text-warn", ring: "border-warn/50" },
  down: { label: "DOWNSCALE", color: "text-danger", ring: "border-danger/60" },
};
