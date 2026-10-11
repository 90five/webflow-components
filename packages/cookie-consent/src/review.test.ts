// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://www.example.com/" }
// Regression tests for the second review round (N1-N9 and residuals).
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { GLOBAL } from "./constants";
import { createConsent, type ConsentApi } from "./engine";
import { googleSignals } from "./lib/google";
import { SERVICES } from "./registry";
import { sanitizeHtml } from "./sanitize";
import type { LoadContext, ServiceDef } from "./types";

type W = Record<string, unknown> & Window;
const w = window as unknown as W;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const click = (sel: string | Element) => (typeof sel === "string" ? document.querySelector<HTMLElement>(sel)! : (sel as HTMLElement)).click();
const clearCookies = () => {
  for (const c of document.cookie.split("; ")) {
    const n = c.split("=")[0];
    for (const d of ["", "; Domain=example.com", "; Domain=www.example.com"]) document.cookie = `${n}=; Max-Age=0; Path=/${d}`;
  }
};
const PAGE = `
  <div fivex-consent="banner" style="display:block"><button fivex-consent="allow">Alle</button><button id="deny" fivex-consent="deny">Keine</button><button fivex-consent="open-preferences">Einst.</button></div>
  <div fivex-consent="preferences"><form>
    <div fivex-consent-category="analytics"><label><input type="checkbox" fivex-consent-checkbox="analytics"></label></div>
    <div fivex-consent-category="marketing"><label><input type="checkbox" fivex-consent-checkbox="marketing"></label></div>
    <div fivex-consent-category="functional"><label><input type="checkbox" fivex-consent-checkbox="functional"></label></div>
    <button type="submit">Speichern</button></form></div>`;

let api: ConsentApi | undefined;
const reload = vi.fn();
function boot(cfg: Record<string, unknown>, registry: Record<string, ServiceDef> = SERVICES): ConsentApi {
  w.FivexConsent = cfg;
  api = createConsent({ win: window as never, services: registry, reload });
  return api;
}

/** Script and stylesheet loads of the vendor libraries: recorded and answered with a `load` event, nothing hits the network. */
let scripts: string[] = [];
function stubLoads(): void {
  scripts = [];
  const real = document.head.appendChild.bind(document.head);
  vi.spyOn(document.head, "appendChild").mockImplementation(((node: Node) => {
    const el = node as HTMLScriptElement;
    if (el.localName === "script" && el.src) {
      scripts.push(el.src);
      setTimeout(() => el.onload?.(new Event("load")), 0);
      return node;
    }
    return real(node);
  }) as never);
}

