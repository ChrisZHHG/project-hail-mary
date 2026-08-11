/**
 * Brand / display config — single source of truth.
 *
 * Named NextSet (Aug 2026): the product answers one question — what should the
 * next set be — for the lifter standing at the machine and for the coach
 * reviewing the week. Chosen over cleverer options because a tool sold cold to
 * coaches has to say what it does before it says anything else.
 *
 * ⚠️ Domain `nextset.coach` was free at naming time; a trademark search
 * (USPTO / CIPO) still needs doing before any spend goes behind the name.
 *
 * Repo / GitHub codename stays "Project Hail Mary".
 */
export const BRAND = {
  /** Display name — wordmark, document title, install prompt. */
  name: "NextSet",
  /** Short name for the home-screen icon (<= 12 chars looks best). */
  shortName: "NextSet",
  /** What the product does. True for both audiences: the lifter knows what to
   *  load, the coach knows what their client will lift. Short enough to sit in
   *  a document title without being truncated. */
  tagline: "Know your next set",
  /** What the product believes — carried over from the original working name.
   *  The tagline sells the function; this is the reason the function exists. */
  ethos: "Train with intention and attention",
  /** Longer description for the PWA manifest + SEO. */
  description:
    "NextSet writes each training session from what you actually lifted — the load, the reps, and the reason behind both. Built on a strength coach's method, with the thinking always one tap away.",
  /** Default weight unit for this trial (the seed program is in lbs). */
  unit: "lbs" as "lbs" | "kg",
  /** Default weight step for the +/- steppers. */
  weightStep: 2.5,
} as const;
