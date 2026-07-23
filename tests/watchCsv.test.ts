import { describe, it, expect } from "vitest";
import { parseWatchRows, watchSessionId, toSession } from "@/lib/data/watchCsv";

describe("parseWatchRows", () => {
  it("parses a tab-delimited Chinese row where the volume column has a value", () => {
    const r = parseWatchRows(`2026年6月7日\t8:29 AM\t晨间力量训练\t49分33秒\t-\t3,538\t101`)[0];
    expect(r.date).toBe("2026-06-07");
    expect(r.kind).toBe("strength");
    expect(r.durationSec).toBe(49 * 60 + 33);
    expect(r.kcal).toBeUndefined();
    expect(r.volumeLbs).toBe(3538); // thousands-comma stripped; treated as lbs
    expect(r.avgHr).toBe(101);
    expect(r.clockTime).toBe("8:29 AM");
  });

  it("reads the kcal column when volume is '-'", () => {
    const r = parseWatchRows(`2026年6月11日\t6:07 PM\t晚间力量训练\t1小时4分\t270\t-\t95`)[0];
    expect(r.kcal).toBe(270);
    expect(r.volumeLbs).toBeUndefined();
    expect(r.durationSec).toBe(64 * 60);
  });

  it("detects cardio from the type label", () => {
    expect(parseWatchRows(`2026年6月23日\t8:39 PM\t晚间椭圆机\t17分\t110\t-\t119`)[0].kind).toBe("cardio");
  });

  it("skips headers, blank, and unparsable lines", () => {
    expect(parseWatchRows(`日期\t训练类型\n\nnot a row`)).toHaveLength(0);
  });
});

describe("watchSessionId", () => {
  it("is deterministic from date + time so re-imports are idempotent", () => {
    const r = parseWatchRows(`2026年6月7日\t8:29 AM\t力量训练\t49分\t-\t3538\t101`)[0];
    expect(watchSessionId(r)).toBe("sess-watch-2026-06-07-0829");
  });
});

describe("toSession", () => {
  it("maps volumeLbs → importedVolumeLbs and marks source=watch", () => {
    const s = toSession(parseWatchRows(`2026年6月7日\t8:29 AM\t力量训练\t49分\t-\t3538\t101`)[0]);
    expect(s.importedVolumeLbs).toBe(3538);
    expect(s.source).toBe("watch");
    expect(s.completedAt!).toBeGreaterThan(s.startedAt);
  });
});
