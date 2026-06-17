"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { repo } from "@/lib/data/repository";
import { useExerciseInstances, useSessionLogs, useWorkout } from "@/lib/data/hooks";
import { sumVolume, fmtVolume } from "@/lib/volume";
import { BRAND } from "@/lib/brand";
import type { ExerciseInstance, WorkoutSection } from "@/lib/data/types";
import ExecutionCard from "./ExecutionCard";

const SECTION_LABEL: Record<WorkoutSection, string> = {
  warmup: "Warm-up / Mobility",
  main: "Work",
  cardio: "Cardio",
};
const SECTION_ORDER: WorkoutSection[] = ["warmup", "main", "cardio"];

export default function SessionView({ workoutId }: { workoutId: string }) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const workout = useWorkout(workoutId);
  const instances = useExerciseInstances(workoutId);
  const logs = useSessionLogs(sessionId ?? undefined) ?? [];

  useEffect(() => {
    let alive = true;
    repo.startSession(workoutId).then((s) => alive && setSessionId(s.id));
    return () => {
      alive = false;
    };
  }, [workoutId]);

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

  if (!workout || !instances || !sessionId) {
    return <p className="mt-10 text-center text-faint">Spinning up the reel…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* sticky session HUD */}
      <div className="sticky top-0 z-30 -mx-4 border-b border-line bg-void/85 px-4 pb-3 pt-2 backdrop-blur-md">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink">{workout.name}</h1>
            <p className="eyebrow mt-0.5">{workout.subtitle}</p>
          </div>
          <div className="text-right">
            <div className="tnum text-2xl font-bold text-cyan text-glow-cyan">
              {fmtVolume(volume)}
              <span className="ml-1 text-xs font-normal text-faint">{BRAND.unit}</span>
            </div>
            <p className="eyebrow">{doneSets} sets logged</p>
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
            <h2 className="eyebrow px-1">{SECTION_LABEL[section]}</h2>
            {grouped[section].map((instance) => (
              <ExecutionCard key={instance.id} instance={instance} sessionId={sessionId} />
            ))}
          </div>
        ) : null
      )}

      <button
        type="button"
        onClick={finish}
        className="tap mt-2 w-full rounded-xl border border-cyan/50 bg-cyan/[0.08] py-3.5 text-sm font-bold uppercase tracking-wider text-cyan transition active:scale-[0.98]"
      >
        Finish session →
      </button>
    </div>
  );
}
