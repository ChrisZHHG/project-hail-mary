import Dexie from "dexie";
import { db } from "./db";
import { scoreReadiness, type ReadinessExtras, type ReadinessInput } from "./readiness";
import { normalizeAssignmentOrder, tagLogsWithExercise } from "./migrations";
import type {
  Exercise,
  ExerciseGear,
  ExerciseInstance,
  PlanOverride,
  PlanPublication,
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
  /** Every program, archived ones included — the program list offers to restore. */
  getPrograms(): Promise<Program[]>;
  /** The unarchived program with the greatest `activatedAt` (newest `createdAt`
   *  breaks ties), or undefined when there is no unarchived program. */
  getActiveProgram(): Promise<Program | undefined>;

  /* ---- authoring ----
   * "Delete" archives; see `Workout.archivedAt` for why. Every multi-row write
   * below runs in one `db.transaction("rw", …)` — a half-archived program is a
   * worse state than either end of the operation. */

  createProgram(name: string): Promise<Program>;
  updateProgram(programId: string, patch: { name?: string }): Promise<void>;
  /** Archive a program and everything under it. If it was active, the next most
   *  recently activated unarchived program takes over. */
  archiveProgram(programId: string): Promise<void>;
  /** Un-archive a program (and its days/assignments) and make it active again. */
  restoreProgram(programId: string): Promise<void>;
  /** Deep-copy a program under fresh ids — the "new block" / "new client" move.
   *  Copies structure only; no session or set history comes with it. */
  duplicateProgram(programId: string, name?: string): Promise<Program>;

  createWorkout(
    programId: string,
    input: { name: string; subtitle?: string; scheduledDow?: number }
  ): Promise<Workout>;
  updateWorkout(
    workoutId: string,
    patch: Partial<Pick<Workout, "name" | "subtitle" | "scheduledDow">>
  ): Promise<void>;
  /** Archive a day and its assignments, and drop any sign-off it carried. */
  archiveWorkout(workoutId: string): Promise<void>;
  reorderWorkouts(programId: string, orderedIds: string[]): Promise<void>;

  addAssignment(
    workoutId: string,
    input: Omit<WorkoutExercise, "id" | "workoutId" | "order" | "archivedAt">
  ): Promise<WorkoutExercise>;
  /** `exerciseId` is deliberately not patchable: retargeting an assignment in
   *  place would leave one row meaning different movements at different times.
   *  Swapping a movement is archive-then-add. */
  updateAssignment(
    assignmentId: string,
    patch: Partial<
      Omit<WorkoutExercise, "id" | "workoutId" | "exerciseId" | "order" | "archivedAt">
    >
  ): Promise<void>;
  archiveAssignment(assignmentId: string): Promise<void>;
  reorderAssignments(workoutId: string, orderedIds: string[]): Promise<void>;
  /** Make a program the active one. */
  setActiveProgram(programId: string): Promise<void>;
  /** Days of the active program, in `dayOrder`. Empty when no program is active. */
  getActiveWorkouts(): Promise<Workout[]>;
  /** Assignments belonging to the active program — "what this week should contain". */
  getActiveWorkoutExercises(): Promise<WorkoutExercise[]>;
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

  /** The coach's sign-off for a day, if it has been sent. */
  getPublication(workoutId: string): Promise<PlanPublication | undefined>;
  getPublications(): Promise<PlanPublication[]>;
  /** Send the draft to the client. `by` records whether a human or the deadline did it. */
  publishPlan(workoutId: string, by: "coach" | "auto", note?: string): Promise<void>;
  unpublishPlan(workoutId: string): Promise<void>;

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
  "planPublications",
] as const;

/** Drop the archive stamp rather than storing an explicit `undefined`. */
function unarchive<T extends { archivedAt?: number }>(row: T): T {
  const next = { ...row };
  delete next.archivedAt;
  return next;
}

class DexieRepository implements Repository {
  getPrograms() {
    return db.programs.toArray();
  }

  getWorkouts(programId: string) {
    return db.workouts.where("programId").equals(programId).sortBy("dayOrder");
  }

