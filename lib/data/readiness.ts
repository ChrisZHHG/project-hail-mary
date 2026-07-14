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
  { key: "energy", label: "Energy", labelZh: "精力", invert: false, low: "Drained", lowZh: "耗尽", high: "Wired", highZh: "充沛" },
  { key: "sleep", label: "Sleep", labelZh: "睡眠", invert: false, low: "Wrecked", lowZh: "稀烂", high: "Rested", highZh: "睡饱" },
  { key: "mood", label: "Mood", labelZh: "状态", invert: false, low: "Flat", lowZh: "低落", high: "Fired up", highZh: "高涨" },
  { key: "soreness", label: "Soreness", labelZh: "酸痛", invert: true, low: "Fresh", lowZh: "轻松", high: "Trashed", highZh: "散架" },
  { key: "stress", label: "Stress", labelZh: "压力", invert: true, low: "Calm", lowZh: "平静", high: "Maxed", highZh: "爆表" },
  { key: "jointPain", label: "Joint pain", labelZh: "关节痛", invert: true, low: "None", lowZh: "无", high: "Sharp", highZh: "刺痛" },
] as const satisfies ReadonlyArray<{
  key: keyof ReadinessInput;
  label: string;
  labelZh: string;
  invert: boolean;
  low: string;
  lowZh: string;
  high: string;
  highZh: string;
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
  { label: string; labelZh: string; color: string; ring: string }
> = {
  go: { label: "GO", labelZh: "冲", color: "text-go", ring: "border-go/60" },
  steady: { label: "STEADY", labelZh: "稳", color: "text-cyan", ring: "border-cyan/50" },
  caution: { label: "CAUTION", labelZh: "谨慎", color: "text-warn", ring: "border-warn/50" },
  down: { label: "DOWNSCALE", labelZh: "降量", color: "text-danger", ring: "border-danger/60" },
};

/** 中文 versions of the coaching recommendations. Stored data keeps the
 *  English sentence (scoreReadiness output) — these are display-only. */
export const REC_ZH: Record<ReadinessLevel, string> = {
  go: "绿灯。状态在线 — 按计划练，每个次数区间都冲上限，可以试试 PR。",
  steady: "状态平稳。按计划执行，RIR 保持诚实。",
  caution: "电量偏低。训练量减 ~20%，保持 3+ RIR，动作质量优先于重量。",
  down: "储备不足。今天当作维持剂量 — 最低有效训练量，不硬磨。",
};

/** 中文 override for the joint-pain rule (level "down", different message). */
export const REC_ZH_JOINT =
  "关节痛偏高。训练量减 ~30%，避免大负重末端拉伸，冲重量前先告诉教练。";
