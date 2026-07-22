"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/data/db";
import { repo } from "@/lib/data/repository";
import { sumVolume } from "@/lib/volume";
import { LIBRARY } from "@/lib/library";
import {
  exerciseNames,
  useNameLang,
  useUnit,
  useWeightFmt,
  useVolumeFmt,
  lbsToDisplay,
  displayToLbs,
  type NameLang,
} from "@/lib/prefs";
import { useT, useVariantLabel } from "@/lib/i18n";
import { fmtDayLong } from "@/lib/dates";
import type { Exercise, SetLog } from "@/lib/data/types";

const numInput =
  "w-16 rounded-lg border border-line bg-elevated px-2 py-1.5 text-center text-sm text-ink focus:border-cyan focus:outline-none";

/** A single past session, opened for review + correction: edit or delete each
 *  logged set, and add sets that were missed (search the catalog + library). */
export default function SessionDetail({ sessionId }: { sessionId: string }) {
  const t = useT();
  const lang = useNameLang();
  const unit = useUnit();
  const fv = useVolumeFmt();

  const session = useLiveQuery(() => db.sessions.get(sessionId), [sessionId]);
  const logs =
    useLiveQuery(
      () => db.setLogs.where("sessionId").equals(sessionId).sortBy("setNumber"),
      [sessionId]
    ) ?? [];
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const wexs = useLiveQuery(() => db.workoutExercises.toArray(), []);

  if (session === undefined || !exercises || !wexs) {
    return <p className="mt-10 text-center text-faint">{t("loading")}</p>;
  }

  if (!session) {
    return (
      <div className="mt-16 flex flex-col items-center gap-3 text-center">
        <p className="text-faint">{t("sessionNotFound")}</p>
        <Link href="/progress" className="text-cyan">
          ← {t("progressTitle")}
        </Link>
      </div>
    );
  }

  const exById = new Map(exercises.map((e) => [e.id, e]));
  const weById = new Map(wexs.map((w) => [w.id, w]));
  const exerciseFor = (l: SetLog): Exercise | undefined => {
    if (l.exerciseId) return exById.get(l.exerciseId);
    if (l.workoutExerciseId) return exById.get(weById.get(l.workoutExerciseId)?.exerciseId ?? "");
    return undefined;
  };

  const doneLogs = logs.filter((l) => l.done);
  const vol = sumVolume(doneLogs);

  return (
    <div className="flex flex-col gap-4">
      <header className="pt-2">
        <Link href="/progress" className="eyebrow text-faint transition hover:text-cyan">
          ← {t("progressTitle")}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-ink">{fmtDayLong(session.date, lang)}</h1>
        <p className="tnum mt-0.5 text-sm text-muted">
          {vol > 0 ? `${fv(vol)} ${unit} · ` : ""}
          {doneLogs.length} {t("sets")}
          {session.source === "watch" ? " · watch" : ""}
        </p>
      </header>

      <section className="panel p-4">
        {logs.length === 0 ? (
          <p className="text-center text-sm text-faint">{t("noSetsInSession")}</p>
        ) : (
          <>
            <ul className="flex flex-col gap-1.5">
              {logs.map((l) => (
                <SetRow key={l.id} log={l} exercise={exerciseFor(l)} lang={lang} />
              ))}
            </ul>
            <p className="mt-3 text-[0.65rem] text-faint">{t("editHint")}</p>
          </>
        )}
      </section>

      <AddSet sessionId={sessionId} exercises={exercises} nextSetNumber={logs.length + 1} lang={lang} />
    </div>
  );
}

function SetRow({ log, exercise, lang }: { log: SetLog; exercise?: Exercise; lang: NameLang }) {
  const t = useT();
  const unit = useUnit();
  const fw = useWeightFmt();
  const variantLabel = useVariantLabel();
  const [editing, setEditing] = useState(false);
  const [w, setW] = useState(log.weight != null ? String(lbsToDisplay(log.weight, unit)) : "");
  const [reps, setReps] = useState(log.reps?.toString() ?? "");
  const [rir, setRir] = useState(log.rir?.toString() ?? "");
  const name = exercise ? exerciseNames(exercise, lang).primary : log.exerciseId ?? "—";

  async function save() {
    await db.setLogs.update(log.id, {
      weight: w.trim() === "" ? undefined : displayToLbs(Number(w), unit),
      reps: reps.trim() === "" ? undefined : Number(reps),
      rir: rir.trim() === "" ? undefined : Number(rir),
      estimated: false, // user-corrected → real
    });
    setEditing(false);
  }

  if (!editing) {
    return (
      <li className="flex items-center justify-between gap-2 text-[0.85rem]">
        <span className="min-w-0 truncate text-ink">{name}</span>
        <span className="tnum ml-auto shrink-0 text-muted">
          {log.estimated ? "~" : ""}
          {log.weight != null ? fw(log.weight) : t("bw")}
          {log.reps != null ? ` × ${log.reps}` : ""}
          {log.rir != null ? ` @${log.rir}` : ""}
          {log.variant ? ` · ${variantLabel(log.variant)}` : ""}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="edit set"
          className="tap px-1 text-faint hover:text-cyan"
        >
          ✎
        </button>
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-cyan/30 p-2.5">
      <p className="mb-1.5 text-[0.8rem] font-semibold text-ink">{name}</p>
      <div className="flex items-center gap-1.5">
        <input inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} className={numInput} placeholder={unit} aria-label="weight" />
        <span className="text-faint">×</span>
        <input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} className={numInput} placeholder={t("reps")} aria-label="reps" />
        <span className="text-faint">@</span>
        <input inputMode="numeric" value={rir} onChange={(e) => setRir(e.target.value)} className={numInput} placeholder={t("rir")} aria-label="rir" />
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={save} className="tap flex-1 rounded-lg bg-cyan/15 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-cyan">
          {t("save")}
        </button>
        <button type="button" onClick={() => db.setLogs.delete(log.id)} className="tap rounded-lg border border-danger/50 px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-danger">
          {t("remove")}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="tap px-2 text-[0.7rem] text-faint">
          ✕
        </button>
      </div>
    </li>
  );
}

