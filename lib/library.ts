import type { Exercise } from "./data/types";

/** Curated exercise library — the app's standard movement lexicon, organized by
 *  muscle and aligned to wger.de's naming/taxonomy (same open source the icon
 *  line-art comes from, so names ↔ pictures stay consistent). English name +
 *  target muscle + equipment follow wger conventions; the 中文名 is curated
 *  (wger's Chinese coverage is sparse); `aliases` are extra search synonyms
 *  (中/英) so complex names are still findable.
 *
 *  This is an ADD-ON layer over the coach's program catalog (lib/data/seed.ts):
 *  "add from library" copies an entry into the real exercise table as
 *  `ex-lib-<slug>`, after which it behaves like any other exercise. Nothing here
 *  touches logged history. Media is clean line-art wired up by
 *  scripts/fetch-everkinetic-images.mjs (Everkinetic set) + the earlier
 *  scripts/fetch-wger-images.mjs; entries without an image fall back to the
 *  ExerciseIcon pictogram. */
export interface LibraryEntry {
  slug: string;
  name: string;
  aliasZh: string;
  /** targetMuscle key — must match lib/musclePaths.ts / the freestyle picker. */
  targetMuscle: string;
  /** Movement-pattern key → ExerciseIcon pictogram fallback. */
  pattern: string;
  /** wger-style equipment tag (metadata; not filtered on yet). */
  equipment: string;
  isWeighted: boolean;
  /** Extra search terms (中/英 synonyms, abbreviations) beyond name + aliasZh. */
  aliases?: string[];
  media?: Exercise["media"];
}

const IMG_ATTRIBUTION = "Everkinetic / wger.de contributors · CC-BY-SA";
/** Shorthand: image entry for a line-art PNG that exists in public/exercises/. */
const img = (slug: string): Exercise["media"] => ({
  kind: "image",
  src: `/exercises/${slug}.png`,
  attribution: IMG_ATTRIBUTION,
});

