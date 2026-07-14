import type { Session, SetLog } from "./data/types";

/** Tonnage for one set (weight × reps), 0 unless it's a completed weighted set. */
export const setVolume = (l: SetLog) =>
  l.done && l.weight != null && l.reps != null ? l.weight * l.reps : 0;

export const sumVolume = (logs: SetLog[]) => logs.reduce((s, l) => s + setVolume(l), 0);

export const KG_TO_LB = 2.20462;

/** Session tonnage in lbs: in-app set logs win; otherwise fall back to the
 *  volume the watch reported (kg → lbs). 0 if neither exists. */
export const sessionTonnageLbs = (session: Session, sessionLogs: SetLog[]) => {
  const logged = sumVolume(sessionLogs);
  if (logged > 0) return logged;
  if (session.importedVolumeKg) return session.importedVolumeKg * KG_TO_LB;
  return 0;
};

export const fmtVolume = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString();
