import type { ServiceDef } from "../types";
import { scan } from "../lib/embed";

/**
 * Trustpilot TrustBox widgets (<div class="trustpilot-widget" ...>). cfg: `true` / `{}` (no options).
 * Loads Trustpilot's public bootstrap script, which renders all TrustBoxes on the page.
 * Category functional: displays third-party review content; no advertising purpose documented.
 */
const service: ServiceDef = {
  id: "trustpilot",
  vendor: "Trustpilot A/S",
  vendorUrl: "https://www.trustpilot.com",
  privacyUrl: "https://legal.trustpilot.com/for-reviewers/privacy-policy",
  category: "functional",
  label: { de: "Trustpilot", en: "Trustpilot" },
  description: {
    de: "Zeigt Bewertungen von Trustpilot auf dieser Seite an. Dabei wird eine Verbindung zu Trustpilot-Servern aufgebaut und Ihre IP-Adresse übertragen.",
    en: "Displays Trustpilot reviews on this page. A connection to Trustpilot servers is made and your IP address is transmitted.",
  },
  cookies: [],
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. tp.widget.bootstrap.min.js loaded and rendered a TrustBox (iframe, data and view statistics requests succeeded) with a public business unit. Two containers released one after another, a late container after \"allow all\" and two at once each rendered a TrustBox (Trustpilot.loadFromElement).",
    observed: "No cookies or storage keys observed in the sandbox or on live websites using TrustBoxes.",
    liveSites: ["https://www.vistaprint.com/", "https://www.hostinger.com/"],
  },
  devNote: { de: "Das Bewertungs-Widget (TrustBox) setzte in unseren Tests weder Cookies noch Speichereinträge; beim Laden werden Aufrufstatistiken (Impression/View) an Trustpilot gesendet und die IP-Adresse übertragen.", en: "The review widget (TrustBox) set no cookies or storage entries in our tests; on load it sends view statistics (impression/view) to Trustpilot and your IP address is transmitted." },
  visitorNote: {
    de: "Beim Laden werden Aufrufstatistiken an Trustpilot gesendet.",
    en: "Loading the reviews sends view statistics to Trustpilot.",
  },
  cookieless: true,
  sources: ["https://legal.trustpilot.com/for-everyone/cookie-policy"],
  embed: {
    hosts: ["widget.trustpilot.com", "trustpilot.com"],
    markup: {
      example:
        '<div class="trustpilot-widget" data-locale="de-DE" data-template-id="5419b6a8b0d04a076446a9ad" data-businessunit-id="YOUR_BUSINESS_UNIT_ID" data-style-height="24px" data-style-width="100%"><a href="https://de.trustpilot.com/review/example.com" target="_blank" rel="noopener">Trustpilot</a></div>',
    },
    placeholder: {
      de: "Diese Bewertungen werden von Trustpilot bereitgestellt. Beim Laden werden Daten an Trustpilot übertragen.",
      en: "These reviews are provided by Trustpilot. Loading them transmits data to Trustpilot.",
    },
  },
  load(ctx) {
    return ctx.loadScript("https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js");
  },
  refresh(ctx, el) {
    const tp = ctx.win.Trustpilot as { loadFromElement?: (el: HTMLElement, force?: boolean) => void } | undefined;
    if (!tp?.loadFromElement) return;
    for (const w of scan(el, ".trustpilot-widget")) if (!w.querySelector("iframe")) tp.loadFromElement(w, true);
  },
};
export default service;
