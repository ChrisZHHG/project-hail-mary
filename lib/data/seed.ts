import type {
  Exercise,
  Program,
  Workout,
  WorkoutExercise,
  Session,
  SetLog,
} from "./types";

/* ------------------------------------------------------------------ *
 * Seed data — Austin Johansen's 3-day full-body block (Chris's data). *
 * Transcribed verbatim from the shared Google Sheet, including the    *
 * coaching NOTES (the "hardcore tooltips") and form-video links.      *
 * ------------------------------------------------------------------ */

const PROGRAM_ID = "prog-fullbody";

// Exercise catalog (deduped across the 3 days). Keyed by short code.
const CATALOG = {
  cars: {
    name: "Hip / Shoulder CARS",
    targetMuscle: "Mobility",
    category: "mobility",
    isWeighted: false,
    biomechanicNotes:
      "Controlled Articular Rotations: slow, maximal-range circles. Own every degree before you load the joint.",
  },
  antTilt: {
    name: "Anterior Tilt Stretches",
    targetMuscle: "Mobility",
    category: "mobility",
    isWeighted: false,
    biomechanicNotes: "Do these in the morning, away from the workout, for best results.",
  },
  pulldown: {
    name: "Band Assisted Pull-ups OR Lat Pulldown",
    targetMuscle: "Back",
    category: "compound",
    isWeighted: true,
  },
  row: {
    name: "DB Chest-Supported Upper Back Row",
    targetMuscle: "Back",
    category: "compound",
    isWeighted: true,
  },
  press: {
    name: "Machine Chest Press OR BB/DB Bench Press",
    targetMuscle: "Chest",
    category: "compound",
    isWeighted: true,
  },
  preacher: {
    name: "DB Preacher Curl",
    targetMuscle: "Biceps",
    category: "isolation",
    isWeighted: true,
  },
  squat: {
    name: "BB Squat OR Leg Press",
    targetMuscle: "Quads",
    category: "compound",
    isWeighted: true,
  },
  legCurl: {
    name: "Leg Curl",
    targetMuscle: "Hamstrings",
    category: "isolation",
    isWeighted: true,
    link: "https://youtube.com/shorts/Ymd77MLt_Oc",
  },
  legExt: {
    name: "Leg Extension",
    targetMuscle: "Quads",
    category: "isolation",
    isWeighted: true,
    link: "https://youtu.be/vluYLwdr5pw",
  },
  toePress: {
    name: "Toe Press",
    targetMuscle: "Calves",
    category: "isolation",
    isWeighted: true,
    biomechanicNotes:
      "Hold the stretch at the bottom of each rep for 3-5 seconds. Then come only to neutral — not up onto your toes.",
  },
  calfRaise: {
    name: "Straight-Legged Calf Raise",
    targetMuscle: "Calves",
    category: "isolation",
    isWeighted: true,
    biomechanicNotes:
      "Elevate your foot on a plate/step/bench. Hold something with the other hand for stability. Full stretch at the bottom.",
  },
  triExt: {
    name: "Tricep Extension",
    targetMuscle: "Triceps",
    category: "isolation",
    isWeighted: true,
  },
  cableTri: {
    name: "Cable Straight-Bar OR Rope Tricep Extension",
    targetMuscle: "Triceps",
    category: "isolation",
    isWeighted: true,
  },
  latRaise: {
    name: "Cable Lateral Raise",
    targetMuscle: "Shoulders",
    category: "isolation",
    isWeighted: true,
  },
  saLatRaise: {
    name: "Single-Arm Cable Lateral Raise",
    targetMuscle: "Shoulders",
    category: "isolation",
    isWeighted: true,
  },
  cableCrunch: {
    name: "Cable Crunch",
    targetMuscle: "Core",
    category: "isolation",
    isWeighted: true,
  },
  adductor: {
    name: "Adductor Yoga-Ball Isometric",
    targetMuscle: "Adductors",
    category: "isolation",
    isWeighted: false,
    link: "https://youtube.com/shorts/WF4uuJw9uSo",
    biomechanicNotes: "4-second burst as hard as you can, 4-second rest. Repeat 4x.",
  },
  bike: {
    name: "Exercise Bike — 20 Minutes",
    targetMuscle: "Cardio",
    category: "cardio",
    isWeighted: false,
  },
  steps: {
    name: "8000+ Steps By End Of Day",
    targetMuscle: "Cardio",
    category: "cardio",
    isWeighted: false,
  },
} satisfies Record<string, Omit<Exercise, "id">>;

