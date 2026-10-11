/**
 * Tally (forms). cfg (optional): none required.
 * Container usage: blocked iframe on tally.so/embed/<id> (fivex-consent-src), or a container with
 * <iframe data-tally-src="https://tally.so/embed/<id>"> / <button data-tally-open="<id>"> that widgets/embed.js starts (refresh() calls Tally.loadEmbeds() for containers released after it ran).
 */
import type { ServiceDef } from "../types";
import { scan } from "../lib/embed";

const service: ServiceDef = {
  id: "tally",
  vendor: "Tally BV",
  vendorUrl: "https://tally.so",
  privacyUrl: "https://tally.so/help/terms-and-privacy",
  category: "functional",
  label: { de: "Tally", en: "Tally" },
  description: {
    de: "Bindet ein Formular von Tally ein. Dabei wird Ihre IP-Adresse an Server von Tally übertragen.",
    en: "Embeds a form from Tally. Your IP address is transmitted to Tally servers.",
  },
  cookies: [],
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. The embed iframe (tally.so/embed/<id>) and widgets/embed.js loaded with a public form. Two containers (<iframe data-tally-src>) released one after another, a late container after \"allow all\" and two at once each loaded the form (Tally.loadEmbeds()).",
    observed: "No cookies or storage keys observed in the sandbox or on tally.so's own form embed.",
  },
  devNote: { de: "Das eingebettete Formular setzte in unseren Tests weder Cookies noch Speichereinträge.", en: "The embedded form set no cookies or storage entries in our tests." },
  cookieless: true,
  sources: ["https://tally.so/help/terms-and-privacy"],
  load(ctx) {
    return ctx.loadScript("https://tally.so/widgets/embed.js");
  },
  refresh(ctx, el) {
    const tally = ctx.win.Tally as { loadEmbeds?: () => void } | undefined;
    if (tally?.loadEmbeds && scan(el, "iframe[data-tally-src],[data-tally-open]").length) tally.loadEmbeds();
  },
  embed: {
    hosts: ["tally.so"],
    markup: {
      elements: ["iframe"],
      example: '<iframe data-tally-src="https://tally.so/embed/abc123?dynamicHeight=1" loading="lazy" width="100%" height="276" title="Formular"></iframe>',
    },
    placeholder: {
      de: "Dieses Formular wird von Tally bereitgestellt. Beim Laden werden Daten an Tally übertragen.",
      en: "This form is provided by Tally. Loading it transmits data to Tally.",
    },
  },
};
export default service;
