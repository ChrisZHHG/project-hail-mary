"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/data/db";
import { parseWatchRows, toSession, watchSessionId } from "@/lib/data/watchCsv";
import { fmtDayLong } from "@/lib/dates";
import { downloadBackup, restoreBackup } from "@/lib/backup";
import { hardRefreshApp } from "@/lib/pwa";
import { useNameLang, useUnit, useBodyweightLbs, setBodyweightLbs, lbsToDisplay, displayToLbs } from "@/lib/prefs";
import { useT } from "@/lib/i18n";

/** Manual bridge for watch data until a real HealthKit integration exists:
 *  paste rows from the workout export (tab- or comma-separated), preview the
 *  parse, commit. Stable ids make re-imports no-ops. */
export default function ImportPage() {
  const t = useT();
  const router = useRouter();
  const lang = useNameLang();
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
        <p className="eyebrow">{t("dataBridge")}</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">{t("importTitle")}</h1>
        <p className="mt-2 text-[0.85rem] leading-snug text-muted">{t("importBody")}</p>
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
          <h2 className="eyebrow mb-2">
            {rows.length === 1 ? t("parsedOne") : t("parsedMany").replace("{n}", String(rows.length))}
          </h2>
          <ul className="flex flex-col divide-y divide-line">
            {rows.map((r) => (
              <li key={watchSessionId(r)} className="flex items-baseline justify-between gap-2 py-1.5 text-[0.75rem]">
                <span className="min-w-0">
                  <span className="text-ink">{fmtDayLong(r.date, lang)}</span>
                  <span className="ml-1.5 text-faint">{r.clockTime}</span>
                  <span className={`ml-1.5 rounded border px-1 text-[0.55rem] uppercase tracking-wider ${
                    r.kind === "strength" ? "border-laser/40 text-laser" : "border-cyan/40 text-cyan"
                  }`}>
                    {r.kind === "strength" ? t("strengthLabel") : t("cardioLabel")}
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
        <p className="text-center text-sm text-warn">{t("nothingParsed")}</p>
      ) : null}

      <button
        type="button"
        onClick={commit}
        disabled={rows.length === 0 || done != null}
        className="tap w-full rounded-xl bg-laser py-3.5 text-sm font-bold uppercase tracking-wider text-black transition active:scale-[0.98] disabled:opacity-40 glow-laser"
      >
        {done != null
          ? t("importedDone").replace("{n}", String(done))
          : rows.length === 1
            ? t("importOne")
            : t("importMany").replace("{n}", String(rows.length || ""))}
      </button>

      <p className="text-center text-[0.65rem] leading-relaxed text-faint">{t("roadmapNote")}</p>

      <ProfileSection />

      <BackupSection />
    </div>
  );
}

/** Body profile — bodyweight gives BW movements (pull-ups) real tonnage. */
function ProfileSection() {
  const t = useT();
  const unit = useUnit();
  const bw = useBodyweightLbs();
  return (
    <section className="panel mt-2 p-4">
      <h2 className="eyebrow mb-1">{t("profileTitle")}</h2>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{t("bodyweightLabel")}</p>
          <p className="mt-0.5 text-[0.7rem] leading-snug text-faint">{t("bodyweightHint")}</p>
        </div>
        <div className="flex shrink-0 items-baseline gap-1">
          <input
            type="number"
            inputMode="decimal"
            value={bw != null ? lbsToDisplay(bw, unit) : ""}
            placeholder={unit === "kg" ? "70" : "155"}
            onChange={(e) =>
              setBodyweightLbs(
                e.target.value === "" ? null : displayToLbs(Number(e.target.value), unit)
              )
            }
            className="tnum w-20 rounded-lg border border-line bg-void px-2 py-1.5 text-right text-xl font-bold text-cyan placeholder:text-faint focus:border-cyan focus:outline-none"
          />
          <span className="text-xs text-faint">{unit}</span>
        </div>
      </div>
    </section>
  );
}

/** Full-database backup/restore — the phone IS the database, so export often. */
function BackupSection() {
  const t = useT();
  const [status, setStatus] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function onExport() {
    await downloadBackup();
    setStatus(t("backupDownloaded"));
  }

  async function onRefresh() {
    setRefreshing(true);
    setStatus(t("refreshing"));
    await hardRefreshApp();
  }

  async function onRestore(file: File) {
    try {
      const counts = await restoreBackup(await file.text());
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      setStatus(t("restoredRows").replace("{n}", String(total)));
    } catch (e) {
      setStatus(`${t("restoreFailed")}${e instanceof Error ? e.message : t("badFile")}`);
    }
  }

  return (
    <section className="panel mt-2 p-4">
      <h2 className="eyebrow mb-1">{t("backupSection")}</h2>
      <p className="mb-3 text-[0.75rem] leading-snug text-muted">{t("backupBody")}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onExport}
          className="tap flex-1 rounded-xl border border-cyan/50 bg-cyan/[0.08] py-3 text-sm font-bold uppercase tracking-wider text-cyan transition active:scale-[0.98]"
        >
          {t("exportBackup")}
        </button>
        <label className="tap flex flex-1 cursor-pointer items-center justify-center rounded-xl border border-line py-3 text-sm font-bold uppercase tracking-wider text-muted transition hover:border-cyan/40">
          {t("restore")}
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onRestore(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() => void onRefresh()}
        disabled={refreshing}
        className="tap mt-2 w-full rounded-xl border border-line py-2.5 text-[0.75rem] font-semibold uppercase tracking-wider text-muted transition hover:border-cyan/40 hover:text-cyan disabled:opacity-50"
      >
        {t("refreshApp")}
      </button>
      <p className="mt-1 text-[0.65rem] leading-snug text-faint">{t("refreshAppHint")}</p>
      {status ? <p className="tnum mt-2 text-[0.75rem] text-cyan">{status}</p> : null}
    </section>
  );
}
