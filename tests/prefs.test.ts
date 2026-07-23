import { describe, it, expect } from "vitest";
import { lbsToDisplay, displayToLbs } from "@/lib/prefs";

describe("weight unit conversion (canonical storage is always lbs)", () => {
  it("lbs mode is the identity", () => {
    expect(lbsToDisplay(100, "lbs")).toBe(100);
    expect(displayToLbs(100, "lbs")).toBe(100);
  });

  it("lbsToDisplay converts to kg, rounded to 1 dp", () => {
    expect(lbsToDisplay(100, "kg")).toBeCloseTo(45.4, 1);
  });

  it("displayToLbs converts kg input back to lbs", () => {
    expect(displayToLbs(20, "kg")).toBeCloseTo(44.09, 1);
  });

  it("kg → lbs → kg round-trips within display precision", () => {
    const back = displayToLbs(lbsToDisplay(100, "kg"), "kg");
    expect(back).toBeCloseTo(100, 0);
  });
});
