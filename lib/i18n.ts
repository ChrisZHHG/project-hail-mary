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
  formVideo: ["▶ 动作视频", "▶ form video"],
  doneShort: ["完成", "done"],
  weight: ["重量", "Weight"],
  reps: ["次数", "Reps"],
  last: ["上次", "Last"],
  sets: ["组", "sets"],
  setsLogged: ["组已记录", "sets logged"],
  inProgress: ["进行中", "in progress"],
  rir: ["RIR", "RIR"],
  rirTarget: ["目标 {n}", "target {n}"],
  methodIsometric: ["等长", "ISOMETRIC"],
  methodMobility: ["灵活性 · FRC", "MOBILITY · FRC"],
  methodStretch: ["拉伸 · SMH", "STRETCH · SMH"],
  methodBy: ["方法来自 Austin Johansen", "Method by Austin Johansen"],
  methodEyebrow: ["为什么这样安排", "Why it's built this way"],
  methodPageDesc: [
    "计划背后的知识 — 原则、纠正方案与日常习惯。相关动作在记录页会标 📖。",
    "The knowledge behind the plan — principles, corrective protocols, and daily habits. Linked movements show a 📖 in the logger.",
  ],
  coachEyebrow: ["教练视图 · 只读", "Coach view · read-only"],
  coachClients: ["学员", "Clients"],
  coachProgramBlock: ["全身训练计划", "Full-Body Block"],
  coachSessionsWeek: ["本周训练", "sessions this week"],
  coachNeedsAttention: ["⚠ 需要注意", "⚠ Needs attention"],
  coachNoFlags: ["暂无警示", "No red flags"],
  coachAllInRange: ["打卡、酸痛、睡眠、负荷比都在正常范围。", "Check-in, soreness, sleep and load ratio are all within range."],
  coachLatestCheckin: ["最近打卡", "Latest check-in"],
  coachNoCheckin: ["还没有打卡。", "No check-in yet."],
  coachProgramVsActual: ["计划 vs 实际", "Program vs. actual"],
  coachProgramVsActualSub: ["目标 — 以及学员上次记录的最重一组。", "Target — and the last top set the client logged."],
  coachImportCsv: ["导入手表记录 (CSV)", "Import watch history (CSV)"],
  coachReadonlyFooter: [
    "本设备数据的只读视图。多学员同步将随账号系统上线。",
    "Read-only view of this device’s data. Multi-client sync arrives with accounts.",
  ],
  coachFlagJoint: [
    "每周打卡关节痛 {n}/5 — 训练量已自动下调。",
    "Joint pain {n}/5 on the weekly check-in — volume was auto-flagged for downscale.",
  ],
  coachFlagSore: [
    "{area} 酸痛 {v}/10 — 再加练前先确认恢复。",
    "{area} soreness at {v}/10 — check recovery before loading it again.",
  ],
  coachFlagAcr: [
    "急性:慢性负荷比 {v} — 训练负荷相对基线在飙升。",
    "Acute:chronic load ratio {v} — training load is spiking vs. baseline.",
  ],
  coachFlagSleep: ["平均睡眠 {h} 小时 — 恢复上限偏低。", "Averaging {h}h sleep — recovery ceiling is low."],
  theorySecPrinciples: ["原则", "Principles"],
  theorySecPrinciplesBlurb: ["每一组背后的规则。", "The rules behind every set."],
  theorySecCorrectives: ["纠正 · 肩颈方案", "Correctives — The Shoulder Story"],
  theorySecCorrectivesBlurb: [
    "针对高低肩 / 颈部紧张。每天 1-2 次,练前做,坚持 6-8 周。",
    "For high shoulders / tight neck. 1-2× daily, before training, 6-8 weeks.",
  ],
  theorySecHabits: ["习惯", "Habits"],
  theorySecHabitsBlurb: ["全天该多做、该少做的。", "What to do more of — and less of — all day."],
  theoryAppliesAll: ["适用于所有训练", "Applies to all training"],
  cardioZone2: ["2区有氧", "Zone 2 Cardio"],

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
  noExercisesYet: ["这个部位还没有收录动作 — 用下面的「自定义动作」加一个。", "No exercises here yet — add one with “Custom exercise” below."],
  fromLibrary: ["从动作库添加", "Add from library"],
  customExercise: ["+ 自定义动作", "+ Custom exercise"],
  customNamePlaceholder: ["动作名称（中文或英文）", "Exercise name"],
  customWeighted: ["带重量", "Weighted"],
  addExercise: ["添加", "Add"],
  illustrationCredit: [
    "动作插画来自 Everkinetic 与 wger.de 社区 (CC-BY-SA)",
    "Exercise illustrations by Everkinetic & wger.de contributors (CC-BY-SA)",
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
  sessionNotFound: ["找不到这条训练记录。", "Session not found."],
  noSetsInSession: ["这场还没有记录任何组。", "No sets logged in this session."],
  pickExercise: ["重选动作", "Pick movement"],
  editHint: ["点 ✎ 改重量/次数，或在下面补一组", "Tap ✎ to edit, or add a set below"],
  strengthLabel: ["力量", "Strength"],
  cardioLabel: ["有氧", "Cardio"],
  imported: ["导入", "imported"],
  peak: ["峰值", "peak"],
  watchBadge: ["手表", "watch"],
  muscleLoadAllTime: ["肌肉负荷 — 累计", "Muscle load — all time"],
  bodyFront: ["正面", "FRONT"],
  bodyBack: ["背面", "BACK"],
  noMuscleVol: ["还没有带重量的容量记录。", "No weighted volume logged yet."],
  logToStart: ["记一次训练，曲线就开始了。", "Log a session to start the trend."],
  noCompleted: ["还没有完成的训练。", "No completed sessions yet."],
  startTrainingCta: ["去训练", "Start training"],

  // load gauge
  loadTitle: ["训练负荷 — 7天 vs 28天", "Training load — 7d vs 28d"],
  loadWhat: [
    "本周训练量 ÷ 近4周平均。≈1 稳定;>1.5 这周猛增(防伤病、重恢复);<0.8 偏少 / 在恢复。这是通用运动科学指标(急慢性负荷比),不是教练的理论。",
    "This week's load ÷ your 4-week average. ≈1 steady · >1.5 ramping too fast (injury risk) · <0.8 tapering. A general sports-science metric (acute:chronic ratio), not the coach's method.",
  ],
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
  refreshApp: ["刷新应用", "Refresh app"],
  refreshAppHint: ["清缓存并加载最新版（主屏幕 App 没有下拉刷新）", "Clear cache and load the latest version (home-screen app has no pull-to-refresh)"],
  refreshing: ["正在刷新…", "Refreshing…"],
  dataAndBackup: ["数据 · 备份 · 刷新", "Data · backup · refresh"],

  // error boundary + 404
  errorTitle: ["出错了", "Something broke"],
  errorBody: [
    "应用遇到一个错误。你的数据仍安全存在这台手机上 —— 可以先导出备份,再重试或刷新。",
    "The app hit an error. Your data is still safe on this device — export a backup, then retry or refresh.",
  ],
  errorRetry: ["重试", "Try again"],
  notFoundTitle: ["页面不存在", "Page not found"],
  notFoundBody: ["这里什么都没有 —— 链接可能已过期。", "There's nothing here — the link may be stale."],
  goHome: ["回到首页", "Back home"],

  // cloud sync (Phase 2)
  cloudSection: ["云同步", "Cloud sync"],
  cloudBody: [
    "登录后可把本设备的数据备份到云端,并在其它设备上恢复。数据仍先存在本机。",
    "Sign in to back up this device's data to the cloud and restore it on another. Data still lives on-device first.",
  ],
  cloudEmailPlaceholder: ["邮箱", "you@email.com"],
  cloudSendLink: ["发送登录链接", "Send sign-in link"],
  cloudLinkSent: ["登录链接已发送 ✓ 打开邮件即可登录。", "Sign-in link sent ✓ open the email to finish."],
  cloudSignedInAs: ["已登录:{email}", "Signed in as {email}"],
  cloudPush: ["备份到云", "Push to cloud"],
  cloudPull: ["从云端拉取", "Pull from cloud"],
  cloudSignOut: ["登出", "Sign out"],
  cloudPushed: ["已上传 {n} 行 ✓", "Pushed {n} rows ✓"],
  cloudPulled: ["已拉取 {n} 行 ✓", "Pulled {n} rows ✓"],
  cloudSyncing: ["同步中…", "Syncing…"],
  cloudError: ["同步失败:", "Sync failed: "],
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

/** Stored variant keys stay English (`right` / `narrow`); display is language-pure. */
const VARIANT_LABEL: Record<string, [string, string]> = {
  right: ["右", "right"],
  left: ["左", "left"],
  narrow: ["窄握", "narrow"],
  wide: ["宽握", "wide"],
};

export function useVariantLabel(): (v: string) => string {
  const lang = useNameLang();
  return (v) => {
    const pair = VARIANT_LABEL[v.toLowerCase()];
    return pair ? pair[lang === "zh" ? 0 : 1] : v;
  };
}

/** Map known English cardioSpec storage strings → localized chrome. */
export function useCardioSpecLabel(): (spec?: string) => string | undefined {
  const t = useT();
  return (spec) => {
    if (!spec) return undefined;
    if (/zone\s*2/i.test(spec)) return t("cardioZone2");
    return spec;
  };
}
