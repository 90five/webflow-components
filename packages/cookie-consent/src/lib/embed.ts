/** Helpers for the `refresh` hooks of container services. */

/** Elements below `root` (and `root` itself) matching `selector`. */
export function scan<T extends HTMLElement = HTMLElement>(root: HTMLElement, selector: string): T[] {
  const out = Array.from(root.querySelectorAll<T>(selector));
  if (root.matches(selector)) out.unshift(root as T);
  return out;
}

/** Marks an element as handled; returns false if it already was (so a refresh can be repeated safely). */
export function claim(el: Element, flag = "data-fivex-rendered"): boolean {
  if (el.hasAttribute(flag)) return false;
  el.setAttribute(flag, "");
  return true;
}

/** Resolves with `get()` as soon as it returns something (polls every 50 ms); undefined after `ms`. For APIs a vendor script defines a moment after its load event. */
export function until<T>(get: () => T | undefined, ms = 5000): Promise<T | undefined> {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const poll = () => {
      const v = get();
      if (v !== undefined) resolve(v);
      else if (Date.now() - t0 >= ms) resolve(undefined);
      else setTimeout(poll, 50);
    };
    poll();
  });
}
