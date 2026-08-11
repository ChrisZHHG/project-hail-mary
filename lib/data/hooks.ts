"use client";

import { useMemo } from "react";
import {
  lastSessionSetsFor,
  nextWorkout,
  prescribe,
  topSet,
  weeklyMuscleVolume,
} from "../coach";
import { useReactiveQuery } from "./reactive";
import { repo, today, weekStart } from "./repository";

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

/**
 * Sets from the previous session that trained this *movement*, across every day
 * of the block — the group the engine picks a top set from. Keyed by exercise,
 * not assignment: the same movement carries a different `workoutExercise` id on
 * each block day, and progression has to see all of them.
 */
export function useLastSessionSetsForExercise(exerciseId: string, excludeSessionId?: string) {
  const logs = useAllSetLogs();
  const wexs = useWorkoutExercises();
  const sessions = useAllSessions();
  return useMemo(() => {
    if (!logs || !wexs || !sessions) return undefined;
    return lastSessionSetsFor({
      exerciseId,
      setLogs: logs,
      workoutExercises: wexs,
      sessionDates: new Map(sessions.map((s) => [s.id, s.date])),
      excludeSessionId,
    });
  }, [exerciseId, logs, wexs, sessions, excludeSessionId]);
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

/* ---- coach engine ---- */

/**
 * Which block day is up, and whether enough recovery has passed to train it.
 * Undefined until both queries land, so callers can show a loading state.
 */
export function useNextWorkout() {
  const workouts = useReactiveQuery(() => repo.getAllWorkouts(), []);
  const sessions = useReactiveQuery(() => repo.getCompletedSessions(), []);
  return useMemo(
    () =>
      workouts && sessions
        ? nextWorkout({ workouts, sessions, today: today() })
        : undefined,
    [workouts, sessions]
  );
}

/**
 * The engine's full call for the next session: every main movement with the
 * numbers to hit and why. This is the artifact a coach reviews before sending.
 */
export function useRecommendedSession(workoutId?: string) {
  const instances = useReactiveQuery(
    () => (workoutId ? repo.getExerciseInstances(workoutId) : Promise.resolve([])),
    [workoutId]
  );
  const allLogs = useAllSetLogs();
  const sessions = useReactiveQuery(() => repo.getAllSessions(), []);
  const wexs = useWorkoutExercises();
  const weekly = useWeeklyReadiness();

  return useMemo(() => {
    if (!instances || !allLogs || !sessions || !wexs) return undefined;
    const dates = new Map(sessions.map((s) => [s.id, s.date]));
    return instances
      .filter((i) => i.section === "main")
      .map((instance) => {
        // History follows the movement across all three block days, not this
        // day's assignment id — otherwise FB2 can't see what FB1 lifted.
        const lastSets = lastSessionSetsFor({
          exerciseId: instance.exerciseId,
          setLogs: allLogs,
          workoutExercises: wexs,
          sessionDates: dates,
        });
        return {
          instance,
          lastSets,
          rx: prescribe({
            targetSets: instance.targetSets,
            targetRepsRange: instance.targetRepsRange,
            targetRir: instance.targetRir,
            last: topSet(lastSets),
            isWeighted: instance.exercise.isWeighted,
            readiness: weekly?.level,
            soreness: weekly?.soreMap?.[instance.exercise.targetMuscle],
          }),
        };
      });
  }, [instances, allLogs, sessions, wexs, weekly]);
}

/** Weekly hard sets per muscle vs the block's plan and the evidence baseline. */
export function useWeeklyVolume() {
  const exercises = useExercises();
  const wexs = useWorkoutExercises();
  const logs = useAllSetLogs();
  const sessions = useReactiveQuery(() => repo.getAllSessions(), []);

  return useMemo(() => {
    if (!exercises || !wexs || !logs || !sessions) return undefined;
    return weeklyMuscleVolume({
      exercises,
      workoutExercises: wexs,
      setLogs: logs,
      sessionDates: new Map(sessions.map((s) => [s.id, s.date])),
      weekStart: weekStart(),
      today: today(),
    });
  }, [exercises, wexs, logs, sessions]);
}

/* ---- gear ---- */

export function useGear(exerciseId: string) {
  return useReactiveQuery(() => repo.getGear(exerciseId), [exerciseId]);
}
