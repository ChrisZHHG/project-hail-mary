"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/data/db";
import { repo, today } from "@/lib/data/repository";
import { useExerciseInstances, useSessionLogs, useWorkout } from "@/lib/data/hooks";
import { sumVolume } from "@/lib/volume";
import Link from "next/link";
import type { ExerciseInstance, WorkoutSection } from "@/lib/data/types";
import { PRE_WORKOUT_PROTOCOL } from "@/lib/theory";
import { useT, type I18nKey } from "@/lib/i18n";
import ExecutionCard from "./ExecutionCard";
import { fmtDayLong } from "@/lib/dates";
import { useNameLang, useUnit, useVolumeFmt } from "@/lib/prefs";

const SECTION_LABEL: Record<WorkoutSection, I18nKey> = {
  warmup: "warmup",
  main: "work",
  cardio: "cardio",
};
const SECTION_ORDER: WorkoutSection[] = ["warmup", "main", "cardio"];


export default function SessionView({ workoutId }: { workoutId: string }) {
  const t = useT();
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const lang = useNameLang();
  const unit = useUnit();
  const fv = useVolumeFmt();
  const workout = useWorkout(workoutId);
  const instances = useExerciseInstances(workoutId);
  const logs = useSessionLogs(sessionId ?? undefined) ?? [];
  const session = useLiveQuery(
    () => (sessionId ? db.sessions.get(sessionId) : undefined),
    [sessionId]
  );
  const dayLabel = fmtDayLong(session?.date ?? today(), lang);

  // Resume an in-progress session that already has sets; do not create empty shells.
  useEffect(() => {
    let alive = true;
    (async () => {
      await repo.cleanupStaleOpenSessions();
      const existing = await repo.getActiveSession(workoutId);
      if (!alive) return;
      if (existing) {
        const existingLogs = await repo.getSetLogs(existing.id);
        if (existingLogs.some((l) => l.done)) {
          setSessionId(existing.id);
        } else {
          await db.sessions.delete(existing.id);
        }
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [workoutId]);

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId;
    const s = await repo.startSession(workoutId);
    setSessionId(s.id);
    return s.id;
  }, [sessionId, workoutId]);

  const grouped = useMemo(() => {
    const by: Record<WorkoutSection, ExerciseInstance[]> = { warmup: [], main: [], cardio: [] };
    (instances ?? []).forEach((i) => by[i.section].push(i));
    return by;
  }, [instances]);

  const volume = sumVolume(logs);
  const doneSets = logs.filter((l) => l.done).length;
  const targetSets = (instances ?? []).reduce((s, i) => s + i.targetSets, 0);
  const pct = targetSets ? Math.min(100, Math.round((doneSets / targetSets) * 100)) : 0;

  async function finish() {
    if (sessionId) await repo.completeSession(sessionId);
    router.push("/progress");
  }

  if (!workout || !instances || !ready) {
    return <p className="mt-10 text-center text-faint">{t("calibrating")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* sticky session HUD */}
      <div className="sticky top-0 z-30 -mx-4 border-b border-line bg-void/85 px-4 pb-3 pt-2 backdrop-blur-md">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink">{workout.name}</h1>
            <p className="eyebrow mt-0.5">
              {dayLabel}
              {workout.subtitle ? ` · ${workout.subtitle}` : ""}
            </p>
          </div>
          <div className="text-right">
            <div className="tnum text-2xl font-bold text-cyan text-glow-cyan">
              {fv(volume)}
              <span className="ml-1 text-xs font-normal text-faint">{unit}</span>
            </div>
            <p className="eyebrow">{doneSets} {t("setsLogged")}</p>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-elevated">
          <div
            className="h-full rounded-full bg-laser transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {SECTION_ORDER.map((section) =>
        grouped[section].length ? (
          <div key={section} className="flex flex-col gap-3">
            <h2 className="eyebrow px-1">{t(SECTION_LABEL[section])}</h2>
            {section === "warmup" && PRE_WORKOUT_PROTOCOL.length ? (
              <Link
                href={`/method#${PRE_WORKOUT_PROTOCOL[0].id}`}
                className="flex items-center justify-between rounded-xl border border-cyan/25 bg-cyan/[0.04] px-4 py-2.5 transition active:scale-[0.99]"
              >
                <span className="text-[0.78rem] text-muted">
                  <span className="font-semibold text-cyan">{t("shoulderProtocol")}</span> —{" "}
                  {t("doBefore")} · {PRE_WORKOUT_PROTOCOL.length} {t("drills")}
                </span>
                <span className="text-cyan">📖</span>
              </Link>
            ) : null}
            {grouped[section].map((instance) => (
              <ExecutionCard
                key={instance.id}
                instance={instance}
                sessionId={sessionId}
                ensureSession={ensureSession}
              />
            ))}
          </div>
        ) : null
      )}

      <button
        type="button"
        onClick={finish}
        disabled={doneSets === 0}
        className="tap mt-2 w-full rounded-xl border border-cyan/50 bg-cyan/[0.08] py-3.5 text-sm font-bold uppercase tracking-wider text-cyan transition active:scale-[0.98] disabled:opacity-40"
      >
        {t("finishSession")}
      </button>
    </div>
  );
}