type Code = keyof typeof CATALOG;

const exerciseId = (code: Code) => `ex-${code}`;

export const SEED_EXERCISES: Exercise[] = (Object.keys(CATALOG) as Code[]).map((code) => ({
  id: exerciseId(code),
  ...CATALOG[code],
}));

export const SEED_PROGRAM: Program = {
  id: PROGRAM_ID,
  name: "Full-Body Block — Austin Johansen",
  createdAt: 0,
};

// Compact assignment spec → expanded into WorkoutExercise rows.
type Assign = {
  code: Code;
  section: WorkoutExercise["section"];
  sets: number;
  reps: string;
  rir?: string;
  cardioSpec?: string;
  optional?: boolean;
};

const DAYS: { id: string; name: string; subtitle: string; items: Assign[] }[] = [
  {
    id: "wo-fb1",
    name: "Full Body 1",
    subtitle: "Tuesday",
    items: [
      { code: "cars", section: "warmup", sets: 1, reps: "4-8" },
      { code: "antTilt", section: "warmup", sets: 1, reps: "—" },
      { code: "pulldown", section: "main", sets: 2, reps: "3-8", rir: "2" },
      { code: "row", section: "main", sets: 1, reps: "4-8", rir: "2" },
      { code: "press", section: "main", sets: 2, reps: "4-8", rir: "2" },
      { code: "preacher", section: "main", sets: 2, reps: "4-8", rir: "2" },
      { code: "squat", section: "main", sets: 2, reps: "4-8", rir: "3-4" },
      { code: "legCurl", section: "main", sets: 1, reps: "4-8", rir: "2" },
      { code: "toePress", section: "main", sets: 1, reps: "4-8", rir: "2" },
      { code: "triExt", section: "main", sets: 2, reps: "4-8" },
      { code: "latRaise", section: "main", sets: 2, reps: "4-8", rir: "2" },
      { code: "cableCrunch", section: "main", sets: 1, reps: "5-10", rir: "2", optional: true },
      { code: "steps", section: "cardio", sets: 1, reps: "—" },
      { code: "bike", section: "cardio", sets: 1, reps: "—", cardioSpec: "Zone 2 Cardio" },
    ],
  },
  {
    id: "wo-fb2",
    name: "Full Body 2",
    subtitle: "Thursday",
    items: [
      { code: "cars", section: "warmup", sets: 1, reps: "4-8" },
      { code: "antTilt", section: "warmup", sets: 1, reps: "—" },
      { code: "pulldown", section: "main", sets: 2, reps: "3-8", rir: "2" },
      { code: "row", section: "main", sets: 1, reps: "4-8", rir: "2" },
      { code: "press", section: "main", sets: 2, reps: "4-8", rir: "2" },
      { code: "preacher", section: "main", sets: 2, reps: "4-8", rir: "2" },
      { code: "legExt", section: "main", sets: 2, reps: "4-8", rir: "2" },
      { code: "legCurl", section: "main", sets: 1, reps: "4-8", rir: "2" },
      { code: "toePress", section: "main", sets: 1, reps: "4-8", rir: "2" },
      { code: "latRaise", section: "main", sets: 2, reps: "4-8", rir: "2" },
      { code: "cableCrunch", section: "main", sets: 1, reps: "5-10", rir: "2", optional: true },
    ],
  },
  {
    id: "wo-fb3",
    name: "Full Body 3",
    subtitle: "Saturday / Sunday",
    items: [
      { code: "cars", section: "warmup", sets: 1, reps: "4-8" },
      { code: "antTilt", section: "warmup", sets: 1, reps: "—" },
      { code: "pulldown", section: "main", sets: 2, reps: "3-8", rir: "2" },
      { code: "row", section: "main", sets: 1, reps: "4-8", rir: "2" },
      { code: "press", section: "main", sets: 2, reps: "4-8", rir: "2" },
      { code: "preacher", section: "main", sets: 2, reps: "4-8", rir: "2" },
      { code: "legExt", section: "main", sets: 2, reps: "4-8", rir: "2" },
      { code: "legCurl", section: "main", sets: 1, reps: "4-8", rir: "2" },
      { code: "calfRaise", section: "main", sets: 1, reps: "4-8", rir: "2" },
      { code: "cableTri", section: "main", sets: 2, reps: "4-8", rir: "2" },
      { code: "adductor", section: "main", sets: 1, reps: "4x4 bursts" },
      { code: "cableCrunch", section: "main", sets: 1, reps: "5-10", rir: "2" },
      { code: "saLatRaise", section: "main", sets: 1, reps: "4-8", rir: "2" },
      { code: "steps", section: "cardio", sets: 1, reps: "—" },
      { code: "bike", section: "cardio", sets: 1, reps: "—", cardioSpec: "Zone 2 Cardio" },
    ],
  },
];

