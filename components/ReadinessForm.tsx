"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { repo } from "@/lib/data/repository";
import { useWeeklyReadiness } from "@/lib/data/hooks";
import {
  READINESS_METRICS,
  SORE_AREAS,
  scoreReadiness,
  LEVEL_META,
  REC_ZH,
  REC_ZH_JOINT,
  type ReadinessExtras,
  type ReadinessInput,
} from "@/lib/data/readiness";
import { useT, useMuscleName } from "@/lib/i18n";
import { useNameLang } from "@/lib/prefs";

const DEFAULTS: ReadinessInput = {
  energy: 3,
  sleep: 3,
  mood: 3,
  soreness: 3,
  stress: 3,
  jointPain: 1,
};

const EXTRA_DEFAULTS: ReadinessExtras = {
  soreMap: {},
  noteToCoach: "",
  sleepHours: undefined,
  proteinTaken: undefined,
};

export default function ReadinessForm() {
  const t = useT();
  const lang = useNameLang();
  const muscleName = useMuscleName();
  const router = useRouter();
  const existing = useWeeklyReadiness();
  const [values, setValues] = useState<ReadinessInput>(DEFAULTS);
  const [extras, setExtras] = useState<ReadinessExtras>(EXTRA_DEFAULTS);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  // Adopt this week's saved values once, if present and the user hasn't edited yet.
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

  const effectiveExtras = useMemo<ReadinessExtras>(() => {
    if (touched || !existing) return extras;
    return {
      soreMap: existing.soreMap ?? {},
      noteToCoach: existing.noteToCoach ?? "",
      sleepHours: existing.sleepHours,
      proteinTaken: existing.proteinTaken,
    };
  }, [touched, existing, extras]);

  const preview = scoreReadiness(effective);
  const meta = LEVEL_META[preview.level];
  const soreMap = effectiveExtras.soreMap ?? {};

  const set = (key: keyof ReadinessInput, v: number) => {
    setTouched(true);
    setValues({ ...effective, [key]: v });
    setExtras(effectiveExtras);
  };

  const setExtra = <K extends keyof ReadinessExtras>(key: K, v: ReadinessExtras[K]) => {
    setTouched(true);
    setValues(effective);
    setExtras({ ...effectiveExtras, [key]: v });
  };

  const toggleArea = (area: string) => {
    const next = { ...soreMap };
    if (area in next) delete next[area];
    else next[area] = 3; // sensible starting intensity
    setExtra("soreMap", next);
  };

  async function save() {
    setSaving(true);
    await repo.saveReadiness({
      ...effective,
      ...effectiveExtras,
      noteToCoach: effectiveExtras.noteToCoach?.trim() || undefined,
    });
    router.push("/");
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-2">
        <p className="eyebrow">{t("weeklySystems")}</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">{t("howWasWeek")}</h1>
        <p className="mt-2 text-[0.85rem] leading-snug text-muted">{t("readinessDone")}</p>
      </header>

      {/* Live score */}
      <div className={`panel border-l-2 p-4 ${meta.ring}`}>
        <div className="flex items-center justify-between">
          <p className={`text-sm font-bold ${meta.color}`}>
            {lang === "zh" ? meta.labelZh : meta.label}
          </p>
          <div className="tnum text-3xl font-bold text-ink">
            {preview.totalScore}
            <span className="text-base text-faint">/100</span>
          </div>
        </div>
        <p className="mt-2 text-[0.85rem] leading-snug text-muted">
          {lang === "zh"
            ? effective.jointPain > 3
              ? REC_ZH_JOINT
              : REC_ZH[preview.level]
            : preview.recommendation}
        </p>
      </div>

      {/* Sliders */}
      <div className="flex flex-col gap-4">
        {READINESS_METRICS.map((m) => {
          const v = effective[m.key];
          return (
            <div key={m.key} className="panel p-4">
              <div className="flex items-center justify-between">
                <label htmlFor={`sl-${m.key}`} className="text-sm font-semibold text-ink">
                  {lang === "zh" ? m.labelZh : m.label}
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
                <span>{lang === "zh" ? m.lowZh : m.low}</span>
                <span>{lang === "zh" ? m.highZh : m.high}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Where are you sore? — the way the coach actually asks */}
      <section className="panel p-4">
        <p className="text-sm font-semibold text-ink">{t("whereSore")}</p>
        <p className="mt-0.5 text-[0.75rem] text-muted">{t("tapArea")}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SORE_AREAS.map((area) => {
            const on = area in soreMap;
            return (
              <button
                key={area}
                type="button"
                onClick={() => toggleArea(area)}
                className={`tap rounded-full border px-3 py-1.5 text-[0.7rem] font-semibold tracking-wide transition ${
                  on
                    ? "border-laser bg-laser/15 text-laser"
                    : "border-line text-muted hover:border-cyan/50"
                }`}
              >
                {muscleName(area)}
                {on ? <span className="tnum ml-1.5">{soreMap[area]}</span> : null}
              </button>
            );
          })}
        </div>
        {Object.keys(soreMap).length > 0 ? (
          <div className="mt-4 flex flex-col gap-3 border-t border-line pt-3">
            {Object.entries(soreMap).map(([area, intensity]) => (
              <div key={area}>
                <div className="flex items-center justify-between">
                  <span className="text-[0.8rem] font-medium text-ink">{muscleName(area)}</span>
                  <span className="tnum text-base font-bold text-laser">{intensity}/10</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={intensity}
                  onChange={(e) =>
                    setExtra("soreMap", { ...soreMap, [area]: Number(e.target.value) })
                  }
                  className="sl cyan mt-1.5"
                  aria-label={`${area} soreness 0 to 10`}
                />
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Recovery details */}
      <section className="panel flex flex-col gap-4 p-4">
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="sleep-hours" className="text-sm font-semibold text-ink">
              {t("avgSleep")}
            </label>
            <span className="tnum text-xl font-bold text-laser">
              {effectiveExtras.sleepHours != null ? `${effectiveExtras.sleepHours}h` : "—"}
            </span>
          </div>
          <input
            id="sleep-hours"
            type="range"
            min={4}
            max={10}
            step={0.5}
            value={effectiveExtras.sleepHours ?? 7.5}
            onChange={(e) => setExtra("sleepHours", Number(e.target.value))}
            className="sl mt-2"
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">{t("hitProtein")}</p>
          <div className="flex gap-1.5">
            {([true, false] as const).map((val) => {
              const on = effectiveExtras.proteinTaken === val;
              return (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => setExtra("proteinTaken", on ? undefined : val)}
                  className={`tap rounded-full border px-3.5 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider transition ${
                    on
                      ? val
                        ? "border-go bg-go/15 text-go"
                        : "border-warn bg-warn/15 text-warn"
                      : "border-line text-muted"
                  }`}
                >
                  {val ? t("yes") : t("notQuite")}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Note to coach */}
      <section className="panel p-4">
        <label htmlFor="coach-note" className="text-sm font-semibold text-ink">
          {t("coachNote")}
        </label>
        <textarea
          id="coach-note"
          value={effectiveExtras.noteToCoach ?? ""}
          onChange={(e) => setExtra("noteToCoach", e.target.value)}
          placeholder={t("notePlaceholder")}
          rows={3}
          className="mt-2 w-full resize-none rounded-xl border border-line bg-elevated px-3 py-2.5 text-[0.9rem] text-ink placeholder:text-faint focus:border-cyan focus:outline-none"
        />
      </section>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="tap w-full rounded-xl bg-laser py-3.5 text-sm font-bold uppercase tracking-wider text-black transition active:scale-[0.98] disabled:opacity-60 glow-laser"
      >
        {existing ? t("updateWeek") : t("saveCheckin")}
      </button>
    </div>
  );
}
