"use client";

import Link from "next/link";
import { useEffect } from "react";
import { repo } from "@/lib/data/repository";
import { useWorkouts, useOpenSessions, useAllSetLogs } from "@/lib/data/hooks";
import { useT } from "@/lib/i18n";

export default function TrainPage() {
  const t = useT();
  const workouts = useWorkouts();

  useEffect(() => {
    void repo.cleanupStaleOpenSessions();
  }, []);

  const openSessions = useOpenSessions() ?? [];
  const allLogs = useAllSetLogs() ?? [];
  const sessionIdsWithSets = new Set(
    allLogs.filter((l) => l.done).map((l) => l.sessionId)
  );
  const activeIds = openSessions
    .filter((s) => s.workoutId && sessionIdsWithSets.has(s.id))
    .map((s) => s.workoutId);
  const freestyleActive = openSessions.some(
    (s) => !s.workoutId && sessionIdsWithSets.has(s.id)
  );

  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="pt-2">
        <p className="eyebrow">{t("pickDay")}</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">{t("trainTitle")}</h1>
      </header>

      <div className="flex flex-col gap-3">
        {(workouts ?? []).map((w) => {
          const active = activeIds.includes(w.id);
          return (
            <Link
              key={w.id}
              href={`/session/${w.id}`}
              className="panel flex items-start justify-between gap-3 p-4 transition active:bg-white/[0.04]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-ink">{w.name}</h2>
                  {active ? (
                    <span className="rounded-full border border-laser/50 px-2 py-0.5 text-[0.6rem] uppercase tracking-wider text-laser">
                      {t("inProgress")}
                    </span>
                  ) : null}
                </div>
                <p className="eyebrow mt-1">{w.subtitle}</p>
              </div>
              <span className="shrink-0 pt-1 text-2xl leading-none text-laser">→</span>
            </Link>
          );
        })}
        {workouts && workouts.length === 0 ? (
          <p className="text-center text-faint">{t("noWorkouts")}</p>
        ) : null}
      </div>

      <div className="mt-auto">
        <Link
          href="/freestyle"
          className="panel flex items-start justify-between gap-3 border-cyan/40 bg-cyan/[0.06] p-4 transition active:bg-cyan/[0.1]"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-cyan">{t("freestyleTitle")}</h2>
              {freestyleActive ? (
                <span className="rounded-full border border-laser/50 px-2 py-0.5 text-[0.6rem] uppercase tracking-wider text-laser">
                  {t("inProgress")}
                </span>
              ) : null}
            </div>
            <p className="eyebrow mt-1">{t("freestyleCardSub")}</p>
          </div>
          <span className="shrink-0 pt-1 text-2xl leading-none text-cyan">→</span>
        </Link>
      </div>
    </div>
  );
}
