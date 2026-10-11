import type { ServiceDef } from "../types";

/**
 * Instagram post embeds. cfg: `true` / `{}` (no options).
 * Works with <blockquote class="instagram-media"> (script mode, load() runs embed.js and processes it) or with an
 * iframe src https://www.instagram.com/p/<id>/embed (iframe mode via embed.hosts).
 * Category marketing: Instagram/Meta may set and read its own cookies and combine data with accounts when embedded.
 */
const service: ServiceDef = {
  id: "instagram",
  vendor: "Meta Platforms Ireland Ltd.",
  vendorUrl: "https://www.instagram.com",
  privacyUrl: "https://privacycenter.instagram.com/policy",
  category: "marketing",
  label: { de: "Instagram", en: "Instagram" },
  description: {
    de: "Bindet Beiträge von Instagram in diese Seite ein. Dabei wird Ihre IP-Adresse an Server von Meta übertragen; Meta kann Cookies setzen und Daten Ihrem Instagram-Konto zuordnen, wenn Sie angemeldet sind.",
    en: "Embeds Instagram posts in this page. Your IP address is transmitted to Meta servers; Meta may set cookies and link data to your Instagram account if you are logged in.",
  },
  cookies: [
    {
      name: "csrftoken",
      duration: { de: "13 Monate (400 Tage)", en: "13 months" },
      description: { de: "Sicherheits-Token gegen Cross-Site-Request-Forgery (instagram.com).", en: "Security token against cross-site request forgery (instagram.com)." },
      evidence: ["observed"],
    },
  ],
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. embed.js and a public post embed loaded. Two blockquote containers released one after another, a late container after \"allow all\" and two at once each rendered the post (instgrm.Embeds.process()).",
    observed: "Cookie csrftoken observed in the sandbox with a public post embed.",
  },
  sources: ["https://privacycenter.instagram.com/policy/cookies", "https://developers.facebook.com/docs/instagram-platform/oembed"],
  embed: {
    hosts: ["instagram.com", "cdninstagram.com"],
    markup: {
      example:
        '<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/p/POST_ID/" data-instgrm-version="14"><a href="https://www.instagram.com/p/POST_ID/" target="_blank" rel="noopener">View this post on Instagram</a></blockquote>',
    },
    placeholder: {
      de: "Dieser Beitrag wird von Instagram bereitgestellt. Beim Laden werden Daten an Meta übertragen.",
      en: "This post is provided by Instagram. Loading it transmits data to Meta.",
    },
  },
  load(ctx) {
    return ctx.loadScript("https://www.instagram.com/embed.js").then(() => {
      ctx.win.instgrm?.Embeds?.process?.();
    });
  },
  refresh(ctx) {
    ctx.win.instgrm?.Embeds?.process?.(); // processes every unprocessed blockquote.instagram-media
  },
};
export default service;
