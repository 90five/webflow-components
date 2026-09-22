import { describe, expect, it } from "vitest";
import { computeCopyCount, computeDurationSeconds } from "./logic";

describe("computeCopyCount", () => {
  it("is at least 2 even when the set is much wider than the container", () => {
    expect(computeCopyCount(2000, 500)).toBe(2);
  });

  it("adds enough copies to cover a container wider than one set", () => {
    // container needs ceil(1000/300)=4, plus 1 slack = 5
    expect(computeCopyCount(300, 1000)).toBe(5);
  });

  it("falls back to 2 for a zero-width set (nothing measured yet)", () => {
    expect(computeCopyCount(0, 1000)).toBe(2);
  });

  it("falls back to 2 for a negative width", () => {
    expect(computeCopyCount(-10, 1000)).toBe(2);
  });
});

describe("computeDurationSeconds", () => {
  it("is width divided by speed", () => {
    expect(computeDurationSeconds(1000, 100)).toBe(10);
  });

  it("is 0 for zero speed (would otherwise be Infinity)", () => {
    expect(computeDurationSeconds(1000, 0)).toBe(0);
  });

  it("is 0 for zero width", () => {
    expect(computeDurationSeconds(0, 100)).toBe(0);
  });

  it("is 0 for a negative speed", () => {
    expect(computeDurationSeconds(1000, -5)).toBe(0);
  });
});
