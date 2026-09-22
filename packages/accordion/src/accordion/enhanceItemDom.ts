export interface EnhancedItem {
  trigger: HTMLButtonElement;
  panelTrack: HTMLElement;
  setOpen(open: boolean): void;
}

/**
 * Takes a freshly-cloned item's container, finds its Designer-authored
 * trigger/panel (marked with data-accordion-trigger / data-accordion-panel),
 * and wraps them with real button semantics and the panel's animation
 * structure. Returns null if either half is missing — the item is skipped
 * rather than rendered broken.
 *
 * The panel animation is CSS's grid-template-rows 0fr -> 1fr trick (the only
 * way to animate to an unknown content height without measuring it), driven
 * entirely by the [data-open] attribute set in setOpen — the transition
 * itself lives in styles.ts, including the prefers-reduced-motion override,
 * so this function never has to know about motion preferences.
 */
export function enhanceItemDom(container: HTMLElement, panelId: string, initialOpen: boolean): EnhancedItem | null {
  const triggerSource = container.querySelector<HTMLElement>("[data-accordion-trigger]");
  const panelSource = container.querySelector<HTMLElement>("[data-accordion-panel]");
  if (!triggerSource || !panelSource) return null;

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "wfa-trigger";
  trigger.id = `${panelId}-trigger`;
  trigger.setAttribute("aria-controls", panelId);
  trigger.setAttribute("aria-expanded", String(initialOpen));
  triggerSource.replaceWith(trigger);
  trigger.appendChild(triggerSource);

  const panelInner = document.createElement("div");
  panelInner.className = "wfa-panel-inner";
  panelSource.replaceWith(panelInner);
  panelInner.appendChild(panelSource);

  const panelTrack = document.createElement("div");
  panelTrack.className = "wfa-panel-track";
  panelTrack.id = panelId;
  panelTrack.setAttribute("role", "region");
  panelTrack.setAttribute("aria-labelledby", trigger.id);
  panelTrack.dataset.open = String(initialOpen);
  panelTrack.inert = !initialOpen;
  panelInner.replaceWith(panelTrack);
  panelTrack.appendChild(panelInner);

  function setOpen(open: boolean) {
    trigger.setAttribute("aria-expanded", String(open));
    panelTrack.dataset.open = String(open);
    panelTrack.inert = !open;
  }

  return { trigger, panelTrack, setOpen };
}
