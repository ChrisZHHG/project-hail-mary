"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/data/db";
import { buildExerciseMemory, type ExerciseMemory } from "@/lib/lookup";
import { fmtDayLong } from "@/lib/dates";
import { BRAND } from "@/lib/brand";
import { exerciseNames, useNameLang } from "@/lib/prefs";
import LangToggle from "@/components/LangToggle";
import ExerciseIcon from "@/components/ExerciseIcon";

/** Gym-floor lookup: "what did I do last time on this machine?"
 *  Search by name or tap a muscle-group chip → last top set + recent history,
 *  no date spelunking. */
export default function LookupPage() {
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

  if (!memories) return <p className="mt-10 text-center text-faint">Loading…</p>;

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
          <p className="eyebrow">Memory</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">Last time on…</h1>
        </div>
        <LangToggle />
      </header>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a machine or movement…"
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
              {m}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="mt-8 text-center text-sm text-faint">No matches.</p>
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

function MemoryCard({ m }: { m: ExerciseMemory }) {
  const [open, setOpen] = useState(false);
  const { exercise, last, recent, totalSets } = m;
  const lang = useNameLang();
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
            {names.secondary ? (
              <p className="truncate text-[0.62rem] text-faint">{names.secondary}</p>
            ) : null}
            <p className="eyebrow mt-0.5">{exercise.targetMuscle}</p>
          </div>
          {last ? (
            <div className="shrink-0 text-right">
              <p className="tnum text-lg font-bold text-cyan">
                {last.estimated ? "~" : ""}
                {last.weight != null ? `${last.weight} ${BRAND.unit}` : "BW"}
                {last.reps != null ? <span className="text-ink"> × {last.reps}</span> : null}
              </p>
              <p className="tnum text-[0.65rem] text-faint">
                {last.rir != null ? `@${last.rir} RIR · ` : ""}
                {last.date ? fmtDayLong(last.date) : ""}
              </p>
            </div>
          ) : (
            <p className="shrink-0 text-[0.7rem] uppercase tracking-wider text-faint">no history</p>
          )}
        </div>
      </button>
      {open && recent.length > 0 ? (
        <div className="mt-3 border-t border-line pt-2">
          <p className="eyebrow mb-1.5">Recent sessions (top set)</p>
          <ul className="flex flex-col gap-1">
            {recent.map((r, i) => (
              <li key={i} className="tnum flex justify-between text-[0.8rem] text-muted">
                <span>{r.date ? fmtDayLong(r.date) : "—"}</span>
                <span>
                  {r.estimated ? "~" : ""}
                  {r.weight != null ? `${r.weight} ${BRAND.unit}` : "BW"}
                  {r.reps != null ? ` × ${r.reps}` : ""}
                  {r.rir != null ? ` @${r.rir}` : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[0.65rem] text-faint">
            {totalSets} sets all-time{recent.some((r) => r.estimated) ? " · ~ = reconstructed from your described routine" : ""}
          </p>
        </div>
      ) : null}
    </li>
  );
}