beforeEach(() => {
  document.body.innerHTML = PAGE;
  document.head.innerHTML = "";
  document.documentElement.lang = "de";
  reload.mockClear();
  for (const k of ["dataLayer", "gtag", "Calendly", "tf", "Tally", "Trustpilot", "instgrm", "twttr", "Cal", "hbspt", "__FivexConsentModeLast", `__${GLOBAL}ModeDefault`, `__${GLOBAL}ModeLast`]) delete w[k];
  clearCookies();
});
afterEach(() => {
  api?.destroy();
  api = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------------------------
describe("N1 loader-based containers render when released after the loader already ran", () => {
  function fakeLoaderService(spy: { refresh: Mock<(id: string) => void>; load: Mock<(cfg: unknown) => void> }, loadMs = 5): Record<string, ServiceDef> {
    return {
      wid: {
        id: "wid", vendor: "wid", vendorUrl: "https://x.test", privacyUrl: "https://x.test/p", category: "functional",
        label: { de: "wid", en: "wid" }, description: { de: "d", en: "d" }, cookies: [], cookieless: true, sources: ["https://x.test"],
        verification: { date: "2026-01-01", loader: "l", observed: "o" },
        load: (ctx) => {
          spy.load(ctx.cfg);
          return new Promise<void>((r) => setTimeout(r, loadMs));
        },
        refresh: (_ctx, el) => void spy.refresh(el.id),
        embed: { hosts: ["wid.test"], placeholder: { de: "x", en: "x" } },
      },
    };
  }
  const BOX = (id: string) => `<div><div id="${id}" fivex-consent-service="wid" fivex-consent-html="${esc("<p>w</p>")}"></div></div>`;

  it("two sequential one-off loads: the loader runs once, refresh runs for each container after it", async () => {
    const spy = { refresh: vi.fn<(id: string) => void>(), load: vi.fn<(cfg: unknown) => void>() };
    document.body.insertAdjacentHTML("beforeend", BOX("c1") + BOX("c2"));
    boot({ services: { wid: true } }, fakeLoaderService(spy));
    const [b1, b2] = Array.from(document.querySelectorAll<HTMLElement>(".fivex-consent-placeholder__btn--load"));
    b1.click();
    await tick(30);
    b2.click();
    await tick(30);
    expect(spy.load).toHaveBeenCalledTimes(1);
    expect(spy.refresh.mock.calls.map((c) => c[0])).toEqual(["c1", "c2"]);
  });

  it("a container released while the loader is still loading is refreshed when it finished", async () => {
    const spy = { refresh: vi.fn<(id: string) => void>(), load: vi.fn<(cfg: unknown) => void>() };
    document.body.insertAdjacentHTML("beforeend", BOX("c1") + BOX("c2"));
    boot({ services: { wid: true } }, fakeLoaderService(spy, 40));
    const [b1, b2] = Array.from(document.querySelectorAll<HTMLElement>(".fivex-consent-placeholder__btn--load"));
    b1.click();
    b2.click();
    expect(spy.refresh).not.toHaveBeenCalled();
    await tick(80);
    expect(spy.refresh.mock.calls.map((c) => c[0])).toEqual(["c1", "c2"]);
  });

  it("allow all, then a late container: refresh runs for the late one", async () => {
    const spy = { refresh: vi.fn<(id: string) => void>(), load: vi.fn<(cfg: unknown) => void>() };
    document.body.insertAdjacentHTML("beforeend", BOX("c1"));
    boot({ services: { wid: true } }, fakeLoaderService(spy));
    api!.allow();
    await tick(30);
    expect(spy.refresh.mock.calls.map((c) => c[0])).toEqual(["c1"]);
    document.body.insertAdjacentHTML("beforeend", BOX("late"));
    await tick(30);
    expect(spy.load).toHaveBeenCalledTimes(1);
    expect(spy.refresh.mock.calls.map((c) => c[0])).toEqual(["c1", "late"]);
  });

  it("a failed loader does not call refresh", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const spy = { refresh: vi.fn<(id: string) => void>(), load: vi.fn<(cfg: unknown) => void>() };
    const reg = fakeLoaderService(spy);
    reg.wid.load = () => Promise.reject(new Error("blocked"));
    document.body.insertAdjacentHTML("beforeend", BOX("c1"));
    boot({ services: { wid: true } }, reg);
    click(".fivex-consent-placeholder__btn--load");
    await tick(30);
    expect(spy.refresh).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  describe("official re-scan API of each vendor", () => {
    const box = (svc: string, html: string, id = "c") => `<div><div id="${id}" fivex-consent-service="${svc}" fivex-consent-html="${esc(html)}"></div></div>`;
    /** Boots the real service with a container, releases it via "Inhalt laden" and returns after the library finished. */
    async function release(svc: string, html: string, globals: Record<string, unknown>, cfg: unknown = true, n = 1): Promise<void> {
      stubLoads();
      Object.assign(w, globals);
      for (let i = 0; i < n; i++) document.body.insertAdjacentHTML("beforeend", box(svc, html, "c" + i));
      boot({ services: { [svc]: cfg } });
      for (const b of Array.from(document.querySelectorAll<HTMLElement>(".fivex-consent-placeholder__btn--load"))) {
        b.click();
        await tick(10);
      }
      await tick(10);
    }

    it("calendly: Calendly.initInlineWidget({ url, parentElement }) for a widget widget.js has not processed, not for processed ones", async () => {
      const init = vi.fn();
      await release("calendly", `<div class="calendly-inline-widget" data-url="https://calendly.com/you/30min"></div><div class="calendly-inline-widget" data-url="https://calendly.com/x" data-processed="true"></div><div class="calendly-inline-widget" data-url="https://evil.test/x"></div>`, { Calendly: { initInlineWidget: init } });
      expect(init).toHaveBeenCalledTimes(1);
      const arg = init.mock.calls[0][0];
      expect(arg.url).toBe("https://calendly.com/you/30min");
      expect(arg.parentElement).toBe(document.querySelector("#c0 .calendly-inline-widget"));
      expect(scripts).toEqual(["https://assets.calendly.com/assets/external/widget.js"]);
    });
    it("typeform: tf.load()", async () => {
      const load = vi.fn();
      await release("typeform", `<div data-tf-live="ID"></div>`, { tf: { load } });
      expect(load).toHaveBeenCalledTimes(1);
      expect(scripts).toEqual(["https://embed.typeform.com/next/embed.js"]);
    });
    it("tally: Tally.loadEmbeds()", async () => {
      const loadEmbeds = vi.fn();
      await release("tally", `<iframe data-tally-src="https://tally.so/embed/abc" width="100%" height="200"></iframe>`, { Tally: { loadEmbeds } });
      expect(loadEmbeds).toHaveBeenCalledTimes(1);
      expect(document.querySelector("#c0 iframe")!.hasAttribute("src")).toBe(false);
    });
    it("trustpilot: Trustpilot.loadFromElement(widget, true) per widget", async () => {
      const loadFromElement = vi.fn();
      await release("trustpilot", `<div class="trustpilot-widget" data-businessunit-id="abc"></div>`, { Trustpilot: { loadFromElement } });
      expect(loadFromElement).toHaveBeenCalledTimes(1);
      expect(loadFromElement.mock.calls[0][0]).toBe(document.querySelector("#c0 .trustpilot-widget"));
      expect(loadFromElement.mock.calls[0][1]).toBe(true);
    });
    it("instagram: instgrm.Embeds.process() with the blockquote kept by the sanitizer", async () => {
      const process = vi.fn();
      await release("instagram", `<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/p/x/" data-instgrm-version="14"><a href="https://www.instagram.com/p/x/">post</a></blockquote>`, { instgrm: { Embeds: { process } } });
      expect(process.mock.calls.length).toBeGreaterThanOrEqual(2); // after the loader and for the container
      expect(document.querySelector("#c0 blockquote.instagram-media")!.getAttribute("data-instgrm-permalink")).toBe("https://www.instagram.com/p/x/");
    });
    it("x-twitter: twttr.widgets.load(container) with the blockquote kept by the sanitizer", async () => {
      const load = vi.fn();
      await release("x-twitter", `<blockquote class="twitter-tweet" lang="en"><p lang="en" dir="ltr">hi</p>&mdash; a <a href="https://twitter.com/a/status/1">d</a></blockquote>`, { twttr: { widgets: { load } } });
      expect(load.mock.calls.some((c) => c[0] === document.getElementById("c0"))).toBe(true);
      expect(document.querySelector("#c0 blockquote.twitter-tweet")).not.toBeNull();
    });
    it("cal-com: every container gets its own namespace (one inline embed per namespace)", async () => {
      const inline1 = vi.fn();
      const inline2 = vi.fn();
      const ns: Record<string, unknown> = {};
      const Cal = Object.assign(
        vi.fn((cmd: string, name: string) => {
          if (cmd === "init" && name === "fivex-1") ns[name] = inline1;
          if (cmd === "init" && name === "fivex-2") ns[name] = inline2;
        }),
        { ns, q: [] as unknown[], loaded: false },
      );
      await release("cal-com", `<div class="cal-inline" data-cal-link="user/30min" data-cal-config='{"layout":"month_view"}'></div>`, { Cal }, true, 2);
      const names = Cal.mock.calls.filter((c) => c[0] === "init").map((c) => c[1]);
      expect(names.length).toBe(2);
      expect(new Set(names).size).toBe(2);
      const first = (names[0] === "fivex-1" ? inline1 : inline2).mock.calls[0];
      expect(first[0]).toBe("inline");
      expect(first[1]).toMatchObject({ calLink: "user/30min", config: { layout: "month_view" } });
      expect(first[1].elementOrSelector).toBe(document.querySelector("#c0 .cal-inline"));
    });
    it("hubspot: hbspt.forms.create for a valid form, nothing for invalid ids; target is a selector of the container", async () => {
      const create = vi.fn();
      await release("hubspot", `<div class="hs-form-html" data-region="eu1" data-portal-id="1234567" data-form-id="00000000-0000-0000-0000-000000000000"></div><div class="hs-form-html" data-portal-id="x" data-form-id="no"></div>`, { hbspt: { forms: { create } } });
      expect(create).toHaveBeenCalledTimes(1);
      const o = create.mock.calls[0][0];
      expect(o).toMatchObject({ portalId: "1234567", formId: "00000000-0000-0000-0000-000000000000", region: "eu1" });
      expect(document.querySelector(o.target)).toBe(document.querySelector("#c0 .hs-form-html"));
    });
    it("wistia: the media script is added once per media id (module), custom element kept", async () => {
      await release("wistia", `<wistia-player media-id="j38ihh83m5" aspect="1.7777777777777777"></wistia-player><wistia-player media-id="j38ihh83m5"></wistia-player>`, {});
      expect(scripts).toEqual(["https://fast.wistia.com/player.js", "https://fast.wistia.com/embed/j38ihh83m5.js"]);
      expect(document.querySelectorAll("#c0 wistia-player").length).toBe(2);
    });
  });
});

// ---------------------------------------------------------------------------------------------
describe("N2 an embed never starts site-wide tracking", () => {
  const FORM = `<div class="hs-form-html" data-region="na1" data-portal-id="53" data-form-id="95c7a26e-eb03-4da7-bb69-4ca3c029983b"></div>`;
  const hub = () => `<div><div id="hf" fivex-consent-service="hubspot" fivex-consent-html="${esc(FORM)}"></div></div>`;
  const TRACKER = /hs-scripts\.com|hs-analytics|hs-banner|hubspot\.com\/analytics/;
  const FORMS = "https://js.hsforms.net/forms/embed/v2.js";

  it("'Inhalt laden' on a HubSpot form loads only the forms script", async () => {
    stubLoads();
    w.hbspt = { forms: { create: vi.fn() } };
    document.body.insertAdjacentHTML("beforeend", hub());
    boot({ services: { hubspot: { id: "12345678" } } });
    click(".fivex-consent-placeholder__btn--load");
    await tick(20);
    expect(scripts).toEqual([FORMS]);
    expect(scripts.some((s) => TRACKER.test(s))).toBe(false);
  });
  it("'Immer erlauben' on a HubSpot form loads only the forms script, also on the next page view", async () => {
    stubLoads();
    w.hbspt = { forms: { create: vi.fn() } };
    document.body.insertAdjacentHTML("beforeend", hub());
    boot({ services: { hubspot: { id: "12345678" } } });
    click(".fivex-consent-placeholder__btn--always");
    await tick(20);
    expect(scripts).toEqual([FORMS]);
    api!.destroy();
    scripts.length = 0;
    document.body.innerHTML = PAGE + hub();
    boot({ services: { hubspot: { id: "12345678" } } });
    await tick(20);
    expect(scripts).toEqual([FORMS]);
  });
  it("tracking starts only with the marketing consent (and the forms script runs once)", async () => {
    stubLoads();
    w.hbspt = { forms: { create: vi.fn() } };
    document.body.insertAdjacentHTML("beforeend", hub());
    boot({ services: { hubspot: { id: "12345678" } } });
    click(".fivex-consent-placeholder__btn--load");
    await tick(20);
    api!.allow();
    await tick(20);
    expect(scripts.filter((s) => s === FORMS).length).toBe(1);
    expect(scripts.filter((s) => TRACKER.test(s))).toEqual(["https://js.hs-scripts.com/12345678.js"]);
  });
  it("without marketing consent no category decision starts the tracker either", async () => {
    stubLoads();
    document.body.insertAdjacentHTML("beforeend", hub());
    boot({ services: { hubspot: { id: "12345678" } } });
    click(".fivex-consent-placeholder__btn--always");
    api!.open();
    document.querySelector<HTMLInputElement>('[fivex-consent-checkbox="analytics"]')!.checked = true;
    document.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(20);
    expect(scripts.some((s) => TRACKER.test(s))).toBe(false);
  });
  it("hubspot configured for forms only (no id) loads no tracker even with marketing consent, and does not warn", async () => {
    stubLoads();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    boot({ services: { hubspot: true } });
    api!.allow();
    await tick(20);
    expect(scripts).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });
  it("audit of all services: only HubSpot has a tracker next to embeds, and it has a separate embed loader", () => {
    const withEmbed = Object.values(SERVICES).filter((s) => s.embed);
    expect(withEmbed.filter((s) => s.tracker).map((s) => s.id)).toEqual(["hubspot"]);
    for (const s of withEmbed.filter((x) => x.tracker)) expect(s.loadEmbed, s.id).toBeTypeOf("function");
    // every other embed service's `load` is the embed library itself (a vendor widget / player / form script)
    expect(withEmbed.filter((s) => s.load && !s.tracker).map((s) => s.id).sort()).toEqual(["cal-com", "calendly", "instagram", "tally", "trustpilot", "typeform", "wistia", "x-twitter"]);
  });
  it("a tracker service without a stored grant never runs `load` for a container, whatever its flags", async () => {
    stubLoads();
    for (const id of ["hubspot"]) {
      document.body.innerHTML = PAGE + `<div><div fivex-consent-service="${id}" fivex-consent-html="${esc(FORM)}"></div></div>`;
      boot({ services: { [id]: { id: "12345678" } } });
      api!.accept(id); // stored service grant
      await tick(20);
      expect(scripts.some((s) => TRACKER.test(s))).toBe(false);
      api!.destroy();
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe("N3 Google Consent Mode signals are computed once, independent of service order", () => {
  type Sig = Record<string, string>;
  const cs = () => (w.dataLayer as unknown[]).map((e) => Array.from(e as ArrayLike<unknown>)).filter((a) => a[0] === "consent" && a[1] === "update").map((a) => ({ ...(a[2] as Sig) }));
  const merged = () => Object.assign({}, ...cs());
  const ID = { gtm: { id: "GTM-TEST123" }, ga4: { id: "G-TEST123" }, "google-ads": { id: "AW-123456789" } } as Record<string, unknown>;
  const cfgOf = (order: string[], over: Record<string, unknown> = {}) => ({ services: Object.fromEntries(order.map((k) => [k, { ...(ID[k] as object), ...((over[k] as object) ?? {}) }])) });
  function run(order: string[], decision: (a: ConsentApi) => void, over: Record<string, unknown> = {}): Sig {
    for (const k of ["dataLayer", "gtag", `__${GLOBAL}ModeDefault`, `__${GLOBAL}ModeLast`]) delete w[k];
    document.body.innerHTML = PAGE;
    clearCookies();
    stubLoads();
    boot(cfgOf(order, over));
    decision(api!);
    const out = merged();
    api!.destroy();
    return out;
  }
  const allow = (a: ConsentApi) => a.allow();
  const analyticsOnly = (a: ConsentApi) => {
    a.open();
    document.querySelector<HTMLInputElement>('[fivex-consent-checkbox="analytics"]')!.checked = true;
    document.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  };
  const marketingOnly = (a: ConsentApi) => {
    a.open();
    document.querySelector<HTMLInputElement>('[fivex-consent-checkbox="marketing"]')!.checked = true;
    document.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  };
  const permutations = <T,>(xs: T[]): T[][] => (xs.length < 2 ? [xs] : xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));

  it("gtm + ga4: every key order gives the same final signals; marketing consent grants ad_*", () => {
    const results = permutations(["gtm", "ga4"]).map((o) => run(o, allow));
    expect(results[0]).toEqual(results[1]);
    expect(results[0]).toEqual({
      analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted", functionality_storage: "granted", personalization_storage: "granted",
    });
  });
  it("gtm + ga4 with analytics only: ad_* stay denied in every order (ga4 cannot overwrite gtm or the other way round)", () => {
    const results = permutations(["gtm", "ga4"]).map((o) => run(o, analyticsOnly));
    expect(results[0]).toEqual(results[1]);
    expect(results[0]).toMatchObject({ analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  });
  it("ga4 + google-ads: same result in both orders, the ad signals follow marketing", () => {
    const both = permutations(["ga4", "google-ads"]).map((o) => run(o, allow));
    expect(both[0]).toEqual(both[1]);
    expect(both[0]).toEqual({ analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
    const mk = permutations(["ga4", "google-ads"]).map((o) => run(o, marketingOnly));
    expect(mk[0]).toEqual(mk[1]);
    expect(mk[0]).toEqual({ ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" }); // no analytics consent: ga4 does not run
    const an = permutations(["ga4", "google-ads"]).map((o) => run(o, analyticsOnly));
    expect(an[0]).toEqual(an[1]);
    expect(an[0]).toEqual({ analytics_storage: "granted" }); // google-ads does not run without marketing
  });
  it("all three together: every order is identical", () => {
    const results = permutations(["gtm", "ga4", "google-ads"]).map((o) => JSON.stringify(Object.entries(run(o, allow)).sort()));
    expect(new Set(results).size).toBe(1);
  });
  it("ga4 alone never sends an ad_* key unless ads: true", () => {
    for (const decision of [allow, analyticsOnly]) {
      const s = run(["ga4"], decision);
      expect(Object.keys(s).filter((k) => k.startsWith("ad_"))).toEqual([]);
      expect(s.analytics_storage).toBe("granted");
    }
    expect(run(["ga4"], allow, { ga4: { ads: true } })).toMatchObject({ analytics_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
    expect(Object.keys(run(["ga4"], allow, { ga4: { ads: true } }))).not.toContain("ad_storage");
  });
  it("googleSignals is a pure function of the categories and the configured services", () => {
    const ctx = (cats: string[], services: Record<string, Record<string, unknown>>) =>
      ({ hasCategory: (c: string) => c === "necessary" || cats.includes(c), has: (id: string) => id in services, configOf: (id: string) => services[id] ?? null }) as unknown as LoadContext;
    expect(googleSignals(ctx(["analytics", "marketing"], { ga4: {}, gtm: {} }))).toEqual(googleSignals(ctx(["analytics", "marketing"], { gtm: {}, ga4: {} })));
    expect(googleSignals(ctx(["marketing"], { "google-ads": {} }))).toEqual({ ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
    expect(googleSignals(ctx(["analytics"], {}))).toEqual({});
  });
  it("unchanged signals are not pushed twice", () => {
    run(["gtm", "ga4"], (a) => {
      a.allow();
      a.allow();
    });
    const ups = cs();
    expect(ups.length).toBe(new Set(ups.map((u) => JSON.stringify(u))).size);
  });
});

// ---------------------------------------------------------------------------------------------
describe("N4 one-off loads are not taken back", () => {
  const reg = (): Record<string, ServiceDef> => ({
    vid: {
      id: "vid", vendor: "vid", vendorUrl: "https://x.test", privacyUrl: "https://x.test/p", category: "functional", label: { de: "vid", en: "vid" }, description: { de: "d", en: "d" },
      cookies: [], cookieless: true, sources: ["https://x.test"], verification: { date: "2026-01-01", loader: "l", observed: "o" },
      load: () => {},
      embed: { hosts: ["player.vid.test"], placeholder: { de: "x", en: "x" } },
    },
    vid2: {
      id: "vid2", vendor: "vid2", vendorUrl: "https://x.test", privacyUrl: "https://x.test/p", category: "functional", label: { de: "vid2", en: "vid2" }, description: { de: "d", en: "d" },
      cookies: [], cookieless: true, sources: ["https://x.test"], verification: { date: "2026-01-01", loader: "l", observed: "o" },
      embed: { hosts: ["player.vid.test"], placeholder: { de: "x", en: "x" } },
    },
  });
  const IF = (svc: string, id: string) => `<div><iframe id="${id}" fivex-consent-service="${svc}" fivex-consent-src="https://player.vid.test/${id}"></iframe></div>`;
  const src = (id: string) => document.getElementById(id)!.getAttribute("src");

  it("'Inhalt laden' then 'Nur notwendige': no reload, the embed stays until navigation", async () => {
    document.body.insertAdjacentHTML("beforeend", IF("vid", "a"));
    boot({ services: { vid: true } }, reg());
    click(".fivex-consent-placeholder__btn--load");
    expect(src("a")).not.toBeNull();
    click("#deny");
    expect(reload).not.toHaveBeenCalled();
    expect(src("a")).not.toBeNull();
    expect(api!.getConsent()!.cats).toMatchObject({ functional: false });
  });
  it("one-off script service, then a category decision: no reload either", async () => {
    document.body.insertAdjacentHTML("beforeend", `<div><div fivex-consent-service="vid" fivex-consent-html="${esc("<p>x</p>")}"></div></div>`);
    boot({ services: { vid: true } }, reg());
    click(".fivex-consent-placeholder__btn--load");
    api!.allow();
    api!.deny();
    expect(reload).not.toHaveBeenCalled();
  });
  it("an element without a service released by 'Inhalt laden' is not taken back by a later decision", () => {
    document.body.insertAdjacentHTML("beforeend", `<div><iframe id="u" fivex-consent-categories="functional" fivex-consent-src="https://player.vid.test/u"></iframe></div>`);
    boot({ services: {} }, reg());
    click(".fivex-consent-placeholder__btn--load");
    click("#deny");
    expect(reload).not.toHaveBeenCalled();
  });
  it("a stored grant that started a script is revoked -> reload (unchanged)", () => {
    boot({ services: { vid: true } }, reg());
    api!.allow();
    api!.deny();
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it("an iframe-only service (no script) released by a stored grant is also taken back with a reload, a one-off one is not", () => {
    document.body.insertAdjacentHTML("beforeend", IF("vid2", "a"));
    boot({ services: { vid2: true } }, reg());
    api!.allow();
    expect(src("a")).not.toBeNull();
    api!.deny();
    expect(reload).toHaveBeenCalledTimes(1);
    api!.destroy();
    reload.mockClear();
    document.body.innerHTML = PAGE + IF("vid2", "b");
    clearCookies();
    boot({ services: { vid2: true } }, reg());
    click(".fivex-consent-placeholder__btn--load");
    click("#deny");
    expect(reload).not.toHaveBeenCalled();
  });
  it("stored 'Immer erlauben' grant that started the loader is revoked by a decision -> reload", () => {
    document.body.insertAdjacentHTML("beforeend", IF("vid", "a"));
    boot({ services: { vid: true } }, reg());
    click(".fivex-consent-placeholder__btn--always");
    click("#deny");
    expect(reload).toHaveBeenCalledTimes(1);
  });
  describe("other tabs", () => {
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
    it("'Immer erlauben' in tab A never reloads tab B, and B keeps its one-off embed", () => {
      w.BroadcastChannel = FakeChannel as never;
      // tab B: a one-off embed of vid
      document.body.insertAdjacentHTML("beforeend", IF("vid", "a") + IF("vid2", "b"));
      boot({ services: { vid: true, vid2: true } }, reg());
      const tabB = api!;
      document.querySelector<HTMLElement>("iframe#a")!.parentElement!.querySelector<HTMLElement>(".fivex-consent-placeholder__btn--load")!.click();
      expect(src("a")).not.toBeNull();
      // tab A (same cookie jar, own engine) clicks 'Immer erlauben' for vid2
      const cookie = document.cookie;
      expect(cookie).toBe(""); // B stored nothing
      const bodyB = document.body.innerHTML;
      document.body.innerHTML = PAGE + IF("vid", "a") + IF("vid2", "b");
      const tabA = createConsent({ win: window as never, services: reg(), config: { services: { vid: true, vid2: true } }, reload: vi.fn() });
      document.querySelector<HTMLElement>("iframe#b")!.parentElement!.querySelector<HTMLElement>(".fivex-consent-placeholder__btn--always")!.click();
      tabA.destroy();
      document.body.innerHTML = bodyB;
      expect(reload).not.toHaveBeenCalled();
      expect(tabB.has("vid")).toBe(true); // the one-off grant survived the sync
    });
    it("a decision elsewhere does not clear one-off grants of this tab", () => {
      w.BroadcastChannel = FakeChannel as never;
      document.body.insertAdjacentHTML("beforeend", IF("vid", "a"));
      boot({ services: { vid: true } }, reg());
      click(".fivex-consent-placeholder__btn--load");
      document.cookie = `fivex_consent=${encodeURIComponent(JSON.stringify({ v: 1, rev: 1, ts: Date.now() + 1000, cats: { necessary: true }, svc: {}, decided: true }))}; Path=/`;
      FakeChannel.all[0].onmessage?.({ data: 1 });
      expect(reload).not.toHaveBeenCalled();
      expect(api!.has("vid")).toBe(true);
    });
    it("a withdrawal elsewhere of a stored grant that started a script reloads this tab", () => {
      w.BroadcastChannel = FakeChannel as never;
      boot({ services: { vid: true } }, reg());
      api!.allow();
      document.cookie = `fivex_consent=${encodeURIComponent(JSON.stringify({ v: 1, rev: 1, ts: Date.now() + 1000, cats: { necessary: true }, svc: {}, decided: true }))}; Path=/`;
      FakeChannel.all[0].onmessage?.({ data: 1 });
      expect(reload).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------------------------
describe("N8 visitor texts", () => {
  const texts = (s: ServiceDef) => [s.description, s.visitorNote, s.embed?.placeholder].filter(Boolean).flatMap((t) => [t!.de, t!.en]);
  it("no service claims anonymisation it cannot guarantee", () => {
    for (const s of Object.values(SERVICES)) for (const t of texts(s)) expect(t, s.id).not.toMatch(/anonymi[sz]|anonym\b/i);
  });
  it("Clarity wording is neutral in both languages", () => {
    expect(SERVICES.clarity.description.de).not.toMatch(/anonym/i);
    expect(SERVICES.clarity.description.en).not.toMatch(/anonym/i);
  });
  it("GA4 does not promise 'no Google script' (a GTM container loaded before consent is a separate service)", () => {
    const n = SERVICES.ga4.visitorNote!;
    expect(`${n.de} ${n.en}`).not.toMatch(/kein Google|no Google|keine Daten|no data/i);
  });
  it("an embed placeholder describes what loads: the HubSpot form text does not mention tracking, and tracking is described as a separate step", () => {
    expect(SERVICES.hubspot.embed!.placeholder.en).toMatch(/form/i);
    expect(SERVICES.hubspot.visitorNote!.de).toMatch(/nur das Formular/);
    expect(SERVICES.hubspot.devNote!.en).toMatch(/ad pixels/);
  });
});

// ---------------------------------------------------------------------------------------------
describe("N9 small fixes", () => {
  it("an iframe with a typo service id stays blocked (no host bypass), warns, and has no buttons", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    document.body.insertAdjacentHTML("beforeend", `<div><iframe id="f" fivex-consent-service="youtub" fivex-consent-src="https://evil.example/x"></iframe></div>`);
    boot({ services: {} });
    expect(warn.mock.calls.some((c) => String(c[0]).includes('unknown service "youtub"'))).toBe(true);
    expect(document.querySelectorAll(".fivex-consent-placeholder button").length).toBe(0);
    expect(document.getElementById("f")!.getAttribute("src")).toBeNull();
    api!.allow();
    api!.deny();
    expect(document.getElementById("f")!.getAttribute("src")).toBeNull();
    expect(document.getElementById("f")!.style.display).toBe("none");
  });
  it("a designed placeholder button for an unknown service does nothing", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    document.body.insertAdjacentHTML("beforeend", `<div><div fivex-consent-placeholder><button fivex-consent="load-embed">l</button><button fivex-consent="allow-embed">a</button></div><iframe id="f" fivex-consent-service="nope" fivex-consent-src="https://evil.example/x"></iframe></div>`);
    boot({ services: {} });
    click('[fivex-consent="load-embed"]');
    click('[fivex-consent="allow-embed"]');
    expect(document.getElementById("f")!.getAttribute("src")).toBeNull();
    expect(api!.getConsent()).toBeNull();
  });
  it("a known service without embed hosts cannot be used as a host bypass either", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    document.body.insertAdjacentHTML("beforeend", `<div><iframe id="f" fivex-consent-service="ga4" fivex-consent-src="https://evil.example/x"></iframe></div>`);
    boot({ services: { ga4: { id: "G-TEST123" } } });
    api!.allow();
    expect(document.getElementById("f")!.getAttribute("src")).toBeNull();
  });
  it("'Immer erlauben' is shown only for known services", () => {
    document.body.insertAdjacentHTML("beforeend", `<div><iframe fivex-consent-categories="functional" fivex-consent-src="https://a.example/"></iframe></div>`);
    boot({ services: {} });
    expect(document.querySelectorAll(".fivex-consent-placeholder__btn--load").length).toBe(1);
    expect(document.querySelectorAll(".fivex-consent-placeholder__btn--always").length).toBe(0);
  });
  describe("config.ready accepts a function or an array", () => {
    async function start(ready: unknown): Promise<Record<string, unknown>> {
      vi.resetModules();
      delete w.__fivexConsentStarted;
      w.FivexConsent = { services: {}, ready };
      await import("./consent");
      const g = w.FivexConsent as unknown as Record<string, unknown>;
      return g;
    }
    afterEach(() => {
      (w.FivexConsent as unknown as { destroy?: () => void })?.destroy?.();
      delete w.__fivexConsentStarted;
    });
    it("a single function", async () => {
      const fn = vi.fn();
      const g = await start(fn);
      expect(fn).toHaveBeenCalledWith(g);
    });
    it("an array, ignoring entries that are not functions", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const a = vi.fn();
      const b = vi.fn();
      await start([a, "x", b]);
      expect(a).toHaveBeenCalledTimes(1);
      expect(b).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalled();
    });
    it("garbage is ignored with a warning, the script still starts", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const g = await start(42);
      expect(typeof g.allow).toBe("function");
      expect(warn).toHaveBeenCalled();
    });
    it("the internal _debug helper is not part of the public API", async () => {
      const g = await start(undefined);
      expect("_debug" in g).toBe(false);
    });
  });
  describe("expires", () => {
    it("a tiny value is clamped to one day with a warning", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const spy = vi.spyOn(document, "cookie", "set");
      boot({ expires: 0.000001, services: {} });
      api!.allow();
      expect(warn.mock.calls.some((c) => String(c[0]).includes("expires"))).toBe(true);
      const written = spy.mock.calls.map((c) => String(c[0])).find((c) => c.startsWith("fivex_consent=") && !c.includes("Max-Age=0;"))!;
      expect(Number(/Max-Age=(\d+)/.exec(written)![1])).toBe(86400);
      expect(document.cookie).toContain("fivex_consent=");
    });
    it("0, negative and non-numeric values fall back to 180 days with a warning", () => {
      for (const v of [0, -5, "abc"]) {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const spy = vi.spyOn(document, "cookie", "set");
        document.body.innerHTML = PAGE;
        boot({ expires: v, services: {} });
        api!.allow();
        const written = spy.mock.calls.map((c) => String(c[0])).find((c) => c.startsWith("fivex_consent=") && !c.includes("Max-Age=0;"))!;
        expect(Number(/Max-Age=(\d+)/.exec(written)![1]), String(v)).toBe(180 * 86400);
        expect(warn).toHaveBeenCalled();
        api!.destroy();
        vi.restoreAllMocks();
        clearCookies();
      }
    });
    it("a sane value is used as is, silently", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const spy = vi.spyOn(document, "cookie", "set");
      boot({ expires: 30, services: {} });
      api!.allow();
      const written = spy.mock.calls.map((c) => String(c[0])).find((c) => c.startsWith("fivex_consent=") && !c.includes("Max-Age=0;"))!;
      expect(Number(/Max-Age=(\d+)/.exec(written)![1])).toBe(30 * 86400);
      expect(warn).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------------------------
describe("residuals", () => {
  it("DOM clobbering: id=dataLayer in sanitised markup cannot replace window.dataLayer", () => {
    document.body.insertAdjacentHTML("beforeend", `<div><div fivex-consent-service="calendly" fivex-consent-html="${esc(`<div id="dataLayer" name="gtag" class="x"></div><form id="dataLayer"></form>`)}"></div></div>`);
    stubLoads();
    boot({ services: { calendly: true, ga4: { id: "G-TEST123" } } });
    api!.allow();
    expect(document.querySelector("[id=dataLayer]")).toBeNull();
    expect(Array.isArray(w.dataLayer)).toBe(true);
  });
  it("a non-array dataLayer is replaced by an own array with a warning (no crash)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    w.dataLayer = { not: "an array" } as never;
    stubLoads();
    boot({ services: { ga4: { id: "G-TEST123" } } });
    expect(() => api!.allow()).not.toThrow();
    expect(Array.isArray(w.dataLayer)).toBe(true);
    expect((w.dataLayer as unknown[]).some((e) => Array.from(e as ArrayLike<unknown>)[0] === "consent")).toBe(true);
    expect(warn.mock.calls.some((c) => String(c[0]).includes("dataLayer"))).toBe(true);
  });
  it("an existing dataLayer array is kept", () => {
    const layer: unknown[] = [{ event: "mine" }];
    w.dataLayer = layer as never;
    stubLoads();
    boot({ services: { ga4: { id: "G-TEST123" } } });
    api!.allow();
    expect(w.dataLayer).toBe(layer);
    expect(layer[0]).toEqual({ event: "mine" });
  });

  it("L2: a shared placeholder stays (and shows) until the LAST embed it governs is loaded - partial state asserted", () => {
    const reg: Record<string, ServiceDef> = {};
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div><div fivex-consent-placeholder id="ph" style="display:block"><button fivex-consent="load-embed">load</button></div>
        <iframe id="a" fivex-consent-categories="functional" fivex-consent-src="https://a.example/"></iframe>
        <iframe id="b" fivex-consent-categories="analytics" fivex-consent-src="https://b.example/"></iframe></div>`,
    );
    boot({ services: {} }, reg);
    const ph = document.getElementById("ph")!;
    // functional only: a loads, b stays blocked, the placeholder stays visible
    api!.open();
    document.querySelector<HTMLInputElement>('[fivex-consent-checkbox="functional"]')!.checked = true;
    document.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(document.getElementById("a")!.getAttribute("src")).toBe("https://a.example/");
    expect(document.getElementById("b")!.getAttribute("src")).toBeNull();
    expect(document.getElementById("b")!.style.display).toBe("none");
    expect(ph.style.display).not.toBe("none");
    // analytics added: b loads, now the placeholder goes
    api!.open();
    document.querySelector<HTMLInputElement>('[fivex-consent-checkbox="analytics"]')!.checked = true;
    document.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(document.getElementById("b")!.getAttribute("src")).toBe("https://b.example/");
    expect(ph.style.display).toBe("none");
  });

  describe("memory: disconnected elements are pruned on observer callbacks", () => {
    const reg: Record<string, ServiceDef> = {
      vid: {
        id: "vid", vendor: "vid", vendorUrl: "https://x.test", privacyUrl: "https://x.test/p", category: "functional", label: { de: "vid", en: "vid" }, description: { de: "d", en: "d" },
        cookies: [], cookieless: true, sources: ["https://x.test"], verification: { date: "2026-01-01", loader: "l", observed: "o" }, embed: { hosts: ["player.vid.test"], placeholder: { de: "x", en: "x" } },
      },
    };
    it("replaced embeds do not accumulate", async () => {
      boot({ services: { vid: true } }, reg);
      for (let i = 0; i < 30; i++) {
        document.body.insertAdjacentHTML("beforeend", `<div class="slot"><iframe fivex-consent-service="vid" fivex-consent-src="https://player.vid.test/${i}"></iframe></div>`);
        await tick();
        document.querySelectorAll(".slot").forEach((s, idx, all) => idx < all.length - 1 && s.remove());
        await tick();
      }
      await tick();
      const d = (api as unknown as { _debug: () => { blocked: number; placeholders: number } })._debug();
      expect(d.blocked).toBeLessThanOrEqual(2);
      expect(d.placeholders).toBeLessThanOrEqual(2);
      expect(document.querySelectorAll(".fivex-consent-placeholder").length).toBe(1);
    });
    it("a removed embed that was not yet released is not activated later", async () => {
      boot({ services: { vid: true } }, reg);
      document.body.insertAdjacentHTML("beforeend", `<div id="s"><iframe id="gone" fivex-consent-service="vid" fivex-consent-src="https://player.vid.test/g"></iframe></div>`);
      await tick();
      const f = document.getElementById("gone")!;
      document.getElementById("s")!.remove();
      document.body.insertAdjacentHTML("beforeend", `<p>x</p>`);
      await tick();
      api!.allow();
      expect(f.getAttribute("src")).toBeNull();
    });
    it("an embed that is removed and inserted again later is picked up again", async () => {
      boot({ services: { vid: true } }, reg);
      document.body.insertAdjacentHTML("beforeend", `<div id="s"><iframe id="mv" fivex-consent-service="vid" fivex-consent-src="https://player.vid.test/m"></iframe></div>`);
      await tick();
      const s = document.getElementById("s")!;
      s.remove();
      document.body.insertAdjacentHTML("beforeend", `<p>x</p>`);
      await tick();
      document.body.appendChild(s);
      await tick();
      expect(s.querySelector("iframe")!.getAttribute("src")).toBeNull();
      api!.allow();
      expect(s.querySelector("iframe")!.getAttribute("src")).toBe("https://player.vid.test/m");
    });
    it("a blocked script that already ran stays known (its category can still be revoked)", async () => {
      document.body.insertAdjacentHTML("beforeend", `<script type="fivex-consent" fivex-consent-categories="analytics">window.__ran=1</script>`);
      boot({ services: {} });
      api!.allow();
      await tick();
      document.body.insertAdjacentHTML("beforeend", `<p>x</p>`);
      await tick();
      api!.deny();
      expect(reload).toHaveBeenCalled();
    });
  });

  describe("BroadcastChannel and the back/forward cache", () => {
    class FakeChannel {
      static all: FakeChannel[] = [];
      onmessage: ((e: unknown) => void) | null = null;
      closed = false;
      constructor(public name: string) {
        FakeChannel.all.push(this);
      }
      postMessage() {}
      close() {
        this.closed = true;
      }
    }
    afterEach(() => {
      delete w.BroadcastChannel;
      FakeChannel.all = [];
    });
    const open = () => FakeChannel.all.filter((c) => !c.closed).length;
    it("the channel is closed on pagehide and reopened on pageshow", () => {
      w.BroadcastChannel = FakeChannel as never;
      boot({ services: {} });
      expect(open()).toBe(1);
      window.dispatchEvent(new Event("pagehide"));
      expect(open()).toBe(0);
      window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
      expect(open()).toBe(1);
      expect(FakeChannel.all.at(-1)!.onmessage).toBeTypeOf("function");
    });
    it("a reopened channel still delivers decisions of other tabs", () => {
      w.BroadcastChannel = FakeChannel as never;
      boot({ services: { vid: true } }, { vid: { ...SERVICES.youtube, id: "vid" } as ServiceDef });
      api!.allow();
      window.dispatchEvent(new Event("pagehide"));
      window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
      document.cookie = `fivex_consent=${encodeURIComponent(JSON.stringify({ v: 1, rev: 1, ts: Date.now() + 1000, cats: { necessary: true }, svc: {}, decided: true }))}; Path=/`;
      FakeChannel.all.filter((c) => !c.closed)[0].onmessage?.({ data: 1 });
      expect(api!.hasCategory("functional")).toBe(false);
    });
    it("destroy() closes it and removes the listeners", () => {
      w.BroadcastChannel = FakeChannel as never;
      boot({ services: {} });
      api!.destroy();
      expect(open()).toBe(0);
      window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
      expect(open()).toBe(0);
    });
  });

  it("every service's markup example survives the sanitizer unchanged in its attributes", () => {
    for (const s of Object.values(SERVICES)) {
      const m = s.embed?.markup;
      if (!m) continue;
      const src = document.createElement("div");
      src.innerHTML = m.example;
      const out = document.createElement("div");
      out.appendChild(sanitizeHtml(m.example, document, { elements: m.elements, attributes: m.attributes, hosts: s.embed!.hosts }));
      const a = Array.from(src.querySelectorAll("*"));
      const b = Array.from(out.querySelectorAll("*"));
      expect(b.length, s.id).toBe(a.length);
      a.forEach((el, i) => {
        const kept = b[i].getAttributeNames();
        for (const n of el.getAttributeNames()) expect(kept, `${s.id}: <${el.localName} ${n}>`).toContain(n);
      });
    }
  });
});
