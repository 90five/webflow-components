import { ATTR } from "./constants";
import { attr, qsa, sel } from "./dom";
import type { Category, Lang, ServiceDef } from "./types";

export const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';

/** Hidden for the user and for assistive technology: display/visibility, [hidden], [inert] or aria-hidden on the element or an ancestor. */
export function isHidden(el: Element): boolean {
  const view = el.ownerDocument.defaultView;
  for (let n: Element | null = el; n; n = n.parentElement) {
    if (n.hasAttribute("hidden") || n.hasAttribute("inert") || n.getAttribute("aria-hidden") === "true") return true;
    const cs = view?.getComputedStyle(n);
    if (cs && (cs.display === "none" || cs.visibility === "hidden")) return true;
  }
  return false;
}

/** Can this element take focus right now? */
export function isFocusable(el: Element | null): el is HTMLElement {
  return !!el && el.isConnected && typeof (el as HTMLElement).focus === "function" && !(el as HTMLButtonElement).disabled && !isHidden(el);
}

function shown(el: HTMLElement): boolean {
  const cs = el.ownerDocument.defaultView?.getComputedStyle(el);
  return !!cs && cs.display !== "none" && cs.visibility !== "hidden";
}

let uid = 0;
/** Accessible name: explicit aria-label(ledby) > fivex-consent-label > first heading inside > fallback text. */
function nameFrom(el: HTMLElement, fallback: string): void {
  if (el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby")) return;
  const custom = attr(el, "label")?.trim();
  if (custom) {
    el.setAttribute("aria-label", custom);
    return;
  }
  const heading = el.querySelector<HTMLElement>("h1,h2,h3,h4,h5,h6,[role=heading]");
  if (heading?.textContent?.trim()) {
    if (!heading.id) heading.id = `${ATTR}-title-${++uid}`;
    el.setAttribute("aria-labelledby", heading.id);
    return;
  }
  el.setAttribute("aria-label", fallback);
}

/**
 * How long a Webflow interaction gets to react to the click before it is judged. Interactions should set `display`
 * immediately (opacity / transform animations afterwards are fine); a display switch later than this is not supported.
 */
const IX_SETTLE_MS = 1500;
/** Extra clicks allowed when the first click caused no visible change at all (handler not bound yet; only without Webflow.push). */
const IX_RETRIES = 1;

/** One designed component (banner / preferences / manager). May match several elements. */
export class Panel {
  open = false;
  private lastFocus: Element | null = null;
  constructor(
    readonly kind: "banner" | "preferences" | "manager",
    readonly els: HTMLElement[],
    private doc: Document,
    private modal: boolean,
    label: string,
    /** Runs `run` once Webflow interactions are bound, or `fallback` when they never answer (see engine). */
    private whenReady: (run: (viaWebflow: boolean) => void, fallback: () => void) => void,
  ) {
    for (const el of els) {
      if (modal) {
        if (!el.hasAttribute("role")) el.setAttribute("role", "dialog");
        if (!el.hasAttribute("aria-modal")) el.setAttribute("aria-modal", "true");
        if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
        nameFrom(el, label);
      } else if (kind === "banner") {
        if (!el.hasAttribute("role")) el.setAttribute("role", "region");
        nameFrom(el, label);
      }
    }
    this.apply(false, true);
  }

  get exists(): boolean {
    return this.els.length > 0;
  }

  set(open: boolean): void {
    if (open === this.open) return;
    this.open = open;
    this.apply(open, false);
  }

  /** The element that had focus when the dialog opened (cleared). The engine restores focus once the other panels have updated. */
  takeFocusTarget(): Element | null {
    const t = this.lastFocus;
    this.lastFocus = null;
    return t;
  }

  /**
   * Webflow Interactions animate the panel: the trigger click toggles it. The click is sent only once
   * Webflow has bound its handlers, and only when the real (computed) visibility differs from the wanted
   * state, so a missed or doubled click can never leave the panel inverted.
   *
   * After a click the panel is observed (style / class changes of the panel and its children). A reaction means
   * the interaction is running, so there is no second click; without any reaction after IX_SETTLE_MS the handler
   * was probably not bound yet and the click is repeated (IX_RETRIES times). If the panel still is not in the
   * wanted state in the end, it is set directly, so it never stays inverted.
   */
  private drive(el: HTMLElement, trigger: HTMLElement): void {
    const settle = (retries: number) => {
      const want = this.open;
      if (shown(el) === want) return;
      let reacted = false;
      const mo = typeof MutationObserver === "function" ? new MutationObserver(() => (reacted = true)) : null;
      mo?.observe(el, { attributes: true, attributeFilter: ["style", "class"], subtree: true });
      trigger.click();
      setTimeout(() => {
        mo?.disconnect();
        if (this.open !== want || shown(el) === want) return; // wanted state changed meanwhile (a newer drive takes over) or reached
        if (!reacted && retries > 0) settle(retries - 1);
        else this.direct(el);
      }, IX_SETTLE_MS);
    };
    this.whenReady(
      (viaWebflow) => {
        settle(viaWebflow ? 0 : IX_RETRIES); // through Webflow.push the handlers are bound: a missing reaction is not a timing problem
        if (this.modal && this.open) setTimeout(() => this.open && this.focusInto(), 80);
      },
      () => {
        this.direct(el);
        if (this.modal && this.open) this.focusInto();
      },
    );
  }

  /** Show or hide the panel with `display`, bypassing its Webflow interaction. */
  private direct(el: HTMLElement): void {
    if (!this.open) {
      el.style.display = "none";
      return;
    }
    el.style.display = "";
    if (this.doc.defaultView?.getComputedStyle(el).display === "none") el.style.display = attr(el, "display") || "block";
  }

  private focusInto(): void {
    const el = this.els.find((e) => shown(e)) ?? this.els[0];
    if (!el) return;
    const first = qsa(el, FOCUSABLE).find((i) => !isHidden(i));
    (first ?? el).focus();
  }

  private apply(open: boolean, initial: boolean): void {
    for (const el of this.els) {
      const trigger = el.querySelector<HTMLElement>(sel("", "interaction"));
      if (trigger) {
        if (!initial) this.drive(el, trigger);
      } else if (open) {
        el.style.display = "";
        if (this.doc.defaultView?.getComputedStyle(el).display === "none") el.style.display = attr(el, "display") || "block";
      } else {
        el.style.display = "none";
      }
      el.setAttribute("aria-hidden", String(!open));
      if (!open) el.setAttribute("inert", "");
      else el.removeAttribute("inert");
    }
    if (initial) return;
    if (this.els.some((el) => attr(el, "scroll") === "lock")) {
      const body = this.doc.body;
      if (open) {
        body.dataset.consentScrollPrev = body.style.overflow;
        body.style.overflow = "hidden";
      } else {
        body.style.overflow = body.dataset.consentScrollPrev ?? "";
        delete body.dataset.consentScrollPrev;
      }
    }
    if (this.modal && open) {
      this.lastFocus = this.doc.activeElement;
      if (!this.els.some((el) => el.querySelector(sel("", "interaction")))) this.focusInto();
    }
  }

  /** Keep Tab inside the open modal. Returns true when handled. */
  trapTab(e: KeyboardEvent): boolean {
    if (!this.open || !this.modal || e.key !== "Tab") return false;
    const el = this.els.find((x) => shown(x) && !isHidden(x));
    if (!el) return false;
    const items = qsa(el, FOCUSABLE).filter((i) => !isHidden(i));
    if (!items.length) {
      e.preventDefault();
      el.focus();
      return true;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = this.doc.activeElement;
    if (e.shiftKey && (active === first || active === el || !el.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !el.contains(active))) {
      e.preventDefault();
      first.focus();
    }
    return true;
  }
}

/** Reflect consent state in the designed checkboxes; hide rows of unused categories. */
export function syncCheckboxes(doc: Document, granted: (c: Category) => boolean, used: Set<Category>): void {
  for (const input of qsa<HTMLInputElement>(doc, sel("checkbox"))) {
    const cat = attr(input, "checkbox")?.trim().toLowerCase() as Category | undefined;
    if (!cat) continue;
    const necessary = cat === "necessary";
    const row = input.closest<HTMLElement>(sel("category")) ?? input.closest<HTMLElement>("label");
    if (row) row.style.display = necessary || used.has(cat) ? "" : "none";
    input.checked = necessary || granted(cat);
    if (necessary) {
      input.disabled = true;
      input.setAttribute("aria-disabled", "true");
    }
    // Webflow's styled checkbox mirrors the state with a class on the visual sibling
    const visual = input.parentElement?.querySelector(".w-checkbox-input");
    visual?.classList.toggle("w--redirected-checked", input.checked);
  }
}

export function readCheckboxes(root: ParentNode): Partial<Record<Category, boolean>> {
  const out: Partial<Record<Category, boolean>> = {};
  for (const input of qsa<HTMLInputElement>(root, sel("checkbox"))) {
    const cat = attr(input, "checkbox")?.trim().toLowerCase() as Category | undefined;
    if (cat && cat !== "necessary") out[cat] = input.checked;
  }
  return out;
}

/**
 * Optional service-list renderer. <div fivex-consent-services="analytics"> holds one
 * [fivex-consent-template], cloned per configured service of that category.
 */
export function renderServices(doc: Document, lang: Lang, active: ServiceDef[]): void {
  for (const host of qsa(doc, sel("services"))) {
    const cat = attr(host, "services")?.trim().toLowerCase();
    const template = host.querySelector<HTMLElement>(sel("template"));
    if (!cat || !template) continue;
    const parent = template.parentElement!;
    const tplClone = template.cloneNode(true) as HTMLElement;
    template.remove();
    const defs = active.filter((s) => s.category === cat);
    host.style.display = defs.length ? "" : "none";
    for (const def of defs) {
      const node = tplClone.cloneNode(true) as HTMLElement;
      node.removeAttribute(`${ATTR}-template`);
      node.style.display = "";
      const cookieTpl = node.querySelector<HTMLElement>(sel("cookie-template"));
      const cookieParent = cookieTpl?.parentElement;
      const cookieClone = cookieTpl?.cloneNode(true) as HTMLElement | undefined;
      cookieTpl?.remove();
      for (const f of qsa(node, sel("field"))) {
        const name = attr(f, "field");
        if (name === "label") f.textContent = def.label[lang];
        else if (name === "vendor") f.textContent = def.vendor;
        else if (name === "description") f.textContent = def.description[lang] + (def.visitorNote ? " " + def.visitorNote[lang] : "");
        else if (name === "privacy-link" || name === "vendor-link") {
          const a = f as HTMLAnchorElement;
          a.setAttribute("href", name === "privacy-link" ? def.privacyUrl : def.vendorUrl);
          a.setAttribute("target", "_blank");
          a.setAttribute("rel", "noopener noreferrer");
          if (!a.textContent?.trim()) a.textContent = name === "privacy-link" ? (lang === "de" ? "Datenschutzerklärung" : "Privacy policy") : def.vendor;
        } else if (name === "cookies") {
          if (!def.cookies.length) f.style.display = "none";
          else if (!cookieClone) f.textContent = def.cookies.map((c) => c.name).join(", ");
        }
      }
      if (cookieClone && cookieParent) {
        for (const c of def.cookies) {
          const row = cookieClone.cloneNode(true) as HTMLElement;
          row.removeAttribute(`${ATTR}-cookie-template`);
          row.style.display = "";
          for (const f of qsa(row, sel("field"))) {
            const name = attr(f, "field");
            if (name === "name") f.textContent = c.name;
            else if (name === "duration") f.textContent = c.duration[lang];
            else if (name === "purpose") f.textContent = c.description[lang];
          }
          cookieParent.appendChild(row);
        }
      }
      parent.appendChild(node);
    }
  }
}
