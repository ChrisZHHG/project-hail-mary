import Dexie from "dexie";
import { db } from "./db";
import { scoreReadiness, type ReadinessInput } from "./readiness";
import type {
  ExerciseInstance,
  Program,
  ReadinessCheck,
  Session,
  SetLog,
  Workout,
} from "./types";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

export const today = () => new Date().toISOString().slice(0, 10);

/**
 * Data-access seam. The whole app depends on this interface, not on Dexie — so a
 * `SupabaseRepository` (cloud sync + coach/client roles) can drop in later
 * without touching any component. See README "Going multi-user".
 */
export interface Repository {
  getPrograms(): Promise<Program[]>;
  getWorkouts(programId: string): Promise<Workout[]>;
  getWorkout(workoutId: string): Promise<Workout | undefined>;
  /** Joined + ordered assignments the logger renders. */
  getExerciseInstances(workoutId: string): Promise<ExerciseInstance[]>;
  /** Most recent completed entry for an exercise (for "last time" + prefill). */
  getLastEntry(workoutExerciseId: string, excludeSessionId?: string): Promise<SetLog | undefined>;

  getActiveSession(workoutId: string): Promise<Session | undefined>;
  startSession(workoutId: string): Promise<Session>;
  completeSession(sessionId: string): Promise<void>;
  getSession(sessionId: string): Promise<Session | undefined>;
  getSetLogs(sessionId: string): Promise<SetLog[]>;
  upsertSet(log: Omit<SetLog, "id" | "timestamp"> & { id?: string }): Promise<SetLog>;
  deleteSet(id: string): Promise<void>;

  saveReadiness(input: ReadinessInput): Promise<ReadinessCheck>;
  getReadiness(date: string): Promise<ReadinessCheck | undefined>;
  getLatestReadiness(): Promise<ReadinessCheck | undefined>;
}

class DexieRepository implements Repository {
  getPrograms() {
    return db.programs.toArray();
  }

  getWorkouts(programId: string) {
    return db.workouts.where("programId").equals(programId).sortBy("dayOrder");
  }

  getWorkout(workoutId: string) {
    return db.workouts.get(workoutId);
  }

  async getExerciseInstances(workoutId: string): Promise<ExerciseInstance[]> {
    const assignments = await db.workoutExercises
      .where("[workoutId+order]")
      .between([workoutId, Dexie.minKey], [workoutId, Dexie.maxKey])
      .toArray();
    const exercises = await db.exercises.bulkGet(assignments.map((a) => a.exerciseId));
    return assignments.map((a, i) => ({ ...a, exercise: exercises[i]! }));
  }

  async getLastEntry(workoutExerciseId: string, excludeSessionId?: string) {
    const entries = await db.setLogs
      .where("[workoutExerciseId+timestamp]")
      .between([workoutExerciseId, Dexie.minKey], [workoutExerciseId, Dexie.maxKey])
      .reverse()
      .toArray();
    return entries.find(
      (e) => e.done && e.sessionId !== excludeSessionId && (e.weight != null || e.reps != null)
    );
  }

  getActiveSession(workoutId: string) {
    return db.sessions
      .where("workoutId")
      .equals(workoutId)
      .filter((s) => s.completedAt == null)
      .first();
  }

  async startSession(workoutId: string) {
    const existing = await this.getActiveSession(workoutId);
    if (existing) return existing;
    const session: Session = {
      id: uid(),
      workoutId,
      date: today(),
      startedAt: Date.now(),
    };
    await db.sessions.add(session);
    return session;
  }

  async completeSession(sessionId: string) {
    await db.sessions.update(sessionId, { completedAt: Date.now() });
  }

  getSession(sessionId: string) {
    return db.sessions.get(sessionId);
  }

  getSetLogs(sessionId: string) {
    return db.setLogs.where("sessionId").equals(sessionId).toArray();
  }

  async upsertSet(log: Omit<SetLog, "id" | "timestamp"> & { id?: string }) {
    const record: SetLog = {
      ...log,
      id: log.id ?? uid(),
      timestamp: Date.now(),
    };
    await db.setLogs.put(record);
    return record;
  }

  async deleteSet(id: string) {
    await db.setLogs.delete(id);
  }

  async saveReadiness(input: ReadinessInput) {
    const { totalScore, level, recommendation } = scoreReadiness(input);
    const date = today();
    const existing = await db.readinessChecks.where("date").equals(date).first();
    const record: ReadinessCheck = {
      id: existing?.id ?? uid(),
      date,
      ...input,
      totalScore,
      level,
      recommendation,
      timestamp: Date.now(),
    };
    await db.readinessChecks.put(record);
    return record;
  }

  getReadiness(date: string) {
    return db.readinessChecks.where("date").equals(date).first();
  }

  async getLatestReadiness() {
    return db.readinessChecks.orderBy("timestamp").last();
  }
}

export const repo: Repository = new DexieRepository();
