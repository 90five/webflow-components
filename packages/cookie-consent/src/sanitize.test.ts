// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { safeUrl, sanitizeHtml } from "./sanitize";

const C = (n: number) => String.fromCharCode(n);

function run(html: string): HTMLElement {
  const host = document.createElement("div");
  host.appendChild(sanitizeHtml(html, document));
  return host;
}

const ELEMENTS = new Set("div span p a strong em b i ul ol li br img h1 h2 h3 h4 h5 h6 button small figure figcaption picture source blockquote".split(" "));
const ATTRS = new Set("class href src srcset sizes alt title width height loading target rel role type cite lang dir".split(" "));

/** Invariant for any output: only allow-listed elements and attributes, no event handlers, safe URLs. */
function assertClean(host: HTMLElement): void {
  for (const el of Array.from(host.querySelectorAll("*"))) {
    expect(ELEMENTS.has(el.localName), `element <${el.localName}>`).toBe(true);
    expect(el.namespaceURI).toBe("http://www.w3.org/1999/xhtml");
    for (const a of Array.from(el.attributes)) {
      const ok = ATTRS.has(a.name) || /^(aria|data)-/.test(a.name);
      expect(ok, `attribute ${a.name} on <${el.localName}>`).toBe(true);
      expect(a.name.startsWith("on")).toBe(false);
      if (a.name === "href" || a.name === "src") expect(safeUrl(a.value), `${a.name}=${JSON.stringify(a.value)}`).toBe(true);
    }
    if (el.localName === "button") expect(el.getAttribute("type")).toBe("button");
  }
  expect(host.innerHTML).not.toMatch(/javascript:/i);
}

describe("sanitizeHtml: reviewer payloads", () => {
  it("drops a control character in front of the scheme", () => {
    const h = run(`<a class="x1" href="&#1;javascript:window.__x1=1">x</a>`);
    expect(h.querySelector(".x1")!.hasAttribute("href")).toBe(false);
  });
  it("drops a tab inside the scheme", () => {
    const h = run(`<a class="x2" href="java&#9;script:window.__x2=1">x</a>`);
    expect(h.querySelector(".x2")!.hasAttribute("href")).toBe(false);
  });
  it("drops form elements (form action)", () => {
    const h = run(`<form id="f3" action="javascript:window.__x3=1"><button id="x3">x</button></form>`);
    expect(h.querySelector("form")).toBeNull();
    expect(h.querySelector("[action],[formaction]")).toBeNull();
  });
  it("drops button formaction", () => {
    const h = run(`<form><button id="x4" formaction="javascript:window.__x4=1">x</button></form>`);
    expect(h.querySelector("[formaction]")).toBeNull();
  });
  it("drops svg including animate attributeName=href", () => {
    const h = run(`<svg width="50" height="50"><a id="x5"><animate attributeName="href" values="javascript:window.__x5=1" begin="0s" fill="freeze"/><rect width="50" height="50"/></a></svg>`);
    expect(h.querySelector("svg,animate,rect")).toBeNull();
    expect(h.innerHTML).not.toContain("javascript");
  });
});