type Candidate = { id: string; name: string; aliasZh?: string; lib: (typeof LIBRARY)[number] | null };

function AddSet({
  sessionId,
  exercises,
  nextSetNumber,
  lang,
}: {
  sessionId: string;
  exercises: Exercise[];
  nextSetNumber: number;
  lang: NameLang;
}) {
  const t = useT();
  const unit = useUnit();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const [w, setW] = useState("");
  const [reps, setReps] = useState("");
  const [rir, setRir] = useState("");

  const existingIds = new Set(exercises.map((e) => e.id));
  const q = query.trim().toLowerCase();
  const exCands: Candidate[] = exercises
    .filter((e) => e.category !== "cardio" && e.category !== "mobility")
    .map((e) => ({ id: e.id, name: e.name, aliasZh: e.aliasZh, lib: null }));
  const libCands: Candidate[] = LIBRARY.filter((l) => !existingIds.has(`ex-lib-${l.slug}`)).map((l) => ({
    id: `ex-lib-${l.slug}`,
    name: l.name,
    aliasZh: l.aliasZh,
    lib: l,
  }));
  const cands = [...exCands, ...libCands]
    .filter((c) => {
      if (!q) return true;
      if (c.name.toLowerCase().includes(q)) return true;
      if ((c.aliasZh ?? "").toLowerCase().includes(q)) return true;
      return !!c.lib?.aliases?.some((a) => a.toLowerCase().includes(q));
    })
    .slice(0, 8);

  async function pick(c: Candidate) {
    if (c.lib) {
      await db.exercises
        .put({
          id: c.id,
          name: c.lib.name,
          aliasZh: c.lib.aliasZh,
          pattern: c.lib.pattern,
          targetMuscle: c.lib.targetMuscle,
          category: "isolation",
          isWeighted: c.lib.isWeighted,
          media: c.lib.media,
        })
        .catch(() => {});
    }
    setPicked({ id: c.id, name: lang === "zh" && c.aliasZh ? c.aliasZh : c.name });
    setQuery("");
  }

  async function addSet() {
    if (!picked) return;
    await repo.upsertSet({
      sessionId,
      exerciseId: picked.id,
      setNumber: nextSetNumber,
      weight: w.trim() === "" ? undefined : displayToLbs(Number(w), unit),
      reps: reps.trim() === "" ? undefined : Number(reps),
      rir: rir.trim() === "" ? undefined : Number(rir),
      done: true,
    });
    setW("");
    setReps("");
    setRir("");
    setPicked(null);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-3 text-[0.8rem] font-semibold text-faint transition hover:border-cyan/40 hover:text-cyan"
      >
        {t("addSet")}
      </button>
    );
  }

  return (
    <section className="panel p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="eyebrow">{t("addSet")}</h2>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setPicked(null);
          }}
          className="tap text-[0.7rem] text-faint"
        >
          ✕
        </button>
      </div>

      {!picked ? (
        <>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-xl border border-line bg-elevated px-3 py-2.5 text-[0.9rem] text-ink placeholder:text-faint focus:border-cyan focus:outline-none"
          />
          <ul className="mt-2 flex flex-col gap-1">
            {cands.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => pick(c)}
                  className="tap flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-left text-[0.85rem] text-ink transition hover:border-cyan/40"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {lang === "zh" && c.aliasZh ? c.aliasZh : c.name}
                  </span>
                  {c.lib ? <span className="shrink-0 text-[0.6rem] text-faint">{t("fromLibrary")}</span> : null}
                </button>
              </li>
            ))}
            {cands.length === 0 ? (
              <li className="py-2 text-center text-[0.8rem] text-faint">{t("noMatches")}</li>
            ) : null}
          </ul>
        </>
      ) : (
        <div>
          <p className="mb-2 text-[0.9rem] font-semibold text-ink">{picked.name}</p>
          <div className="flex items-center gap-1.5">
            <input inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} className={numInput} placeholder={unit} aria-label="weight" />
            <span className="text-faint">×</span>
            <input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} className={numInput} placeholder={t("reps")} aria-label="reps" />
            <span className="text-faint">@</span>
            <input inputMode="numeric" value={rir} onChange={(e) => setRir(e.target.value)} className={numInput} placeholder={t("rir")} aria-label="rir" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={addSet} className="tap flex-1 rounded-lg bg-laser py-2 text-[0.7rem] font-bold uppercase tracking-wider text-black glow-laser">
              {t("addSet")}
            </button>
            <button type="button" onClick={() => setPicked(null)} className="tap px-3 text-[0.7rem] text-faint">
              ← {t("pickExercise")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
