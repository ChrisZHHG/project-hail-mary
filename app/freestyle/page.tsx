"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/data/db";
import { repo } from "@/lib/data/repository";
import { buildExerciseMemory, type ExerciseMemory } from "@/lib/lookup";
import { sumVolume, fmtVolume } from "@/lib/volume";
import { BRAND } from "@/lib/brand";
import type { Exercise, SetLog } from "@/lib/data/types";
import { LIBRARY } from "@/lib/library";
import BodyHeatmap from "@/components/BodyHeatmap";
import ExerciseMedia from "@/components/ExerciseMedia";
import WeightControl from "@/components/WeightControl";
import Stepper from "@/components/Stepper";
import RirSelector from "@/components/RirSelector";
import GearChips from "@/components/GearChips";
import LangToggle from "@/components/LangToggle";
import { exerciseNames, useNameLang, useUnit, useWeightFmt, useVolumeFmt, lbsToDisplay, useBodyweightLbs } from "@/lib/prefs";
import UnitToggle from "@/components/UnitToggle";
import { useT, useMuscleName, useVariantLabel } from "@/lib/i18n";

/** Freestyle logging — 自主训练. Pick a muscle on the body, recognize the
 *  machine by picture + 中文名, and log against last time's numbers. The
 *  whole point (per the coach): beat last time. */
