"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useWorkouts, useTodayReadiness, useCompletedSessions, useAllSetLogs } from "@/lib/data/hooks";
import { LEVEL_META } from "@/lib/data/readiness";
import { sumVolume, fmtVolume } from "@/lib/volume";
import { BRAND } from "@/lib/brand";

export default function Home() {
  const workouts = useWorkouts();
  const readiness = useTodayReadiness();
  const completed = useCompletedSessions();
  const allLogs = useAllSetLogs();

  const lastSession = completed?.[0];
  const lastVolume =
    lastSession && allLogs
      ? sumVolume(allLogs.filter((l) => l.sessionId === lastSession.id))
      : 0;

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

      {/* Readiness */}
      {readiness ? (
        <Link href="/readiness" className={`panel block border-l-2 p-4 ${LEVEL_META[readiness.level].ring}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Readiness · today</p>
              <p className={`mt-1 text-sm font-semibold ${LEVEL_META[readiness.level].color}`}>
                {LEVEL_META[readiness.level].label}
              </p>
            </div>
            <div className="tnum text-3xl font-bold text-ink">
              {readiness.totalScore}
              <span className="text-base text-faint">/100</span>
            </div>
          </div>
          <p className="mt-2 text-[0.85rem] leading-snug text-muted">{readiness.recommendation}</p>
          <p className="eyebrow mt-2 text-cyan">Tap to update →</p>
        </Link>
      ) : (
        <Link
          href="/readiness"
          className="panel flex items-center justify-between p-4 transition active:scale-[0.99]"
        >
          <div>
            <p className="eyebrow">First thing</p>
            <p className="mt-1 text-base font-semibold text-ink">How are you feeling today?</p>
            <p className="mt-0.5 text-[0.8rem] text-muted">
              60-second check-in tunes today&apos;s volume.
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

      {/* Recent */}
      {lastSession ? (
        <Link href="/progress" className="panel flex items-center justify-between p-4">
          <div>
            <p className="eyebrow">Last session</p>
            <p className="mt-1 text-sm text-muted">{lastSession.date}</p>
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
