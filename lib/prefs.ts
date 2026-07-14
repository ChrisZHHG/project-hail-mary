"use client";

import { useSyncExternalStore } from "react";
import type { Exercise } from "./data/types";

/** Display-language preference for exercise names (中文-first vs English-first).
 *  Tiny module store + localStorage so every component on the page swaps
 *  together and the choice survives restarts. */

export type NameLang = "zh" | "en";
const LS_KEY = "phm-name-lang";

let lang: NameLang = "zh"; // SSR + first paint default (Chris thinks in 中文)
const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

if (typeof window !== "undefined") {
  const stored = localStorage.getItem(LS_KEY);
  if (stored === "en" || stored === "zh") lang = stored;
}

export function setNameLang(next: NameLang) {
  lang = next;
  if (typeof window !== "undefined") localStorage.setItem(LS_KEY, next);
  listeners.forEach((fn) => fn());
}

export function useNameLang(): NameLang {
  return useSyncExternalStore(
    subscribe,
    () => lang,
    () => "zh" as const // server snapshot
  );
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
