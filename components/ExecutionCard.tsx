"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/data/db";
import { repo } from "@/lib/data/repository";
import { BRAND } from "@/lib/brand";
import Link from "next/link";
import { methodTag, theoryForExercise } from "@/lib/theory";
import { exerciseNames, useNameLang, useWeightFmt } from "@/lib/prefs";
import { useT, useMuscleName } from "@/lib/i18n";
import type { ExerciseInstance, SetLog } from "@/lib/data/types";
import Stepper from "./Stepper";
import WeightControl from "./WeightControl";
import RirSelector from "./RirSelector";
import Cue from "./Cue";

type Draft = { weight?: number; reps?: number; rir?: number };

const firstNum = (s?: string) => {
  const m = s?.match(/\d+/);
  return m ? Number(m[0]) : undefined;
};

export default function ExecutionCard({
  instance,
  sessionId,
}: {
  instance: ExerciseInstance;
  sessionId: string;
}) {
  const { exercise } = instance;
  const isCardio = exercise.category === "cardio";
  const showWeight = exercise.isWeighted;
  const repsNumeric = /^\d+(-\d+)?$/.test(instance.targetRepsRange);
  const showReps = !isCardio && repsNumeric;
  const showRir = !!instance.targetRir;
  const mTag = methodTag(exercise.name, exercise.category);
  const relatedTheory = theoryForExercise(exercise.id, exercise.targetMuscle);
  const lang = useNameLang();
  const t = useT();
  const muscleName = useMuscleName();
  const names = exerciseNames(exercise, lang);
  const fw = useWeightFmt();

  const logs =
    useLiveQuery(
      () =>
        db.setLogs
          .where("sessionId")
          .equals(sessionId)
          .and((l) => l.workoutExerciseId === instance.id)
          .sortBy("setNumber"),
      [sessionId, instance.id]
    ) ?? [];

  // Previous *session* entry for the "last time" hint + cold prefill.
  const lastEntry = useLiveQuery(
    () => repo.getLastEntry(instance.id, sessionId),
    [instance.id, sessionId]
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
    // most recent done set in THIS session feeds the next set's prefill
    const sessionSource = logs.filter((l) => l.done).sort((a, b) => b.setNumber - a.setNumber)[0];
    const src = sessionSource ?? lastEntry;
    const d = drafts[n] ?? {};
    const existing = logByNum.get(n);
    const weight = showWeight ? (d.weight ?? src?.weight ?? 50) : undefined;
    const reps = showReps ? (d.reps ?? src?.reps ?? lowRep) : undefined;
    const rir = showRir ? (d.rir ?? src?.rir ?? targetRir) : undefined;
    await repo.upsertSet({
      id: existing?.id,
      sessionId,
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
            {instance.cardioSpec ? ` · ${instance.cardioSpec}` : ""}
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
          {lastEntry.rir != null ? ` @${lastEntry.rir} RIR` : ""}
        </p>
      ) : null}

      <Cue note={exercise.biomechanicNotes} link={exercise.link} />

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
                    <span className="text-faint"> @{log.rir} RIR</span>
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
                  placeholder={prefillSrc?.weight ?? 50}
                  onChange={(v) => setDraft(n, { weight: v })}
                  step={BRAND.weightStep}
                />
              ) : null}
              {showReps ? (
                <div className={`flex justify-center ${showWeight ? "mt-3" : ""}`}>
                  <Stepper
                    label={t("reps")}
                    value={draft.reps}
                    placeholder={prefillSrc?.reps ?? lowRep}
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
