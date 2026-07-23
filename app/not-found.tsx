"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

/** 404 (App Router). In the static export this becomes 404.html. */
export default function NotFound() {
  const t = useT();
  return (
    <div className="mt-16 flex flex-col items-center gap-4 text-center">
      <p className="tnum text-6xl font-bold text-faint/40">404</p>
      <div>
        <p className="eyebrow">{t("notFoundTitle")}</p>
        <p className="mt-2 text-sm text-muted">{t("notFoundBody")}</p>
      </div>
      <Link
        href="/"
        className="tap rounded-xl bg-laser px-5 py-3 text-sm font-bold uppercase tracking-wider text-black glow-laser"
      >
        {t("goHome")}
      </Link>
    </div>
  );
}
