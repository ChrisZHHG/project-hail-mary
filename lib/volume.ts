import type { Session, SetLog } from "./data/types";

/** Tonnage for one set (weight × reps), 0 unless it's a completed weighted set. */
export const setVolume = (l: SetLog) =>
  l.done && l.weight != null && l.reps != null ? l.weight * l.reps : 0;

export const sumVolume = (logs: SetLog[]) => logs.reduce((s, l) => s + setVolume(l), 0);

/** Pounds per kilogram — single source of truth for the kg/lbs display toggle
 *  (imported by lib/prefs.ts). */
export const LBS_PER_KG = 2.2046226218;

/** Session tonnage in lbs. If a session carries a manually-entered total
 *  (`importedVolumeLbs`) use it, else sum the individual set logs. */
export const sessionTonnageLbs = (session: Session, sessionLogs: SetLog[]) => {
  if (session.importedVolumeLbs) return session.importedVolumeLbs;
  return sumVolume(sessionLogs);
};

export const fmtVolume = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString();
