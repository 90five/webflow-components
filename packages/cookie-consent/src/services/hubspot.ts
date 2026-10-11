import type { ServiceDef } from "../types";
import { claim, scan, until } from "../lib/embed";

let formCount = 0;

/**
 * HubSpot. Two separate things:
 * - Tracking code (`load`, `tracker: true`): cfg `{ id: "1234567" }` (HubSpot portal/Hub ID, digits only). Loads
 *   js.hs-scripts.com/<id>.js, which identifies visitors, links them to CRM contacts and can start chat. Runs only with the
 *   marketing consent, never because of an embed.
 * - Forms (`loadEmbed` + `refresh`): a container `<div class="hs-form-html" data-region data-portal-id data-form-id>` is
 *   rendered with `hbspt.forms.create` from js.hsforms.net/forms/embed/v2.js only. That is all a one-off or "always allow" form loads.
 *   Iframes of HubSpot forms / meetings are covered via `embed.hosts`.
 * Category marketing.
 */
const service: ServiceDef = {
  id: "hubspot",
  vendor: "HubSpot Ireland Ltd.",
  vendorUrl: "https://www.hubspot.de",
  privacyUrl: "https://legal.hubspot.com/de/privacy-policy",
  category: "marketing",
  tracker: true,
  label: { de: "HubSpot", en: "HubSpot" },
  description: {
    de: "Zeigt HubSpot-Formulare an. Nutzt die Website den HubSpot-Tracking-Code, erfasst HubSpot nach Ihrer Einwilligung in Marketing außerdem Seitenaufrufe und ordnet Besucher Kontakten im HubSpot-CRM zu. Dabei werden Ihre IP-Adresse und Ihr Nutzungsverhalten an Server von HubSpot übertragen.",
    en: "Shows HubSpot forms. If the website uses the HubSpot tracking code, HubSpot also records page views and links visitors to contacts in the HubSpot CRM after your consent to marketing. Your IP address and usage behaviour are transmitted to HubSpot servers.",
  },
  visitorNote: {
    de: "Ein einzelnes Formular über „Inhalt laden“ oder „Immer erlauben“ lädt nur das Formular; die Besucherverfolgung von HubSpot startet erst mit Ihrer Einwilligung in Marketing.",
    en: "Loading a single form with \"Load content\" or \"Always allow\" loads only the form; HubSpot's visitor tracking starts only with your consent to marketing.",
  },
  cookies: [
    {
      name: "__hstc",
      duration: { de: "6 Monate", en: "6 months" },
      description: { de: "Haupt-Tracking-Cookie (Domain, Besucher-ID, Zeitstempel, Sitzungsnummer).", en: "Main visitor tracking cookie (domain, visitor ID, timestamps, session number)." },
      evidence: ["vendor-docs"],
    },
    {
      name: "hubspotutk",
      duration: { de: "6 Monate", en: "6 months" },
      description: { de: "Besucher-Kennung; wird beim Absenden von Formularen übertragen, um Kontakte zu deduplizieren.", en: "Visitor identifier, sent on form submission to deduplicate contacts." },
      evidence: ["vendor-docs"],
    },
    {
      name: "__hssc",
      duration: { de: "30 Minuten", en: "30 minutes" },
      description: { de: "Verfolgt Sitzungen.", en: "Tracks sessions." },
      evidence: ["vendor-docs"],
    },
    {
      name: "__hssrc",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Erkennt, ob der Browser neu gestartet wurde.", en: "Detects whether the browser was restarted." },
      evidence: ["vendor-docs"],
    },
    {
      name: "messagesUtk",
      duration: { de: "6 Monate", en: "6 months" },
      description: { de: "Erkennt Besucher, die den HubSpot-Chat nutzen.", en: "Recognises visitors who use HubSpot chat." },
      evidence: ["vendor-docs"],
    },
    {
      name: "hs-messages-is-open",
      duration: { de: "30 Minuten", en: "30 minutes" },
      description: { de: "Merkt, ob das Chat-Widget geöffnet ist.", en: "Remembers whether the chat widget is open." },
      evidence: ["vendor-docs"],
    },
    {
      name: "hs-messages-hide-welcome-message",
      duration: { de: "1 Tag", en: "1 day" },
      description: { de: "Blendet die Chat-Begrüßung nach dem Schließen aus.", en: "Hides the chat welcome message once dismissed." },
      evidence: ["vendor-docs"],
    },
    {
      name: "__cf_bm",
      duration: { de: "30 Minuten", en: "30 minutes" },
      description: { de: "Bot-Schutz des CDN-Anbieters von HubSpot (HttpOnly).", en: "Bot protection by HubSpot's CDN provider (HttpOnly)." },
      evidence: ["observed", "vendor-docs"],
    },
  ],
  devNote: {
    de: "Je nach Einrichtung kann HubSpot weitere Cookies setzen (z. B. __hs_opt_out, __hs_cookie_cat_pref). Ein Formular über „Inhalt laden“ / „Immer erlauben“ lädt nur js.hsforms.net/forms/embed/v2.js, nie den Tracking-Code (js.hs-scripts.com); dieser startet nur mit der Marketing-Einwilligung. Ein HubSpot-Portal kann im Tracking-Code zusätzliche Werbe-Pixel einbinden (z. B. Meta); diese erfordern eine eigene Konfiguration des jeweiligen Dienstes (z. B. meta-pixel) und werden von diesem Paket nicht gesteuert.",
    en: "Depending on setup HubSpot may set further cookies (e.g. __hs_opt_out, __hs_cookie_cat_pref). A form released with \"Load content\" / \"Always allow\" loads only js.hsforms.net/forms/embed/v2.js, never the tracking code (js.hs-scripts.com), which starts only with the marketing consent. A HubSpot portal can inject additional ad pixels (e.g. Meta) through its tracking code; these need the respective service configured separately (e.g. meta-pixel) and are not controlled by this package.",
  },
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. js.hs-scripts.com/<portalId>.js loaded after consent. A public form (portal 53) rendered in two containers released one after another, in a late container after \"allow all\" and in two at once, from js.hsforms.net/forms/embed/v2.js with hbspt.forms.create. A one-off load requested only js.hsforms.net, forms.hsforms.com and forms-na1.hsforms.com (set __cf_bm on hsforms.net / hsforms.com) and never js.hs-scripts.com; the tracking code was requested only after the marketing consent.",
    observed: "Tracking cookies observed on hubspot.com (writer: js.hs-analytics.net); the full list and durations are in HubSpot's documentation.",
    liveSites: ["https://www.hubspot.com/"],
  },
  sources: ["https://knowledge.hubspot.com/privacy-and-consent/what-cookies-does-hubspot-set-in-a-visitor-s-browser"],
  embed: {
    hosts: ["hsforms.com", "hsforms.net", "meetings.hubspot.com", "share.hsforms.com"],
    markup: { example: '<div class="hs-form-html" data-region="eu1" data-portal-id="1234567" data-form-id="00000000-0000-0000-0000-000000000000"></div>' },
    placeholder: {
      de: "Dieses Formular wird von HubSpot bereitgestellt. Beim Laden werden Daten an HubSpot übertragen.",
      en: "This form is provided by HubSpot. Loading it transmits data to HubSpot.",
    },
  },
  /** Tracking code. Without an `id` (forms only) nothing is loaded. */
  load(ctx) {
    if (ctx.cfg.id === undefined) return;
    const id = String(ctx.cfg.id);
    if (!/^\d{3,12}$/.test(id)) {
      console.warn("[FivexConsent] hubspot: invalid id");
      return;
    }
    return ctx.loadScript("https://js.hs-scripts.com/" + encodeURIComponent(id) + ".js", { id: "hs-script-loader" });
  },
  /** Forms library only: no tracking. */
  loadEmbed(ctx) {
    return ctx.loadScript("https://js.hsforms.net/forms/embed/v2.js");
  },
  async refresh(ctx, el) {
    // v2.js defines hbspt.forms.create a moment after its load event
    type Create = (o: Record<string, string>) => void;
    const create = await until<Create>(() => (ctx.win.hbspt as { forms?: { create?: Create } } | undefined)?.forms?.create);
    if (!create) return;
    for (const f of scan(el, ".hs-form-html")) {
      const portalId = f.getAttribute("data-portal-id") ?? "";
      const formId = f.getAttribute("data-form-id") ?? "";
      const region = f.getAttribute("data-region") ?? "";
      if (!/^\d{1,12}$/.test(portalId) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formId) || (region && !/^[a-z]{2,3}\d$/.test(region)) || !claim(f)) continue;
      f.id = "fivex-hs-form-" + ++formCount; // the forms API takes a CSS selector as target
      create({ portalId, formId, ...(region ? { region } : {}), target: "#" + f.id });
    }
  },
};
export default service;