  async getActiveProgram() {
    const programs = (await db.programs.toArray()).filter((p) => p.archivedAt == null);
    if (programs.length === 0) return undefined;
    // Greatest activatedAt wins. createdAt breaks ties and covers programs that
    // predate activation entirely — falling back to *a* program beats telling a
    // lifter with a program that they have none.
    return programs.sort(
      (a, b) => (b.activatedAt ?? 0) - (a.activatedAt ?? 0) || b.createdAt - a.createdAt
    )[0];
  }

  /**
   * An `activatedAt` strictly greater than every existing one.
   *
   * `Date.now()` alone isn't enough. Two activations inside the same
   * millisecond tie, and `getActiveProgram`'s `createdAt` tiebreak can then hand
   * the win to the other program — i.e. you activate one and a different one
   * becomes active. Rare in a user's hands, immediate in a test, and wrong
   * either way; making the stamp monotonic removes the dependency on clock
   * resolution entirely.
   */
  private async nextActivation() {
    const programs = await db.programs.toArray();
    const max = programs.reduce((m, p) => Math.max(m, p.activatedAt ?? 0), 0);
    return Math.max(Date.now(), max + 1);
  }

  async setActiveProgram(programId: string) {
    await db.transaction("rw", db.programs, async () => {
      await db.programs.update(programId, { activatedAt: await this.nextActivation() });
    });
  }

  async getActiveWorkouts() {
    const active = await this.getActiveProgram();
    if (!active) return [];
    const workouts = await this.getWorkouts(active.id);
    return workouts.filter((w) => w.archivedAt == null);
  }

  async getActiveWorkoutExercises() {
    const workouts = await this.getActiveWorkouts();
    const ids = new Set(workouts.map((w) => w.id));
    const all = await db.workoutExercises.toArray();
    return all.filter((w) => w.archivedAt == null && ids.has(w.workoutId));
  }

  /* ---- authoring ---- */

  async createProgram(name: string) {
    const program: Program = { id: uid(), name, createdAt: Date.now(), activatedAt: 0 };
    await db.transaction("rw", db.programs, async () => {
      program.activatedAt = await this.nextActivation();
      await db.programs.add(program);
    });
    return program;
  }

  async updateProgram(programId: string, patch: { name?: string }) {
    await db.programs.update(programId, patch);
  }

  async archiveProgram(programId: string) {
    const now = Date.now();
    await db.transaction("rw", db.programs, db.workouts, db.workoutExercises, async () => {
      const workouts = await db.workouts.where("programId").equals(programId).toArray();
      const workoutIds = new Set(workouts.map((w) => w.id));
      const assignments = (await db.workoutExercises.toArray()).filter((a) =>
        workoutIds.has(a.workoutId)
      );
      await db.workoutExercises.bulkPut(assignments.map((a) => ({ ...a, archivedAt: now })));
      await db.workouts.bulkPut(workouts.map((w) => ({ ...w, archivedAt: now })));
      await db.programs.update(programId, { archivedAt: now });
    });
  }

  async restoreProgram(programId: string) {
    await db.transaction("rw", db.programs, db.workouts, db.workoutExercises, async () => {
      const workouts = await db.workouts.where("programId").equals(programId).toArray();
      const workoutIds = new Set(workouts.map((w) => w.id));
      const assignments = (await db.workoutExercises.toArray()).filter((a) =>
        workoutIds.has(a.workoutId)
      );
      await db.workoutExercises.bulkPut(assignments.map(unarchive));
      await db.workouts.bulkPut(workouts.map(unarchive));
      // Restoring is an explicit "I want this one back", so it also activates.
      await db.programs.update(programId, {
        archivedAt: undefined,
        activatedAt: await this.nextActivation(),
      });
    });
  }

