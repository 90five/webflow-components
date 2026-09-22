// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { enhanceItemDom } from "./enhanceItemDom";

function buildItemContainer(): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = `
    <div data-accordion-trigger>Question one</div>
    <div data-accordion-panel>Answer one</div>
  `;
  return container;
}

describe("enhanceItemDom", () => {
  it("returns null when the trigger is missing", () => {
    const container = document.createElement("div");
    container.innerHTML = `<div data-accordion-panel>Answer</div>`;
    expect(enhanceItemDom(container, "panel-1", false)).toBeNull();
  });

  it("returns null when the panel is missing", () => {
    const container = document.createElement("div");
    container.innerHTML = `<div data-accordion-trigger>Question</div>`;
    expect(enhanceItemDom(container, "panel-1", false)).toBeNull();
  });

  it("wraps the trigger content in a real button with aria wiring", () => {
    const container = buildItemContainer();
    const result = enhanceItemDom(container, "panel-1", false)!;
    expect(result.trigger.tagName).toBe("BUTTON");
    expect(result.trigger.type).toBe("button");
    expect(result.trigger.getAttribute("aria-controls")).toBe("panel-1");
    expect(result.trigger.textContent).toBe("Question one");
  });

  it("wraps the panel in a labelled region matching the trigger's id", () => {
    const container = buildItemContainer();
    const result = enhanceItemDom(container, "panel-1", false)!;
    expect(result.panelTrack.id).toBe("panel-1");
    expect(result.panelTrack.getAttribute("role")).toBe("region");
    expect(result.panelTrack.getAttribute("aria-labelledby")).toBe(result.trigger.id);
    expect(result.panelTrack.textContent).toBe("Answer one");
  });

  it("starts closed: aria-expanded false, data-open false, inert", () => {
    const container = buildItemContainer();
    const result = enhanceItemDom(container, "panel-1", false)!;
    expect(result.trigger.getAttribute("aria-expanded")).toBe("false");
    expect(result.panelTrack.dataset.open).toBe("false");
    expect(result.panelTrack.inert).toBe(true);
  });

  it("can start open", () => {
    const container = buildItemContainer();
    const result = enhanceItemDom(container, "panel-1", true)!;
    expect(result.trigger.getAttribute("aria-expanded")).toBe("true");
    expect(result.panelTrack.dataset.open).toBe("true");
    expect(result.panelTrack.inert).toBe(false);
  });

  it("setOpen updates aria-expanded, data-open and inert together", () => {
    const container = buildItemContainer();
    const result = enhanceItemDom(container, "panel-1", false)!;
    result.setOpen(true);
    expect(result.trigger.getAttribute("aria-expanded")).toBe("true");
    expect(result.panelTrack.dataset.open).toBe("true");
    expect(result.panelTrack.inert).toBe(false);

    result.setOpen(false);
    expect(result.trigger.getAttribute("aria-expanded")).toBe("false");
    expect(result.panelTrack.dataset.open).toBe("false");
    expect(result.panelTrack.inert).toBe(true);
  });
});
