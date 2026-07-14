import type { Session } from "./types";
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
