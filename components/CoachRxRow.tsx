"use client";

import { useState } from "react";
import type { OverriddenPrescription } from "@/lib/coach";
import { repo } from "@/lib/data/repository";
import type { ExerciseInstance, PlanOverride } from "@/lib/data/types";
import { useT } from "@/lib/i18n";
import { exerciseNames, useNameLang, useUnit, lbsToDisplay, displayToLbs } from "@/lib/prefs";
import CoachTip from "./CoachTip";

const numInput =
  "w-16 rounded-lg border border-line bg-elevated px-2 py-1.5 text-center text-sm text-ink focus:border-cyan focus:outline-none";

/**
 * One line of the draft session, with the coach's edit on top.
 *
 * The engine's proposal and its reasoning stay visible even after an edit —
 * a coach reviewing next week should be able to see what the algorithm wanted
 * and what they overrode it with, not just the final number.
 */
export default function CoachRxRow({
  instance,
  rx,
  override,
}: {
  instance: ExerciseInstance;
  rx: OverriddenPrescription;
  override?: PlanOverride;
}) {
  const t = useT();
  const lang = useNameLang();
  const unit = useUnit();
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [sets, setSets] = useState("");
  const [note, setNote] = useState("");

  function openEditor() {
    // Seed the form with whatever is currently prescribed, so a coach nudging
    // one field doesn't have to retype the other two.
    setWeight(rx.weight != null ? String(lbsToDisplay(rx.weight, unit)) : "");
    setReps(rx.reps != null ? String(rx.reps) : "");
    setSets(String(rx.sets || instance.targetSets));
    setNote(override?.note ?? "");
    setOpen(true);
  }

  async function save() {
    await repo.savePlanOverride(instance.id, {
      weight: weight.trim() === "" ? undefined : displayToLbs(Number(weight), unit),
      reps: reps.trim() === "" ? undefined : Number(reps),
      sets: sets.trim() === "" ? undefined : Number(sets),
      note: note.trim() || undefined,
    });
    setOpen(false);
  }

  async function skip() {
    await repo.savePlanOverride(instance.id, { skip: true, note: note.trim() || undefined });
    setOpen(false);
  }

  async function reset() {
    await repo.clearPlanOverride(instance.id);
    setOpen(false);
  }

  return (
    <li
      className={`rounded-xl border p-2.5 ${
        rx.overridden ? "border-laser/40 bg-laser/[0.04]" : "border-line"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-[0.85rem] font-semibold text-ink">
          {exerciseNames(instance.exercise, lang).primary}
        </span>
        <span className="tnum shrink-0 text-[0.7rem] text-faint">
          {rx.sets || instance.targetSets}×{instance.targetRepsRange}
          {instance.targetRir ? ` @${instance.targetRir}` : ""}
        </span>
      </div>

      <CoachTip rx={rx} />

      {rx.overridden ? (
        <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-wider text-laser">
          {t("rxEdited")}
          {rx.coachNote ? <span className="ml-1.5 normal-case text-muted">“{rx.coachNote}”</span> : null}
        </p>
      ) : null}

      {open ? (
        <div className="mt-2 rounded-xl border border-cyan/30 bg-abyss/60 p-2.5">
          <div className="flex items-center gap-1.5">
            <input
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className={numInput}
              placeholder={unit}
              aria-label="weight"
            />
            <span className="text-faint">×</span>
            <input
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className={numInput}
              placeholder={t("reps")}
              aria-label="reps"
            />
            <input
              inputMode="numeric"
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              className={`${numInput} ml-auto`}
              placeholder={t("rxSets")}
              aria-label="sets"
            />
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("rxNotePlaceholder")}
            className="mt-2 w-full rounded-lg border border-line bg-elevated px-2 py-1.5 text-sm text-ink placeholder:text-faint focus:border-cyan focus:outline-none"
          />
          <p className="mt-1.5 text-[0.62rem] leading-snug text-faint">{t("rxOverrideHint")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={save}
              className="tap flex-1 rounded-lg bg-cyan/15 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-cyan"
            >
              {t("rxSaveEdit")}
            </button>
            <button
              type="button"
              onClick={skip}
              className="tap rounded-lg border border-warn/50 px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-warn"
            >
              {t("rxSkipMovement")}
            </button>
            {rx.overridden ? (
              <button
                type="button"
                onClick={reset}
                className="tap rounded-lg border border-line px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-faint hover:text-cyan"
              >
                {t("rxReset")}
              </button>
            ) : null}
            <button type="button" onClick={() => setOpen(false)} className="tap px-2 text-[0.7rem] text-faint">
              ✕
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openEditor}
          className="tap mt-1.5 text-[0.68rem] font-semibold uppercase tracking-wider text-faint transition hover:text-cyan"
        >
          {t("rxEdit")} ✎
        </button>
      )}
    </li>
  );
}
