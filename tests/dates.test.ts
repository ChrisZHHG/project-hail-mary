import { describe, it, expect } from "vitest";
import { localDate, fmtDayLong, WEEKDAY_SHORT } from "@/lib/dates";

describe("localDate", () => {
  it("parses an ISO date to LOCAL midnight (no UTC off-by-one)", () => {
    const d = localDate("2026-06-16");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5); // June (0-indexed)
    expect(d.getDate()).toBe(16);
    expect(d.getHours()).toBe(0);
  });
});

describe("fmtDayLong", () => {
  const iso = "2026-06-16";
  const wd = localDate(iso).getDay();
  it("English form: 'Wkd · Mon DD'", () => {
    expect(fmtDayLong(iso, "en")).toBe(`${WEEKDAY_SHORT[wd]} · Jun 16`);
  });
  it("Chinese form: '周X · M月D日'", () => {
    expect(fmtDayLong(iso, "zh")).toBe(`${["周日", "周一", "周二", "周三", "周四", "周五", "周六"][wd]} · 6月16日`);
  });
  it("defaults to English", () => expect(fmtDayLong(iso)).toBe(fmtDayLong(iso, "en")));
});