describe("sanitizeHtml: corpus", () => {
  const attacks: Array<[string, string]> = [
    ["script", `<script>window.__pwn=1</script>`],
    ["img onerror", `<img src=x onerror="window.__pwn=1">`],
    ["img onload uppercase", `<IMG SRC="a.png" ONLOAD="window.__pwn=1">`],
    ["javascript: uppercase mixed", `<a href="JaVaScRiPt:window.__pwn=1">x</a>`],
    ["javascript: leading spaces", `<a href="   javascript:window.__pwn=1">x</a>`],
    ["javascript: newline in scheme", `<a href="java&#10;script:window.__pwn=1">x</a>`],
    ["javascript: carriage return", `<a href="java&#13;script:window.__pwn=1">x</a>`],
    ["javascript: hex entity tab", `<IMG SRC="jav&#x09;ascript:window.__pwn=1">`],
    ["javascript: entity letters", `<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;window.__pwn=1">x</a>`],
    ["javascript: null byte", `<a href="java&#0;script:window.__pwn=1">x</a>`],
    ["javascript: zero-width", `<a href="java&#x200B;script:window.__pwn=1">x</a>`],
    ["javascript: percent-encoded", `<a href="java%73cript:window.__pwn=1">x</a>`],
    ["vbscript", `<a href="vbscript:msgbox(1)">x</a>`],
    ["data: html", `<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>`],
    ["data: image src", `<img src="data:image/svg+xml,<svg onload=alert(1)>">`],
    ["blob:", `<a href="blob:https://x.test/abc">x</a>`],
    ["file:", `<a href="file:///etc/passwd">x</a>`],
    ["srcset javascript", `<img srcset="a.png 1x, javascript:window.__pwn=1 2x">`],
    ["source srcset javascript", `<picture><source srcset="javascript:window.__pwn=1"><img src="a.png"></picture>`],
    ["iframe", `<iframe src="https://evil.test/"></iframe>`],
    ["iframe srcdoc", `<iframe srcdoc="<script>parent.__pwn=1</script>"></iframe>`],
    ["object", `<object data="javascript:window.__pwn=1"></object>`],
    ["embed", `<embed src="javascript:window.__pwn=1">`],
    ["style element", `<style>body{display:none}</style>`],
    ["style attribute", `<div style="background:url(javascript:window.__pwn=1)">x</div>`],
    ["link", `<link rel="stylesheet" href="https://evil.test/x.css">`],
    ["meta refresh", `<meta http-equiv="refresh" content="0;url=javascript:window.__pwn=1">`],
    ["base", `<base href="https://evil.test/">`],
    ["svg onload", `<svg onload="window.__pwn=1"></svg>`],
    ["svg script", `<svg><script>window.__pwn=1</script></svg>`],
    ["svg a xlink", `<svg><a xlink:href="javascript:window.__pwn=1"><text>x</text></a></svg>`],
    ["svg set", `<svg><a id="x"><set attributeName="href" to="javascript:window.__pwn=1"/><text>x</text></a></svg>`],
    ["math", `<math><mi xlink:href="javascript:window.__pwn=1">x</mi></math>`],
    ["mXSS math/style", `<math><mtext><table><mglyph><style><!--</style><img title="--&gt;&lt;img src=1 onerror=window.__pwn=1&gt;">`],
    ["body onload", `<body onload="window.__pwn=1">x</body>`],
    ["div handlers", `<div onmouseover="window.__pwn=1" onclick="window.__pwn=1" onfocus="window.__pwn=1" autofocus tabindex=0>x</div>`],
    ["input autofocus", `<input autofocus onfocus="window.__pwn=1">`],
    ["textarea", `<textarea><img src=x onerror=window.__pwn=1></textarea>`],
    ["noscript", `<noscript><p title="</noscript><img src=x onerror=window.__pwn=1>"></noscript>`],
    ["template", `<template><img src=x onerror=window.__pwn=1></template>`],
    ["details ontoggle", `<details open ontoggle="window.__pwn=1"><summary>x</summary></details>`],
    ["video source", `<video><source onerror="window.__pwn=1" src="x"></video>`],
    ["form button formaction", `<form id="f"><button formaction="javascript:window.__pwn=1">x</button></form><button form="f" formaction="javascript:window.__pwn=1">y</button>`],
    ["button type submit", `<button type="submit" onclick="window.__pwn=1">x</button>`],
    ["comment", `<!--[if IE]><script>window.__pwn=1</script><![endif]-->`],
    ["a with target blank", `<a href="https://x.test/" target="_blank">x</a>`],
    ["uppercase tags", `<SCRIPT SRC=//evil.test/x.js></SCRIPT><A HREF="JAVASCRIPT:window.__pwn=1">x</A>`],
    ["nested broken", `<div<script>window.__pwn=1</script>>x</div>`],
    ["attribute name tricks", `<a href=# on&#x0A;click=window.__pwn=1>x</a>`],
    ["xml namespace", `<x:script xmlns:x="http://www.w3.org/1999/xhtml">window.__pwn=1</x:script>`],
  ];

  it.each(attacks)("%s", (_name, payload) => {
    const h = run(payload);
    assertClean(h);
    expect(h.querySelector("script,iframe,object,embed,style,link,meta,base,svg,math,form,input,textarea,template,noscript,video")).toBeNull();
  });

  it("keeps harmless markup and allow-listed attributes", () => {
    const h = run(
      `<div class="calendly-inline-widget" data-url="https://calendly.com/x" aria-label="Termin" role="region"><h2>Titel</h2><p>Text <strong>fett</strong> <em>kursiv</em><br><small>klein</small></p>` +
        `<a href="https://x.test/a?b=c:d" target="_blank">Link</a> <a href="mailto:a@x.test">Mail</a> <a href="tel:+4912345">Tel</a> <a href="/relativ">r</a> <a href="#anker">a</a> <a href="//cdn.x.test/">pr</a>` +
        `<ul><li>1</li></ul><ol><li>2</li></ol><figure><picture><source srcset="a.webp 1x, b.webp 2x" sizes="100vw"><img src="a.png" alt="A" width="10" height="10" loading="lazy"></picture><figcaption>c</figcaption></figure><button type="button" title="t">B</button></div>`,
    );
    assertClean(h);
    expect(h.querySelector(".calendly-inline-widget")!.getAttribute("data-url")).toBe("https://calendly.com/x");
    expect(h.querySelectorAll("a[href]").length).toBe(6);
    expect(h.querySelector("source")!.getAttribute("srcset")).toBe("a.webp 1x, b.webp 2x");
    expect(h.querySelector('a[target="_blank"]')!.getAttribute("rel")).toBe("noopener noreferrer");
    expect(h.querySelector("img")!.getAttribute("alt")).toBe("A");
  });

  it("forces buttons to type=button and removes style attributes", () => {
    const h = run(`<button type="submit" style="color:red">x</button><button>y</button>`);
    expect(Array.from(h.querySelectorAll("button")).map((b) => b.getAttribute("type"))).toEqual(["button", "button"]);
    expect(h.querySelector("[style]")).toBeNull();
  });

  it("returns a DOM fragment that is not re-parsed (no mutation after sanitising)", () => {
    const h = run(`<p>a<b>b</b></p>`);
    expect(h.innerHTML).toBe("<p>a<b>b</b></p>");
  });
});

