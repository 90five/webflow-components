/**
 * Allow-list sanitizer for the markup in `fivex-consent-html`.
 *
 * The markup is parsed into an inert <template>, walked once, and rebuilt from scratch with
 * `createElement`: only elements and attributes on the lists below survive, everything else
 * (including its children) is dropped. The result is a DOM fragment, never a re-serialised string.
 *
 * The author of the markup is trusted (it is part of the page); the sanitizer is a safety net
 * against mistakes and against markup that was pasted from untrusted sources.
 */
const ELEMENTS = new Set([
  "div", "span", "p", "a", "strong", "em", "b", "i", "ul", "ol", "li", "br", "img",
  "h1", "h2", "h3", "h4", "h5", "h6", "button", "small", "figure", "figcaption", "picture", "source", "blockquote",
]);
// `id` and `name` are not allowed: they would create named properties on window / document (DOM clobbering,
// e.g. id="dataLayer"). Use classes.
const ATTRIBUTES = new Set(["class", "href", "src", "srcset", "sizes", "alt", "title", "width", "height", "loading", "target", "rel", "role", "cite", "lang", "dir"]);
const URL_ATTRIBUTES = new Set(["href", "src", "srcset", "cite"]);
/** data-* names: lower case words joined by single dashes. Framework attributes that evaluate or dispatch are excluded. */
const DATA_NAME = /^data-[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const DATA_DENIED = /^data-(bind$|bind-|hx-|htmx-|x-|v-|vue-|ng-|on|ko-|alpine-|action$|action-|controller$|controller-|turbo$|turbo-|bs-|toggle$|target$|dismiss$|trigger$|method$|remote$|confirm$|js$|js-|call$|click$)/;
const ALLOWED_SCHEMES = new Set(["http", "https", "mailto", "tel"]);
const XHTML = "http://www.w3.org/1999/xhtml";

/** Characters browsers ignore or strip inside URLs: C0 controls, space, DEL, Unicode spaces and invisibles. */
// eslint-disable-next-line no-control-regex
const STRIP = /[\u0000-\u0020\u007F-\u00A0\u1680\u180E\u2000-\u200F\u2028-\u202F\u205F-\u206F\u3000\uFEFF]/g;

/** Is this value a URL with an allowed scheme, or a relative URL? */
export function safeUrl(value: string): boolean {
  let v = value.replace(STRIP, "");
  try {
    v = decodeURIComponent(v).replace(STRIP, "");
  } catch {
    /* malformed escape: judge the raw value */
  }
  const m = /^([^:/?#]*):/.exec(v);
  if (!m) return true; // no scheme before the first / ? # -> relative
  return ALLOWED_SCHEMES.has(m[1].toLowerCase());
}

function safeSrcset(value: string): boolean {
  return value
    .split(",")
    .map((c) => c.trim().split(/\s+/)[0])
    .filter(Boolean)
    .every(safeUrl);
}

function allowedAttribute(name: string, extra: Set<string>): boolean {
  if (ATTRIBUTES.has(name) || extra.has(name)) return true;
  if (/^aria-[a-z0-9_.:-]+$/.test(name)) return true;
  return DATA_NAME.test(name) && !DATA_DENIED.test(name);
}

/** What a container service may add to the base allow-list (ServiceDef.embed.markup). */
export interface Extra {
  elements?: string[];
  attributes?: string[];
  /** Host suffixes: URLs in `data-*src` attributes of extra elements must point to one of them. */
  hosts?: string[];
}

function hostOk(value: string, hosts: string[]): boolean {
  try {
    const u = new URL(value, "https://invalid.invalid/");
    if (u.protocol !== "https:") return false;
    return hosts.some((h) => u.hostname === h || u.hostname.endsWith("." + h));
  } catch {
    return false;
  }
}

function clean(node: Node, doc: Document, into: ParentNode, extra: Extra): void {
  const extraEls = new Set(extra.elements ?? []);
  const extraAttrs = new Set(extra.attributes ?? []);
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3) {
      into.appendChild(doc.createTextNode(child.nodeValue ?? ""));
      continue;
    }
    if (child.nodeType !== 1) continue; // comments, processing instructions, ...
    const el = child as Element;
    const tag = el.localName;
    const isExtra = extraEls.has(tag);
    if (el.namespaceURI !== XHTML || !(ELEMENTS.has(tag) || isExtra)) continue; // svg, math, form, style, script, iframe, ... incl. children
    const out = doc.createElement(tag);
    for (const a of Array.from(el.attributes)) {
      const name = a.name.toLowerCase();
      // attributes granted for extra elements apply to those elements only; an iframe never keeps src / srcdoc
      if (!allowedAttribute(name, isExtra ? extraAttrs : new Set())) continue;
      if (tag === "iframe" && (name === "src" || name === "srcdoc")) continue;
      if (URL_ATTRIBUTES.has(name) && !(name === "srcset" ? safeSrcset(a.value) : safeUrl(a.value))) continue;
      if (isExtra && /^data-.*src$/.test(name) && !hostOk(a.value, extra.hosts ?? [])) continue;
      out.setAttribute(name, a.value);
    }
    if (tag === "button") out.setAttribute("type", "button");
    const target = out.getAttribute("target")?.trim().toLowerCase();
    if (target && target !== "_self" && target !== "_top" && target !== "_parent") out.setAttribute("rel", "noopener noreferrer");
    clean(el, doc, out, extra);
    into.appendChild(out);
  }
}

export function sanitizeHtml(html: string, doc: Document, extra: Extra = {}): DocumentFragment {
  const tpl = doc.createElement("template");
  tpl.innerHTML = html;
  const out = doc.createDocumentFragment();
  clean(tpl.content, doc, out, extra);
  return out;
}
