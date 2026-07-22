import { db } from "./data/db";

/** Full-database backup/restore. Local-first means the phone IS the database —
 *  iOS can evict IndexedDB from rarely-used PWAs, so regular exports matter.
 *  The backup is a single JSON file with every table, restorable via bulkPut
 *  (stable ids → restoring over existing data is safe/idempotent). */

const TABLES = [
  "exercises",
  "programs",
  "workouts",
  "workoutExercises",
  "sessions",
  "setLogs",
  "readinessChecks",
  "exerciseGear",
] as const;

const LS_KEY = "phm-last-backup";

export interface BackupFile {
  app: "hail-mary";
  version: number;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

export async function buildBackup(): Promise<BackupFile> {
  const tables: Record<string, unknown[]> = {};
  for (const t of TABLES) tables[t] = await db.table(t).toArray();
  return {
    app: "hail-mary",
    version: db.verno,
    exportedAt: new Date().toISOString(),
    tables,
  };
}

export async function downloadBackup(): Promise<void> {
  const backup = await buildBackup();
  const blob = new Blob([JSON.stringify(backup, null, 1)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hailmary-backup-${backup.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  localStorage.setItem(LS_KEY, String(Date.now()));
}

/** Restore a backup file. Returns row counts per table. Throws on bad input. */
export async function restoreBackup(json: string): Promise<Record<string, number>> {
  const parsed = JSON.parse(json) as BackupFile;
  if (parsed.app !== "hail-mary" || !parsed.tables) {
    throw new Error("Not a Hail Mary backup file");
  }
  const counts: Record<string, number> = {};
  for (const t of TABLES) {
    const rows = parsed.tables[t];
    if (Array.isArray(rows) && rows.length) {
      await db.table(t).bulkPut(rows);
      counts[t] = rows.length;
    }
  }
  return counts;
}

/** Days since the last export, or null if never backed up. */
export function daysSinceBackup(): number | null {
  const raw = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
  if (!raw) return null;
  return Math.floor((Date.now() - Number(raw)) / (24 * 60 * 60 * 1000));
}