export default function FreestylePage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [muscle, setMuscle] = useState<string | null>(null);
  const [active, setActive] = useState<string[]>([]); // exerciseIds being logged
  const lang = useNameLang();
  const t = useT();
  const muscleName = useMuscleName();
  const unit = useUnit();
  const fw = useWeightFmt();
  const bodyweight = useBodyweightLbs();
  const fv = useVolumeFmt();

  useEffect(() => {
    let alive = true;
    (async () => {
      await repo.cleanupStaleOpenSessions();
      const existing = await db.sessions
        .filter((s) => !s.workoutId && s.completedAt == null && s.source !== "watch")
        .first();
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
  }, []);

  const ensureSession = async () => {
    if (sessionId) return sessionId;
    const s = await repo.startFreestyleSession();
    setSessionId(s.id);
    return s.id;
  };

  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const wexs = useLiveQuery(() => db.workoutExercises.toArray(), []);
  const logs = useLiveQuery(() => db.setLogs.toArray(), []);
  const sessions = useLiveQuery(() => db.sessions.toArray(), []);

  const sessionLogs = useMemo(
    () => (logs ?? []).filter((l) => sessionId && l.sessionId === sessionId),
    [logs, sessionId]
  );

  // "Last time" memory, excluding the running session (so deltas are vs. history).
  const memory = useMemo(() => {
    if (!exercises || !wexs || !logs || !sessions) return undefined;
    const dates = new Map(sessions.map((s) => [s.id, s.date]));
    const prior = logs.filter((l) => !sessionId || l.sessionId !== sessionId);
    return new Map(
      buildExerciseMemory(exercises, wexs, prior, dates).map((m) => [m.exercise.id, m])
    );
  }, [exercises, wexs, logs, sessions, sessionId]);

  if (!exercises || !memory || !ready) {
    return <p className="mt-10 text-center text-faint">{t("calibrating")}</p>;
  }

  const pickable = exercises.filter(
    (e) => e.category !== "cardio" && e.category !== "mobility"
  );
  // Full canonical body map — muscles without exercises still show (empty-state
  // hint) so "I can't find X" never happens silently.
  const CANONICAL = ["Back", "Chest", "Shoulders", "Biceps", "Triceps", "Forearms", "Core", "Quads", "Hamstrings", "Glutes", "Adductors", "Calves"];
  const fromData = [...new Set(pickable.map((e) => e.targetMuscle))];
  const muscles = [...new Set([...CANONICAL, ...fromData])];
  const volume = sumVolume(sessionLogs);
  const doneSets = sessionLogs.filter((l) => l.done).length;

  // curated library — offered for muscles once its exercises aren't already
  // in the catalog (added once, then it behaves like any other exercise)
  const existingIds = new Set(exercises.map((e) => e.id));
  const libraryForMuscle = LIBRARY.filter(
    (e) => e.targetMuscle === muscle && !existingIds.has(`ex-lib-${e.slug}`)
  );

  // exercises already logged this session surface as active cards
  const loggedExIds = [...new Set(sessionLogs.map((l) => l.exerciseId).filter(Boolean))] as string[];
  const activeIds = [...new Set([...loggedExIds, ...active])];

  async function finish() {
    if (!sessionId || doneSets === 0) return;
    await repo.completeSession(sessionId);
    router.push("/progress");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* HUD */}
      <div className="sticky top-0 z-30 -mx-4 border-b border-line bg-void/85 px-4 pb-3 pt-2 backdrop-blur-md">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-ink">{t("freestyleTitle")}</h1>
              <LangToggle />
              <UnitToggle />
            </div>
            <p className="eyebrow mt-0.5">{t("freestyleHint")}</p>
          </div>
          <div className="text-right">
            <div className="tnum text-2xl font-bold text-cyan text-glow-cyan">
              {fv(volume)}
              <span className="ml-1 text-xs font-normal text-faint">{unit}</span>
            </div>
            <p className="eyebrow">{doneSets} {t("sets")}</p>
          </div>
        </div>
      </div>

      {/* Active exercise cards */}
      {activeIds.map((exId) => {
        const ex = exercises.find((e) => e.id === exId);
        if (!ex) return null;
        return (
          <FreestyleCard
            key={exId}
            exercise={ex}
            sessionId={sessionId}
            ensureSession={ensureSession}
            memory={memory.get(exId)}
            onRemoveEmpty={() => setActive((a) => a.filter((id) => id !== exId))}
          />
        );
      })}

      {/* Picker */}
      <section className="panel p-4">
        <h2 className="eyebrow mb-1">{t("whichMuscle")}</h2>
        <p className="mb-2 text-[0.72rem] text-faint">{t("tapBody")}</p>
        <BodyHeatmap
          data={muscles.map((m) => ({ muscle: m, volume: 0 }))}
          onPick={(m) => muscles.includes(m) && setMuscle(m === muscle ? null : m)}
          selected={muscle}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {muscles.map((m) => (
            <button
              key={m}
              onClick={() => setMuscle(muscle === m ? null : m)}
              className={`tap rounded-full border px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-wider transition ${
                muscle === m ? "border-laser bg-laser/15 text-laser" : "border-line text-muted"
              }`}
            >
              {muscleName(m)}
            </button>
          ))}
        </div>

        {muscle &&
        pickable.filter((e) => e.targetMuscle === muscle).length === 0 &&
        libraryForMuscle.length === 0 ? (
          <p className="mt-3 border-t border-line pt-3 text-center text-[0.8rem] text-faint">
            {t("noExercisesYet")}
          </p>
        ) : null}
        {muscle && pickable.filter((e) => e.targetMuscle === muscle).length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
            {pickable
              .filter((e) => e.targetMuscle === muscle)
              .map((e) => {
                const last = memory.get(e.id)?.last;
                const isActive = activeIds.includes(e.id);
                const names = exerciseNames(e, lang);
                return (
                  <li key={e.id}>
                    <button
                      onClick={() => {
                        setActive((a) => (a.includes(e.id) ? a : [...a, e.id]));
                        setMuscle(null);
                      }}
                      disabled={isActive}
                      className={`tap flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                        isActive
                          ? "border-go/40 bg-go/[0.05] opacity-60"
                          : "border-line hover:border-cyan/40"
                      }`}
                    >
                      <span className="text-cyan">
                        <ExerciseMedia media={e.media} pattern={e.pattern} size="sm" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.9rem] font-semibold text-ink">
                          {names.primary}
                        </span>
                      </span>
                      <span className="tnum shrink-0 text-right text-[0.7rem] text-laser-soft">
                        {last
                          ? `${t("last")} ${last.weight != null ? fw(last.weight) : t("bw")}${
                              last.reps != null ? `×${last.reps}` : ""
                            }`
                          : t("firstTime")}
                      </span>
                    </button>
                  </li>
                );
              })}
          </ul>
        ) : null}

        {muscle && libraryForMuscle.length > 0 ? (
          <div className="mt-3 border-t border-line pt-3">
            <h3 className="eyebrow mb-2">{t("fromLibrary")}</h3>
            <ul className="flex flex-col gap-2">
              {libraryForMuscle.map((e) => {
                const names = exerciseNames(e, lang);
                return (
                  <li key={e.slug}>
                    <button
                      onClick={() => {
                        void db.exercises.add({
                          id: `ex-lib-${e.slug}`,
                          name: e.name,
                          aliasZh: e.aliasZh,
                          pattern: e.pattern,
                          targetMuscle: e.targetMuscle,
                          category: "isolation",
                          isWeighted: e.isWeighted,
                          media: e.media,
                        });
                      }}
                      className="tap flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left text-muted transition hover:border-cyan/40"
                    >
                      <span className="text-muted">
                        <ExerciseMedia media={e.media} pattern={e.pattern} size="sm" />
                      </span>
                      <span className="min-w-0 flex-1 text-[0.9rem] font-semibold">
                        {names.primary}
                      </span>
                      <span className="shrink-0 text-lg text-faint">+</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </section>

      <button
        type="button"
        onClick={finish}
        disabled={doneSets === 0}
        className="tap mt-1 w-full rounded-xl border border-cyan/50 bg-cyan/[0.08] py-3.5 text-sm font-bold uppercase tracking-wider text-cyan transition active:scale-[0.98] disabled:opacity-40"
      >
        {t("finishSession")}
      </button>
    </div>
  );
}

/* ------------------------- per-exercise log card ------------------------- */

function FreestyleCard({
  exercise,
  sessionId,
  ensureSession,
  memory,
  onRemoveEmpty,
}: {
  exercise: Exercise;
  sessionId: string | null;
  ensureSession: () => Promise<string>;
  memory?: ExerciseMemory;
  onRemoveEmpty: () => void;
}) {
  const [weight, setWeight] = useState<number | undefined>(undefined);
  const [reps, setReps] = useState<number | undefined>(undefined);
  const [rir, setRir] = useState<number | undefined>(undefined);
  const [flash, setFlash] = useState(false);
  const lang = useNameLang();
  const t = useT();
  const names = exerciseNames(exercise, lang);
  const variantLabel = useVariantLabel();

  const logs =
    useLiveQuery(
      () =>
        sessionId
          ? db.setLogs
              .where("sessionId")
              .equals(sessionId)
              .and((l) => l.exerciseId === exercise.id)
              .sortBy("setNumber")
          : Promise.resolve([] as SetLog[]),
      [sessionId, exercise.id]
    ) ?? [];

  const last = memory?.last; // best reference from history (pre-session)
  const sessionLast = logs.filter((l) => l.done).at(-1);
  const prefillW = sessionLast?.weight ?? last?.weight ?? 50;
  const prefillR = sessionLast?.reps ?? last?.reps ?? 8;
  const prefillRir = sessionLast?.rir ?? last?.rir;
  const unit = useUnit();
  const fw = useWeightFmt();
  const bodyweight = useBodyweightLbs();

  /** ▲/▼ progress vs last time's top set — the coach's #1 rule. */
  function delta(w?: number, r?: number): { sign: "up" | "down" | "flat"; label: string } | null {
    if (!last || (last.weight == null && last.reps == null)) return null;
    const lw = last.weight ?? 0;
    const cw = w ?? 0;
    if (cw > lw) return { sign: "up", label: `▲ +${lbsToDisplay(cw - lw, unit)} ${unit}` };
    if (cw < lw) return { sign: "down", label: `▼ ${lbsToDisplay(cw - lw, unit)} ${unit}` };
    const lr = last.reps ?? 0;
    const cr = r ?? 0;
    if (cr > lr) return { sign: "up", label: `▲ +${cr - lr} ${t("repsShort")}` };
    if (cr < lr) return { sign: "down", label: `▼ ${cr - lr} ${t("repsShort")}` };
    return { sign: "flat", label: t("same") };
  }

  async function logSet() {
    const sid = await ensureSession();
    const w = exercise.isWeighted ? (weight ?? prefillW) : undefined;
    const r = reps ?? prefillR;
    await repo.upsertSet({
      sessionId: sid,
      exerciseId: exercise.id,
      setNumber: logs.length + 1,
      weight: w,
      reps: r,
      rir: rir ?? prefillRir,
      done: true,
    });
    setFlash(true);
    setTimeout(() => setFlash(false), 700);
  }

  return (
    <section className={`panel p-4 ${flash ? "animate-logged" : ""}`}>
      <header className="flex items-center gap-3">
        <span className="text-cyan">
          <ExerciseMedia media={exercise.media} pattern={exercise.pattern} size="sm" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-tight text-ink">{names.primary}</h3>
        </div>
        {logs.length === 0 ? (
          <button onClick={onRemoveEmpty} className="text-[0.7rem] text-faint hover:text-danger">
            {t("remove")}
          </button>
        ) : null}
      </header>

      {last ? (
        <p className="tnum mt-2 text-[0.75rem] text-laser-soft">
          {t("last")}: {last.weight != null ? `${fw(last.weight)} × ` : ""}
          {last.reps ?? "—"} · {t("beatIt")}
        </p>
      ) : (
        <p className="mt-2 text-[0.75rem] text-faint">{t("firstRecord")}</p>
      )}

      <GearChips exerciseId={exercise.id} pattern={exercise.pattern} />

      {/* logged sets with progress deltas */}
      {logs.filter((l) => l.done).map((l) => {
        const d = delta(l.weight, l.reps);
        return (
          <div
            key={l.id}
            className="mt-2 flex items-center justify-between rounded-xl border border-go/40 bg-go/[0.06] px-3 py-2"
          >
            <span className="eyebrow text-faint">{t("set")} {l.setNumber}{t("setUnit")}</span>
            <span className="tnum text-sm font-semibold text-ink">
              {l.weight != null ? `${fw(l.weight)} × ` : ""}
              {l.reps}
              {l.rir != null ? <span className="text-faint"> @{l.rir}</span> : null}
              {l.variant ? <span className="text-faint"> · {variantLabel(l.variant)}</span> : null}
            </span>
            {d ? (
              <span
                className={`tnum text-[0.7rem] font-bold ${
                  d.sign === "up" ? "text-go" : d.sign === "down" ? "text-warn" : "text-faint"
                }`}
              >
                {d.label}
              </span>
            ) : (
              <span className="text-go">✓</span>
            )}
          </div>
        );
      })}

      <div className="mt-3 rounded-xl border border-line bg-abyss/60 p-3">
        {exercise.isWeighted ? (
          <>
            <WeightControl
              label={t("weight")}
              value={weight}
              placeholder={prefillW}
              onChange={setWeight}
              step={BRAND.weightStep}
            />
            <button
              type="button"
              onClick={() => setWeight(bodyweight ?? undefined)}
              className={`tap mt-2 rounded-full border px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider transition ${
                weight != null && bodyweight != null && weight === bodyweight
                  ? "border-cyan bg-cyan/15 text-cyan"
                  : "border-line text-faint"
              }`}
            >
              {t("bwChip")}
              {bodyweight != null ? ` · ${fw(bodyweight)}` : ""}
            </button>
          </>
        ) : null}
        <div className={`flex justify-center ${exercise.isWeighted ? "mt-3" : ""}`}>
          <Stepper label={t("reps")} value={reps} placeholder={prefillR} onChange={setReps} step={1} accent="cyan" />
        </div>
        <div className="mt-3 flex justify-center">
          <RirSelector value={rir ?? prefillRir} target="1-2" onChange={setRir} />
        </div>
        <button
          type="button"
          onClick={logSet}
          className="tap mt-3 w-full rounded-xl bg-laser py-3 text-sm font-bold uppercase tracking-wider text-black transition active:scale-[0.98] glow-laser"
        >
          {t("logSet")} {logs.length + 1}
        </button>
      </div>
    </section>
  );
}
