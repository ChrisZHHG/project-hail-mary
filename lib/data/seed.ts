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

const WGER_ATTRIBUTION = "wger.de contributors · CC-BY-SA";
/** Shorthand: image entry for a matched wger download (see
 *  scripts/fetch-wger-images.mjs). Best-effort visual reference — falls
 *  back to the ExerciseIcon pictogram wherever unset. */
const img = (slug: string): Exercise["media"] => ({
  kind: "image",
  src: `/exercises/${slug}.png`,
  attribution: WGER_ATTRIBUTION,
});

// Exercise catalog (deduped across the 3 days). Keyed by short code.
const CATALOG = {
  cars: {
    name: "Hip / Shoulder CARS",
    aliasZh: "髋/肩关节环绕",
    pattern: "mobility",
    targetMuscle: "Mobility",
    category: "mobility",
    isWeighted: false,
    biomechanicNotes:
      "Controlled Articular Rotations: slow, maximal-range circles. Own every degree before you load the joint.",
  },
  antTilt: {
    name: "Anterior Tilt Stretches",
    aliasZh: "骨盆前倾拉伸",
    pattern: "stretch",
    targetMuscle: "Mobility",
    category: "mobility",
    isWeighted: false,
    biomechanicNotes: "Do these in the morning, away from the workout, for best results.",
  },
  pulldown: {
    name: "Band Assisted Pull-ups OR Lat Pulldown",
    aliasZh: "引体向上 / 高位下拉",
    pattern: "pulldown",
    targetMuscle: "Back",
    category: "compound",
    isWeighted: true,
    // media dropped: wger match is a colored anatomical diagram
  },
  row: {
    name: "DB Chest-Supported Upper Back Row",
    aliasZh: "哑铃胸支撑划船",
    pattern: "row",
    targetMuscle: "Back",
    category: "compound",
    isWeighted: true,
    media: img("row"),
  },
  press: {
    name: "Machine Chest Press OR BB/DB Bench Press",
    aliasZh: "坐姿推胸 / 卧推",
    pattern: "press",
    targetMuscle: "Chest",
    category: "compound",
    isWeighted: true,
    media: img("press"),
  },
  preacher: {
    name: "DB Preacher Curl",
    aliasZh: "牧师凳弯举",
    pattern: "curl",
    targetMuscle: "Biceps",
    category: "isolation",
    isWeighted: true,
    media: img("preacher"),
  },
  squat: {
    name: "BB Squat OR Leg Press",
    aliasZh: "杠铃深蹲 / 倒蹬",
    pattern: "squat",
    targetMuscle: "Quads",
    category: "compound",
    isWeighted: true,
    media: img("squat"),
  },
  legCurl: {
    name: "Leg Curl",
    aliasZh: "腿弯举",
    pattern: "legcurl",
    targetMuscle: "Hamstrings",
    category: "isolation",
    isWeighted: true,
    link: "https://youtube.com/shorts/Ymd77MLt_Oc",
    // media dropped: wger match is a colored anatomical diagram
  },
  legExt: {
    name: "Leg Extension",
    aliasZh: "腿屈伸",
    pattern: "legext",
    targetMuscle: "Quads",
    category: "isolation",
    isWeighted: true,
    link: "https://youtu.be/vluYLwdr5pw",
    media: img("leg-ext"),
  },
  toePress: {
    name: "Toe Press",
    aliasZh: "倒蹬机脚尖推(提踵)",
    pattern: "calf",
    targetMuscle: "Calves",
    category: "isolation",
    isWeighted: true,
    biomechanicNotes:
      "Hold the stretch at the bottom of each rep for 3-5 seconds. Then come only to neutral — not up onto your toes.",
    // media dropped: wger calf-press art is a full-color anatomical illustration
  },
  calfRaise: {
    name: "Straight-Legged Calf Raise",
    aliasZh: "直腿提踵",
    pattern: "calf",
    targetMuscle: "Calves",
    category: "isolation",
    isWeighted: true,
    biomechanicNotes:
      "Elevate your foot on a plate/step/bench. Hold something with the other hand for stability. Full stretch at the bottom.",
    media: img("calf-raise"),
  },
  triExt: {
    name: "Tricep Extension",
    aliasZh: "三头臂屈伸",
    pattern: "pushdown",
    targetMuscle: "Triceps",
    category: "isolation",
    isWeighted: true,
    // media dropped: unrelated gym photo of a spotted lift, not a tricep extension
  },
  cableTri: {
    name: "Cable Straight-Bar OR Rope Tricep Extension",
    aliasZh: "绳索三头下压",
    pattern: "pushdown",
    targetMuscle: "Triceps",
    category: "isolation",
    isWeighted: true,
    // media dropped: dual-pose A/B diagram with arrow
  },
  latRaise: {
    name: "Cable Lateral Raise",
    aliasZh: "绳索侧平举",
    pattern: "lateralraise",
    targetMuscle: "Shoulders",
    category: "isolation",
    isWeighted: true,
    media: img("lat-raise"),
  },
  saLatRaise: {
    name: "Single-Arm Cable Lateral Raise",
    aliasZh: "单臂绳索侧平举",
    pattern: "lateralraise",
    targetMuscle: "Shoulders",
    category: "isolation",
    isWeighted: true,
    // media dropped: outdoor band photo, not cable
  },
  cableCrunch: {
    name: "Cable Crunch",
    aliasZh: "绳索卷腹",
    pattern: "crunch",
    targetMuscle: "Core",
    category: "isolation",
    isWeighted: true,
    media: img("cable-crunch"),
  },
  adductor: {
    name: "Adductor Yoga-Ball Isometric",
    aliasZh: "瑜伽球内收肌等长",
    pattern: "adductor",
    targetMuscle: "Adductors",
    category: "isolation",
    isWeighted: false,
    link: "https://youtube.com/shorts/WF4uuJw9uSo",
    biomechanicNotes: "4-second burst as hard as you can, 4-second rest. Repeat 4x.",
    // media dropped: foam-roll photo ≠ yoga-ball isometric
  },
  // --- Chris's freestyle back-day machines (reconstructed watch sessions;
  // --- not in Austin's program, but part of the real training history) ---
  saRow: {
    name: "Single-Arm Machine Row",
    aliasZh: "单臂器械划船",
    pattern: "row",
    targetMuscle: "Back",
    category: "compound",
    isWeighted: true,
    biomechanicNotes: "Right arm runs ~2 reps ahead of the left — log each arm as its own set.",
    // media dropped: dim gym photo, poor legibility after invert filter
  },
  seatedRow: {
    name: "Seated Cable Row",
    aliasZh: "坐姿绳索划船",
    pattern: "row",
    targetMuscle: "Back",
    category: "compound",
    isWeighted: true,
    media: img("seated-row"),
  },
  bike: {
    name: "Exercise Bike — 20 Minutes",
    aliasZh: "单车 20 分钟",
    pattern: "bike",
    targetMuscle: "Cardio",
    category: "cardio",
    isWeighted: false,
  },
  steps: {
    name: "8000+ Steps By End Of Day",
    aliasZh: "全天 8000+ 步",
    pattern: "steps",
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
  notes?: string;
  cardioSpec?: string;
  optional?: boolean;
};

/* ⚠️ APPEND-ONLY: WorkoutExercise ids are positional (`we-<workout>-<idx>`).
 * Never insert or reorder items mid-list — historical SetLogs reference these
 * ids. The db version(2) upgrade remaps logs by (workoutId, exerciseId) when
 * the layout changes; bump the DB version and extend that remap if you must
 * restructure again.
 *
 * Program v2 (June 2026, coach's updated sheet): RIR tightened to 0-1
 * (squat 1-2), FB1 drops Tricep Extension and runs 1 set of lateral raises,
 * FB3 leg extension/curl get "OR Isometric" alternatives with form videos. */
const DAYS: { id: string; name: string; subtitle: string; items: Assign[] }[] = [
  {
    id: "wo-fb1",
    name: "Full Body 1",
    subtitle: "Tuesday",
    items: [
      { code: "cars", section: "warmup", sets: 1, reps: "4-8" },
      { code: "antTilt", section: "warmup", sets: 1, reps: "—" },
      { code: "pulldown", section: "main", sets: 2, reps: "3-8", rir: "0-1" },
      { code: "row", section: "main", sets: 1, reps: "4-8", rir: "0-1" },
      { code: "press", section: "main", sets: 2, reps: "4-8", rir: "0-1" },
      { code: "preacher", section: "main", sets: 2, reps: "4-8", rir: "0-1" },
      { code: "squat", section: "main", sets: 2, reps: "4-8", rir: "1-2" },
      { code: "legCurl", section: "main", sets: 1, reps: "4-8", rir: "0-1" },
      { code: "toePress", section: "main", sets: 1, reps: "4-8", rir: "0-1" },
      { code: "latRaise", section: "main", sets: 1, reps: "4-8", rir: "0-1" },
      { code: "cableCrunch", section: "main", sets: 1, reps: "5-10", rir: "0-1", optional: true },
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
      { code: "pulldown", section: "main", sets: 2, reps: "3-8", rir: "0-1" },
      { code: "row", section: "main", sets: 1, reps: "4-8", rir: "0-1" },
      { code: "press", section: "main", sets: 2, reps: "4-8", rir: "0-1" },
      { code: "preacher", section: "main", sets: 2, reps: "4-8", rir: "0-1" },
      { code: "legExt", section: "main", sets: 2, reps: "4-8", rir: "0-1" },
      { code: "legCurl", section: "main", sets: 1, reps: "4-8", rir: "0-1" },
      { code: "toePress", section: "main", sets: 1, reps: "4-8", rir: "0-1" },
      { code: "latRaise", section: "main", sets: 2, reps: "4-8", rir: "0-1" },
      { code: "cableCrunch", section: "main", sets: 1, reps: "5-10", rir: "0-1", optional: true },
    ],
  },
  {
    id: "wo-fb3",
    name: "Full Body 3",
    subtitle: "Saturday / Sunday",
    items: [
      { code: "cars", section: "warmup", sets: 1, reps: "4-8" },
      { code: "antTilt", section: "warmup", sets: 1, reps: "—" },
      { code: "pulldown", section: "main", sets: 2, reps: "3-8", rir: "0-1" },
      { code: "row", section: "main", sets: 1, reps: "4-8", rir: "0-1" },
      { code: "press", section: "main", sets: 2, reps: "4-8", rir: "0-1" },
      { code: "preacher", section: "main", sets: 2, reps: "4-8", rir: "0-1" },
      { code: "legExt", section: "main", sets: 2, reps: "4-8", rir: "0-1", notes: "OR Isometric — see form video" },
      { code: "legCurl", section: "main", sets: 1, reps: "4-8", rir: "0-1", notes: "OR Isometric — see form video" },
      { code: "calfRaise", section: "main", sets: 1, reps: "4-8", rir: "0-1" },
      { code: "cableTri", section: "main", sets: 2, reps: "4-8", rir: "0-1" },
      { code: "adductor", section: "main", sets: 1, reps: "4x4 bursts", rir: "0-1" },
      { code: "cableCrunch", section: "main", sets: 1, reps: "5-10", rir: "0-1" },
      { code: "saLatRaise", section: "main", sets: 1, reps: "4-8", rir: "0-1" },
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
    notes: a.notes,
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
    // setNumber breaks timestamp ties so "most recent set" is well-defined
    timestamp: threeDaysAgo + weIdx * 3 * 60 * 1000 + setNumber * 30 * 1000,
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
