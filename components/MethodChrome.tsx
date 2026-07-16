"use client";

import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";

/** Localized Method page chrome — keeps the route a server component for metadata. */
export default function MethodChrome({ list }: { list: ReactNode }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-5">
      <header className="pt-2">
        <p className="eyebrow">{t("methodEyebrow")}</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">{t("methodTitle")}</h1>
        <p className="mt-2 text-[0.9rem] leading-snug text-muted">{t("methodPageDesc")}</p>
      </header>

      {list}

      <p className="px-1 text-center text-[0.7rem] uppercase tracking-wider text-faint">
        {t("methodBy")}
      </p>
      <p className="px-1 text-center text-[0.6rem] text-faint">{t("illustrationCredit")}</p>
    </div>
  );
}
