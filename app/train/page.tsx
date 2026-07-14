"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/data/db";
import { useWorkouts } from "@/lib/data/hooks";

export default function TrainPage() {
  const workouts = useWorkouts();
  const openSessions =
    useLiveQuery(
      () => db.sessions.filter((s) => s.completedAt == null && s.source !== "watch").toArray(),
      []
    ) ?? [];
  const activeIds = openSessions.map((r) => r.workoutId);
  const freestyleActive = openSessions.some((s) => !s.workoutId);

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-2">
        <p className="eyebrow">Pick a day</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Train</h1>
      </header>

      <div className="flex flex-col gap-3">
        {(workouts ?? []).map((w) => {
          const active = activeIds.includes(w.id);
          return (
            <Link
              key={w.id}
              href={`/session/${w.id}`}
              className="panel flex items-center justify-between p-4 transition active:scale-[0.99]"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-ink">{w.name}</h2>
                  {active ? (
                    <span className="rounded-full border border-laser/50 px-2 py-0.5 text-[0.6rem] uppercase tracking-wider text-laser">
                      in progress
                    </span>
                  ) : null}
                </div>
                <p className="eyebrow mt-1">{w.subtitle}</p>
              </div>
              <span className="text-2xl text-laser">→</span>
            </Link>
          );
        })}
        {workouts && workouts.length === 0 ? (
          <p className="text-center text-faint">No workouts seeded.</p>
        ) : null}

        {/* Off-program training — pick machines by muscle + picture */}
        <Link
          href="/freestyle"
          className="flex items-center justify-between rounded-card border border-cyan/40 bg-cyan/[0.06] p-4 transition active:scale-[0.99]"
        >
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-cyan">Freestyle</h2>
              {freestyleActive ? (
                <span className="rounded-full border border-laser/50 px-2 py-0.5 text-[0.6rem] uppercase tracking-wider text-laser">
                  in progress
                </span>
              ) : null}
            </div>
            <p className="eyebrow mt-1">自主训练 · 点部位选机器 · 比上次多一点</p>
          </div>
          <span className="text-2xl text-cyan">→</span>
        </Link>
      </div>
    </div>
  );
}
