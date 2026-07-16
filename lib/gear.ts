/** Canonical gear keys + bilingual labels. Values are free text ("4", "S", "wide"). */
export const GEAR_LABELS: Record<string, { zh: string; en: string }> = {
  seat: { zh: "座位", en: "seat" },
  pad: { zh: "垫位", en: "pad" },
  pulley: { zh: "绳位", en: "pulley" },
  attachment: { zh: "配件", en: "attachment" },
  grip: { zh: "握距", en: "grip" },
  bar: { zh: "杆位", en: "bar" },
  platform: { zh: "踏位", en: "platform" },
  other: { zh: "其他", en: "other" },
};

/** Which keys to suggest first, per movement pattern (fall back to DEFAULT). */
export const SUGGESTED_KEYS: Record<string, string[]> = {
  pulldown: ["seat", "bar", "grip"],
  row: ["seat", "pad", "grip"],
  press: ["seat", "grip"],
  pushdown: ["pulley", "attachment"],
  lateralraise: ["pulley"],
  crunch: ["pulley", "attachment"],
  legcurl: ["seat", "pad"],
  legext: ["seat", "pad"],
  calf: ["platform"],
  curl: ["seat"],
  squat: ["bar"],
};

export const DEFAULT_KEYS = ["seat", "pulley", "grip"];