  async duplicateProgram(programId: string, name?: string) {
    const copy: Program = { id: uid(), name: name ?? "", createdAt: Date.now(), activatedAt: 0 };
    await db.transaction("rw", db.programs, db.workouts, db.workoutExercises, async () => {
      const source = await db.programs.get(programId);
      if (!source) throw new Error(`no such program: ${programId}`);
      copy.name = name ?? `${source.name} (copy)`;
      copy.activatedAt = await this.nextActivation();

      const workouts = await db.workouts.where("programId").equals(programId).sortBy("dayOrder");
      const live = workouts.filter((w) => w.archivedAt == null);
      const byOldWorkoutId = new Map(live.map((w) => [w.id, uid()]));
      const assignments = (await db.workoutExercises.toArray()).filter(
        (a) => a.archivedAt == null && byOldWorkoutId.has(a.workoutId)
      );

      await db.programs.add(copy);
      await db.workouts.bulkAdd(
        live.map((w) => ({ ...w, id: byOldWorkoutId.get(w.id)!, programId: copy.id }))
      );
      // Fresh assignment ids, so not one existing SetLog points into the copy.
      await db.workoutExercises.bulkAdd(
        assignments.map((a) => ({ ...a, id: uid(), workoutId: byOldWorkoutId.get(a.workoutId)! }))
      );
    });
    return copy;
  }

  async createWorkout(
    programId: string,
    input: { name: string; subtitle?: string; scheduledDow?: number }
  ) {
    const existing = await db.workouts.where("programId").equals(programId).toArray();
    const dayOrder = existing.reduce((max, w) => Math.max(max, w.dayOrder + 1), 0);
    const workout: Workout = { id: uid(), programId, dayOrder, ...input };
    await db.workouts.add(workout);
    return workout;
  }

  async updateWorkout(
    workoutId: string,
    patch: Partial<Pick<Workout, "name" | "subtitle" | "scheduledDow">>
  ) {
    await db.workouts.update(workoutId, patch);
  }

  async archiveWorkout(workoutId: string) {
    const now = Date.now();
    await db.transaction("rw", db.workouts, db.workoutExercises, db.planPublications, async () => {
      const assignments = await db.workoutExercises.where("workoutId").equals(workoutId).toArray();
      await db.workoutExercises.bulkPut(assignments.map((a) => ({ ...a, archivedAt: now })));
      await db.workouts.update(workoutId, { archivedAt: now });
      // A sign-off outlives the day it signed off. `draftState` checks for the
      // publication row *before* it looks at any schedule, so leaving one behind
      // would make a restored day's coach edits live without anyone sending them.
      await db.planPublications.delete(workoutId);
    });
  }

  async reorderWorkouts(programId: string, orderedIds: string[]) {
    await db.transaction("rw", db.workouts, async () => {
      const workouts = await db.workouts.where("programId").equals(programId).toArray();
      const rank = new Map(orderedIds.map((id, i) => [id, i]));
      // Anything the caller didn't mention keeps its relative position, after
      // everything it did.
      const ordered = [...workouts].sort(
        (a, b) =>
          (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity) || a.dayOrder - b.dayOrder
      );
      await db.workouts.bulkPut(ordered.map((w, i) => ({ ...w, dayOrder: i })));
    });
  }

  async addAssignment(
    workoutId: string,
    input: Omit<WorkoutExercise, "id" | "workoutId" | "order" | "archivedAt">
  ) {
    const existing = await db.workoutExercises.where("workoutId").equals(workoutId).toArray();
    const order = existing.reduce((max, a) => Math.max(max, Number(a.order) + 1 || 0), 0);
    const assignment: WorkoutExercise = { ...input, id: uid(), workoutId, order };
    await db.workoutExercises.add(assignment);
    return assignment;
  }

  async updateAssignment(
    assignmentId: string,
    patch: Partial<
      Omit<WorkoutExercise, "id" | "workoutId" | "exerciseId" | "order" | "archivedAt">
    >
  ) {
    await db.workoutExercises.update(assignmentId, patch);
  }

  async archiveAssignment(assignmentId: string) {
    // Left alone on purpose: any planOverride keyed by this id. Ids are never
    // reused, so it can never match a future assignment — it is inert, and
    // deleting it would be a second write for no behavioural difference.
    await db.workoutExercises.update(assignmentId, { archivedAt: Date.now() });
  }

