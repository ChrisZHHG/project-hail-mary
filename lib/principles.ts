/** The coach's method, made visible. These are the "buried knowledge" tenets
 *  (Austin Johansen's approach) that the spreadsheet never surfaced. Summarized
 *  for the app — the full rationale lives in the coach's theory docs. */

export interface Principle {
  tag: string;
  title: string;
  body: string;
}

export const PRINCIPLES: Principle[] = [
  {
    tag: "FREQUENCY",
    title: "Frequency > load",
    body: "Train each pattern often at submaximal loads. Weekly volume and quality reps drive growth — not ego weight on one heroic set.",
  },
  {
    tag: "RIR",
    title: "Leave reps in reserve",
    body: "Stop ~2 reps short (RIR 2). Spend less of the tank per set so you recover faster and can train the movement again sooner.",
  },
  {
    tag: "ISOMETRICS",
    title: "Isometrics build tendons",
    body: "Hold positions under tension. Yielding & overcoming isometrics build tendon stiffness and resilient joints through range — the base strength is built on.",
  },
  {
    tag: "SMH",
    title: "Load the stretch",
    body: "Pause in the lengthened position — hold the bottom 3-5s. Stretch-mediated hypertrophy: the most growth lives at long muscle lengths.",
  },
  {
    tag: "MOBILITY",
    title: "Own your end-range",
    body: "CARS and controlled rotations before you load. Mobility you actively control is mobility you keep — and joints you can trust under weight.",
  },
  {
    tag: "READINESS",
    title: "Autoregulate to recovery",
    body: "The weekly check-in tunes volume to your sleep, soreness, and joints. Train the body you have this week — your coach adjusts the plan from it.",
  },
];

/** Derive a method tag for an exercise so the theory shows up in context. */
export function methodTag(name: string, category: string): string | null {
  const n = name.toLowerCase();
  if (n.includes("isometric") || n.includes("burst")) return "ISOMETRIC";
  if (n.includes("cars") || category === "mobility") return "MOBILITY · FRC";
  if (n.includes("calf") || n.includes("toe press")) return "STRETCH · SMH";
  return null;
}
