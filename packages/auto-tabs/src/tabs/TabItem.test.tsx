// @vitest-environment jsdom
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { describe, expect, it } from "vitest";
import TabItem from "./TabItem";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function buildSource(): Element {
  const el = document.createElement("div");
  el.innerHTML = `
    <div data-tab-trigger>Title</div>
    <div data-tab-panel>Body</div>
  `;
  return el;
}

describe("TabItem", () => {
  it("clones its source exactly once, even under StrictMode's deliberate double-invoke", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    act(() => {
      root.render(
        <StrictMode>
          <TabItem
            source={buildSource()}
            index={0}
            count={1}
            isSelected={false}
            isPaused={false}
            autoplay={false}
            autoplaySpeed={5000}
            idPrefix="test"
            onSelect={() => {}}
            registerTrigger={() => {}}
            focusIndex={() => {}}
          />
        </StrictMode>,
      );
    });

    expect(host.querySelectorAll("[data-tab-trigger]").length).toBe(1);
    expect(host.querySelectorAll("button.wft-trigger").length).toBe(1);
    expect(host.querySelector("[data-tab-trigger]")?.textContent?.trim()).toBe("Title");
    expect(host.querySelector("[data-tab-panel]")?.textContent?.trim()).toBe("Body");

    act(() => root.unmount());
    host.remove();
  });
});
