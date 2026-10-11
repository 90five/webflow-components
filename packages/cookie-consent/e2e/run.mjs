// End-to-end test in a real Chrome. Usage: CHROME_PATH="/path/to/chrome" pnpm test:e2e  (after pnpm build)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME_PATH;
if (!CHROME || !fs.existsSync(CHROME)) {
  console.error("Set CHROME_PATH to a Chrome/Chromium executable, e.g. CHROME_PATH=\"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome\"");
  process.exit(2);
}
const BUNDLE = path.join(here, "..", "dist", "consent.min.js");
if (!fs.existsSync(BUNDLE)) {
  console.error("dist/consent.min.js missing - run pnpm build first");
  process.exit(2);
}

// extra pages for the regression checks at the end of this file
const pages = {};
const server = http.createServer((req, res) => {
  const p = new URL(req.url, "http://x").pathname;
  if (pages[p]) return void res.writeHead(200, { "content-type": "text/html" }).end(pages[p]);
  if (p === "/lib.js") return void setTimeout(() => res.writeHead(200, { "content-type": "text/javascript" }).end("window.Lib = { ok: true };"), 250);
  if (p === "/slow.png") return void setTimeout(() => res.writeHead(200, { "content-type": "image/png" }).end(Buffer.alloc(10)), 4000);
  if (p === "/blank") return void res.writeHead(200, { "content-type": "text/html" }).end("<!doctype html><title>blank</title><p>embed</p>");
  if (p === "/consent.min.js") return void res.writeHead(200, { "content-type": "text/javascript" }).end(fs.readFileSync(BUNDLE));
  if (p === "/") return void res.writeHead(200, { "content-type": "text/html" }).end(fs.readFileSync(path.join(here, "demo.html")));
  res.writeHead(404).end("not found");
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: CHROME, headless: true });

