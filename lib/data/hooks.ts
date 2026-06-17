"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { repo, today } from "./repository";

/** Reactive reads — re-render automatically when the underlying tables change. */

export function usePrograms() {
  return useLiveQuery(() => db.programs.toArray(), []);
}

export function useWorkouts(programId?: string) {
  return useLiveQuery(
    () => (programId ? repo.getWorkouts(programId) : db.workouts.orderBy("dayOrder").toArray()),
    [programId]
  );
}

export function useWorkout(workoutId: string) {
  return useLiveQuery(() => repo.getWorkout(workoutId), [workoutId]);
}

export function useExerciseInstances(workoutId: string) {
  return useLiveQuery(() => repo.getExerciseInstances(workoutId), [workoutId]);
}

export function useSessionLogs(sessionId?: string) {
  return useLiveQuery(
    () => (sessionId ? repo.getSetLogs(sessionId) : Promise.resolve([])),
    [sessionId]
  );
}

export function useTodayReadiness() {
  return useLiveQuery(() => repo.getReadiness(today()), []);
}

export function useWeeklyReadiness() {
  return useLiveQuery(() => repo.getWeeklyReadiness(), []);
}

export function useCompletedSessions() {
  return useLiveQuery(
    () =>
      db.sessions
        .filter((s) => s.completedAt != null)
        .toArray()
        .then((rows) => rows.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))),
    []
  );
}

export function useAllSetLogs() {
  return useLiveQuery(() => db.setLogs.toArray(), []);
}
