"use client";

import { supabase } from "./supabase";
import { repo, ALL_TABLES } from "./repository";

/**
 * Manual cloud sync (Phase 2, step 1): whole-database push / pull between the
 * local Dexie cache and Supabase, reusing the repo's `exportAll` / `importAll`.
 *
 * Rows are keyed `(user_id, id)`, so a re-push is an idempotent upsert and a
 * pull overwrites local rows by id. This is deliberately the simple building
 * block the per-row realtime auto-sync (last-write-wins on `updated_at`) grows
 * from — the row mapping here is exactly what auto-sync reuses.
 */

// Upsert conflict targets. Every table is keyed (user_id, id) except these,
// which are keyed by the thing they annotate.
const CONFLICT: Record<string, string> = {
  exerciseGear: "user_id,exerciseId",
  planOverrides: "user_id,workoutExerciseId",
  planPublications: "user_id,workoutId",
};

/**
 * Push every local row to Supabase for the signed-in user. Returns row counts.
 *
 * One failing table no longer aborts the whole push. A table the cloud schema
 * doesn't have yet (a new local table whose migration hasn't been run) used to
 * take every other table down with it — so a schema lag looked like "none of my
 * data is backed up". Each table is now independent, and the failures are
 * reported together at the end.
 */
export async function pushToCloud(userId: string): Promise<Record<string, number>> {
  if (!supabase) throw new Error("cloud-not-configured");
  const tables = await repo.exportAll();
  const counts: Record<string, number> = {};
  const failures: string[] = [];
  for (const [table, rows] of Object.entries(tables)) {
    if (!rows.length) continue;
    const stamped = rows.map((r) => ({ ...(r as Record<string, unknown>), user_id: userId }));
    const { error } = await supabase
      .from(table)
      .upsert(stamped, { onConflict: CONFLICT[table] ?? "user_id,id" });
    if (error) failures.push(`${table}: ${error.message}`);
    else counts[table] = rows.length;
  }
  if (failures.length) throw new Error(failures.join(" · "));
  return counts;
}

/** Pull every row from Supabase into the local Dexie cache. Returns row counts. */
export async function pullFromCloud(): Promise<Record<string, number>> {
  if (!supabase) throw new Error("cloud-not-configured");
  const tables: Record<string, unknown[]> = {};
  const failures: string[] = [];
  for (const table of ALL_TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      // Same reasoning as push: a table the cloud doesn't have yet must not
      // block the tables it does have from coming down.
      failures.push(`${table}: ${error.message}`);
      continue;
    }
    // Strip the cloud-only columns so local rows stay pure Dexie shapes.
    tables[table] = (data ?? []).map((row) => {
      const rest = { ...(row as Record<string, unknown>) };
      delete rest.user_id;
      delete rest.updated_at;
      return rest;
    });
  }
  const counts = await repo.importAll(tables);
  if (failures.length) throw new Error(failures.join(" · "));
  return counts;
}
