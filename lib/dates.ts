/** Shared date display helpers (weekday names were previously duplicated
 *  across Home / SessionView / Progress). */
export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const WEEKDAY_ZH = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;

export const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** "2026-06-16" → local Date at midnight (avoids UTC off-by-one). */
export const localDate = (iso: string) => new Date(`${iso}T00:00:00`);

/** "2026-06-16" → "Tue · Jun 16" (en) / "周二 · 6月16日" (zh). */
export const fmtDayLong = (iso: string, lang: "zh" | "en" = "en") => {
  const d = localDate(iso);
  if (lang === "zh") return `${WEEKDAY_ZH[d.getDay()]} · ${d.getMonth() + 1}月${d.getDate()}日`;
  return `${WEEKDAY_SHORT[d.getDay()]} · ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
};
