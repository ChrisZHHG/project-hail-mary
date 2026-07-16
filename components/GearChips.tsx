"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/data/db";
import { useNameLang } from "@/lib/prefs";
import { useT } from "@/lib/i18n";
import { GEAR_LABELS, SUGGESTED_KEYS, DEFAULT_KEYS } from "@/lib/gear";

/** Per-exercise machine-setup memory ("器械刻度") — seat/pulley/grip etc.
 *  Collapsed row shows saved chips (or a hint); tap to open a compact
 *  inline editor. Lives inside logging cards, so it stays small. */
export default function GearChips({
  exerciseId,
  pattern,
}: {
  exerciseId: string;
  pattern?: string;
}) {
  const lang = useNameLang();
  const t = useT();
  const gear = useLiveQuery(() => db.exerciseGear.get(exerciseId), [exerciseId]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [customKey, setCustomKey] = useState("");
  const [customValue, setCustomValue] = useState("");

  const keys = useMemo(() => {
    const base = SUGGESTED_KEYS[pattern ?? ""] ?? DEFAULT_KEYS;
    const savedExtra = Object.keys(gear?.values ?? {}).filter((k) => !base.includes(k));
    return [...base, ...savedExtra];
  }, [pattern, gear]);

  const label = (key: string) => GEAR_LABELS[key]?.[lang === "zh" ? "zh" : "en"] ?? key;

  function openEditor() {
    setDraft({ ...(gear?.values ?? {}) });
    setCustomKey("");
    setCustomValue("");
    setOpen(true);
  }

  async function save() {
    const values: Record<string, string> = {};
    for (const [k, v] of Object.entries(draft)) {
      const trimmed = v.trim();
      if (trimmed) values[k] = trimmed;
    }
    const ck = customKey.trim();
    const cv = customValue.trim();
    if (ck && cv) values[ck] = cv;

    if (Object.keys(values).length === 0) {
      await db.exerciseGear.delete(exerciseId);
    } else {
      await db.exerciseGear.put({ exerciseId, values, updatedAt: Date.now() });
    }
    setOpen(false);
  }

  const hasValues = !!gear && Object.keys(gear.values).length > 0;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openEditor())}
        className="tap flex w-full flex-wrap items-center gap-1.5 rounded-lg py-0.5 text-left"
      >
        <span className="text-faint">⚙</span>
        {hasValues ? (
          Object.entries(gear!.values).map(([k, v]) => (
            <span
              key={k}
              className="rounded border border-line px-1.5 py-0.5 text-[0.6rem] text-muted"
            >
              {label(k)} {v}
            </span>
          ))
        ) : (
          <span className="text-[0.65rem] text-faint">{t("gearHint")}</span>
        )}
      </button>

      {open ? (
        <div className="mt-2 rounded-xl border border-line bg-abyss/60 p-3">
          <p className="eyebrow mb-2">{t("gearTitle")}</p>
          <div className="flex flex-col gap-2">
            {keys.map((k) => (
              <div key={k} className="flex items-center justify-between gap-2">
                <span className="text-[0.75rem] text-muted">{label(k)}</span>
                <input
                  type="text"
                  value={draft[k] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
                  className="w-24 rounded-lg border border-line bg-elevated px-2 py-1 text-sm text-ink"
                />
              </div>
            ))}
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder={t("gearCustomKey")}
                className="w-24 rounded-lg border border-line bg-elevated px-2 py-1 text-sm text-ink"
              />
              <input
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                className="w-24 rounded-lg border border-line bg-elevated px-2 py-1 text-sm text-ink"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={save}
            className="tap mt-3 w-full rounded-xl border border-cyan/50 bg-cyan/[0.08] py-2 text-[0.75rem] font-bold uppercase tracking-wider text-cyan transition active:scale-[0.98]"
          >
            {t("save")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
