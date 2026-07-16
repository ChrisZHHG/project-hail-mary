"use client";

import { useSyncExternalStore } from "react";
import type { Exercise } from "./data/types";
import { fmtVolume } from "./volume";

/** Tiny persisted preference stores (language, weight unit). Module-level so
 *  every component on the page swaps together; localStorage so choices stick. */

function createPref<T extends string>(key: string, initial: T, valid: readonly T[]) {
  let value = initial;
  const listeners = new Set<() => void>();
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(key);
    if (stored && (valid as readonly string[]).includes(stored)) value = stored as T;
  }
  return {
    sub: (fn: () => void) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    get: () => value,
    set: (next: T) => {
      value = next;
      if (typeof window !== "undefined") localStorage.setItem(key, next);
      listeners.forEach((fn) => fn());
    },
  };
}

/* ----------------------------- language ----------------------------- */

export type NameLang = "zh" | "en";
const langPref = createPref<NameLang>("phm-name-lang", "en", ["zh", "en"]);
export const setNameLang = langPref.set;

export function useNameLang(): NameLang {
  return useSyncExternalStore(langPref.sub, langPref.get, () => "en" as const);
}

/** Primary + secondary display names for an exercise under the current pref.
 *  Exercises without a 中文名 fall back to English-only. */
export function exerciseNames(
  ex: Pick<Exercise, "name" | "aliasZh">,
  l: NameLang
): { primary: string; secondary?: string } {
  if (l === "zh" && ex.aliasZh) return { primary: ex.aliasZh, secondary: ex.name };
  return { primary: ex.name, secondary: ex.aliasZh };
}

/* ---------------------------- weight unit ---------------------------- */

export type WeightUnit = "lbs" | "kg";
const unitPref = createPref<WeightUnit>("phm-unit", "lbs", ["lbs", "kg"]);
export const setUnit = unitPref.set;

export function useUnit(): WeightUnit {
  return useSyncExternalStore(unitPref.sub, unitPref.get, () => "lbs" as const);
}

export const LBS_PER_KG = 2.2046226218;

/** Canonical storage is ALWAYS lbs; these convert at the display/input edge. */
export const lbsToDisplay = (lbs: number, u: WeightUnit) =>
  u === "kg" ? Math.round((lbs / LBS_PER_KG) * 10) / 10 : lbs;

export const displayToLbs = (v: number, u: WeightUnit) =>
  u === "kg" ? Math.round(v * LBS_PER_KG * 100) / 100 : v;

/** "45 lbs" / "20.4 kg" from a canonical-lbs value. */
export function useWeightFmt(): (lbs?: number | null) => string {
  const u = useUnit();
  return (lbs) => (lbs == null ? "" : `${lbsToDisplay(lbs, u)} ${u}`);
}

/** Tonnage display: value string (fmtVolume'd, converted) — pair with useUnit()
 *  for the unit label when it renders in its own span. */
export function useVolumeFmt(): (lbs: number) => string {
  const u = useUnit();
  return (lbs) => fmtVolume(u === "kg" ? lbs / LBS_PER_KG : lbs);
}
