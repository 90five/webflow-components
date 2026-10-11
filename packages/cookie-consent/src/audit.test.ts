// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://www.example.com/" }
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GLOBAL } from "./constants";
import { createConsent, type ConsentApi } from "./engine";
import { SERVICES } from "./registry";
import { readRecord, writeRecord } from "./store";
import type { LoadContext, ServiceDef } from "./types";

type W = Record<string, unknown> & Window;
const w = window as unknown as W;
const loads: string[] = [];
function fake(id: string, category: ServiceDef["category"], extra: Partial<ServiceDef> = {}): ServiceDef {
  return {
    id, vendor: id, vendorUrl: "https://x.test", privacyUrl: "https://x.test/privacy", category,
    label: { de: id, en: id }, description: { de: "d", en: "d" },
    cookies: [{ name: `${id}_c*`, duration: { de: "1 Tag", en: "1 day" }, description: { de: "z", en: "p" }, evidence: ["observed"] }],
    sources: ["https://x.test"], verification: { date: "2026-01-01", loader: "l", observed: "o" }, load: () => void loads.push(id), ...extra,
  };
}
const REG: Record<string, ServiceDef> = {
  stat: fake("stat", "analytics"),
  ads: fake("ads", "marketing"),
  vid: fake("vid", "functional", { embed: { hosts: ["player.vid.test"], placeholder: { de: "Video von vid.", en: "Video by vid." } } }),
  cal: fake("cal", "functional", { load: (c) => void loads.push("cal:" + c.doc.querySelectorAll("[data-x]").length) }),
};

let api: ConsentApi | undefined;
const reload = vi.fn();
function boot(cfg: Record<string, unknown> = { services: { stat: true, ads: true } }, registry: Record<string, ServiceDef> = REG): ConsentApi {
  w.FivexConsent = cfg;
  api = createConsent({ win: window as never, services: registry, reload });
  return api;
}
const PAGE = `
  <div fivex-consent="banner" style="display:block"><button id="b-allow" fivex-consent="allow">Alle</button><button fivex-consent="deny">Keine</button><button id="b-open" fivex-consent="open-preferences">Einst.</button></div>
  <div fivex-consent="preferences"><h2 id="prefs-h">Cookie-Einstellungen</h2><form>
    <div fivex-consent-category="analytics"><label><input type="checkbox" fivex-consent-checkbox="analytics"></label></div>
    <div fivex-consent-category="marketing"><label><input type="checkbox" fivex-consent-checkbox="marketing"></label></div>
    <div fivex-consent-category="functional"><label><input type="checkbox" fivex-consent-checkbox="functional"></label></div>
    <input type="checkbox" fivex-consent-checkbox="necessary">
    <button id="save" type="submit">Speichern</button><button type="button" fivex-consent="close">X</button></form></div>
  <div fivex-consent="manager"><button id="m-open" fivex-consent="open-preferences">Cookies</button></div>`;
const shown = (sel: string) => document.querySelector<HTMLElement>(sel)!.style.display !== "none";
const click = (sel: string) => document.querySelector<HTMLElement>(sel)!.click();
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const submit = () => document.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
const tickBox = (name: string, on: boolean) => (document.querySelector<HTMLInputElement>(`[fivex-consent-checkbox="${name}"]`)!.checked = on);
const clearCookies = () => {
  for (const c of document.cookie.split("; ")) {
    const n = c.split("=")[0];
    for (const d of ["", "; Domain=example.com", "; Domain=www.example.com"]) document.cookie = `${n}=; Max-Age=0; Path=/${d}`;
  }
};
const record = (over: Record<string, unknown> = {}) => ({ v: 1, rev: 1, ts: 1, cats: { necessary: true, analytics: true, functional: false, marketing: false }, svc: {}, decided: true, ...over });
const setCookie = (rec: unknown, extra = "") => (document.cookie = `fivex_consent=${encodeURIComponent(JSON.stringify(rec))}; Path=/${extra}`);

