"use client";

/** Front + back body diagram with muscle groups heated by relative tonnage.
 *  Cold = dim slate, warming through neon-cyan to laser-orange at peak load. */
export default function BodyHeatmap({ data }: { data: { muscle: string; volume: number }[] }) {
  const vol = new Map(data.map((d) => [d.muscle, d.volume]));
  const max = Math.max(1, ...data.map((d) => d.volume));
  const heat = (muscle: string) => {
    const t = (vol.get(muscle) ?? 0) / max;
    if (t <= 0) return "rgba(70,80,102,0.22)";
    const lo = [44, 230, 255];
    const hi = [255, 94, 26];
    const r = Math.round(lo[0] + (hi[0] - lo[0]) * t);
    const g = Math.round(lo[1] + (hi[1] - lo[1]) * t);
    const b = Math.round(lo[2] + (hi[2] - lo[2]) * t);
    return `rgba(${r},${g},${b},${(0.4 + 0.6 * t).toFixed(2)})`;
  };

  const limb = "var(--color-elevated)";
  const outline = "var(--color-line)";

  return (
    <svg viewBox="0 0 300 240" className="w-full" role="img" aria-label="Muscle load by body region">
      {/* ---------- FRONT (left) ---------- */}
      <g>
        {/* silhouette */}
        <circle cx="78" cy="22" r="11" fill={limb} stroke={outline} />
        <rect x="60" y="40" width="36" height="74" rx="13" fill={limb} stroke={outline} />
        <rect x="40" y="48" width="12" height="56" rx="6" fill={limb} stroke={outline} />
        <rect x="104" y="48" width="12" height="56" rx="6" fill={limb} stroke={outline} />
        <rect x="63" y="116" width="14" height="86" rx="7" fill={limb} stroke={outline} />
        <rect x="79" y="116" width="14" height="86" rx="7" fill={limb} stroke={outline} />
        {/* muscles */}
        <ellipse cx="60" cy="52" rx="9" ry="7" fill={heat("Shoulders")} />
        <ellipse cx="96" cy="52" rx="9" ry="7" fill={heat("Shoulders")} />
        <ellipse cx="70" cy="62" rx="8" ry="7" fill={heat("Chest")} />
        <ellipse cx="86" cy="62" rx="8" ry="7" fill={heat("Chest")} />
        <ellipse cx="46" cy="74" rx="6" ry="11" fill={heat("Biceps")} />
        <ellipse cx="110" cy="74" rx="6" ry="11" fill={heat("Biceps")} />
        <rect x="68" y="74" width="20" height="34" rx="6" fill={heat("Core")} />
        <ellipse cx="78" cy="124" rx="5" ry="14" fill={heat("Adductors")} />
        <ellipse cx="69" cy="150" rx="7" ry="26" fill={heat("Quads")} />
        <ellipse cx="87" cy="150" rx="7" ry="26" fill={heat("Quads")} />
        <text x="78" y="226" textAnchor="middle" className="fill-faint" fontSize="9" fontFamily="var(--font-mono)" letterSpacing="2">FRONT</text>
      </g>

      {/* ---------- BACK (right) ---------- */}
      <g>
        <circle cx="222" cy="22" r="11" fill={limb} stroke={outline} />
        <rect x="204" y="40" width="36" height="74" rx="13" fill={limb} stroke={outline} />
        <rect x="184" y="48" width="12" height="56" rx="6" fill={limb} stroke={outline} />
        <rect x="248" y="48" width="12" height="56" rx="6" fill={limb} stroke={outline} />
        <rect x="207" y="116" width="14" height="86" rx="7" fill={limb} stroke={outline} />
        <rect x="223" y="116" width="14" height="86" rx="7" fill={limb} stroke={outline} />
        {/* muscles */}
        <ellipse cx="204" cy="52" rx="9" ry="7" fill={heat("Shoulders")} />
        <ellipse cx="240" cy="52" rx="9" ry="7" fill={heat("Shoulders")} />
        <rect x="208" y="58" width="28" height="34" rx="8" fill={heat("Back")} />
        <ellipse cx="190" cy="74" rx="6" ry="11" fill={heat("Triceps")} />
        <ellipse cx="254" cy="74" rx="6" ry="11" fill={heat("Triceps")} />
        <ellipse cx="213" cy="150" rx="7" ry="24" fill={heat("Hamstrings")} />
        <ellipse cx="231" cy="150" rx="7" ry="24" fill={heat("Hamstrings")} />
        <ellipse cx="213" cy="188" rx="6" ry="14" fill={heat("Calves")} />
        <ellipse cx="231" cy="188" rx="6" ry="14" fill={heat("Calves")} />
        <text x="222" y="226" textAnchor="middle" className="fill-faint" fontSize="9" fontFamily="var(--font-mono)" letterSpacing="2">BACK</text>
      </g>

      {/* heat legend */}
      <g transform="translate(126,150)">
        <text x="6" y="0" className="fill-faint" fontSize="7" fontFamily="var(--font-mono)" letterSpacing="1">LOAD</text>
        <rect x="0" y="6" width="14" height="56" rx="3" fill="url(#heatgrad)" />
        <text x="20" y="12" className="fill-faint" fontSize="6">hi</text>
        <text x="20" y="62" className="fill-faint" fontSize="6">lo</text>
      </g>
      <defs>
        <linearGradient id="heatgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff5e1a" />
          <stop offset="100%" stopColor="#2ce6ff" />
        </linearGradient>
      </defs>
    </svg>
  );
}
