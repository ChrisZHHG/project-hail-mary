"use client";

import Link from "next/link";
import { useMemo } from "react";
import { repo, weekStart } from "@/lib/data/repository";
import {
  useAllSessions,
  useAllSetLogs,
  useExercises,
  useWorkoutExercises,
  useWorkouts,
  useLatestReadiness,
  useNextWorkout,
  useRecommendedSession,
  useWeeklyVolume,
  usePublicationState,
} from "@/lib/data/hooks";
import { EVIDENCE_MIN_SETS } from "@/lib/coach";
import CoachRxRow from "@/components/CoachRxRow";
import { LEVEL_META } from "@/lib/data/readiness";
import { summarizeLoad } from "@/lib/load";
import { buildExerciseMemory } from "@/lib/lookup";
import { fmtDayLong } from "@/lib/dates";
import { useNameLang } from "@/lib/prefs";
import { useT, useMuscleName } from "@/lib/i18n";

/**
 * The coach's working surface: how the client is doing, what the engine proposes
 * for the next session, and one button to sign off and send it.
 *
 * Deliberately narrow. Everything here either informs that decision or is the
 * decision — the training-load ratio and the program-vs-actual table were cut
 * because neither changed what the coach would do next. Single client for now,
 * structured so a client list can wrap it once accounts exist.
 */
