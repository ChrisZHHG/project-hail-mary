import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { loadingKind, nextWorkout, prescribe, topSet } from "@/lib/coach";
import type { Session, SetLog, Workout, WorkoutExercise, Exercise } from "@/lib/data/types";

/**
 * Replays the coach engine over a real backup export and prints what it *would*
 * have said, next to what actually happened. This is a sanity check on the
 * rules before any of it drives the UI — cheap to eyeball, cheap to change.
 *
 * Needs a backup file; skipped when there isn't one. Point it anywhere with:
 *   HM_BACKUP=/path/to/hailmary-backup-*.json pnpm test replay
 */

const BACKUP = process.env.HM_BACKUP ?? `${homedir()}/Downloads/hailmary-backup-2026-07-28.json`;
const REPORT = process.env.HM_REPORT ?? `${tmpdir()}/coach-replay.txt`;
const has = existsSync(BACKUP);

/** Vitest swallows console output, so the report is also written to REPORT. */
const report = (s: string) => {
  console.log(s);
  appendFileSync(REPORT, `${s}\n`);
};

interface Backup {
  tables: {
    exercises: Exercise[];
    workouts: Workout[];
    workoutExercises: WorkoutExercise[];
    sessions: Session[];
    setLogs: SetLog[];
  };
}

/** Empty stand-in so the suite can still be *collected* without a backup file.
 *  `describe.skipIf` skips the tests, but Vitest still runs this factory to find
 *  them — so reading the file unconditionally here crashed the whole run on any
 *  machine that isn't the owner's (and in CI). */
const EMPTY: Backup = {
  tables: { exercises: [], workouts: [], workoutExercises: [], sessions: [], setLogs: [] },
};

describe.skipIf(!has)("coach engine — replay over real history", () => {
  if (has) writeFileSync(REPORT, "");
  const b = has ? (JSON.parse(readFileSync(BACKUP, "utf8")) as Backup) : EMPTY;
  const { exercises, workouts, workoutExercises, sessions, setLogs } = b.tables;
  const exById = new Map(exercises.map((e) => [e.id, e]));
  const weById = new Map(workoutExercises.map((w) => [w.id, w]));
  const sessById = new Map(sessions.map((s) => [s.id, s]));

  /** A set's exercise, whether it was logged against the program or freestyle. */
  const exerciseOf = (l: SetLog) =>
    l.exerciseId ?? (l.workoutExerciseId ? weById.get(l.workoutExerciseId)?.exerciseId : undefined);

  /** The block's targets for an exercise, or its defaults when freestyled. */
  const targetsFor = (exId: string) => {
    const a = workoutExercises.find((w) => w.exerciseId === exId && w.section === "main");
    return {
      targetSets: a?.targetSets ?? 2,
      targetRepsRange: a?.targetRepsRange ?? "4-8",
      targetRir: a?.targetRir ?? "1-2",
      inProgram: !!a,
    };
  };

  it("says what to train today", () => {
    const r = nextWorkout({ workouts, sessions, today: "2026-07-28" });
    const name = workouts.find((w) => w.id === r.workoutId)?.name ?? "—";
    report(
      `\n━━━ SCHEDULE (as of 2026-07-28) ━━━\n` +
        `  next up      : ${name}\n` +
        `  train today? : ${r.dueToday ? "YES" : `no — ${r.reasonCode}`}\n` +
        `  last session : ${r.lastDate} (${r.daysSinceLast} days ago)\n`
    );
    expect(r.workoutId).toBeTruthy();
  });

  it("prescribes each movement from its own history", () => {
    // Group by exercise *and loading kind* (an "OR Lat Pulldown" movement mixes
    // bodyweight and stack sets under one id), then by session, in date order.
    const byExercise = new Map<string, Map<string, SetLog[]>>();
    for (const l of setLogs) {
      const exId = exerciseOf(l);
      if (!exId || !l.done) continue;
      const key = `${exId}|${loadingKind(l)}`;
      const perSession = byExercise.get(key) ?? new Map<string, SetLog[]>();
      perSession.set(l.sessionId, [...(perSession.get(l.sessionId) ?? []), l]);
      byExercise.set(key, perSession);
    }

    const lines: string[] = [];
    let checked = 0;

    for (const [key, perSession] of byExercise) {
      const [exId, kind] = key.split("|");
      const ex = exById.get(exId);
      if (!ex) continue;
      const t = targetsFor(exId);
      const dated = [...perSession.entries()]
        .map(([sid, logs]) => ({ date: sessById.get(sid)?.date ?? "?", logs }))
        .filter((d) => d.date !== "?")
        .sort((a, c) => a.date.localeCompare(c.date));
      if (dated.length < 2) continue;

      const name = `${ex.aliasZh ?? ex.name}${kind === "bodyweight" ? " (自重)" : ""}`;
      lines.push(
        `\n  ${name}  [${t.inProgram ? "program" : "freestyle"} · ${t.targetSets}×${t.targetRepsRange} @RIR ${t.targetRir}]`
      );

      for (let i = 1; i < dated.length; i++) {
        const prev = dated[i - 1];
        const cur = dated[i];
        const prevTop = topSet(prev.logs);
        const curTop = topSet(cur.logs);
        if (!prevTop) continue;

        const p = prescribe({ ...t, last: prevTop, isWeighted: ex.isWeighted });
        const fmt = (l?: SetLog) =>
          l ? `${l.weight != null ? `${l.weight}×` : "BW×"}${l.reps ?? "?"}${l.rir != null ? `@${l.rir}` : ""}` : "—";
        const rec = `${p.weight != null ? `${p.weight}×` : "BW×"}${p.reps ?? "?"}`;

        lines.push(
          `    ${prev.date} ${fmt(prevTop).padEnd(12)} → engine: ${rec.padEnd(10)} ${`(${p.action})`.padEnd(14)}` +
            ` | ${cur.date} actually ${fmt(curTop)}`
        );
        checked++;
      }
    }

    report(
      `\n━━━ PROGRESSION REPLAY — engine's call vs what happened next ━━━` +
        lines.join("\n") +
        `\n\n  ${checked} session-to-session transitions replayed\n`
    );
    expect(checked).toBeGreaterThan(0);
  });
});