export const LIBRARY: LibraryEntry[] = [
  // ---------------------------------------------------------------- Chest ---
  { slug: "bench-press", name: "Barbell Bench Press", aliasZh: "杠铃卧推", targetMuscle: "Chest", pattern: "press", equipment: "barbell", isWeighted: true, aliases: ["卧推", "平板卧推", "bench"], media: img("bench-press") },
  { slug: "incline-bench-press", name: "Incline Barbell Bench Press", aliasZh: "上斜杠铃卧推", targetMuscle: "Chest", pattern: "press", equipment: "barbell", isWeighted: true, aliases: ["上斜卧推", "incline bench"] },
  { slug: "decline-bench-press", name: "Decline Barbell Bench Press", aliasZh: "下斜杠铃卧推", targetMuscle: "Chest", pattern: "press", equipment: "barbell", isWeighted: true, aliases: ["下斜卧推", "decline bench"] },
  { slug: "db-bench-press", name: "Dumbbell Bench Press", aliasZh: "哑铃卧推", targetMuscle: "Chest", pattern: "press", equipment: "dumbbell", isWeighted: true, aliases: ["平板哑铃卧推", "db press"] },
  { slug: "incline-db-press", name: "Incline Dumbbell Press", aliasZh: "上斜哑铃卧推", targetMuscle: "Chest", pattern: "press", equipment: "dumbbell", isWeighted: true, aliases: ["上斜哑铃", "incline dumbbell"], media: img("incline-db-press") },
  { slug: "machine-chest-press", name: "Machine Chest Press", aliasZh: "坐姿推胸", targetMuscle: "Chest", pattern: "press", equipment: "machine", isWeighted: true, aliases: ["推胸机", "坐姿卧推", "chest press"], media: img("press") },
  { slug: "cable-fly", name: "Cable Fly", aliasZh: "绳索夹胸", targetMuscle: "Chest", pattern: "press", equipment: "cable", isWeighted: true, aliases: ["夹胸", "飞鸟", "crossover", "绳索飞鸟"], media: img("cable-fly") },
  { slug: "pec-deck", name: "Pec Deck", aliasZh: "蝴蝶机夹胸", targetMuscle: "Chest", pattern: "press", equipment: "machine", isWeighted: true, aliases: ["蝴蝶机", "夹胸机", "machine fly"] },
  { slug: "db-fly", name: "Dumbbell Fly", aliasZh: "哑铃飞鸟", targetMuscle: "Chest", pattern: "press", equipment: "dumbbell", isWeighted: true, aliases: ["飞鸟", "哑铃夹胸"], media: img("db-fly") },
  { slug: "push-up", name: "Push-Up", aliasZh: "俯卧撑", targetMuscle: "Chest", pattern: "press", equipment: "bodyweight", isWeighted: false, aliases: ["俯卧撑", "pushup"], media: img("push-up") },
  { slug: "chest-dip", name: "Chest Dip", aliasZh: "双杠臂屈伸(胸)", targetMuscle: "Chest", pattern: "press", equipment: "bodyweight", isWeighted: false, aliases: ["双杠", "臂屈伸", "dips"] },

  // ----------------------------------------------------------------- Back ---
  { slug: "lat-pulldown", name: "Lat Pulldown", aliasZh: "高位下拉", targetMuscle: "Back", pattern: "pulldown", equipment: "machine", isWeighted: true, aliases: ["下拉", "背", "pulldown", "lat"] },
  { slug: "close-grip-pulldown", name: "Close-Grip Pulldown", aliasZh: "窄握下拉", targetMuscle: "Back", pattern: "pulldown", equipment: "machine", isWeighted: true, aliases: ["窄距下拉", "对握下拉"] },
  { slug: "pull-up", name: "Pull-Up", aliasZh: "引体向上", targetMuscle: "Back", pattern: "pulldown", equipment: "bodyweight", isWeighted: false, aliases: ["引体", "正握引体", "pullup"] },
  { slug: "chin-up", name: "Chin-Up", aliasZh: "反握引体向上", targetMuscle: "Back", pattern: "pulldown", equipment: "bodyweight", isWeighted: false, aliases: ["反握引体", "chinup"] },
  { slug: "seated-cable-row", name: "Seated Cable Row", aliasZh: "坐姿绳索划船", targetMuscle: "Back", pattern: "row", equipment: "cable", isWeighted: true, aliases: ["坐姿划船", "划船", "cable row"], media: img("seated-row") },
  { slug: "barbell-row", name: "Barbell Row", aliasZh: "杠铃划船", targetMuscle: "Back", pattern: "row", equipment: "barbell", isWeighted: true, aliases: ["俯身划船", "杠铃划船", "bent over row"] },
  { slug: "t-bar-row", name: "T-Bar Row", aliasZh: "T杠划船", targetMuscle: "Back", pattern: "row", equipment: "barbell", isWeighted: true, aliases: ["t杠", "tbar"], media: img("t-bar-row") },
  { slug: "db-row", name: "One-Arm Dumbbell Row", aliasZh: "单臂哑铃划船", targetMuscle: "Back", pattern: "row", equipment: "dumbbell", isWeighted: true, aliases: ["哑铃划船", "单臂划船"] },
  { slug: "chest-supported-row", name: "Chest-Supported Row", aliasZh: "胸支撑划船", targetMuscle: "Back", pattern: "row", equipment: "machine", isWeighted: true, aliases: ["俯卧划船", "支撑划船"] },
  { slug: "machine-row", name: "Machine Row", aliasZh: "器械划船", targetMuscle: "Back", pattern: "row", equipment: "machine", isWeighted: true, aliases: ["坐姿器械划船", "hammer row"] },
  { slug: "straight-arm-pulldown", name: "Straight-Arm Pulldown", aliasZh: "直臂下压", targetMuscle: "Back", pattern: "pulldown", equipment: "cable", isWeighted: true, aliases: ["直臂下拉", "直臂"] },
  { slug: "face-pull", name: "Face Pull", aliasZh: "面拉", targetMuscle: "Back", pattern: "row", equipment: "cable", isWeighted: true, aliases: ["面拉", "后束"] },
  { slug: "deadlift", name: "Deadlift", aliasZh: "硬拉", targetMuscle: "Back", pattern: "squat", equipment: "barbell", isWeighted: true, aliases: ["传统硬拉", "常规硬拉", "conventional deadlift"] },
  { slug: "rack-pull", name: "Rack Pull", aliasZh: "架上拉", targetMuscle: "Back", pattern: "squat", equipment: "barbell", isWeighted: true, aliases: ["架上硬拉", "半程硬拉"] },
  { slug: "barbell-shrug", name: "Barbell Shrug", aliasZh: "杠铃耸肩", targetMuscle: "Back", pattern: "row", equipment: "barbell", isWeighted: true, aliases: ["耸肩", "斜方肌", "traps"], media: img("barbell-shrug") },
  { slug: "db-shrug", name: "Dumbbell Shrug", aliasZh: "哑铃耸肩", targetMuscle: "Back", pattern: "row", equipment: "dumbbell", isWeighted: true, aliases: ["耸肩"] },

  // -------------------------------------------------------------- Shoulders ---
  { slug: "overhead-press", name: "Overhead Press", aliasZh: "站姿杠铃推举", targetMuscle: "Shoulders", pattern: "press", equipment: "barbell", isWeighted: true, aliases: ["推举", "肩推", "OHP", "过头推"] },
  { slug: "seated-db-press", name: "Seated Dumbbell Shoulder Press", aliasZh: "坐姿哑铃推举", targetMuscle: "Shoulders", pattern: "press", equipment: "dumbbell", isWeighted: true, aliases: ["哑铃肩推", "坐姿推举"], media: img("db-shoulder-press") },
  { slug: "arnold-press", name: "Arnold Press", aliasZh: "阿诺德推举", targetMuscle: "Shoulders", pattern: "press", equipment: "dumbbell", isWeighted: true, aliases: ["阿诺", "arnold"], media: img("arnold-press") },
  { slug: "machine-shoulder-press", name: "Machine Shoulder Press", aliasZh: "器械推肩", targetMuscle: "Shoulders", pattern: "press", equipment: "machine", isWeighted: true, aliases: ["推肩机", "坐姿推肩"] },
  { slug: "lateral-raise", name: "Dumbbell Lateral Raise", aliasZh: "哑铃侧平举", targetMuscle: "Shoulders", pattern: "lateralraise", equipment: "dumbbell", isWeighted: true, aliases: ["侧平举", "中束", "lateral"], media: img("lateral-raise") },
  { slug: "cable-lateral-raise", name: "Cable Lateral Raise", aliasZh: "绳索侧平举", targetMuscle: "Shoulders", pattern: "lateralraise", equipment: "cable", isWeighted: true, aliases: ["绳索侧平", "侧平举"] },
  { slug: "front-raise", name: "Front Raise", aliasZh: "前平举", targetMuscle: "Shoulders", pattern: "lateralraise", equipment: "dumbbell", isWeighted: true, aliases: ["前束", "前平举"], media: img("front-raise") },
  { slug: "rear-delt-fly", name: "Rear Delt Fly", aliasZh: "反向飞鸟", targetMuscle: "Shoulders", pattern: "lateralraise", equipment: "dumbbell", isWeighted: true, aliases: ["后束", "俯身飞鸟", "reverse fly"], media: img("rear-delt-fly") },
  { slug: "reverse-pec-deck", name: "Reverse Pec Deck", aliasZh: "反向蝴蝶机", targetMuscle: "Shoulders", pattern: "lateralraise", equipment: "machine", isWeighted: true, aliases: ["后束机", "反向夹胸"] },
  { slug: "upright-row", name: "Upright Row", aliasZh: "直立划船", targetMuscle: "Shoulders", pattern: "row", equipment: "barbell", isWeighted: true, aliases: ["直立划船"], media: img("upright-row") },

  // ---------------------------------------------------------------- Biceps ---
  { slug: "barbell-curl", name: "Barbell Curl", aliasZh: "杠铃弯举", targetMuscle: "Biceps", pattern: "curl", equipment: "barbell", isWeighted: true, aliases: ["弯举", "二头", "curl"], media: img("barbell-curl") },
  { slug: "db-curl", name: "Dumbbell Curl", aliasZh: "哑铃弯举", targetMuscle: "Biceps", pattern: "curl", equipment: "dumbbell", isWeighted: true, aliases: ["交替弯举", "哑铃二头"], media: img("db-curl") },
  { slug: "hammer-curl", name: "Hammer Curl", aliasZh: "锤式弯举", targetMuscle: "Biceps", pattern: "curl", equipment: "dumbbell", isWeighted: true, aliases: ["锤式", "hammer"], media: img("hammer-curl") },
  { slug: "preacher-curl", name: "Preacher Curl", aliasZh: "牧师凳弯举", targetMuscle: "Biceps", pattern: "curl", equipment: "machine", isWeighted: true, aliases: ["牧师凳", "斜托弯举", "preacher"], media: img("preacher") },
  { slug: "cable-curl", name: "Cable Curl", aliasZh: "绳索弯举", targetMuscle: "Biceps", pattern: "curl", equipment: "cable", isWeighted: true, aliases: ["绳索二头", "cable curl"], media: img("cable-curl") },
  { slug: "concentration-curl", name: "Concentration Curl", aliasZh: "集中弯举", targetMuscle: "Biceps", pattern: "curl", equipment: "dumbbell", isWeighted: true, aliases: ["集中弯举"], media: img("concentration-curl") },
  { slug: "incline-db-curl", name: "Incline Dumbbell Curl", aliasZh: "上斜哑铃弯举", targetMuscle: "Biceps", pattern: "curl", equipment: "dumbbell", isWeighted: true, aliases: ["上斜弯举"] },
  { slug: "ez-bar-curl", name: "EZ-Bar Curl", aliasZh: "EZ杠弯举", targetMuscle: "Biceps", pattern: "curl", equipment: "ez-bar", isWeighted: true, aliases: ["曲杠弯举", "ez"] },

  // --------------------------------------------------------------- Triceps ---
  { slug: "triceps-pushdown", name: "Triceps Pushdown", aliasZh: "三头下压", targetMuscle: "Triceps", pattern: "pushdown", equipment: "cable", isWeighted: true, aliases: ["下压", "三头", "pushdown", "直杆下压"] },
  { slug: "rope-pushdown", name: "Rope Pushdown", aliasZh: "绳索下压", targetMuscle: "Triceps", pattern: "pushdown", equipment: "cable", isWeighted: true, aliases: ["绳子下压", "辫子下压", "rope"] },
  { slug: "overhead-triceps-extension", name: "Overhead Triceps Extension", aliasZh: "颈后臂屈伸", targetMuscle: "Triceps", pattern: "pushdown", equipment: "dumbbell", isWeighted: true, aliases: ["过头臂屈伸", "颈后"], media: img("overhead-triceps-extension") },
  { slug: "skull-crusher", name: "Skull Crusher", aliasZh: "仰卧臂屈伸", targetMuscle: "Triceps", pattern: "pushdown", equipment: "ez-bar", isWeighted: true, aliases: ["碎颅者", "仰卧屈伸", "skullcrusher"], media: img("skull-crusher") },
  { slug: "close-grip-bench-press", name: "Close-Grip Bench Press", aliasZh: "窄距卧推", targetMuscle: "Triceps", pattern: "press", equipment: "barbell", isWeighted: true, aliases: ["窄握卧推", "窄距"], media: img("close-grip-bench-press") },
  { slug: "triceps-dip", name: "Triceps Dip", aliasZh: "双杠臂屈伸(三头)", targetMuscle: "Triceps", pattern: "pushdown", equipment: "bodyweight", isWeighted: false, aliases: ["双杠", "臂屈伸", "dips"], media: img("triceps-dip") },
  { slug: "bench-dip", name: "Bench Dip", aliasZh: "凳上臂屈伸", targetMuscle: "Triceps", pattern: "pushdown", equipment: "bodyweight", isWeighted: false, aliases: ["凳上屈伸"], media: img("bench-dip") },
  { slug: "db-kickback", name: "Dumbbell Kickback", aliasZh: "哑铃臂屈伸(后踢)", targetMuscle: "Triceps", pattern: "pushdown", equipment: "dumbbell", isWeighted: true, aliases: ["后踢", "kickback"], media: img("db-kickback") },

  // -------------------------------------------------------------- Forearms ---
  { slug: "wrist-curl", name: "Wrist Curl", aliasZh: "腕弯举", targetMuscle: "Forearms", pattern: "curl", equipment: "barbell", isWeighted: true, aliases: ["腕屈", "前臂"], media: img("wrist-curl") },
  { slug: "reverse-wrist-curl", name: "Reverse Wrist Curl", aliasZh: "反向腕弯举", targetMuscle: "Forearms", pattern: "curl", equipment: "barbell", isWeighted: true, aliases: ["反向腕屈"] },
  { slug: "reverse-curl", name: "Reverse Curl", aliasZh: "反握弯举", targetMuscle: "Forearms", pattern: "curl", equipment: "barbell", isWeighted: true, aliases: ["正握弯举", "反握"], media: img("reverse-curl") },
  { slug: "farmers-carry", name: "Farmer's Carry", aliasZh: "农夫行走", targetMuscle: "Forearms", pattern: "row", equipment: "dumbbell", isWeighted: true, aliases: ["农夫", "负重行走", "carry"] },

  // ------------------------------------------------------------------ Core ---
  { slug: "plank", name: "Plank", aliasZh: "平板支撑", targetMuscle: "Core", pattern: "crunch", equipment: "bodyweight", isWeighted: false, aliases: ["平板", "核心", "plank"], media: img("plank") },
  { slug: "side-plank", name: "Side Plank", aliasZh: "侧平板支撑", targetMuscle: "Core", pattern: "crunch", equipment: "bodyweight", isWeighted: false, aliases: ["侧平板"], media: img("side-plank") },
  { slug: "cable-crunch", name: "Cable Crunch", aliasZh: "绳索卷腹", targetMuscle: "Core", pattern: "crunch", equipment: "cable", isWeighted: true, aliases: ["跪姿卷腹", "卷腹"], media: img("cable-crunch") },
  { slug: "crunch", name: "Crunch", aliasZh: "卷腹", targetMuscle: "Core", pattern: "crunch", equipment: "bodyweight", isWeighted: false, aliases: ["仰卧卷腹"], media: img("crunch") },
  { slug: "hanging-leg-raise", name: "Hanging Leg Raise", aliasZh: "悬垂举腿", targetMuscle: "Core", pattern: "crunch", equipment: "bodyweight", isWeighted: false, aliases: ["举腿", "悬垂"] },
  { slug: "lying-leg-raise", name: "Lying Leg Raise", aliasZh: "仰卧举腿", targetMuscle: "Core", pattern: "crunch", equipment: "bodyweight", isWeighted: false, aliases: ["仰卧举腿"], media: img("lying-leg-raise") },
  { slug: "russian-twist", name: "Russian Twist", aliasZh: "俄罗斯转体", targetMuscle: "Core", pattern: "crunch", equipment: "bodyweight", isWeighted: true, aliases: ["转体", "俄转"] },
  { slug: "ab-wheel", name: "Ab Wheel Rollout", aliasZh: "健腹轮", targetMuscle: "Core", pattern: "crunch", equipment: "bodyweight", isWeighted: false, aliases: ["腹肌轮", "滚轮"] },
  { slug: "sit-up", name: "Sit-Up", aliasZh: "仰卧起坐", targetMuscle: "Core", pattern: "crunch", equipment: "bodyweight", isWeighted: false, aliases: ["起坐"] },
  { slug: "bicycle-crunch", name: "Bicycle Crunch", aliasZh: "单车卷腹", targetMuscle: "Core", pattern: "crunch", equipment: "bodyweight", isWeighted: false, aliases: ["单车", "空中蹬车"], media: img("bicycle-crunch") },

  // ------------------------------------------------------------ Lower back ---
  { slug: "back-extension", name: "Back Extension", aliasZh: "山羊挺身", targetMuscle: "Lower back", pattern: "crunch", equipment: "bodyweight", isWeighted: false, aliases: ["背伸展", "罗马椅", "hyperextension"], media: img("back-extension") },
  { slug: "good-morning", name: "Good Morning", aliasZh: "早安式", targetMuscle: "Lower back", pattern: "squat", equipment: "barbell", isWeighted: true, aliases: ["早安", "屈体"], media: img("good-morning") },
  { slug: "superman", name: "Superman", aliasZh: "超人式", targetMuscle: "Lower back", pattern: "crunch", equipment: "bodyweight", isWeighted: false, aliases: ["飞燕", "超人"], media: img("superman") },

  // ----------------------------------------------------------------- Quads ---
  { slug: "barbell-squat", name: "Barbell Back Squat", aliasZh: "杠铃深蹲", targetMuscle: "Quads", pattern: "squat", equipment: "barbell", isWeighted: true, aliases: ["深蹲", "后蹲", "squat"], media: img("barbell-squat") },
  { slug: "front-squat", name: "Front Squat", aliasZh: "前蹲", targetMuscle: "Quads", pattern: "squat", equipment: "barbell", isWeighted: true, aliases: ["颈前深蹲", "front squat"], media: img("front-squat") },
  { slug: "leg-press", name: "Leg Press", aliasZh: "倒蹬(腿举)", targetMuscle: "Quads", pattern: "squat", equipment: "machine", isWeighted: true, aliases: ["倒蹬", "腿举", "leg press"] },
  { slug: "hack-squat", name: "Hack Squat", aliasZh: "哈克深蹲", targetMuscle: "Quads", pattern: "squat", equipment: "machine", isWeighted: true, aliases: ["哈克", "hack"] },
  { slug: "leg-extension", name: "Leg Extension", aliasZh: "腿屈伸", targetMuscle: "Quads", pattern: "legext", equipment: "machine", isWeighted: true, aliases: ["腿屈伸", "股四头", "leg ext"], media: img("leg-ext") },
  { slug: "goblet-squat", name: "Goblet Squat", aliasZh: "高脚杯深蹲", targetMuscle: "Quads", pattern: "squat", equipment: "dumbbell", isWeighted: true, aliases: ["高脚杯"] },
  { slug: "bulgarian-split-squat", name: "Bulgarian Split Squat", aliasZh: "保加利亚分腿蹲", targetMuscle: "Quads", pattern: "squat", equipment: "dumbbell", isWeighted: true, aliases: ["保加利亚", "分腿蹲", "后脚抬高蹲"] },
  { slug: "walking-lunge", name: "Walking Lunge", aliasZh: "行走弓步", targetMuscle: "Quads", pattern: "squat", equipment: "dumbbell", isWeighted: true, aliases: ["弓步", "箭步蹲", "lunge"], media: img("walking-lunge") },
  { slug: "step-up", name: "Step-Up", aliasZh: "箱式登阶", targetMuscle: "Quads", pattern: "squat", equipment: "dumbbell", isWeighted: true, aliases: ["登阶", "上台阶"] },
  { slug: "smith-squat", name: "Smith Machine Squat", aliasZh: "史密斯深蹲", targetMuscle: "Quads", pattern: "squat", equipment: "machine", isWeighted: true, aliases: ["史密斯", "smith"] },

  // ------------------------------------------------------------ Hamstrings ---
  { slug: "romanian-deadlift", name: "Romanian Deadlift", aliasZh: "罗马尼亚硬拉", targetMuscle: "Hamstrings", pattern: "squat", equipment: "barbell", isWeighted: true, aliases: ["罗马尼亚", "RDL", "直腿硬拉"], media: img("romanian-deadlift") },
  { slug: "lying-leg-curl", name: "Lying Leg Curl", aliasZh: "俯卧腿弯举", targetMuscle: "Hamstrings", pattern: "legcurl", equipment: "machine", isWeighted: true, aliases: ["腿弯举", "俯卧腿弯", "leg curl"], media: img("leg-curl") },
  { slug: "seated-leg-curl", name: "Seated Leg Curl", aliasZh: "坐姿腿弯举", targetMuscle: "Hamstrings", pattern: "legcurl", equipment: "machine", isWeighted: true, aliases: ["坐姿腿弯", "腿弯举"] },
  { slug: "stiff-leg-deadlift", name: "Stiff-Leg Deadlift", aliasZh: "直腿硬拉", targetMuscle: "Hamstrings", pattern: "squat", equipment: "barbell", isWeighted: true, aliases: ["直腿", "SLDL"] },
  { slug: "nordic-curl", name: "Nordic Hamstring Curl", aliasZh: "北欧腿弯举", targetMuscle: "Hamstrings", pattern: "legcurl", equipment: "bodyweight", isWeighted: false, aliases: ["北欧", "nordic"] },

  // ---------------------------------------------------------------- Glutes ---
  { slug: "hip-thrust", name: "Hip Thrust", aliasZh: "臀推", targetMuscle: "Glutes", pattern: "squat", equipment: "barbell", isWeighted: true, aliases: ["臀冲", "臀推", "hip thrust"], media: img("hip-thrust") },
  { slug: "glute-bridge", name: "Glute Bridge", aliasZh: "臀桥", targetMuscle: "Glutes", pattern: "squat", equipment: "bodyweight", isWeighted: false, aliases: ["臀桥", "bridge"], media: img("glute-bridge") },
  { slug: "cable-kickback", name: "Cable Glute Kickback", aliasZh: "绳索后踢腿", targetMuscle: "Glutes", pattern: "legcurl", equipment: "cable", isWeighted: true, aliases: ["后踢腿", "臀部后踢"] },
  { slug: "hip-abduction", name: "Hip Abduction Machine", aliasZh: "髋外展机(坐姿外展)", targetMuscle: "Glutes", pattern: "adductor", equipment: "machine", isWeighted: true, aliases: ["外展", "臀中肌", "abduction"] },
  { slug: "sumo-deadlift", name: "Sumo Deadlift", aliasZh: "相扑硬拉", targetMuscle: "Glutes", pattern: "squat", equipment: "barbell", isWeighted: true, aliases: ["相扑", "sumo"] },
  { slug: "cable-pull-through", name: "Cable Pull-Through", aliasZh: "绳索前拉(髋铰链)", targetMuscle: "Glutes", pattern: "squat", equipment: "cable", isWeighted: true, aliases: ["前拉", "pull through"] },

  // ------------------------------------------------------------- Adductors ---
  { slug: "adductor-machine", name: "Hip Adduction Machine", aliasZh: "夹腿机(大腿内收)", targetMuscle: "Adductors", pattern: "adductor", equipment: "machine", isWeighted: true, aliases: ["夹腿", "内收", "adduction"], media: img("adductor-machine") },
  { slug: "copenhagen-plank", name: "Copenhagen Plank", aliasZh: "哥本哈根平板", targetMuscle: "Adductors", pattern: "adductor", equipment: "bodyweight", isWeighted: false, aliases: ["哥本哈根", "copenhagen"] },
  { slug: "sumo-squat", name: "Sumo Squat", aliasZh: "相扑深蹲(宽距)", targetMuscle: "Adductors", pattern: "squat", equipment: "dumbbell", isWeighted: true, aliases: ["宽距深蹲", "相扑蹲"] },

  // ---------------------------------------------------------------- Calves ---
  { slug: "standing-calf-raise", name: "Standing Calf Raise", aliasZh: "站姿提踵", targetMuscle: "Calves", pattern: "calf", equipment: "machine", isWeighted: true, aliases: ["提踵", "站姿", "calf raise"], media: img("standing-calf-raise") },
  { slug: "seated-calf-raise", name: "Seated Calf Raise", aliasZh: "坐姿提踵", targetMuscle: "Calves", pattern: "calf", equipment: "machine", isWeighted: true, aliases: ["坐姿提踵", "比目鱼肌"], media: img("seated-calf-raise") },
  { slug: "leg-press-calf-raise", name: "Leg Press Calf Raise", aliasZh: "倒蹬机提踵", targetMuscle: "Calves", pattern: "calf", equipment: "machine", isWeighted: true, aliases: ["倒蹬提踵", "脚尖推", "toe press"], media: img("toe-press") },
  { slug: "donkey-calf-raise", name: "Donkey Calf Raise", aliasZh: "驴式提踵", targetMuscle: "Calves", pattern: "calf", equipment: "machine", isWeighted: true, aliases: ["驴式", "donkey"] },

  // ----------------------------------------------------------------- Shins ---
  { slug: "tibialis-raise", name: "Tibialis Raise", aliasZh: "胫骨前肌训练(勾脚)", targetMuscle: "Shins", pattern: "calf", equipment: "bodyweight", isWeighted: false, aliases: ["胫骨前肌", "勾脚尖", "tibialis"] },
];
