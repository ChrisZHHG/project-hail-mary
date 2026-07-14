"use client";

import { useEffect, useState } from "react";
import { THEORY, type TheoryCategory, type TheoryItem } from "@/lib/theory";
import { SEED_EXERCISES } from "@/lib/data/seed";

const SECTIONS: { category: TheoryCategory; label: string; blurb: string }[] = [
  { category: "principle", label: "Principles", blurb: "The rules behind every set." },
  {
    category: "corrective",
    label: "Correctives — The Shoulder Story",
    blurb: "For high shoulders / tight neck. 1-2× daily, before training, 6-8 weeks.",
  },
  { category: "habit", label: "Habits", blurb: "What to do more of — and less of — all day." },
];

/** Exercises this theory item attaches to (explicit ids ∪ muscle match). */
function linkedExercises(t: TheoryItem): string[] {
  if (t.general) return [];
  return SEED_EXERCISES.filter(
    (e) => t.exerciseIds?.includes(e.id) || t.targetMuscles?.includes(e.targetMuscle)
  ).map((e) => e.name);
}

export default function TheoryList() {
  const [highlight, setHighlight] = useState<string | null>(null);

  // Deep links from training cards: /method#th-… → scroll + glow.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    setHighlight(id);
    document.getElementById(id)?.scrollIntoView({ block: "center" });
    const t = setTimeout(() => setHighlight(null), 2400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {SECTIONS.map(({ category, label, blurb }) => (
        <section key={category}>
          <h2 className="eyebrow px-1">{label}</h2>
          <p className="mb-2 mt-0.5 px-1 text-[0.75rem] text-faint">{blurb}</p>
          <div className="flex flex-col gap-3">
            {THEORY.filter((t) => t.category === category).map((t) => {
              const linked = linkedExercises(t);
              return (
                <article
                  key={t.id}
                  id={t.id}
                  className={`panel scroll-mt-24 p-4 transition-shadow duration-500 ${
                    highlight === t.id ? "border-laser/70 glow-laser" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-laser/40 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-laser">
                      {t.tag}
                    </span>
                    <h3 className="text-base font-semibold text-ink">{t.title}</h3>
                  </div>
                  <p className="mt-2 text-[0.85rem] leading-snug text-muted">{t.body}</p>
                  {t.steps ? (
                    <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-[0.8rem] leading-snug text-muted">
                      {t.steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  ) : null}
                  {t.dosage ? (
                    <p className="tnum mt-2 text-[0.72rem] font-semibold text-cyan">{t.dosage}</p>
                  ) : null}
                  {linked.length ? (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-line pt-2.5">
                      {linked.slice(0, 5).map((name) => (
                        <span
                          key={name}
                          className="rounded-full border border-line px-2 py-0.5 text-[0.6rem] text-faint"
                        >
                          {name}
                        </span>
                      ))}
                      {linked.length > 5 ? (
                        <span className="px-1 text-[0.6rem] text-faint">+{linked.length - 5}</span>
                      ) : null}
                    </div>
                  ) : t.general ? (
                    <p className="mt-2.5 border-t border-line pt-2 text-[0.6rem] uppercase tracking-wider text-faint">
                      Applies to all training
                    </p>
                  ) : null}
                  {t.source ? (
                    <p className="mt-2 text-[0.6rem] italic text-faint">{t.source}</p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
