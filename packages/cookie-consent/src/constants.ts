/**
 * The only place that knows the public names. Every attribute, selector, CSS class, cookie
 * and global is derived from these constants, so a rename is a one-line change.
 */
/** Attribute prefix: fivex-consent="banner", fivex-consent-scroll="lock", type="fivex-consent" */
export const ATTR = "fivex-consent";
/** window global used for config (input) and API (output). */
export const GLOBAL = "FivexConsent";
/** Name of the consent cookie. */
export const COOKIE = "fivex_consent";
/** CSS class prefix of the default embed placeholder. */
export const CLS = "fivex-consent-placeholder";
/** dataLayer event name pushed on every consent change. */
export const DL_EVENT = "fivex_consent_update";
