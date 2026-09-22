// @vitest-environment jsdom
import { createRoot } from "react-dom/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NumberCount from "./NumberCount";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

type IOCallback = (entries: { isIntersecting: boolean }[]) => void;
let ioCallback: IOCallback | null = null;

class FakeIntersectionObserver {
  constructor(callback: IOCallback) {
    ioCallback = callback;
  }
  observe() {}
  disconnect() {}
}

/**
 * Renders NumberCount inside a real shadow root, with a real light-DOM
 * element assigned to its Slot via a matching slot="" attribute — the same
 * native Shadow DOM distribution Webflow uses for a Slot prop, not a mock.
 */
function renderInShadowSlot(text: string, propsOverrides: Partial<Omit<Parameters<typeof NumberCount>[0], "numberSlot">> = {}) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });
  const mountPoint = document.createElement("div");
  shadow.appendChild(mountPoint);

  const lightChild = document.createElement("h2");
  lightChild.textContent = text;
  lightChild.setAttribute("slot", "numberSlot");
  host.appendChild(lightChild);

  const root = createRoot(mountPoint);
  act(() => {
    root.render(
      <NumberCount
        numberSlot={<slot name="numberSlot" />}
        duration={1000}
        startValue={0}
        decimalSeparator="."
        replay={false}
        {...propsOverrides}
      />,
    );
  });

  return { host, target: lightChild, cleanup: () => (act(() => root.unmount()), host.remove()) };
}

describe("NumberCount", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "performance"] });
    ioCallback = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not animate before it scrolls into view", () => {
    const { target, cleanup } = renderInShadowSlot("500+");
    act(() => vi.advanceTimersByTime(2000));
    expect(target.textContent).toBe("500+");
    cleanup();
  });

  it("applies tabular numerals so the animation doesn't jitter as digit widths change", () => {
    const { target, cleanup } = renderInShadowSlot("500+");
    expect(target.style.fontVariantNumeric).toBe("tabular-nums");
    cleanup();
  });

  it("counts up and lands on the exact original text once scrolled into view", () => {
    const { target, cleanup } = renderInShadowSlot("500+");

    act(() => ioCallback?.([{ isIntersecting: true }]));
    act(() => vi.advanceTimersByTime(200));
    expect(target.textContent).not.toBe("500+");
    expect(target.textContent).toMatch(/^\d+\+$/);

    act(() => vi.advanceTimersByTime(2000));
    expect(target.textContent).toBe("500+");
    cleanup();
  });

  it("does not replay on re-entering the viewport when replay is false", () => {
    const { target, cleanup } = renderInShadowSlot("500+", { replay: false });

    act(() => ioCallback?.([{ isIntersecting: true }]));
    act(() => vi.advanceTimersByTime(2000));
    expect(target.textContent).toBe("500+");

    act(() => ioCallback?.([{ isIntersecting: false }]));
    act(() => ioCallback?.([{ isIntersecting: true }]));
    act(() => vi.advanceTimersByTime(50));
    expect(target.textContent).toBe("500+"); // stayed put, didn't restart from 0
    cleanup();
  });

  it("resets and replays on re-entering the viewport when replay is true", () => {
    const { target, cleanup } = renderInShadowSlot("500+", { replay: true, duration: 1000 });

    act(() => ioCallback?.([{ isIntersecting: true }]));
    act(() => vi.advanceTimersByTime(1000));
    expect(target.textContent).toBe("500+");

    act(() => ioCallback?.([{ isIntersecting: false }]));
    expect(target.textContent).toBe("0+"); // reset to the start value's formatting

    act(() => ioCallback?.([{ isIntersecting: true }]));
    act(() => vi.advanceTimersByTime(1000));
    expect(target.textContent).toBe("500+");
    cleanup();
  });

  it("respects a non-zero start value", () => {
    const { target, cleanup } = renderInShadowSlot("100", { startValue: 50, duration: 1000 });
    act(() => ioCallback?.([{ isIntersecting: true }]));
    act(() => vi.advanceTimersByTime(0));
    // First frame should already be >= 50, never dips below the configured start.
    const firstFrameValue = Number(target.textContent);
    expect(firstFrameValue).toBeGreaterThanOrEqual(50);
    cleanup();
  });
});
