import type { Session, SetLog } from "./types";
import { parseWatchRows, toSession } from "./watchCsv";

/** Chris's real Apple Watch history (June 2026), verbatim from the watch export.
 *  Tab-delimited so the thousands-comma in 训练容量 ("3,538") can't collide with
 *  the field separator. Running it through parseWatchRows means the seed itself
 *  exercises the same parser the /import screen uses. */
const RAW = `
2026年6月7日\t8:29 AM\t晨间力量训练 (Morning Weight Training)\t49分33秒\t-\t3,538\t101
2026年6月11日\t6:07 PM\t晚间力量训练 (Evening Weight Training)\t1小时4分\t270\t-\t95
2026年6月13日\t7:09 PM\t晚间力量训练 (Evening Weight Training)\t1小时0分\t276\t-\t103
2026年6月15日\t7:12 PM\t晚间力量训练 (Evening Weight Training)\t48分58秒\t221\t-\t104
2026年6月16日\t5:11 PM\t午后力量训练 (Afternoon Weight Training)\t1小时35分\t-\t3,131\t95
2026年6月18日\t5:19 PM\t午后力量训练 (Afternoon Weight Training)\t35分8秒\t186\t-\t111
2026年6月19日\t5:13 PM\t午后力量训练 (Afternoon Weight Training)\t34分58秒\t152\t-\t96
2026年6月21日\t11:41 AM\t午餐时间力量训练 (Lunch Weight Training)\t37分44秒\t183\t-\t108
2026年6月23日\t8:39 PM\t晚间椭圆机 (Evening Elliptical)\t16分52秒\t110\t-\t119
2026年6月23日\t8:56 PM\t晚间力量训练 (Evening Weight Training)\t31分4秒\t130\t-\t101
2026年6月24日\t5:52 PM\t午后椭圆机 (Afternoon Elliptical)\t11分27秒\t83\t-\t124
2026年6月24日\t6:04 PM\t晚间力量训练 (Evening Weight Training)\t1小时11分\t329\t-\t109
2026年6月25日\t9:19 PM\t夜间力量训练 (Night Weight Training)\t43分29秒\t183\t-\t91
`;

export const WATCH_SESSIONS: Session[] = parseWatchRows(RAW).map(toSession);

/* ------------------------------------------------------------------ *
 * Reconstructed set logs (estimated: true on every row).              *
 *                                                                     *
 * Chris described his actual freestyle back-day routine for these     *
 * sessions (July 2026): warm up with 2-3 bodyweight pull-ups → lat    *
 * pulldown 4-5 sets (stack 10 ≈ 100 lbs) or rope straight-arm         *
 * pulldown (≈ 50 lbs) → single-arm machine row 4 sets, right arm ~2   *
 * reps ahead (R10/L8 or R8/L6, stack 4-5 ≈ 45 lbs) → sometimes a      *
 * seated cable row → cable crunch (stack 9-10 ≈ 95 lbs) added from    *
 * ~June 21. Stack plates ≈ 10 lbs each (Chris's pick); reps 8-10.     *
 *                                                                     *
 * These are estimates, flagged as such and rendered with "~" in the   *
 * UI. Where the watch measured total volume (6/07, 6/16) the measured *
 * number wins over these logs (see sessionTonnageLbs).                *
 * ------------------------------------------------------------------ */

const LBS_PER_PLATE = 10;
const W = {
  pulldown: 10 * LBS_PER_PLATE, // 背 stack 10
  saRow: 4.5 * LBS_PER_PLATE, // 提拉 stack 4-5 → 45
  ropePulldown: 5 * LBS_PER_PLATE,
  seatedRow: 5 * LBS_PER_PLATE,
  cableCrunch: 9.5 * LBS_PER_PLATE, // 腹肌 stack 9-10 → 95
};
const CRUNCH_FROM = "2026-06-21"; // "最近加的"

function buildWatchLogs(): SetLog[] {
  const logs: SetLog[] = [];
  const strength = WATCH_SESSIONS.filter((s) => s.kind === "strength").sort((a, b) =>
    a.startedAt - b.startedAt
  );

  strength.forEach((session, i) => {
    let minute = 3; // first work set a few minutes in
    let n = 0;
    const add = (exCode: string, weight: number | undefined, reps: number) => {
      logs.push({
        id: `log-watch-${session.date}-${exCode}-${n++}`,
        sessionId: session.id,
        exerciseId: `ex-${exCode}`,
        setNumber: n,
        weight,
        reps,
        done: true,
        estimated: true,
        timestamp: session.startedAt + minute * 60 * 1000,
      });
      minute += 3;
    };

    const short = (session.durationSec ?? 3600) < 40 * 60;

    // warm-up pull-ups, bodyweight
    add("pulldown", undefined, 3);
    add("pulldown", undefined, 3);

    // main vertical pull: usually lat pulldown, every ~3rd session the rope
    if (i % 3 === 2) {
      for (let s = 0; s < (short ? 3 : 4); s++) add("ropePulldown", W.ropePulldown, 9);
    } else {
      for (let s = 0; s < (short ? 4 : 5); s++) add("pulldown", W.pulldown, 9);
    }

    // single-arm machine row — each arm logged as its own set, right leads
    const [r, l] = i % 2 === 0 ? [10, 8] : [8, 6];
    for (let round = 0; round < 2; round++) {
      add("saRow", W.saRow, r);
      add("saRow", W.saRow, l);
    }

    // seated cable row, some days (skipped on short sessions)
    if (i % 3 === 1 && !short) {
      for (let s = 0; s < 3; s++) add("seatedRow", W.seatedRow, 9);
    }

    // cable crunch — recent addition
    if (session.date >= CRUNCH_FROM) {
      for (let s = 0; s < 3; s++) add("cableCrunch", W.cableCrunch, 9);
    }
  });

  return logs;
}

export const WATCH_SESSION_LOGS: SetLog[] = buildWatchLogs();
