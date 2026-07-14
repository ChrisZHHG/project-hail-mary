"use client";

import { setNameLang, useNameLang } from "@/lib/prefs";

/** 中 / EN pill — switches which exercise-name language leads everywhere. */
export default function LangToggle() {
  const lang = useNameLang();
  return (
    <div className="flex overflow-hidden rounded-full border border-line text-[0.65rem] font-bold">
      {(["zh", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setNameLang(l)}
          aria-pressed={lang === l}
          className={`tap px-2.5 py-1 uppercase tracking-wider transition ${
            lang === l ? "bg-cyan/15 text-cyan" : "text-faint"
          }`}
        >
          {l === "zh" ? "中" : "EN"}
        </button>
      ))}
    </div>
  );
}
