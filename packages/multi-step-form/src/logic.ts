export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

export function meetsMinWords(text: string, min: number): boolean {
  return countWords(text) >= min;
}

export function clampStepIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(index, 0), count - 1);
}

export function formatProgressLabel(index: number, total: number): string {
  return `Step ${index + 1} of ${total}`;
}

// Common free/consumer webmail providers — not exhaustive, just the ones
// that actually show up in B2B form spam. Extend per-form via the
// data-step-business-email attribute's value (comma-separated extra domains).
export const FREE_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "protonmail.com",
  "proton.me",
  "gmx.com",
  "gmx.net",
  "gmx.de",
  "web.de",
  "t-online.de",
  "freenet.de",
  "mail.com",
  "yandex.com",
  "yandex.ru",
  "zoho.com",
  "qq.com",
  "163.com",
  "naver.com",
];

export function getEmailDomain(email: string): string | null {
  const match = /@([^@\s]+)$/.exec(email.trim());
  return match ? match[1].toLowerCase() : null;
}

export function isFreeEmailDomain(email: string, extraDomains: string[] = []): boolean {
  const domain = getEmailDomain(email);
  if (!domain) return false;
  const blocked = new Set([...FREE_EMAIL_DOMAINS, ...extraDomains.map((d) => d.trim().toLowerCase())]);
  return blocked.has(domain);
}
