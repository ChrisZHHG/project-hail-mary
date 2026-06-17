/**
 * Brand / display config — single source of truth.
 *
 * The in-app name and wordmark are intentionally a placeholder: the final name
 * will be decided by Austin + Chris. Change it here once and it updates the
 * header, the PWA manifest, the document title, and the install prompt.
 *
 * Repo / GitHub codename: "Project Hail Mary".
 */
export const BRAND = {
  /** Working display name (placeholder until Austin + Chris decide). */
  name: "Hail Mary",
  /** Short name for the home-screen icon (<= 12 chars looks best). */
  shortName: "Hail Mary",
  /** One-line positioning shown under the wordmark / in metadata. */
  tagline: "Train in the dark.",
  /** Longer description for the PWA manifest + SEO. */
  description:
    "A thumb-friendly, offline strength & conditioning logger. Smart defaults, hardcore coaching cues, zero spreadsheet friction.",
  /** Default weight unit for this trial (the seed program is in lbs). */
  unit: "lbs" as "lbs" | "kg",
  /** Default weight step for the +/- steppers. */
  weightStep: 5,
} as const;
