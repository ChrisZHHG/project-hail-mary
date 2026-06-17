"use client";

import { fmtVolume } from "@/lib/volume";

/** Dependency-free SVG area/line chart of per-session tonnage. */
export default function VolumeTrend({ points }: { points: { label: string; value: number }[] }) {
  if (!points.length) {
    return <p className="text-sm text-faint">Log a session to start the trend.</p>;
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
        <path d={line} fill="none" stroke="#2ce6ff" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.value)} r={i === n - 1 ? 4.5 : 3} fill={i === n - 1 ? "#ff5e1a" : "#2ce6ff"} />
          </g>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[0.6rem] uppercase tracking-wider text-faint">
        <span>{points[0].label}</span>
        {n > 1 ? <span>{points[n - 1].label}</span> : null}
      </div>
      <p className="tnum mt-1 text-[0.7rem] text-laser-soft">peak {fmtVolume(max)}</p>
    </div>
  );
}
