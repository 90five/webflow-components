// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GLOBAL } from "./constants";
import { createConsent, type ConsentApi } from "./engine";
import { SERVICES } from "./registry";
import type { ServiceDef } from "./types";

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
function boot(cfg: Record<string, unknown> = { services: { stat: true, ads: true } }, registry = REG): ConsentApi {
  (window as unknown as Record<string, unknown>).FivexConsent = cfg;
  api = createConsent({ win: window as never, services: registry, reload });
  return api;
}
const BANNER = `
  <div fivex-consent="banner" style="display:block"><button fivex-consent="allow">Alle</button><button fivex-consent="deny">Keine</button><button fivex-consent="open-preferences">Einst.</button></div>
  <div fivex-consent="preferences"><form>
    <div fivex-consent-category="analytics"><label><input type="checkbox" fivex-consent-checkbox="analytics"></label></div>
    <div fivex-consent-category="marketing"><label><input type="checkbox" fivex-consent-checkbox="marketing"></label></div>
    <div fivex-consent-category="functional"><label><input type="checkbox" fivex-consent-checkbox="functional"></label></div>
    <input type="checkbox" fivex-consent-checkbox="necessary">
    <button type="submit">Speichern</button><button type="button" fivex-consent="close">X</button></form></div>
  <div fivex-consent="manager"><button fivex-consent="open-preferences">Cookies</button></div>`;
const shown = (sel: string) => (document.querySelector<HTMLElement>(sel)!.style.display !== "none");
const click = (sel: string) => document.querySelector<HTMLElement>(sel)!.click();

beforeEach(() => {
  document.body.innerHTML = BANNER;
  document.head.innerHTML = "";
  document.documentElement.lang = "de";
  loads.length = 0;
  sessionStorage.clear();
  reload.mockClear();
  delete (window as unknown as Record<string, unknown>).dataLayer;
  for (const c of document.cookie.split("; ")) document.cookie = `${c.split("=")[0]}=; Max-Age=0; Path=/`;
});
afterEach(() => api?.destroy());

