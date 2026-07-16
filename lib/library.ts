import type { Exercise } from "./data/types";

/** Curated exercise library — movements NOT in the coach's live catalog
 *  (lib/data/seed.ts) but useful to have on hand for freestyle days. Shown
 *  as an opt-in "add from library" row per muscle group; adding one copies
 *  it into the real exercise table (id `ex-lib-<slug>`) so it then behaves
 *  identically to a catalog exercise. Media (line-art) is best-effort,
 *  wired up by scripts/fetch-wger-images.mjs from the wger.de open database. */
export interface LibraryEntry {
  slug: string;
  name: string;
  aliasZh: string;
  targetMuscle: string;
  pattern: string;
  isWeighted: boolean;
  media?: Exercise["media"];
}

const WGER_ATTRIBUTION = "wger.de contributors · CC-BY-SA";
/** Shorthand: image entry for a matched wger download. */
const img = (slug: string): Exercise["media"] => ({
  kind: "image",
  src: `/exercises/${slug}.png`,
  attribution: WGER_ATTRIBUTION,
});

export const LIBRARY: LibraryEntry[] = [
  // --- Chest ---
  { slug: "incline-db-press", name: "Incline DB Press", aliasZh: "上斜哑铃卧推", targetMuscle: "Chest", pattern: "press", isWeighted: true, media: img("incline-db-press") },
  { slug: "cable-fly", name: "Cable Fly", aliasZh: "绳索夹胸", targetMuscle: "Chest", pattern: "press", isWeighted: true, media: img("cable-fly") },
  { slug: "push-up", name: "Push-Up", aliasZh: "俯卧撑", targetMuscle: "Chest", pattern: "press", isWeighted: false, media: img("push-up") },
  { slug: "pec-deck", name: "Pec Deck", aliasZh: "蝴蝶机夹胸", targetMuscle: "Chest", pattern: "press", isWeighted: true },
  { slug: "chest-dips", name: "Chest Dips", aliasZh: "双杠臂屈伸(胸)", targetMuscle: "Chest", pattern: "press", isWeighted: false },

  // --- Back ---
  { slug: "barbell-row", name: "Barbell Row", aliasZh: "杠铃划船", targetMuscle: "Back", pattern: "row", isWeighted: true, media: img("barbell-row") },
  { slug: "t-bar-row", name: "T-Bar Row", aliasZh: "T杠划船", targetMuscle: "Back", pattern: "row", isWeighted: true, media: img("t-bar-row") },
  { slug: "face-pull", name: "Face Pull", aliasZh: "面拉", targetMuscle: "Back", pattern: "row", isWeighted: true, media: img("face-pull") },
  { slug: "straight-arm-pulldown", name: "Straight-Arm Pulldown", aliasZh: "直臂下压", targetMuscle: "Back", pattern: "pulldown", isWeighted: true },
  { slug: "barbell-shrug", name: "Barbell Shrug", aliasZh: "杠铃耸肩", targetMuscle: "Back", pattern: "row", isWeighted: true },
  { slug: "deadlift", name: "Deadlift", aliasZh: "硬拉", targetMuscle: "Back", pattern: "squat", isWeighted: true },
  { slug: "back-extension", name: "Back Extension", aliasZh: "山羊挺身", targetMuscle: "Back", pattern: "crunch", isWeighted: false },

  // --- Shoulders ---
  { slug: "db-shoulder-press", name: "DB Shoulder Press", aliasZh: "哑铃肩推", targetMuscle: "Shoulders", pattern: "press", isWeighted: true, media: img("db-shoulder-press") },
  { slug: "arnold-press", name: "Arnold Press", aliasZh: "阿诺德推举", targetMuscle: "Shoulders", pattern: "press", isWeighted: true, media: img("arnold-press") },
  { slug: "front-raise", name: "Front Raise", aliasZh: "前平举", targetMuscle: "Shoulders", pattern: "lateralraise", isWeighted: true, media: img("front-raise") },
  { slug: "rear-delt-fly", name: "Rear Delt Fly", aliasZh: "反向飞鸟", targetMuscle: "Shoulders", pattern: "lateralraise", isWeighted: true },
  { slug: "machine-shoulder-press", name: "Machine Shoulder Press", aliasZh: "器械推肩", targetMuscle: "Shoulders", pattern: "press", isWeighted: true },

  // --- Biceps ---
  { slug: "hammer-curl", name: "Hammer Curl", aliasZh: "锤式弯举", targetMuscle: "Biceps", pattern: "curl", isWeighted: true, media: img("hammer-curl") },
  { slug: "barbell-curl", name: "Barbell Curl", aliasZh: "杠铃弯举", targetMuscle: "Biceps", pattern: "curl", isWeighted: true, media: img("barbell-curl") },
  { slug: "cable-curl", name: "Cable Curl", aliasZh: "绳索弯举", targetMuscle: "Biceps", pattern: "curl", isWeighted: true, media: img("cable-curl") },
  { slug: "concentration-curl", name: "Concentration Curl", aliasZh: "集中弯举", targetMuscle: "Biceps", pattern: "curl", isWeighted: true },

  // --- Triceps ---
  { slug: "overhead-triceps-extension", name: "Overhead Triceps Extension", aliasZh: "颈后臂屈伸", targetMuscle: "Triceps", pattern: "pushdown", isWeighted: true, media: img("overhead-triceps-extension") },
  { slug: "skull-crusher", name: "Skull Crusher", aliasZh: "仰卧臂屈伸", targetMuscle: "Triceps", pattern: "pushdown", isWeighted: true, media: img("skull-crusher") },
  { slug: "close-grip-bench-press", name: "Close-Grip Bench Press", aliasZh: "窄距卧推", targetMuscle: "Triceps", pattern: "press", isWeighted: true, media: img("close-grip-bench-press") },
  { slug: "triceps-dips", name: "Triceps Dips", aliasZh: "双杠臂屈伸(三头)", targetMuscle: "Triceps", pattern: "pushdown", isWeighted: false },

  // --- Forearms ---
  { slug: "wrist-curl", name: "Wrist Curl", aliasZh: "腕弯举", targetMuscle: "Forearms", pattern: "curl", isWeighted: true, media: img("wrist-curl") },
  { slug: "reverse-curl", name: "Reverse Curl", aliasZh: "反握弯举", targetMuscle: "Forearms", pattern: "curl", isWeighted: true, media: img("reverse-curl") },
  { slug: "farmers-carry", name: "Farmer's Carry", aliasZh: "农夫行走", targetMuscle: "Forearms", pattern: "row", isWeighted: true },

  // --- Core ---
  { slug: "plank", name: "Plank", aliasZh: "平板支撑", targetMuscle: "Core", pattern: "crunch", isWeighted: false, media: img("plank") },
  { slug: "hanging-leg-raise", name: "Hanging Leg Raise", aliasZh: "悬垂举腿", targetMuscle: "Core", pattern: "crunch", isWeighted: false, media: img("hanging-leg-raise") },
  { slug: "russian-twist", name: "Russian Twist", aliasZh: "俄罗斯转体", targetMuscle: "Core", pattern: "crunch", isWeighted: true },
  { slug: "ab-wheel-rollout", name: "Ab Wheel Rollout", aliasZh: "健腹轮", targetMuscle: "Core", pattern: "crunch", isWeighted: false },
  { slug: "sit-up", name: "Sit-Up", aliasZh: "仰卧起坐", targetMuscle: "Core", pattern: "crunch", isWeighted: false },

  // --- Quads ---
  { slug: "front-squat", name: "Front Squat", aliasZh: "前蹲", targetMuscle: "Quads", pattern: "squat", isWeighted: true, media: img("front-squat") },
  { slug: "hack-squat", name: "Hack Squat", aliasZh: "哈克深蹲", targetMuscle: "Quads", pattern: "squat", isWeighted: true, media: img("hack-squat") },
  { slug: "walking-lunge", name: "Walking Lunge", aliasZh: "弓步蹲", targetMuscle: "Quads", pattern: "squat", isWeighted: true },
  { slug: "bulgarian-split-squat", name: "Bulgarian Split Squat", aliasZh: "保加利亚分腿蹲", targetMuscle: "Quads", pattern: "squat", isWeighted: true },
  { slug: "goblet-squat", name: "Goblet Squat", aliasZh: "高脚杯深蹲", targetMuscle: "Quads", pattern: "squat", isWeighted: true },

  // --- Hamstrings ---
  { slug: "romanian-deadlift", name: "Romanian Deadlift", aliasZh: "罗马尼亚硬拉", targetMuscle: "Hamstrings", pattern: "squat", isWeighted: true, media: img("romanian-deadlift") },
  { slug: "good-morning", name: "Good Morning", aliasZh: "早安式", targetMuscle: "Hamstrings", pattern: "squat", isWeighted: true, media: img("good-morning") },
  { slug: "nordic-curl", name: "Nordic Curl", aliasZh: "北欧腿弯举", targetMuscle: "Hamstrings", pattern: "legcurl", isWeighted: false },

  // --- Glutes ---
  { slug: "hip-thrust", name: "Hip Thrust", aliasZh: "臀推", targetMuscle: "Glutes", pattern: "squat", isWeighted: true, media: img("hip-thrust") },
  { slug: "glute-bridge", name: "Glute Bridge", aliasZh: "臀桥", targetMuscle: "Glutes", pattern: "squat", isWeighted: false },
  { slug: "cable-kickback", name: "Cable Kickback", aliasZh: "绳索后踢", targetMuscle: "Glutes", pattern: "legcurl", isWeighted: true, media: img("cable-kickback") },

  // --- Adductors ---
  { slug: "adductor-machine", name: "Adductor Machine", aliasZh: "夹腿机", targetMuscle: "Adductors", pattern: "adductor", isWeighted: true, media: img("adductor-machine") },
  // Copenhagen Plank: no faithful wger match (closest candidate is a generic
  // front-plank photo, which misrepresents this side hip-adduction exercise)
  // — falls back to the "adductor" pictogram instead. See fetch-wger-images.mjs.
  { slug: "copenhagen-plank", name: "Copenhagen Plank", aliasZh: "哥本哈根支撑", targetMuscle: "Adductors", pattern: "adductor", isWeighted: false },

  // --- Calves ---
  { slug: "seated-calf-raise", name: "Seated Calf Raise", aliasZh: "坐姿提踵", targetMuscle: "Calves", pattern: "calf", isWeighted: true, media: img("seated-calf-raise") },
  { slug: "standing-calf-raise", name: "Standing Calf Raise", aliasZh: "站姿提踵", targetMuscle: "Calves", pattern: "calf", isWeighted: true, media: img("standing-calf-raise") },
];
