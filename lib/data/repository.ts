import Dexie from "dexie";
import { db } from "./db";
import { scoreReadiness, type ReadinessExtras, type ReadinessInput } from "./readiness";
import type {
  Exercise,
  ExerciseGear,
  ExerciseInstance,
  PlanOverride,
  Program,
  ReadinessCheck,
  Session,
  SetLog,
  Workout,
  WorkoutExercise,
} from "./types";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

/** Local YYYY-MM-DD (avoids UTC off-by-one near midnight). */
const localISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const today = () => localISO(new Date());

/** Monday-anchored start of the week containing `d`, as YYYY-MM-DD. */
export const weekStart = (d = new Date()) => {
  const date = new Date(d);
  const dow = (date.getDay() + 6) % 7; // 0 = Monday
  date.setDate(date.getDate() - dow);
  return localISO(date);
};

export const isWeekend = (d = new Date()) => d.getDay() === 0 || d.getDay() === 6;

/**
 * Data-access seam. The whole app depends on this interface, not on Dexie — so a
 * `SupabaseRepository` (cloud sync + coach/client roles) can drop in later
 * without touching any component. See README "Going multi-user".
 */
export interface Repository {
  /* ---- catalog / program (all-table reads back the reactive hooks) ---- */
  getPrograms(): Promise<Program[]>;
  getWorkouts(programId: string): Promise<Workout[]>;
  /** Every workout, ordered by dayOrder (no program filter). */
  getAllWorkouts(): Promise<Workout[]>;
  getWorkout(workoutId: string): Promise<Workout | undefined>;
  getExercises(): Promise<Exercise[]>;
  getWorkoutExercises(): Promise<WorkoutExercise[]>;
  /** Joined + ordered assignments the logger renders. */
  getExerciseInstances(workoutId: string): Promise<ExerciseInstance[]>;
  /** Add/overwrite one exercise (custom entry or library pick). Idempotent. */
  addExercise(exercise: Exercise): Promise<void>;

  /* ---- sessions ---- */
  getActiveSession(workoutId: string): Promise<Session | undefined>;
  getAllSessions(): Promise<Session[]>;
  /** Completed sessions, newest first. */
  getCompletedSessions(): Promise<Session[]>;
  /** Open (uncompleted) in-app sessions — excludes watch imports. */
  getOpenSessions(): Promise<Session[]>;
  /** The open freestyle session (no program workout), if any. */
  getOpenFreestyleSession(): Promise<Session | undefined>;
  startSession(workoutId: string): Promise<Session>;
  /** Freestyle = a session with no program workout; sets log by exerciseId. */
  startFreestyleSession(): Promise<Session>;
  completeSession(sessionId: string): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  /**
   * Open sessions from a previous calendar day: complete if they have any
   * done sets, otherwise delete the empty shell. Idempotent.
   */
  cleanupStaleOpenSessions(): Promise<void>;
  getSession(sessionId: string): Promise<Session | undefined>;
  /** Bulk import/upsert sessions (watch CSV paste). Stable ids → idempotent. */
  importSessions(sessions: Session[]): Promise<void>;

  /* ---- set logs ---- */
  getSetLogs(sessionId: string): Promise<SetLog[]>;
  getAllSetLogs(): Promise<SetLog[]>;
  /** Sets logged this session against a program assignment, ordered by set #. */
  getSessionInstanceLogs(sessionId: string, workoutExerciseId: string): Promise<SetLog[]>;
  /** Sets logged this session against a bare exercise, ordered by set #. */
  getSessionExerciseLogs(sessionId: string, exerciseId: string): Promise<SetLog[]>;
  /** Most recent completed entry for an exercise (for "last time" + prefill). */
  getLastEntry(workoutExerciseId: string, excludeSessionId?: string): Promise<SetLog | undefined>;
  /** Every set from the most recent session that trained this assignment — the
   *  group the coach engine picks a top set from (a back-off set is not a
   *  benchmark). Empty when there's no history. */
  getLastSessionSets(workoutExerciseId: string, excludeSessionId?: string): Promise<SetLog[]>;
  upsertSet(log: Omit<SetLog, "id" | "timestamp"> & { id?: string }): Promise<SetLog>;
  /** Patch a set in place — keeps its timestamp so history order stays stable. */
  updateSet(id: string, patch: Partial<Omit<SetLog, "id">>): Promise<void>;
  deleteSet(id: string): Promise<void>;

