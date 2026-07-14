/** Anatomical body-map geometry for BodyHeatmap.
 *
 *  Everything is authored as the RIGHT half of a figure whose spine is x=0
 *  (y: 0 crown → ~236 feet) and mirrored at render time — bilateral symmetry
 *  for free. `muscle` keys match Exercise.targetMuscle exactly; regions with
 *  no matching program muscle (Forearms, Glutes, …) render as neutral anatomy
 *  and light up automatically if the program ever targets them. */

export interface MuscleRegion {
  /** targetMuscle key ("Back", "Quads", …). */
  muscle: string;
  /** SVG path for the right-half region (mirrored automatically). */
  d: string;
  /** Render on the midline without mirroring (abs column, traps diamond). */
  midline?: boolean;
}

/* ---------- shared silhouette (half paths, mirrored) ---------- */

export const HEAD = { cy: 13, rx: 10.5, ry: 12.5 };

export const SILHOUETTE_HALF: string[] = [
  // neck
  "M0,23 L6.5,24 C7,27 7,30 6,33 L0,33 Z",
  // torso: shoulder → armpit → waist → hip
  "M0,31 L6,31 C13,33 21,36 24.5,41 C23,49 21.5,54 21,61 C19,79 15.5,93 14.5,104 C14.5,112 17,118 19,124 C13,128 6,130 0,130 Z",
  // arm: deltoid → elbow → wrist → hand
  "M23,41 C29,38.5 34,43 34,51 C34,63 32,79 29.5,95 C28,111 26.5,121 25.5,127 C25.5,133 26,138 25,142 C22.5,143 21,141 21.5,136 C20.5,130 20,122 20.5,112 C20,100 20.5,86 21,74 C21,64 21.5,54 22,48 C22,44.5 22.5,42.5 23,41 Z",
  // leg: hip → knee → ankle → foot
  "M2,126 C9,124 16.5,127 18,133 C19.5,151 17.5,169 14,183 C13,191 13.5,199 12.5,209 C12,220 11,228 10,233 L3.5,233 C4.5,223 4,214 4.5,204 C2.5,186 1,160 2,138 Z",
];

/* ---------- FRONT ---------- */

export const FRONT_MUSCLES: MuscleRegion[] = [
  // deltoid cap
  { muscle: "Shoulders", d: "M21.5,42.5 C26,38.5 32.5,42 33,49.5 C33.2,55 30.5,59.5 27,60.5 C24.5,57 22,49.5 21.5,42.5 Z" },
  // pec: clavicle → sternum → lower chest sweep
  { muscle: "Chest", d: "M1,49 C7,47.5 15,47 19.5,49.5 C23,52 23.5,58 21.5,63 C18.5,69.5 10,72 4.5,70 C1.5,68 0.5,58 1,49 Z" },
  // biceps
  { muscle: "Biceps", d: "M23,63 C27.5,61 31,65 30.5,73 C30,81 27.5,88 25,90 C22.5,87 21.5,76 22,69 C22.2,66 22.5,64.5 23,63 Z" },
  // forearm (front)
  { muscle: "Forearms", d: "M24.5,93 C27.5,91.5 29.5,95 29,102 C28,112 26.5,120 25.5,125 C23.5,124 22,116 22.5,106 C22.8,100 23.5,95.5 24.5,93 Z" },
  // abs column (midline)
  { muscle: "Core", midline: true, d: "M-8.5,74 C-3,76 3,76 8.5,74 C10,88 9,105 6,118 C2,120 -2,120 -6,118 C-9,105 -10,88 -8.5,74 Z" },
  // obliques
  { muscle: "Core", d: "M10.5,78 C14.5,80 16.5,88 15.5,97 C14.5,106 12,112 10,114 C8.5,106 8.8,90 10.5,78 Z" },
  // adductor (inner thigh)
  { muscle: "Adductors", d: "M1.5,130 C5.5,131 8,138 7.5,148 C7,156 4.5,160 2.5,158 C1,150 0.8,138 1.5,130 Z" },
  // quad teardrop
  { muscle: "Quads", d: "M9,130 C14.5,129 17.5,136 17,152 C16.5,166 14,177 11,181 C7.5,178 5.5,162 6,146 C6.3,138 7.2,132 9,130 Z" },
  // tibialis / shin
  { muscle: "Shins", d: "M11.5,190 C13.5,190 14,198 13,208 C12.2,218 11,226 10.2,230 C8.5,228 8,216 8.5,206 C9,198 10,192 11.5,190 Z" },
];

/* ---------- BACK ---------- */

export const BACK_MUSCLES: MuscleRegion[] = [
  // traps diamond (midline): neck → shoulder slope → mid-spine point
  { muscle: "Back", midline: true, d: "M0,26 C6,27 14,33 19,40 C13,45 7,52 3,62 C1.5,68 0.5,72 0,76 C-0.5,72 -1.5,68 -3,62 C-7,52 -13,45 -19,40 C-14,33 -6,27 0,26 Z" },
  // rear delt
  { muscle: "Shoulders", d: "M21.5,42.5 C26,38.5 32.5,42 33,49.5 C33.2,55 30.5,59.5 27,60.5 C24.5,57 22,49.5 21.5,42.5 Z" },
  // lat wing: armpit → sweep to waist
  { muscle: "Back", d: "M4,66 C9,62 16,60 20,62.5 C21,72 19,84 14.5,95 C10,103 5,106 2.5,104 C1,92 1.5,77 4,66 Z" },
  // triceps
  { muscle: "Triceps", d: "M23,62 C27.5,60 31,64.5 30.5,72.5 C30,80.5 27.5,87.5 25,89.5 C22.5,86.5 21.5,75.5 22,68.5 C22.2,65.5 22.5,63.5 23,62 Z" },
  // forearm (back)
  { muscle: "Forearms", d: "M24.5,93 C27.5,91.5 29.5,95 29,102 C28,112 26.5,120 25.5,125 C23.5,124 22,116 22.5,106 C22.8,100 23.5,95.5 24.5,93 Z" },
  // erectors (lower back, midline)
  { muscle: "Lower back", midline: true, d: "M-5,100 C-1.5,102 1.5,102 5,100 C6,108 5.5,116 4,122 C1.5,123.5 -1.5,123.5 -4,122 C-5.5,116 -6,108 -5,100 Z" },
  // glute
  { muscle: "Glutes", d: "M1.5,124 C8,121 15,124.5 16,133 C16.5,141 11.5,148 5.5,148.5 C2,147 0.5,140 1,132 Z" },
  // hamstring
  { muscle: "Hamstrings", d: "M8,152 C13,151 16,157 15.5,168 C15,177 12.5,183 10,185 C6.5,182 5,170 5.5,161 C5.8,156.5 6.5,153.5 8,152 Z" },
  // calf (gastrocnemius)
  { muscle: "Calves", d: "M9.5,192 C13,191 14.5,197 14,206 C13.5,214 11.5,221 9.8,224 C7.5,221 6.5,212 7,204 C7.3,198 8,194 9.5,192 Z" },
];
