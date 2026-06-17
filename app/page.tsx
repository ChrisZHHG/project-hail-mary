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
import { LEVEL_META } from "@/lib/data/readiness";
import { PRINCIPLES } from "@/lib/principles";
import { sumVolume, fmtVolume } from "@/lib/volume";
import { BRAND } from "@/lib/brand";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fmtDay = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return `${WEEKDAY[d.getDay()]} · ${iso.slice(5).replace("-", "/")}`;
};

export default function Home() {
  const workouts = useWorkouts();
  const weekly = useWeeklyReadiness();
  const completed = useCompletedSessions();
  const allLogs = useAllSetLogs();
  // Compute after mount to avoid a build-time vs client hydration mismatch.
  const [weekend, setWeekend] = useState(false);
  useEffect(() => setWeekend(isWeekend()), []);

  const lastSession = completed?.[0];
  const lastVolume =
    lastSession && allLogs ? sumVolume(allLogs.filter((l) => l.sessionId === lastSession.id)) : 0;

  const nextWorkout = useMemo(() => {
    if (!workouts?.length) return undefined;
    if (!lastSession) return workouts[0];
    const lastWo = workouts.find((w) => w.id === lastSession.workoutId);
    const nextOrder = lastWo ? (lastWo.dayOrder + 1) % workouts.length : 0;
    return workouts.find((w) => w.dayOrder === nextOrder) ?? workouts[0];
  }, [workouts, lastSession]);

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
              <p className="eyebrow">This week</p>
              <p className={`mt-1 text-sm font-semibold ${LEVEL_META[weekly.level].color}`}>
                {LEVEL_META[weekly.level].label}
              </p>
            </div>
            <div className="tnum text-3xl font-bold text-ink">
              {weekly.totalScore}
              <span className="text-base text-faint">/100</span>
            </div>
          </div>
          <p className="mt-2 text-[0.85rem] leading-snug text-muted">{weekly.recommendation}</p>
          <p className="eyebrow mt-2 text-cyan">Tap to update →</p>
        </Link>
      ) : (
        <Link
          href="/readiness"
          className={`panel flex items-center justify-between p-4 transition active:scale-[0.99] ${
            weekend ? "border-laser/40 glow-laser" : ""
          }`}
        >
          <div>
            <p className="eyebrow">{weekend ? "Weekend check-in" : "Weekly check-in"}</p>
            <p className="mt-1 text-base font-semibold text-ink">How was your week?</p>
            <p className="mt-0.5 text-[0.8rem] text-muted">
              {weekend
                ? "Tunes next week's volume — your coach adjusts from this."
                : "Due on the weekend. Sets next week's plan."}
            </p>
          </div>
          <span className="text-2xl text-laser">→</span>
        </Link>
      )}

      {/* Primary start */}
      {nextWorkout ? (
        <Link
          href={`/session/${nextWorkout.id}`}
          className="relative overflow-hidden rounded-card border border-laser/40 bg-laser/[0.08] p-5 transition active:scale-[0.99] glow-laser"
        >
          <p className="eyebrow text-laser-soft">Up next</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">{nextWorkout.name}</h2>
          <p className="mt-0.5 text-sm text-muted">{nextWorkout.subtitle}</p>
          <span className="mt-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-laser">
            Start training →
          </span>
        </Link>
      ) : (
        <p className="text-faint">Loading your program…</p>
      )}

      <Link href="/train" className="text-center text-[0.8rem] uppercase tracking-wider text-faint hover:text-cyan">
        Choose another day
      </Link>

      {/* Method teaser */}
      <Link href="/method" className="panel block p-4 transition active:scale-[0.99]">
        <div className="flex items-center justify-between">
          <p className="eyebrow">The Method</p>
          <span className="text-cyan">→</span>
        </div>
        <p className="mt-1 text-[0.85rem] text-muted">Why every set is built the way it is.</p>
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
            <p className="eyebrow">Last session</p>
            <p className="mt-1 text-sm text-muted">{fmtDay(lastSession.date)}</p>
          </div>
          <div className="text-right">
            <div className="tnum text-xl font-bold text-cyan">
              {fmtVolume(lastVolume)} <span className="text-xs font-normal text-faint">{BRAND.unit}</span>
            </div>
            <p className="eyebrow text-cyan">View progress →</p>
          </div>
        </Link>
      ) : null}
    </div>
  );
}
