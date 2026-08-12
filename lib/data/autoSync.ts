"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { db } from "./db";
import { ALL_TABLES } from "./repository";
import { pushToCloud, pullFromCloud } from "./cloudSync";

/**
 * Auto-sync (Phase 2, option B): keeps Dexie and Supabase converged while
 * signed in. Local writes push automatically (debounced), and Supabase Realtime
 * streams remote INSERT/UPDATE back into Dexie — which re-renders the UI via the
 * `useReactiveQuery` seam. Dexie stays the source of truth for reads (offline).
 *
 * Scope (B): add / update only. DELETEs are NOT propagated yet (that needs
 * tombstones) — a row deleted on one device lingers on the others until then.
 *
 * Conflict handling is deliberately simple: at startup we push local first (so
 * this device's edits reach the cloud) then pull; thereafter it's last-write-
 * wins by arrival. True per-row LWW on `updated_at` + deletes come next.
 */

const CONFLICT: Record<string, string> = {
  exerciseGear: "user_id,exerciseId",
  planOverrides: "user_id,workoutExerciseId",
  planPublications: "user_id,workoutId",
};
const PK: Record<string, string> = {
  exerciseGear: "exerciseId",
  planOverrides: "workoutExerciseId",
  planPublications: "workoutId",
};
const pkOf = (t: string) => PK[t] ?? "id";

let currentUserId: string | null = null;
let started = false;
let applyingRemote = false; // guard: never re-push a realtime-applied write
let channel: RealtimeChannel | null = null;
let hooksRegistered = false;

// Outbound rows pending push, keyed `${table}:${id}` (deduped), flushed debounced.
const pending = new Map<string, { table: string; row: Record<string, unknown> }>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function enqueue(table: string, row: Record<string, unknown>) {
  if (!started || applyingRemote || !currentUserId) return;
  const id = row[pkOf(table)];
  if (id == null) return;
  pending.set(`${table}:${String(id)}`, { table, row });
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => void flush(), 500);
}

async function flush() {
  if (!supabase || !currentUserId || pending.size === 0) return;
  const batch = [...pending.values()];
  pending.clear();

  const byTable = new Map<string, Record<string, unknown>[]>();
  for (const { table, row } of batch) {
    const stamped = { ...row, user_id: currentUserId };
    const arr = byTable.get(table);
    if (arr) arr.push(stamped);
    else byTable.set(table, [stamped]);
  }

  for (const [table, rows] of byTable) {
    const { error } = await supabase
      .from(table)
      .upsert(rows, { onConflict: CONFLICT[table] ?? "user_id,id" });
    if (error) {
      console.warn(`[autoSync] push ${table} failed: ${error.message}`);
      for (const r of rows) pending.set(`${table}:${String(r[pkOf(table)])}`, { table, row: r });
    }
  }
  // Retry anything that failed, a little later.
  if (pending.size > 0) {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => void flush(), 3000);
  }
}

function registerHooksOnce() {
  if (hooksRegistered) return;
  hooksRegistered = true;
  for (const table of ALL_TABLES) {
    const tbl = db.table(table);
    tbl.hook("creating", (_primKey, obj) => {
      enqueue(table, obj as Record<string, unknown>);
    });
    tbl.hook("updating", (mods, _primKey, obj) => {
      enqueue(table, { ...(obj as Record<string, unknown>), ...(mods as Record<string, unknown>) });
    });
  }
}

async function applyRemote(table: string, row: Record<string, unknown>) {
  const local = { ...row };
  delete local.user_id;
  delete local.updated_at;
  applyingRemote = true;
  try {
    await db.table(table).put(local);
  } finally {
    applyingRemote = false;
  }
}

/** Begin auto-sync for a signed-in user. Idempotent (no-op if already running). */
export async function startAutoSync(userId: string) {
  if (!supabase || started) return;
  currentUserId = userId;
  registerHooksOnce();

  // Startup reconcile. Hooks stay gated off (started === false) so the pull's
  // writes don't echo back as pushes. Push local first so this device's edits
  // win, then pull remote-only changes.
  //
  // The two halves are caught separately on purpose. They used to share one
  // `try`, and `pushToCloud` throws an aggregate at the end if any single table
  // failed — so one unpushable table (planPublications had no cloud table at all)
  // skipped the pull entirely, for good. A push that can't complete is a reason
  // to pull harder, not a reason to stay stale.
  try {
    await pushToCloud(userId);
  } catch (e) {
    console.warn(`[autoSync] initial push failed: ${e instanceof Error ? e.message : e}`);
  }
  try {
    await pullFromCloud();
  } catch (e) {
    console.warn(`[autoSync] initial pull failed: ${e instanceof Error ? e.message : e}`);
  }

  // Stream remote INSERT/UPDATE for this user's rows into Dexie.
  const ch = supabase.channel(`sync-${userId}`);
  for (const table of ALL_TABLES) {
    ch.on(
      "postgres_changes",
      { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
      (payload) => {
        if (payload.eventType === "DELETE") return; // option B: deletes not synced yet
        const row = payload.new as Record<string, unknown>;
        if (row && Object.keys(row).length) void applyRemote(table, row);
      }
    );
  }
  ch.subscribe();
  channel = ch;

  started = true;
}

/** Stop auto-sync (sign-out). Hooks stay registered but are gated off by `started`. */
export function stopAutoSync() {
  started = false;
  currentUserId = null;
  pending.clear();
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (channel && supabase) void supabase.removeChannel(channel);
  channel = null;
}
