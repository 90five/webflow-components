// @vitest-environment node
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { SERVICES } from "./registry";

const FILE = fileURLToPath(new URL("../SOURCES.md", import.meta.url));

export function renderSources(): string {
  const defs = Object.values(SERVICES).sort((a, b) => a.id.localeCompare(b.id));
  const rows = defs.map((d) => {
    const entries = d.cookies.length
      ? d.cookies.map((c) => `  - \`${c.name}\` (${c.type ?? "cookie"}) · ${c.duration.en} · evidence: ${c.evidence.join(", ")}`).join("\n")
      : d.cookieless
        ? "  - none (no cookies or storage keys)"
        : "  - none";
    const live = d.verification.liveSites?.length ? `- Observed on live websites: ${d.verification.liveSites.join(", ")}\n` : "";
    return `### ${d.label.en} (\`${d.id}\`)\n\n- Category: ${d.category}\n- Verified: ${d.verification.date}\n- Loader / embed: ${d.verification.loader}\n- Observation: ${d.verification.observed}\n${live}- Entries (cookies / storage keys):\n${entries}\n${d.devNote ? `- Note: ${d.devNote.en}\n` : ""}- Vendor documentation:\n${d.sources.map((s) => `  - ${s}`).join("\n")}\n`;
  });
  return `# Sources

Generated from \`src/services/*.ts\` (run \`UPDATE_SOURCES=1 pnpm test\` to regenerate; the test fails when this file is out of date).

## Method and release rule

A service is part of the package only if

1. every listed cookie / storage entry is backed by evidence, and
2. its loader or embed was shown to work (script or iframe loads after consent, no errors from the loader).

Evidence per entry:

- **observed**: seen in a real Chrome in a fresh profile, either in a sandbox page that loads the service through this package, or on a live website that runs the tool. An entry counts for a vendor only when the attribution is clear (cookie domain of the vendor, \`Set-Cookie\` response from a vendor host, or the writing script was loaded from a vendor domain). Durations are the observed expiry, rounded.
- **vendor-docs**: listed in the vendor's official documentation (URL below). Where a documented entry could not be observed, the documented duration is used.

Entries that rest only on third-party collections are not included. The date above is the day of verification; vendors change cookie names and durations over time, so re-check before relying on the tables.

Services: ${defs.length}.

${rows.join("\n")}`;
}

it("SOURCES.md is in sync with the service registry", () => {
  const expected = renderSources();
  if (process.env.UPDATE_SOURCES) writeFileSync(FILE, expected);
  expect(readFileSync(FILE, "utf8")).toBe(expected);
});