export default function CoachPage() {
  const t = useT();
  const lang = useNameLang();
  const muscleName = useMuscleName();
  const sessions = useAllSessions();
  const logs = useAllSetLogs();
  const exercises = useExercises();
  const wexs = useWorkoutExercises();
  const workouts = useWorkouts();
  const latestCheck = useLatestReadiness();
  const sched = useNextWorkout();
  const recommended = useRecommendedSession(sched?.workoutId ?? undefined);
  const volume = useWeeklyVolume();
  const pub = usePublicationState(sched?.workoutId ?? undefined);

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

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-2">
        <p className="eyebrow">{t("coachViewLabel")}</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Chris</h1>
      </header>

      {/* One status card: adherence, readiness and anything worth acting on.
          Three separate panels for this was three glances where one would do. */}
      <section
        className={`panel border-l-2 p-4 ${flags.length ? "border-danger/60" : "border-cyan/50"}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">{t("coachProgramBlock")}</p>
            {latestCheck ? (
              <p className={`mt-1 text-sm font-semibold ${LEVEL_META[latestCheck.level].color}`}>
                {lang === "zh" ? LEVEL_META[latestCheck.level].labelZh : LEVEL_META[latestCheck.level].label}
                <span className="tnum ml-2 text-[0.75rem] font-normal text-faint">
                  {latestCheck.totalScore}/100 · {fmtDayLong(latestCheck.date, lang)}
                </span>
              </p>
            ) : (
              <p className="mt-1 text-[0.85rem] text-muted">{t("coachNoCheckin")}</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="tnum text-2xl font-bold text-cyan">
              {thisWeek.length}<span className="text-base text-faint">/3</span>
            </p>
            <p className="eyebrow">{t("coachSessionsWeek")}</p>
          </div>
        </div>

        {flags.length ? (
          <ul className="mt-3 flex flex-col gap-1 border-t border-line pt-2.5">
            {flags.map((f, i) => (
              <li key={i} className="text-[0.8rem] leading-snug text-danger">{f}</li>
            ))}
          </ul>
        ) : null}

        {latestCheck?.noteToCoach ? (
          <blockquote className="mt-2.5 border-l-2 border-cyan/40 pl-3 text-[0.8rem] italic leading-snug text-muted">
            “{latestCheck.noteToCoach}”
          </blockquote>
        ) : null}
      </section>

      {/* Engine-generated next session — the thing a coach reviews and sends. */}
      <section className="panel p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="eyebrow">
            {t("coachRxTitle")}
            <span
              className={`ml-2 rounded px-1.5 py-0.5 text-[0.6rem] normal-case ${
                pub?.state === "draft"
                  ? "border border-laser/50 text-laser"
                  : "border border-go/50 text-go"
              }`}
            >
              {pub?.state === "draft"
                ? t("pubDraft")
                : pub?.state === "auto"
                  ? t("pubAuto")
                  : t("pubPublished")}
            </span>
          </h2>
          {sched?.workoutId ? (
            <span className="text-[0.75rem] font-bold text-cyan">
              {workouts.find((w) => w.id === sched.workoutId)?.name}
            </span>
          ) : null}
        </div>
        <p className="mb-3 mt-1 text-[0.7rem] leading-snug text-faint">{t("coachRxSub")}</p>

        {recommended?.length ? (
          <ul className="flex flex-col gap-2.5">
            {recommended.map(({ instance, rx, override, trend, stalled }) => (
              <CoachRxRow
                key={instance.id}
                instance={instance}
                rx={rx}
                override={override}
                trend={trend}
                stalled={stalled}
              />
            ))}
          </ul>
        ) : (
          <p className="text-[0.85rem] text-muted">{t("coachRxNoPlan")}</p>
        )}

        {/* The one action on this page: sign off and send. */}
        {recommended?.length && sched?.workoutId ? (
          <div className="mt-4 border-t border-line pt-3">
            <button
              type="button"
              onClick={() => void repo.publishPlan(sched.workoutId!, "coach")}
              className={`tap w-full rounded-xl py-3.5 text-sm font-bold uppercase tracking-wider transition active:scale-[0.98] ${
                pub?.state === "draft"
                  ? "bg-laser text-black glow-laser"
                  : "border border-line text-muted hover:border-cyan/40 hover:text-cyan"
              }`}
            >
              {pub?.state === "draft" ? t("pubSend") : t("pubResend")}
            </button>
            <p className="mt-2 text-center text-[0.65rem] leading-snug text-faint">
              {pub?.state === "draft"
                ? pub.hoursLeft != null
                  ? pub.hoursLeft > 0
                    ? t("pubAutoIn").replace("{n}", String(pub.hoursLeft))
                    : t("pubAutoNow")
                  : t("pubHint")
                : pub?.publication
                  ? t("pubSentAt").replace(
                      "{d}",
                      new Date(pub.publication.publishedAt).toLocaleString()
                    )
                  : t("pubAuto")}
            </p>
          </div>
        ) : null}
      </section>

      {/* Weekly hard sets per muscle — the most evidence-backed variable. */}
      <section className="panel p-4">
        <h2 className="eyebrow">{t("coachVolTitle")}</h2>
        <p className="mb-3 mt-1 text-[0.7rem] leading-snug text-faint">
          {t("coachVolSub").replace("{n}", String(EVIDENCE_MIN_SETS))}
        </p>
        <ul className="flex flex-col gap-1.5">
          {(volume ?? []).map((v) => {
            const pct = v.planned ? Math.min(100, (v.done / v.planned) * 100) : 0;
            const when =
              v.daysSinceTrained == null
                ? t("coachVolNever")
                : v.daysSinceTrained === 0
                  ? t("coachVolToday")
                  : t("coachVolDays").replace("{n}", String(v.daysSinceTrained));
            return (
              <li key={v.muscle}>
                <div className="flex items-baseline justify-between gap-2 text-[0.75rem]">
                  <span className="min-w-0 truncate text-ink">{muscleName(v.muscle)}</span>
                  <span className="tnum shrink-0 text-faint">
                    <span className={v.done >= v.planned && v.planned > 0 ? "text-go" : "text-cyan"}>
                      {v.done}
                    </span>
                    /{v.planned} {t("setsUnit")}
                    {v.underEvidence ? (
                      <span className="ml-1.5 text-[0.6rem] text-faint/70">·{EVIDENCE_MIN_SETS}+</span>
                    ) : null}
                    <span className="ml-1.5 text-[0.65rem]">{when}</span>
                  </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-elevated">
                  <div
                    className={`h-full rounded-full ${v.done >= v.planned && v.planned > 0 ? "bg-go" : "bg-cyan"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
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
