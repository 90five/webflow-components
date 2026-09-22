// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { enhanceTabItemDom } from "./enhanceTabItemDom";

function buildItemContainer(withProgress = false): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = `
    <div data-tab-trigger>
      <span>Tab one</span>
      ${withProgress ? '<span data-tab-progress></span>' : ""}
    </div>
    <div data-tab-panel>Panel one</div>
  `;
  return container;
}

describe("enhanceTabItemDom", () => {
  it("returns null when the trigger is missing", () => {
    const container = document.createElement("div");
    container.innerHTML = `<div data-tab-panel>Panel</div>`;
    expect(enhanceTabItemDom(container, "tab-1", "panel-1", false)).toBeNull();
  });

  it("returns null when the panel is missing", () => {
    const container = document.createElement("div");
    container.innerHTML = `<div data-tab-trigger>Tab</div>`;
    expect(enhanceTabItemDom(container, "tab-1", "panel-1", false)).toBeNull();
  });

  it("wraps the trigger in a real button with role=tab and aria wiring", () => {
    const container = buildItemContainer();
    const result = enhanceTabItemDom(container, "tab-1", "panel-1", false)!;
    expect(result.trigger.tagName).toBe("BUTTON");
    expect(result.trigger.getAttribute("role")).toBe("tab");
    expect(result.trigger.getAttribute("aria-controls")).toBe("panel-1");
    expect(result.trigger.id).toBe("tab-1");
  });

  it("wraps the panel with role=tabpanel labelled by the trigger", () => {
    const container = buildItemContainer();
    const result = enhanceTabItemDom(container, "tab-1", "panel-1", false)!;
    expect(result.panel.getAttribute("role")).toBe("tabpanel");
    expect(result.panel.getAttribute("aria-labelledby")).toBe("tab-1");
    expect(result.panel.id).toBe("panel-1");
  });

  it("starts with roving tabindex and hidden state matching initialSelected=false", () => {
    const container = buildItemContainer();
    const result = enhanceTabItemDom(container, "tab-1", "panel-1", false)!;
    expect(result.trigger.getAttribute("aria-selected")).toBe("false");
    expect(result.trigger.tabIndex).toBe(-1);
    expect(result.panel.hidden).toBe(true);
  });

  it("can start selected", () => {
    const container = buildItemContainer();
    const result = enhanceTabItemDom(container, "tab-1", "panel-1", true)!;
    expect(result.trigger.getAttribute("aria-selected")).toBe("true");
    expect(result.trigger.tabIndex).toBe(0);
    expect(result.panel.hidden).toBe(false);
  });

  it("setSelected updates aria-selected, tabindex and hidden together", () => {
    const container = buildItemContainer();
    const result = enhanceTabItemDom(container, "tab-1", "panel-1", false)!;
    result.setSelected(true);
    expect(result.trigger.getAttribute("aria-selected")).toBe("true");
    expect(result.trigger.tabIndex).toBe(0);
    expect(result.panel.hidden).toBe(false);

    result.setSelected(false);
    expect(result.trigger.getAttribute("aria-selected")).toBe("false");
    expect(result.trigger.tabIndex).toBe(-1);
    expect(result.panel.hidden).toBe(true);
  });

  it("finds an optional progress element inside the trigger", () => {
    const withProgress = enhanceTabItemDom(buildItemContainer(true), "tab-1", "panel-1", false)!;
    expect(withProgress.progressEl).not.toBeNull();

    const withoutProgress = enhanceTabItemDom(buildItemContainer(false), "tab-2", "panel-2", false)!;
    expect(withoutProgress.progressEl).toBeNull();
  });
});
