"use client";

import { useEffect, useMemo, useState } from "react";
import { nextOccurrence } from "../ics";
import {
  applyOverride,
  coachEditsAreLive,
  draftState,
  hoursUntilAutoPublish,
  lastSessionSetsFor,
  nextWorkout,
  recentTopSets,
  stallLength,
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

/** A workout by id. `undefined` = still loading, `null` = no such workout.
 *  The repo returns `undefined` for both, which is fine for a static route whose
 *  ids were fixed at build time — but `/session/[workoutId]` now renders any id,
 *  so a caller has to be able to tell "not loaded yet" from "doesn't exist" or a
 *  bad id spins on the loading state forever. */
export function useWorkout(workoutId: string) {
  return useReactiveQuery(
    async () => (await repo.getWorkout(workoutId)) ?? null,
    [workoutId]
  );
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
  const overrides = usePlanOverrides();

  return useMemo(() => {
    if (!instances || !allLogs || !sessions || !wexs || !overrides) return undefined;
    const dates = new Map(sessions.map((s) => [s.id, s.date]));
    const overrideBy = new Map(overrides.map((o) => [o.workoutExerciseId, o]));
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
        const computed = prescribe({
          targetSets: instance.targetSets,
          targetRepsRange: instance.targetRepsRange,
          targetRir: instance.targetRir,
          last: topSet(lastSets),
          isWeighted: instance.exercise.isWeighted,
          readiness: weekly?.level,
          soreness: weekly?.soreMap?.[instance.exercise.targetMuscle],
        });
        // The coach's edit wins over the engine — and says so.
        const override = overrideBy.get(instance.id);
        const mine = allLogs.filter((l) => l.workoutExerciseId === instance.id);
        // The evidence behind the number: what the last few sessions did.
        const trend = recentTopSets({
          exerciseId: instance.exerciseId,
          setLogs: allLogs,
          workoutExercises: wexs,
          sessionDates: dates,
          limit: 5,
        });
        return {
          instance,
          lastSets,
          trend,
          stalled: stallLength(trend),
          override,
          rx: applyOverride(computed, override, mine),
        };
      });
  }, [instances, allLogs, sessions, wexs, weekly, overrides]);
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

/** Live coach overrides on the engine's proposal. */
export function usePlanOverrides() {
  return useReactiveQuery(() => repo.getPlanOverrides(), []);
}

/**
 * Whether one day's draft has been sent, and when it releases itself if not.
 *
 * `scheduledAt` is computed on the client after mount — it depends on the local
 * weekday, so deriving it during render would drift between the prerendered
 * HTML and the browser.
 */
export function usePublicationState(workoutId?: string) {
  const publication = useReactiveQuery(
    () => (workoutId ? repo.getPublication(workoutId) : Promise.resolve(undefined)),
    [workoutId]
  );
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clock is client-only; avoids hydration drift
    setNow(Date.now());
  }, [workoutId]);

  return useMemo(() => {
    if (!workoutId || now == null) return undefined;
    const input = { publication, scheduledAt: nextOccurrence(workoutId), now };
    return {
      publication,
      state: draftState(input),
      editsLive: coachEditsAreLive(input),
      hoursLeft: hoursUntilAutoPublish(input),
    };
  }, [workoutId, publication, now]);
}

/* ---- gear ---- */

export function useGear(exerciseId: string) {
  return useReactiveQuery(() => repo.getGear(exerciseId), [exerciseId]);
}
