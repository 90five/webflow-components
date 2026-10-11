// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { SERVICES } from "./registry";
import { CATEGORIES, LANGS } from "./types";

const defs = Object.values(SERVICES);

describe("service registry", () => {
  it("contains the expected number of services with unique kebab-case ids", () => {
    expect(defs.length).toBeGreaterThanOrEqual(38);
    const ids = defs.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it.each(defs.map((d) => [d.id, d] as const))("%s is well-formed", (_id, d) => {
    expect(CATEGORIES).toContain(d.category);
    for (const lang of LANGS) {
      expect(d.label[lang].trim(), `label.${lang}`).not.toBe("");
      expect(d.description[lang].trim(), `description.${lang}`).not.toBe("");
      if (d.devNote) expect(d.devNote[lang].trim()).not.toBe("");
      if (d.visitorNote) expect(d.visitorNote[lang].trim()).not.toBe("");
      for (const c of d.cookies) {
        expect(c.duration[lang].trim(), `${c.name} duration.${lang}`).not.toBe("");
        expect(c.description[lang].trim(), `${c.name} description.${lang}`).not.toBe("");
      }
      if (d.embed) expect(d.embed.placeholder[lang].trim()).not.toBe("");
    }
    expect(d.vendor.trim()).not.toBe("");
    for (const u of [d.vendorUrl, d.privacyUrl, ...d.sources]) expect(u).toMatch(/^https:\/\/[^\s]+$/);
    expect(d.sources.length).toBeGreaterThan(0);
    for (const c of d.cookies) {
      expect(c.name.trim()).not.toBe("");
      if (c.type) expect(["cookie", "localStorage", "sessionStorage", "indexedDB", "pixel"]).toContain(c.type);
    }
    if (d.cookieless) expect(d.cookies.filter((c) => (c.type ?? "cookie") === "cookie")).toHaveLength(0);
    for (const c of d.cookies) {
      expect(c.evidence.length, `${c.name} needs evidence`).toBeGreaterThan(0);
      for (const e of c.evidence) expect(["observed", "vendor-docs"]).toContain(e);
      if (c.evidence.includes("vendor-docs")) expect(d.sources.length, `${c.name} cites vendor docs`).toBeGreaterThan(0);
      if (c.devNote) for (const lang of LANGS) expect(c.devNote[lang].trim()).not.toBe("");
    }
    expect(d.verification.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(d.verification.loader.trim(), "loader proof").not.toBe("");
    expect(d.verification.observed.trim(), "observation").not.toBe("");
    expect(JSON.stringify(d)).not.toMatch(/Open Cookie Database|verified"?: ?false|placeholder id/i);
    if (d.embed) {
      expect(d.embed.hosts.length).toBeGreaterThan(0);
      for (const h of d.embed.hosts) expect(h).not.toMatch(/^https?:/);
    }
  });

  it("no service uses the necessary category (it is reserved for the consent cookie)", () => {
    expect(defs.filter((x) => x.category === "necessary")).toHaveLength(0);
  });

  it("assigns the conservative categories", () => {
    const cat = (ids: string[]) => ids.map((i) => SERVICES[i].category);
    expect(cat(["meta-pixel", "linkedin-insight", "tiktok-pixel", "pinterest-tag", "microsoft-uet", "google-ads", "hubspot", "instagram", "x-twitter"]).every((c) => c === "marketing")).toBe(true);
    expect(cat(["ga4", "clarity", "hotjar", "matomo", "plausible", "fathom", "gtm"]).every((c) => c === "analytics")).toBe(true);
    expect(cat(["youtube", "vimeo", "loom", "wistia", "spotify", "soundcloud", "google-maps", "openstreetmap", "calendly", "cal-com", "typeform", "tally", "intercom", "crisp", "tawk", "zendesk-chat", "recaptcha", "hcaptcha", "turnstile", "google-fonts", "adobe-fonts", "trustpilot"]).every((c) => c === "functional")).toBe(true);
  });

  it("includes every shipped service", () => {
    for (const id of [
      "ga4", "gtm", "google-ads", "clarity", "hotjar", "matomo", "plausible", "fathom", "meta-pixel", "linkedin-insight",
      "tiktok-pixel", "pinterest-tag", "microsoft-uet", "hubspot", "calendly", "cal-com", "youtube", "vimeo", "loom", "wistia",
      "spotify", "soundcloud", "google-maps", "openstreetmap", "typeform", "tally", "recaptcha", "hcaptcha",
      "turnstile", "intercom", "crisp", "tawk", "zendesk-chat", "instagram", "x-twitter", "trustpilot",
      "google-fonts", "adobe-fonts",
    ]) expect(SERVICES[id], id).toBeDefined();
  });
});
