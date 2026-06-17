"use client";

import { useId } from "react";

type Props = {
  label: string;
  value: number | undefined;
  /** Ghost value shown when empty (the "last time" prefill). */
  placeholder?: number;
  onChange: (v: number | undefined) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  accent?: "laser" | "cyan";
};

/** Big +/- stepper. Tap the number to type a big jump; otherwise thumb the
 *  buttons. Operates on the current value, falling back to the prefill. */
export default function Stepper({
  label,
  value,
  placeholder,
  onChange,
  step = 1,
  min = 0,
  max,
  suffix,
  accent = "laser",
}: Props) {
  const id = useId();
  const base = value ?? placeholder ?? 0;
  const accentText = accent === "laser" ? "text-laser" : "text-cyan";
  const accentFocus = accent === "laser" ? "focus:border-laser" : "focus:border-cyan";
  const accentActive = accent === "laser" ? "active:border-laser" : "active:border-cyan";

  const bump = (dir: number) => {
    let next = Math.round((base + dir * step) * 100) / 100;
    if (next < min) next = min;
    if (max != null && next > max) next = max;
    onChange(next);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`decrease ${label}`}
          onClick={() => bump(-1)}
          className={`tap grid h-12 w-12 place-items-center rounded-xl border border-line bg-elevated text-2xl font-bold text-ink transition active:scale-95 ${accentActive}`}
        >
          −
        </button>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value ?? ""}
          placeholder={placeholder != null ? String(placeholder) : "0"}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className={`tnum h-12 w-20 rounded-xl border border-line bg-void text-center text-2xl font-bold ${accentText} placeholder:text-faint focus:outline-none ${accentFocus}`}
        />
        <button
          type="button"
          aria-label={`increase ${label}`}
          onClick={() => bump(1)}
          className={`tap grid h-12 w-12 place-items-center rounded-xl border border-line bg-elevated text-2xl font-bold text-ink transition active:scale-95 ${accentActive}`}
        >
          +
        </button>
      </div>
      {suffix ? <span className="text-[0.65rem] text-faint">{suffix}</span> : null}
    </div>
  );
}
