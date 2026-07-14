"use client";

import { useState } from "react";
import { fmtVolume } from "@/lib/volume";
import { useT } from "@/lib/i18n";

export interface TrendPoint {
  label: string;
  value: number;
  /** True when the value came from a watch/app import, not in-app set logs. */
  imported?: boolean;
}

/** Dependency-free SVG area/line chart of per-session tonnage.
 *  One series, one hue; provenance (logged vs imported) is encoded by mark
 *  shape (filled vs hollow) + legend, never by a second color. Points have
 *  oversized tap targets; the selected point's details render in a caption
 *  row below the plot (mobile-safe — no floating tooltip collisions). */
export default function VolumeTrend({ points }: { points: TrendPoint[] }) {
  const t = useT();
  const [active, setActive] = useState<number | null>(null);
  if (!points.length) {
    return <p className="text-sm text-faint">{t("logToStart")}</p>;
  }

  const W = 320;
  const H = 130;
  const pad = 10;
  const n = points.length;
  const max = Math.max(...points.map((p) => p.value), 1);
  const x = (i: number) => (n === 1 ? W / 2 : pad + (i * (W - 2 * pad)) / (n - 1));
  const y = (v: number) => H - pad - (v / max) * (H - 2 * pad - 12);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
  const area = `${line} L${x(n - 1)},${H - pad} L${x(0)},${H - pad} Z`;
  const hasImported = points.some((p) => p.imported);
  const sel = active != null ? points[active] : null;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Volume trend">
        <defs>
          <linearGradient id="vt-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2ce6ff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2ce6ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#vt-fill)" />
        <path d={line} fill="none" stroke="#2ce6ff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => {
          const emphasized = i === n - 1;
          const color = emphasized ? "#ff5e1a" : "#2ce6ff";
          const r = emphasized ? 4.5 : 3.5;
          return (
            <g key={i}>
              {p.imported ? (
                // hollow = imported (2px surface ring keeps it legible on the line)
                <circle cx={x(i)} cy={y(p.value)} r={r} fill="#050505" stroke={color} strokeWidth="2" />
              ) : (
                <circle cx={x(i)} cy={y(p.value)} r={r} fill={color} />
              )}
              {active === i ? (
                <circle cx={x(i)} cy={y(p.value)} r={r + 3.5} fill="none" stroke={color} strokeWidth="1" opacity="0.6" />
              ) : null}
              {/* oversized invisible hit target */}
              <circle
                cx={x(i)}
                cy={y(p.value)}
                r={Math.min(14, (W - 2 * pad) / Math.max(n - 1, 1) / 2)}
                fill="transparent"
                onPointerEnter={() => setActive(i)}
                onPointerDown={() => setActive(i)}
              />
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[0.6rem] uppercase tracking-wider text-faint">
        <span>{points[0].label}</span>
        {n > 1 ? <span>{points[n - 1].label}</span> : null}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="tnum min-h-4 text-[0.7rem] text-ink">
          {sel ? (
            <>
              {sel.label} · {fmtVolume(sel.value)} lbs
              {sel.imported ? <span className="text-faint"> · {t("watchBadge")}</span> : null}
            </>
          ) : (
            <span className="text-laser-soft">{t("peak")} {fmtVolume(max)}</span>
          )}
        </p>
        {hasImported ? (
          <p className="flex items-center gap-2 text-[0.6rem] text-faint">
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <circle cx="5" cy="5" r="3.5" fill="#050505" stroke="#2ce6ff" strokeWidth="1.5" />
            </svg>
            {t("imported")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
