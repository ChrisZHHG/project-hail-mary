import { supabase } from "./data/supabase";

/**
 * Early-access signups.
 *
 * Writes straight to Supabase from the browser — the anon key is public, so the
 * table grants INSERT only and no SELECT. Anyone can add themselves; nobody can
 * read the list back with the shipped key. See supabase/waitlist.sql.
 */

export interface WaitlistEntry {
  email: string;
  /** Roughly how many clients they coach — the only qualifying signal we ask for. */
  clients?: string;
  /** Where they came from, so we learn which channel actually works. */
  source?: string;
}

export type WaitlistResult = { ok: true } | { ok: false; reason: "duplicate" | "invalid" | "error" };

const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

export async function joinWaitlist(entry: WaitlistEntry): Promise<WaitlistResult> {
  if (!looksLikeEmail(entry.email)) return { ok: false, reason: "invalid" };
  if (!supabase) return { ok: false, reason: "error" };

  const { error } = await supabase.from("waitlist").insert({
    email: entry.email.trim().toLowerCase(),
    clients: entry.clients || null,
    source: entry.source || null,
  });

  if (!error) return { ok: true };
  // 23505 = unique violation. Signing up twice is a success from the user's
  // point of view, not an error to scold them about.
  if (error.code === "23505") return { ok: true };
  return { ok: false, reason: "error" };
}

/** First-touch attribution: the referrer plus any utm_source on the URL. */
export function captureSource(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const utm = new URLSearchParams(window.location.search).get("utm_source");
  const ref = document.referrer ? new URL(document.referrer).hostname : "";
  return [utm, ref].filter(Boolean).join(" · ") || "direct";
}
