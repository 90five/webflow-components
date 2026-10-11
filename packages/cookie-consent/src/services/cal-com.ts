/**
 * Cal.com inline embed. Config: window.FivexConsent.services["cal-com"] = true | { origin?: "https://cal.com" | "https://app.cal.com" }
 * origin defaults to https://app.cal.com (host of embed.js). Booking link: a container with
 * <div data-cal-link="username/event" data-cal-config='{"layout":"month_view"}'> (refresh() creates a Cal.com namespace per container and calls its "inline" API), the Cal.com
 * embed snippet in a blocked script, or an iframe.
 */
import type { ServiceDef } from "../types";
import { claim, scan } from "../lib/embed";

const ORIGINS = ["https://cal.com", "https://app.cal.com"];
let nsCount = 0;

const service: ServiceDef = {
  id: "cal-com",
  vendor: "Cal.com, Inc.",
  vendorUrl: "https://cal.com",
  privacyUrl: "https://cal.com/privacy",
  category: "functional",
  label: { de: "Cal.com", en: "Cal.com" },
  description: {
    de: "Zeigt die Online-Terminbuchung von Cal.com an. Dabei wird Ihre IP-Adresse an Server von Cal.com übertragen.",
    en: "Shows the Cal.com online booking widget. Your IP address is transferred to Cal.com servers.",
  },
  cookies: [
    {
      name: "__cf_bm",
      duration: { de: "30 Minuten", en: "30 minutes" },
      description: { de: "Cloudflare-Bot-Schutz (Cal.com, HttpOnly, Drittanbieter-Cookie auf cal.com).", en: "Cloudflare bot management (Cal.com, HttpOnly, third-party cookie on cal.com)." },
      evidence: ["observed"],
    },
  ],
  devNote: { de: "Laut Cal.com-Datenschutzerklärung nutzt die App Cookies für Login, Einstellungen und Sicherheit und keine Werbe-Cookies von Drittanbietern. Im Test wurde nur __cf_bm gesetzt; bei einer Buchung können weitere hinzukommen.", en: "Per Cal.com's privacy page the app uses cookies for login, preferences and security and no third-party advertising cookies. Only __cf_bm was set in the test; further cookies may appear during an actual booking." },
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. The embed script and an inline booking page (app.cal.com) loaded; window.Cal queue stub works. Two containers released one after another, a late container after \"allow all\" and two at once each rendered an inline booking page (one Cal.com namespace per container; a second inline embed in the same namespace is ignored by Cal.com).",
    observed: "Cookie __cf_bm set by cal.com observed in the sandbox (public demo link).",
  },
  sources: ["https://cal.com/docs/llms.txt", "https://cal.com/privacy"],
  init(ctx) {
    // Queue-only stand-in for the official snippet's `Cal` function: no request is made. Calls from
    // consent-gated scripts (Cal("inline", ...)) are collected and replayed by embed.js after consent.
    const w = ctx.win;
    if (typeof w.Cal === "function") return;
    const cal: any = function (...args: unknown[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (args[0] === "init" && typeof args[1] === "string") {
        // namespaced init: Cal("init", "ns", {...}) -> Cal.ns[ns] queue, as in the official snippet
        const ns = args[1];
        const api: any = function (...a: unknown[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
          (api.q = api.q || []).push(a);
        };
        api.q = [];
        cal.ns[ns] = cal.ns[ns] || api;
        cal.ns[ns].q.push(args);
        cal.q.push(["initNamespace", ns]);
        return;
      }
      cal.q.push(args);
    };
    cal.ns = {};
    cal.q = [];
    w.Cal = cal;
  },
  load(ctx) {
    const origin = typeof ctx.cfg.origin === "string" ? ctx.cfg.origin : "https://app.cal.com";
    if (!ORIGINS.includes(origin)) {
      console.warn("[FivexConsent] cal-com: invalid origin");
      return;
    }
    const cal = ctx.win.Cal;
    if (cal && !cal.loaded) {
      cal.loaded = true; // embed.js checks this and processes Cal.q / Cal.ns
      if (!(cal.q as unknown[][]).some((c) => c[0] === "init")) cal.q.unshift(["init", { origin }]);
    }
    return ctx.loadScript(origin + "/embed/embed.js");
  },
  refresh(ctx, el) {
    // embed.js does not scan the page: every inline embed is created with Cal("inline", ...), as in Cal.com's snippet
    // Cal.com allows ONE inline embed per namespace ("Inline embed already exists. Ignoring this call"), so each container gets its own.
    const cal = ctx.win.Cal as (((...args: unknown[]) => void) & { ns?: Record<string, (...args: unknown[]) => void> }) | undefined;
    if (typeof cal !== "function") return;
    const origin = typeof ctx.cfg.origin === "string" && ORIGINS.includes(ctx.cfg.origin) ? ctx.cfg.origin : "https://app.cal.com";
    for (const w of scan(el, "[data-cal-link]")) {
      const link = w.getAttribute("data-cal-link") ?? "";
      if (!/^[\w.~-]+(\/[\w.~-]+)*$/.test(link) || !claim(w)) continue;
      let config: Record<string, unknown> = {};
      try {
        const parsed: unknown = JSON.parse(w.getAttribute("data-cal-config") || "{}");
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) config = parsed as Record<string, unknown>;
      } catch {
        /* invalid JSON: defaults */
      }
      const ns = "fivex-" + ++nsCount;
      cal("init", ns, { origin });
      const api = cal.ns?.[ns];
      if (typeof api !== "function") continue;
      api("inline", { elementOrSelector: w, calLink: link, config });
    }
  },
  embed: {
    hosts: ["cal.com", "app.cal.com"],
    markup: { example: '<div class="cal-inline" data-cal-link="username/30min" data-cal-config=\'{"layout":"month_view"}\'></div>' },
    placeholder: {
      de: "Die Terminbuchung wird von Cal.com bereitgestellt. Beim Laden werden Daten an Cal.com übertragen.",
      en: "The booking widget is provided by Cal.com. Loading it transfers data to Cal.com.",
    },
  },
};
export default service;