const isLocal = (u) => /^(http:\/\/(127\.0\.0\.1|localhost)[:/]|data:|blob:|about:|chrome)/.test(u);
const results = [];
let failed = 0;
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + detail}`);
}

async function session(fn) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const reqs = [];
  const frames = new Map(); // url index -> frame, to drop unload beacons of the previous document
  ctx.on("request", (r) => {
    frames.set(reqs.length, r.frame());
    reqs.push(r.url());
  });
  const mark = () => reqs.length;
  // requests after the most recent navigation to `url` (ignores unload beacons of the previous page)
  const sinceNav = (url) =>
    reqs.map((u, i) => [u, i]).slice(reqs.lastIndexOf(url) + 1).filter(([u, i]) => !isLocal(u) && !frames.get(i).isDetached()).map(([u]) => u);
  const since = (m) => reqs.slice(m).filter((u) => !isLocal(u));
  const hosts = (m) => [...new Set(since(m).map((u) => new URL(u).hostname))];
  try {
    await fn({ ctx, page, reqs, mark, since, sinceNav, hosts });
  } finally {
    await ctx.close();
  }
}
const cookies = async (ctx) => (await ctx.cookies()).filter((c) => c.name !== "fivex_consent");
const storageKeys = (page) => page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
const visible = (page, sel) => page.locator(sel).first().isVisible();
const has = (list, re) => list.some((u) => re.test(u));
const open = async (page, q = "") => {
  await page.goto(`${ORIGIN}/${q}`, { waitUntil: "load" });
  await page.waitForTimeout(1500);
};
const BANNER = '[fivex-consent="banner"]';
const PREFS = '[fivex-consent="preferences"]';
const FAMILIES = {
  ga4: /googletagmanager\.com\/gtag\/js/,
  clarity: /clarity\.ms\/tag\//,
  meta: /connect\.facebook\.net/,
  youtube: /youtube-nocookie\.com\/embed/,
  vimeo: /player\.vimeo\.com\/video/,
  calendly: /assets\.calendly\.com\/assets\/external\/widget\.js/,
  maps: /google\.com\/maps/,
};
const GTM = /googletagmanager\.com\/gtm\.js\?id=GTM-TEST123/;

// 1. before any choice ------------------------------------------------------------------
await session(async ({ ctx, page, since }) => {
  await open(page);
  await page.waitForTimeout(2500);
  check("no choice: zero third-party requests", since(0).length === 0, since(0).join(", "));
  check("no choice: no cookies besides none, no storage", (await cookies(ctx)).length === 0 && (await storageKeys(page)).length === 0, JSON.stringify(await cookies(ctx)));
  check("no choice: no consent cookie written", !(await ctx.cookies()).some((c) => c.name === "fivex_consent"));
  check("no choice: banner visible, manager hidden", (await visible(page, BANNER)) && !(await visible(page, '[fivex-consent="manager"]')));
  check("no choice: embeds show placeholders", (await page.locator(".fivex-consent-placeholder").count()) >= 3);
});

// 2. deny all ---------------------------------------------------------------------------
await session(async ({ ctx, page, mark, since }) => {
  await open(page);
  await page.click(`${BANNER} [fivex-consent="deny"]`);
  await page.waitForTimeout(1500);
  const m = mark();
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(3000);
  check("deny all: zero third-party requests after reload", since(m).length === 0, since(m).join(", "));
  check("deny all: no non-necessary cookies/storage after reload", (await cookies(ctx)).length === 0 && (await storageKeys(page)).length === 0);
  check("deny all: banner stays hidden, manager visible", !(await visible(page, BANNER)) && (await visible(page, '[fivex-consent="manager"]')));
});

// 3. allow all --------------------------------------------------------------------------
await session(async ({ ctx, page, hosts, since }) => {
  await open(page);
  await page.click(`${BANNER} [fivex-consent="allow"]`);
  await page.waitForTimeout(9000);
  const urls = since(0);
  for (const [k, re] of Object.entries(FAMILIES)) check(`allow all: ${k} loads`, has(urls, re), "not requested");
  const names = (await cookies(ctx)).map((c) => c.name);
  check("allow all: GA4 cookies _ga and _ga_TEST12345 present", names.includes("_ga") && names.includes("_ga_TEST12345"), names.join(","));
  check("allow all: embeds revealed", (await page.locator("iframe[src]").count()) >= 3 && (await page.locator(".fivex-consent-placeholder").count()) === 0);
});

// 4. only analytics ----------------------------------------------------------------------
await session(async ({ ctx, page, since }) => {
  await open(page);
  await page.click(`${BANNER} [fivex-consent="open-preferences"]`);
  await page.check('[fivex-consent-checkbox="analytics"]');
  await page.click(`${PREFS} button[type="submit"]`);
  await page.waitForTimeout(7000);
  const urls = since(0);
  check("preferences analytics only: ga4 + clarity load", has(urls, FAMILIES.ga4) && has(urls, FAMILIES.clarity));
  check("preferences analytics only: no marketing/functional vendor requests", !["meta", "youtube", "vimeo", "calendly", "maps"].some((k) => has(urls, FAMILIES[k])), urls.filter((u) => !FAMILIES.ga4.test(u) && !FAMILIES.clarity.test(u)).join(", "));
  check("preferences analytics only: embeds still blocked", (await page.locator(".fivex-consent-placeholder").count()) >= 3);
});

// 5. withdrawal --------------------------------------------------------------------------
await session(async ({ ctx, page, since, sinceNav }) => {
  await open(page);
  await page.click(`${BANNER} [fivex-consent="allow"]`);
  await page.waitForTimeout(6000);
  check("withdrawal: _ga cookie exists before withdrawal", (await cookies(ctx)).some((c) => c.name === "_ga"));
  await page.evaluate(() => (window.__marker = 1));
  await page.focus("#footer-link");
  await page.keyboard.press("Enter");
  await page.waitForSelector(PREFS, { state: "visible" });
  for (const c of ["analytics", "marketing", "functional"]) await page.uncheck(`[fivex-consent-checkbox="${c}"]`);
  await Promise.all([page.waitForEvent("load"), page.click(`${PREFS} button[type="submit"]`)]);
  await page.waitForTimeout(4000);
  check("withdrawal: page reloaded", (await page.evaluate(() => window.__marker)) === undefined);
  // cookies on the site's own domain; cookies of vendor domains (cf_*, vuid, ...) cannot be erased from JavaScript
  const own = (await cookies(ctx)).filter((c) => c.domain.includes("127.0.0.1"));
  check("withdrawal: the site's first-party vendor cookies are gone (_ga, _ga_*)", own.length === 0, JSON.stringify(own.map((c) => c.name)));
  const after = sinceNav(`${ORIGIN}/`);
  check("withdrawal: no third-party requests on reload", after.length === 0, after.join(", "));
});

// 6. embed placeholder ----------------------------------------------------------------------
await session(async ({ ctx, page, hosts, since, mark }) => {
  await open(page);
  await page.click('#yt [fivex-consent="load-embed"]');
  await page.waitForTimeout(4000);
  const urls = since(0);
  check("embed 'Inhalt laden': YouTube loads", has(urls, FAMILIES.youtube));
  check("embed 'Inhalt laden': nothing else loads", !["ga4", "clarity", "meta", "vimeo", "calendly", "maps"].some((k) => has(urls, FAMILIES[k])), urls.join(", "));
  check("embed 'Inhalt laden': no consent stored, banner still visible", !(await ctx.cookies()).some((c) => c.name === "fivex_consent") && (await visible(page, BANNER)));
});
await session(async ({ ctx, page, since, mark }) => {
  await open(page);
  await page.click('#vm [fivex-consent="allow-embed"]');
  await page.waitForTimeout(4000);
  const rec = JSON.parse(decodeURIComponent((await ctx.cookies()).find((c) => c.name === "fivex_consent").value));
  check("embed 'Immer erlauben': service grant persisted, not a decision", rec.svc.vimeo === true && rec.decided === false, JSON.stringify(rec));
  check("embed 'Immer erlauben': banner stays visible", await visible(page, BANNER));
  check("embed 'Immer erlauben': only Vimeo loads", has(since(0), FAMILIES.vimeo) && !has(since(0), FAMILIES.youtube) && !has(since(0), FAMILIES.ga4));
  const m = mark();
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(4000);
  check("embed 'Immer erlauben': Vimeo auto-loads after reload, banner still visible", has(since(m), FAMILIES.vimeo) && (await visible(page, BANNER)));
});

// 7. revision bump -----------------------------------------------------------------------------
await session(async ({ page, sinceNav }) => {
  await open(page);
  await page.click(`${BANNER} [fivex-consent="allow"]`);
  await page.waitForTimeout(2000);
  await page.goto(`${ORIGIN}/?rev=1`, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  check("revision unchanged: banner stays hidden", !(await visible(page, BANNER)));
  await page.goto(`${ORIGIN}/?rev=2`, { waitUntil: "load" });
  await page.waitForTimeout(3000);
  check("revision bump: banner shows again", await visible(page, BANNER));
  check("revision bump: no third-party requests until a new decision", sinceNav(`${ORIGIN}/?rev=2`).length === 0, sinceNav(`${ORIGIN}/?rev=2`).join(", "));
});

// 8. keyboard ---------------------------------------------------------------------------------------
await session(async ({ page }) => {
  await open(page);
  await page.click(`${BANNER} [fivex-consent="open-preferences"]`);
  await page.waitForTimeout(300);
  check("keyboard: preferences open and take focus", (await visible(page, PREFS)) && (await page.evaluate((s) => document.querySelector(s).contains(document.activeElement), PREFS)));
  let trapped = true;
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    trapped &&= await page.evaluate((s) => document.querySelector(s).contains(document.activeElement), PREFS);
  }
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Shift+Tab");
    trapped &&= await page.evaluate((s) => document.querySelector(s).contains(document.activeElement), PREFS);
  }
  check("keyboard: focus trap holds (Tab and Shift+Tab)", trapped);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  check("keyboard: Esc closes the preferences", !(await visible(page, PREFS)));
  check("keyboard: banner returns after closing without a decision", await visible(page, BANNER));
});

// 9. Google Tag Manager, default: loads only after consent to its category ------------------------------
await session(async ({ ctx, page, since, mark }) => {
  await open(page, "?gtm=default");
  await page.waitForTimeout(2500);
  check("gtm default: no request to googletagmanager.com before consent", !since(0).some((u) => /googletagmanager\.com/.test(u)) && since(0).length === 0, since(0).join(", "));
  await page.click(`${BANNER} [fivex-consent="deny"]`);
  await page.waitForTimeout(1500);
  const m = mark();
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(3000);
  check("gtm default: no request to googletagmanager.com after 'deny all' (also after reload)", since(0).every((u) => !/googletagmanager\.com/.test(u)) && since(m).length === 0, since(0).join(", "));
});
await session(async ({ page, since }) => {
  await open(page, "?gtm=default");
  await page.click(`${BANNER} [fivex-consent="allow"]`);
  await page.waitForTimeout(6000);
  check("gtm default: container loads after 'allow all'", has(since(0), GTM));
  const dl = await page.evaluate(() => window.dataLayer.filter((e) => e && e.length === 3 && e[0] === "consent").map((e) => [e[1], e[2].analytics_storage, e[2].ad_storage]));
  check("gtm default: Consent Mode default was denied, update granted", dl[0]?.[0] === "default" && dl[0][1] === "denied" && dl[0][2] === "denied" && dl.at(-1)[0] === "update" && dl.at(-1)[1] === "granted" && dl.at(-1)[2] === "granted", JSON.stringify(dl));
});
await session(async ({ page, since }) => {
  await open(page, "?gtm=default");
  await page.click(`${BANNER} [fivex-consent="open-preferences"]`);
  await page.check('[fivex-consent-checkbox="marketing"]');
  await page.click(`${PREFS} button[type="submit"]`);
  await page.waitForTimeout(5000);
  check("gtm default (analytics): marketing-only consent does not load the container", !has(since(0), GTM), since(0).join(", "));
});
await session(async ({ page, since }) => {
  await open(page, "?gtm=marketing");
  await page.click(`${BANNER} [fivex-consent="open-preferences"]`);
  await page.check('[fivex-consent-checkbox="analytics"]');
  await page.click(`${PREFS} button[type="submit"]`);
  await page.waitForTimeout(5000);
  check("gtm category marketing: analytics-only consent does not load the container", !has(since(0), GTM), since(0).join(", "));
});

// 10. Google Tag Manager, explicit opt-in beforeConsent -------------------------------------------------
await session(async ({ ctx, page, since }) => {
  await open(page, "?gtm=before");
  await page.waitForTimeout(3000);
  check("gtm beforeConsent: container requested before any choice", has(since(0), GTM), since(0).join(", "));
  const others = since(0).filter((u) => !/^https:\/\/www\.googletagmanager\.com\//.test(u) && !/google-analytics\.com|analytics\.google\.com|doubleclick/.test(u));
  check("gtm beforeConsent: nothing else is requested before consent", others.length === 0, others.join(", "));
  const dl = await page.evaluate(() => window.dataLayer.filter((e) => e && e.length === 3 && e[0] === "consent").map((e) => [e[1], e[2].analytics_storage, e[2].ad_storage]));
  check("gtm beforeConsent: all signals denied before consent", dl.length > 0 && dl.every((d) => d[1] === "denied" && d[2] === "denied"), JSON.stringify(dl));
  check("gtm beforeConsent: no cookies or storage set by the package", (await cookies(ctx)).length === 0 && (await storageKeys(page)).length === 0, JSON.stringify(await cookies(ctx)));
});
await session(async ({ page, since, mark }) => {
  await open(page, "?gtm=before");
  await page.click(`${BANNER} [fivex-consent="deny"]`);
  await page.waitForTimeout(2500);
  const m = mark();
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(3000);
  const others = since(m).filter((u) => !/^https:\/\/www\.googletagmanager\.com\//.test(u));
  check("gtm beforeConsent: after 'deny all' only the container is requested", others.length === 0, others.join(", "));
});
await session(async ({ page, since }) => {
  await open(page, "?gtm=before");
  await page.click(`${BANNER} [fivex-consent="allow"]`);
  await page.waitForTimeout(6000);
  const dl = await page.evaluate(() => window.dataLayer.filter((e) => e && e.length === 3 && e[0] === "consent" && e[1] === "update").map((e) => e[2].analytics_storage));
  check("gtm beforeConsent: 'allow all' updates the signals to granted without loading the container twice", dl.at(-1) === "granted" && since(0).filter((u) => GTM.test(u)).length === 1, JSON.stringify(dl));
});


// 11. fivex-consent-html cannot run script (allow-list sanitizer) ----------------------------------------------
const esc = (str) => str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const SCRIPT_TAG = `<script src="/consent.min.js" defer></script>`;
const XSS = [
  `<a id="x1" href="&#1;javascript:window.__x1=1">x1</a>`,
  `<a id="x2" href="java&#9;script:window.__x2=1">x2</a>`,
  `<form id="f3" action="javascript:window.__x3=1"><button id="x3">x3</button></form>`,
  `<form><button id="x4" formaction="javascript:window.__x4=1">x4</button></form>`,
  `<svg width="50" height="50"><a id="x5"><animate attributeName="href" values="javascript:window.__x5=1" begin="0s" fill="freeze"/><rect width="50" height="50"/></a></svg>`,
  `<a id="x6" href="  JaVa&#10;ScRiPt:window.__x6=1">x6</a><img id="x7" src="x" onerror="window.__x7=1">`,
].join("");
pages["/xss"] = `<!doctype html><html><head><script>window.FivexConsent={services:{}}</script>${SCRIPT_TAG}</head><body>
<div id="c" fivex-consent-categories="functional" fivex-consent-html="${esc(XSS)}"></div></body></html>`;
await session(async ({ page }) => {
  let dialogs = 0;
  page.on("dialog", (d) => (dialogs++, d.dismiss()));
  await page.goto(`${ORIGIN}/xss`, { waitUntil: "load" });
  await page.evaluate(() => window.FivexConsent.allow());
  await page.waitForTimeout(300);
  for (const id of ["x1", "x2", "x3", "x4", "x6"]) await page.click("#" + id, { timeout: 1500, force: true }).catch(() => {});
  await page.click("#x5 rect", { timeout: 1000, force: true }).catch(() => {});
  await page.waitForTimeout(600);
  const flags = await page.evaluate(() => [1, 2, 3, 4, 5, 6, 7].map((n) => window["__x" + n]));
  check("html sanitizer: none of the script payloads executes in Chrome", flags.every((f) => f === undefined) && dialogs === 0, JSON.stringify(flags));
  check("html sanitizer: no form, svg or event handler survives", (await page.locator("#c form, #c svg, #c [onerror], #c [formaction]").count()) === 0);
});

// 12. Webflow-interaction panels with the documented `defer` include ----------------------------------------------
const IX_BODY = `<div id="banner" fivex-consent="banner" style="display:none"><div fivex-consent="interaction" id="trig"></div><button fivex-consent="allow">ok</button></div>`;
const IX_BIND = `var b=document.getElementById("banner");document.getElementById("trig").addEventListener("click",function(){b.style.display=b.style.display==="none"?"block":"none";});`;
// binds on DOMContentLoaded + next tick, like jQuery-ready code in webflow.js
pages["/ix-jquery"] = `<!doctype html><html><head><script>window.FivexConsent={services:{}}</script>${SCRIPT_TAG}</head><body>${IX_BODY}
<script>document.addEventListener("DOMContentLoaded",function(){setTimeout(function(){${IX_BIND}},0);});</script></body></html>`;
// window.Webflow queue that is flushed once the handlers are bound
pages["/ix-webflow"] = `<!doctype html><html><head><script>window.FivexConsent={services:{}};window.Webflow=window.Webflow||[];</script>${SCRIPT_TAG}</head><body>${IX_BODY}
<script>document.addEventListener("DOMContentLoaded",function(){${IX_BIND}var q=window.Webflow;window.Webflow={push:function(f){f();}};q.forEach(function(f){f();});});</script></body></html>`;
for (const [name, url] of [["jQuery-ready timing", "/ix-jquery"], ["Webflow.push queue", "/ix-webflow"]]) {
  await session(async ({ page }) => {
    await page.goto(`${ORIGIN}${url}`, { waitUntil: "load" });
    await page.waitForTimeout(700);
    check(`interaction banner (${name}, defer in head): visible on first visit`, await page.isVisible("#banner"));
    await page.click('#banner [fivex-consent="allow"]');
    await page.waitForTimeout(300);
    check(`interaction banner (${name}): closes after a decision`, !(await page.isVisible("#banner")));
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(700);
    check(`interaction banner (${name}): stays closed on the next visit (no inverted state)`, !(await page.isVisible("#banner")));
  });
}

// 13. focus returns to a visible element; author CSS cannot unhide a blocked iframe ----------------------------------------------
pages["/focus"] = `<!doctype html><html><head><style>iframe{display:block;width:300px;height:100px}</style><script>window.FivexConsent={services:{}}</script>${SCRIPT_TAG}</head><body>
<div fivex-consent="banner"><button id="op" fivex-consent="open-preferences">Einstellungen</button></div>
<div fivex-consent="preferences" style="display:none"><h2>Cookie-Einstellungen</h2><form><label><input type=checkbox fivex-consent-checkbox="analytics"> A</label><button id="sv" type="submit">Speichern</button></form></div>
<div fivex-consent="manager" style="display:none"><button id="mg" fivex-consent="open-preferences">Cookies</button></div>
<iframe id="f" fivex-consent-categories="functional" fivex-consent-src="/blank"></iframe>
</body></html>`;
await session(async ({ page }) => {
  await page.goto(`${ORIGIN}/focus`, { waitUntil: "load" });
  check("blocked iframe stays invisible although author CSS says display:block", !(await page.isVisible("#f")));
  await page.focus("#op");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  check("preferences dialog has an accessible name (heading)", (await page.evaluate(() => { const d = document.querySelector('[fivex-consent="preferences"]'); return document.getElementById(d.getAttribute("aria-labelledby"))?.textContent; })) === "Cookie-Einstellungen");
  await page.focus("#sv");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  check("focus after saving lands on the visible cookie manager button, not the hidden banner", (await page.evaluate(() => document.activeElement.id)) === "mg");
});
await session(async ({ page }) => {
  await page.goto(`${ORIGIN}/focus`, { waitUntil: "load" });
  await page.evaluate(() => window.FivexConsent.allow());
  await page.waitForTimeout(500);
  check("blocked iframe is shown again once consent releases it", await page.isVisible("#f"));
});

// 14. scripts run in document order; a withdrawal in one tab reaches the other ----------------------------------------------
pages["/order"] = `<!doctype html><html><head><script>window.FivexConsent={services:{}}</script></head><body>
<script type="fivex-consent" fivex-consent-categories="analytics" src="/lib.js"></script>
<script type="fivex-consent" fivex-consent-categories="analytics">window.__seen = typeof window.Lib;</script>
<script src="/consent.min.js"></script></body></html>`;
await session(async ({ page }) => {
  await page.goto(`${ORIGIN}/order`, { waitUntil: "load" });
  await page.evaluate(() => window.FivexConsent.allow());
  await page.waitForTimeout(900);
  check("blocked scripts: the inline script sees the external library that precedes it", (await page.evaluate(() => window.__seen)) === "object", String(await page.evaluate(() => window.__seen)));
});
pages["/tab"] = `<!doctype html><html><head><script>window.FivexConsent={services:{}}</script></head><body>
<script type="fivex-consent" fivex-consent-categories="analytics">window.__ran = 1;</script>
<div fivex-consent="banner"><button fivex-consent="allow">ok</button></div>
<script src="/consent.min.js"></script></body></html>`;
await session(async ({ ctx, page }) => {
  await page.goto(`${ORIGIN}/tab`, { waitUntil: "load" });
  await page.evaluate(() => window.FivexConsent.allow());
  await page.waitForTimeout(300);
  await page.evaluate(() => (window.__alive = 1));
  const other = await ctx.newPage();
  await other.goto(`${ORIGIN}/tab`, { waitUntil: "load" });
  await other.evaluate(() => window.FivexConsent.deny());
  await page.waitForTimeout(1200);
  check("withdrawal in another tab: the first tab reloads and drops the consent", (await page.evaluate(() => window.__alive)) === undefined && !(await page.evaluate(() => window.FivexConsent.hasCategory("analytics"))));
});

// 15. embeds added after load (CMS "load more") are blocked too ----------------------------------------------
pages["/late"] = `<!doctype html><html><head><script>window.FivexConsent={services:{}}</script></head><body><div id="list"></div>
<script src="/consent.min.js"></script></body></html>`;
await session(async ({ page }) => {
  await page.goto(`${ORIGIN}/late`, { waitUntil: "load" });
  await page.evaluate(() => {
    document.getElementById("list").insertAdjacentHTML("beforeend", '<div><iframe id="lf" fivex-consent-categories="functional" fivex-consent-src="/blank"></iframe></div>');
  });
  await page.waitForTimeout(300);
  check("late embed: blocked with a placeholder", (await page.locator(".fivex-consent-placeholder").count()) === 1 && (await page.getAttribute("#lf", "src")) === null);
  await page.click(".fivex-consent-placeholder__btn--load");
  await page.waitForTimeout(500);
  check("late embed: loads after 'Inhalt laden'", (await page.getAttribute("#lf", "src")) !== null && (await page.isVisible("#lf")));
});


// 16. container embeds of loader-based services render for every container, however they are released ----------------------------------------------
// Live vendors (public demo ids). Per service: two sequential "Inhalt laden" clicks, a late container after "allow all", and two containers at start.
const VENDOR_BOXES = {
  calendly: [`<div class="calendly-inline-widget" data-url="https://calendly.com/acmesales"></div>`, `.calendly-inline-widget iframe`],
  typeform: [`<div data-tf-widget="Xc7NMh" class="tf"></div>`, `iframe`],
  tally: [`<iframe data-tally-src="https://tally.so/embed/mOGG8N?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1" loading="lazy" width="100%" height="200" title="Tally"></iframe>`, `iframe[src*="tally.so/embed"]`],
  trustpilot: [`<div class="trustpilot-widget" data-locale="en-GB" data-template-id="5419b6a8b0d04a076446a9ad" data-businessunit-id="487ca1a1000064000502f1e5" data-style-height="20px" data-style-width="100%" data-theme="light" data-stars="5"><a href="https://www.trustpilot.com/review/example.com" target="_blank" rel="noopener">Trustpilot</a></div>`, `iframe`],
  instagram: [`<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/p/CUbHfhpswxt/" data-instgrm-version="14"><a href="https://www.instagram.com/p/CUbHfhpswxt/" target="_blank" rel="noopener">post</a></blockquote>`, `iframe`],
  "x-twitter": [`<blockquote class="twitter-tweet" lang="en" dir="ltr"><p lang="en" dir="ltr">just setting up my twttr</p>&mdash; jack (@jack) <a href="https://twitter.com/jack/status/20">March 21, 2006</a></blockquote>`, `iframe, .twitter-tweet-rendered`],
  "cal-com": [`<div class="cal-inline" data-cal-link="rick/get-rick-rolled" data-cal-config='{"layout":"month_view"}'></div>`, `iframe, cal-inline`],
  hubspot: [`<div class="hs-form-html" data-region="na1" data-portal-id="53" data-form-id="95c7a26e-eb03-4da7-bb69-4ca3c029983b"></div>`, `form, iframe`],
  wistia: [`<wistia-player media-id="j38ihh83m5" aspect="1.7777777777777777"></wistia-player>`, `wistia-player`],
};
const box = (svc, n, html) => `<div class="blk"><div id="c${n}" fivex-consent-service="${svc}" fivex-consent-html="${esc(html)}"></div></div>`;
const rendered = (page, svc, n) =>
  page.evaluate(([n, sel, svc]) => {
    const c = document.getElementById("c" + n);
    if (!c) return 0;
    if (svc === "wistia") {
      const p = c.querySelector("wistia-player");
      return p && customElements.get("wistia-player") && (p.shadowRoot ? p.shadowRoot.childElementCount : p.childElementCount) ? 1 : 0;
    }
    return c.querySelectorAll(sel).length;
  }, [n, VENDOR_BOXES[svc][1], svc]);
