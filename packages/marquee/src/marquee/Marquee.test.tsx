// @vitest-environment jsdom
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Marquee from "./Marquee";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

class FakeResizeObserver {
  observe() {}
  disconnect() {}
}

function buildItem(label: string): Element {
  const el = document.createElement("div");
  el.textContent = label;
  return el;
}

function renderMarquee(items: Element[]) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <StrictMode>
        <Marquee items={items} speed={60} direction="left" pauseOnHover gap={24} fadeEdges={false} />
      </StrictMode>,
    );
  });
  return { host, cleanup: () => (act(() => root.unmount()), host.remove()) };
}

describe("Marquee", () => {
  beforeEach(() => vi.stubGlobal("ResizeObserver", FakeResizeObserver));
  afterEach(() => vi.unstubAllGlobals());

  it("renders at least two sets (the minimum for a seamless loop)", () => {
    const { host, cleanup } = renderMarquee(["a", "b"].map(buildItem));
    expect(host.querySelectorAll(".wfm-set").length).toBeGreaterThanOrEqual(2);
    cleanup();
  });

  it("hides every set after the first from assistive tech and keyboard focus", () => {
    const { host, cleanup } = renderMarquee(["a", "b"].map(buildItem));
    const sets = Array.from(host.querySelectorAll<HTMLElement>(".wfm-set"));
    expect(sets[0].getAttribute("aria-hidden")).toBeNull();
    expect(sets[0].hasAttribute("inert")).toBe(false);
    for (const duplicate of sets.slice(1)) {
      expect(duplicate.getAttribute("aria-hidden")).toBe("true");
      expect(duplicate.hasAttribute("inert")).toBe(true);
    }
    cleanup();
  });

  it("does not duplicate a cloned item's content under StrictMode's double-invoke", () => {
    const { host, cleanup } = renderMarquee([buildItem("Acme")]);
    const firstSet = host.querySelector(".wfm-set")!;
    expect(firstSet.textContent).toBe("Acme");
    cleanup();
  });

  it("gives the viewport a region role and label", () => {
    const { host, cleanup } = renderMarquee([buildItem("Acme")]);
    const viewport = host.querySelector(".wfm-viewport")!;
    expect(viewport.getAttribute("role")).toBe("region");
    expect(viewport.getAttribute("aria-label")).toBeTruthy();
    cleanup();
  });

  it("reflects pauseOnHover and fadeEdges as data attributes for CSS to hook into", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => {
      root.render(<Marquee items={[buildItem("Acme")]} speed={60} direction="left" pauseOnHover={false} gap={24} fadeEdges={true} />);
    });
    const viewport = host.querySelector(".wfm-viewport")!;
    expect(viewport.getAttribute("data-pause-on-hover")).toBeNull();
    expect(viewport.getAttribute("data-fade-edges")).toBe("true");
    act(() => root.unmount());
    host.remove();
  });

  it("normalizes an unrecognized direction value to the left/default track direction", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => {
      root.render(<Marquee items={[buildItem("Acme")]} speed={60} direction="sideways" pauseOnHover gap={24} fadeEdges={false} />);
    });
    const track = host.querySelector(".wfm-track")!;
    expect(track.getAttribute("data-direction")).toBe("left");
    act(() => root.unmount());
    host.remove();
  });
});
