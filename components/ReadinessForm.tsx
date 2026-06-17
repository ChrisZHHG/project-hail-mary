"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { repo } from "@/lib/data/repository";
import { useTodayReadiness } from "@/lib/data/hooks";
import {
  READINESS_METRICS,
  scoreReadiness,
  LEVEL_META,
  type ReadinessInput,
} from "@/lib/data/readiness";

const DEFAULTS: ReadinessInput = {
  energy: 3,
  sleep: 3,
  mood: 3,
  soreness: 3,
  stress: 3,
  jointPain: 1,
};

export default function ReadinessForm() {
  const router = useRouter();
  const existing = useTodayReadiness();
  const [values, setValues] = useState<ReadinessInput>(DEFAULTS);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  // Adopt today's saved values once, if present and the user hasn't edited yet.
  const effective = useMemo<ReadinessInput>(() => {
    if (touched || !existing) return values;
    return {
      energy: existing.energy,
      sleep: existing.sleep,
      mood: existing.mood,
      soreness: existing.soreness,
      stress: existing.stress,
      jointPain: existing.jointPain,
    };
  }, [touched, existing, values]);

  const preview = scoreReadiness(effective);
  const meta = LEVEL_META[preview.level];

  const set = (key: keyof ReadinessInput, v: number) => {
    setTouched(true);
    setValues({ ...effective, [key]: v });
  };

  async function save() {
    setSaving(true);
    await repo.saveReadiness(effective);
    router.push("/");
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-2">
        <p className="eyebrow">Systems check</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Readiness</h1>
      </header>

      {/* Live score */}
      <div className={`panel border-l-2 p-4 ${meta.ring}`}>
        <div className="flex items-center justify-between">
          <p className={`text-sm font-bold ${meta.color}`}>{meta.label}</p>
          <div className="tnum text-3xl font-bold text-ink">
            {preview.totalScore}
            <span className="text-base text-faint">/100</span>
          </div>
        </div>
        <p className="mt-2 text-[0.85rem] leading-snug text-muted">{preview.recommendation}</p>
      </div>

      {/* Sliders */}
      <div className="flex flex-col gap-4">
        {READINESS_METRICS.map((m) => {
          const v = effective[m.key];
          return (
            <div key={m.key} className="panel p-4">
              <div className="flex items-center justify-between">
                <label htmlFor={`sl-${m.key}`} className="text-sm font-semibold text-ink">
                  {m.label}
                </label>
                <span className="tnum text-xl font-bold text-laser">{v}</span>
              </div>
              <input
                id={`sl-${m.key}`}
                type="range"
                min={1}
                max={5}
                step={1}
                value={v}
                onChange={(e) => set(m.key, Number(e.target.value))}
                className={`sl mt-3 ${m.invert ? "cyan" : ""}`}
              />
              <div className="mt-1.5 flex justify-between text-[0.65rem] uppercase tracking-wider text-faint">
                <span>{m.low}</span>
                <span>{m.high}</span>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="tap w-full rounded-xl bg-laser py-3.5 text-sm font-bold uppercase tracking-wider text-black transition active:scale-[0.98] disabled:opacity-60 glow-laser"
      >
        {existing ? "Update check-in" : "Save check-in"}
      </button>
    </div>
  );
}