export const SEED_WORKOUTS: Workout[] = DAYS.map((d, i) => ({
  id: d.id,
  programId: PROGRAM_ID,
  name: d.name,
  subtitle: d.subtitle,
  dayOrder: i,
}));

export const SEED_WORKOUT_EXERCISES: WorkoutExercise[] = DAYS.flatMap((d) =>
  d.items.map((a, idx) => ({
    id: `we-${d.id}-${idx}`,
    workoutId: d.id,
    exerciseId: exerciseId(a.code),
    order: idx,
    section: a.section,
    targetSets: a.sets,
    targetRepsRange: a.reps,
    targetRir: a.rir,
    cardioSpec: a.cardioSpec,
    optional: a.optional,
  }))
);

/* A single prior FB1 session built from the WEIGHT column in the sheet, so the
 * "Last time: …" prefill + a non-empty Progress chart work on first launch.
 * These are real recorded numbers, not fabricated. */
export function buildDemoHistory(now: number): { session: Session; logs: SetLog[] } {
  const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;
  const dateStr = new Date(threeDaysAgo).toISOString().slice(0, 10);
  const session: Session = {
    id: "sess-demo-fb1",
    workoutId: "wo-fb1",
    date: dateStr,
    startedAt: threeDaysAgo,
    completedAt: threeDaysAgo + 55 * 60 * 1000,
  };
  // weId helper: index of the assignment within FB1
  const we = (idx: number) => `we-wo-fb1-${idx}`;
  const mk = (
    weIdx: number,
    setNumber: number,
    weight: number | undefined,
    reps: number,
    rir = 2
  ): SetLog => ({
    id: `log-demo-${weIdx}-${setNumber}`,
    sessionId: session.id,
    workoutExerciseId: we(weIdx),
    setNumber,
    weight,
    reps,
    rir,
    done: true,
    timestamp: threeDaysAgo + weIdx * 3 * 60 * 1000,
  });
  const logs: SetLog[] = [
    mk(2, 1, undefined, 6), // pulldown (assisted) 6 reps
    mk(2, 2, undefined, 6),
    mk(3, 1, 110, 7), // upper back row 110x7
    mk(4, 1, 130, 4), // chest press 130x4
    mk(4, 2, 130, 4),
    mk(5, 1, 15, 8), // preacher curl 15x8
    mk(5, 2, 15, 15),
    mk(7, 1, 45, 8), // leg curl 45x8 / 60x6
  ];
  // leg curl second set at 60x6
  logs.push(mk(7, 2, 60, 6));
  return { session, logs };
}
