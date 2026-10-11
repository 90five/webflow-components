import { CATEGORIES, type Category } from "./types";

export interface ConsentRecord {
  v: 1;
  /** Config revision the consent was given for. */
  rev: number;
  /** Timestamp (ms) of the last decision. */
  ts: number;
  cats: Partial<Record<Category, boolean>>;
  /** Service-level opt-ins ("Immer erlauben" on an embed). */
  svc: Record<string, boolean>;
  /**
   * false while the record only holds per-service grants ("Immer erlauben" before any banner choice).
   * Such a record must not suppress the banner. Missing = decided.
   */
  decided?: boolean;
}

/** Validate one parsed cookie value; only a literal `true` counts as consent. */
function normalize(rec: unknown): ConsentRecord | null {
  if (!rec || typeof rec !== "object") return null;
  const r = rec as Record<string, unknown>;
  if (r.v !== 1 || typeof r.rev !== "number" || !Number.isFinite(r.rev) || !r.cats || typeof r.cats !== "object") return null;
  const cats: Partial<Record<Category, boolean>> = {};
  for (const c of CATEGORIES) if ((r.cats as Record<string, unknown>)[c] === true) cats[c] = true;
  const svc: Record<string, boolean> = Object.create(null);
  if (r.svc && typeof r.svc === "object") {
    for (const [k, v] of Object.entries(r.svc as Record<string, unknown>)) if (v === true) svc[k] = true;
  }
  const out: ConsentRecord = { v: 1, rev: r.rev, ts: typeof r.ts === "number" && Number.isFinite(r.ts) ? r.ts : 0, cats, svc };
  if (r.decided === false) out.decided = false;
  return out;
}

/** Read the consent record. If duplicate cookies exist (host-only and Domain=), the newest `ts` wins. */
export function readRecord(doc: Document, name: string): ConsentRecord | null {
  let best: ConsentRecord | null = null;
  for (const part of doc.cookie.split("; ")) {
    if (!part.startsWith(name + "=")) continue;
    let rec: ConsentRecord | null = null;
    try {
      rec = normalize(JSON.parse(decodeURIComponent(part.slice(name.length + 1))));
    } catch {
      /* corrupt cookie -> ignore this copy */
    }
    if (rec && (!best || rec.ts >= best.ts)) best = rec;
  }
  return best;
}

/** Domain= variants for a hostname: the host itself (first = true) and its parent domains below the public suffix. */
function domainVariants(hostname: string, first = true): string[] {
  const parts = hostname.split(".");
  const out: string[] = [];
  for (let i = first ? 0 : 1; i < parts.length - 1; i++) out.push(parts.slice(i).join("."));
  return out;
}

/**
 * Write the record. With a cookie domain the host-only copy is erased (and without one, copies on
 * parent domains are), so only one copy of the cookie exists and a withdrawal cannot be shadowed.
 */
export function writeRecord(doc: Document, name: string, rec: ConsentRecord, days: number, domain?: string): void {
  const secure = doc.location?.protocol === "https:" ? "; Secure" : "";
  const dom = domain ? `; Domain=${domain}` : "";
  doc.cookie = `${name}=${encodeURIComponent(JSON.stringify(rec))}; Max-Age=${Math.round(days * 86400)}; Path=/; SameSite=Lax${secure}${dom}`;
  // A cookie is identified by name, domain and path; Domain=<host> from <host> replaces the host-only copy,
  // so only real parent domains (and, with a cookie domain, the host-only copy) are erased.
  const bare = (domain ?? "").replace(/^\./, "");
  const host = doc.location?.hostname ?? "";
  if (domain && bare !== host) doc.cookie = `${name}=; Max-Age=0; Path=/`; // host-only copy
  for (const d of domainVariants(host, false)) {
    if (d === bare) continue;
    doc.cookie = `${name}=; Max-Age=0; Path=/; Domain=${d}`;
    doc.cookie = `${name}=; Max-Age=0; Path=/; Domain=.${d}`;
  }
}

/** Delete a cookie on the host and all parent domains (JS cannot delete HttpOnly cookies). */
export function eraseCookie(doc: Document, name: string, hostname: string): void {
  const domains = [""];
  for (const d of domainVariants(hostname)) domains.push(`; Domain=${d}`, `; Domain=.${d}`);
  for (const d of domains) doc.cookie = `${name}=; Max-Age=0; Path=/${d}`;
}

export function cookieNames(doc: Document): string[] {
  return doc.cookie
    .split("; ")
    .map((c) => c.split("=")[0])
    .filter(Boolean);
}

/** Does a cookie name match a service cookie pattern with `*` wildcards? */
export function matchName(pattern: string, name: string): boolean {
  const re = new RegExp("^" + pattern.split("*").map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
  return re.test(name);
}
