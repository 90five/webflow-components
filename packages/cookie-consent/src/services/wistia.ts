/**
 * Wistia video embed. Config: window.FivexConsent.services.wistia = true (iframe: fast.wistia.net/embed/iframe/<id>).
 * load() injects the E-v1 player script for <wistia-player>/script embeds: https://fast.wistia.com/player.js
 * Container usage: <wistia-player media-id="..."> (custom element, allowed for this service). player.js defines the element; refresh()
 * adds the media script https://fast.wistia.com/embed/<media-id>.js (a module) for every player, as in Wistia's embed code.
 */
import type { ServiceDef } from "../types";
import { scan } from "../lib/embed";

const service: ServiceDef = {
  id: "wistia",
  vendor: "Wistia, Inc.",
  vendorUrl: "https://wistia.com",
  privacyUrl: "https://wistia.com/privacy",
  category: "functional",
  label: { de: "Wistia", en: "Wistia" },
  description: {
    de: "Zeigt eingebettete Wistia-Videos an. Dabei wird Ihre IP-Adresse an Server von Wistia übertragen; der Player nutzt lokalen Speicher statt Tracking-Cookies.",
    en: "Shows embedded Wistia videos. Your IP address is transferred to Wistia servers; the player uses local storage instead of tracking cookies.",
  },
  cookies: [
    {
      name: "wistia",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Player-Einstellungen und Kennung (fast.wistia.net / Website).", en: "Player preferences and identifier (fast.wistia.net / site)." },
      evidence: ["observed"],
    },
    {
      name: "wistia-video-progress-*",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Merkt den Wiedergabefortschritt je Video.", en: "Remembers the playback progress per video." },
      evidence: ["observed"],
    },
  ],
  devNote: { de: "Laut Wistia setzt der Player keine Tracking-Cookies, sondern nutzt Local Storage; in der Beobachtung wurden nur Local-Storage-Einträge festgestellt.", en: "Per Wistia the player sets no tracking cookies and uses local storage instead; only local storage entries were observed." },
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. A public sample video loaded as iframe and via player.js with <wistia-player>. Two <wistia-player> containers released one after another, a late container after \"allow all\" and two at once each rendered the player (player.js plus fast.wistia.com/embed/<id>.js).",
    observed: "Local storage keys observed in the sandbox; Wistia's documentation states that the player uses local storage instead of cookies.",
  },
  sources: ["https://support.wistia.com/en/articles/8264955-privacy-data-protection-and-security", "https://wistia.com/privacy"],
  load(ctx) {
    return ctx.loadScript("https://fast.wistia.com/player.js");
  },
  refresh(ctx, el) {
    const loads: Array<Promise<void>> = [];
    const seen = new Set<string>();
    for (const p of scan(el, "wistia-player[media-id]")) {
      const id = p.getAttribute("media-id") ?? "";
      if (!/^[a-z0-9]{6,12}$/i.test(id) || seen.has(id)) continue;
      seen.add(id);
      const src = "https://fast.wistia.com/embed/" + id + ".js";
      if (!ctx.doc.querySelector(`script[src="${src}"]`)) loads.push(ctx.loadScript(src, { type: "module" }));
    }
    return Promise.all(loads).then(() => undefined);
  },
  embed: {
    hosts: ["fast.wistia.net", "fast.wistia.com"],
    markup: {
      elements: ["wistia-player"],
      attributes: [
        "media-id", "aspect", "seo", "autoplay", "muted", "silent-autoplay", "playsinline", "player-color", "controls-visible-on-load", "end-video-behavior",
        "big-play-button", "play-bar", "volume-control", "fullscreen-button", "settings-control", "playback-rate-control", "quality-control", "captions", "captions-default",
      ],
      example: '<wistia-player media-id="abc123def4" aspect="1.7777777777777777"></wistia-player>',
    },
    placeholder: {
      de: "Dieses Video wird von Wistia bereitgestellt. Beim Laden werden Daten an Wistia übertragen.",
      en: "This video is provided by Wistia. Loading it transfers data to Wistia.",
    },
  },
};
export default service;
