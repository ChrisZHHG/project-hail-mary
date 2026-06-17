"use client";

import { useId } from "react";

type Props = {
  label: string;
  value: number | undefined;
  /** Ghost value shown when empty — the "memory" from last session (or 50lb cold). */
  placeholder?: number;
  onChange: (v: number | undefined) => void;
  step?: number;
  max?: number;
};

/** Weight input that's hassle-free on the gym floor: slide it, tap +/-, or type.
 *  Falls back to last session's weight (memory), then 50lb. */
export default function WeightControl({
  label,
  value,
  placeholder,
  onChange,
  step = 5,
  max = 315,
}: Props) {
  const id = useId();
  const current = value ?? placeholder ?? 50;
  const bump = (dir: number) => {
    let next = Math.round((current + dir * step) * 100) / 100;
    if (next < 0) next = 0;
    if (next > max) next = max;
    onChange(next);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <label htmlFor={`${id}-n`} className="eyebrow">
          {label}
        </label>
        <div className="flex items-baseline gap-1">
          <input
            id={`${id}-n`}
            type="number"
            inputMode="decimal"
            value={value ?? ""}
            placeholder={String(placeholder ?? 50)}
            onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
            className="tnum w-20 rounded-lg border border-line bg-void text-right text-2xl font-bold text-laser placeholder:text-faint focus:border-laser focus:outline-none"
          />
          <span className="text-xs text-faint">lb</span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          aria-label="decrease weight"
          onClick={() => bump(-1)}
          className="tap grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-elevated text-2xl font-bold text-ink transition active:scale-95 active:border-laser"
        >
          −
        </button>
        <input
          aria-label={label}
          type="range"
          min={0}
          max={max}
          step={step}
          value={current}
          onChange={(e) => onChange(Number(e.target.value))}
          className="sl flex-1"
        />
        <button
          type="button"
          aria-label="increase weight"
          onClick={() => bump(1)}
          className="tap grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-elevated text-2xl font-bold text-ink transition active:scale-95 active:border-laser"
        >
          +
        </button>
      </div>
    </div>
  );
}