beforeEach(() => {
  document.body.innerHTML = PAGE;
  document.head.innerHTML = "";
  document.documentElement.lang = "de";
  loads.length = 0;
  sessionStorage.clear();
  reload.mockClear();
  delete w.dataLayer;
  delete w.gtag;
  delete w.Webflow;
  delete w[`__${GLOBAL}ModeDefault`];
  clearCookies();
});
afterEach(() => {
  api?.destroy();
  api = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------------------------
describe("H1 fivex-consent-html is sanitised with an allow-list", () => {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  it("renders harmless markup and drops all five reviewer payloads", () => {
    const payload = [
      `<div class="ok" data-x="1"><p>Hallo</p></div>`,
      `<a class="x1" href="&#1;javascript:window.__x1=1">x1</a>`,
      `<a class="x2" href="java&#9;script:window.__x2=1">x2</a>`,
      `<form id="f3" action="javascript:window.__x3=1"><button id="x3">x3</button></form>`,
      `<form><button id="x4" formaction="javascript:window.__x4=1">x4</button></form>`,
      `<svg width="50" height="50"><a id="x5"><animate attributeName="href" values="javascript:window.__x5=1" begin="0s" fill="freeze"/><rect width="50" height="50"/></a></svg>`,
    ].join("");
    document.body.insertAdjacentHTML("beforeend", `<div id="c" fivex-consent-service="cal" fivex-consent-html="${esc(payload)}"></div>`);
    boot({ services: { cal: true } });
    api!.accept("cal");
    const c = document.querySelector("#c")!;
    expect(c.querySelector(".ok p")!.textContent).toBe("Hallo");
    expect(c.querySelector("form,svg,animate,rect,[formaction],[action]")).toBeNull();
    expect(c.querySelector(".x1")!.hasAttribute("href")).toBe(false);
    expect(c.querySelector(".x2")!.hasAttribute("href")).toBe(false);
    expect(c.innerHTML).not.toMatch(/javascript:/i);
    expect(loads).toEqual(["cal:1"]);
  });
});

// ---------------------------------------------------------------------------------------------
describe("H2 Webflow interaction panels", () => {
  const IX = `<div id="ixb" fivex-consent="banner" style="display:none"><div fivex-consent="interaction" id="t"></div><button fivex-consent="allow">ok</button></div>`;
  let clicks = 0;
  /** webflow.js stand-in: the trigger toggles the banner after `delay` ms (0 = immediately). */
  const toggler = (delay = 0, before?: (b: HTMLElement) => void) => {
    const b = document.getElementById("ixb")!;
    let open = b.style.display !== "none";
    document.getElementById("t")!.addEventListener("click", () => {
      clicks++;
      open = !open;
      const o = open;
      before?.(b);
      const apply = () => (b.style.display = o ? "block" : "none");
      if (delay) setTimeout(apply, delay);
      else apply();
    });
    return b;
  };
  const interactive = () => Object.defineProperty(document, "readyState", { configurable: true, get: () => "interactive" });
  beforeEach(() => {
    clicks = 0;
    document.body.innerHTML = IX;
  });
  afterEach(() => {
    delete (document as unknown as Record<string, unknown>).readyState;
  });

  it("does not click before Webflow is ready, and opens the banner once it is", async () => {
    const queue: Array<() => void> = [];
    w.Webflow = Object.assign([], { push: (fn: () => void) => void queue.push(fn) }) as never;
    boot({ services: { stat: true } });
    const b = document.getElementById("ixb")!;
    await tick(10);
    expect(b.style.display).toBe("none"); // not ready: nothing was clicked into the void
    expect(queue.length).toBeGreaterThan(0);
    toggler(); // webflow.js binds its handlers ...
    queue.forEach((fn) => fn()); // ... and then runs the queued functions
    await tick(10);
    expect(b.style.display).toBe("block");
    expect(b.getAttribute("aria-hidden")).toBe("false");
  });

  describe("N5: no wait for the window load event", () => {
    it("without a Webflow object: opens shortly after DOMContentLoaded although the window never fires load", async () => {
      vi.useFakeTimers();
      interactive(); // images / fonts still loading: readyState is not "complete"
      boot({ services: { stat: true } });
      const b = toggler();
      await vi.advanceTimersByTimeAsync(400);
      expect(b.style.display).toBe("block");
      expect(clicks).toBe(1);
    });

    it("waits for DOMContentLoaded while the document is still loading, then opens", async () => {
      vi.useFakeTimers();
      Object.defineProperty(document, "readyState", { configurable: true, get: () => "loading" });
      boot({ services: { stat: true } });
      const b = toggler();
      await vi.advanceTimersByTimeAsync(300);
      expect(b.style.display).toBe("none");
      document.dispatchEvent(new Event("DOMContentLoaded"));
      await vi.advanceTimersByTimeAsync(200);
      expect(b.style.display).toBe("block");
    });

    it("uses Webflow.push when webflow.js shows up during the short delay after DOMContentLoaded", async () => {
      vi.useFakeTimers();
      interactive();
      boot({ services: { stat: true } });
      const b = toggler();
      const push = vi.fn((fn: () => void) => fn());
      await vi.advanceTimersByTimeAsync(20);
      w.Webflow = { push } as never;
      await vi.advanceTimersByTimeAsync(400);
      expect(push).toHaveBeenCalled();
      expect(b.style.display).toBe("block");
    });

    it("a missing webflow.js can never hide the banner: after the maximum wait it is shown via display", async () => {
      vi.useFakeTimers();
      boot({ services: { stat: true } }); // trigger exists, nothing ever binds it
      const b = document.getElementById("ixb")!;
      await vi.advanceTimersByTimeAsync(1000);
      expect(b.style.display).toBe("none");
      await vi.advanceTimersByTimeAsync(2500);
      expect(b.style.display).not.toBe("none");
      expect(b.getAttribute("aria-hidden")).toBe("false");
    });

    it("same with a Webflow queue that is never flushed (webflow.js failed to load)", async () => {
      vi.useFakeTimers();
      w.Webflow = [] as never;
      boot({ services: { stat: true } });
      const b = document.getElementById("ixb")!;
      await vi.advanceTimersByTimeAsync(1000);
      expect(b.style.display).toBe("none");
      await vi.advanceTimersByTimeAsync(700);
      expect(b.style.display).not.toBe("none"); // 1500 ms after DOMContentLoaded
    });

    it("the fallback also closes the panel after a decision", async () => {
      vi.useFakeTimers();
      boot({ services: { stat: true } });
      await vi.advanceTimersByTimeAsync(2000);
      click('[fivex-consent="allow"]');
      await vi.advanceTimersByTimeAsync(2000);
      expect(document.getElementById("ixb")!.style.display).toBe("none");
    });
  });

  it("tracks the real visibility: an already visible panel is not toggled shut, closing hides it, reopening shows it", async () => {
    vi.useFakeTimers();
    document.body.innerHTML = IX.replace('style="display:none"', 'style="display:block"');
    boot({ services: { stat: true } });
    const b = toggler();
    await vi.advanceTimersByTimeAsync(200);
    expect(b.style.display).toBe("block"); // wanted open, was open: no click (a blind click would have closed it)
    expect(clicks).toBe(0);
    click('[fivex-consent="allow"]');
    await vi.advanceTimersByTimeAsync(200);
    expect(b.style.display).toBe("none");
    api!.open(); // preferences panel opens, banner stays closed: no click on the banner trigger
    await vi.advanceTimersByTimeAsync(200);
    expect(b.style.display).toBe("none");
    expect(clicks).toBe(1);
  });

  describe("N6: interaction retry", () => {
    it.each([600, 1000])("an interaction that switches display after %i ms is clicked once and ends open (never inverted)", async (delay) => {
      vi.useFakeTimers();
      boot({ services: { stat: true } });
      const b = toggler(delay);
      await vi.advanceTimersByTimeAsync(6000);
      expect(clicks).toBe(1);
      expect(b.style.display).toBe("block");
    });

    it("an opacity animation first and display late is a reaction: no second click, and the end state is open", async () => {
      vi.useFakeTimers();
      boot({ services: { stat: true } });
      const b = toggler(1700, (el) => (el.style.opacity = "0.3"));
      await vi.advanceTimersByTimeAsync(7000);
      expect(clicks).toBe(1);
      expect(b.style.display).toBe("block");
    });

    it("a reaction without the wanted result does not end inverted: the panel is set directly, no extra click", async () => {
      vi.useFakeTimers();
      boot({ services: { stat: true } });
      const b = toggler(1000000, (el) => (el.style.opacity = "0.3")); // display never switches
      await vi.advanceTimersByTimeAsync(7000);
      expect(clicks).toBe(1);
      expect(b.style.display).not.toBe("none");
    });

    it("a handler that was not bound at the first click gets exactly one more click", async () => {
      vi.useFakeTimers();
      boot({ services: { stat: true } });
      await vi.advanceTimersByTimeAsync(300); // first click goes nowhere
      const b = toggler();
      await vi.advanceTimersByTimeAsync(5000);
      expect(clicks).toBe(1);
      expect(b.style.display).toBe("block");
    });

    it("a handler that never binds ends in the wanted state, not inverted, and the click count is bounded", async () => {
      vi.useFakeTimers();
      boot({ services: { stat: true } });
      const b = document.getElementById("ixb")!;
      let seen = 0;
      document.getElementById("t")!.addEventListener("click", () => seen++);
      await vi.advanceTimersByTimeAsync(10000);
      expect(seen).toBeLessThanOrEqual(2);
      expect(b.style.display).not.toBe("none");
      click('[fivex-consent="allow"]');
      await vi.advanceTimersByTimeAsync(10000);
      expect(seen).toBeLessThanOrEqual(4);
      expect(b.style.display).toBe("none");
    });
  });
});

// ---------------------------------------------------------------------------------------------
describe("H3 Google Tag Manager dataLayer order", () => {
  it("consent default -> consent update -> gtm.js -> category events -> fivex_consent_update", () => {
    setCookie(record());
    boot({ services: { gtm: { id: "GTM-TEST123" } } }, SERVICES);
    const order = (w.dataLayer as unknown[]).map((e) => {
      const x = e as { event?: string; length?: number };
      if (x.event) return `event:${x.event}`;
      const a = Array.from(e as ArrayLike<unknown>);
      return `${a[0]}:${a[1]}`;
    });
    expect(order).toEqual(["consent:default", "consent:update", "event:gtm.js", "event:analytics-activated", "event:fivex_consent_update"]);
  });

  it("a later decision pushes the signals before the category events", () => {
    boot({ services: { gtm: { id: "GTM-TEST123" } } }, SERVICES);
    click('[fivex-consent="allow"]');
    const order = (w.dataLayer as unknown[]).map((e) => ((e as { event?: string }).event ? `event:${(e as { event: string }).event}` : `${Array.from(e as ArrayLike<unknown>).slice(0, 2).join(":")}`));
    expect(order.indexOf("consent:update")).toBeLessThan(order.indexOf("event:analytics-activated"));
    expect(order.indexOf("event:gtm.js")).toBeLessThan(order.indexOf("event:analytics-activated"));
    expect(order.at(-1)).toBe("event:fivex_consent_update");
  });
});

// ---------------------------------------------------------------------------------------------
describe("M1 duplicate consent cookies (host-only and Domain=)", () => {
  it("reads the record with the newest ts", () => {
    setCookie(record({ ts: 5, cats: { necessary: true, analytics: false } }));
    setCookie(record({ ts: 9, cats: { necessary: true, analytics: true } }), "; Domain=example.com");
    expect(document.cookie.split("; ").filter((c) => c.startsWith("fivex_consent=")).length).toBe(2);
    expect(readRecord(document, "fivex_consent")!.ts).toBe(9);
    setCookie(record({ ts: 20, cats: { necessary: true, analytics: false } }));
    expect(readRecord(document, "fivex_consent")!.cats.analytics).toBeUndefined();
  });

  it("writing with a cookie domain erases the host-only copy, so a withdrawal cannot be shadowed", () => {
    setCookie(record({ ts: 1, cats: { necessary: true, analytics: true, functional: true, marketing: true } }));
    boot({ cookieDomain: ".example.com", services: { stat: true } });
    expect(api!.hasCategory("analytics")).toBe(true);
    api!.deny();
    expect(document.cookie.split("; ").filter((c) => c.startsWith("fivex_consent=")).length).toBe(1);
    api!.destroy();
    document.body.innerHTML = PAGE;
    boot({ cookieDomain: ".example.com", services: { stat: true } });
    expect(api!.hasCategory("analytics")).toBe(false);
    expect(api!.hasConsent()).toBe(true);
  });

  it("writing host-only erases a leftover Domain= copy", () => {
    setCookie(record({ ts: 1 }), "; Domain=example.com");
    writeRecord(document, "fivex_consent", { v: 1, rev: 1, ts: 2, cats: { necessary: true }, svc: {}, decided: true }, 1);
    const copies = document.cookie.split("; ").filter((c) => c.startsWith("fivex_consent="));
    expect(copies.length).toBe(1);
    expect(readRecord(document, "fivex_consent")!.ts).toBe(2);
  });
});

// ---------------------------------------------------------------------------------------------
describe("M2 'load content' loads one embed, 'always allow' loads all embeds of the service", () => {
  const TWO = `<div><iframe id="a" fivex-consent-service="vid" fivex-consent-src="https://player.vid.test/a"></iframe></div><div><iframe id="b" fivex-consent-service="vid" fivex-consent-src="https://player.vid.test/b"></iframe></div>`;
  const src = (id: string) => document.getElementById(id)!.getAttribute("src");

  it("'load content' on the first embed leaves the second one blocked", () => {
    document.body.insertAdjacentHTML("beforeend", TWO);
    boot({ services: { vid: true } });
    click(".fivex-consent-placeholder__btn--load"); // first placeholder button
    expect(src("a")).toBe("https://player.vid.test/a");
    expect(src("b")).toBeNull();
    expect(document.querySelectorAll(".fivex-consent-placeholder").length).toBe(1);
    expect(api!.hasConsent()).toBe(false);
  });

  it("a later 'always allow' on the second embed loads every embed of the service", () => {
    document.body.insertAdjacentHTML("beforeend", TWO);
    boot({ services: { vid: true } });
    document.querySelectorAll<HTMLElement>(".fivex-consent-placeholder__btn--load")[0].click();
    expect(src("b")).toBeNull();
    document.querySelectorAll<HTMLElement>(".fivex-consent-placeholder__btn--always")[0].click();
    expect(src("a")).toBe("https://player.vid.test/a");
    expect(src("b")).toBe("https://player.vid.test/b");
    expect(api!.getConsent()!.svc).toEqual({ vid: true });
  });

  it("a category decision after a one-off load also releases the other embed", () => {
    document.body.insertAdjacentHTML("beforeend", TWO);
    boot({ services: { vid: true } });
    document.querySelectorAll<HTMLElement>(".fivex-consent-placeholder__btn--load")[0].click();
    click('[fivex-consent="allow"]');
    expect(src("b")).toBe("https://player.vid.test/b");
  });

  it("a container embed of the same service stays blocked after loading an iframe", () => {
    document.body.insertAdjacentHTML("beforeend", `<iframe id="a" fivex-consent-service="vid" fivex-consent-src="https://player.vid.test/a"></iframe><div id="c" fivex-consent-service="vid" fivex-consent-html="&lt;p&gt;x&lt;/p&gt;"></div>`);
    boot({ services: { vid: true } });
    document.querySelector<HTMLElement>(".fivex-consent-placeholder__btn--load")!.click();
    expect(src("a")).not.toBeNull();
    expect(document.querySelector("#c p")).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------
describe("M3 focus restore", () => {
  it("after saving preferences opened from the banner, focus lands on a visible element (the manager), not the hidden banner button", () => {
    boot({ services: { stat: true } });
    const opener = document.getElementById("b-open")!;
    opener.focus();
    opener.click();
    expect(document.querySelector('[fivex-consent="preferences"]')!.contains(document.activeElement)).toBe(true);
    click("#save");
    const active = document.activeElement as HTMLElement;
    expect(active).not.toBe(opener);
    expect(document.querySelector('[fivex-consent="banner"]')!.contains(active)).toBe(false);
    expect(document.querySelector('[fivex-consent="manager"]')!.contains(active)).toBe(true);
  });

  it("closing with Escape from the manager returns focus to the manager button", () => {
    setCookie(record());
    boot({ services: { stat: true } });
    const m = document.getElementById("m-open")!;
    m.focus();
    m.click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.activeElement).toBe(m);
  });

  it("with no manager and no banner trigger, falls back to the first visible focusable element of the page", () => {
    document.body.innerHTML = PAGE.replace(/<div fivex-consent="manager">.*?<\/div>/s, "") + `<a id="skip" href="#x">x</a>`;
    boot({ services: { stat: true } });
    const opener = document.getElementById("b-open")!;
    opener.focus();
    opener.click();
    click("#save");
    expect((document.activeElement as HTMLElement).id).toBe("skip");
  });
});

// ---------------------------------------------------------------------------------------------
describe("M4 developer notes are never rendered", () => {
  it("renders visitorNote but not devNote into the service list", () => {
    const reg = { stat: fake("stat", "analytics", { devNote: { de: "DEV-NOTIZ", en: "DEV-NOTE" }, visitorNote: { de: "Hinweis für Besucher.", en: "Visitor hint." } }) };
    document.body.insertAdjacentHTML("beforeend", `<div fivex-consent-services="analytics"><div fivex-consent-template><p fivex-consent-field="description"></p></div></div>`);
    boot({ services: { stat: true } }, reg);
    const text = document.querySelector('[fivex-consent-services="analytics"]')!.textContent!;
    expect(text).toContain("Hinweis für Besucher.");
    expect(text).not.toContain("DEV-NOTIZ");
  });

  it("no built-in service renders developer wording", () => {
    const dev = /Consent Mode|In unseren Tests|in our tests|Im Test\b|cfg\.|beforeConsent|dataLayer|Sandbox|Bibliothek lädt/i;
    for (const d of Object.values(SERVICES)) {
      const texts = [d.description, d.visitorNote, d.embed?.placeholder, ...d.cookies.map((c) => c.description)].filter(Boolean) as Array<{ de: string; en: string }>;
      for (const t of texts) {
        expect(t.de, `${d.id} de`).not.toMatch(dev);
        expect(t.en, `${d.id} en`).not.toMatch(dev);
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe("M5 evidence-based data", () => {
  const names = (id: string) => SERVICES[id].cookies.map((c) => c.name);
  it("TikTok discloses ttclid (first-party cookie) so it is listed and erased", () => {
    const e = SERVICES["tiktok-pixel"].cookies.find((c) => c.name === "ttclid")!;
    expect(e.type ?? "cookie").toBe("cookie");
    expect(e.duration.en).toBe("13 months");
    setCookie(record({ cats: { necessary: true } }));
    document.cookie = "ttclid=abc; Path=/";
    boot({ services: { "tiktok-pixel": { id: "C1A2B3C4D5E6F7G8H9" } } }, SERVICES);
    expect(document.cookie).not.toContain("ttclid");
  });
  it("Clarity discloses SRM_B", () => {
    expect(names("clarity")).toContain("SRM_B");
  });
  it("Vimeo lists no SESSION_STORAGE_ID_PICOX_* (no Vimeo-origin evidence)", () => {
    expect(names("vimeo").some((n) => n.startsWith("SESSION_STORAGE_ID_PICOX"))).toBe(false);
  });
  it("entries without vendor-origin attribution are not claimed", () => {
    expect(names("hotjar")).not.toContain("hjLIStatus"); // written by GTM/gtag on a live site
    for (const n of ["m", "rc::a", "rc::c"]) expect(names("calendly")).not.toContain(n); // Stripe / reCAPTCHA, not Calendly
  });
});

// ---------------------------------------------------------------------------------------------
describe("L1 blocked scripts run in document order", () => {
  it("an inline blocked script waits for the previous external blocked script", async () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<script type="fivex-consent" fivex-consent-categories="analytics" src="https://cdn.test/lib.js"></script>
       <script type="fivex-consent" fivex-consent-categories="analytics">window.__inline=1</script>
       <script type="fivex-consent" fivex-consent-categories="analytics">window.__inline2=1</script>`,
    );
    boot({ services: { stat: true } });
    click('[fivex-consent="allow"]');
    const live = () => Array.from(document.querySelectorAll("script")).filter((s) => !s.closest("head"));
    expect(live().find((s) => s.src === "https://cdn.test/lib.js")!.getAttribute("type")).toBeNull();
    expect(document.querySelectorAll('script[type="fivex-consent"]').length).toBe(2); // inline ones still waiting
    live().find((s) => s.src === "https://cdn.test/lib.js")!.dispatchEvent(new Event("load"));
    await tick();
    expect(document.querySelectorAll('script[type="fivex-consent"]').length).toBe(0);
    // released in document order, after the external script
    expect(live().map((s) => s.src || s.text)).toEqual(["https://cdn.test/lib.js", "window.__inline=1", "window.__inline2=1"]);
  });

  it("a failing external script does not block the ones after it", async () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<script type="fivex-consent" fivex-consent-categories="analytics" src="https://cdn.test/broken.js"></script><script type="fivex-consent" fivex-consent-categories="analytics">window.__after=1</script>`,
    );
    boot({ services: { stat: true } });
    click('[fivex-consent="allow"]');
    document.querySelector<HTMLScriptElement>('script[src="https://cdn.test/broken.js"]')!.dispatchEvent(new Event("error"));
    await tick();
    expect(document.querySelectorAll('script[type="fivex-consent"]').length).toBe(0);
    expect(Array.from(document.querySelectorAll("script")).some((s) => s.text === "window.__after=1")).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------
describe("L2 one placeholder shared by several embeds", () => {
  const SHARED = `<div><div fivex-consent-placeholder id="ph"><button fivex-consent="load-embed">load</button></div>
    <iframe id="a" fivex-consent-categories="functional" fivex-consent-src="https://a.example/"></iframe>
    <iframe id="b" fivex-consent-categories="functional" fivex-consent-src="https://b.example/"></iframe></div>`;
  it("loads every embed the placeholder governs", () => {
    document.body.insertAdjacentHTML("beforeend", SHARED);
    boot({ services: {} });
    click("#ph button");
    expect(document.getElementById("a")!.getAttribute("src")).toBe("https://a.example/");
    expect(document.getElementById("b")!.getAttribute("src")).toBe("https://b.example/");
    expect(shown("#ph")).toBe(false);
  });
  it("keeps the shared placeholder until all its embeds are loaded", () => {
    document.body.insertAdjacentHTML("beforeend", SHARED);
    boot({ services: {} });
    click('[fivex-consent="allow"]');
    expect(document.getElementById("a")!.getAttribute("src")).not.toBeNull();
    expect(document.getElementById("b")!.getAttribute("src")).not.toBeNull();
    expect(shown("#ph")).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
describe("L3 prototype keys as service ids", () => {
  it("'constructor' and 'toString' are unknown services, not Object.prototype members", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    document.body.insertAdjacentHTML("beforeend", `<iframe fivex-consent-service="constructor" fivex-consent-src="https://x.example/"></iframe>`);
    boot({ services: { stat: true, toString: true, constructor: true, __proto__: true } as never });
    expect(api!.services).toEqual(["stat"]);
    expect(api!.has("constructor")).toBe(false);
    expect(api!.has("toString")).toBe(false);
    api!.accept("constructor");
    expect(() => {
      api!.allow();
      api!.deny();
    }).not.toThrow();
    expect(warn).toHaveBeenCalled();
    expect(document.querySelector("iframe")!.getAttribute("src")).toBeNull();
  });
  it("the built-in registry has no prototype", () => {
    expect(Object.getPrototypeOf(SERVICES)).toBeNull();
    expect(SERVICES.constructor).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------------------
describe("L4 cookie values are type-checked", () => {
  it("only a literal true counts as consent", () => {
    setCookie(record({ cats: { necessary: true, marketing: "no", analytics: 1, functional: "true" }, svc: { ads: "false", vid: 1, stat: true } }));
    boot({ services: { stat: true, ads: true, vid: true } });
    expect(api!.hasCategory("marketing")).toBe(false);
    expect(api!.hasCategory("analytics")).toBe(false);
    expect(api!.hasCategory("functional")).toBe(false);
    expect(api!.has("ads")).toBe(false);
    expect(api!.has("vid")).toBe(false);
    expect(api!.has("stat")).toBe(true);
    expect(api!.getConsent()!.svc).toEqual({ stat: true });
  });
  it("a record with a non-numeric revision is ignored", () => {
    setCookie(record({ rev: "1" }));
    boot({ services: { stat: true } });
    expect(api!.hasConsent()).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
describe("L5 config vs API on window.FivexConsent", () => {
  it("keeps the config readable as FivexConsent.config and the API next to it", async () => {
    vi.resetModules();
    const ready = vi.fn();
    delete w.__fivexConsentStarted;
    w.FivexConsent = { services: { vimeo: true }, revision: 3, ready: [ready] };
    await import("./consent");
    const g = w.FivexConsent as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(g.config.services).toEqual({ vimeo: true }); // the config object is untouched
    expect(g.config.revision).toBe(3);
    expect(typeof g.allow).toBe("function");
    expect(g.services).toEqual(["vimeo"]); // the API list of active services does not overwrite config.services
    expect(ready).toHaveBeenCalledWith(g);
    (g.destroy as () => void)();
    delete w.__fivexConsentStarted;
  });
});

// ---------------------------------------------------------------------------------------------
describe("L6 config validation", () => {
  it("coerces the revision to an integer and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    boot({ revision: "2", services: { stat: true } });
    expect(warn).toHaveBeenCalled();
    api!.deny();
    expect(api!.getConsent()!.rev).toBe(2);
    api!.destroy();
    warn.mockClear();
    document.body.innerHTML = PAGE;
    boot({ revision: 2.7, services: { stat: true } });
    expect(warn).toHaveBeenCalled();
    expect(api!.hasConsent()).toBe(true); // 2.7 -> 2
    api!.destroy();
    boot({ revision: "abc", services: { stat: true } });
    expect(api!.hasConsent()).toBe(false); // falls back to 1
  });

  it("falls back to a host-only cookie when cookieDomain does not match the host", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    boot({ cookieDomain: ".evil.example", services: { stat: true } });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("cookieDomain"));
    api!.deny();
    api!.destroy();
    document.body.innerHTML = PAGE;
    boot({ cookieDomain: ".evil.example", services: { stat: true } });
    expect(api!.hasConsent()).toBe(true); // the host-only cookie was stored (a rejected Domain= would have lost it)
  });

  it("accepts the host and a parent domain", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    boot({ cookieDomain: "example.com", services: { stat: true } });
    api!.deny();
    expect(warn).not.toHaveBeenCalled();
    expect(api!.hasConsent()).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------
describe("L7 cookies of every service that is not allowed are erased on any decision", () => {
  it("deny erases cookies of services that never ran on this page", () => {
    boot();
    document.cookie = "ads_cx=1; Path=/";
    document.cookie = "stat_cx=1; Path=/";
    click('[fivex-consent="deny"]');
    expect(document.cookie).not.toContain("ads_cx");
    expect(document.cookie).not.toContain("stat_cx");
    expect(reload).not.toHaveBeenCalled();
  });
  it("keeps cookies of allowed services and erases the rest", () => {
    boot();
    document.cookie = "ads_cx=1; Path=/";
    document.cookie = "stat_cx=1; Path=/";
    api!.open();
    tickBox("analytics", true);
    tickBox("marketing", false);
    submit();
    expect(document.cookie).toContain("stat_cx");
    expect(document.cookie).not.toContain("ads_cx");
  });
  it("after a revision bump the leftovers of the old consent are erased at boot", () => {
    setCookie(record({ rev: 1, cats: { necessary: true, analytics: true, marketing: true } }));
    document.cookie = "ads_cx=1; Path=/";
    boot({ revision: 2, services: { stat: true, ads: true } });
    expect(api!.hasConsent()).toBe(false);
    expect(document.cookie).not.toContain("ads_cx");
  });
  it("after the consent cookie expired the leftovers are erased at boot", () => {
    document.cookie = "stat_cx=1; Path=/";
    boot();
    expect(document.cookie).not.toContain("stat_cx");
  });
  it("services the visitor allowed keep their cookies at boot", () => {
    setCookie(record());
    document.cookie = "stat_cx=1; Path=/";
    document.cookie = "ads_cx=1; Path=/";
    boot();
    expect(document.cookie).toContain("stat_cx");
    expect(document.cookie).not.toContain("ads_cx");
  });
});

// ---------------------------------------------------------------------------------------------
describe("L8 blocked iframes are hidden with inline display:none", () => {
  const IF = `<style>iframe{display:block}</style><iframe id="f" fivex-consent-service="vid" fivex-consent-src="https://player.vid.test/a" style="display:inline-block"></iframe>`;
  it("uses an inline style (not the hidden attribute) and restores the original display on load", () => {
    document.body.insertAdjacentHTML("beforeend", IF);
    boot({ services: { vid: true } });
    const f = document.getElementById("f") as HTMLElement;
    expect(f.hasAttribute("hidden")).toBe(false);
    expect(f.style.display).toBe("none");
    expect(f.style.getPropertyPriority("display")).toBe("important");
    click(".fivex-consent-placeholder__btn--load");
    expect(f.style.display).toBe("inline-block");
    expect(f.getAttribute("src")).toBe("https://player.vid.test/a");
  });
  it("restores to no inline display when the author had none", () => {
    document.body.insertAdjacentHTML("beforeend", IF.replace(' style="display:inline-block"', ""));
    boot({ services: { vid: true } });
    click(".fivex-consent-placeholder__btn--load");
    expect((document.getElementById("f") as HTMLElement).style.display).toBe("");
  });
});

// ---------------------------------------------------------------------------------------------
describe("L9 accessibility", () => {
  const prefs = () => document.querySelector<HTMLElement>('[fivex-consent="preferences"]')!;
  const banner = () => document.querySelector<HTMLElement>('[fivex-consent="banner"]')!;
  const nameOf = (el: HTMLElement): string => {
    const by = el.getAttribute("aria-labelledby");
    return by ? by.split(" ").map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim() : (el.getAttribute("aria-label") ?? "");
  };

  it("the preferences dialog is named by its first heading", () => {
    boot();
    expect(prefs().getAttribute("role")).toBe("dialog");
    expect(prefs().getAttribute("aria-modal")).toBe("true");
    expect(nameOf(prefs())).toBe("Cookie-Einstellungen");
    expect(prefs().getAttribute("aria-labelledby")).toBeTruthy();
  });
  it("the fivex-consent-label attribute names the dialog", () => {
    prefs().setAttribute("fivex-consent-label", "Meine Datenschutz-Auswahl");
    boot();
    expect(nameOf(prefs())).toBe("Meine Datenschutz-Auswahl");
  });
  it("falls back to a label from the texts (de / en) when there is no heading", () => {
    prefs().querySelector("h2")!.remove();
    boot();
    expect(nameOf(prefs())).toBe("Cookie-Einstellungen");
    api!.destroy();
    document.body.innerHTML = PAGE;
    prefs().querySelector("h2")!.remove();
    boot({ lang: "en", services: { stat: true } });
    expect(nameOf(prefs())).toBe("Cookie settings");
  });
  it("keeps an author-provided aria-label", () => {
    prefs().setAttribute("aria-label", "Eigenes Label");
    boot();
    expect(nameOf(prefs())).toBe("Eigenes Label");
    expect(prefs().hasAttribute("aria-labelledby")).toBe(false);
  });
  it("the banner is a labelled region", () => {
    boot();
    expect(banner().getAttribute("role")).toBe("region");
    expect(nameOf(banner())).toBe("Cookie-Hinweis");
    api!.destroy();
    document.body.innerHTML = PAGE;
    boot({ lang: "en", services: { stat: true } });
    expect(nameOf(banner())).toBe("Cookie notice");
  });
  it("the focus trap skips hidden, inert and disabled elements", () => {
    prefs().querySelector("form")!.insertAdjacentHTML("afterbegin", `<button id="h1" style="display:none">h</button><button id="d1" disabled>d</button><div inert><button id="i1">i</button></div><button id="first">first</button>`);
    prefs().querySelector("form")!.insertAdjacentHTML("beforeend", `<button id="h2" hidden>h</button><div aria-hidden="true"><a id="a1" href="#a">a</a></div>`);
    boot();
    api!.open();
    // last visible focusable is the close button
    const close = prefs().querySelector<HTMLElement>('[fivex-consent="close"]')!;
    close.focus();
    const ev = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect((document.activeElement as HTMLElement).id).toBe("first");
    const back = new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true });
    document.dispatchEvent(back);
    expect(document.activeElement).toBe(close);
  });
});

// ---------------------------------------------------------------------------------------------
describe("Consent Mode signals of Clarity and GA4", () => {
  function fakeCtx(cats: string[], cfg: Record<string, unknown> = {}): LoadContext & { win: Record<string, any> } { // eslint-disable-line @typescript-eslint/no-explicit-any
    const win: Record<string, any> = { dataLayer: [], clarity: vi.fn() }; // eslint-disable-line @typescript-eslint/no-explicit-any
    return { cfg, lang: "de", win, doc: document, loadScript: () => Promise.resolve(), inlineScript: () => {}, has: () => true, hasCategory: (c: string) => cats.includes(c) || c === "necessary", configOf: (id: string) => (id === "ga4" ? cfg : null) } as never;
  }
  const clarityCalls = (c: ReturnType<typeof fakeCtx>) => c.win.clarity.mock.calls.map((a: unknown[]) => a[1]);

  it("Clarity: ad_Storage follows marketing, analytics_Storage follows analytics (on load)", async () => {
    const ctx = fakeCtx(["analytics"], { id: "abcdefghij" });
    await SERVICES.clarity.load!(ctx);
    expect(clarityCalls(ctx)).toEqual([{ ad_Storage: "denied", analytics_Storage: "granted" }]);
    const ctx2 = fakeCtx(["analytics", "marketing"], { id: "abcdefghij" });
    await SERVICES.clarity.load!(ctx2);
    expect(clarityCalls(ctx2)).toEqual([{ ad_Storage: "granted", analytics_Storage: "granted" }]);
  });
  it("Clarity: update() re-sends the signals when marketing changes", () => {
    const ctx = fakeCtx(["analytics"]);
    SERVICES.clarity.update!(ctx);
    expect(clarityCalls(ctx)).toEqual([{ ad_Storage: "denied", analytics_Storage: "granted" }]);
  });

  const consentUpdates = (c: ReturnType<typeof fakeCtx>) =>
    (c.win.dataLayer as unknown[]).map((e) => Array.from(e as ArrayLike<unknown>)).filter((a) => a[0] === "consent" && a[1] === "update").map((a) => a[2]);
  it("GA4 alone: no ad_* key is sent by default, even with marketing consent (they keep the denied default)", async () => {
    const ctx = fakeCtx(["analytics", "marketing"], { id: "G-TEST123" });
    await SERVICES.ga4.load!(ctx);
    SERVICES.ga4.update!(ctx);
    expect(consentUpdates(ctx).length).toBeGreaterThan(0);
    for (const u of consentUpdates(ctx)) expect(u).toEqual({ analytics_storage: "granted" });
  });
  it("GA4 with ads: true: granted via the update hook only when marketing is consented", async () => {
    const without = fakeCtx(["analytics"], { id: "G-TEST123", ads: true });
    await SERVICES.ga4.load!(without);
    expect(consentUpdates(without).at(-1)).toMatchObject({ ad_user_data: "denied", ad_personalization: "denied" });
    const withMk = fakeCtx(["analytics", "marketing"], { id: "G-TEST123", ads: true });
    await SERVICES.ga4.load!(withMk);
    expect(consentUpdates(withMk).at(-1)).toMatchObject({ analytics_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
    // marketing withdrawn later: update() denies again
    const later = fakeCtx(["analytics"], { id: "G-TEST123", ads: true });
    SERVICES.ga4.update!(later);
    expect(consentUpdates(later).at(-1)).toMatchObject({ ad_user_data: "denied", ad_personalization: "denied" });
  });
  it("GA4 update hook runs on a later marketing decision (engine integration)", () => {
    boot({ services: { ga4: { id: "G-TEST123", ads: true } } }, SERVICES);
    api!.open();
    tickBox("analytics", true);
    tickBox("marketing", false);
    submit();
    api!.open();
    tickBox("analytics", true);
    tickBox("marketing", true);
    submit();
    const ups = (w.dataLayer as unknown[]).map((e) => Array.from(e as ArrayLike<unknown>)).filter((a) => a[0] === "consent" && a[1] === "update").map((a) => a[2]) as Array<Record<string, string>>;
    expect(ups.at(-1)).toMatchObject({ ad_user_data: "granted", ad_personalization: "granted" });
  });
});

// ---------------------------------------------------------------------------------------------
describe("withdrawal in another tab / history navigation", () => {
  class FakeChannel {
    static all: FakeChannel[] = [];
    onmessage: ((e: unknown) => void) | null = null;
    closed = false;
    constructor(public name: string) {
      FakeChannel.all.push(this);
    }
    postMessage(m: unknown) {
      for (const o of FakeChannel.all) if (o !== this && !o.closed && o.name === this.name) o.onmessage?.({ data: m });
    }
    close() {
      this.closed = true;
    }
  }
  afterEach(() => {
    delete w.BroadcastChannel;
    FakeChannel.all = [];
  });

  it("a persisted pageshow re-reads the cookie and reloads when consent was withdrawn meanwhile", () => {
    boot();
    click('[fivex-consent="allow"]');
    expect(api!.has("stat")).toBe(true);
    setCookie(record({ ts: Date.now() + 1000, cats: { necessary: true } }));
    const ev = Object.assign(new Event("pageshow"), { persisted: true });
    window.dispatchEvent(ev);
    expect(reload).toHaveBeenCalled();
  });
  it("a non-persisted pageshow does nothing", () => {
    boot();
    click('[fivex-consent="allow"]');
    setCookie(record({ ts: Date.now() + 1000, cats: { necessary: true } }));
    window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: false }));
    expect(reload).not.toHaveBeenCalled();
  });
  it("a persisted pageshow applies newly granted consent without reloading", () => {
    boot();
    expect(api!.has("stat")).toBe(false);
    setCookie(record({ ts: Date.now() + 1000 }));
    window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
    expect(reload).not.toHaveBeenCalled();
    expect(api!.has("stat")).toBe(true);
    expect(loads).toContain("stat");
    expect(shown('[fivex-consent="banner"]')).toBe(false);
  });
  it("a BroadcastChannel message from another tab triggers the same re-evaluation", () => {
    w.BroadcastChannel = FakeChannel as never;
    boot();
    click('[fivex-consent="allow"]');
    setCookie(record({ ts: Date.now() + 1000, cats: { necessary: true } }));
    FakeChannel.all[0].onmessage?.({ data: 1 });
    expect(reload).toHaveBeenCalled();
  });
  it("a decision is announced on the channel", () => {
    w.BroadcastChannel = FakeChannel as never;
    boot();
    const other = new FakeChannel("fivex_consent");
    const got = vi.fn();
    other.onmessage = got;
    click('[fivex-consent="deny"]');
    expect(got).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------------------------
describe("observe: embeds added later", () => {
  const LATE = `<div id="late"><iframe id="lf" fivex-consent-service="vid" fivex-consent-src="https://player.vid.test/late"></iframe></div>`;
  it("blocks and adds a placeholder to an embed that appears after boot", async () => {
    boot({ services: { vid: true } });
    document.body.insertAdjacentHTML("beforeend", LATE);
    await tick();
    const f = document.getElementById("lf")!;
    expect(f.getAttribute("src")).toBeNull();
    expect(f.style.display).toBe("none");
    expect(document.querySelectorAll(".fivex-consent-placeholder").length).toBe(1);
    click(".fivex-consent-placeholder__btn--load");
    expect(f.getAttribute("src")).toBe("https://player.vid.test/late");
  });
  it("releases a late embed immediately when the visitor already consented", async () => {
    setCookie(record({ cats: { necessary: true, functional: true } }));
    boot({ services: { vid: true } });
    document.body.insertAdjacentHTML("beforeend", LATE);
    await tick();
    expect(document.getElementById("lf")!.getAttribute("src")).toBe("https://player.vid.test/late");
  });
  it("does not push dataLayer events for late elements", async () => {
    setCookie(record());
    boot({ services: { stat: true, vid: true } });
    const before = ((w.dataLayer as unknown[]) ?? []).length;
    document.body.insertAdjacentHTML("beforeend", LATE);
    await tick();
    expect(((w.dataLayer as unknown[]) ?? []).length).toBe(before);
  });
  it("picks up a late script block and a late service found only in the markup", async () => {
    boot({ services: {} });
    document.body.insertAdjacentHTML("beforeend", `<script type="fivex-consent" fivex-consent-categories="analytics">window.__late=1</script>`);
    await tick();
    expect(document.querySelectorAll('script[type="fivex-consent"]').length).toBe(1);
    click('[fivex-consent="allow"]');
    expect(document.querySelectorAll('script[type="fivex-consent"]').length).toBe(0);
  });
  it("can be switched off with observe: false", async () => {
    boot({ services: { vid: true }, observe: false });
    document.body.insertAdjacentHTML("beforeend", LATE);
    await tick();
    expect(document.querySelectorAll(".fivex-consent-placeholder").length).toBe(0);
  });
});
