export type Lang = "de" | "en";
export type Evidence = "observed" | "vendor-docs";
export type Category = "necessary" | "functional" | "analytics" | "marketing";

export const CATEGORIES: readonly Category[] = ["necessary", "functional", "analytics", "marketing"];
export const LANGS: readonly Lang[] = ["de", "en"];

/** A text in both supported languages. */
export type L10n = Record<Lang, string>;

export interface CookieInfo {
  /** Cookie / storage key. `*` is a wildcard (e.g. `_ga_*`). */
  name: string;
  /** Where it is stored. Defaults to "cookie". Only "cookie" entries are auto-cleared on withdrawal. */
  type?: "cookie" | "localStorage" | "sessionStorage" | "indexedDB" | "pixel";
  duration: L10n;
  description: L10n;
  /** What the entry rests on: "observed" = seen in a real browser (sandbox load or live website, attributed to the vendor), "vendor-docs" = in the vendor's official documentation. At least one is required. */
  evidence: Evidence[];
  /** Developer remark for special entries (SOURCES.md and README only, never shown to visitors). */
  devNote?: L10n;
}

/** How a service was verified (dates are ISO, texts English). */
export interface Verification {
  /** ISO date of the verification. */
  date: string;
  /** Proof that the loader / embed works after consent (script or iframe loaded, no errors from the stub). */
  loader: string;
  /** What was observed in the sandbox and on live websites. */
  observed: string;
  /** Live websites on which the service was observed (cookie domain, Set-Cookie host or writing script attributed to the vendor). */
  liveSites?: string[];
}

/** Per-site config of one service: `true` or an object with service-specific options. */
export type ServiceConfig = Record<string, unknown>;

export interface LoadContext {
  /** Resolved per-site options for this service (`{}` when configured as `true`). */
  cfg: ServiceConfig;
  lang: Lang;
  win: Window & Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  doc: Document;
  /** Append an async <script src> to <head>. Resolves on load, rejects on error. */
  loadScript(src: string, attrs?: Record<string, string>): Promise<void>;
  /** Append an inline <script> to <head>. */
  inlineScript(code: string): void;
  /** Is another service currently consented to? */
  has(serviceId: string): boolean;
  /** Is a category currently consented to? */
  hasCategory(category: Category): boolean;
  /** Site config of another service (`{}` for `true`), or null when it is not configured. */
  configOf(serviceId: string): ServiceConfig | null;
}

/** Markup a container service needs beyond the sanitizer's base allow-list (see sanitize.ts). */
export interface ContainerMarkup {
  /** Extra element names (lower case, e.g. "wistia-player", "iframe"). */
  elements?: string[];
  /** Extra attribute names, valid on the extra elements only. */
  attributes?: string[];
  /** Example markup for the README (HTML, not rendered). */
  example: string;
}

export interface EmbedInfo {
  /** Allowed host suffixes for `fivex-consent-src` / `src` of blocked iframes (e.g. "player.vimeo.com"). */
  hosts: string[];
  /** Markup the service's containers (`fivex-consent-html`) use. Without it only the base allow-list applies. */
  markup?: ContainerMarkup;
  /** Short line shown in the placeholder, e.g. "Dieses Video wird von Vimeo bereitgestellt." */
  placeholder: L10n;
}

export interface ServiceDef {
  /** Key used in `window.FivexConsent.services` and `fivex-consent-service`. kebab-case. */
  id: string;
  vendor: string;
  vendorUrl: string;
  privacyUrl: string;
  /** Default category. Consent for this category is required before the service loads. */
  category: Category;
  /** Categories the site may choose with `cfg.category` instead of the default (e.g. Google Tag Manager). */
  categories?: Category[];
  /** true when the site explicitly configured the service to load before any consent (opt-in, e.g. `beforeConsent: true`). */
  loadsBeforeConsent?(cfg: ServiceConfig): boolean;
  label: L10n;
  /** Purpose, in plain language, 1-2 sentences. */
  description: L10n;
  /** Cookies / storage keys; every entry is observed or documented by the vendor. */
  cookies: CookieInfo[];
  /** true when the service sets no cookies / needs no storage access (shown for transparency). */
  cookieless?: boolean;
  /** Developer remark (SOURCES.md and README only, never rendered): integration caveats, test findings. */
  devNote?: L10n;
  /** Optional short remark in visitor language, rendered after the description in the service list. */
  visitorNote?: L10n;
  /** Official vendor documentation URLs (cookie / storage information, loader snippet). */
  sources: string[];
  /** Verification record (see SOURCES.md). */
  verification: Verification;
  /** Runs once at start, BEFORE any consent, must not make a network request (e.g. Consent Mode defaults). */
  init?(ctx: LoadContext): void;
  /**
   * Runs after the service's category consent: inject the vendor script. For a service with `tracker: true` this is a
   * site-wide script that must never run because of an embed alone.
   */
  load?(ctx: LoadContext): void | Promise<void>;
  /**
   * true when `load` starts site-wide tracking (not just an embed library). Such a service starts `load` only with
   * its category consent (or an explicit opt-in); a one-off or "always allow" embed runs `loadEmbed` instead.
   * Without this flag `load` is the embed library itself and also serves one-off / "always allow" embeds.
   */
  tracker?: boolean;
  /** Embed-only library (form / widget / player script), used for one-off and "always allow" embeds of a `tracker` service. */
  loadEmbed?(ctx: LoadContext): void | Promise<void>;
  /**
   * Re-scan hook for container embeds (`fivex-consent-html`): called with the container after its markup was inserted
   * and the loader (`loadEmbed` / `load`) has finished, using the vendor's official re-scan API. Idempotent.
   */
  refresh?(ctx: LoadContext, el: HTMLElement): void | Promise<void>;
  embed?: EmbedInfo;
  /** Runs on every consent change for a service that is already active (e.g. to update Consent Mode signals). */
  update?(ctx: LoadContext): void;
}
