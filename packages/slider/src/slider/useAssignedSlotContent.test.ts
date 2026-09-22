// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { queryAssignedElements } from "./useAssignedSlotContent";

/**
 * Builds the same shape Webflow renders for a Slot prop: a shadow root
 * containing a named <slot>, with light-DOM children of the host assigned to
 * it via a matching slot="" attribute — real browser distribution, not a mock.
 */
function buildSlotFixture(slotName: string, itemCount: number) {
  const host = document.createElement("div");
  const shadow = host.attachShadow({ mode: "open" });
  const container = document.createElement("div");
  const slot = document.createElement("slot");
  slot.setAttribute("name", slotName);
  container.appendChild(slot);
  shadow.appendChild(container);

  for (let i = 0; i < itemCount; i++) {
    const item = document.createElement("div");
    item.setAttribute("slot", slotName);
    item.className = `item-${i}`;
    host.appendChild(item);
  }

  return container;
}

describe("queryAssignedElements", () => {
  it("returns the light-DOM elements assigned to a named slot", () => {
    const container = buildSlotFixture("dotTemplateSlot", 1);
    const result = queryAssignedElements(container, "dotTemplateSlot");
    expect(result?.map((el) => el.className)).toEqual(["item-0"]);
  });

  it("returns every element assigned to the slot, in order", () => {
    const container = buildSlotFixture("cmsCollectionComponentSlot", 3);
    const result = queryAssignedElements(container, "cmsCollectionComponentSlot");
    expect(result?.map((el) => el.className)).toEqual(["item-0", "item-1", "item-2"]);
  });

  it("returns null when the slot has nothing assigned", () => {
    const container = buildSlotFixture("dotTemplateSlot", 0);
    expect(queryAssignedElements(container, "dotTemplateSlot")).toBeNull();
  });

  it("returns null when no slot with that name exists", () => {
    const container = buildSlotFixture("dotTemplateSlot", 1);
    expect(queryAssignedElements(container, "wrongName")).toBeNull();
  });
});