await Promise.all(
  Object.entries(VENDOR_BOXES).map(([svc, [html]]) => {
    const cfg = svc === "hubspot" ? `{ id: "12345678" }` : "true";
    pages["/vendor-" + svc] = `<!doctype html><html><head><meta charset="utf-8"><style>.blk{height:560px;margin:8px 0;overflow:hidden}.calendly-inline-widget,.cal-inline{min-width:320px;height:500px}.tf{height:400px}</style>
<script>window.FivexConsent={services:{"${svc}":${cfg}}}</script>${SCRIPT_TAG}</head><body>${box(svc, 1, html)}${box(svc, 2, html)}</body></html>`;
    return session(async ({ page, reqs }) => {
      await page.setViewportSize({ width: 1200, height: 1800 });
      await page.goto(`${ORIGIN}/vendor-${svc}`, { waitUntil: "load" });
      await page.waitForTimeout(500);
      await page.locator('#c1 >> xpath=.. >> [fivex-consent="load-embed"]').click();
      await page.waitForTimeout(6000);
      const first = await rendered(page, svc, 1);
      await page.locator('#c2 >> xpath=.. >> [fivex-consent="load-embed"]').click();
      await page.waitForTimeout(7000);
      check(`container embed ${svc}: first one-off load renders`, first > 0, String(first));
      check(`container embed ${svc}: second one-off load renders after the loader already ran`, (await rendered(page, svc, 2)) > 0);
      await page.evaluate(() => window.FivexConsent.allow());
      await page.waitForTimeout(3000);
      await page.evaluate(([h]) => document.body.insertAdjacentHTML("beforeend", h), [box(svc, 3, html)]);
      await page.waitForTimeout(7000);
      check(`container embed ${svc}: late container after 'allow all' renders`, (await rendered(page, svc, 3)) > 0);
      if (svc === "hubspot") {
        const urls = reqs.filter((u) => !isLocal(u));
        const trackerIdx = urls.findIndex((u) => /js\.hs-scripts\.com/.test(u));
        check("hubspot form 'Inhalt laden': only the forms script is requested, no tracking code", urls.some((u) => /js\.hsforms\.net\/forms\/embed\/v2\.js/.test(u)) && trackerIdx > urls.findIndex((u) => /\/embed\/v3\/form\//.test(u)), urls.join(", "));
      }
    });
  }),
);
await session(async ({ page, reqs }) => {
  await page.goto(`${ORIGIN}/vendor-hubspot`, { waitUntil: "load" });
  await page.locator('#c1 >> xpath=.. >> [fivex-consent="allow-embed"]').click();
  await page.waitForTimeout(6000);
  const urls = reqs.filter((u) => !isLocal(u));
  check("hubspot form 'Immer erlauben': forms script, no tracking code", urls.some((u) => /js\.hsforms\.net\/forms\/embed\/v2\.js/.test(u)) && !urls.some((u) => /js\.hs-scripts\.com/.test(u)), urls.join(", "));
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(5000);
  check("hubspot form 'Immer erlauben': next page view loads the form but still no tracking code", !reqs.slice(reqs.lastIndexOf(`${ORIGIN}/vendor-hubspot`)).some((u) => /js\.hs-scripts\.com/.test(u)));
});

// 17. Google Consent Mode: one result for gtm + ga4 and ga4 + google-ads, whatever the config order -----------------------------------------------------
const SIG_KEYS = ["analytics_storage", "ad_storage", "ad_user_data", "ad_personalization", "functionality_storage", "personalization_storage"];
async function finalSignals(page, order, ads) {
  const ids = { gtm: `{ id: "GTM-TEST123" }`, ga4: `{ id: "G-TEST12345"${ads ? ", ads: true" : ""} }`, "google-ads": `{ id: "AW-123456789" }` };
  pages["/sig"] = `<!doctype html><html><head><script>window.FivexConsent={services:{${order.map((k) => `"${k}":${ids[k]}`).join(",")}}}</script>${SCRIPT_TAG}</head><body></body></html>`;
  await page.goto(`${ORIGIN}/sig`, { waitUntil: "load" });
  await page.evaluate(() => window.FivexConsent.allow());
  await page.waitForTimeout(1500);
  return page.evaluate(() => Object.assign({}, ...window.dataLayer.filter((e) => e && e[0] === "consent" && e[1] === "update").map((e) => ({ ...e[2] }))));
}
await session(async ({ page }) => {
  const a = await finalSignals(page, ["gtm", "ga4"]);
  const b = await finalSignals(page, ["ga4", "gtm"]);
  check("consent mode gtm+ga4: same signals in both config orders", JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort()), JSON.stringify([a, b]));
  check("consent mode gtm+ga4: all six signals granted after 'allow all'", SIG_KEYS.every((k) => a[k] === "granted"), JSON.stringify(a));
  const c = await finalSignals(page, ["ga4", "google-ads"]);
  const d = await finalSignals(page, ["google-ads", "ga4"]);
  check("consent mode ga4+google-ads: same signals in both config orders", JSON.stringify(Object.entries(c).sort()) === JSON.stringify(Object.entries(d).sort()), JSON.stringify([c, d]));
  check("consent mode ga4+google-ads: analytics and ad signals granted", c.analytics_storage === "granted" && c.ad_storage === "granted" && c.ad_user_data === "granted", JSON.stringify(c));
  const e = await finalSignals(page, ["ga4"]);
  check("consent mode ga4 alone: no ad_* signal is sent", !Object.keys(e).some((k) => k.startsWith("ad_")) && e.analytics_storage === "granted", JSON.stringify(e));
});

// 18. one-off loads survive later decisions: no reload, typed text stays; another tab's 'Immer erlauben' never reloads this tab ---------------------------
pages["/oneoff"] = `<!doctype html><html><head><script>window.FivexConsent={services:{youtube:true,vimeo:true}}</script>${SCRIPT_TAG}</head><body>
<div fivex-consent="banner"><button id="deny" fivex-consent="deny">Nur notwendige</button><button id="allow" fivex-consent="allow">Alle</button></div>
<div id="y"><iframe id="yt" fivex-consent-service="youtube" fivex-consent-src="https://www.youtube-nocookie.com/embed/jNQXAC9IVRw"></iframe></div>
<div id="v"><iframe id="vm" fivex-consent-service="vimeo" fivex-consent-src="https://player.vimeo.com/video/76979871"></iframe></div>
<form onsubmit="return false"><input id="field"></form></body></html>`;
await session(async ({ page }) => {
  await page.goto(`${ORIGIN}/oneoff`, { waitUntil: "load" });
  await page.evaluate(() => (window.__alive = 1));
  await page.click('#y [fivex-consent="load-embed"]');
  await page.fill("#field", "typed text");
  await page.click("#deny");
  await page.waitForTimeout(1500);
  check("one-off 'Inhalt laden' then 'Nur notwendige': page not reloaded, typed text survives", (await page.evaluate(() => [window.__alive, document.getElementById("field").value])).join("|") === "1|typed text");
  check("one-off then 'Nur notwendige': the embed stays", (await page.getAttribute("#yt", "src")) !== null);
});
await session(async ({ ctx, page }) => {
  await page.goto(`${ORIGIN}/oneoff`, { waitUntil: "load" });
  await page.evaluate(() => (window.__alive = 1));
  await page.click('#y [fivex-consent="load-embed"]');
  await page.fill("#field", "typed in B");
  const a = await ctx.newPage();
  await a.goto(`${ORIGIN}/oneoff`, { waitUntil: "load" });
  await a.click('#v [fivex-consent="allow-embed"]');
  await page.waitForTimeout(1500);
  check("another tab's 'Immer erlauben' never reloads this tab (typed text and one-off embed stay)", (await page.evaluate(() => [window.__alive, document.getElementById("field").value])).join("|") === "1|typed in B" && (await page.getAttribute("#yt", "src")) !== null);
});
await session(async ({ ctx, page }) => {
  await page.goto(`${ORIGIN}/oneoff`, { waitUntil: "load" });
  await page.click(`[fivex-consent="allow"]`);
  await page.waitForTimeout(500);
  await page.evaluate(() => (window.__alive = 1));
  const other = await ctx.newPage();
  await other.goto(`${ORIGIN}/oneoff`, { waitUntil: "load" });
  await other.evaluate(() => window.FivexConsent.deny());
  await page.waitForTimeout(1500);
  check("a stored grant revoked in another tab still reloads this tab", (await page.evaluate(() => window.__alive)) === undefined);
});

// 19. Webflow interactions: no wait for the window load event, a missing webflow.js never hides the banner, delayed interactions are not inverted ----------
pages["/slow-img"] = `<!doctype html><html><head><script>window.FivexConsent={services:{}}</script>${SCRIPT_TAG}</head><body>
<div id="banner" fivex-consent="banner" style="display:none"><div fivex-consent="interaction" id="trig"></div><button fivex-consent="allow">ok</button></div><img src="/slow.png">
<script>document.addEventListener("DOMContentLoaded",function(){var b=document.getElementById("banner");document.getElementById("trig").addEventListener("click",function(){b.style.display=b.style.display==="none"?"block":"none";});});</script></body></html>`;
pages["/no-webflow"] = `<!doctype html><html><head><script>window.FivexConsent={services:{}}</script>${SCRIPT_TAG}</head><body>
<div id="banner" fivex-consent="banner" style="display:none"><div fivex-consent="interaction" id="trig"></div><button fivex-consent="allow">ok</button></div></body></html>`;
pages["/no-webflow-queue"] = `<!doctype html><html><head><script>window.FivexConsent={services:{}};window.Webflow=window.Webflow||[];</script>${SCRIPT_TAG}</head><body>
<div id="banner" fivex-consent="banner" style="display:none"><div fivex-consent="interaction" id="trig"></div><button fivex-consent="allow">ok</button></div></body></html>`;
for (const delay of [0, 600, 1000]) {
  pages["/ix-delay" + delay] = `<!doctype html><html><head><script>window.FivexConsent={services:{}}</script>${SCRIPT_TAG}</head><body>
<div id="banner" fivex-consent="banner" style="display:none"><div fivex-consent="interaction" id="trig"></div><button fivex-consent="allow">ok</button></div>
<script>window.__clicks=0;document.addEventListener("DOMContentLoaded",function(){var b=document.getElementById("banner"),open=false;
document.getElementById("trig").addEventListener("click",function(){window.__clicks++;open=!open;var o=open;setTimeout(function(){b.style.display=o?"block":"none";},${delay});});});</script></body></html>`;
}
await session(async ({ page }) => {
  const t0 = Date.now();
  await page.goto(`${ORIGIN}/slow-img`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#banner", { state: "visible", timeout: 10000 });
  const ms = Date.now() - t0;
  check("interaction banner does not wait for the window load event (image still loading)", ms < 2500 && (await page.evaluate(() => document.readyState)) !== "complete", `${ms} ms, ${await page.evaluate(() => document.readyState)}`);
});
await session(async ({ page }) => {
  await page.goto(`${ORIGIN}/no-webflow`, { waitUntil: "load" });
  await page.waitForTimeout(5000);
  check("missing webflow.js: the banner is still shown (fallback), not hidden forever", await page.isVisible("#banner"));
  await page.click('#banner [fivex-consent="allow"]');
  await page.waitForTimeout(5000);
  check("missing webflow.js: the banner is hidden again after a decision", !(await page.isVisible("#banner")));
});
await session(async ({ page }) => {
  await page.goto(`${ORIGIN}/no-webflow-queue`, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  check("webflow.js never flushes its queue: the banner is shown 1.5 s after DOMContentLoaded by the fallback", await page.isVisible("#banner"));
});
for (const delay of [0, 600, 1000]) {
  await session(async ({ page }) => {
    await page.goto(`${ORIGIN}/ix-delay${delay}`, { waitUntil: "load" });
    await page.waitForTimeout(5000);
    check(`interaction with a display switch after ${delay} ms: visible, clicked once`, (await page.isVisible("#banner")) && (await page.evaluate(() => window.__clicks)) === 1, String(await page.evaluate(() => window.__clicks)));
    await page.click('#banner [fivex-consent="allow"]');
    await page.waitForTimeout(5000);
    check(`interaction with a display switch after ${delay} ms: closes after the decision, never inverted`, !(await page.isVisible("#banner")) && (await page.evaluate(() => window.__clicks)) === 2, String(await page.evaluate(() => window.__clicks)));
  });
}

// 20. sanitizer: id / name cannot clobber window properties in a real browser ----------------------------------------------------------------------------
pages["/clobber"] = `<!doctype html><html><head><script>window.FivexConsent={services:{ga4:{id:"G-TEST12345"}}}</script>${SCRIPT_TAG}</head><body>
<div id="c" fivex-consent-categories="functional" fivex-consent-html="${esc(`<form id="dataLayer" name="gtag"><input name="push"></form><img id="dataLayer" name="gtag" src="/blank" alt=""><a id="google_tag_manager" href="/x" target="foo" rel="opener">x</a>`)}"></div></body></html>`;
await session(async ({ page }) => {
  await page.goto(`${ORIGIN}/clobber`, { waitUntil: "load" });
  await page.evaluate(() => window.FivexConsent.allow());
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => ({ layer: Array.isArray(window.dataLayer), ids: document.querySelectorAll("#c [id],#c [name]").length, rel: document.querySelector("#c a")?.getAttribute("rel") }));
  check("sanitizer: id / name are stripped, window.dataLayer stays an array, named targets get rel=noopener noreferrer", r.layer && r.ids === 0 && r.rel === "noopener noreferrer", JSON.stringify(r));
});

// 21. back/forward cache: the page is restored and still hears other tabs after a restore --------------------------------------------------------
pages["/bfc"] = `<!doctype html><html><head><script>window.FivexConsent={services:{}}</script>${SCRIPT_TAG}</head><body><a id="l" href="/blank">x</a></body></html>`;
{
  const bf = await chromium.launch({ executablePath: CHROME, headless: true, ignoreDefaultArgs: ["--disable-back-forward-cache"] });
  const ctx = await bf.newContext();
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/bfc`, { waitUntil: "load" });
  await page.evaluate(() => (window.__alive = 1));
  await page.click("#l");
  await page.waitForURL(/blank/);
  await page.waitForTimeout(300);
  await page.goBack({ waitUntil: "commit" });
  await page.waitForTimeout(800);
  check("back/forward cache: the page with the consent script is restored from the cache", (await page.evaluate(() => window.__alive)) === 1);
  const other = await ctx.newPage();
  await other.goto(`${ORIGIN}/bfc`, { waitUntil: "load" });
  await other.evaluate(() => window.FivexConsent.allow());
  await page.waitForTimeout(800);
  check("back/forward cache: after the restore the channel works again (decision of another tab arrives)", await page.evaluate(() => window.FivexConsent.hasConsent()));
  await bf.close();
}

await browser.close();
server.close();
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
