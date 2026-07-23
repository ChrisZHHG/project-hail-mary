"use client";

import { useLiveQuery } from "dexie-react-hooks";

/**
 * The app's one and only reactive-read primitive.
 *
 * Today it delegates to Dexie's `useLiveQuery`, which instruments every
 * IndexedDB read performed while the query runs — even when that read happens
 * inside a `Repository` method on another module — and re-runs the query when
 * any touched table changes. That's why every hook can route through `repo.*`
 * and still stay live.
 *
 * This is the single seam a non-Dexie backend swaps: a `SupabaseRepository`
 * would replace this function with one that runs the query once and re-runs it
 * on a realtime subscription (or a change-bus tick). Nothing else in the app
 * imports `dexie-react-hooks`, so the swap is contained here.
 */
export function useReactiveQuery<T>(
  query: () => T | Promise<T>,
  deps: unknown[]
): T | undefined {
  return useLiveQuery(query, deps);
}
