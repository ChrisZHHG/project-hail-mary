"use client";

import {
  FRONT_MUSCLES,
  BACK_MUSCLES,
  SILHOUETTE_HALF,
  HEAD,
  type MuscleRegion,
} from "@/lib/musclePaths";
import { useT } from "@/lib/i18n";

const LIMB = "var(--color-elevated)";
const OUTLINE = "var(--color-line)";

/** One anatomical figure (front or back). Hoisted out of the parent's render so
 *  React keeps a stable component identity; `heat` is passed in as a prop. */
function Figure({
  cx,
  regions,
  label,
  front,
  heat,
  selected,
  onPick,
}: {
  cx: number;
  regions: MuscleRegion[];
  label: string;
  front: boolean;
  heat: (muscle: string) => string;
  selected?: string | null;
  onPick?: (muscle: string) => void;
}) {
  return (
    <g transform={`translate(${cx},4)`}>
      {/* silhouette (right half + mirror) */}
      <ellipse cx="0" cy={HEAD.cy} rx={HEAD.rx} ry={HEAD.ry} fill={LIMB} stroke={OUTLINE} strokeWidth="0.75" />
      {/* a simple face on the FRONT figure only — an instant front-vs-back cue */}
      {front ? (
        <g>
          <circle cx="-3.4" cy={HEAD.cy - 1} r="1.15" fill={OUTLINE} />
          <circle cx="3.4" cy={HEAD.cy - 1} r="1.15" fill={OUTLINE} />
          <path
            d={`M-2.6 ${HEAD.cy + 4} Q0 ${HEAD.cy + 5.6} 2.6 ${HEAD.cy + 4}`}
            fill="none"
            stroke={OUTLINE}
            strokeWidth="0.8"
            strokeLinecap="round"
          />
        </g>
      ) : null}
      {[1, -1].map((sx) => (
        <g key={sx} transform={`scale(${sx},1)`}>
          {SILHOUETTE_HALF.map((d, i) => (
            <path key={i} d={d} fill={LIMB} stroke={OUTLINE} strokeWidth="0.75" />
          ))}
        </g>
      ))}
      {/* muscle regions */}
      {regions.map((r, i) => {
        const isSel = selected === r.muscle;
        const common = {
          fill: heat(r.muscle),
          stroke: isSel ? "#ff5e1a" : "rgba(0,0,0,0.35)",
          strokeWidth: isSel ? 1.4 : 0.5,
          onClick: onPick ? () => onPick(r.muscle) : undefined,
          style: onPick ? ({ cursor: "pointer" } as const) : undefined,
        };
        return r.midline ? (
          <path key={i} d={r.d} {...common}>
            <title>{r.muscle}</title>
          </path>
        ) : (
          [1, -1].map((sx) => (
            <g key={`${i}${sx}`} transform={`scale(${sx},1)`}>
              <path d={r.d} {...common}>
                <title>{r.muscle}</title>
              </path>
            </g>
          ))
        );
      })}
      <text
        x="0"
        y="252"
        textAnchor="middle"
        className="fill-muted"
        fontSize="12"
        fontWeight="700"
        fontFamily="var(--font-mono)"
        letterSpacing="3"
      >
        {label}
      </text>
    </g>
  );
}

/** Front + back anatomical figures with muscle regions heated by relative
 *  tonnage. Cold = dim slate, warming through neon-cyan to laser-orange.
 *  Geometry lives in lib/musclePaths.ts (right-half paths, mirrored here).
 *  Pass `onPick` to use the figure as a tappable muscle picker (freestyle
 *  logging); `selected` rings the active muscle. */
export default function BodyHeatmap({
  data,
  onPick,
  selected,
}: {
  data: { muscle: string; volume: number }[];
  onPick?: (muscle: string) => void;
  selected?: string | null;
}) {
  const t = useT();
  const vol = new Map(data.map((d) => [d.muscle, d.volume]));
  const max = Math.max(1, ...data.map((d) => d.volume));
  const heat = (muscle: string) => {
    const t = (vol.get(muscle) ?? 0) / max;
    if (t <= 0) return "rgba(70,80,102,0.25)";
    const lo = [44, 230, 255];
    const hi = [255, 94, 26];
    const r = Math.round(lo[0] + (hi[0] - lo[0]) * t);
    const g = Math.round(lo[1] + (hi[1] - lo[1]) * t);
    const b = Math.round(lo[2] + (hi[2] - lo[2]) * t);
    return `rgba(${r},${g},${b},${(0.45 + 0.55 * t).toFixed(2)})`;
  };

  return (
    <svg viewBox="0 0 320 260" className="w-full" role="img" aria-label="Muscle load by body region">
      <Figure cx={80} regions={FRONT_MUSCLES} label={t("bodyFront")} front heat={heat} selected={selected} onPick={onPick} />
      <Figure cx={240} regions={BACK_MUSCLES} label={t("bodyBack")} front={false} heat={heat} selected={selected} onPick={onPick} />
      {/* heat legend */}
      <defs>
        <linearGradient id="bh-legend" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="rgba(70,80,102,0.4)" />
          <stop offset="50%" stopColor="#2ce6ff" />
          <stop offset="100%" stopColor="#ff5e1a" />
        </linearGradient>
      </defs>
      <rect x="156" y="60" width="6" height="120" rx="3" fill="url(#bh-legend)" />
      <text x="159" y="52" textAnchor="middle" className="fill-faint" fontSize="8" fontFamily="var(--font-mono)">HI</text>
      <text x="159" y="192" textAnchor="middle" className="fill-faint" fontSize="8" fontFamily="var(--font-mono)">LO</text>
    </svg>
  );
}
