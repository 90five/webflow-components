import type { ServiceDef } from "../types";

/**
 * X (Twitter) embedded posts and timelines. cfg: `true` / `{}` (no options).
 * Works with <blockquote class="twitter-tweet"> / <a class="twitter-timeline"> (load() runs widgets.js).
 * Category marketing: X sets identifiers and may use embed views for personalised advertising.
 */
const service: ServiceDef = {
  id: "x-twitter",
  vendor: "X Corp. / Twitter International Unlimited Company",
  vendorUrl: "https://x.com",
  privacyUrl: "https://x.com/de/privacy",
  category: "marketing",
  label: { de: "X (Twitter)", en: "X (Twitter)" },
  description: {
    de: "Bindet Beiträge und Timelines von X in diese Seite ein. Dabei wird Ihre IP-Adresse an Server von X übertragen; X kann Cookies setzen und Daten für personalisierte Inhalte und Werbung nutzen.",
    en: "Embeds posts and timelines from X in this page. Your IP address is transmitted to X servers; X may set cookies and use data for personalised content and advertising.",
  },
  cookies: [
    {
      name: "guest_id",
      duration: { de: "13 Monate (396 Tage)", en: "13 months" },
      description: { de: "Kennung für nicht angemeldete Besucher (x.com).", en: "Identifier for visitors who are not signed in (x.com)." },
      evidence: ["observed"],
    },
    {
      name: "__cf_bm",
      duration: { de: "30 Minuten", en: "30 minutes" },
      description: { de: "Cloudflare-Bot-Schutz (HttpOnly, x.com / twitter.com).", en: "Cloudflare bot management (HttpOnly, x.com / twitter.com)." },
      evidence: ["observed"],
    },
    {
      name: "gt",
      duration: { de: "2 Stunden", en: "2 hours" },
      description: { de: "Gast-Token für nicht angemeldete Besucher (x.com).", en: "Guest token for visitors who are not logged in (x.com)." },
      evidence: ["observed"],
    },
    {
      name: "__cuid",
      duration: { de: "13 Monate (400 Tage)", en: "13 months" },
      description: { de: "Kennung des Browsers (x.com).", en: "Browser identifier (x.com)." },
      evidence: ["observed"],
    },
  ],
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. widgets.js and a public tweet embed loaded. Two blockquote containers released one after another, a late container after \"allow all\" and two at once each rendered the post (twttr.widgets.load(container)).",
    observed: "Cookies observed in the sandbox.",
  },
  sources: ["https://help.x.com/en/rules-and-policies/x-cookies", "https://developer.x.com/en/docs/twitter-for-websites/embedded-tweets/overview"],
  embed: {
    hosts: ["platform.twitter.com", "platform.x.com", "syndication.twitter.com"],
    markup: {
      example:
        '<blockquote class="twitter-tweet" lang="en" dir="ltr"><p lang="en" dir="ltr">Text of the post</p>&mdash; Name (@handle) <a href="https://twitter.com/handle/status/1234567890">Date</a></blockquote>',
    },
    placeholder: {
      de: "Dieser Beitrag wird von X bereitgestellt. Beim Laden werden Daten an X übertragen.",
      en: "This post is provided by X. Loading it transmits data to X.",
    },
  },
  load(ctx) {
    return ctx.loadScript("https://platform.twitter.com/widgets.js").then(() => {
      ctx.win.twttr?.widgets?.load?.();
    });
  },
  refresh(ctx, el) {
    ctx.win.twttr?.widgets?.load?.(el); // official API: scan this element only
  },
};
export default service;