  /* ---- readiness ---- */
  saveReadiness(input: ReadinessInput & ReadinessExtras): Promise<ReadinessCheck>;
  getReadiness(date: string): Promise<ReadinessCheck | undefined>;
  getLatestReadiness(): Promise<ReadinessCheck | undefined>;
  /** The check-in for the current (Mon–Sun) week, if any. */
  getWeeklyReadiness(): Promise<ReadinessCheck | undefined>;

  /* ---- per-exercise gear (machine setup memory) ---- */
  /** Every live coach override, keyed by the assignment it edits. */
  getPlanOverrides(): Promise<PlanOverride[]>;
  /** Upsert the coach's edit for one assignment. Empty patch clears it. */
  savePlanOverride(
    workoutExerciseId: string,
    patch: Omit<PlanOverride, "workoutExerciseId" | "updatedAt">
  ): Promise<void>;
  clearPlanOverride(workoutExerciseId: string): Promise<void>;

  getGear(exerciseId: string): Promise<ExerciseGear | undefined>;
  /** Save setup values; empty values clears the row. Stamps updatedAt. */
  saveGear(exerciseId: string, values: Record<string, string>): Promise<void>;

  /* ---- full-database backup / restore ---- */
  exportAll(): Promise<Record<string, unknown[]>>;
  importAll(tables: Record<string, unknown[]>): Promise<Record<string, number>>;
  schemaVersion(): number;
}

