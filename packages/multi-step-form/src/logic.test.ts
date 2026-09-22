import { describe, expect, it } from "vitest";
import { clampStepIndex, countWords, formatProgressLabel, getEmailDomain, isFreeEmailDomain, meetsMinWords } from "./logic";

describe("countWords", () => {
  it("counts space-separated words", () => expect(countWords("one two three")).toBe(3));
  it("ignores leading/trailing whitespace", () => expect(countWords("  one two  ")).toBe(2));
  it("collapses repeated whitespace", () => expect(countWords("one\n\ttwo")).toBe(2));
  it("is 0 for an empty string", () => expect(countWords("")).toBe(0));
  it("is 0 for whitespace only", () => expect(countWords("   ")).toBe(0));
});

describe("meetsMinWords", () => {
  it("passes at exactly the threshold", () => expect(meetsMinWords("a b c", 3)).toBe(true));
  it("fails one word under", () => expect(meetsMinWords("a b", 3)).toBe(false));
  it("a zero threshold always passes", () => expect(meetsMinWords("", 0)).toBe(true));
});

describe("clampStepIndex", () => {
  it("passes a valid index through", () => expect(clampStepIndex(1, 3)).toBe(1));
  it("clamps a negative index to 0", () => expect(clampStepIndex(-1, 3)).toBe(0));
  it("clamps an out-of-range index to the last step", () => expect(clampStepIndex(5, 3)).toBe(2));
  it("is 0 when there are no steps", () => expect(clampStepIndex(2, 0)).toBe(0));
});

describe("formatProgressLabel", () => {
  it("is 1-based", () => expect(formatProgressLabel(0, 4)).toBe("Step 1 of 4"));
  it("reflects the last step", () => expect(formatProgressLabel(3, 4)).toBe("Step 4 of 4"));
});

describe("getEmailDomain", () => {
  it("extracts the domain", () => expect(getEmailDomain("niklas@90five.com")).toBe("90five.com"));
  it("lowercases it", () => expect(getEmailDomain("niklas@90Five.COM")).toBe("90five.com"));
  it("is null without an @", () => expect(getEmailDomain("not-an-email")).toBeNull());
  it("trims surrounding whitespace first", () => expect(getEmailDomain("  niklas@90five.com  ")).toBe("90five.com"));
});

describe("isFreeEmailDomain", () => {
  it("flags gmail.com", () => expect(isFreeEmailDomain("someone@gmail.com")).toBe(true));
  it("flags a German consumer provider", () => expect(isFreeEmailDomain("someone@web.de")).toBe(true));
  it("does not flag a business domain", () => expect(isFreeEmailDomain("niklas@90five.com")).toBe(false));
  it("is case-insensitive", () => expect(isFreeEmailDomain("someone@GMAIL.com")).toBe(true));
  it("is false for an unparseable value", () => expect(isFreeEmailDomain("not-an-email")).toBe(false));
  it("honors extra per-form domains", () => expect(isFreeEmailDomain("x@mailinator.com", ["mailinator.com"])).toBe(true));
  it("does not flag an extra domain that wasn't listed", () =>
    expect(isFreeEmailDomain("x@mailinator.com")).toBe(false));
});
