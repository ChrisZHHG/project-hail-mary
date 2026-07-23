import { describe, it, expect } from "vitest";
import { scoreReadiness, type ReadinessInput } from "@/lib/data/readiness";

const neutral: ReadinessInput = { energy: 3, soreness: 3, sleep: 3, stress: 3, mood: 3, jointPain: 1 };

describe("scoreReadiness", () => {
  it("neutral inputs → 58 / steady", () => {
    // good metrics: (3-1)/4 = .5 ×3; bad metrics: (5-3)/4 = .5 ×2; jointPain (5-1)/4 = 1
    // mean = (0.5*5 + 1)/6 = 0.5833 → 58
    const r = scoreReadiness(neutral);
    expect(r.totalScore).toBe(58);
    expect(r.level).toBe("steady");
  });

  it("perfect inputs → 100 / go", () => {
    const r = scoreReadiness({ energy: 5, soreness: 1, sleep: 5, stress: 1, mood: 5, jointPain: 1 });
    expect(r.totalScore).toBe(100);
    expect(r.level).toBe("go");
  });

  it("worst inputs → 0 / down", () => {
    const r = scoreReadiness({ energy: 1, soreness: 5, sleep: 1, stress: 5, mood: 1, jointPain: 5 });
    expect(r.totalScore).toBe(0);
    expect(r.level).toBe("down");
  });

  it("caution band (~42)", () => {
    const r = scoreReadiness({ energy: 2, soreness: 3, sleep: 2, stress: 3, mood: 2, jointPain: 2 });
    expect(r.totalScore).toBeGreaterThanOrEqual(40);
    expect(r.totalScore).toBeLessThan(55);
    expect(r.level).toBe("caution");
  });

  it("jointPain > 3 forces 'down' even with an otherwise-perfect score", () => {
    const r = scoreReadiness({ energy: 5, soreness: 1, sleep: 5, stress: 1, mood: 5, jointPain: 4 });
    expect(r.level).toBe("down");
    expect(r.recommendation.toLowerCase()).toContain("joint");
  });

  it("inverted metrics: high soreness/stress lowers the score", () => {
    const low = scoreReadiness({ ...neutral, soreness: 5, stress: 5 });
    const high = scoreReadiness({ ...neutral, soreness: 1, stress: 1 });
    expect(high.totalScore).toBeGreaterThan(low.totalScore);
  });
});
