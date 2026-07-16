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
 * Chris's described solo routine for these June sessions: back + abs  *
 * + biceps + triceps (lateral head). Legs/chest only happen on        *
 * coached program days (which have real logs) — deliberately NOT      *
 * reconstructed here, per Chris: no estimates for movements without   *
 * a real recorded weight.                                             *
 *                                                                     *
 * Per session: 2-3 bodyweight pull-ups → lat pulldown (stack 10 ≈     *
 * 100 lbs) → single-arm machine row, right arm ~2 reps ahead          *
 * (stack 4-5 ≈ 45 lbs) → DB preacher curls @15 lbs (real weight from  *
 * the sheet) → rope pushdown for the triceps lateral head (the        *
 * "马尾辫绳往下拉" — stack ~5 ≈ 50 lbs, Chris to confirm) → sometimes   *
 * a seated cable row → cable crunch (stack 9-10 ≈ 95 lbs) from ~6/21. *
 * Stack plates ≈ 10 lbs each (Chris's pick); reps 8-10 → 8 used       *
 * (conservative; calibrates within ~10% of the 6/07 measured volume). *
 *                                                                     *
 * Rendered with "~" everywhere. Where the watch measured total volume *
 * (6/07, 6/16) the measured number wins (see sessionTonnageLbs).      *
 * ------------------------------------------------------------------ */

const LBS_PER_PLATE = 10;
const W = {
  pulldown: 10 * LBS_PER_PLATE, // 背 stack 10
  saRow: 4.5 * LBS_PER_PLATE, // 提拉 stack 4-5 → 45
  preacher: 15, // real logged weight (sheet)
  ropePushdown: 5 * LBS_PER_PLATE, // assumption — Chris to confirm stack
  seatedRow: 5 * LBS_PER_PLATE,
  cableCrunch: 9.5 * LBS_PER_PLATE, // 腹肌 stack 9-10 → 95
};
const CRUNCH_FROM = "2026-06-21"; // "最近加的"
const REPS = 8;

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

    // lat pulldown
    for (let s = 0; s < (short ? 3 : 4); s++) add("pulldown", W.pulldown, REPS);

    // single-arm machine row — each arm logged as its own set, right leads
    const [r, l] = i % 2 === 0 ? [10, 8] : [8, 6];
    for (let round = 0; round < 2; round++) {
      add("saRow", W.saRow, r);
      add("saRow", W.saRow, l);
    }

    // biceps — preacher curls at the sheet's real weight
    for (let s = 0; s < (short ? 2 : 3); s++) add("preacher", W.preacher, REPS);

    // triceps lateral head — rope pushdown (program's cableTri slot)
    for (let s = 0; s < (short ? 2 : 3); s++) add("cableTri", W.ropePushdown, REPS);

    // seated cable row, some days (skipped on short sessions)
    if (i % 3 === 1 && !short) {
      for (let s = 0; s < 3; s++) add("seatedRow", W.seatedRow, REPS);
    }

    // cable crunch — recent addition
    if (session.date >= CRUNCH_FROM) {
      for (let s = 0; s < 3; s++) add("cableCrunch", W.cableCrunch, REPS);
    }
  });

  return logs;
}

export const WATCH_SESSION_LOGS: SetLog[] = buildWatchLogs();

/* ------------------------------------------------------------------ *
 * July 15, 2026 — real freestyle session, dictated by Chris verbatim  *
 * (NOT estimated). Assisted pull-up weights are the machine's         *
 * assistance in lbs (higher = easier). Grip goes in `variant`.        *
 * ------------------------------------------------------------------ */

const JULY15_START = new Date(2026, 6, 15, 19, 0).getTime();

export const JULY15_SESSION: Session = {
  id: "sess-freestyle-2026-07-15",
  date: "2026-07-15",
  startedAt: JULY15_START,
  completedAt: JULY15_START + 45 * 60 * 1000,
  source: "app",
  kind: "strength",
  durationSec: 45 * 60,
};

export const JULY15_LOGS: SetLog[] = (
  [
    // 下跪卷腹 (kneeling cable crunch)
    ["cableCrunch", 110, 10],
    ["cableCrunch", 110, 10],
    ["cableCrunch", 100, 5],
    ["cableCrunch", 120, 10],
    // bodyweight pull-ups, narrow grip
    ["pulldown", undefined, 3, "narrow"],
    ["pulldown", undefined, 2, "narrow"],
    ["pulldown", undefined, 2, "narrow"],
    ["pulldown", undefined, 1, "narrow"],
    // band/machine-assisted pull-ups (weight = assistance)
    ["pulldown", 120, 15, "narrow"],
    ["pulldown", 90, 10, "narrow"],
    ["pulldown", 90, 12, "wide"],
    ["pulldown", 90, 10, "wide"],
    // 下拉辫子 — rope pushdown
    ["cableTri", 80, 8],
    ["cableTri", 80, 8],
  ] as [string, number | undefined, number, string?][]
).map(([code, weight, reps, variant], i) => ({
  id: `log-fs0715-${i}`,
  sessionId: JULY15_SESSION.id,
  exerciseId: `ex-${code}`,
  setNumber: i + 1,
  weight,
  reps,
  variant,
  done: true,
  timestamp: JULY15_START + (3 + i * 3) * 60 * 1000,
}));

/* ------------------------------------------------------------------ *
 * July 14, 2026 — Toe Press backfill (Chris: ~110 probe then working   *
 * sets at 90 lbs, one set each foot, ~6-8 reps → logged as 90×7).     *
 * Independent completed session so it doesn't depend on which Full    *
 * Body day was open; prefill still works via exerciseId.              *
 * ------------------------------------------------------------------ */

const JULY14_START = new Date(2026, 6, 14, 18, 0).getTime();

export const JULY14_TOEPRESS_SESSION: Session = {
  id: "sess-toepress-2026-07-14",
  date: "2026-07-14",
  startedAt: JULY14_START,
  completedAt: JULY14_START + 20 * 60 * 1000,
  source: "app",
  kind: "strength",
  durationSec: 20 * 60,
};

export const JULY14_TOEPRESS_LOGS: SetLog[] = (
  [
    ["toePress", 90, 7, "right"],
    ["toePress", 90, 7, "left"],
  ] as [string, number, number, string][]
).map(([code, weight, reps, variant], i) => ({
  id: `log-tp0714-${i}`,
  sessionId: JULY14_TOEPRESS_SESSION.id,
  exerciseId: `ex-${code}`,
  setNumber: i + 1,
  weight,
  reps,
  variant,
  done: true,
  estimated: true,
  timestamp: JULY14_START + (5 + i * 4) * 60 * 1000,
}));
