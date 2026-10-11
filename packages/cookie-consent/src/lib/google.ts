import { GLOBAL } from "../constants";
import type { LoadContext } from "../types";

/** Shared Google Consent Mode v2 helpers used by ga4, gtm and google-ads. */
/** Internal "defaults already pushed" flag, derived from the global name. */
const MODE_FLAG = `__${GLOBAL}ModeDefault`;
type W = Window & Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type ConsentSignal =
  | "ad_storage"
  | "ad_user_data"
  | "ad_personalization"
  | "analytics_storage"
  | "functionality_storage"
  | "personalization_storage"
  | "security_storage";

/**
 * window.dataLayer as a real array. If the page has something else under that name (another script, or an element
 * with id="dataLayer" that the browser exposes on window), a fresh array replaces it and a warning is logged.
 */
export function getDataLayer(win: W): unknown[] {
  if (!Array.isArray(win.dataLayer)) {
    if (win.dataLayer !== undefined) console.warn(`[${GLOBAL}] window.dataLayer is not an array - replaced by a new array`);
    win.dataLayer = [];
  }
  return win.dataLayer as unknown[];
}

/** Defines window.dataLayer + gtag() without loading any Google script. */
export function ensureGtag(win: W): (...args: unknown[]) => void {
  const layer = getDataLayer(win);
  if (typeof win.gtag !== "function") {
    win.gtag = function gtag() {
      // gtag.js requires the real `arguments` object, not an array
      // eslint-disable-next-line prefer-rest-params
      layer.push(arguments);
    };
  }
  return win.gtag;
}

/** Consent Mode v2: everything denied (security_storage stays granted — strictly necessary). Idempotent. */
export function setConsentDefaults(win: W): void {
  if (win[MODE_FLAG]) return;
  win[MODE_FLAG] = true;
  delete win[`__${GLOBAL}ModeLast`];
  const gtag = ensureGtag(win);
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "denied",
    personalization_storage: "denied",
    security_storage: "granted",
    wait_for_update: 500,
  });
}

export function updateConsent(win: W, signals: Partial<Record<ConsentSignal, "granted" | "denied">>): void {
  ensureGtag(win)("consent", "update", signals);
}

export type Signals = Partial<Record<ConsentSignal, "granted" | "denied">>;
const LAST_FLAG = `__${GLOBAL}ModeLast`;

/**
 * The consent signals for the current decision, computed in ONE place for every Google service on the page
 * (ga4, gtm, google-ads), so the result does not depend on which service loads or updates first.
 *
 * A signal is sent only when a service that is allowed right now uses it:
 * - analytics_storage: ga4 or gtm, follows the analytics consent
 * - ad_storage: gtm or google-ads, follows the marketing consent
 * - ad_user_data, ad_personalization: gtm, google-ads, or ga4 configured with `ads: true`, follow the marketing consent
 * - functionality_storage, personalization_storage: gtm, follow the functional consent
 * Everything else keeps the denied default.
 */
export function googleSignals(ctx: LoadContext): Signals {
  const on = (id: string) => ctx.configOf(id) !== null && ctx.has(id);
  const gtm = on("gtm");
  const ga4 = on("ga4");
  const ads = on("google-ads");
  const g = (c: "analytics" | "marketing" | "functional") => (ctx.hasCategory(c) ? "granted" : "denied");
  const out: Signals = {};
  if (ga4 || gtm) out.analytics_storage = g("analytics");
  if (gtm || ads) out.ad_storage = g("marketing");
  if (gtm || ads || (ga4 && ctx.configOf("ga4")?.ads === true)) {
    out.ad_user_data = g("marketing");
    out.ad_personalization = g("marketing");
  }
  if (gtm) {
    out.functionality_storage = g("functional");
    out.personalization_storage = g("functional");
  }
  return out;
}

/** Push the combined signals (only when they changed since the last push). */
export function syncGoogleConsent(ctx: LoadContext): void {
  const signals = googleSignals(ctx);
  const key = JSON.stringify(Object.entries(signals).sort(([a], [b]) => (a < b ? -1 : 1)));
  const win = ctx.win;
  if (win[LAST_FLAG] === key) return;
  win[LAST_FLAG] = key;
  if (Object.keys(signals).length) updateConsent(win, signals);
}
