import type { Session, SetLog } from "./data/types";

/** Tonnage for one set (weight × reps), 0 unless it's a completed weighted set. */
export const setVolume = (l: SetLog) =>
  l.done && l.weight != null && l.reps != null ? l.weight * l.reps : 0;

export const sumVolume = (logs: SetLog[]) => logs.reduce((s, l) => s + setVolume(l), 0);

export const KG_TO_LB = 2.20462;

/** Session tonnage in lbs. A volume the watch actually measured beats any
 *  reconstructed/estimated set logs; live in-app logs beat everything else. */
export const sessionTonnageLbs = (session: Session, sessionLogs: SetLog[]) => {
  if (session.importedVolumeKg) return session.importedVolumeKg * KG_TO_LB;
  return sumVolume(sessionLogs);
};

export const fmtVolume = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString();
