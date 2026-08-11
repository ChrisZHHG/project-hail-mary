"use client";

import { useMemo, useState } from "react";
import { repo } from "@/lib/data/repository";
import {
  useSessionInstanceLogs,
  useLastEntry,
  useLastSessionSetsForExercise,
  useWeeklyReadiness,
  usePlanOverrides,
} from "@/lib/data/hooks";
import { applyOverride, prescribe, topSet } from "@/lib/coach";
import CoachTip from "./CoachTip";
import { BRAND } from "@/lib/brand";
import Link from "next/link";
import { theoryForExercise } from "@/lib/theory";
import { exerciseNames, useNameLang, useWeightFmt } from "@/lib/prefs";
import { useT, useMuscleName, useCardioSpecLabel } from "@/lib/i18n";
import type { ExerciseInstance } from "@/lib/data/types";
import Stepper from "./Stepper";
import WeightControl from "./WeightControl";
import RirSelector from "./RirSelector";
import Cue from "./Cue";
import GearChips from "./GearChips";

type Draft = { weight?: number; reps?: number; rir?: number };

const firstNum = (s?: string) => {
  const m = s?.match(/\d+/);
  return m ? Number(m[0]) : undefined;
};

function methodTagKey(name: string, category: string): "methodIsometric" | "methodMobility" | "methodStretch" | null {
  const n = name.toLowerCase();
  if (n.includes("isometric") || n.includes("burst")) return "methodIsometric";
  if (n.includes("cars") || category === "mobility") return "methodMobility";
  if (n.includes("calf") || n.includes("toe press")) return "methodStretch";
  return null;
}