describe("banner, preferences and manager", () => {
  it("shows the banner on first visit, hides preferences and manager", () => {
    boot();
    expect(shown('[fivex-consent="banner"]')).toBe(true);
    expect(shown('[fivex-consent="preferences"]')).toBe(false);
    expect(shown('[fivex-consent="manager"]')).toBe(false);
    expect(loads).toEqual([]);
  });

  it("allow consents to everything, hides the banner and shows the manager", () => {
    boot();
    click('[fivex-consent="allow"]');
    expect(shown('[fivex-consent="banner"]')).toBe(false);
    expect(shown('[fivex-consent="manager"]')).toBe(true);
    expect(api!.has("stat")).toBe(true);
    expect(loads).toEqual(expect.arrayContaining(["stat", "ads"]));
  });

  it("deny stores a decision but runs nothing, and the banner stays away on the next visit", () => {
    boot();
    click('[fivex-consent="deny"]');
    expect(loads).toEqual([]);
    expect(api!.hasConsent()).toBe(true);
    api!.destroy();
    document.body.innerHTML = BANNER;
    boot();
    expect(shown('[fivex-consent="banner"]')).toBe(false);
    expect(api!.has("stat")).toBe(false);
  });

  it("open-preferences switches from banner to preferences; checkboxes reflect state; submit saves", () => {
    boot();
    click('[fivex-consent="banner"] [fivex-consent="open-preferences"]');
    expect(shown('[fivex-consent="banner"]')).toBe(false);
    expect(shown('[fivex-consent="preferences"]')).toBe(true);
    const box = (c: string) => document.querySelector<HTMLInputElement>(`[fivex-consent-checkbox="${c}"]`)!;
    expect(box("analytics").checked).toBe(false);
    expect(box("necessary").checked).toBe(true);
    expect(box("necessary").disabled).toBe(true);
    box("analytics").checked = true;
    document.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(api!.hasCategory("analytics")).toBe(true);
    expect(api!.hasCategory("marketing")).toBe(false);
    expect(loads).toEqual(["stat"]);
    expect(shown('[fivex-consent="preferences"]')).toBe(false);
    // reopen: reflects stored state
    api!.open();
    expect(box("analytics").checked).toBe(true);
    expect(box("marketing").checked).toBe(false);
  });

  it("hides checkbox rows for categories without a configured service", () => {
    boot({ services: { stat: true } });
    api!.open();
    expect(shown('[fivex-consent-category="marketing"]')).toBe(false);
    expect(shown('[fivex-consent-category="analytics"]')).toBe(true);
    expect(api!.categories).toEqual(["analytics"]);
  });

  it("closing preferences without a choice brings the banner back; Escape closes", () => {
    boot();
    api!.open();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(shown('[fivex-consent="preferences"]')).toBe(false);
    expect(shown('[fivex-consent="banner"]')).toBe(true);
  });

  it("preferences is a labelled dialog and takes focus", () => {
    boot();
    api!.open();
    const p = document.querySelector<HTMLElement>('[fivex-consent="preferences"]')!;
    expect(p.getAttribute("role")).toBe("dialog");
    expect(p.getAttribute("aria-modal")).toBe("true");
    expect(p.contains(document.activeElement)).toBe(true);
  });

  it("revision bump asks again", () => {
    boot({ revision: 1, services: { stat: true } });
    click('[fivex-consent="allow"]');
    api!.destroy();
    document.body.innerHTML = BANNER;
    loads.length = 0;
    boot({ revision: 2, services: { stat: true } });
    expect(shown('[fivex-consent="banner"]')).toBe(true);
    expect(loads).toEqual([]);
  });

  it("withdrawing consent for a loaded service reloads the page and clears its cookies", () => {
    boot();
    click('[fivex-consent="allow"]');
    document.cookie = "stat_cx=1; Path=/";
    api!.open();
    document.querySelectorAll<HTMLInputElement>("[fivex-consent-checkbox]").forEach((i) => (i.checked = false));
    document.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(reload).toHaveBeenCalledOnce();
    expect(document.cookie).not.toContain("stat_cx");
  });

  it("scroll lock applies while the preferences are open", () => {
    document.querySelector('[fivex-consent="preferences"]')!.setAttribute("fivex-consent-scroll", "lock");
    boot();
    api!.open();
    expect(document.body.style.overflow).toBe("hidden");
    api!.close();
    expect(document.body.style.overflow).toBe("");
  });
});

