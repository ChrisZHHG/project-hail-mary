"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  useWorkouts,
  useWeeklyReadiness,
  useCompletedSessions,
  useAllSetLogs,
} from "@/lib/data/hooks";
import { isWeekend } from "@/lib/data/repository";
import { LEVEL_META, REC_ZH, REC_ZH_JOINT } from "@/lib/data/readiness";
import { useT } from "@/lib/i18n";
import { useNameLang } from "@/lib/prefs";
import { PRINCIPLES } from "@/lib/theory";
import { sessionTonnageLbs, fmtVolume } from "@/lib/volume";
import { BRAND } from "@/lib/brand";
import { fmtDayLong } from "@/lib/dates";
import { downloadWorkoutIcs, nextOccurrence } from "@/lib/ics";
import { daysSinceBackup } from "@/lib/backup";

export default function Home() {
  const t = useT();
  const lang = useNameLang();
  const workouts = useWorkouts();
  const weekly = useWeeklyReadiness();
  const completed = useCompletedSessions();
  const allLogs = useAllSetLogs();
  // Compute after mount to avoid a build-time vs client hydration mismatch.
  const [weekend, setWeekend] = useState(false);
  useEffect(() => setWeekend(isWeekend()), []);

  const lastSession = completed?.[0];
  const lastVolume =
    lastSession && allLogs
      ? sessionTonnageLbs(lastSession, allLogs.filter((l) => l.sessionId === lastSession.id))
      : 0;

  // Rotation follows the last *program* session — watch imports (no workoutId,
  // e.g. elliptical) must not reset the cycle to day 1.
  const lastProgramSession = completed?.find((s) => s.workoutId);
  const nextWorkout = useMemo(() => {
    if (!workouts?.length) return undefined;
    if (!lastProgramSession) return workouts[0];
    const lastWo = workouts.find((w) => w.id === lastProgramSession.workoutId);
    const nextOrder = lastWo ? (lastWo.dayOrder + 1) % workouts.length : 0;
    return workouts.find((w) => w.dayOrder === nextOrder) ?? workouts[0];
  }, [workouts, lastProgramSession]);

  // Backup nudge: never exported, or stale > 14 days (computed post-mount).
  const [backupDue, setBackupDue] = useState<number | "never" | null>(null);
  useEffect(() => {
    const days = daysSinceBackup();
    if (days == null) setBackupDue("never");
    else if (days > 14) setBackupDue(days);
  }, []);

  // Computed after mount (weekday math) to avoid hydration drift.
  const [nextDayLabel, setNextDayLabel] = useState("");
  useEffect(() => {
    if (!nextWorkout) return;
    const d = nextOccurrence(nextWorkout.id);
    if (!d) return;
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    setNextDayLabel(fmtDayLong(iso, lang));
  }, [nextWorkout, lang]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-3 pt-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/mark.svg" alt="" className="h-11 w-11 rounded-xl" />
        <div>
          <h1 className="text-2xl font-bold leading-none text-ink">{BRAND.name}</h1>
          <p className="eyebrow mt-1">{BRAND.tagline}</p>
        </div>
      </header>

      {/* Weekly readiness */}
      {weekly ? (
        <Link href="/readiness" className={`panel block border-l-2 p-4 ${LEVEL_META[weekly.level].ring}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">{t("thisWeek")}</p>
              <p className={`mt-1 text-sm font-semibold ${LEVEL_META[weekly.level].color}`}>
                {lang === "zh" ? LEVEL_META[weekly.level].labelZh : LEVEL_META[weekly.level].label}
              </p>
            </div>
            <div className="tnum text-3xl font-bold text-ink">
              {weekly.totalScore}
              <span className="text-base text-faint">/100</span>
            </div>
          </div>
          <p className="mt-2 text-[0.85rem] leading-snug text-muted">
            {lang === "zh"
              ? weekly.jointPain > 3
                ? REC_ZH_JOINT
                : REC_ZH[weekly.level]
              : weekly.recommendation}
          </p>
          <p className="eyebrow mt-2 text-cyan">{t("tapToUpdate")}</p>
        </Link>
      ) : (
        <Link
          href="/readiness"
          className={`panel flex items-center justify-between p-4 transition active:scale-[0.99] ${
            weekend ? "border-laser/40 glow-laser" : ""
          }`}
        >
          <div>
            <p className="eyebrow">{weekend ? t("weekendCheckin") : t("weeklyCheckin")}</p>
            <p className="mt-1 text-base font-semibold text-ink">{t("howWasWeek")}</p>
            <p className="mt-0.5 text-[0.8rem] text-muted">
              {weekend ? t("tunesNext") : t("dueWeekend")}
            </p>
          </div>
          <span className="text-2xl text-laser">→</span>
        </Link>
      )}

      {/* Primary start */}
      {nextWorkout ? (
        <div className="relative overflow-hidden rounded-card border border-laser/40 bg-laser/[0.08] glow-laser">
          <Link href={`/session/${nextWorkout.id}`} className="block p-5 transition active:scale-[0.99]">
            <p className="eyebrow text-laser-soft">{t("upNext")}</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">{nextWorkout.name}</h2>
            <p className="mt-0.5 text-sm text-muted">{nextWorkout.subtitle}</p>
            <span className="mt-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-laser">
              {t("startTraining")}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => downloadWorkoutIcs(nextWorkout)}
            className="tap flex w-full items-center justify-between border-t border-laser/20 px-5 py-2.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted transition hover:text-cyan"
          >
            <span>{t("remindMe")}{nextDayLabel ? ` · ${nextDayLabel}` : ""}</span>
            <span className="text-cyan">{t("addCalendar")}</span>
          </button>
        </div>
      ) : (
        <p className="text-faint">{t("loading")}</p>
      )}

      <div className="flex items-center justify-center gap-4">
        <Link href="/train" className="text-center text-[0.8rem] uppercase tracking-wider text-faint hover:text-cyan">
          {t("chooseAnother")}
        </Link>
        <span className="text-faint">·</span>
        <Link href="/freestyle" className="text-center text-[0.8rem] uppercase tracking-wider text-cyan">
          {t("freestyleShort")}
        </Link>
      </div>

      {/* Neck flag → corrective protocol */}
      {(weekly?.soreMap?.["Neck"] ?? 0) > 0 ? (
        <Link
          href="/method#th-nose-to-armpit"
          className="panel flex items-center justify-between border-l-2 border-warn/60 p-4 transition active:scale-[0.99]"
        >
          <div>
            <p className="eyebrow text-warn">{t("neckFlagged")} {weekly!.soreMap!["Neck"]}/10</p>
            <p className="mt-1 text-[0.85rem] text-muted">{t("neckRun")}</p>
          </div>
          <span className="text-xl">📖</span>
        </Link>
      ) : null}

      {/* Method teaser */}
      <Link href="/method" className="panel block p-4 transition active:scale-[0.99]">
        <div className="flex items-center justify-between">
          <p className="eyebrow">{t("methodTitle")}</p>
          <span className="text-cyan">→</span>
        </div>
        <p className="mt-1 text-[0.85rem] text-muted">{t("methodDesc")}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRINCIPLES.slice(0, 4).map((p) => (
            <span
              key={p.tag}
              className="rounded border border-cyan/30 px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider text-cyan"
            >
              {p.tag}
            </span>
          ))}
        </div>
      </Link>

      {/* Recent */}
      {lastSession ? (
        <Link href="/progress" className="panel flex items-center justify-between p-4">
          <div>
            <p className="eyebrow">{t("lastSession")}</p>
            <p className="mt-1 text-sm text-muted">
              {fmtDayLong(lastSession.date, lang)}
              {lastSession.source === "watch" ? (
                <span className="ml-1.5 rounded border border-line px-1 text-[0.55rem] uppercase tracking-wider text-faint">
                  watch
                </span>
              ) : null}
            </p>
          </div>
          <div className="text-right">
            {lastVolume > 0 ? (
              <div className="tnum text-xl font-bold text-cyan">
                {fmtVolume(lastVolume)} <span className="text-xs font-normal text-faint">{BRAND.unit}</span>
              </div>
            ) : null}
            <p className="eyebrow text-cyan">{t("viewProgress")}</p>
          </div>
        </Link>
      ) : null}

      {/* Backup nudge — local-first means the phone IS the database */}
      {backupDue ? (
        <Link
          href="/import"
          className="panel flex items-center justify-between border-l-2 border-cyan/40 p-3.5 transition active:scale-[0.99]"
        >
          <p className="text-[0.8rem] text-muted">
            <span className="font-semibold text-cyan">{t("backupTitle")}</span>{" "}
            {backupDue === "never" ? t("backupNever") : `${backupDue} ${t("backupDays")}`}
          </p>
          <span className="text-cyan">💾</span>
        </Link>
      ) : null}

      <Link
        href="/coach"
        className="pb-2 text-center text-[0.7rem] uppercase tracking-wider text-faint transition hover:text-cyan"
      >
        {t("coachView")}
      </Link>
    </div>
  );
}
