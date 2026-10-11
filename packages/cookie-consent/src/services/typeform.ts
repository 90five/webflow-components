/**
 * Typeform (forms). cfg (optional): none required.
 * Container usage: <div fivex-consent-service="typeform" fivex-consent-html="<div data-tf-live='FORM_ID'></div>"> (embed.js), or a blocked
 * iframe on form.typeform.com. embed.js renders the data-tf-* elements that exist when it runs; refresh() calls tf.load() for later containers.
 */
import type { ServiceDef } from "../types";
import { scan } from "../lib/embed";

const service: ServiceDef = {
  id: "typeform",
  vendor: "Typeform S.L.",
  vendorUrl: "https://www.typeform.com",
  privacyUrl: "https://www.typeform.com/legal/privacy-policy/",
  category: "functional",
  label: { de: "Typeform", en: "Typeform" },
  description: {
    de: "Bindet ein Formular oder eine Umfrage von Typeform ein. Dabei wird Ihre IP-Adresse an Server von Typeform übertragen.",
    en: "Embeds a form or survey from Typeform. Your IP address is transmitted to Typeform servers.",
  },
  cookies: [
    {
      name: "tf_respondent_cc",
      duration: { de: "6 Monate", en: "6 months" },
      description: { de: "Typeform: Kennung des Antwortenden (form.typeform.com / typeform.com).", en: "Typeform: respondent identifier (form.typeform.com / typeform.com)." },
      evidence: ["observed"],
    },
    {
      name: "attribution_user_id",
      duration: { de: "1 Jahr", en: "1 year" },
      description: { de: "Typeform: Kennung zur Zuordnung der Herkunft.", en: "Typeform: identifier for attribution." },
      evidence: ["observed"],
    },
    {
      name: "AWSALBTGCORS",
      duration: { de: "7 Tage", en: "7 days" },
      description: { de: "Lastverteilung der Typeform-Server (form.typeform.com).", en: "Load balancing of Typeform servers (form.typeform.com)." },
      evidence: ["observed"],
    },
    {
      name: "tf_random_id",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
      description: { de: "Typeform: zufällige Kennung (Local Storage, form.typeform.com).", en: "Typeform: random identifier (local storage, form.typeform.com)." },
      evidence: ["observed"],
    },
    {
      name: "*-visitorId",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
      description: { de: "Typeform: Besucherkennung je Formular (Local Storage).", en: "Typeform: visitor identifier per form (local storage)." },
      evidence: ["observed"],
    },
  ],
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. embed.typeform.com/next/embed.js loaded and rendered a public form (form.typeform.com) with a data-tf-widget element. Two containers released one after another, a late container after \"allow all\" and two containers at once each rendered the form (tf.load() for containers released after embed.js ran; data-tf-widget with a public form).",
    observed: "Cookies and local storage observed on form.typeform.com in the sandbox with a public form.",
  },
  sources: ["https://www.typeform.com/legal/cookie-policy/"],
  load(ctx) {
    return ctx.loadScript("https://embed.typeform.com/next/embed.js");
  },
  refresh(ctx, el) {
    const tf = ctx.win.tf as { load?: () => void } | undefined;
    if (tf?.load && scan(el, "[data-tf-live],[data-tf-widget],[data-tf-popover],[data-tf-slider],[data-tf-popup],[data-tf-sidetab]").length) tf.load();
  },
  embed: {
    hosts: ["form.typeform.com", "typeform.com"],
    markup: { example: '<div data-tf-live="01ABCDEF" class="typeform-embed"></div>' },
    placeholder: {
      de: "Dieses Formular wird von Typeform bereitgestellt. Beim Laden werden Daten an Typeform übertragen.",
      en: "This form is provided by Typeform. Loading it transmits data to Typeform.",
    },
  },
};
export default service;
