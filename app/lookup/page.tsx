"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/data/db";
import { buildExerciseMemory, type ExerciseMemory } from "@/lib/lookup";
import { fmtDayLong } from "@/lib/dates";
import { BRAND } from "@/lib/brand";
import { exerciseNames, useNameLang, useUnit, useWeightFmt, lbsToDisplay, displayToLbs } from "@/lib/prefs";
import UnitToggle from "@/components/UnitToggle";
import { useT, useMuscleName } from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";
import ExerciseIcon from "@/components/ExerciseIcon";

/** Gym-floor lookup: "what did I do last time on this machine?"
 *  Search by name or tap a muscle-group chip → last top set + recent history,
 *  no date spelunking. */
export default function LookupPage() {
  const t = useT();
  const muscleName = useMuscleName();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<string | null>(null);

  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const wexs = useLiveQuery(() => db.workoutExercises.toArray(), []);
  const logs = useLiveQuery(() => db.setLogs.toArray(), []);
  const sessions = useLiveQuery(() => db.sessions.toArray(), []);

  const memories = useMemo(() => {
    if (!exercises || !wexs || !logs || !sessions) return undefined;
    const dates = new Map(sessions.map((s) => [s.id, s.date]));
    return buildExerciseMemory(exercises, wexs, logs, dates);
  }, [exercises, wexs, logs, sessions]);

  if (!memories) return <p className="mt-10 text-center text-faint">{t("loading")}</p>;

  const muscles = [...new Set(memories.map((m) => m.exercise.targetMuscle))];
  const q = query.trim().toLowerCase();
  const visible = memories.filter((m) => {
    if (muscle && m.exercise.targetMuscle !== muscle) return false;
    if (
      q &&
      !m.exercise.name.toLowerCase().includes(q) &&
      !(m.exercise.aliasZh ?? "").toLowerCase().includes(q)
    )
      return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-end justify-between pt-2">
        <div>
          <p className="eyebrow">{t("memory")}</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">{t("lastTimeOn")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <LangToggle />
          <UnitToggle />
        </div>
      </header>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="w-full rounded-xl border border-line bg-elevated px-4 py-3 text-base text-ink placeholder:text-faint focus:border-cyan focus:outline-none"
      />

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {muscles.map((m) => {
          const active = muscle === m;
          return (
            <button
              key={m}
              onClick={() => setMuscle(active ? null : m)}
              className={`tap shrink-0 rounded-full border px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-wider transition ${
                active
                  ? "border-laser bg-laser/15 text-laser"
                  : "border-line text-muted hover:border-cyan/50"
              }`}
            >
              {muscleName(m)}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="mt-8 text-center text-sm text-faint">{t("noMatches")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((m) => (
            <MemoryCard key={m.exercise.id} m={m} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EditableEntry({
  entry,
  lang,
}: {
  entry: import("@/lib/lookup").ExerciseSetEntry;
  lang: "zh" | "en";
}) {
  const t = useT();
  const unit = useUnit();
  const fw = useWeightFmt();
  const [editing, setEditing] = useState(false);
  const [w, setW] = useState<string>(
    entry.weight != null ? String(lbsToDisplay(entry.weight, unit)) : ""
  );
  const [reps, setReps] = useState<string>(entry.reps?.toString() ?? "");
  const [rir, setRir] = useState<string>(entry.rir?.toString() ?? "");
  const [variant, setVariant] = useState<string>(entry.variant ?? "");

  async function saveEdit() {
    await db.setLogs.update(entry.id, {
      weight: w.trim() === "" ? undefined : displayToLbs(Number(w), unit),
      reps: reps.trim() === "" ? undefined : Number(reps),
      rir: rir.trim() === "" ? undefined : Number(rir),
      variant: variant.trim() || undefined,
      estimated: false, // user-corrected → real
    });
    setEditing(false);
  }

  async function removeEdit() {
    await db.setLogs.delete(entry.id);
    setEditing(false);
  }

  if (!editing) {
    return (
      <li className="tnum flex items-center justify-between gap-2 text-[0.8rem] text-muted">
        <span>{entry.date ? fmtDayLong(entry.date, lang) : "—"}</span>
        <span className="ml-auto">
          {entry.estimated ? "~" : ""}
          {entry.weight != null ? fw(entry.weight) : t("bw")}
          {entry.reps != null ? ` × ${entry.reps}` : ""}
          {entry.rir != null ? ` @${entry.rir}` : ""}
          {entry.variant ? ` · ${entry.variant}` : ""}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="edit entry"
          className="tap px-1 text-faint hover:text-cyan"
        >
          ✎
        </button>
      </li>
    );
  }

  const numInput =
    "w-16 rounded-lg border border-line bg-elevated px-2 py-1.5 text-center text-sm text-ink focus:border-cyan focus:outline-none";
  return (
    <li className="rounded-xl border border-cyan/30 p-2.5">
      <div className="flex items-center gap-1.5">
        <input inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} className={numInput} placeholder={unit} aria-label="weight" />
        <span className="text-faint">×</span>
        <input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} className={numInput} placeholder="reps" aria-label="reps" />
        <span className="text-faint">@</span>
        <input inputMode="numeric" value={rir} onChange={(e) => setRir(e.target.value)} className={numInput} placeholder="RIR" aria-label="rir" />
      </div>
      <input
        value={variant}
        onChange={(e) => setVariant(e.target.value)}
        placeholder={t("variantLabel")}
        className="mt-1.5 w-full rounded-lg border border-line bg-elevated px-2 py-1.5 text-sm text-ink placeholder:text-faint focus:border-cyan focus:outline-none"
      />
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={saveEdit} className="tap flex-1 rounded-lg bg-cyan/15 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-cyan">
          {t("save")}
        </button>
        <button type="button" onClick={removeEdit} className="tap rounded-lg border border-danger/50 px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-danger">
          {t("remove")}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="tap px-2 text-[0.7rem] text-faint">
          ✕
        </button>
      </div>
    </li>
  );
}

function MemoryCard({ m }: { m: ExerciseMemory }) {
  const [open, setOpen] = useState(false);
  const { exercise, last, recent, totalSets } = m;
  const lang = useNameLang();
  const t = useT();
  const muscleName = useMuscleName();
  const fw = useWeightFmt();
  const names = exerciseNames(exercise, lang);
  return (
    <li className="panel p-4">
      <button className="tap w-full text-left" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-start justify-between gap-3">
          <span className="mt-0.5 shrink-0 text-cyan">
            <ExerciseIcon pattern={exercise.pattern} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.95rem] font-semibold text-ink">{names.primary}</p>
            <p className="eyebrow mt-0.5">{muscleName(exercise.targetMuscle)}</p>
          </div>
          {last ? (
            <div className="shrink-0 text-right">
              <p className="tnum text-lg font-bold text-cyan">
                {last.estimated ? "~" : ""}
                {last.weight != null ? fw(last.weight) : t("bw")}
                {last.reps != null ? <span className="text-ink"> × {last.reps}</span> : null}
              </p>
              <p className="tnum text-[0.65rem] text-faint">
                {last.rir != null ? `@${last.rir} RIR · ` : ""}
                {last.date ? fmtDayLong(last.date, lang) : ""}
              </p>
            </div>
          ) : (
            <p className="shrink-0 text-[0.7rem] uppercase tracking-wider text-faint">{t("noHistory")}</p>
          )}
        </div>
      </button>
      {open && recent.length > 0 ? (
        <div className="mt-3 border-t border-line pt-2">
          <p className="eyebrow mb-1.5">{t("recentSessions")}</p>
          <ul className="flex flex-col gap-1">
            {recent.map((r) => (
              <EditableEntry key={r.id} entry={r} lang={lang} />
            ))}
          </ul>
          <p className="mt-1.5 text-[0.65rem] text-faint">
            {totalSets} {t("setsAllTime")} · {t("editedNote")}
            {recent.some((r) => r.estimated) ? ` · ${t("reconstructedNote")}` : ""}
          </p>
        </div>
      ) : null}
    </li>
  );
}
