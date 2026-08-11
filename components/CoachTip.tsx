"use client";

import type { Prescription, ReasonCode } from "@/lib/coach";
import { useT, type I18nKey } from "@/lib/i18n";
import { useWeightFmt } from "@/lib/prefs";

/** Reason code → the sentence the user reads. Keeps the engine language-free. */
const REASON_KEY: Record<ReasonCode, I18nKey> = {
  firstTime: "rxFirstTime",
  topOfRange: "rxTopOfRange",
  wellOverRange: "rxWellOverRange",
  insideRange: "rxInsideRange",
  belowRange: "rxBelowRange",
  overreached: "rxOverreached",
  noRepTarget: "rxNoRepTarget",
  readinessHold: "rxReadinessHold",
  readinessBackOff: "rxReadinessBackOff",
  soreSkip: "rxSoreSkip",
};

/**
 * The engine's call for one movement: the numbers to hit, and why.
 *
 * "Why" is not decoration — SOUL.md's second promise is that the app is never a
 * black box. A number you don't understand is a number you won't trust.
 */
export default function CoachTip({ rx }: { rx: Prescription }) {
  const t = useT();
  const fw = useWeightFmt();

  let reason = t(REASON_KEY[rx.reasonCode]);
  for (const [k, v] of Object.entries(rx.reasonParams ?? {})) {
    reason = reason.replace(`{${k}}`, String(v));
  }

  const skipping = rx.action === "skip";
  // Bodyweight movements have no load to show, so name the unit — a bare "7"
  // next to an RIR target reads ambiguously.
  const target =
    rx.reps == null
      ? null
      : rx.weight != null
        ? `${fw(rx.weight)} × ${rx.reps}`
        : `${rx.reps} ${t("reps")}`;

  return (
    <div
      className={`mt-2 rounded-xl border px-3 py-2 ${
        skipping ? "border-warn/40 bg-warn/[0.06]" : "border-cyan/30 bg-cyan/[0.05]"
      }`}
    >
      <div className="flex items-baseline gap-2">
        <span className={`eyebrow ${skipping ? "text-warn" : "text-cyan"}`}>
          {skipping ? t("rxSkipToday") : t("rxLabel")}
        </span>
        {target && !skipping ? (
          <span className="tnum text-sm font-bold text-ink">{target}</span>
        ) : null}
        {rx.rir && !skipping ? (
          <span className="tnum text-[0.7rem] text-faint">
            @{rx.rir} {t("rir")}
          </span>
        ) : null}
      </div>
      <p className="mt-0.5 text-[0.72rem] leading-snug text-muted">{reason}</p>
    </div>
  );
}
