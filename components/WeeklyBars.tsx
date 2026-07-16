"use client";

import type { Session, SetLog } from "@/lib/data/types";
import { sessionTonnageLbs } from "@/lib/volume";
import { weekStart } from "@/lib/data/repository";
import { useUnit, useVolumeFmt } from "@/lib/prefs";
import { useT } from "@/lib/i18n";

/** Weekly tonnage bars — the "am I doing more than last week?" comparison.
 *  One series (cyan); the current week is emphasized in laser. */
export default function WeeklyBars({
  sessions,
  logs,
}: {
  sessions: Session[];
  logs: SetLog[];
}) {
  const t = useT();
  const unit = useUnit();
  const fv = useVolumeFmt();

  // last 8 Monday-anchored weeks, oldest → newest
  const DAY = 24 * 60 * 60 * 1000;
  const thisMonday = weekStart();
  const weeks: { start: string; total: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(`${thisMonday}T00:00:00`);
    d.setDate(d.getDate() - i * 7);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    weeks.push({ start: iso, total: 0 });
  }
  const completed = sessions.filter((s) => s.completedAt != null && s.kind !== "cardio");
  for (const s of completed) {
    const ws = weekStart(new Date(`${s.date}T00:00:00`));
    const bucket = weeks.find((w) => w.start === ws);
    if (bucket) bucket.total += sessionTonnageLbs(s, logs.filter((l) => l.sessionId === s.id));
  }
  const max = Math.max(...weeks.map((w) => w.total), 1);
  if (weeks.every((w) => w.total === 0)) return null;

  const W = 320;
  const H = 110;
  const padB = 16;
  const gap = 6;
  const bw = (W - gap * (weeks.length - 1)) / weeks.length;

  return (
    <section className="panel p-4">
      <h2 className="eyebrow mb-3">{t("weeklyVolume")}</h2>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="weekly volume">
        {weeks.map((w, i) => {
          const h = Math.max((w.total / max) * (H - padB - 14), w.total > 0 ? 3 : 0);
          const isCurrent = i === weeks.length - 1;
          const x = i * (bw + gap);
          return (
            <g key={w.start}>
              {h > 0 ? (
                <rect
                  x={x}
                  y={H - padB - h}
                  width={bw}
                  height={h}
                  rx={3}
                  fill={isCurrent ? "#ff5e1a" : "#2ce6ff"}
                  opacity={isCurrent ? 0.9 : 0.55}
                />
              ) : null}
              {w.total > 0 && (isCurrent || w.total === max) ? (
                <text
                  x={x + bw / 2}
                  y={H - padB - h - 4}
                  textAnchor="middle"
                  fontSize="8"
                  fill={isCurrent ? "#ffb07a" : "#8b96ad"}
                  className="tnum"
                >
                  {fv(w.total)}
                </text>
              ) : null}
              <text
                x={x + bw / 2}
                y={H - 4}
                textAnchor="middle"
                fontSize="7"
                fill="#8b96ad"
                letterSpacing="0.05em"
              >
                {w.start.slice(5).replace("-", "/")}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-[0.6rem] uppercase tracking-wider text-faint">
        {unit} · <span className="text-laser-soft">▮ {t("thisWeekBar")}</span>
      </p>
    </section>
  );
}
