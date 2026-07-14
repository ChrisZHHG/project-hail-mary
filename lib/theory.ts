/** The coach's knowledge base, structured. Every item has a stable id so
 *  training and theory link both ways:
 *
 *  - theory → exercises: explicit `exerciseIds`, plus auto-match on
 *    `targetMuscles` (matched against Exercise.targetMuscle).
 *  - exercises → theory: `theoryForExercise()` below; ExecutionCard renders
 *    a 📖 chip that deep-links to /method#<id>.
 *
 *  `general: true` items (RIR, frequency…) apply to all training and are
 *  deliberately NOT linked to specific movements. */

export type TheoryCategory = "principle" | "corrective" | "habit";

export interface TheoryItem {
  id: string;
  category: TheoryCategory;
  tag: string;
  title: string;
  body: string;
  /** Protocol steps, rendered as a numbered list. */
  steps?: string[];
  /** e.g. "5s hold × 3-5 each side · 1-2× daily". */
  dosage?: string;
  /** Auto-match: lights up on exercises whose targetMuscle is listed. */
  targetMuscles?: string[];
  /** Explicit links to exercise ids (ex-*). */
  exerciseIds?: string[];
  /** Applies to all training — never attached to a specific movement. */
  general?: boolean;
  source?: string;
  /** Do this before training — surfaced in the session warm-up block. */
  preWorkout?: boolean;
}

const SHOULDER_STORY = "The Shoulder Story v5 — corrective strategies";

