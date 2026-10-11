/**
 * Calendly inline widget. Config: window.FivexConsent.services.calendly = true
 * (no keys needed; the booking URL stays in the container: <div class="calendly-inline-widget" data-url="https://calendly.com/...">).
 * widget.js scans for inline widgets once, when it runs; containers released later are started with
 * Calendly.initInlineWidget (official API) by refresh().
 */
import type { ServiceDef } from "../types";
import { scan } from "../lib/embed";

const service: ServiceDef = {
  id: "calendly",
  vendor: "Calendly LLC",
  vendorUrl: "https://calendly.com",
  privacyUrl: "https://calendly.com/privacy",
  category: "functional",
  label: { de: "Calendly", en: "Calendly" },
  description: {
    de: "Zeigt die Online-Terminbuchung von Calendly an. Dabei wird Ihre IP-Adresse an Server von Calendly übertragen.",
    en: "Shows the Calendly online booking widget. Your IP address is transferred to Calendly servers.",
  },
  cookies: [
    {
      name: "__cf_bm",
      duration: { de: "30 Minuten", en: "30 minutes" },
      description: { de: "Cloudflare-Bot-Schutz (HttpOnly, calendly.com).", en: "Cloudflare bot management (HttpOnly, calendly.com)." },
      evidence: ["observed"],
    },
    {
      name: "_cfuvid",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Cloudflare: unterscheidet Besucher hinter derselben IP für Ratenbegrenzung (HttpOnly, calendly.com).", en: "Cloudflare: tells visitors behind the same IP apart for rate limiting (HttpOnly, calendly.com)." },
      evidence: ["observed"],
    },
    {
      name: "OptanonConsent",
      duration: { de: "12 Monate", en: "12 months" },
      description: { de: "Speichert die Cookie-Einwilligung innerhalb des Calendly-Widgets (OneTrust, calendly.com).", en: "Stores the cookie consent inside the Calendly widget (OneTrust, calendly.com)." },
      evidence: ["observed"],
    },
    {
      name: "_cache",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Zwischenspeicher der Buchungsseite (calendly.com).", en: "Cache of the booking page (calendly.com)." },
      evidence: ["observed"],
    },
  ],
  devNote: {
    de: "Das Calendly-Widget lädt weitere Dienste (Stripe, Google reCAPTCHA, OneTrust). Deren Einträge (Stripe: Cookie m und Session-Storage-Schlüssel _ab, _mf; reCAPTCHA: rc::a, rc::c) stammen nicht von einer Calendly-Domain und sind deshalb nicht aufgeführt. Inhalt und Umfang können je nach Calendly-Konto variieren.",
    en: "The Calendly widget loads further services (Stripe, Google reCAPTCHA, OneTrust). Their entries (Stripe: cookie m and session storage keys _ab, _mf; reCAPTCHA: rc::a, rc::c) do not come from a Calendly origin and are therefore not listed. Scope can vary per Calendly account.",
  },
  visitorNote: {
    de: "Beim Buchen können weitere Anbieter (z. B. für Zahlung oder Bot-Schutz) eigene Cookies und Speichereinträge setzen.",
    en: "While booking, further providers (for example for payment or bot protection) may set their own cookies and storage entries.",
  },
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. widget.js and an inline booking widget (public demo account) loaded. Two containers released one after another, a late container after \"allow all\" and two containers at once each rendered an inline widget (Calendly.initInlineWidget for containers released after widget.js ran).",
    observed: "Cookies and storage keys of calendly.com observed in the sandbox. Entries written by embedded third parties (Stripe, reCAPTCHA) are not attributed to Calendly.",
  },
  sources: ["https://calendly.com/help/embed-options-overview", "https://calendly.com/privacy"],
  load(ctx) {
    if (!ctx.doc.querySelector('link[href="https://assets.calendly.com/assets/external/widget.css"]')) {
      const link = ctx.doc.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://assets.calendly.com/assets/external/widget.css";
      ctx.doc.head.appendChild(link);
    }
    return ctx.loadScript("https://assets.calendly.com/assets/external/widget.js");
  },
  refresh(ctx, el) {
    const calendly = ctx.win.Calendly as { initInlineWidget?: (o: { url: string; parentElement: HTMLElement }) => void } | undefined;
    if (!calendly?.initInlineWidget) return;
    for (const w of scan(el, ".calendly-inline-widget[data-url]")) {
      if (w.getAttribute("data-processed") || w.querySelector("iframe")) continue; // widget.js already started it
      const url = w.getAttribute("data-url") ?? "";
      if (!/^https:\/\/calendly\.com\//.test(url)) continue;
      w.setAttribute("data-processed", "true");
      calendly.initInlineWidget({ url, parentElement: w });
    }
  },
  embed: {
    hosts: ["calendly.com"],
    markup: { example: '<div class="calendly-inline-widget" data-url="https://calendly.com/you/30min"></div>' },
    placeholder: {
      de: "Die Terminbuchung wird von Calendly bereitgestellt. Beim Laden werden Daten an Calendly übertragen.",
      en: "The booking widget is provided by Calendly. Loading it transfers data to Calendly.",
    },
  },
};
export default service;
