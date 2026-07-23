"use client";

import type { Session } from "@/lib/data/types";
import { summarizeLoad, ZONE_META } from "@/lib/load";
import { useT } from "@/lib/i18n";
import { useNameLang } from "@/lib/prefs";

/** Acute:chronic training-load meter — a linear zone band (not a radial dial:
 *  more legible at 390px and doesn't overstate precision). Zone identity is
 *  carried by label text + position, not color alone. */
export default function LoadGauge({ sessions }: { sessions: Session[] }) {
  const t = useT();
  const lang = useNameLang();
  const s = summarizeLoad(sessions);

  const W = 320;
  const BAND_Y = 6;
  const BAND_H = 12;
  const MAX = 2; // display scale caps at ACR 2.0
  const px = (acr: number) => (Math.min(acr, MAX) / MAX) * W;

  const zones = [
    { from: 0, to: 0.8, color: "#8b96ad", alpha: 0.18, key: "zoneFresh" },
    { from: 0.8, to: 1.3, color: "#34d399", alpha: 0.28, key: "zoneOptimal" },
    { from: 1.3, to: 1.5, color: "#fbbf24", alpha: 0.28, key: "zoneHigh" },
    { from: 1.5, to: 2, color: "#f87171", alpha: 0.28, key: "zoneSpike" },
  ] as const;

  return (
    <section className="panel p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="eyebrow">{t("loadTitle")}</h2>
        <span className="text-[0.6rem] uppercase tracking-wider text-faint">{t("estimate")}</span>
      </div>
      <p className="mb-3 text-[0.7rem] leading-relaxed text-muted">{t("loadWhat")}</p>

      <div className="mb-3 flex items-baseline gap-4">
        <div>
          <p className="tnum text-2xl font-bold text-cyan">{Math.round(s.acute)}</p>
          <p className="eyebrow">{t("load7d")}</p>
        </div>
        <div>
          <p className="tnum text-2xl font-bold text-ink">{Math.round(s.chronic)}</p>
          <p className="eyebrow">{t("weeklyBaseline")}</p>
        </div>
        {s.acr != null && s.zone ? (
          <div className="ml-auto text-right">
            <p className="tnum text-2xl font-bold" style={{ color: ZONE_META[s.zone].color }}>
              {s.acr.toFixed(2)}
            </p>
            <p className="eyebrow">
              {lang === "zh" ? ZONE_META[s.zone].labelZh : ZONE_META[s.zone].label}
            </p>
          </div>
        ) : null}
      </div>

      {s.acr != null && s.zone ? (
        <>
          <svg viewBox={`0 0 ${W} 34`} className="w-full" role="img" aria-label="Load ratio zones">
            {zones.map((z) => (
              <rect
                key={z.key}
                x={px(z.from)}
                y={BAND_Y}
                width={px(z.to) - px(z.from) - 2 /* 2px surface gap between zones */}
                height={BAND_H}
                rx={3}
                fill={z.color}
                opacity={z.alpha}
              />
            ))}
            {/* marker */}
            <line
              x1={px(s.acr)}
              x2={px(s.acr)}
              y1={BAND_Y - 4}
              y2={BAND_Y + BAND_H + 4}
              stroke={ZONE_META[s.zone].color}
              strokeWidth="2.5"
            />
            {zones.map((z) => (
              <text
                key={z.key}
                x={(px(z.from) + px(z.to)) / 2}
                y={BAND_Y + BAND_H + 13}
                textAnchor="middle"
                fontSize="7"
                letterSpacing="0.08em"
                fill="#8b96ad"
              >
                {t(z.key).toUpperCase()}
              </text>
            ))}
          </svg>
          <p className="mt-2 text-xs leading-relaxed text-faint">
            {lang === "zh" ? ZONE_META[s.zone].hintZh : ZONE_META[s.zone].hint}
          </p>
        </>
      ) : (
        <p className="text-xs leading-relaxed text-faint">
          {t("buildingBaseline").replace("{n}", String(s.sessionsIn28d))}
        </p>
      )}
      <p className="mt-2 text-[0.6rem] leading-relaxed text-faint">{t("loadFootnote")}</p>
    </section>
  );
}