describe("blocked scripts", () => {
  it("run only after consent, by category and by service", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<script type="fivex-consent" fivex-consent-categories="analytics">window.__a=1</script>
       <script type="fivex-consent" fivex-consent-service="ads">window.__b=1</script>`,
    );
    boot();
    const w = window as unknown as Record<string, unknown>;
    expect(w.__a).toBeUndefined();
    expect(document.querySelectorAll('script[type="fivex-consent"]').length).toBe(2);
    api!.open();
    document.querySelector<HTMLInputElement>('[fivex-consent-checkbox="analytics"]')!.checked = true;
    document.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(document.querySelectorAll('script[type="fivex-consent"]').length).toBe(1);
    expect(w.__b).toBeUndefined();
  });

  it("uncategorized scripts need full consent", () => {
    document.body.insertAdjacentHTML("beforeend", `<script type="fivex-consent">window.__u=1</script>`);
    boot();
    click('[fivex-consent="allow"]');
    expect(document.querySelectorAll('script[type="fivex-consent"]').length).toBe(0);
  });
});

describe("embeds", () => {
  const IFRAME = `<div id="w"><iframe fivex-consent-service="vid" fivex-consent-src="https://player.vid.test/v/1"></iframe></div>`;

  it("renders an accessible default placeholder and does not set src before consent", () => {
    document.body.insertAdjacentHTML("beforeend", IFRAME);
    boot({ services: { vid: true }, privacyUrl: "/datenschutz" });
    const iframe = document.querySelector("iframe")!;
    expect(iframe.getAttribute("src")).toBeNull();
    const ph = document.querySelector(".fivex-consent-placeholder")!;
    expect(ph.getAttribute("role")).toBe("group");
    expect(ph.textContent).toContain("Video von vid.");
    expect(ph.textContent).toContain("Inhalt laden");
    expect(ph.textContent).toContain("Immer erlauben");
    expect(ph.querySelector("a")!.getAttribute("href")).toBe("/datenschutz");
  });

  it("is English when lang=en", () => {
    document.body.insertAdjacentHTML("beforeend", IFRAME);
    boot({ lang: "en", services: { vid: true } });
    expect(document.querySelector(".fivex-consent-placeholder")!.textContent).toContain("Load content");
  });

  it("'load' loads only this embed's service for the session, without storing consent", () => {
    document.body.insertAdjacentHTML("beforeend", IFRAME);
    boot({ services: { vid: true, stat: true } });
    click(".fivex-consent-placeholder__btn--load");
    expect(document.querySelector("iframe")!.getAttribute("src")).toBe("https://player.vid.test/v/1");
    expect(document.querySelector(".fivex-consent-placeholder")).toBeNull();
    expect(api!.has("vid")).toBe(true);
    expect(api!.has("stat")).toBe(false);
    expect(api!.hasConsent()).toBe(false);
  });

  it("'always allow' stores consent for that service only", () => {
    document.body.insertAdjacentHTML("beforeend", IFRAME);
    boot({ services: { vid: true, stat: true } });
    click(".fivex-consent-placeholder__btn--always");
    expect(api!.getConsent()!.svc).toEqual({ vid: true });
    expect(api!.has("vid")).toBe(true);
    expect(api!.hasCategory("functional")).toBe(false);
    expect(api!.has("stat")).toBe(false);
  });

  it("'always allow' before any banner decision keeps the banner visible and is not a decision", () => {
    document.body.insertAdjacentHTML("beforeend", IFRAME);
    boot({ services: { vid: true, stat: true } });
    click(".fivex-consent-placeholder__btn--always");
    expect(api!.getConsent()).toMatchObject({ svc: { vid: true }, decided: false });
    expect(api!.hasConsent()).toBe(false);
    expect(shown('[fivex-consent="banner"]')).toBe(true);
    expect(shown('[fivex-consent="manager"]')).toBe(false);
    expect(((window as unknown as { dataLayer?: { event: string }[] }).dataLayer ?? []).some((e) => e.event === "fivex_consent_update")).toBe(false);
    // survives a reload: grant still there, banner still shown
    api!.destroy();
    document.body.innerHTML = BANNER + IFRAME;
    boot({ services: { vid: true, stat: true } });
    expect(api!.has("vid")).toBe(true);
    expect(api!.hasConsent()).toBe(false);
    expect(shown('[fivex-consent="banner"]')).toBe(true);
    expect(document.querySelector("iframe")!.getAttribute("src")).toBe("https://player.vid.test/v/1");
  });

  it("a later category decision turns the record into a decision and hides the banner", () => {
    document.body.insertAdjacentHTML("beforeend", IFRAME);
    boot({ services: { vid: true, stat: true } });
    click(".fivex-consent-placeholder__btn--always");
    click('[fivex-consent="allow"]');
    expect(api!.hasConsent()).toBe(true);
    expect(shown('[fivex-consent="banner"]')).toBe(false);
  });

  it("closing the preferences without a decision brings the banner back after a service grant", () => {
    document.body.insertAdjacentHTML("beforeend", IFRAME);
    boot({ services: { vid: true } });
    click(".fivex-consent-placeholder__btn--always");
    api!.open();
    api!.close();
    expect(shown('[fivex-consent="banner"]')).toBe(true);
  });

  it("deny after a service grant withdraws it (reload) and keeps the decision", () => {
    document.body.insertAdjacentHTML("beforeend", IFRAME);
    boot({ services: { vid: true } });
    click(".fivex-consent-placeholder__btn--always");
    click('[fivex-consent="deny"]');
    expect(reload).toHaveBeenCalled();
    expect(api!.getConsent()).toMatchObject({ decided: true, svc: {} });
  });

  it("refuses iframe sources outside the service's hosts", () => {
    document.body.insertAdjacentHTML("beforeend", `<iframe fivex-consent-service="vid" fivex-consent-src="https://evil.test/x"></iframe>`);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    boot({ services: { vid: true } });
    click(".fivex-consent-placeholder__btn--load");
    expect(document.querySelector("iframe")!.getAttribute("src")).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("uses a designed placeholder with a load-embed button", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div><div fivex-consent-placeholder id="ph"><span fivex-consent-field="vendor"></span><button fivex-consent="load-embed">Los</button></div>
       <iframe fivex-consent-service="vid" fivex-consent-src="https://player.vid.test/a"></iframe></div>`,
    );
    boot({ services: { vid: true } });
    expect(document.querySelector(".fivex-consent-placeholder")).toBeNull();
    expect(document.querySelector("#ph span")!.textContent).toBe("vid");
    click("#ph button");
    expect(document.querySelector("iframe")!.getAttribute("src")).toBe("https://player.vid.test/a");
    expect(shown("#ph")).toBe(false);
  });

  it("renders html containers after consent (scripts stripped) and then runs the service loader", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div id="c" fivex-consent-service="cal" fivex-consent-html="&lt;div data-x&gt;&lt;/div&gt;&lt;script&gt;window.__pwn=1&lt;/script&gt;"></div>`,
    );
    boot({ services: { cal: true } });
    expect(document.querySelector("#c [data-x]")).toBeNull();
    api!.accept("cal");
    expect(document.querySelector("#c [data-x]")).not.toBeNull();
    expect(document.querySelector("#c script")).toBeNull();
    expect(loads).toEqual(["cal:1"]);
  });

  it("auto-adds services found on the page but missing from the config", () => {
    document.body.insertAdjacentHTML("beforeend", IFRAME);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    boot({ services: {} });
    expect(api!.services).toEqual(["vid"]);
    info.mockRestore();
  });
});

describe("API", () => {
  it("onConsent fires immediately when already consented and on later consent otherwise", () => {
    boot();
    const cb = vi.fn();
    api!.onConsent("stat", cb);
    expect(cb).not.toHaveBeenCalled();
    click('[fivex-consent="allow"]');
    expect(cb).toHaveBeenCalledOnce();
    const late = vi.fn();
    api!.onConsent("analytics", late);
    expect(late).toHaveBeenCalledOnce();
  });

  it("pushes GTM-friendly dataLayer events", () => {
    boot();
    click('[fivex-consent="allow"]');
    const events = ((window as unknown as { dataLayer: { event: string }[] }).dataLayer).map((e) => e.event);
    expect(events).toEqual(expect.arrayContaining(["analytics-activated", "marketing-activated", "fivex_consent_update"]));
  });

  it("warns about unknown services", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    boot({ services: { nope: true } });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("renders the optional service list with cookie rows in the current language", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div fivex-consent-services="analytics"><div fivex-consent-template><b fivex-consent-field="label"></b><i fivex-consent-field="vendor"></i><a fivex-consent-field="privacy-link"></a>
        <table><tbody><tr fivex-consent-cookie-template><td fivex-consent-field="name"></td><td fivex-consent-field="duration"></td><td fivex-consent-field="purpose"></td></tr></tbody></table></div></div>`,
    );
    boot();
    const host = document.querySelector('[fivex-consent-services="analytics"]')!;
    expect(host.querySelectorAll("[fivex-consent-template]").length).toBe(0);
    expect(host.querySelector("b")!.textContent).toBe("stat");
    expect(host.querySelector("a")!.getAttribute("href")).toBe("https://x.test/privacy");
    expect(host.querySelector("tbody")!.textContent).toBe("stat_c*1 Tagz");
  });
});

