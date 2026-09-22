export interface EnhancedTabItem {
  trigger: HTMLButtonElement;
  panel: HTMLElement;
  progressEl: HTMLElement | null;
  setSelected(selected: boolean): void;
}

/**
 * Takes a freshly-cloned item's container, finds its Designer-authored
 * trigger/panel (data-tab-trigger / data-tab-panel) and optional progress
 * indicator (data-tab-progress, expected inside the trigger), and wraps them
 * with the real WAI-ARIA Tabs pattern: role="tab"/"tabpanel", aria-selected,
 * roving tabindex (only the selected tab is in the normal Tab order).
 * Returns null if either half is missing.
 */
export function enhanceTabItemDom(
  container: HTMLElement,
  tabId: string,
  panelId: string,
  initialSelected: boolean,
): EnhancedTabItem | null {
  const triggerSource = container.querySelector<HTMLElement>("[data-tab-trigger]");
  const panelSource = container.querySelector<HTMLElement>("[data-tab-panel]");
  if (!triggerSource || !panelSource) return null;

  const progressEl = triggerSource.querySelector<HTMLElement>("[data-tab-progress]");

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "wft-trigger";
  trigger.id = tabId;
  trigger.setAttribute("role", "tab");
  trigger.setAttribute("aria-controls", panelId);
  trigger.setAttribute("aria-selected", String(initialSelected));
  trigger.tabIndex = initialSelected ? 0 : -1;
  triggerSource.replaceWith(trigger);
  trigger.appendChild(triggerSource);

  const panel = document.createElement("div");
  panel.className = "wft-panel";
  panel.id = panelId;
  panel.setAttribute("role", "tabpanel");
  panel.setAttribute("aria-labelledby", tabId);
  panel.tabIndex = 0;
  panel.hidden = !initialSelected;
  panelSource.replaceWith(panel);
  panel.appendChild(panelSource);

  function setSelected(selected: boolean) {
    trigger.setAttribute("aria-selected", String(selected));
    trigger.tabIndex = selected ? 0 : -1;
    panel.hidden = !selected;
  }

  return { trigger, panel, progressEl, setSelected };
}