export const THEORY: TheoryItem[] = [
  /* ------------------------- principles (general) ------------------------- */
  {
    id: "th-frequency",
    category: "principle",
    tag: "FREQUENCY",
    title: "Frequency > load",
    body: "Train each pattern often at submaximal loads. Weekly volume and quality reps drive growth — not ego weight on one heroic set.",
    general: true,
  },
  {
    id: "th-rir",
    category: "principle",
    tag: "RIR",
    title: "Leave reps in reserve",
    body: "Stop shy of failure (the program's 0-1 RIR is close, but controlled). Spend less of the tank per set so you recover faster and can train the movement again sooner.",
    general: true,
  },
  {
    id: "th-isometrics",
    category: "principle",
    tag: "ISOMETRICS",
    title: "Isometrics build tendons",
    body: "Hold positions under tension. Yielding & overcoming isometrics build tendon stiffness and resilient joints through range — the base strength is built on.",
    exerciseIds: ["ex-adductor", "ex-legExt", "ex-legCurl"],
  },
  {
    id: "th-smh",
    category: "principle",
    tag: "SMH",
    title: "Load the stretch",
    body: "Pause in the lengthened position — hold the bottom 3-5s. Stretch-mediated hypertrophy: the most growth lives at long muscle lengths.",
    exerciseIds: ["ex-toePress", "ex-calfRaise"],
  },
  {
    id: "th-mobility",
    category: "principle",
    tag: "MOBILITY",
    title: "Own your end-range",
    body: "CARS and controlled rotations before you load. Mobility you actively control is mobility you keep — and joints you can trust under weight.",
    exerciseIds: ["ex-cars", "ex-antTilt"],
  },
  {
    id: "th-readiness",
    category: "principle",
    tag: "READINESS",
    title: "Autoregulate to recovery",
    body: "The weekly check-in tunes volume to your sleep, soreness, and joints. Train the body you have this week — your coach adjusts the plan from it.",
    general: true,
  },

  /* --------------- The Shoulder Story (corrective protocol) --------------- */
  {
    id: "th-nose-to-armpit",
    category: "corrective",
    tag: "RELEASE",
    title: "Nose to Armpit Stretch",
    body: "Releases the levator scapulae on the high-shoulder side.",
    steps: [
      "On the high-shoulder side, place that arm behind your low back to stretch the arm down.",
      "With the opposite hand, grab the back of your head and take your chin down toward the armpit, away from the high shoulder.",
      "Gently push your head back into your hand — the hand is an immovable barrier that resists the motion. Hold 5 seconds.",
      "Relax and sink deeper into the stretch. Repeat 3-5 reps.",
    ],
    dosage: "5s hold × 3-5 each side · 1-2× daily · before training",
    targetMuscles: ["Shoulders", "Neck"],
    source: SHOULDER_STORY,
    preWorkout: true,
  },
  {
    id: "th-ear-to-shoulder",
    category: "corrective",
    tag: "RELEASE",
    title: "Ear to Shoulder Stretch",
    body: "Releases the upper trapezius.",
    steps: [
      "Pull both arms straight down to create stretch tension in the upper shoulders.",
      "Tilt your head away from the high shoulder, bringing ear to shoulder; the same-side hand gently pulls the head down.",
      "Gently push your head up into your hand — an immovable barrier resisting the motion. Hold the 5-second contraction.",
      "Relax, sink deeper into the stretch, repeat 3-5 reps.",
    ],
    dosage: "5s hold × 3-5 each side · 1-2× daily",
    targetMuscles: ["Shoulders", "Neck", "Back"],
    source: SHOULDER_STORY,
    preWorkout: true,
  },
  {
    id: "th-arm-wrestler",
    category: "corrective",
    tag: "ACTIVATE",
    title: "The Arm Wrestler",
    body: "Activates the infraspinatus — do on the side of the high shoulder(s).",
    steps: [
      "Stand sideways to a wall, near-side arm out in front, elbow bent so the forearm points up (arm-wrestling pose).",
      "Keep everything else still and slowly press the back of your forearm into the wall — as if losing the arm-wrestling match. Hold 5 seconds.",
      "Relax the forearm down to horizontal and repeat for 8-12 reps or 60-90 seconds.",
    ],
    dosage: "5s press × 8-12 reps (or 60-90s)",
    targetMuscles: ["Shoulders"],
    source: SHOULDER_STORY,
    preWorkout: true,
  },
  {
    id: "th-street-beggars",
    category: "corrective",
    tag: "STRENGTHEN",
    title: "Downhill Street Beggars",
    body: "Strengthens the rhomboids, middle and lower trapezius — the muscles that pull the shoulder blades down.",
    steps: [
      "Rest the back of your hips against a wall, lean forward 45°, keeping a straight back.",
      "Elbows down by your sides, forearms forward with palms up — like begging.",
      "Keeping elbows tight by your sides, arc the forearms out and squeeze the shoulder blades together and down. Hold 5 seconds.",
      "Relax the arms back in front and repeat for 8-12 reps or 60-90 seconds.",
    ],
    dosage: "5s squeeze × 8-12 reps · progress: 2-5 lb dumbbells, then W-retractions face-down",
    targetMuscles: ["Back", "Shoulders"],
    source: SHOULDER_STORY,
    preWorkout: true,
  },
  {
    id: "th-belly-breathing",
    category: "corrective",
    tag: "BREATHE",
    title: "Belly Breathing",
    body: "Promotes a non-chest breathing pattern. You breathe 25-30k times a day — chest breathing is that many shrug reps for the upper traps.",
    steps: [
      "One hand on your belly, one on your chest.",
      "Big slow breaths in through the nostrils, down into the belly, expanding the core in all directions (front, back, sides).",
      "Shoulders and face relaxed. Watch your hands — the bottom hand should do 80% of the movement.",
      "If standing is too hard, do it lying face up.",
    ],
    dosage: "10 breaths or 60-90s · ideally also just before bed",
    general: true,
    source: SHOULDER_STORY,
  },

  /* ------------------------------ habits ------------------------------ */
  {
    id: "th-do-more",
    category: "habit",
    tag: "DO MORE",
    title: "Habits that end the shoulder story well",
    body: "Rotator-cuff stability work · hip alignment (misaligned hips inhibit the lats and drag shoulders up) · mid & lower trap strength — think \"shoulder blades down toward your back pockets\" during weight training · massage for upper shoulders & infraspinatus · belly breathing · watch trigger foods (wheat & dairy are common culprits).",
    targetMuscles: ["Shoulders", "Back"],
    source: SHOULDER_STORY,
  },
  {
    id: "th-do-less",
    category: "habit",
    tag: "DO LESS",
    title: "Habits that keep shoulders elevated",
    body: "Sleeping with the affected arm overhead · overhead presses · deep chest presses & deep dips (shrug compensation, aggravated GH/AC joints) · shoulder shrugs · high arm-rests · chest breathing · excess sugar (body acidity feeds chest-breathing patterns).",
    targetMuscles: ["Shoulders", "Chest"],
    source: SHOULDER_STORY,
  },
];

/* --------------------------- linking helpers --------------------------- */

/** Theory related to one exercise: explicit id links first, then muscle match.
 *  General items never attach to a movement. */
export function theoryForExercise(exerciseId: string, targetMuscle: string): TheoryItem[] {
  const explicit = THEORY.filter((t) => t.exerciseIds?.includes(exerciseId));
  const byMuscle = THEORY.filter(
    (t) =>
      !t.general &&
      !t.exerciseIds?.includes(exerciseId) &&
      t.targetMuscles?.includes(targetMuscle)
  );
  return [...explicit, ...byMuscle];
}

export const PRE_WORKOUT_PROTOCOL = THEORY.filter((t) => t.preWorkout);

/** Legacy shape for the Home teaser chips. */
export const PRINCIPLES = THEORY.filter((t) => t.category === "principle");

/** Derive a method tag for an exercise so the theory shows up in context. */
export function methodTag(name: string, category: string): string | null {
  const n = name.toLowerCase();
  if (n.includes("isometric") || n.includes("burst")) return "ISOMETRIC";
  if (n.includes("cars") || category === "mobility") return "MOBILITY · FRC";
  if (n.includes("calf") || n.includes("toe press")) return "STRETCH · SMH";
  return null;
}
