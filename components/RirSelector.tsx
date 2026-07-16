"use client";

import { useT } from "@/lib/i18n";

/** Discrete RIR (Reps In Reserve) picker — one-tap segmented control sized for
 *  sweaty gym fingers. The coach's target RIR is highlighted in cyan. */
export default function RirSelector({
  value,
  target,
  onChange,
}: {
  value: number | undefined;
  target?: string;
  onChange: (v: number) => void;
}) {
  const t = useT();
  const opts = [0, 1, 2, 3, 4, 5];
  const targetNums = (target ?? "").match(/\d+/g)?.map(Number) ?? [];
  const label = target
    ? `${t("rir")} · ${t("rirTarget").replace("{n}", target)}`
    : t("rir");
  return (
    <div className="flex flex-col items-center gap-1">
      <label className="eyebrow">{label}</label>
      <div className="flex gap-1.5">
        {opts.map((n) => {
          const active = value === n;
          const isTarget = targetNums.includes(n);
          const cls = active
            ? "border-laser bg-laser/15 text-laser glow-laser"
            : isTarget
              ? "border-cyan/40 text-cyan"
              : "border-line text-muted";
          return (
            <button
              key={n}
              type="button"
              aria-label={`${n} ${t("rir")}`}
              aria-pressed={active}
              onClick={() => onChange(n)}
              className={`tnum grid h-11 w-11 place-items-center rounded-lg border text-lg font-bold transition active:scale-95 ${cls}`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
