import { describe, expect, it } from "vitest";
import { formatSlideLabel, getLoopEnabled, sanitizeAutoplayDelay, sanitizeCount, sanitizeGap } from "./logic";

describe("sanitizeCount", () => {
  it("accepts a positive integer", () => expect(sanitizeCount(3, 1)).toBe(3));
  it("rounds a fractional value", () => expect(sanitizeCount(2.6, 1)).toBe(3));
  it("falls back on undefined", () => expect(sanitizeCount(undefined, 2)).toBe(2));
  it("falls back on zero", () => expect(sanitizeCount(0, 2)).toBe(2));
  it("falls back on negative values", () => expect(sanitizeCount(-1, 2)).toBe(2));
  it("falls back on NaN", () => expect(sanitizeCount(NaN, 2)).toBe(2));
});

describe("sanitizeGap", () => {
  it("accepts zero", () => expect(sanitizeGap(0, 16)).toBe(0));
  it("accepts a positive value", () => expect(sanitizeGap(24, 16)).toBe(24));
  it("falls back on a negative value", () => expect(sanitizeGap(-4, 16)).toBe(16));
  it("falls back on undefined", () => expect(sanitizeGap(undefined, 16)).toBe(16));
});

describe("sanitizeAutoplayDelay", () => {
  it("keeps a delay at or above the floor", () => expect(sanitizeAutoplayDelay(3000)).toBe(3000));
  it("clamps a delay below the 1000ms floor", () => expect(sanitizeAutoplayDelay(50)).toBe(1000));
  it("clamps a zero delay", () => expect(sanitizeAutoplayDelay(0)).toBe(1000));
  it("falls back to the floor on undefined", () => expect(sanitizeAutoplayDelay(undefined)).toBe(1000));
});

describe("getLoopEnabled", () => {
  it("is false when loop is off", () => expect(getLoopEnabled(false, 5)).toBe(false));
  it("is false with zero slides even if loop is on", () => expect(getLoopEnabled(true, 0)).toBe(false));
  it("is false with exactly one slide", () => expect(getLoopEnabled(true, 1)).toBe(false));
  it("is true with more than one slide and loop on", () => expect(getLoopEnabled(true, 2)).toBe(true));
});

describe("formatSlideLabel", () => {
  it("is 1-based for screen readers", () => expect(formatSlideLabel(0, 5)).toBe("1 of 5"));
  it("reflects the last index", () => expect(formatSlideLabel(4, 5)).toBe("5 of 5"));
});
