import { describe, it, expect } from "vitest";
import { localDate } from "@/lib/dates";

describe("localDate", () => {
  it("parses an ISO date to LOCAL midnight (guards the UTC off-by-one bug)", () => {
    const d = localDate("2026-06-16");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5); // June (0-indexed)
    expect(d.getDate()).toBe(16);
    expect(d.getHours()).toBe(0);
  });
});
