import type { Session } from "./data/types";

/** Training-load estimate (TRIMP-flavored, deliberately simple and labeled as
 *  an estimate everywhere it's shown):
 *
 *    load = duration(min) × intensity,  intensity = clamp((avgHR − 60) / 130, 0, 1)
 *
 *  Assumptions: HRrest 60, HRmax 190. In-app strength sessions have no HR —
 *  assume a moderate 110 bpm. Sessions without any duration contribute 0. */

const HR_REST = 60;
const HR_RANGE = 130; // 190 − 60
const ASSUMED_STRENGTH_HR = 110;

export function sessionLoad(s: Session): number {
  const durSec =
    s.durationSec ?? (s.completedAt && s.startedAt ? (s.completedAt - s.startedAt) / 1000 : 0);
  if (!durSec || durSec <= 0) return 0;
  const hr = s.avgHr ?? (s.kind !== "cardio" ? ASSUMED_STRENGTH_HR : undefined);
  if (!hr) return 0;
  const intensity = Math.min(1, Math.max(0, (hr - HR_REST) / HR_RANGE));
  return (durSec / 60) * intensity;
}

export type LoadZone = "fresh" | "optimal" | "high" | "spike";

export interface LoadSummary {
  /** Sum of load over the last 7 days. */
  acute: number;
  /** Average weekly load over the last 28 days. */
  chronic: number;
  /** acute / chronic — null when the 28-day baseline is too thin to be honest. */
  acr: number | null;
  zone: LoadZone | null;
  sessionsIn28d: number;
}

export const ZONE_META: Record<
  LoadZone,
  { label: string; labelZh: string; color: string; hint: string; hintZh: string }
> = {
  fresh: {
    label: "Fresh",
    labelZh: "恢复",
    color: "#8b96ad",
    hint: "Room to push — load is below your recent baseline.",
    hintZh: "还有余量 — 当前负荷低于近期基线，可以加把劲。",
  },
  optimal: {
    label: "Optimal",
    labelZh: "最佳",
    color: "#34d399",
    hint: "Productive range. Keep stacking quality sessions.",
    hintZh: "高效区间。保持节奏，继续积累高质量训练。",
  },
  high: {
    label: "High",
    labelZh: "偏高",
    color: "#fbbf24",
    hint: "Loading fast — watch recovery markers this week.",
    hintZh: "负荷上升较快 — 本周留意恢复信号。",
  },
  spike: {
    label: "Spike",
    labelZh: "飙升",
    color: "#f87171",
    hint: "Acute load is spiking vs. your baseline. Ease off or prioritize recovery.",
    hintZh: "急性负荷相对基线飙升。放缓一点，优先恢复。",
  },
};

export function zoneFor(acr: number): LoadZone {
  if (acr < 0.8) return "fresh";
  if (acr <= 1.3) return "optimal";
  if (acr <= 1.5) return "high";
  return "spike";
}

/** Acute (7d) vs chronic (28d weekly average) load, from completed sessions.
 *  ACR needs ≥ 4 sessions inside the 28-day window — below that the ratio
 *  whipsaws on single workouts and reads alarmist, so we return null. */
export function summarizeLoad(sessions: Session[], now = Date.now()): LoadSummary {
  const DAY = 24 * 60 * 60 * 1000;
  const completed = sessions.filter((s) => s.completedAt != null);
  const in7 = completed.filter((s) => now - s.startedAt <= 7 * DAY);
  const in28 = completed.filter((s) => now - s.startedAt <= 28 * DAY);
  const acute = in7.reduce((t, s) => t + sessionLoad(s), 0);
  const chronic = in28.reduce((t, s) => t + sessionLoad(s), 0) / 4;
  const enough = in28.length >= 4 && chronic > 0;
  const acr = enough ? acute / chronic : null;
  return {
    acute,
    chronic,
    acr,
    zone: acr != null ? zoneFor(acr) : null,
    sessionsIn28d: in28.length,
  };
}
