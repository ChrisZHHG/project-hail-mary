"use client";

import { useVolumeFmt } from "@/lib/prefs";
import { useMuscleName, useT } from "@/lib/i18n";

/** Horizontal "heatmap" of tonnage per muscle group — where the work landed. */
export default function MuscleLoad({ data }: { data: { muscle: string; volume: number }[] }) {
  const fv = useVolumeFmt();
  const muscleName = useMuscleName();
  const t = useT();
  if (!data.length) {
    return <p className="text-sm text-faint">{t("noMuscleVol")}</p>;
  }
  const max = Math.max(...data.map((d) => d.volume), 1);
  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d) => {
        const pct = Math.max(4, (d.volume / max) * 100);
        return (
          <div key={d.muscle}>
            <div className="flex justify-between text-[0.78rem]">
              <span className="text-muted">{muscleName(d.muscle)}</span>
              <span className="tnum text-faint">{fv(d.volume)}</span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-elevated">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan to-laser"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