  async reorderAssignments(workoutId: string, orderedIds: string[]) {
    await db.transaction("rw", db.workoutExercises, async () => {
      const assignments = await db.workoutExercises.where("workoutId").equals(workoutId).toArray();
      const rank = new Map(orderedIds.map((id, i) => [id, i]));
      const ordered = [...assignments].sort(
        (a, b) =>
          (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity) ||
          Number(a.order) - Number(b.order)
      );
      ordered.forEach((a, i) => (a.order = i));
      // Belt and braces: the caller supplied the sequence, but the invariant that
      // `order` is a unique number per workout is this layer's to keep.
      normalizeAssignmentOrder(ordered);
      await db.workoutExercises.bulkPut(ordered);
    });
  }

  /* ---- reads ---- */

  getWorkout(workoutId: string) {
    return db.workouts.get(workoutId);
  }

  async getExerciseInstances(workoutId: string): Promise<ExerciseInstance[]> {
    const assignments = await db.workoutExercises
      .where("[workoutId+order]")
      .between([workoutId, Dexie.minKey], [workoutId, Dexie.maxKey])
      .toArray();
    const live = assignments.filter((a) => a.archivedAt == null);
    const exercises = await db.exercises.bulkGet(live.map((a) => a.exerciseId));
    // `bulkGet` returns undefined for a key it can't find, so the old
    // `exercises[i]!` was a lie: an assignment pointing at a deleted exercise
    // produced `exercise: undefined`, and ExecutionCard reads `exercise.category`
    // during render — a TypeError into the error boundary, taking the whole
    // session with it. Skip the orphan instead; the row stays in the database.
    // Iterate `live`, not `assignments` — `exercises` is indexed against `live`,
    // so walking the unfiltered array pairs rows with the wrong exercise.
    return live.flatMap((a, i) => {
      const exercise = exercises[i];
      return exercise ? [{ ...a, exercise }] : [];
    });
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
    // Record the exercise as a fact, not just the assignment that prescribed it.
    // The program logger passes `workoutExerciseId` alone, but an assignment is
    // plan data a coach can later retarget or delete — and a set that never
    // recorded its own movement becomes unattributable the moment that happens,
    // silently taking its history with it. Done here rather than at the three
    // call sites so they cannot drift apart.
    const exerciseId =
      log.exerciseId ??
      (log.workoutExerciseId
        ? (await db.workoutExercises.get(log.workoutExerciseId))?.exerciseId
        : undefined);
    const record: SetLog = {
      ...log,
      exerciseId,
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

  getPublication(workoutId: string) {
    return db.planPublications.get(workoutId);
  }

  getPublications() {
    return db.planPublications.toArray();
  }

  async publishPlan(workoutId: string, by: "coach" | "auto", note?: string) {
    await db.planPublications.put({ workoutId, publishedAt: Date.now(), by, note });
  }

  async unpublishPlan(workoutId: string) {
    await db.planPublications.delete(workoutId);
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
    /* Restore and cloud-pull are the *other* door into these tables, and unlike
     * the Dexie upgrade chain they carry no version. A backup taken before v14
     * or v15 — or a row written by a client still on an older build — would
     * otherwise walk straight past the migrations and reintroduce exactly the
     * states they removed: sets with no exercise recorded (whose history
     * disappears the moment their assignment is deleted) and assignments with an
     * `order` IndexedDB can't index (invisible in the session, but still
     * counted in planned volume). Same functions the migrations use. */
    const assignments = (tables.workoutExercises as WorkoutExercise[] | undefined) ?? [];
    if (assignments.length) normalizeAssignmentOrder(assignments);

    const logs = tables.setLogs as SetLog[] | undefined;
    if (logs?.length) {
      // Incoming assignments win over local ones of the same id.
      const known = [...(await db.workoutExercises.toArray()), ...assignments];
      tagLogsWithExercise(logs, known);
    }

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
