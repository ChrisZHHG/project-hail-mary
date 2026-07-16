"use client";

import { useNameLang } from "./prefs";

/** App-chrome dictionary. The 中/EN toggle switches the WHOLE interface —
 *  no mixed-language lines. Coach-authored content (theory bodies, cues,
 *  official exercise names as secondary text) stays English by design:
 *  it's Austin's source material.
 *
 *  Usage: const t = useT(); t("logSet") */

const DICT = {
  // nav
  navToday: ["今天", "Today"],
  navTrain: ["训练", "Train"],
  navLookup: ["查询", "Lookup"],
  navProgress: ["进度", "Progress"],

  // shared
  loading: ["载入中…", "Loading…"],
  calibrating: ["准备中…", "Calibrating…"],
  finishSession: ["结束训练 →", "Finish session →"],
  logSet: ["记录", "Log set"],
  markDone: ["完成", "Mark done"],
  addSet: ["+ 加一组", "+ add set"],
  set: ["第", "Set"],
  setUnit: ["组", ""],
  remove: ["删除", "remove"],
  optional: ["可选", "optional"],
  doneShort: ["完成", "done"],
  weight: ["重量", "Weight"],
  reps: ["次数", "Reps"],
  last: ["上次", "Last"],
  sets: ["组", "sets"],
  setsLogged: ["组已记录", "sets logged"],
  inProgress: ["进行中", "in progress"],

  // today
  weeklyCheckin: ["每周打卡", "Weekly check-in"],
  weekendCheckin: ["周末打卡", "Weekend check-in"],
  thisWeek: ["本周", "This week"],
  howWasWeek: ["这周感觉怎么样？", "How was your week?"],
  dueWeekend: ["周末填写，决定下周计划。", "Due on the weekend. Sets next week's plan."],
  tunesNext: ["教练根据这个调整下周训练量。", "Tunes next week's volume — your coach adjusts from this."],
  tapToUpdate: ["点击更新 →", "Tap to update →"],
  upNext: ["下一练", "Up next"],
  startTraining: ["开始训练 →", "Start training →"],
  remindMe: ["提醒我", "Remind me"],
  addCalendar: ["+ 日历", "+ Calendar"],
  chooseAnother: ["选其他训练日", "Choose another day"],
  freestyleShort: ["自主练", "Freestyle"],
  methodTitle: ["训练方法", "The Method"],
  methodDesc: ["每一组背后的道理。", "Why every set is built the way it is."],
  lastSession: ["上次训练", "Last session"],
  viewProgress: ["看进度 →", "View progress →"],
  coachView: ["教练视图 →", "Coach view →"],
  backupTitle: ["备份你的数据", "Back up your data"],
  backupNever: ["从未导出过。只要 5 秒。", "— no export yet. Takes 5 seconds."],
  backupDays: ["天没备份了。只要 5 秒。", "days since last export. Takes 5 seconds."],
  neckFlagged: ["本周颈部标记", "Neck flagged"],
  neckRun: ["跑一遍肩颈矫正协议 — 5 个动作，练前做。", "Run the Shoulder Story protocol — 5 drills, before training."],

  // train
  pickDay: ["选一天", "Pick a day"],
  trainTitle: ["训练", "Train"],
  freestyleCardSub: ["点部位选机器 · 比上次多一点", "Pick machines by muscle · beat last time"],
  noWorkouts: ["还没有训练计划。", "No workouts seeded."],

  // session
  warmup: ["热身 / 灵活性", "Warm-up / Mobility"],
  work: ["正式组", "Work"],
  cardio: ["有氧", "Cardio"],
  shoulderProtocol: ["肩颈矫正协议", "Shoulder protocol"],
  doBefore: ["练前做", "do before training"],
  drills: ["个动作", "drills"],

  // freestyle
  freestyleTitle: ["自主训练", "Freestyle"],
  freestyleHint: ["点部位 → 选机器 → 比上次多一点", "tap a muscle → pick the machine → beat last time"],
  whichMuscle: ["哪个部位？", "Which muscle?"],
  tapBody: ["点身体图，或下面的标签。", "Tap the body — or a chip below."],
  firstTime: ["首练", "first time"],
  beatIt: ["今天目标：比它多一点", "target today: beat it"],
  firstRecord: ["首次记录 — 打好基准。", "First record — set the baseline."],
  same: ["▬ 持平", "▬ same"],
  bw: ["自重", "BW"],
  save: ["保存", "Save"],
  variantLabel: ["变体(握距等)", "variant (grip…)"],
  editedNote: ["点行内 ✎ 可修改历史记录", "tap ✎ on a row to edit history"],
  bwChip: ["自重", "BW"],
  bwHint: ["按体重计容量", "counts bodyweight"],
  noExercisesYet: ["这个部位还没有动作 — 动作库功能马上来。", "No exercises here yet — the exercise library is coming."],
  fromLibrary: ["从动作库添加", "Add from library"],
  illustrationCredit: [
    "动作插画来自 wger.de 社区 (CC-BY-SA)",
    "Exercise illustrations by wger.de contributors (CC-BY-SA)",
  ],
  weeklyVolume: ["每周容量", "Weekly volume"],
  thisWeekBar: ["本周", "this week"],
  trendLabel: ["最重一组走势", "Top-set trend"],
  profileTitle: ["个人档案", "Profile"],
  bodyweightLabel: ["体重", "Bodyweight"],
  bodyweightHint: ["用于自重动作(引体等)的容量计算。", "Used to count volume for bodyweight movements (pull-ups etc.)."],
  repsShort: ["次", "reps"],

  // gear (per-exercise machine-setup memory)
  gearTitle: ["器械刻度", "Machine setup"],
  gearHint: ["记一次座位/绳位/握距，永远记得", "save seat / pulley / grip once — remembered forever"],
  gearCustomKey: ["自定义", "custom"],

  // lookup
  memory: ["记忆", "Memory"],
  lastTimeOn: ["上次这台机器…", "Last time on…"],
  searchPlaceholder: ["搜索机器或动作…", "Search a machine or movement…"],
  noMatches: ["没有匹配。", "No matches."],
  noHistory: ["无记录", "no history"],
  recentSessions: ["最近几次（最重一组）", "Recent sessions (top set)"],
  setsAllTime: ["组累计", "sets all-time"],
  reconstructedNote: ["~ = 按你描述的例行重建", "~ = reconstructed from your described routine"],

  // progress
  telemetry: ["遥测", "Telemetry"],
  progressTitle: ["进度", "Progress"],
  sessionsStat: ["训练次数", "Sessions"],
  strengthCount: ["次力量", "strength"],
  trackedVol: ["累计容量", "Tracked vol."],
  bestSession: ["单次最佳", "Best session"],
  volumePerSession: ["每次训练容量", "Volume per session"],
  historyTitle: ["历史记录", "History"],
  strengthLabel: ["力量", "Strength"],
  cardioLabel: ["有氧", "Cardio"],
  imported: ["导入", "imported"],
  peak: ["峰值", "peak"],
  watchBadge: ["手表", "watch"],
  muscleLoadAllTime: ["肌肉负荷 — 累计", "Muscle load — all time"],
  logToStart: ["记一次训练，曲线就开始了。", "Log a session to start the trend."],
  noCompleted: ["还没有完成的训练。", "No completed sessions yet."],
  startTrainingCta: ["去训练", "Start training"],

  // load gauge
  loadTitle: ["训练负荷 — 7天 vs 28天", "Training load — 7d vs 28d"],
  estimate: ["估算", "estimate"],
  load7d: ["7 天负荷", "7-day load"],
  weeklyBaseline: ["周基线", "weekly baseline"],
  zoneFresh: ["恢复", "fresh"],
  zoneOptimal: ["最佳", "optimal"],
  zoneHigh: ["偏高", "high"],
  zoneSpike: ["飙升", "spike"],
  buildingBaseline: [
    "正在建立基线 — 最近 28 天完成 {n}/4 次训练。累积足够历史后，急性:慢性负荷比才会解锁。",
    "Building your baseline — {n}/4 sessions in the last 28 days. The acute:chronic ratio unlocks once there's enough history to compare against.",
  ],
  loadFootnote: [
    "负荷 ≈ 时长 × 心率强度（假定静息 60 / 最大 190；无心率的力量训练按 110 bpm 计）。仅供参考，非医疗指标。",
    "Load ≈ minutes × HR intensity (rest 60 / max 190 assumed; strength sessions without HR counted at 110 bpm). Directional, not medical.",
  ],

  // readiness
  weeklySystems: ["每周 · 系统检查", "Weekly · systems check"],
  readinessDone: [
    "周末填写。决定下周训练量 — 教练根据这个调整计划。",
    "Done on the weekend. Sets next week's volume — your coach adjusts the plan from this.",
  ],
  whereSore: ["哪里酸痛？", "Where are you sore?"],
  tapArea: ["点部位，再打 0-10 分 — “背阔肌，大概 1 分”。", "Tap an area, then rate it 0–10 — “lats, about 1 out of 10”."],
  avgSleep: ["平均睡眠", "Average sleep"],
  hitProtein: ["蛋白质吃够了吗？", "Hitting your protein?"],
  yes: ["够了", "Yes"],
  notQuite: ["差点", "Not quite"],
  coachNote: ["有什么要告诉教练的？", "Anything your coach should know?"],
  notePlaceholder: [
    "比如：脖子僵硬基本好了，倒蹬时右膝有响…",
    "e.g. neck stiffness almost gone, right knee clicked on leg press…",
  ],
  saveCheckin: ["保存每周打卡", "Save weekly check-in"],
  updateWeek: ["更新本周打卡", "Update this week"],

  // import / backup
  dataBridge: ["数据桥", "Data bridge"],
  importTitle: ["导入手表记录", "Import watch history"],
  importBody: [
    "粘贴手表导出的行 — 日期、时间、类型、时长、千卡、容量、平均心率。重复导入同一批行是安全的（会自动覆盖）。",
    "Paste rows from your watch export — date, time, type, duration, kcal, volume, avg HR. Re-importing the same rows is safe (they overwrite themselves).",
  ],
  parsedOne: ["已解析 1 条训练", "Parsed 1 workout"],
  parsedMany: ["已解析 {n} 条训练", "Parsed {n} workouts"],
  importOne: ["导入 1 条训练", "Import 1 workout"],
  importMany: ["导入 {n} 条训练", "Import {n} workouts"],
  importedDone: ["已导入 {n} ✓", "Imported {n} ✓"],
  nothingParsed: ["还没解析出内容 — 检查一下格式。", "Nothing parseable yet — check the format."],
  roadmapNote: [
    "路线图：通过 iOS 快捷指令自动同步 Apple 健康数据。",
    "Roadmap: automatic Apple Health sync via an iOS Shortcut posting here.",
  ],
  backupDownloaded: ["备份已下载 ✓ — 存进「文件」或 iCloud。", "Backup downloaded ✓ — keep it in Files/iCloud."],
  restoredRows: ["已恢复 {n} 行 ✓", "Restored {n} rows ✓"],
  restoreFailed: ["恢复失败：", "Restore failed: "],
  badFile: ["文件无效", "bad file"],
  backupSection: ["备份 · 数据保全", "Backup"],
  backupBody: [
    "所有历史都存在这台手机上。请定期导出备份 — iOS 可能清理不常用 PWA 的存储。",
    "All history lives on this phone. Export a backup regularly — iOS can evict rarely-used PWA storage.",
  ],
  exportBackup: ["导出备份", "Export backup"],
  restore: ["恢复…", "Restore…"],
} as const;

export type I18nKey = keyof typeof DICT;

export function useT(): (k: I18nKey) => string {
  const lang = useNameLang();
  return (k) => DICT[k][lang === "zh" ? 0 : 1];
}

/** Muscle-group display names. Stored data keeps the English keys — this map
 *  is display-only, so records stay consistent across language switches. */
export const MUSCLE_ZH: Record<string, string> = {
  Back: "背",
  Chest: "胸",
  Biceps: "二头",
  Triceps: "三头",
  Shoulders: "肩",
  Core: "核心",
  Quads: "股四头",
  Hamstrings: "腘绳肌",
  Adductors: "内收肌",
  Calves: "小腿",
  Mobility: "灵活性",
  Cardio: "有氧",
  Neck: "颈",
  Lats: "背阔肌",
  "Upper back": "上背",
  "Lower back": "下背",
  Forearms: "前臂",
  Glutes: "臀",
  Shins: "胫骨前肌",
  Other: "其他",
};

export function useMuscleName(): (m: string) => string {
  const lang = useNameLang();
  return (m) => (lang === "zh" ? (MUSCLE_ZH[m] ?? m) : m);
}
