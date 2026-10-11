import { CLS, COOKIE, DL_EVENT, ATTR, GLOBAL } from "./constants";
import { FOCUSABLE, Panel, isFocusable, readCheckboxes, renderServices, syncCheckboxes } from "./components";
import { attr, list, qsa, role, sel } from "./dom";
import { getDataLayer } from "./lib/google";
import { SERVICES } from "./registry";
import { sanitizeHtml } from "./sanitize";
import { cookieNames, eraseCookie, matchName, readRecord, writeRecord, type ConsentRecord } from "./store";
import { CATEGORIES, type Category, type Lang, type LoadContext, type ServiceConfig, type ServiceDef } from "./types";

export interface SiteConfig {
  lang?: Lang | "auto";
  privacyUrl?: string;
  imprintUrl?: string;
  /** Integer. Raise it to ask every visitor again. Default 1. */
  revision?: number;
  /** Days the consent is remembered. Default 180 (about 6 months). Minimum 1. */
  expires?: number;
  /** Optional cookie domain, e.g. ".example.com", to share consent across subdomains. Must be the current host or a parent of it. */
  cookieDomain?: string;
  /** Pick up blocked embeds that are added to the page later (CMS "load more", tabs). Default true. */
  observe?: boolean;
  /** Services used on the site: `{ ga4: { id: "G-XXXX" }, vimeo: true }`. */
  services?: Record<string, boolean | ServiceConfig>;
  /** Overrides for the built-in UI strings of the default embed placeholder. */
  texts?: Partial<Record<Lang, Partial<Record<"load" | "always" | "privacy", string>>>>;
}

export interface Options {
  win?: Window & Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  services?: Record<string, ServiceDef>;
  /** The site config; defaults to `window.FivexConsent` at the time of the call. */
  config?: SiteConfig;
  /** Called when a withdrawal needs a page reload. */
  reload?: () => void;
}

/** Shortest time a decision is remembered (days). A shorter value would expire the cookie right away. */
const MIN_DAYS = 1;
/** Short delay after DOMContentLoaded before the page's Webflow handlers are assumed to be bound. */
const IDLE_MS = 50;
/** After this long past DOMContentLoaded a panel is shown or hidden directly if Webflow never answered. */
const MAX_WAIT_MS = 1500;
const TOGGLE_CATS: Category[] = ["functional", "analytics", "marketing"];
/** dataLayer events named like the usual Webflow cookie tools (GTM trigger convenience). */
const DL_NAMES: Record<Category, string> = {
  necessary: "essential-activated",
  functional: "personalization-activated",
  analytics: "analytics-activated",
  marketing: "marketing-activated",
};

interface Blocked {
  el: HTMLElement;
  kind: "script" | "iframe" | "container";
  service: string | null;
  categories: Category[];
  placeholder?: HTMLElement;
  /** Inline display value of an iframe before it was hidden. */
  display?: string;
  done: boolean;
  /** Released by "Inhalt laden" for this page view only: a later decision does not take it back. */
  viaSession?: boolean;
}

/** A vendor library started by the engine (the service's `load` or `loadEmbed`). */
interface Lib {
  /** Started because of a stored grant (category or service), not a one-off "Inhalt laden". */
  persistent: boolean;
  done: boolean;
  failed: boolean;
  /** Containers waiting for the library to finish before their `refresh` runs. */
  waiting: Blocked[];
}

const BLOCKED_SELECTOR = `script[type="${ATTR}"],${sel("src")},${sel("html")}`;

