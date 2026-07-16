import Dexie, { type Table } from "dexie";
import type {
  Exercise,
  ExerciseGear,
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
import {
  WATCH_SESSIONS,
  WATCH_SESSION_LOGS,
  JULY15_SESSION,
  JULY15_LOGS,
  JULY14_TOEPRESS_SESSION,
  JULY14_TOEPRESS_LOGS,
} from "./watchHistory";

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
  exerciseGear!: Table<ExerciseGear, string>;

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

    /* v4 — corrected reconstruction after Chris clarified his solo split
     * (back + abs + biceps + triceps lateral head; the rope work is a tricep
     * pushdown, not a back pulldown). Reconstructed logs are regenerated
     * wholesale: they all share the `log-watch-` id prefix, so this never
     * touches live in-app logs. */
    this.version(4)
      .stores({})
      .upgrade(async (tx) => {
        await tx.table("exercises").bulkPut(SEED_EXERCISES);
        await tx.table("exercises").delete("ex-ropePulldown"); // mis-assigned in v3
        await tx.table("setLogs").where("id").startsWith("log-watch-").delete();
        await tx.table("setLogs").bulkAdd(WATCH_SESSION_LOGS);
      });

    /* v5 — visual recognition: exercises gain 中文名 (aliasZh) + pictogram
     * pattern keys for the freestyle picker. Pure catalog refresh. */
    this.version(5)
      .stores({})
      .upgrade(async (tx) => {
        await tx.table("exercises").bulkPut(SEED_EXERCISES);
      });

    /* v6 — July 15 2026 real freestyle session, dictated by Chris (grip
     * variants included). Stable ids → idempotent. */
    this.version(6)
      .stores({})
      .upgrade(async (tx) => {
        await tx.table("sessions").bulkPut([JULY15_SESSION]);
        await tx.table("setLogs").bulkPut(JULY15_LOGS);
      });

    /* v7 — per-exercise machine-setup memory (seat/pulley/grip …). */
    this.version(7).stores({ exerciseGear: "exerciseId" });

    /* v8 — layered exercise media (wger.de line-art now, coach videos later).
     * Refresh catalog with `media` fields; `ex-lib-*` rows (added from the
     * curated library by the user) are untouched — existing installs get
     * images on their current machines. */
    this.version(8)
      .stores({})
      .upgrade(async (tx) => {
        await tx.table("exercises").bulkPut(SEED_EXERCISES);
      });

    /* v9 — July 14 Toe Press backfill + media denylist / catalog refresh
     * after wger white-bg cleanup (drop mismatched media → pictogram). */
    this.version(9)
      .stores({})
      .upgrade(async (tx) => {
        await tx.table("exercises").bulkPut(SEED_EXERCISES);
        await tx.table("sessions").bulkPut([JULY14_TOEPRESS_SESSION]);
        await tx.table("setLogs").bulkPut(JULY14_TOEPRESS_LOGS);
      });

    /* v10 — wger line-art allowlist: only simple drawings render as images;
     * anatomical matches (toe press, leg curl, …) fall back to pictograms. */
    this.version(10)
      .stores({})
      .upgrade(async (tx) => {
        await tx.table("exercises").bulkPut(SEED_EXERCISES);
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
    await this.sessions.bulkAdd([
      demo.session,
      ...WATCH_SESSIONS,
      JULY14_TOEPRESS_SESSION,
      JULY15_SESSION,
    ]);
    await this.setLogs.bulkAdd([
      ...demo.logs,
      ...WATCH_SESSION_LOGS,
      ...JULY14_TOEPRESS_LOGS,
      ...JULY15_LOGS,
    ]);
  }
}

export const db = new HailMaryDB();
