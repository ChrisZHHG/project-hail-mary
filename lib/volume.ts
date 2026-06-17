import type { SetLog } from "./data/types";

/** Tonnage for one set (weight × reps), 0 unless it's a completed weighted set. */
export const setVolume = (l: SetLog) =>
  l.done && l.weight != null && l.reps != null ? l.weight * l.reps : 0;

export const sumVolume = (logs: SetLog[]) => logs.reduce((s, l) => s + setVolume(l), 0);

export const fmtVolume = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString();
