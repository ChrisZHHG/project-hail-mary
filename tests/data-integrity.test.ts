import { describe, it, expect } from "vitest";
import { SEED_EXERCISES, SEED_WORKOUT_EXERCISES, SEED_WORKOUTS } from "@/lib/data/seed";
import { LIBRARY } from "@/lib/library";
import { FRONT_MUSCLES, BACK_MUSCLES } from "@/lib/musclePaths";

describe("seed integrity", () => {
  it("every workout-exercise assignment references a real exercise", () => {
    const ids = new Set(SEED_EXERCISES.map((e) => e.id));
    for (const we of SEED_WORKOUT_EXERCISES) {
      expect(ids.has(we.exerciseId), `missing exercise ${we.exerciseId}`).toBe(true);
    }
  });
  it("exercise ids are unique", () => {
    const ids = SEED_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("every assignment points at a real workout", () => {
    const wo = new Set(SEED_WORKOUTS.map((w) => w.id));
    for (const we of SEED_WORKOUT_EXERCISES) expect(wo.has(we.workoutId)).toBe(true);
  });
});

describe("library integrity", () => {
  it("slugs are unique", () => {
    const slugs = LIBRARY.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every entry targets a muscle that the body map actually draws (no dead pickers)", () => {
    const drawn = new Set([...FRONT_MUSCLES, ...BACK_MUSCLES].map((m) => m.muscle));
    for (const e of LIBRARY) {
      expect(drawn.has(e.targetMuscle), `${e.slug} → unknown muscle "${e.targetMuscle}"`).toBe(true);
    }
  });

  it("every entry has the required display fields", () => {
    for (const e of LIBRARY) {
      expect(e.name, e.slug).toBeTruthy();
      expect(e.aliasZh, e.slug).toBeTruthy();
      expect(e.pattern, e.slug).toBeTruthy();
      expect(e.equipment, e.slug).toBeTruthy();
    }
  });

  it("media src (when present) points at /exercises/<name>.png", () => {
    for (const e of LIBRARY) {
      if (e.media) expect(e.media.src).toMatch(/^\/exercises\/[a-z0-9-]+\.png$/);
    }
  });
});
