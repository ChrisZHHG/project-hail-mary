"use client";

import { setUnit, useUnit } from "@/lib/prefs";

/** LBS / KG pill — switches weight display+input everywhere. Storage stays lbs. */
export default function UnitToggle() {
  const unit = useUnit();
  return (
    <div className="flex overflow-hidden rounded-full border border-line text-[0.65rem] font-bold">
      {(["lbs", "kg"] as const).map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => setUnit(u)}
          aria-pressed={unit === u}
          className={`tap px-2.5 py-1 uppercase tracking-wider transition ${
            unit === u ? "bg-cyan/15 text-cyan" : "text-faint"
          }`}
        >
          {u}
        </button>
      ))}
    </div>
  );
}
