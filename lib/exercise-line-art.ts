/** wger.de downloads in public/exercises/ are a mixed bag: simple line drawings
 *  tint cleanly with the cyan invert filter, but anatomical muscle diagrams and
 *  gym photos do not. Only allowlisted slugs render as images; everything else
 *  falls back to the movement-pattern pictogram in ExerciseIcon.tsx. */
const LINE_ART = new Set([
  // catalog (coach program)
  "cable-crunch",
  "calf-raise",
  "lat-raise",
  "leg-ext",
  "preacher",
  "press",
  "row",
  "seated-row",
  "squat",
  // library extras
  "adductor-machine",
  "arnold-press",
  "barbell-curl",
  "cable-curl",
  "cable-fly",
  "db-shoulder-press",
  "face-pull",
  "front-raise",
  "front-squat",
  "good-morning",
  "hack-squat",
  "hammer-curl",
  "hanging-leg-raise",
  "hip-thrust",
  "incline-db-press",
  "overhead-triceps-extension",
  "plank",
  "reverse-curl",
  "romanian-deadlift",
  "seated-calf-raise",
  "skull-crusher",
  "standing-calf-raise",
  "t-bar-row",
  "wrist-curl",
]);

export function slugFromExerciseSrc(src: string): string | undefined {
  const m = src.match(/\/exercises\/([^/]+)\.png$/);
  return m?.[1];
}

export function isLineArtExerciseSrc(src: string): boolean {
  const slug = slugFromExerciseSrc(src);
  return slug != null && LINE_ART.has(slug);
}
