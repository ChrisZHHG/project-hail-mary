"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import SessionDetail from "@/components/SessionDetail";
import { useT } from "@/lib/i18n";

/** Detail view for one past session, addressed by `?s=<sessionId>`. A query
 *  param (not a dynamic route) keeps it static-export-safe — session ids are
 *  runtime UUIDs, unknowable at build time. */
function HistoryInner() {
  const t = useT();
  const sessionId = useSearchParams().get("s");
  if (!sessionId) {
    return (
      <div className="mt-16 flex flex-col items-center gap-3 text-center">
        <p className="text-faint">{t("sessionNotFound")}</p>
        <Link href="/progress" className="text-cyan">
          ← {t("progressTitle")}
        </Link>
      </div>
    );
  }
  return <SessionDetail sessionId={sessionId} />;
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<p className="mt-10 text-center text-faint">…</p>}>
      <HistoryInner />
    </Suspense>
  );
}