describe("safeUrl", () => {
  it("accepts http(s), mailto, tel and relative URLs", () => {
    for (const u of ["https://x.test/", "http://x.test", "mailto:a@b.test", "tel:+49", "/a/b", "a/b", "#x", "?q=1", "//cdn.test/x", "a?x=b:c", "./a:b"]) expect(safeUrl(u), u).toBe(true);
  });
  it("rejects other schemes, also hidden behind controls, spaces and case", () => {
    const bad = [
      "javascript:1", "JAVASCRIPT:1", " javascript:1", C(1) + "javascript:1", "java" + C(9) + "script:1", "java" + C(10) + "script:1", "java" + C(0) + "script:1",
      "java" + C(0x200b) + "script:1", "java" + C(0xa0) + "script:1", "data:text/html,x", "vbscript:x", "blob:x", "file:///x", "ftp://x", "about:blank", "java%73cript:1", "x:y",
    ];
    for (const u of bad) expect(safeUrl(u), JSON.stringify(u)).toBe(false);
  });
});

describe("sanitizeHtml: id, name, data-*, target (hardening)", () => {
  it("strips id and name (no DOM clobbering of window / document properties)", () => {
    const h = run(`<div id="dataLayer" name="gtag"><a id="x" name="y" href="/a">a</a><img name="cookie" src="a.png" alt=""></div>`);
    expect(h.querySelector("[id],[name]")).toBeNull();
    expect(h.querySelector("a")!.getAttribute("href")).toBe("/a");
  });
  it("keeps plain data-* attributes of embeds", () => {
    const h = run(`<div class="trustpilot-widget" data-locale="de-DE" data-businessunit-id="abc123" data-style-height="52px" data-instgrm-permalink="https://www.instagram.com/p/x/" data-tf-live="ID"></div>`);
    expect(h.querySelector("div")!.getAttributeNames().sort()).toEqual(["class", "data-businessunit-id", "data-instgrm-permalink", "data-locale", "data-style-height", "data-tf-live"]);
  });
  it.each([
    "data-bind", "data-hx-get", "data-hx-trigger", "data-hx-on", "data-htmx-x", "data-x-data", "data-x-on-click", "data-v-bind", "data-vue-x", "data-ng-click", "data-on", "data-onclick", "data-on-click",
    "data-action", "data-controller", "data-turbo-frame", "data-ko-bind", "data-alpine-x", "data-bs-toggle", "data-toggle", "data-target", "data-js-click",
  ])("drops the framework attribute %s", (name) => {
    const h = run(`<div ${name}="alert(1)" data-ok="1">x</div>`);
    expect(h.querySelector("div")!.getAttributeNames()).toEqual(["data-ok"]);
  });
  it("drops data-* names outside the pattern and x-/@ attributes", () => {
    const h = run(`<div data-a_b="2" data-a.b="3" data-="4" data-1x="5" x-data="{}" x-on:click="alert(1)" @click="alert(1)" :class="x" v-if="1" ng-click="a()" data-ok-2="6">x</div>`);
    expect(h.querySelector("div")!.getAttributeNames()).toEqual(["data-ok-2"]);
  });
  it.each(["_blank", " _blank", "_BLANK", "foo", "named", "_unfencedTop", "framename"])("target=%j gets rel=noopener noreferrer, also over an existing rel", (target) => {
    const h = run(`<a href="https://x.test/" target="${target}" rel="opener">x</a>`);
    expect(h.querySelector("a")!.getAttribute("rel")).toBe("noopener noreferrer");
  });
  it.each(["_self", "_top", "_parent", ""])("target=%j is left alone", (target) => {
    const h = run(`<a href="https://x.test/" target="${target}" rel="author">x</a>`);
    expect(h.querySelector("a")!.getAttribute("rel")).toBe("author");
  });
});

