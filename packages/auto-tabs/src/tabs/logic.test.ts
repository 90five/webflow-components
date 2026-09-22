import { describe, expect, it } from "vitest";
import { clampIndex, getNextIndex, getRovingIndex } from "./logic";

describe("clampIndex", () => {
  it("passes a valid index through", () => expect(clampIndex(1, 3)).toBe(1));
  it("clamps a negative index to 0", () => expect(clampIndex(-1, 3)).toBe(0));
  it("clamps an out-of-range index to the last", () => expect(clampIndex(9, 3)).toBe(2));
  it("is 0 with zero items", () => expect(clampIndex(2, 0)).toBe(0));
});

describe("getNextIndex", () => {
  it("advances by one", () => expect(getNextIndex(0, 3)).toBe(1));
  it("wraps from the last back to the first", () => expect(getNextIndex(2, 3)).toBe(0));
  it("is 0 with zero items", () => expect(getNextIndex(0, 0)).toBe(0));
});

describe("getRovingIndex", () => {
  it("ArrowRight moves forward", () => expect(getRovingIndex(0, "ArrowRight", 3)).toBe(1));
  it("ArrowRight wraps from the last to the first", () => expect(getRovingIndex(2, "ArrowRight", 3)).toBe(0));
  it("ArrowLeft moves backward", () => expect(getRovingIndex(1, "ArrowLeft", 3)).toBe(0));
  it("ArrowLeft wraps from the first to the last", () => expect(getRovingIndex(0, "ArrowLeft", 3)).toBe(2));
  it("ArrowDown behaves like ArrowRight, for a vertical layout", () => expect(getRovingIndex(0, "ArrowDown", 3)).toBe(1));
  it("ArrowUp behaves like ArrowLeft, for a vertical layout", () => expect(getRovingIndex(0, "ArrowUp", 3)).toBe(2));
  it("Home jumps to the first", () => expect(getRovingIndex(2, "Home", 3)).toBe(0));
  it("End jumps to the last", () => expect(getRovingIndex(0, "End", 3)).toBe(2));
});