describe("Google Consent Mode (real ga4 service)", () => {
  beforeEach(() => {
    document.body.innerHTML = BANNER;
  });

  it("sets all signals to denied before any gtag.js is injected, and injects only after consent", () => {
    const w = window as unknown as { dataLayer: unknown[] };
    delete (window as unknown as Record<string, unknown>).gtag;
    delete (window as unknown as Record<string, unknown>)[`__${GLOBAL}ModeDefault`];
    boot({ services: { ga4: { id: "G-TEST123" } } }, SERVICES);
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
    const first = Array.from(w.dataLayer[0] as ArrayLike<unknown>);
    expect(first.slice(0, 2)).toEqual(["consent", "default"]);
    expect(first[2]).toMatchObject({ analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    click('[fivex-consent="allow"]');
    const cmds = w.dataLayer.filter((e) => Array.isArray(e) || typeof (e as { length?: number }).length === "number").map((e) => Array.from(e as ArrayLike<unknown>));
    const update = cmds.findIndex((c) => c[0] === "consent" && c[1] === "update");
    expect(update).toBeGreaterThan(0);
    expect((cmds[update][2] as Record<string, string>).analytics_storage).toBe("granted");
    expect(document.querySelector('script[src^="https://www.googletagmanager.com/gtag/js?id=G-TEST123"]')).not.toBeNull();
  });

  it("rejects an invalid measurement id", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    boot({ services: { ga4: { id: "G-x\"><script>" } } }, SERVICES);
    click('[fivex-consent="allow"]');
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
    warn.mockRestore();
  });
});

describe("withdrawal sweep", () => {
  it("erases the service cookies again on the next page load (scripts may rewrite them while unloading)", () => {
    boot();
    click('[fivex-consent="allow"]');
    document.cookie = "stat_c1=1; Path=/";
    click('[fivex-consent="open-preferences"]');
    document.querySelector<HTMLInputElement>('[fivex-consent-checkbox="analytics"]')!.checked = false;
    click('button[type="submit"]');
    expect(reload).toHaveBeenCalled();
    expect(document.cookie).not.toContain("stat_c1");
    document.cookie = "stat_c1=again; Path=/"; // rewritten during unload
    api!.destroy();
    document.body.innerHTML = BANNER;
    boot();
    expect(document.cookie).not.toContain("stat_c1");
    expect(sessionStorage.getItem(`${GLOBAL}:sweep`)).toBeNull();
  });
});

describe("Google Tag Manager", () => {
  const w = window as unknown as { dataLayer: unknown[] };
  const cmds = () =>
    w.dataLayer.filter((e) => typeof (e as { length?: number }).length === "number").map((e) => Array.from(e as ArrayLike<unknown>));
  const updates = () => cmds().filter((c) => c[0] === "consent" && c[1] === "update");
  const gtmScripts = () => document.querySelectorAll('script[src*="gtm.js"]');
  beforeEach(() => {
    delete (window as unknown as Record<string, unknown>).gtag;
    delete (window as unknown as Record<string, unknown>)[`__${GLOBAL}ModeDefault`];
  });

  it("defaults to the analytics category and may be configured to marketing or functional", () => {
    expect(SERVICES.gtm.category).toBe("analytics");
    expect(SERVICES.gtm.categories).toEqual(["analytics", "marketing", "functional"]);
  });

  it("does not load the container before consent, but defines Consent Mode defaults (all denied)", () => {
    boot({ services: { gtm: { id: "GTM-TEST123" } } }, SERVICES);
    expect(gtmScripts().length).toBe(0);
    const first = cmds()[0];
    expect(first.slice(0, 2)).toEqual(["consent", "default"]);
    expect(first[2]).toMatchObject({ analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    expect(updates()).toHaveLength(0);
  });

  it("does not load after 'deny all'", () => {
    boot({ services: { gtm: { id: "GTM-TEST123" } } }, SERVICES);
    click('[fivex-consent="deny"]');
    expect(gtmScripts().length).toBe(0);
    expect(reload).not.toHaveBeenCalled();
  });

  it("loads after consent to the analytics category with signals set from the choices", () => {
    boot({ services: { gtm: { id: "GTM-TEST123" } } }, SERVICES);
    click('[fivex-consent="allow"]');
    expect(document.querySelector('script[src^="https://www.googletagmanager.com/gtm.js?id=GTM-TEST123"]')).not.toBeNull();
    expect(gtmScripts().length).toBe(1);
    expect(updates().at(-1)![2]).toMatchObject({ analytics_storage: "granted", ad_storage: "granted", functionality_storage: "granted" });
    // the signals are set before the container script is injected
    const defaultIdx = cmds().findIndex((c) => c[0] === "consent" && c[1] === "default");
    expect(defaultIdx).toBe(0);
  });

  const submit = () => document.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  const tick = (name: string, on: boolean) => (document.querySelector<HTMLInputElement>(`[fivex-consent-checkbox="${name}"]`)!.checked = on);

  it("respects cfg.category: with 'marketing' analytics consent alone does not load the container", () => {
    boot({ services: { gtm: { id: "GTM-TEST123", category: "marketing" } } }, SERVICES);
    expect(api!.categories).toContain("marketing");
    tick("analytics", true);
    tick("marketing", false);
    submit();
    expect(gtmScripts().length).toBe(0);
  });

  it("respects cfg.category: marketing consent loads the container and grants only the marketing signals", () => {
    boot({ services: { gtm: { id: "GTM-TEST123", category: "marketing" } } }, SERVICES);
    tick("analytics", false);
    tick("marketing", true);
    submit();
    expect(gtmScripts().length).toBe(1);
    expect(updates().at(-1)![2]).toMatchObject({ analytics_storage: "denied", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted", functionality_storage: "denied" });
  });

  it("ignores an unknown cfg.category and keeps the default", () => {
    boot({ services: { gtm: { id: "GTM-TEST123", category: "necessary" } } }, SERVICES);
    expect(gtmScripts().length).toBe(0);
    expect(api!.hasCategory("analytics")).toBe(false);
  });

  it("revoking the category reloads the page (the container stops loading)", () => {
    boot({ services: { gtm: { id: "GTM-TEST123" } } }, SERVICES);
    click('[fivex-consent="allow"]');
    click('[fivex-consent="open-preferences"]');
    click('[fivex-consent="deny"]');
    expect(reload).toHaveBeenCalled();
  });

  describe("explicit opt-in beforeConsent: true", () => {
    it("loads the container on page load with all signals denied", () => {
      boot({ services: { gtm: { id: "GTM-TEST123", beforeConsent: true } } }, SERVICES);
      expect(document.querySelector('script[src^="https://www.googletagmanager.com/gtm.js?id=GTM-TEST123"]')).not.toBeNull();
      const first = cmds()[0];
      expect(first.slice(0, 2)).toEqual(["consent", "default"]);
      expect(first[2]).toMatchObject({ analytics_storage: "denied", ad_storage: "denied" });
      expect(updates()[0][2]).toMatchObject({ analytics_storage: "denied", ad_storage: "denied" });
    });

    it("only updates the signals after a choice, without a second container and without a reload", () => {
      boot({ services: { gtm: { id: "GTM-TEST123", beforeConsent: true } } }, SERVICES);
      click('[fivex-consent="allow"]');
      expect(gtmScripts().length).toBe(1);
      expect(updates().at(-1)![2]).toMatchObject({ analytics_storage: "granted", ad_storage: "granted", functionality_storage: "granted" });
      click('[fivex-consent="open-preferences"]');
      click('[fivex-consent="deny"]');
      expect(updates().at(-1)![2]).toMatchObject({ analytics_storage: "denied", ad_storage: "denied" });
      expect(reload).not.toHaveBeenCalled();
    });

    it("only a literal true counts", () => {
      boot({ services: { gtm: { id: "GTM-TEST123", beforeConsent: "yes" } } }, SERVICES);
      expect(gtmScripts().length).toBe(0);
    });
  });
});