export function createConsent(opts: Options = {}) {
  const win = opts.win ?? (window as Window & Record<string, any>); // eslint-disable-line @typescript-eslint/no-explicit-any
  const doc = win.document as Document;
  // null-prototype lookups: service ids such as "constructor" or "toString" must never hit Object.prototype
  const registry: Record<string, ServiceDef> = Object.assign(Object.create(null), opts.services ?? SERVICES);
  const raw: SiteConfig = opts.config ?? (win[GLOBAL] as SiteConfig) ?? {};
  const lang: Lang = raw.lang === "en" || raw.lang === "de" ? raw.lang : (doc.documentElement.lang || "").toLowerCase().startsWith("en") ? "en" : "de";

  // ---- config validation ----------------------------------------------------------------
  const revision = ((): number => {
    if (raw.revision === undefined) return 1;
    const n = Number(raw.revision);
    const rev = Number.isFinite(n) ? Math.trunc(n) : 1;
    if (typeof raw.revision !== "number" || !Number.isInteger(raw.revision)) console.warn(`[${GLOBAL}] revision must be an integer (got ${JSON.stringify(raw.revision)}), using ${rev}`);
    return rev;
  })();
  const days = ((): number => {
    if (raw.expires === undefined) return 180;
    const n = Number(raw.expires);
    if (!Number.isFinite(n) || n <= 0) {
      console.warn(`[${GLOBAL}] expires must be a number of days greater than 0 (got ${JSON.stringify(raw.expires)}), using 180`);
      return 180;
    }
    if (n < MIN_DAYS) {
      console.warn(`[${GLOBAL}] expires ${n} is below the minimum of ${MIN_DAYS} day, using ${MIN_DAYS}`);
      return MIN_DAYS;
    }
    return n;
  })();
  const cookieDomain = ((): string | undefined => {
    if (raw.cookieDomain === undefined || raw.cookieDomain === "") return undefined;
    const host = (win.location?.hostname ?? "").toLowerCase();
    const bare = String(raw.cookieDomain).trim().toLowerCase().replace(/^\./, "");
    if (bare.includes(".") && (host === bare || host.endsWith("." + bare))) return bare;
    console.warn(`[${GLOBAL}] cookieDomain "${raw.cookieDomain}" does not match the current host "${host}", using a host-only cookie`);
    return undefined;
  })();

  // ---- which services are configured --------------------------------------------------
  const configured = new Map<string, ServiceConfig>();
  for (const [id, v] of Object.entries(raw.services ?? {})) {
    if (!v) continue;
    if (!registry[id]) {
      console.warn(`[${GLOBAL}] unknown service "${id}"`);
      continue;
    }
    configured.set(id, v === true ? {} : v);
  }

  // ---- blocked scripts / embeds ---------------------------------------------------------
  const blocked: Blocked[] = [];
  const known = new WeakSet<Element>();
  const cats = (el: Element) => list(attr(el, "categories")).map((c) => c as Category).filter((c) => CATEGORIES.includes(c));
  /** Blocked elements below (or equal to) `root` that are not registered yet, in document order. */
  function collect(root: ParentNode | Element): Blocked[] {
    const els = qsa(root, BLOCKED_SELECTOR);
    if ((root as Element).matches?.(BLOCKED_SELECTOR)) els.unshift(root as HTMLElement);
    const out: Blocked[] = [];
    for (const el of els) {
      if (known.has(el)) continue;
      known.add(el);
      const kind: Blocked["kind"] = el.localName === "script" ? "script" : el.hasAttribute(`${ATTR}-src`) ? "iframe" : "container";
      out.push({ el, kind, service: attr(el, "service"), categories: cats(el), done: false });
    }
    return out;
  }
  const used = new Set<Category>();
  /** Category of a configured service: the default, or the site's choice when the service allows one (`cfg.category`). */
  const svcCategory = (id: string): Category => {
    const def = registry[id];
    const want = configured.get(id)?.category;
    return def.categories && def.categories.includes(want as Category) ? (want as Category) : def.category;
  };
  const catOf = (b: Blocked): Category[] => (b.service && registry[b.service] ? [svcCategory(b.service)] : b.categories);
  /** Make services found on the page known, and note the categories in use. Returns newly configured ids. */
  function register(items: Blocked[]): string[] {
    const added: string[] = [];
    for (const b of items) {
      if (b.service && !configured.has(b.service)) {
        if (registry[b.service]) {
          console.info(`[${GLOBAL}] "${b.service}" found on the page but missing in ${GLOBAL}.services - added automatically. Add it to the config.`);
          configured.set(b.service, {});
          added.push(b.service);
        } else {
          console.warn(`[${GLOBAL}] unknown service "${b.service}" - element stays blocked`);
        }
      }
    }
    for (const id of configured.keys()) used.add(svcCategory(id));
    for (const b of items) for (const c of catOf(b)) used.add(c);
    return added;
  }
  const byDocumentOrder = (a: Blocked, b: Blocked) => (a.el === b.el ? 0 : a.el.compareDocumentPosition(b.el) & 4 ? -1 : 1);
  blocked.push(...collect(doc));
  blocked.sort(byDocumentOrder);
  register(blocked);
  /** Services the site explicitly opted in to load before consent (never without that explicit flag). */
  const preConsent = (id: string): boolean => !!registry[id].loadsBeforeConsent?.(configured.get(id) ?? {});
  const alwaysOn = (id: string): boolean => registry[id].category === "necessary" || preConsent(id);

  // ---- state ----------------------------------------------------------------------------
  const loadRecord = (): ConsentRecord | null => {
    const r = readRecord(doc, COOKIE);
    return r && r.rev === revision ? r : null;
  };
  let record: ConsentRecord | null = loadRecord();
  /**
   * Services released for this page view only ("Inhalt laden"). Kept until the page is left: a later decision, in this
   * tab or another one, does not take back what the visitor asked for on this view.
   */
  const sessionAllowed = new Set<string>();
  /** Services whose `load` was started. */
  const activated = new Set<string>();
  /** Vendor libraries started by the engine: `<id>` is `load`, `<id>:embed` is `loadEmbed`. */
  const libs = new Map<string, Lib>();
  /** Activated elements without a service (script blocks, categorised embeds): needed to notice a revoked category. */
  const activatedItems = new Set<Blocked>();
  const listeners: Array<{ target: string; cb: () => void; fired: boolean }> = [];

  const isDecided = (): boolean => !!record && record.decided !== false;
  const hasCategory = (c: Category): boolean => c === "necessary" || record?.cats[c] === true;
  /** Allowed by a stored decision / the site's explicit opt-in. */
  const consented = (id: string): boolean => !!registry[id] && configured.has(id) && (alwaysOn(id) || hasCategory(svcCategory(id)) || record?.svc[id] === true);
  /** Category consent or the site's explicit opt-in: the service may run site-wide scripts (trackers) too. */
  const trackerOk = (id: string): boolean => alwaysOn(id) || hasCategory(svcCategory(id));
  const has = (id: string): boolean => consented(id) || (!!registry[id] && configured.has(id) && sessionAllowed.has(id));
  const itemAllowed = (b: Blocked): boolean => {
    if (b.service) return has(b.service);
    const c = b.categories.length ? b.categories : TOGGLE_CATS; // uncategorized needs full consent
    return c.every(hasCategory);
  };

  // ---- Webflow interactions -----------------------------------------------------------------
  /**
   * Runs `run` once Webflow has bound its interaction handlers: through `Webflow.push` when `window.Webflow` exists,
   * otherwise after DOMContentLoaded plus a short delay (webflow.js may show up in that time, then `Webflow.push` is
   * used). It never waits for the window `load` event. If `run` has not happened MAX_WAIT_MS after DOMContentLoaded
   * (webflow.js missing or broken), `fallback` shows or hides the panel directly, so a banner can never stay hidden.
   */
  function whenInteractionsReady(run: (viaWebflow: boolean) => void, fallback: () => void): void {
    let done = false;
    const once = (f: () => void) => (): void => {
      if (done) return;
      done = true;
      f();
    };
    const viaWebflow = (): boolean => {
      const wf = win.Webflow as { push?: (f: () => void) => void } | undefined;
      if (!wf || typeof wf.push !== "function") return false;
      wf.push(() => setTimeout(once(() => run(true)), 0));
      return true;
    };
    const afterDom = (f: () => void) => {
      if (doc.readyState === "complete") return f();
      let called = false;
      const go = () => {
        if (called) return;
        called = true;
        f();
      };
      doc.addEventListener("DOMContentLoaded", go, { once: true });
      // the script was started after DOMContentLoaded already fired (readyState "interactive"): the event will not come again
      if (doc.readyState === "interactive") setTimeout(go, IDLE_MS * 2);
    };
    if (viaWebflow()) {
      afterDom(() => setTimeout(once(fallback), MAX_WAIT_MS));
      return;
    }
    afterDom(() => {
      setTimeout(() => {
        if (!viaWebflow()) once(() => run(false))();
      }, IDLE_MS);
      setTimeout(once(fallback), MAX_WAIT_MS);
    });
  }

  // ---- panels -----------------------------------------------------------------------------
  const L = {
    de: { banner: "Cookie-Hinweis", prefs: "Cookie-Einstellungen" },
    en: { banner: "Cookie notice", prefs: "Cookie settings" },
  }[lang];
  const panels = {
    banner: new Panel("banner", qsa(doc, sel("", "banner")), doc, false, L.banner, whenInteractionsReady),
    preferences: new Panel("preferences", qsa(doc, sel("", "preferences")), doc, true, L.prefs, whenInteractionsReady),
    manager: new Panel("manager", qsa(doc, sel("", "manager")), doc, false, "", whenInteractionsReady),
  };

  function refreshUi(): void {
    syncCheckboxes(doc, hasCategory, used);
    const anyOpen = panels.preferences.open;
    panels.manager.set(!panels.banner.open && !anyOpen);
  }

  /** Put focus back where the visitor was; if that element is gone or hidden, use a visible trigger, the manager or the page. */
  function restoreFocus(prev: Element | null): void {
    if (!prev || prev === doc.body) return;
    const insidePrefs = (el: Element) => panels.preferences.els.some((p) => p.contains(el));
    const triggers = qsa(doc, sel("", "open-preferences")).filter((t) => !insidePrefs(t));
    const manager = panels.manager.els.flatMap((m) => qsa(m, FOCUSABLE));
    const page = qsa(doc.body, FOCUSABLE).filter((el) => !insidePrefs(el));
    const target = [prev, ...triggers, ...manager, ...page].find((el) => isFocusable(el) && !insidePrefs(el));
    if (target) (target as HTMLElement).focus();
    else (doc.activeElement as HTMLElement | null)?.blur?.();
  }

  function open(): void {
    syncCheckboxes(doc, hasCategory, used);
    panels.banner.set(false);
    panels.preferences.set(true);
    panels.manager.set(false);
  }
  function closePrefs(): void {
    const prev = panels.preferences.takeFocusTarget() ?? doc.activeElement;
    panels.preferences.set(false);
    if (!isDecided()) panels.banner.set(true);
    refreshUi();
    restoreFocus(prev);
  }

  // ---- services / elements ---------------------------------------------------------------
  const ctx = (id: string): LoadContext => ({
    cfg: configured.get(id) ?? {},
    lang,
    win,
    doc,
    loadScript: (src, attrs = {}) =>
      new Promise((resolve, reject) => {
        const s = doc.createElement("script");
        s.src = src;
        s.async = true;
        for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`failed to load ${src}`));
        doc.head.appendChild(s);
      }),
    inlineScript: (code) => {
      const s = doc.createElement("script");
      s.text = code;
      doc.head.appendChild(s);
    },
    has,
    hasCategory,
    configOf: (sid) => (configured.has(sid) ? configured.get(sid)! : null),
  });

  /** Iframes of a service must match its host list; iframes without a service (categories) may point to any http(s) host. */
  function hostAllowed(service: string | null, def: ServiceDef | undefined, url: URL): boolean {
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (!service) return true;
    if (!def?.embed) return false; // unknown or typo service id, or a service without embeds: no host bypass
    return def.embed.hosts.some((h) => {
      const [host, ...path] = h.split("/");
      return (url.hostname === host || url.hostname.endsWith("." + host)) && (!path.length || url.pathname.startsWith("/" + path.join("/")));
    });
  }

  // Blocked scripts run in document order: an external script finishes (load or error) before the next one starts.
  const scriptQueue: Array<() => Promise<void> | void> = [];
  let scriptWaiting = false;
  function pumpScripts(): void {
    while (!scriptWaiting && scriptQueue.length) {
      const wait = scriptQueue.shift()!();
      if (wait) {
        scriptWaiting = true;
        const next = () => {
          scriptWaiting = false;
          pumpScripts();
        };
        wait.then(next, next);
      }
    }
  }
  function runScript(old: HTMLScriptElement): Promise<void> | void {
    const s = doc.createElement("script");
    for (const a of Array.from(old.attributes)) {
      if (a.name === "type" || a.name.startsWith(ATTR)) continue;
      s.setAttribute(a.name, a.value);
    }
    s.text = old.text;
    if (old.src) {
      s.async = false;
      const done = new Promise<void>((resolve) => {
        s.addEventListener("load", () => resolve());
        s.addEventListener("error", () => resolve());
      });
      old.replaceWith(s);
      return done;
    }
    old.replaceWith(s);
  }

  function phItems(ph: HTMLElement): Blocked[] {
    return placeholders.get(ph) ?? [];
  }

  function activate(b: Blocked): void {
    if (b.done) return;
    const def = b.service ? registry[b.service] : undefined;
    if (b.service && !def) {
      console.warn(`[${GLOBAL}] unknown service "${b.service}" - element stays blocked`);
      return; // not done: it keeps its placeholder, and stays blocked
    }
    b.done = true;
    if (!b.service) activatedItems.add(b);
    if (b.kind === "script") {
      const old = b.el as HTMLScriptElement;
      scriptQueue.push(() => runScript(old));
      pumpScripts();
    } else if (b.kind === "iframe") {
      const src = attr(b.el, "src") ?? "";
      let url: URL | null = null;
      try {
        url = new URL(src, doc.baseURI);
      } catch {
        /* invalid */
      }
      if (!url || !hostAllowed(b.service, def, url)) {
        console.warn(`[${GLOBAL}] blocked iframe src "${src}" (not an allowed host for "${b.service ?? "uncategorized"}")`);
        return;
      }
      b.el.setAttribute("src", url.href);
      b.el.removeAttribute("hidden");
      b.el.style.removeProperty("display");
      if (b.display) b.el.style.display = b.display;
    } else {
      const markup = def?.embed?.markup;
      b.el.replaceChildren(sanitizeHtml(attr(b.el, "html") ?? "", doc, { elements: markup?.elements, attributes: markup?.attributes, hosts: def?.embed?.hosts }));
      if (b.service) startContainer(b);
    }
    const ph = b.placeholder;
    if (ph && phItems(ph).every((x) => x.done)) {
      if (ph.hasAttribute("data-fivex-generated")) ph.remove();
      else ph.style.display = "none";
    }
  }

  /** Start a vendor library (`load` or `loadEmbed`) once per page view; `persistent` records whether a stored grant started it. */
  function runLib(id: string, kind: "load" | "embed"): Lib | null {
    const def = registry[id];
    const fn = kind === "load" ? def.load : def.loadEmbed;
    if (!fn) return null;
    const key = kind === "load" ? id : id + ":embed";
    const known = libs.get(key);
    if (known) return known;
    const lib: Lib = { persistent: consented(id), done: false, failed: false, waiting: [] };
    libs.set(key, lib);
    if (kind === "load") activated.add(id);
    const finish = (ok: boolean) => {
      lib.done = true;
      lib.failed = !ok;
      const todo = lib.waiting.splice(0);
      if (ok) for (const b of todo) refreshContainer(b);
    };
    let r: void | Promise<void>;
    try {
      r = fn(ctx(id));
    } catch (e) {
      console.warn(`[${GLOBAL}] ${id}:`, e);
      finish(false);
      return lib;
    }
    Promise.resolve(r).then(
      () => finish(true),
      (e) => {
        console.warn(`[${GLOBAL}] ${id}:`, e);
        finish(false);
      },
    );
    return lib;
  }

  /** Run the service's site-wide `load` once per page view (never for a tracker without its category consent). */
  function startLoader(id: string): void {
    if (registry[id].tracker && !trackerOk(id)) return;
    if (!registry[id].load) {
      // iframe-only service (no script): remember that a stored grant released it, so revoking the grant reloads the page
      if (!libs.has(id)) libs.set(id, { persistent: consented(id), done: true, failed: false, waiting: [] });
      activated.add(id);
      return;
    }
    runLib(id, "load");
  }

  /** The library a container needs: `loadEmbed`, or `load` when that is only the embed library. Never a tracker. */
  function embedLib(id: string): Lib | null {
    const def = registry[id];
    if (def.loadEmbed) return runLib(id, "embed");
    if (!def.tracker && def.load) return runLib(id, "load");
    return null;
  }

  /** A container's markup is in place: make sure its library runs, then re-scan it (the vendor script only scans once at load). */
  function startContainer(b: Blocked): void {
    const lib = embedLib(b.service!);
    if (!lib) {
      refreshContainer(b);
    } else if (lib.done) {
      if (!lib.failed) refreshContainer(b);
    } else lib.waiting.push(b);
  }
  function refreshContainer(b: Blocked): void {
    const id = b.service!;
    const refresh = registry[id].refresh;
    if (!refresh || !b.el.isConnected) return;
    try {
      const r = refresh(ctx(id), b.el);
      if (r && typeof (r as Promise<void>).catch === "function") (r as Promise<void>).catch((e) => console.warn(`[${GLOBAL}] ${id} refresh:`, e));
    } catch (e) {
      console.warn(`[${GLOBAL}] ${id} refresh:`, e);
    }
  }

  function fireListeners(): void {
    for (const l of listeners) {
      if (l.fired) continue;
      const ok = (CATEGORIES as readonly string[]).includes(l.target) ? hasCategory(l.target as Category) : has(l.target);
      if (ok) {
        l.fired = true;
        try {
          l.cb();
        } catch (e) {
          console.warn(`[${GLOBAL}]`, e);
        }
      }
    }
  }

  /**
   * Bring the page in line with the current consent. Order matters for Google Tag Manager:
   * elements and vendor loaders (Consent Mode update, container) come first, the category
   * dataLayer events last, so tags that fire on them already see the granted signals.
   */
  function apply(emit = true): void {
    const ops: Array<[string, "start" | "update"]> = [];
    const items = new Set<Blocked>();
    for (const id of configured.keys()) {
      if (!has(id)) continue;
      if (consented(id)) for (const b of blocked) if (b.service === id && !b.done) items.add(b);
      if (activated.has(id)) ops.push([id, "update"]);
      else if (consented(id) && (!registry[id].tracker || trackerOk(id))) ops.push([id, "start"]);
    }
    for (const b of blocked) if (!b.service && !b.done && itemAllowed(b)) items.add(b);
    for (const b of blocked) if (items.has(b)) activate(b);
    for (const [id, op] of ops) {
      if (op === "start") startLoader(id);
      else {
        try {
          registry[id].update?.(ctx(id));
        } catch (e) {
          console.warn(`[${GLOBAL}] ${id} update:`, e);
        }
      }
    }
    if (emit && record && isDecided()) {
      const dl = getDataLayer(win);
      for (const c of CATEGORIES) if (hasCategory(c) && c !== "necessary") dl.push({ event: DL_NAMES[c] });
      dl.push({ event: DL_EVENT, consent: { ...record.cats, necessary: true } });
    }
    fireListeners();
  }

  /**
   * Did a stored grant that actually started a script or released an element get revoked? Only then the page must
   * reload. What the visitor released for this view only ("Inhalt laden") stays until the page is left.
   */
  function revokedSomething(): boolean {
    for (const [key, lib] of libs) {
      const id = key.split(":")[0];
      if (lib.persistent && !consented(id) && !sessionAllowed.has(id)) return true;
    }
    for (const b of activatedItems) if (!b.viaSession && !itemAllowed(b)) return true;
    return false;
  }

  function clearCookiesOf(ids: string[]): void {
    const names = cookieNames(doc);
    for (const id of ids) {
      for (const c of registry[id].cookies) {
        if (c.type && c.type !== "cookie") continue;
        for (const n of names) if (matchName(c.name, n)) eraseCookie(doc, n, win.location.hostname);
      }
    }
  }
  /** Erase the cookies of every configured service that is not allowed, whether or not it ran on this page. */
  function eraseDenied(): void {
    clearCookiesOf([...configured.keys()].filter((id) => !alwaysOn(id) && !has(id)));
  }

  // ---- other tabs / history navigation ---------------------------------------------------------
  // An open BroadcastChannel keeps a page out of the back/forward cache, so it is closed on pagehide and reopened on pageshow.
  const hasChannel = typeof win.BroadcastChannel === "function";
  let channel: BroadcastChannel | null = null;
  function openChannel(): void {
    if (!hasChannel || channel) return;
    const c: BroadcastChannel = new win.BroadcastChannel(COOKIE);
    c.onmessage = () => syncFromCookie();
    channel = c;
  }
  function closeChannel(): void {
    channel?.close();
    channel = null;
  }
  function broadcast(): void {
    try {
      channel?.postMessage({ ts: record?.ts ?? 0 });
    } catch {
      /* channel closed */
    }
  }
  /** Re-read the cookie (changed in another tab, or a page restored from the back/forward cache). */
  function syncFromCookie(): void {
    const next = loadRecord();
    if (JSON.stringify(next) === JSON.stringify(record)) return;
    record = next;
    eraseDenied();
    if (revokedSomething()) {
      (opts.reload ?? (() => win.location.reload()))();
      return;
    }
    apply();
    panels.banner.set(!isDecided());
    refreshUi();
  }
  const onPageHide = () => closeChannel();
  const onPageShow = (e: Event) => {
    openChannel();
    if ((e as PageTransitionEvent).persisted) syncFromCookie();
  };
  const onVisible = () => {
    if (doc.visibilityState === "visible") syncFromCookie();
  };
  openChannel();

  function store(next: Partial<Record<Category, boolean>>, svc?: Record<string, boolean>): void {
    const catsOut: Partial<Record<Category, boolean>> = { necessary: true };
    for (const c of TOGGLE_CATS) catsOut[c] = next[c] === true;
    record = { v: 1, rev: revision, ts: Date.now(), cats: catsOut, svc: svc ?? {}, decided: true };
    writeRecord(doc, COOKIE, record, days, cookieDomain);
    broadcast();
    eraseDenied();
    if (revokedSomething()) {
      (opts.reload ?? (() => win.location.reload()))();
      return;
    }
    apply();
  }

  const allowAll = () => finish({ functional: true, analytics: true, marketing: true });
  const denyAll = () => finish({});
  function finish(c: Partial<Record<Category, boolean>>, svc?: Record<string, boolean>): void {
    const prev = panels.preferences.takeFocusTarget() ?? doc.activeElement;
    store(c, svc);
    panels.preferences.set(false);
    panels.banner.set(false);
    refreshUi();
    restoreFocus(prev);
  }

  function allowServices(ids: string[]): void {
    // Only the service grant is stored. Without a prior category choice the record stays
    // `decided: false`, so the banner keeps asking for a real decision.
    const base: ConsentRecord = record ?? { v: 1, rev: revision, ts: Date.now(), cats: { necessary: true }, svc: {}, decided: false };
    const svc: Record<string, boolean> = { ...base.svc };
    for (const id of ids) svc[id] = true;
    record = { ...base, ts: Date.now(), svc };
    writeRecord(doc, COOKIE, record, days, cookieDomain);
    broadcast();
    apply();
    refreshUi();
  }

  // ---- default / custom placeholders ---------------------------------------------------
  const T = {
    de: { load: "Inhalt laden", always: "Immer erlauben", privacy: "Datenschutzerklärung", generic: "Dieser Inhalt wird erst nach Ihrer Einwilligung geladen.", unavailable: "Dieser Inhalt ist nicht verfügbar." },
    en: { load: "Load content", always: "Always allow", privacy: "Privacy policy", generic: "This content loads only after your consent.", unavailable: "This content is not available." },
  };
  const t = (k: "load" | "always" | "privacy") => raw.texts?.[lang]?.[k] ?? T[lang][k];
  /** placeholder element -> the embeds it governs (a designed placeholder may serve several) */
  const placeholders = new Map<HTMLElement, Blocked[]>();

  function setupPlaceholders(items: Blocked[]): void {
    for (const b of items) {
      if (b.kind === "script") continue;
      const def = b.service ? registry[b.service] : undefined;
      let ph: HTMLElement | null = null;
      const selector = attr(b.el, "placeholder");
      if (selector) {
        try {
          ph = doc.querySelector<HTMLElement>(selector);
        } catch {
          /* bad selector */
        }
      } else {
        ph = b.el.parentElement?.querySelector<HTMLElement>(`${sel("placeholder")}:not([${ATTR}-src]):not([${ATTR}-html])`) ?? null;
      }
      if (!ph && !def?.embed && b.kind === "container") continue;
      if (!ph) {
        ph = doc.createElement("div");
        ph.className = CLS;
        ph.setAttribute("role", "group");
        ph.setAttribute("data-fivex-generated", "");
        ph.setAttribute("aria-label", def ? def.label[lang] : "");
        const text = doc.createElement("p");
        text.className = `${CLS}__text`;
        const unknown = !!b.service && !def; // typo in the service id: nothing to load, no buttons
        text.textContent = unknown ? T[lang].unavailable : def?.embed?.placeholder[lang] ?? T[lang].generic;
        ph.appendChild(text);
        const actions = doc.createElement("div");
        actions.className = `${CLS}__actions`;
        const mk = (kind: string, label: string) => {
          const btn = doc.createElement("button");
          btn.type = "button";
          btn.className = `${CLS}__btn ${CLS}__btn--${kind}`;
          btn.setAttribute(ATTR, kind === "load" ? "load-embed" : "allow-embed");
          btn.textContent = label;
          return btn;
        };
        if (!unknown) {
          actions.appendChild(mk("load", t("load")));
          if (def) actions.appendChild(mk("always", t("always")));
          ph.appendChild(actions);
        }
        const link = doc.createElement("a");
        link.className = `${CLS}__link`;
        link.href = raw.privacyUrl || def?.privacyUrl || "#";
        link.textContent = t("privacy");
        if (!raw.privacyUrl) {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        }
        ph.appendChild(link);
        b.el.parentElement?.insertBefore(ph, b.el);
      } else if (def) {
        for (const f of qsa(ph, sel("field"))) {
          const n = attr(f, "field");
          if (n === "vendor") f.textContent = def.vendor;
          else if (n === "text") f.textContent = def.embed?.placeholder[lang] ?? "";
          else if (n === "privacy-link") (f as HTMLAnchorElement).setAttribute("href", raw.privacyUrl || def.privacyUrl);
        }
      }
      b.placeholder = ph;
      const list = placeholders.get(ph) ?? [];
      list.push(b);
      placeholders.set(ph, list);
      if (b.kind === "iframe") {
        // inline display:none wins over author CSS such as `iframe { display: block }`, which the hidden attribute does not
        b.display = b.el.style.display;
        b.el.style.setProperty("display", "none", "important");
      }
    }
  }

  // ---- events -----------------------------------------------------------------------------
  function placeholderOf(from: Element): HTMLElement | null {
    for (let n: Element | null = from; n; n = n.parentElement) if (placeholders.has(n as HTMLElement)) return n as HTMLElement;
    return null;
  }

  function onClick(e: Event): void {
    const target = (e.target as Element | null)?.closest<HTMLElement>(sel("")) ?? null;
    if (!target) return;
    const r = role(target);
    switch (r) {
      case "allow":
        e.preventDefault();
        allowAll();
        break;
      case "deny":
        e.preventDefault();
        denyAll();
        break;
      case "submit": {
        e.preventDefault();
        submitFrom(target);
        break;
      }
      case "open-preferences":
        e.preventDefault();
        open();
        break;
      case "close":
        e.preventDefault();
        if (target.closest(sel("", "preferences"))) closePrefs();
        else {
          panels.banner.set(false);
          refreshUi();
        }
        break;
      case "load-embed":
      case "allow-embed": {
        e.preventDefault();
        const ph = placeholderOf(target);
        // an unknown service id (typo) is never released
        const governed = ph ? phItems(ph).filter((b) => !b.done && (!b.service || registry[b.service])) : [];
        if (!governed.length) break;
        if (r === "allow-embed") {
          // "always": remember the service(s) and load every embed of them
          const ids = [...new Set(governed.map((b) => b.service).filter((x): x is string => !!x))];
          if (ids.length) allowServices(ids);
          for (const b of governed) {
            if (b.service) continue;
            b.viaSession = true;
            activate(b);
          }
        } else {
          // "load": exactly the embeds of this placeholder, for this page view only. Only the embed library runs
          // (activate starts it), never a site-wide tracker of the service.
          for (const b of governed) {
            if (b.service) sessionAllowed.add(b.service);
            else b.viaSession = true;
            activate(b);
          }
          fireListeners();
        }
        break;
      }
    }
  }

  function submitFrom(from: Element): void {
    const root = from.closest("form") ?? from.closest(sel("", "preferences")) ?? from.closest(sel("", "banner")) ?? doc;
    finish(readCheckboxes(root));
  }

  function onSubmit(e: Event): void {
    const form = e.target as HTMLFormElement;
    if (!form.closest?.(`${sel("", "preferences")},${sel("", "banner")}`)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    submitFrom(form);
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === "Escape" && panels.preferences.open) {
      closePrefs();
      return;
    }
    panels.preferences.trapTab(e);
  }

  // ---- boot -------------------------------------------------------------------------------
  function initService(id: string): void {
    try {
      registry[id].init?.(ctx(id)); // no network requests allowed here (Consent Mode defaults etc.)
    } catch (e) {
      console.warn(`[${GLOBAL}] ${id} init:`, e);
    }
  }
  eraseDenied(); // no valid decision (never decided, revision bump, expired) or a denied service: leftovers go first
  for (const id of configured.keys()) initService(id);
  setupPlaceholders(blocked);
  renderServices(doc, lang, [...configured.keys()].map((id) => ({ ...registry[id], category: svcCategory(id) })));
  for (const a of qsa<HTMLAnchorElement>(doc, sel("link"))) {
    const k = attr(a, "link");
    const url = k === "privacy" ? raw.privacyUrl : k === "imprint" ? raw.imprintUrl : undefined;
    if (url) a.setAttribute("href", url);
  }
  doc.addEventListener("click", onClick);
  doc.addEventListener("submit", onSubmit, true);
  doc.addEventListener("keydown", onKey);
  win.addEventListener("pagehide", onPageHide);
  win.addEventListener("pageshow", onPageShow);
  if (!hasChannel) doc.addEventListener("visibilitychange", onVisible);

  apply();
  syncCheckboxes(doc, hasCategory, used);
  panels.banner.set(!isDecided());
  refreshUi();

  /** Forget elements that left the document (CMS "load more" replacing items, tabs), so the lists do not grow forever. */
  function prune(): void {
    const gone = (b: Blocked) => !b.el.isConnected && !(b.kind === "script" && b.done && !b.service); // a script that ran stays: its category can still be revoked
    for (let i = blocked.length - 1; i >= 0; i--) {
      const b = blocked[i];
      if (b.el.isConnected) continue;
      blocked.splice(i, 1);
      if (!b.done) known.delete(b.el); // inserted again later: it is picked up again
    }
    for (const b of activatedItems) if (gone(b)) activatedItems.delete(b);
    for (const [ph, items] of placeholders) {
      const left = items.filter((b) => b.el.isConnected);
      if (left.length) {
        placeholders.set(ph, left);
        continue;
      }
      placeholders.delete(ph);
      if (ph.hasAttribute("data-fivex-generated")) ph.remove();
    }
  }

  // Embeds added later (CMS "load more", tabs, lazy sections).
  let observer: MutationObserver | null = null;
  if (raw.observe !== false && typeof win.MutationObserver === "function") {
    const obs: MutationObserver = new win.MutationObserver((mutations: MutationRecord[]) => {
      prune();
      const found: Blocked[] = [];
      for (const m of mutations) for (const n of Array.from(m.addedNodes)) if (n.nodeType === 1) found.push(...collect(n as Element));
      if (!found.length) return;
      blocked.push(...found);
      blocked.sort(byDocumentOrder);
      for (const id of register(found)) initService(id);
      setupPlaceholders(found);
      apply(false);
      refreshUi();
    });
    observer = obs;
    obs.observe(doc.documentElement, { childList: true, subtree: true });
  }

  const api = {
    open,
    close: () => {
      if (panels.preferences.open) closePrefs();
      else {
        panels.banner.set(false);
        refreshUi();
      }
    },
    allow: allowAll,
    deny: denyAll,
    /** Opt in to a single service (e.g. after your own click). */
    accept: (id: string) => {
      if (registry[id] && configured.has(id)) allowServices([id]);
    },
    has,
    hasCategory,
    hasConsent: isDecided,
    getConsent: () => (record ? { ...record, cats: { ...record.cats }, svc: { ...record.svc } } : null),
    /** Run `cb` as soon as a service id (e.g. "vimeo") or category (e.g. "analytics") is consented; immediately if already so. */
    onConsent: (target: string, cb: () => void) => {
      listeners.push({ target, cb, fired: false });
      fireListeners();
    },
    destroy: () => {
      doc.removeEventListener("click", onClick);
      doc.removeEventListener("submit", onSubmit, true);
      doc.removeEventListener("keydown", onKey);
      doc.removeEventListener("visibilitychange", onVisible);
      win.removeEventListener("pagehide", onPageHide);
      win.removeEventListener("pageshow", onPageShow);
      observer?.disconnect();
      closeChannel();
    },
    /** Sizes of the internal bookkeeping (for tests). */
    _debug: () => ({ blocked: blocked.length, placeholders: placeholders.size, activatedItems: activatedItems.size }),
    /** Ids of the services in use (configured, plus those found on the page). */
    get services(): string[] {
      return [...configured.keys()];
    },
    /** Categories that have at least one service or element on the page. */
    get categories(): Category[] {
      return [...used];
    },
  };
  return api;
}

export type ConsentApi = ReturnType<typeof createConsent>;
