"use client";

/** Tiny single-series sparkline (per-exercise top-set trend). Values arrive
 *  already converted to the display unit. Last point emphasized in laser. */
export default function MiniTrend({
  points,
}: {
  points: { label: string; value: number }[];
}) {
  if (points.length < 3) return null;
  const W = 280;
  const H = 56;
  const pad = 6;
  const n = points.length;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i: number) => pad + (i * (W - 2 * pad)) / (n - 1);
  const y = (v: number) => H - pad - ((v - min) / span) * (H - 2 * pad);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");

  return (
    <div className="mt-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="top set trend">
        <path d={line} fill="none" stroke="#2ce6ff" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.value)}
            r={i === n - 1 ? 3.5 : 2.2}
            fill={i === n - 1 ? "#ff5e1a" : "#2ce6ff"}
          />
        ))}
      </svg>
      <div className="flex justify-between text-[0.55rem] uppercase tracking-wider text-faint">
        <span>{points[0].label}</span>
        <span>{points[n - 1].label}</span>
      </div>
    </div>
  );
}
