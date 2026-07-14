/** Movement-pattern pictograms — Chris recognizes machines by picture, not by
 *  English name. Minimal stick-figure glyphs, stroke = currentColor so they
 *  tint with context (cyan chips, faint lists…). Keyed by Exercise.pattern. */

const S = 1.7; // stroke width

function Base({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className="h-9 w-9 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={S}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const ICONS: Record<string, React.ReactNode> = {
  // circular arrows around a joint
  mobility: (
    <>
      <circle cx="20" cy="20" r="4" />
      <path d="M20 8a12 12 0 0 1 11 7.5" />
      <path d="m31.5 11 0 5-4.8-1.5" />
      <path d="M20 32a12 12 0 0 1-11-7.5" />
      <path d="m8.5 29 0-5 4.8 1.5" />
    </>
  ),
  // figure leaning into a stretch
  stretch: (
    <>
      <circle cx="26" cy="9" r="3" />
      <path d="M25 12 18 22l-6 9" />
      <path d="M18 22l9 3" />
      <path d="M12 31h16" opacity="0.5" />
    </>
  ),
  // overhead bar pulled down to a seated figure
  pulldown: (
    <>
      <path d="M8 7h24" />
      <path d="M12 7v5m16-5v5" opacity="0.6" />
      <circle cx="20" cy="17" r="3" />
      <path d="M20 20v8m0 0-5 6m5-6 5 6" />
      <path d="M14 12l6 5m6-5-6 5" />
      <path d="m10 14-2 4m22-4 2 4" opacity="0.7" />
    </>
  ),
  // seated figure pulling a handle to the torso
  row: (
    <>
      <circle cx="13" cy="12" r="3" />
      <path d="M13 15v9l-4 8m4-8h7" />
      <path d="M13 18l10 2" />
      <path d="M29 20h5" />
      <path d="m26 17 3 3-3 3" />
    </>
  ),
  // figure pressing a bar away from the chest
  press: (
    <>
      <circle cx="11" cy="20" r="3" />
      <path d="M11 23v8" />
      <path d="M13 19l9 0" />
      <path d="M25 13v13" />
      <path d="M28 20h6" />
      <path d="m31 17 3 3-3 3" />
    </>
  ),
  // forearm curling a dumbbell up
  curl: (
    <>
      <path d="M10 30h9" />
      <path d="M14 30V17" />
      <path d="M14 17l10-3" opacity="0.4" />
      <path d="M14 17l9 8" />
      <circle cx="25" cy="27" r="3.4" />
      <path d="M30 20a10 10 0 0 0-4-6" />
      <path d="m26 12 4 1-1 4" />
    </>
  ),
  // figure squatting with a bar on the shoulders
  squat: (
    <>
      <path d="M8 10h24" />
      <circle cx="20" cy="8" r="2.6" />
      <path d="M20 13c0 4-4 5-4 9l4 4 4-4c0-4-4-5-4-9Z" opacity="0" />
      <path d="M20 13v5l-5 5 3 9" />
      <path d="M20 18l5 5-3 9" />
      <path d="m13 33 4 0m6 0 4 0" opacity="0.5" />
    </>
  ),
  // heel curling toward the glutes (knee pivot)
  legcurl: (
    <>
      <path d="M8 16h16" />
      <circle cx="10" cy="12" r="2.6" />
      <path d="M24 16c4 0 6 3 6 6" />
      <path d="M30 22l-4 7" />
      <path d="m23 26 3 3 4-1" opacity="0.8" />
    </>
  ),
  // shin extending forward from a seated knee
  legext: (
    <>
      <circle cx="12" cy="10" r="2.6" />
      <path d="M12 13v9l6 1" />
      <path d="M18 23l10-2" />
      <path d="M28 21l4-8" />
      <path d="m28 12 4 1 1 4" opacity="0.8" />
    </>
  ),
  // heel raising on a step
  calf: (
    <>
      <path d="M10 32h20" opacity="0.5" />
      <path d="M16 32v-6h10l4 6" />
      <path d="M18 26V14" />
      <circle cx="18" cy="10" r="2.6" />
      <path d="M14 20l-3-2" opacity="0.6" />
      <path d="M12 30v-5m0 0-2 2m2-2 2 2" />
    </>
  ),
  // cable from above, forearms pressing down
  pushdown: (
    <>
      <path d="M20 6v7" />
      <circle cx="20" cy="5" r="1.6" opacity="0.6" />
      <path d="M14 13h12" />
      <path d="M14 13l-3 8m18-8 3 8" />
      <path d="M11 25v-4m0 4-2-2m2 2 2-2" />
      <path d="M29 25v-4m0 4-2-2m2 2 2-2" />
    </>
  ),
  // arms raising out to the sides
  lateralraise: (
    <>
      <circle cx="20" cy="9" r="3" />
      <path d="M20 12v14m0 0-5 8m5-8 5 8" />
      <path d="M20 16l-9 4m9-4 9 4" />
      <path d="M9 17a14 14 0 0 0 2 3m20-3a14 14 0 0 1-2 3" opacity="0.8" />
    </>
  ),
  // kneeling cable crunch curling down
  crunch: (
    <>
      <path d="M24 5v6" opacity="0.6" />
      <circle cx="22" cy="14" r="3" />
      <path d="M22 17c-4 1-7 4-7 8" />
      <path d="M15 25l-4 7h8" />
      <path d="M27 20a10 10 0 0 1-6 7" opacity="0.8" />
      <path d="m20 25 1 3 3-1" opacity="0.8" />
    </>
  ),
  // knees squeezing a ball inward
  adductor: (
    <>
      <circle cx="20" cy="22" r="6" />
      <path d="M8 12l6 7m18-7-6 7" />
      <path d="m11 22 3-1m15 1-3-1" />
      <path d="M14 28l-3 6m18-6 3 6" opacity="0.6" />
    </>
  ),
  bike: (
    <>
      <circle cx="11" cy="27" r="6" />
      <circle cx="29" cy="27" r="6" />
      <path d="M11 27l6-11h8" />
      <path d="M29 27l-5-11" />
      <path d="M15 16h5" opacity="0.7" />
      <circle cx="20" cy="27" r="1.6" />
    </>
  ),
  steps: (
    <>
      <path d="M10 30c-1-3 1-5 3-5s3 2 2.5 4-4 4-5.5 1Z" />
      <path d="M22 20c-1-3 1-5 3-5s3 2 2.5 4-4 4-5.5 1Z" />
      <path d="M13 21v-2m3 2v-2" opacity="0.6" />
      <path d="M25 11v-2m3 2v-2" opacity="0.6" />
    </>
  ),
};

export default function ExerciseIcon({ pattern }: { pattern?: string }) {
  const glyph = pattern ? ICONS[pattern] : undefined;
  return <Base>{glyph ?? <circle cx="20" cy="20" r="8" opacity="0.4" />}</Base>;
}
