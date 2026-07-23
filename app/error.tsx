"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { downloadBackup } from "@/lib/backup";
import { hardRefreshApp } from "@/lib/pwa";

/** App-level error boundary (App Router). Local-first means a crash must never
 *  cost data — so alongside "try again" (reset) we surface an export-backup
 *  escape hatch and a hard refresh (drops the service worker + caches) for a
 *  wedged install serving a stale bundle. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  const [status, setStatus] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Surface the real cause in the console for debugging.
    console.error(error);
  }, [error]);

  async function onExport() {
    try {
      await downloadBackup();
      setStatus(t("backupDownloaded"));
    } catch (e) {
      setStatus(e instanceof Error ? e.message : t("errorTitle"));
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    setStatus(t("refreshing"));
    await hardRefreshApp();
  }

  return (
    <div className="mt-16 flex flex-col items-center gap-5 text-center">
      <div>
        <p className="eyebrow text-danger">{t("errorTitle")}</p>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{t("errorBody")}</p>
      </div>

      {error.message ? (
        <p className="tnum max-w-xs break-words rounded-lg border border-line bg-elevated px-3 py-2 font-mono text-[0.65rem] text-faint">
          {error.message}
          {error.digest ? ` · ${error.digest}` : ""}
        </p>
      ) : null}

      <div className="flex w-full max-w-xs flex-col gap-2">
        <button
          type="button"
          onClick={reset}
          className="tap w-full rounded-xl bg-laser py-3.5 text-sm font-bold uppercase tracking-wider text-black transition active:scale-[0.98] glow-laser"
        >
          {t("errorRetry")}
        </button>
        <button
          type="button"
          onClick={() => void onExport()}
          className="tap w-full rounded-xl border border-cyan/50 bg-cyan/[0.08] py-3 text-sm font-bold uppercase tracking-wider text-cyan transition active:scale-[0.98]"
        >
          {t("exportBackup")}
        </button>
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={refreshing}
          className="tap w-full rounded-xl border border-line py-2.5 text-[0.75rem] font-semibold uppercase tracking-wider text-muted transition hover:border-cyan/40 hover:text-cyan disabled:opacity-50"
        >
          {t("refreshApp")}
        </button>
      </div>

      {status ? <p className="tnum text-[0.75rem] text-cyan">{status}</p> : null}
    </div>
  );
}
