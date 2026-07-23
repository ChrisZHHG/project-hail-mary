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

// Upsert conflict targets. Every table is keyed (user_id, id) except gear.
const CONFLICT: Record<string, string> = {
  exerciseGear: "user_id,exerciseId",
};

/** Push every local row to Supabase for the signed-in user. Returns row counts. */
export async function pushToCloud(userId: string): Promise<Record<string, number>> {
  if (!supabase) throw new Error("cloud-not-configured");
  const tables = await repo.exportAll();
  const counts: Record<string, number> = {};
  for (const [table, rows] of Object.entries(tables)) {
    if (!rows.length) continue;
    const stamped = rows.map((r) => ({ ...(r as Record<string, unknown>), user_id: userId }));
    const { error } = await supabase
      .from(table)
      .upsert(stamped, { onConflict: CONFLICT[table] ?? "user_id,id" });
    if (error) throw new Error(`${table}: ${error.message}`);
    counts[table] = rows.length;
  }
  return counts;
}

/** Pull every row from Supabase into the local Dexie cache. Returns row counts. */
export async function pullFromCloud(): Promise<Record<string, number>> {
  if (!supabase) throw new Error("cloud-not-configured");
  const tables: Record<string, unknown[]> = {};
  for (const table of ALL_TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw new Error(`${table}: ${error.message}`);
    // Strip the cloud-only columns so local rows stay pure Dexie shapes.
    tables[table] = (data ?? []).map((row) => {
      const rest = { ...(row as Record<string, unknown>) };
      delete rest.user_id;
      delete rest.updated_at;
      return rest;
    });
  }
  return repo.importAll(tables);
}
