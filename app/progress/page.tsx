"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/data/db";
import { sumVolume, setVolume, fmtVolume } from "@/lib/volume";
import { BRAND } from "@/lib/brand";
import VolumeTrend from "@/components/VolumeTrend";
import MuscleLoad from "@/components/MuscleLoad";

const shortDate = (d: string) => d.slice(5).replace("-", "/");

export default function ProgressPage() {
  const sessions = useLiveQuery(
    () =>
      db.sessions
        .filter((s) => s.completedAt != null)
        .toArray()
        .then((r) => r.sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0))),
    []
  );
  const logs = useLiveQuery(() => db.setLogs.toArray(), []);
  const wexs = useLiveQuery(() => db.workoutExercises.toArray(), []);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);

  if (!sessions || !logs || !wexs || !exercises) {
    return <p className="mt-10 text-center text-faint">Loading…</p>;
  }

  const points = sessions.map((s) => ({
    label: shortDate(s.date),
    value: sumVolume(logs.filter((l) => l.sessionId === s.id)),
  }));
  const total = sumVolume(logs);
  const best = points.reduce((m, p) => Math.max(m, p.value), 0);

  const exById = new Map(exercises.map((e) => [e.id, e]));
  const weToMuscle = new Map<string, string>();
  wexs.forEach((we) => {
    const ex = exById.get(we.exerciseId);
    if (ex) weToMuscle.set(we.id, ex.targetMuscle);
  });
  const muscleTotals = new Map<string, number>();
  logs.forEach((l) => {
    const v = setVolume(l);
    if (v > 0) {
      const m = weToMuscle.get(l.workoutExerciseId) ?? "Other";
      muscleTotals.set(m, (muscleTotals.get(m) ?? 0) + v);
    }
  });
  const muscleData = [...muscleTotals.entries()]
    .map(([muscle, volume]) => ({ muscle, volume }))
    .sort((a, b) => b.volume - a.volume);

  if (sessions.length === 0) {
    return (
      <div className="mt-16 flex flex-col items-center gap-4 text-center">
        <p className="text-faint">No completed sessions yet.</p>
        <Link
          href="/train"
          className="rounded-xl bg-laser px-5 py-3 text-sm font-bold uppercase tracking-wider text-black glow-laser"
        >
          Start training
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-2">
        <p className="eyebrow">Telemetry</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Progress</h1>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Total" value={`${fmtVolume(total)}`} unit={BRAND.unit} />
        <Stat label="Sessions" value={String(sessions.length)} />
        <Stat label="Best" value={`${fmtVolume(best)}`} unit={BRAND.unit} />
      </div>

      <section className="panel p-4">
        <h2 className="eyebrow mb-3">Volume per session</h2>
        <VolumeTrend points={points} />
      </section>

      <section className="panel p-4">
        <h2 className="eyebrow mb-3">Muscle load — all time</h2>
        <MuscleLoad data={muscleData} />
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
