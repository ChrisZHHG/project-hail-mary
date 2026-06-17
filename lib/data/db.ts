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
    this.on("populate", () => this.seed());
  }

  private async seed() {
    const now = Date.now();
    await this.exercises.bulkAdd(SEED_EXERCISES);
    await this.programs.bulkAdd([{ ...SEED_PROGRAM, createdAt: now }]);
    await this.workouts.bulkAdd(SEED_WORKOUTS);
    await this.workoutExercises.bulkAdd(SEED_WORKOUT_EXERCISES);
    const demo = buildDemoHistory(now);
    await this.sessions.bulkAdd([demo.session]);
    await this.setLogs.bulkAdd(demo.logs);
  }
}

export const db = new HailMaryDB();
