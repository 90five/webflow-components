import { ATTR } from "./constants";

/** `[<prefix>-<name>]` or `[<prefix>-<name>="value"]`; with an empty name: `[<prefix>="value"]`. */
export function sel(name: string, value?: string): string {
  return `[${ATTR}${name ? "-" + name : ""}${value === undefined ? "" : `="${value}"`}]`;
}

export function attr(el: Element, name: string): string | null {
  return el.getAttribute(`${ATTR}-${name}`);
}

/** Value of the main attribute, e.g. fivex-consent="banner". */
export function role(el: Element): string | null {
  return el.getAttribute(ATTR);
}

export function list(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function qsa<T extends Element = HTMLElement>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}