export default function ExecutionCard({
  instance,
  sessionId,
  ensureSession,
}: {
  instance: ExerciseInstance;
  sessionId: string | null;
  /** Creates/resumes the session on first log so browsing alone leaves no open shell. */
  ensureSession: () => Promise<string>;
}) {
  const { exercise } = instance;
  const isCardio = exercise.category === "cardio";
  const showWeight = exercise.isWeighted;
  const repsNumeric = /^\d+(-\d+)?$/.test(instance.targetRepsRange);
  const showReps = !isCardio && repsNumeric;
  const showRir = !!instance.targetRir;
  const tagKey = methodTagKey(exercise.name, exercise.category);
  const relatedTheory = theoryForExercise(exercise.id, exercise.targetMuscle);
  const lang = useNameLang();
  const t = useT();
  const muscleName = useMuscleName();
  const cardioSpecLabel = useCardioSpecLabel();
  const names = exerciseNames(exercise, lang);
  const fw = useWeightFmt();
  const mTag = tagKey ? t(tagKey) : null;
  const sessionLogs = useSessionInstanceLogs(sessionId, instance.id);
  // Stable identity: a fresh `?? []` each render would re-run every memo below.
  const logs = useMemo(() => sessionLogs ?? [], [sessionLogs]);

  // Previous *session* entry for the "last time" hint + cold prefill.
  const lastEntry = useLastEntry(instance.id, sessionId ?? undefined);

  // The coach engine's call for this movement. It benchmarks the previous
  // session's *top* set — a fatigued back-off set would read as a regression
  // and walk the load down every week.
  const lastSets = useLastSessionSetsForExercise(exercise.id, sessionId ?? undefined);
  const weekly = useWeeklyReadiness();
  // The coach's edit reaches the client here — an override the client never
  // sees while training is an override that didn't happen.
  const overrides = usePlanOverrides();
  const rx = useMemo(
    () =>
      applyOverride(
        prescribe({
          targetSets: instance.targetSets,
          targetRepsRange: instance.targetRepsRange,
          targetRir: instance.targetRir,
          last: topSet(lastSets ?? []),
          isWeighted: exercise.isWeighted,
          readiness: weekly?.level,
          soreness: weekly?.soreMap?.[exercise.targetMuscle],
          step: BRAND.weightStep,
        }),
        overrides?.find((o) => o.workoutExerciseId === instance.id),
        logs
      ),
    [instance, lastSets, exercise, weekly, overrides, logs]
  );

  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [editing, setEditing] = useState<Set<number>>(new Set());
  const [extra, setExtra] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);

  const logByNum = new Map(logs.map((l) => [l.setNumber, l]));
  const maxLogged = logs.reduce((m, l) => Math.max(m, l.setNumber), 0);
  const rowCount = Math.max(instance.targetSets, maxLogged) + extra;
  const doneCount = logs.filter((l) => l.done).length;

  const lowRep = firstNum(instance.targetRepsRange);
  const targetRir = firstNum(instance.targetRir);

  const setDraft = (n: number, patch: Draft) =>
    setDrafts((d) => ({ ...d, [n]: { ...d[n], ...patch } }));

  async function logSet(n: number) {
    const sid = await ensureSession();
    // most recent done set in THIS session feeds the next set's prefill
    const sessionSource = logs.filter((l) => l.done).sort((a, b) => b.setNumber - a.setNumber)[0];
    const d = drafts[n] ?? {};
    const existing = logByNum.get(n);
    // The opening set follows the engine; later sets follow what was just done,
    // so a back-off set tracks today's top set rather than the plan.
    const weight = showWeight
      ? (d.weight ?? sessionSource?.weight ?? rx.weight ?? lastEntry?.weight ?? 50)
      : undefined;
    const reps = showReps ? (d.reps ?? sessionSource?.reps ?? rx.reps ?? lowRep) : undefined;
    const rir = showRir ? (d.rir ?? sessionSource?.rir ?? lastEntry?.rir ?? targetRir) : undefined;
    await repo.upsertSet({
      id: existing?.id,
      sessionId: sid,
      workoutExerciseId: instance.id,
      setNumber: n,
      weight,
      reps,
      rir,
      done: true,
    });
    setEditing((e) => {
      const next = new Set(e);
      next.delete(n);
      return next;
    });
    setFlash(n);
    setTimeout(() => setFlash((f) => (f === n ? null : f)), 700);
  }

  function reopen(n: number) {
    const l = logByNum.get(n);
    if (l) setDraft(n, { weight: l.weight, reps: l.reps, rir: l.rir });
    setEditing((e) => new Set(e).add(n));
  }

  const sessionSource = logs.filter((l) => l.done).sort((a, b) => b.setNumber - a.setNumber)[0];
  const prefillSrc = sessionSource ?? lastEntry;
  // Placeholders show the engine's numbers until a set lands this session.
  const phWeight = sessionSource?.weight ?? rx.weight ?? lastEntry?.weight ?? 50;
  const phReps = sessionSource?.reps ?? rx.reps ?? lowRep;

  return (
    <section className="panel p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold leading-tight text-ink">{names.primary}</h3>
            {instance.optional ? (
              <span className="rounded border border-line px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wider text-faint">
                {t("optional")}
              </span>
            ) : null}
            {mTag ? (
              <span className="rounded border border-cyan/40 px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider text-cyan">
                {mTag}
              </span>
            ) : null}
            {relatedTheory.length ? (
              <Link
                href={`/method#${relatedTheory[0].id}`}
                aria-label={`Theory: ${relatedTheory[0].title}`}
                className="rounded border border-line px-1.5 py-0.5 text-[0.6rem] text-faint transition hover:border-cyan/40 hover:text-cyan"
              >
                📖{relatedTheory.length > 1 ? ` ${relatedTheory.length}` : ""}
              </Link>
            ) : null}
          </div>
          <p className="eyebrow mt-1">
            {muscleName(exercise.targetMuscle)}
            {" · "}
            {instance.targetSets} × {instance.targetRepsRange}
            {instance.cardioSpec ? ` · ${cardioSpecLabel(instance.cardioSpec)}` : ""}
          </p>
        </div>
        <div className="tnum shrink-0 text-right text-sm text-faint">
          {doneCount}/{Math.max(instance.targetSets, maxLogged)}
        </div>
      </header>

      {lastEntry && (showWeight || showReps) ? (
        <p className="tnum mt-2 text-[0.75rem] text-laser-soft">
          {t("last")}:{" "}
          {lastEntry.weight != null ? `${fw(lastEntry.weight)} × ` : ""}
          {lastEntry.reps ?? "—"}
          {lastEntry.rir != null ? ` @${lastEntry.rir} ${t("rir")}` : ""}
        </p>
      ) : null}

      <Cue note={exercise.biomechanicNotes} link={exercise.link} />
      {showWeight || showReps ? <CoachTip rx={rx} /> : null}
      <GearChips exerciseId={exercise.id} pattern={exercise.pattern} />

      <div className="mt-3 flex flex-col gap-2">
        {Array.from({ length: rowCount }, (_, i) => i + 1).map((n) => {
          const log = logByNum.get(n);
          const isEditing = editing.has(n);
          const isDone = !!log?.done && !isEditing;
          const draft = drafts[n] ?? {};

          if (isDone) {
            return (
              <button
                key={n}
                type="button"
                onClick={() => reopen(n)}
                className={`flex items-center justify-between rounded-xl border border-go/40 bg-go/[0.06] px-3 py-2.5 text-left transition ${
                  flash === n ? "animate-logged" : ""
                }`}
              >
                <span className="eyebrow text-faint">{t("set")} {n}{t("setUnit")}</span>
                <span className="tnum text-sm font-semibold text-ink">
                  {log?.weight != null ? `${fw(log.weight)} × ` : ""}
                  {log?.reps ?? (isCardio ? t("doneShort") : "—")}
                  {log?.rir != null ? (
                    <span className="text-faint"> @{log.rir} {t("rir")}</span>
                  ) : null}
                </span>
                <span className="text-go">✓</span>
              </button>
            );
          }

          // Editable row
          return (
            <div key={n} className="rounded-xl border border-line bg-abyss/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="eyebrow">{t("set")} {n}{t("setUnit")}</span>
                {n > instance.targetSets ? (
                  <button
                    type="button"
                    onClick={() => {
                      void repo.deleteSet(log?.id ?? "");
                      setExtra((x) => Math.max(0, x - 1));
                    }}
                    className="text-[0.7rem] text-faint hover:text-danger"
                  >
                    {t("remove")}
                  </button>
                ) : null}
              </div>

              {showWeight ? (
                <WeightControl
                  label={t("weight")}
                  value={draft.weight}
                  placeholder={phWeight}
                  onChange={(v) => setDraft(n, { weight: v })}
                  step={BRAND.weightStep}
                />
              ) : null}
              {showReps ? (
                <div className={`flex justify-center ${showWeight ? "mt-3" : ""}`}>
                  <Stepper
                    label={t("reps")}
                    value={draft.reps}
                    placeholder={phReps}
                    onChange={(v) => setDraft(n, { reps: v })}
                    step={1}
                    accent="cyan"
                  />
                </div>
              ) : null}

              {showRir ? (
                <div className="mt-3 flex justify-center">
                  <RirSelector
                    value={draft.rir ?? prefillSrc?.rir ?? targetRir}
                    target={instance.targetRir}
                    onChange={(v) => setDraft(n, { rir: v })}
                  />
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => logSet(n)}
                className="tap mt-3 w-full rounded-xl bg-laser py-3 text-sm font-bold uppercase tracking-wider text-black transition active:scale-[0.98] glow-laser"
              >
                {isCardio || (!showWeight && !showReps) ? t("markDone") : t("logSet")}
              </button>
            </div>
          );
        })}

        {!isCardio ? (
          <button
            type="button"
            onClick={() => setExtra((x) => x + 1)}
            className="rounded-xl border border-dashed border-line py-2 text-[0.75rem] uppercase tracking-wider text-faint transition hover:border-cyan/40 hover:text-cyan"
          >
            {t("addSet")}
          </button>
        ) : null}
      </div>
    </section>
  );
}
