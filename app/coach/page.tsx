"use client";

import Link from "next/link";
import { useMemo } from "react";
import { weekStart } from "@/lib/data/repository";
import {
  useAllSessions,
  useAllSetLogs,
  useExercises,
  useWorkoutExercises,
  useWorkouts,
  useLatestReadiness,
} from "@/lib/data/hooks";
import { LEVEL_META } from "@/lib/data/readiness";
import { summarizeLoad } from "@/lib/load";
import { buildExerciseMemory } from "@/lib/lookup";
import { fmtDayLong } from "@/lib/dates";
import { useWeightFmt, useNameLang, exerciseNames } from "@/lib/prefs";
import LoadGauge from "@/components/LoadGauge";
import { useT, useMuscleName } from "@/lib/i18n";

/** Read-only coach dashboard — one client card (Chris) for now, structured so
 *  a client list can wrap it once accounts/sync exist. */
export default function CoachPage() {
  const t = useT();
  const fw = useWeightFmt();
  const lang = useNameLang();
  const muscleName = useMuscleName();
  const sessions = useAllSessions();
  const logs = useAllSetLogs();
  const exercises = useExercises();
  const wexs = useWorkoutExercises();
  const workouts = useWorkouts();
  const latestCheck = useLatestReadiness();

  const memories = useMemo(() => {
    if (!exercises || !wexs || !logs || !sessions) return undefined;
    const dates = new Map(sessions.map((s) => [s.id, s.date]));
    return buildExerciseMemory(exercises, wexs, logs, dates);
  }, [exercises, wexs, logs, sessions]);

  if (!sessions || !logs || !exercises || !wexs || !workouts || !memories) {
    return <p className="mt-10 text-center text-faint">{t("loading")}</p>;
  }

  const completed = sessions.filter((s) => s.completedAt != null);
  const ws = weekStart();
  const thisWeek = completed.filter((s) => s.date >= ws && s.kind !== "cardio");
  const load = summarizeLoad(sessions);

  // Red flags — the things the coach would actually act on.
  const flags: string[] = [];
  if (latestCheck && latestCheck.jointPain > 3) {
    flags.push(t("coachFlagJoint").replace("{n}", String(latestCheck.jointPain)));
  }
  for (const [area, val] of Object.entries(latestCheck?.soreMap ?? {})) {
    if (val >= 7)
      flags.push(t("coachFlagSore").replace("{area}", muscleName(area)).replace("{v}", String(val)));
  }
  if (load.acr != null && load.acr > 1.5) {
    flags.push(t("coachFlagAcr").replace("{v}", load.acr.toFixed(2)));
  }
  if (latestCheck?.sleepHours != null && latestCheck.sleepHours < 6.5) {
    flags.push(t("coachFlagSleep").replace("{h}", String(latestCheck.sleepHours)));
  }

  const memByExercise = new Map(memories.map((m) => [m.exercise.id, m]));

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-2">
        <p className="eyebrow">{t("coachEyebrow")}</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">{t("coachClients")}</h1>
      </header>

      {/* Client card */}
      <section className="panel border-l-2 border-cyan/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">Chris</h2>
            <p className="eyebrow mt-0.5">{t("coachProgramBlock")}</p>
          </div>
          <div className="text-right">
            <p className="tnum text-2xl font-bold text-cyan">
              {thisWeek.length}<span className="text-base text-faint">/3</span>
            </p>
            <p className="eyebrow">{t("coachSessionsWeek")}</p>
          </div>
        </div>
      </section>

      {/* Red flags */}
      <section className={`panel p-4 ${flags.length ? "border-danger/50" : ""}`}>
        <h2 className="eyebrow mb-2">{flags.length ? t("coachNeedsAttention") : t("coachNoFlags")}</h2>
        {flags.length ? (
          <ul className="flex flex-col gap-2">
            {flags.map((f, i) => (
              <li key={i} className="text-[0.85rem] leading-snug text-danger">{f}</li>
            ))}
          </ul>
        ) : (
          <p className="text-[0.85rem] text-muted">{t("coachAllInRange")}</p>
        )}
      </section>

      {/* Latest check-in */}
      <section className="panel p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="eyebrow">{t("coachLatestCheckin")}</h2>
          {latestCheck ? (
            <span className="text-[0.65rem] text-faint">{fmtDayLong(latestCheck.date, lang)}</span>
          ) : null}
        </div>
        {latestCheck ? (
          <>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold ${LEVEL_META[latestCheck.level].color}`}>
                {lang === "zh" ? LEVEL_META[latestCheck.level].labelZh : LEVEL_META[latestCheck.level].label}
              </span>
              <span className="tnum text-xl font-bold text-ink">
                {latestCheck.totalScore}<span className="text-sm text-faint">/100</span>
              </span>
              {latestCheck.sleepHours != null ? (
                <span className="tnum ml-auto text-[0.8rem] text-muted">😴 {latestCheck.sleepHours}h</span>
              ) : null}
              {latestCheck.proteinTaken != null ? (
                <span className="text-[0.8rem]">{latestCheck.proteinTaken ? "🥩 ✓" : "🥩 ✗"}</span>
              ) : null}
            </div>
            {Object.keys(latestCheck.soreMap ?? {}).length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Object.entries(latestCheck.soreMap!).map(([area, v]) => (
                  <span
                    key={area}
                    className={`rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold tracking-wide ${
                      v >= 7 ? "border-danger/60 text-danger" : v >= 4 ? "border-warn/60 text-warn" : "border-line text-muted"
                    }`}
                  >
                    {muscleName(area)} <span className="tnum">{v}/10</span>
                  </span>
                ))}
              </div>
            ) : null}
            {latestCheck.noteToCoach ? (
              <blockquote className="mt-3 border-l-2 border-cyan/40 pl-3 text-[0.85rem] italic leading-snug text-muted">
                “{latestCheck.noteToCoach}”
              </blockquote>
            ) : null}
          </>
        ) : (
          <p className="text-[0.85rem] text-muted">{t("coachNoCheckin")}</p>
        )}
      </section>

      <LoadGauge sessions={sessions} />

      {/* Program vs actual */}
      <section className="panel p-4">
        <h2 className="eyebrow mb-1">{t("coachProgramVsActual")}</h2>
        <p className="mb-3 text-[0.7rem] text-faint">{t("coachProgramVsActualSub")}</p>
        <div className="flex flex-col gap-4">
          {workouts.map((wo) => (
            <div key={wo.id}>
              <p className="mb-1.5 text-[0.8rem] font-bold text-cyan">{wo.name}</p>
              <ul className="flex flex-col divide-y divide-line">
                {wexs
                  .filter((we) => we.workoutId === wo.id && we.section === "main")
                  .sort((a, b) => a.order - b.order)
                  .map((we) => {
                    const ex = exercises.find((e) => e.id === we.exerciseId);
                    if (!ex) return null;
                    const last = memByExercise.get(ex.id)?.last;
                    return (
                      <li key={we.id} className="flex items-baseline justify-between gap-2 py-1.5">
                        <span className="min-w-0 truncate text-[0.8rem] text-ink">{exerciseNames(ex, lang).primary}</span>
                        <span className="tnum shrink-0 text-right text-[0.7rem]">
                          <span className="text-faint">
                            {we.targetSets}×{we.targetRepsRange}
                            {we.targetRir ? ` @${we.targetRir}` : ""}
                          </span>
                          {last ? (
                            <span className="ml-2 text-cyan">
                              {last.weight != null ? fw(last.weight) : t("bw")}
                              {last.reps != null ? `×${last.reps}` : ""}
                            </span>
                          ) : (
                            <span className="ml-2 text-faint">—</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <Link
        href="/import"
        className="panel flex items-center justify-between p-4 text-sm text-muted transition active:scale-[0.99]"
      >
        <span>{t("coachImportCsv")}</span>
        <span className="text-cyan">→</span>
      </Link>

      <p className="text-center text-[0.65rem] leading-relaxed text-faint">{t("coachReadonlyFooter")}</p>
    </div>
  );
}