/** Every table in the schema — the unit of a full backup/restore and cloud sync. */
export const ALL_TABLES = [
  "exercises",
  "programs",
  "workouts",
  "workoutExercises",
  "sessions",
  "setLogs",
  "readinessChecks",
  "exerciseGear",
  "planOverrides",
] as const;

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

  async getLastSessionSets(workoutExerciseId: string, excludeSessionId?: string) {
    const entries = await db.setLogs
      .where("[workoutExerciseId+timestamp]")
      .between([workoutExerciseId, Dexie.minKey], [workoutExerciseId, Dexie.maxKey])
      .reverse()
      .toArray();
    const usable = entries.filter(
      (e) => e.done && e.sessionId !== excludeSessionId && (e.weight != null || e.reps != null)
    );
    const sid = usable[0]?.sessionId;
    return sid ? usable.filter((e) => e.sessionId === sid) : [];
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

  async startFreestyleSession() {
    // Resume today's open freestyle session if one exists (no workoutId index
    // entry for these rows, so filter the small sessions table directly).
    const existing = await db.sessions
      .filter((s) => !s.workoutId && s.completedAt == null && s.source !== "watch")
      .first();
    if (existing) return existing;
    const session: Session = {
      id: uid(),
      date: today(),
      startedAt: Date.now(),
      source: "app",
      kind: "strength",
    };
    await db.sessions.add(session);
    return session;
  }

  async completeSession(sessionId: string) {
    await db.sessions.update(sessionId, { completedAt: Date.now() });
  }

  async cleanupStaleOpenSessions() {
    const todayStr = today();
    const open = await db.sessions
      .filter((s) => s.completedAt == null && s.source !== "watch")
      .toArray();
    for (const s of open) {
      if (s.date >= todayStr) continue;
      const logs = await db.setLogs.where("sessionId").equals(s.id).toArray();
      if (logs.some((l) => l.done)) {
        await db.sessions.update(s.id, { completedAt: Date.now() });
      } else {
        await db.sessions.delete(s.id);
      }
    }
  }

  getSession(sessionId: string) {
    return db.sessions.get(sessionId);
  }

  getSetLogs(sessionId: string) {
    return db.setLogs.where("sessionId").equals(sessionId).sortBy("setNumber");
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

  async saveReadiness(input: ReadinessInput & ReadinessExtras) {
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

  async getWeeklyReadiness() {
    const start = weekStart();
    const inWeek = await db.readinessChecks.where("date").aboveOrEqual(start).toArray();
    return inWeek.sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  /* ---- catalog / program ---- */
  getAllWorkouts() {
    return db.workouts.orderBy("dayOrder").toArray();
  }

  getExercises() {
    return db.exercises.toArray();
  }

  getWorkoutExercises() {
    return db.workoutExercises.toArray();
  }

  async addExercise(exercise: Exercise) {
    await db.exercises.put(exercise);
  }

  /* ---- sessions ---- */
  getAllSessions() {
    return db.sessions.toArray();
  }

  async getCompletedSessions() {
    const rows = await db.sessions.filter((s) => s.completedAt != null).toArray();
    return rows.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  }

  getOpenSessions() {
    return db.sessions.filter((s) => s.completedAt == null && s.source !== "watch").toArray();
  }

  getOpenFreestyleSession() {
    return db.sessions
      .filter((s) => !s.workoutId && s.completedAt == null && s.source !== "watch")
      .first();
  }

  async deleteSession(sessionId: string) {
    await db.sessions.delete(sessionId);
  }

  async importSessions(sessions: Session[]) {
    await db.sessions.bulkPut(sessions);
  }

  /* ---- set logs ---- */
  getAllSetLogs() {
    return db.setLogs.toArray();
  }

  getSessionInstanceLogs(sessionId: string, workoutExerciseId: string) {
    return db.setLogs
      .where("sessionId")
      .equals(sessionId)
      .and((l) => l.workoutExerciseId === workoutExerciseId)
      .sortBy("setNumber");
  }

  getSessionExerciseLogs(sessionId: string, exerciseId: string) {
    return db.setLogs
      .where("sessionId")
      .equals(sessionId)
      .and((l) => l.exerciseId === exerciseId)
      .sortBy("setNumber");
  }

  async updateSet(id: string, patch: Partial<Omit<SetLog, "id">>) {
    await db.setLogs.update(id, patch);
  }

  /* ---- gear ---- */
  getPlanOverrides() {
    return db.planOverrides.toArray();
  }

  async savePlanOverride(
    workoutExerciseId: string,
    patch: Omit<PlanOverride, "workoutExerciseId" | "updatedAt">
  ) {
    const hasEdit =
      patch.weight != null ||
      patch.reps != null ||
      patch.sets != null ||
      patch.skip === true ||
      !!patch.note?.trim();
    if (!hasEdit) {
      await db.planOverrides.delete(workoutExerciseId);
      return;
    }
    await db.planOverrides.put({ ...patch, workoutExerciseId, updatedAt: Date.now() });
  }

  async clearPlanOverride(workoutExerciseId: string) {
    await db.planOverrides.delete(workoutExerciseId);
  }

  getGear(exerciseId: string) {
    return db.exerciseGear.get(exerciseId);
  }

  async saveGear(exerciseId: string, values: Record<string, string>) {
    if (Object.keys(values).length === 0) {
      await db.exerciseGear.delete(exerciseId);
    } else {
      await db.exerciseGear.put({ exerciseId, values, updatedAt: Date.now() });
    }
  }

  /* ---- backup ---- */
  async exportAll() {
    const tables: Record<string, unknown[]> = {};
    for (const t of ALL_TABLES) tables[t] = await db.table(t).toArray();
    return tables;
  }

  async importAll(tables: Record<string, unknown[]>) {
    const counts: Record<string, number> = {};
    for (const t of ALL_TABLES) {
      const rows = tables[t];
      if (Array.isArray(rows) && rows.length) {
        await db.table(t).bulkPut(rows);
        counts[t] = rows.length;
      }
    }
    return counts;
  }

  schemaVersion() {
    return db.verno;
  }
}

export const repo: Repository = new DexieRepository();
