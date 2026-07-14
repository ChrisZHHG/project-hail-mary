import Dexie, { type Table } from "dexie";
import type {
  Exercise,
  Program,
  ReadinessCheck,
  Session,
  SetLog,
  Workout,
  WorkoutExercise,
} from "./types";
import {
  SEED_EXERCISES,
  SEED_PROGRAM,
  SEED_WORKOUTS,
  SEED_WORKOUT_EXERCISES,
  buildDemoHistory,
} from "./seed";
import { WATCH_SESSIONS, WATCH_SESSION_LOGS } from "./watchHistory";

/** IndexedDB store (local-first). The Repository layer is what the app talks to;
 *  this class is the storage detail that a Supabase adapter would replace. */
export class HailMaryDB extends Dexie {
  exercises!: Table<Exercise, string>;
  programs!: Table<Program, string>;
  workouts!: Table<Workout, string>;
  workoutExercises!: Table<WorkoutExercise, string>;
  sessions!: Table<Session, string>;
  setLogs!: Table<SetLog, string>;
  readinessChecks!: Table<ReadinessCheck, string>;

  constructor() {
    super("hailmary");
    this.version(1).stores({
      exercises: "id, name, category",
      programs: "id",
      workouts: "id, programId, dayOrder",
      workoutExercises: "id, workoutId, [workoutId+order]",
      sessions: "id, workoutId, date, completedAt",
      setLogs: "id, sessionId, workoutExerciseId, [workoutExerciseId+timestamp]",
      readinessChecks: "id, date, timestamp",
    });

    /* v2 — program sync (coach's June 2026 update: RIR 0-1, FB1 layout change)
     * + Apple Watch history backfill. Schema keypaths are unchanged; the
     * version bump exists to run this one-shot upgrade on installed clients. */
    this.version(2)
      .stores({})
      .upgrade(async (tx) => {
        // 1. Refresh catalog / workouts by stable id (never touches user logs).
        await tx.table("exercises").bulkPut(SEED_EXERCISES);
        await tx.table("workouts").bulkPut(SEED_WORKOUTS);

        // 2. Rebuild assignments (positional ids shifted in v2), then remap
        //    existing setLogs old→new via (workoutId, exerciseId) identity so
        //    prefill memory ("Last: 110×7") survives the layout change.
        const weTable = tx.table("workoutExercises");
        const oldWes = (await weTable.toArray()) as WorkoutExercise[];
        const oldById = new Map(oldWes.map((w) => [w.id, w]));
        await weTable.clear();
        await weTable.bulkAdd(SEED_WORKOUT_EXERCISES);
        const newIdByKey = new Map(
          SEED_WORKOUT_EXERCISES.map((w) => [`${w.workoutId}|${w.exerciseId}`, w.id])
        );
        await tx
          .table("setLogs")
          .toCollection()
          .modify((log: SetLog) => {
            if (!log.workoutExerciseId) return; // freestyle/imported sets have none
            const old = oldById.get(log.workoutExerciseId);
            if (!old) return; // already new-style or unknown — leave untouched
            const next = newIdByKey.get(`${old.workoutId}|${old.exerciseId}`);
            if (next) log.workoutExerciseId = next;
            // No new home (movement dropped from the program): keep the old id;
            // history stays queryable by exerciseId, it just isn't assigned.
          });

        // 3. Watch history backfill — stable ids make this idempotent.
        await tx.table("sessions").bulkPut(WATCH_SESSIONS);
      });

    /* v3 — reconstructed exercise detail for the watch strength sessions
     * (Chris described his actual freestyle back-day routine; sets are
     * flagged `estimated`). Also adds the freestyle machines to the catalog. */
    this.version(3)
      .stores({})
      .upgrade(async (tx) => {
        await tx.table("exercises").bulkPut(SEED_EXERCISES);
        await tx.table("setLogs").bulkPut(WATCH_SESSION_LOGS);
      });

    this.on("populate", () => this.seed());
  }

  private async seed() {
    const now = Date.now();
    await this.exercises.bulkAdd(SEED_EXERCISES);
    await this.programs.bulkAdd([{ ...SEED_PROGRAM, createdAt: now }]);
    await this.workouts.bulkAdd(SEED_WORKOUTS);
    await this.workoutExercises.bulkAdd(SEED_WORKOUT_EXERCISES);
    const demo = buildDemoHistory(now);
    await this.sessions.bulkAdd([demo.session, ...WATCH_SESSIONS]);
    await this.setLogs.bulkAdd([...demo.logs, ...WATCH_SESSION_LOGS]);
  }
}

export const db = new HailMaryDB();
