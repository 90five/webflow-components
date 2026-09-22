// @vitest-environment jsdom
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { describe, expect, it } from "vitest";
import AccordionItem from "./AccordionItem";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function buildSource(): Element {
  const el = document.createElement("div");
  el.innerHTML = `
    <div data-accordion-trigger>Question</div>
    <div data-accordion-panel>Answer</div>
  `;
  return el;
}

describe("AccordionItem", () => {
  it("clones its source exactly once, even under StrictMode's deliberate double-invoke", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    act(() => {
      root.render(
        <StrictMode>
          <AccordionItem
            source={buildSource()}
            index={0}
            count={1}
            isOpen={false}
            panelIdPrefix="test"
            onToggle={() => {}}
            registerTrigger={() => {}}
            focusIndex={() => {}}
          />
        </StrictMode>,
      );
    });

    expect(host.querySelectorAll("[data-accordion-trigger]").length).toBe(1);
    expect(host.querySelectorAll("button.wfa-trigger").length).toBe(1);
    expect(host.querySelector("[data-accordion-trigger]")?.textContent?.trim()).toBe("Question");
    expect(host.querySelector("[data-accordion-panel]")?.textContent?.trim()).toBe("Answer");

    act(() => root.unmount());
    host.remove();
  });
});
