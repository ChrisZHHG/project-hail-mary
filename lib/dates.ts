/** Shared date display helpers (weekday names were previously duplicated
 *  across Home / SessionView / Progress). */
export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** "2026-06-16" → local Date at midnight (avoids UTC off-by-one). */
export const localDate = (iso: string) => new Date(`${iso}T00:00:00`);

/** "2026-06-16" → "Tue · Jun 16". */
export const fmtDayLong = (iso: string) => {
  const d = localDate(iso);
  return `${WEEKDAY_SHORT[d.getDay()]} · ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
};
