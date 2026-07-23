import { repo } from "./data/repository";

/** Full-database backup/restore. Local-first means the phone IS the database —
 *  iOS can evict IndexedDB from rarely-used PWAs, so regular exports matter.
 *  The backup is a single JSON file with every table, restored via the
 *  Repository's bulkPut (stable ids → restoring over existing data is safe). */

const LS_KEY = "phm-last-backup";

export interface BackupFile {
  app: "hail-mary";
  version: number;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

export async function buildBackup(): Promise<BackupFile> {
  return {
    app: "hail-mary",
    version: repo.schemaVersion(),
    exportedAt: new Date().toISOString(),
    tables: await repo.exportAll(),
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
  return repo.importAll(parsed.tables);
}

/** Days since the last export, or null if never backed up. */
export function daysSinceBackup(): number | null {
  const raw = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
  if (!raw) return null;
  return Math.floor((Date.now() - Number(raw)) / (24 * 60 * 60 * 1000));
}
