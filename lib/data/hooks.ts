"use client";

import { useReactiveQuery } from "./reactive";
import { repo, today } from "./repository";

/** Reactive reads — re-render automatically when the underlying tables change.
 *  Every hook is backed by the Repository; reactivity comes from
 *  useReactiveQuery (the single Dexie/useLiveQuery seam). Components import
 *  these hooks, never `db`. */

/* ---- catalog / program ---- */

export function usePrograms() {
  return useReactiveQuery(() => repo.getPrograms(), []);
}

export function useWorkouts(programId?: string) {
  return useReactiveQuery(
    () => (programId ? repo.getWorkouts(programId) : repo.getAllWorkouts()),
    [programId]
  );
}

export function useWorkout(workoutId: string) {
  return useReactiveQuery(() => repo.getWorkout(workoutId), [workoutId]);
}

export function useExercises() {
  return useReactiveQuery(() => repo.getExercises(), []);
}

export function useWorkoutExercises() {
  return useReactiveQuery(() => repo.getWorkoutExercises(), []);
}

export function useExerciseInstances(workoutId: string) {
  return useReactiveQuery(() => repo.getExerciseInstances(workoutId), [workoutId]);
}

/* ---- sessions ---- */

export function useSession(sessionId?: string) {
  return useReactiveQuery(
    () => (sessionId ? repo.getSession(sessionId) : undefined),
    [sessionId]
  );
}

export function useAllSessions() {
  return useReactiveQuery(() => repo.getAllSessions(), []);
}

/** Completed sessions, newest first. */
export function useCompletedSessions() {
  return useReactiveQuery(() => repo.getCompletedSessions(), []);
}

export function useOpenSessions() {
  return useReactiveQuery(() => repo.getOpenSessions(), []);
}

/* ---- set logs ---- */

export function useSessionLogs(sessionId?: string) {
  return useReactiveQuery(
    () => (sessionId ? repo.getSetLogs(sessionId) : Promise.resolve([])),
    [sessionId]
  );
}

export function useAllSetLogs() {
  return useReactiveQuery(() => repo.getAllSetLogs(), []);
}

export function useSessionInstanceLogs(sessionId: string | null, workoutExerciseId: string) {
  return useReactiveQuery(
    () =>
      sessionId
        ? repo.getSessionInstanceLogs(sessionId, workoutExerciseId)
        : Promise.resolve([]),
    [sessionId, workoutExerciseId]
  );
}

export function useSessionExerciseLogs(sessionId: string | null, exerciseId: string) {
  return useReactiveQuery(
    () =>
      sessionId ? repo.getSessionExerciseLogs(sessionId, exerciseId) : Promise.resolve([]),
    [sessionId, exerciseId]
  );
}

export function useLastEntry(workoutExerciseId: string, excludeSessionId?: string) {
  return useReactiveQuery(
    () => repo.getLastEntry(workoutExerciseId, excludeSessionId),
    [workoutExerciseId, excludeSessionId]
  );
}

/* ---- readiness ---- */

export function useTodayReadiness() {
  return useReactiveQuery(() => repo.getReadiness(today()), []);
}

export function useWeeklyReadiness() {
  return useReactiveQuery(() => repo.getWeeklyReadiness(), []);
}

export function useLatestReadiness() {
  return useReactiveQuery(() => repo.getLatestReadiness(), []);
}

/* ---- gear ---- */

export function useGear(exerciseId: string) {
  return useReactiveQuery(() => repo.getGear(exerciseId), [exerciseId]);
}
