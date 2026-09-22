import { describe, expect, it } from "vitest";
import { getInitialOpenIndexes, getRovingIndex, toggleOpenIndexes } from "./logic";

describe("getInitialOpenIndexes", () => {
  it("opens the given default index", () => expect(getInitialOpenIndexes(1, 3)).toEqual(new Set([1])));
  it("opens nothing when default is -1", () => expect(getInitialOpenIndexes(-1, 3)).toEqual(new Set()));
  it("clamps an out-of-range default to the last item", () => expect(getInitialOpenIndexes(9, 3)).toEqual(new Set([2])));
  it("is empty with zero items", () => expect(getInitialOpenIndexes(0, 0)).toEqual(new Set()));
});

describe("toggleOpenIndexes — singleOpen", () => {
  const singleOpen = { singleOpen: true, allowAllClosed: false };
  const singleOpenClosable = { singleOpen: true, allowAllClosed: true };

  it("opening a different item replaces the open one", () => {
    expect(toggleOpenIndexes(new Set([0]), 1, singleOpen)).toEqual(new Set([1]));
  });

  it("clicking the open item does nothing when allowAllClosed is false (true tabs behavior)", () => {
    expect(toggleOpenIndexes(new Set([0]), 0, singleOpen)).toEqual(new Set([0]));
  });

  it("clicking the open item closes it when allowAllClosed is true", () => {
    expect(toggleOpenIndexes(new Set([0]), 0, singleOpenClosable)).toEqual(new Set());
  });

  it("opens the clicked item even from a fully-closed state", () => {
    expect(toggleOpenIndexes(new Set(), 2, singleOpen)).toEqual(new Set([2]));
  });
});

describe("toggleOpenIndexes — multi-open (accordion)", () => {
  const multi = { singleOpen: false, allowAllClosed: true };
  const multiMustKeepOne = { singleOpen: false, allowAllClosed: false };

  it("opening an item adds it without closing others", () => {
    expect(toggleOpenIndexes(new Set([0]), 1, multi)).toEqual(new Set([0, 1]));
  });

  it("closing an open item removes just that one", () => {
    expect(toggleOpenIndexes(new Set([0, 1]), 0, multi)).toEqual(new Set([1]));
  });

  it("can close down to zero when allowAllClosed is true", () => {
    expect(toggleOpenIndexes(new Set([0]), 0, multi)).toEqual(new Set());
  });

  it("refuses to close the last open item when allowAllClosed is false", () => {
    expect(toggleOpenIndexes(new Set([0]), 0, multiMustKeepOne)).toEqual(new Set([0]));
  });

  it("still allows closing one of several open items when allowAllClosed is false", () => {
    expect(toggleOpenIndexes(new Set([0, 1]), 0, multiMustKeepOne)).toEqual(new Set([1]));
  });
});

describe("getRovingIndex", () => {
  it("ArrowDown moves forward", () => expect(getRovingIndex(0, "ArrowDown", 3)).toBe(1));
  it("ArrowDown wraps from the last to the first", () => expect(getRovingIndex(2, "ArrowDown", 3)).toBe(0));
  it("ArrowUp moves backward", () => expect(getRovingIndex(1, "ArrowUp", 3)).toBe(0));
  it("ArrowUp wraps from the first to the last", () => expect(getRovingIndex(0, "ArrowUp", 3)).toBe(2));
  it("Home jumps to the first", () => expect(getRovingIndex(2, "Home", 3)).toBe(0));
  it("End jumps to the last", () => expect(getRovingIndex(0, "End", 3)).toBe(2));
});
