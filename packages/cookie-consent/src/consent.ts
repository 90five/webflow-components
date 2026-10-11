import { GLOBAL } from "./constants";
import { createConsent, type SiteConfig } from "./engine";

type ReadyFn = (api: unknown) => void;

function start(): void {
  const w = window as unknown as Record<string, unknown>;
  if (w.__fivexConsentStarted) return;
  w.__fivexConsentStarted = true;
  // Before this script runs, window.FivexConsent is the site config. Afterwards it is the API;
  // the config stays readable as FivexConsent.config.
  const config = (w[GLOBAL] ?? {}) as SiteConfig & { ready?: ReadyFn | ReadyFn[] };
  const api = createConsent({ config });
  const descriptors = Object.getOwnPropertyDescriptors(api);
  delete (descriptors as Record<string, unknown>)._debug; // internal, not part of the public API
  const pub = Object.defineProperties({ config }, descriptors);
  w[GLOBAL] = pub;
  // `ready` is a function or an array of functions; anything else is ignored with a warning
  const ready = config.ready;
  const fns: unknown[] = typeof ready === "function" ? [ready] : Array.isArray(ready) ? ready : [];
  if (ready !== undefined && !fns.length && !Array.isArray(ready)) console.warn(`[${GLOBAL}] ready must be a function or an array of functions`);
  for (const fn of fns) {
    if (typeof fn !== "function") {
      console.warn(`[${GLOBAL}] ready: ignoring a value that is not a function`);
      continue;
    }
    try {
      fn(pub);
    } catch (e) {
      console.warn(`[${GLOBAL}]`, e);
    }
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
