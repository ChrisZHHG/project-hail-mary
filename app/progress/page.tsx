"use client";

import Link from "next/link";
import {
  useCompletedSessions,
  useAllSetLogs,
  useWorkoutExercises,
  useExercises,
  useWorkouts,
} from "@/lib/data/hooks";
import { setVolume, sessionTonnageLbs } from "@/lib/volume";
import VolumeTrend, { type TrendPoint } from "@/components/VolumeTrend";
import MuscleLoad from "@/components/MuscleLoad";
import BodyHeatmap from "@/components/BodyHeatmap";
import LoadGauge from "@/components/LoadGauge";
import WeeklyBars from "@/components/WeeklyBars";
import { WEEKDAY_SHORT, WEEKDAY_ZH } from "@/lib/dates";
import { useNameLang, useUnit, useVolumeFmt } from "@/lib/prefs";
import { useT } from "@/lib/i18n";

const shortDate = (d: string) => d.slice(5).replace("-", "/");
const dayLabel = (d: string, lang: "zh" | "en") => {
  const wd = (lang === "zh" ? WEEKDAY_ZH : WEEKDAY_SHORT)[new Date(`${d}T00:00:00`).getDay()];
  return `${wd} · ${shortDate(d)}`;
};
const fmtDur = (sec?: number) => {
  if (!sec) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
};

export default function ProgressPage() {
  const lang = useNameLang();
  const unit = useUnit();
  const fv = useVolumeFmt();
  const t = useT();
  const sessions = useCompletedSessions();
  const logs = useAllSetLogs();
  const wexs = useWorkoutExercises();
  const exercises = useExercises();
  const workouts = useWorkouts();

  if (!sessions || !logs || !wexs || !exercises || !workouts) {
    return <p className="mt-10 text-center text-faint">{t("loading")}</p>;
  }

  // Tonnage per session — in-app set logs, or the watch-reported volume (kg→lbs).
  // Sessions with no volume at all (most cardio + watch strength rows without a
  // volume field) don't get a point: a zero would read as a crashed session.
  // Hook returns newest-first; the trend wants chronological (oldest → newest).
  const chrono = [...sessions].reverse();
  const strength = chrono.filter((s) => s.kind !== "cardio");
  const points: TrendPoint[] = strength
    .map((s) => ({
      label: shortDate(s.date),
      value: sessionTonnageLbs(s, logs.filter((l) => l.sessionId === s.id)),
      imported: s.source === "watch",
    }))
    .filter((p) => p.value > 0);
  const total = points.reduce((sum, p) => sum + p.value, 0);
  const best = points.reduce((m, p) => Math.max(m, p.value), 0);

  const exById = new Map(exercises.map((e) => [e.id, e]));
  const woById = new Map(workouts.map((w) => [w.id, w]));
  const weToMuscle = new Map<string, string>();
  wexs.forEach((we) => {
    const ex = exById.get(we.exerciseId);
    if (ex) weToMuscle.set(we.id, ex.targetMuscle);
  });
  const muscleTotals = new Map<string, number>();
  logs.forEach((l) => {
    const v = setVolume(l);
    if (v > 0) {
      const m =
        (l.workoutExerciseId && weToMuscle.get(l.workoutExerciseId)) ||
        (l.exerciseId && exById.get(l.exerciseId)?.targetMuscle) ||
        "Other";
      muscleTotals.set(m, (muscleTotals.get(m) ?? 0) + v);
    }
  });
  const muscleData = [...muscleTotals.entries()]
    .map(([muscle, volume]) => ({ muscle, volume }))
    .sort((a, b) => b.volume - a.volume);

  if (sessions.length === 0) {
    return (
      <div className="mt-16 flex flex-col items-center gap-4 text-center">
        <p className="text-faint">{t("noCompleted")}</p>
        <Link
          href="/train"
          className="rounded-xl bg-laser px-5 py-3 text-sm font-bold uppercase tracking-wider text-black glow-laser"
        >
          {t("startTrainingCta")}
        </Link>
      </div>
    );
  }

  // Show the full history (newest first) — already the hook's order.
  const recent = sessions;

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-2">
        <p className="eyebrow">{t("telemetry")}</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">{t("progressTitle")}</h1>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <Stat label={t("sessionsStat")} value={String(sessions.length)} unit={`${strength.length} ${t("strengthCount")}`} />
        <Stat label={t("trackedVol")} value={`${fv(total)}`} unit={unit} />
        <Stat label={t("bestSession")} value={`${fv(best)}`} unit={unit} />
      </div>

      <section className="panel p-4">
        <h2 className="eyebrow mb-3">{t("volumePerSession")}</h2>
        <VolumeTrend points={points} />
      </section>

      <WeeklyBars sessions={sessions} logs={logs} />

      <LoadGauge sessions={sessions} />

      <section className="panel p-4">
        <h2 className="eyebrow mb-3">{t("muscleLoadAllTime")}</h2>
        <BodyHeatmap data={muscleData} />
        <div className="mt-4 border-t border-line pt-4">
          <MuscleLoad data={muscleData} />
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="eyebrow mb-3">{t("historyTitle")}</h2>
        <ul className="flex flex-col divide-y divide-line">
          {recent.map((s) => {
            const sessionLogs = logs.filter((l) => l.sessionId === s.id);
            const vol = sessionTonnageLbs(s, sessionLogs);
            // "~" = tonnage comes from reconstructed sets, not a measured value
            const approx = !s.importedVolumeLbs && sessionLogs.some((l) => l.estimated);
            const name =
              (s.workoutId && woById.get(s.workoutId)?.name) ||
              (s.kind === "cardio" ? t("cardioLabel") : t("strengthLabel"));
            return (
              <li key={s.id}>
                <Link
                  href={`/history?s=${s.id}`}
                  className="flex items-baseline justify-between gap-2 py-2 text-sm transition active:opacity-70"
                >
                <div className="min-w-0">
                  <span className="text-ink">{name}</span>
                  {s.source === "watch" ? (
                    <span className="ml-1.5 rounded border border-line px-1 text-[0.55rem] uppercase tracking-wider text-faint">
                      watch
                    </span>
                  ) : null}
                  <p className="tnum text-[0.65rem] text-faint">
                    {dayLabel(s.date, lang)}
                    {s.clockTime ? ` · ${s.clockTime}` : ""}
                    {fmtDur(s.durationSec) ? ` · ${fmtDur(s.durationSec)}` : ""}
                  </p>
                </div>
                <div className="tnum shrink-0 text-right text-[0.7rem]">
                  {vol > 0 ? (
                    <p className="text-cyan">
                      {approx ? "~" : ""}{fv(vol)} {unit}
                    </p>
                  ) : null}
                  {s.kcal ? <p className="text-faint">{s.kcal} kcal</p> : null}
                  {s.avgHr ? <p className="text-faint">{s.avgHr} bpm</p> : null}
                </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="panel flex flex-col items-center justify-center p-3 text-center">
      <span className="tnum text-2xl font-bold text-cyan">{value}</span>
      {unit ? <span className="text-[0.6rem] text-faint">{unit}</span> : null}
      <span className="eyebrow mt-1">{label}</span>
    </div>
  );
}
