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
  name: "Train with Intention & Attention",
  /** Short name for the home-screen icon (<= 12 chars looks best). */
  shortName: "Intention",
  /** One-line positioning shown under the wordmark / in metadata.
   *  Ethos: train with intention + attention — every rep on purpose. */
  tagline: "Project Hail Mary",
  /** Longer description for the PWA manifest + SEO. */
  description:
    "Train with intention and attention. A thumb-friendly S&C logger with smart defaults and hardcore coaching cues — every rep on purpose.",
  /** Default weight unit for this trial (the seed program is in lbs). */
  unit: "lbs" as "lbs" | "kg",
  /** Default weight step for the +/- steppers. */
  weightStep: 2.5,
} as const;
