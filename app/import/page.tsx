"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/data/db";
import { parseWatchRows, toSession, watchSessionId } from "@/lib/data/watchCsv";
import { fmtDayLong } from "@/lib/dates";

/** Manual bridge for watch data until a real HealthKit integration exists:
 *  paste rows from the workout export (tab- or comma-separated), preview the
 *  parse, commit. Stable ids make re-imports no-ops. */
export default function ImportPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [done, setDone] = useState<number | null>(null);

  const rows = useMemo(() => parseWatchRows(text), [text]);

  async function commit() {
    const sessions = rows.map(toSession);
    await db.sessions.bulkPut(sessions);
    setDone(sessions.length);
    setTimeout(() => router.push("/progress"), 900);
  }

  const fmtDur = (sec?: number) => {
    if (!sec) return "—";
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    return h ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="pt-2">
        <p className="eyebrow">Data bridge</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Import watch history</h1>
        <p className="mt-2 text-[0.85rem] leading-snug text-muted">
          Paste rows from your watch export — date, time, type, duration, kcal, volume, avg HR.
          Re-importing the same rows is safe (they overwrite themselves).
        </p>
      </header>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"2026年6月7日\t8:29 AM\t晨间力量训练\t49分33秒\t-\t3,538\t101"}
        rows={6}
        className="w-full resize-y rounded-xl border border-line bg-elevated px-3 py-2.5 font-mono text-[0.75rem] text-ink placeholder:text-faint focus:border-cyan focus:outline-none"
      />

      {rows.length > 0 ? (
        <section className="panel p-4">
          <h2 className="eyebrow mb-2">Parsed {rows.length} workout{rows.length === 1 ? "" : "s"}</h2>
          <ul className="flex flex-col divide-y divide-line">
            {rows.map((r) => (
              <li key={watchSessionId(r)} className="flex items-baseline justify-between gap-2 py-1.5 text-[0.75rem]">
                <span className="min-w-0">
                  <span className="text-ink">{fmtDayLong(r.date)}</span>
                  <span className="ml-1.5 text-faint">{r.clockTime}</span>
                  <span className={`ml-1.5 rounded border px-1 text-[0.55rem] uppercase tracking-wider ${
                    r.kind === "strength" ? "border-laser/40 text-laser" : "border-cyan/40 text-cyan"
                  }`}>
                    {r.kind}
                  </span>
                </span>
                <span className="tnum shrink-0 text-right text-faint">
                  {fmtDur(r.durationSec)}
                  {r.volumeKg ? ` · ${r.volumeKg.toLocaleString()} kg` : ""}
                  {r.avgHr ? ` · ${r.avgHr} bpm` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : text.trim() ? (
        <p className="text-center text-sm text-warn">Nothing parseable yet — check the format.</p>
      ) : null}

      <button
        type="button"
        onClick={commit}
        disabled={rows.length === 0 || done != null}
        className="tap w-full rounded-xl bg-laser py-3.5 text-sm font-bold uppercase tracking-wider text-black transition active:scale-[0.98] disabled:opacity-40 glow-laser"
      >
        {done != null ? `Imported ${done} ✓` : `Import ${rows.length || ""} workout${rows.length === 1 ? "" : "s"}`}
      </button>

      <p className="text-center text-[0.65rem] leading-relaxed text-faint">
        Roadmap: automatic Apple Health sync via an iOS Shortcut posting here.
      </p>
    </div>
  );
}