describe("sanitizeHtml: blockquote and per-service markup", () => {
  it("keeps blockquote with cite, lang, dir, class and data-* (Instagram / X markup), safe cite URLs only", () => {
    const h = run(
      `<blockquote class="twitter-tweet" lang="en" dir="ltr" cite="https://x.com/a/status/1" data-theme="dark"><p lang="en" dir="ltr">hi</p>&mdash; A <a href="https://x.com/a/status/1">date</a></blockquote>` +
        `<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/p/x/" data-instgrm-version="14" cite="javascript:alert(1)"><a href="https://www.instagram.com/p/x/">post</a></blockquote>`,
    );
    const [tw, ig] = Array.from(h.querySelectorAll("blockquote"));
    expect(tw.getAttribute("cite")).toBe("https://x.com/a/status/1");
    expect(tw.getAttribute("lang")).toBe("en");
    expect(tw.getAttribute("data-theme")).toBe("dark");
    expect(ig.hasAttribute("cite")).toBe(false);
    expect(ig.getAttribute("data-instgrm-permalink")).toBe("https://www.instagram.com/p/x/");
  });
  it("custom elements and extra attributes are dropped unless the service grants them", () => {
    const html = `<wistia-player media-id="abc123" aspect="1.7777" onclick="x()"></wistia-player><p media-id="x">t</p>`;
    expect(run(html).querySelector("wistia-player")).toBeNull();
    const host = document.createElement("div");
    host.appendChild(sanitizeHtml(html, document, { elements: ["wistia-player"], attributes: ["media-id", "aspect"] }));
    const el = host.querySelector("wistia-player")!;
    expect(el.getAttributeNames().sort()).toEqual(["aspect", "media-id"]);
    expect(host.querySelector("p")!.hasAttribute("media-id")).toBe(false); // extra attributes apply to the extra elements only
  });
  it("an extra iframe never keeps src / srcdoc; data-*-src must point to one of the service hosts", () => {
    const html =
      `<iframe src="https://evil.test/" srcdoc="<script>1</script>" data-tally-src="https://tally.so/embed/abc?x=1" width="100%" height="200" loading="lazy" onload="x()"></iframe>` +
      `<iframe data-tally-src="https://evil.test/embed/abc"></iframe><iframe data-tally-src="javascript:alert(1)"></iframe>`;
    const host = document.createElement("div");
    host.appendChild(sanitizeHtml(html, document, { elements: ["iframe"], attributes: ["data-tally-src"], hosts: ["tally.so"] }));
    const [a, b, c] = Array.from(host.querySelectorAll("iframe"));
    expect(a.getAttributeNames().sort()).toEqual(["data-tally-src", "height", "loading", "width"]);
    expect(b.hasAttribute("data-tally-src")).toBe(false);
    expect(c.hasAttribute("data-tally-src")).toBe(false);
    expect(run(html).querySelector("iframe")).toBeNull();
  });
});
