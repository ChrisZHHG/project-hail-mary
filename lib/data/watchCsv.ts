import type { Session } from "./types";

/** Parser for Apple Watch / fitness-app workout exports in the format Chris's
 *  watch produces (Chinese headers & durations). Used both for the seeded
 *  backfill (lib/data/watchHistory.ts) and the /import paste screen — the
 *  manual bridge until a real HealthKit integration exists.
 *
 *  Expected columns (header row optional):
 *  日期, 具体时间, 训练类型 (Type), 训练时长, 消耗热量 (kcal), 训练容量 (lbs), 平均心率 (bpm)
 *  Values like: 2026年6月7日 · 8:29 AM · 晨间力量训练 · 49分33秒 / 1小时4分 · 270 · "3,538" · 101
 */

export interface ParsedWatchRow {
  date: string; // YYYY-MM-DD
  clockTime?: string;
  kind: "strength" | "cardio";
  typeLabel: string;
  durationSec?: number;
  kcal?: number;
  volumeLbs?: number;
  avgHr?: number;
  startedAt: number;
}

/** Split one line into fields. Tab-first (as pasted from Numbers/Excel/Sheets);
 *  falls back to comma-splitting that respects double-quoted fields ("3,538"). */
function splitFields(line: string): string[] {
  const norm = line.replace(/，/g, ","); // full-width commas
  if (norm.includes("\t")) return norm.split("\t").map((f) => f.trim());
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (const ch of norm) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function parseDate(raw: string): string | null {
  const cn = raw.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (cn) return `${cn[1]}-${cn[2].padStart(2, "0")}-${cn[3].padStart(2, "0")}`;
  const iso = raw.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  return null;
}

/** "8:29 AM" / "下午 5:11" / "17:11" → [hour24, minute]; null if unparsable. */
function parseClock(raw: string): [number, number] | null {
  const m = raw.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const isPM = /PM|下午|晚上/i.test(raw);
  const isAM = /AM|上午|凌晨/i.test(raw);
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return [h, min];
}

/** "1小时4分" / "49分33秒" / "35分8秒" / "1h 4m" → seconds. */
function parseDuration(raw: string): number | undefined {
  const cn = raw.match(/(?:(\d+)\s*小时)?\s*(?:(\d+)\s*分)?\s*(?:(\d+)\s*秒)?/);
  if (cn && (cn[1] || cn[2] || cn[3])) {
    return (Number(cn[1] ?? 0) * 3600 + Number(cn[2] ?? 0) * 60 + Number(cn[3] ?? 0)) || undefined;
  }
  const en = raw.match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?/i);
  if (en && (en[1] || en[2] || en[3])) {
    return (Number(en[1] ?? 0) * 3600 + Number(en[2] ?? 0) * 60 + Number(en[3] ?? 0)) || undefined;
  }
  return undefined;
}

/** "3,538" / "270" / "-" / "" → number | undefined. */
function parseNum(raw: string): number | undefined {
  const cleaned = raw.replace(/[",\s]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "—") return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

function kindOf(typeLabel: string): "strength" | "cardio" {
  return /力量|strength|weight/i.test(typeLabel) ? "strength" : "cardio";
}

/** Parse pasted export text → rows. Silently skips headers and unparsable lines. */
export function parseWatchRows(text: string): ParsedWatchRow[] {
  const rows: ParsedWatchRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (/日期|训练类型|Type\b/i.test(line) && !/\d{4}年/.test(line)) continue; // header
    const f = splitFields(line);
    if (f.length < 4) continue;
    const date = parseDate(f[0]);
    if (!date) continue;
    const clock = parseClock(f[1] ?? "");
    const [y, mo, d] = date.split("-").map(Number);
    const startedAt = new Date(y, mo - 1, d, clock?.[0] ?? 12, clock?.[1] ?? 0).getTime();
    rows.push({
      date,
      clockTime: f[1]?.trim() || undefined,
      typeLabel: f[2]?.trim() ?? "",
      kind: kindOf(f[2] ?? ""),
      durationSec: parseDuration(f[3] ?? ""),
      kcal: parseNum(f[4] ?? ""),
      volumeLbs: parseNum(f[5] ?? ""),
      avgHr: parseNum(f[6] ?? ""),
      startedAt,
    });
  }
  return rows;
}

/** Deterministic id → re-imports are no-ops (bulkPut by same id). */
export function watchSessionId(r: ParsedWatchRow): string {
  const hhmm = r.clockTime?.match(/(\d{1,2}):(\d{2})/);
  const suffix = hhmm ? `-${hhmm[1].padStart(2, "0")}${hhmm[2]}` : "";
  return `sess-watch-${r.date}${suffix}`;
}

export function toSession(r: ParsedWatchRow): Session {
  return {
    id: watchSessionId(r),
    date: r.date,
    startedAt: r.startedAt,
    completedAt: r.startedAt + (r.durationSec ?? 45 * 60) * 1000,
    source: "watch",
    kind: r.kind,
    durationSec: r.durationSec,
    kcal: r.kcal,
    avgHr: r.avgHr,
    importedVolumeLbs: r.volumeLbs,
    clockTime: r.clockTime,
  };
}
