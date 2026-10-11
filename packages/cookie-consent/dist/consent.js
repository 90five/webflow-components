(function() {
  "use strict";
  const ATTR = "fivex-consent";
  const GLOBAL = "FivexConsent";
  const COOKIE = "fivex_consent";
  const CLS = "fivex-consent-placeholder";
  const DL_EVENT = "fivex_consent_update";
  function sel(name, value) {
    return `[${ATTR}${name ? "-" + name : ""}${value === void 0 ? "" : `="${value}"`}]`;
  }
  function attr(el, name) {
    return el.getAttribute(`${ATTR}-${name}`);
  }
  function role(el) {
    return el.getAttribute(ATTR);
  }
  function list(value) {
    return (value ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  }
  function qsa(root, selector) {
    return Array.from(root.querySelectorAll(selector));
  }
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
  function isHidden(el) {
    const view = el.ownerDocument.defaultView;
    for (let n = el; n; n = n.parentElement) {
      if (n.hasAttribute("hidden") || n.hasAttribute("inert") || n.getAttribute("aria-hidden") === "true") return true;
      const cs = view?.getComputedStyle(n);
      if (cs && (cs.display === "none" || cs.visibility === "hidden")) return true;
    }
    return false;
  }
  function isFocusable(el) {
    return !!el && el.isConnected && typeof el.focus === "function" && !el.disabled && !isHidden(el);
  }
  function shown(el) {
    const cs = el.ownerDocument.defaultView?.getComputedStyle(el);
    return !!cs && cs.display !== "none" && cs.visibility !== "hidden";
  }
  let uid = 0;
  function nameFrom(el, fallback) {
    if (el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby")) return;
    const custom = attr(el, "label")?.trim();
    if (custom) {
      el.setAttribute("aria-label", custom);
      return;
    }
    const heading = el.querySelector("h1,h2,h3,h4,h5,h6,[role=heading]");
    if (heading?.textContent?.trim()) {
      if (!heading.id) heading.id = `${ATTR}-title-${++uid}`;
      el.setAttribute("aria-labelledby", heading.id);
      return;
    }
    el.setAttribute("aria-label", fallback);
  }
  const IX_SETTLE_MS = 1500;
  const IX_RETRIES = 1;
  class Panel {
    constructor(kind, els, doc, modal, label, whenReady) {
      this.kind = kind;
      this.els = els;
      this.doc = doc;
      this.modal = modal;
      this.whenReady = whenReady;
      this.open = false;
      this.lastFocus = null;
      for (const el of els) {
        if (modal) {
          if (!el.hasAttribute("role")) el.setAttribute("role", "dialog");
          if (!el.hasAttribute("aria-modal")) el.setAttribute("aria-modal", "true");
          if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
          nameFrom(el, label);
        } else if (kind === "banner") {
          if (!el.hasAttribute("role")) el.setAttribute("role", "region");
          nameFrom(el, label);
        }
      }
      this.apply(false, true);
    }
    get exists() {
      return this.els.length > 0;
    }
    set(open) {
      if (open === this.open) return;
      this.open = open;
      this.apply(open, false);
    }
    /** The element that had focus when the dialog opened (cleared). The engine restores focus once the other panels have updated. */
    takeFocusTarget() {
      const t = this.lastFocus;
      this.lastFocus = null;
      return t;
    }
    /**
     * Webflow Interactions animate the panel: the trigger click toggles it. The click is sent only once
     * Webflow has bound its handlers, and only when the real (computed) visibility differs from the wanted
     * state, so a missed or doubled click can never leave the panel inverted.
     *
     * After a click the panel is observed (style / class changes of the panel and its children). A reaction means
     * the interaction is running, so there is no second click; without any reaction after IX_SETTLE_MS the handler
     * was probably not bound yet and the click is repeated (IX_RETRIES times). If the panel still is not in the
     * wanted state in the end, it is set directly, so it never stays inverted.
     */
    drive(el, trigger) {
      const settle = (retries) => {
        const want = this.open;
        if (shown(el) === want) return;
        let reacted = false;
        const mo = typeof MutationObserver === "function" ? new MutationObserver(() => reacted = true) : null;
        mo?.observe(el, { attributes: true, attributeFilter: ["style", "class"], subtree: true });
        trigger.click();
        setTimeout(() => {
          mo?.disconnect();
          if (this.open !== want || shown(el) === want) return;
          if (!reacted && retries > 0) settle(retries - 1);
          else this.direct(el);
        }, IX_SETTLE_MS);
      };
      this.whenReady(
        (viaWebflow) => {
          settle(viaWebflow ? 0 : IX_RETRIES);
          if (this.modal && this.open) setTimeout(() => this.open && this.focusInto(), 80);
        },
        () => {
          this.direct(el);
          if (this.modal && this.open) this.focusInto();
        }
      );
    }
    /** Show or hide the panel with `display`, bypassing its Webflow interaction. */
    direct(el) {
      if (!this.open) {
        el.style.display = "none";
        return;
      }
      el.style.display = "";
      if (this.doc.defaultView?.getComputedStyle(el).display === "none") el.style.display = attr(el, "display") || "block";
    }
    focusInto() {
      const el = this.els.find((e) => shown(e)) ?? this.els[0];
      if (!el) return;
      const first = qsa(el, FOCUSABLE).find((i) => !isHidden(i));
      (first ?? el).focus();
    }
    apply(open, initial) {
      for (const el of this.els) {
        const trigger = el.querySelector(sel("", "interaction"));
        if (trigger) {
          if (!initial) this.drive(el, trigger);
        } else if (open) {
          el.style.display = "";
          if (this.doc.defaultView?.getComputedStyle(el).display === "none") el.style.display = attr(el, "display") || "block";
        } else {
          el.style.display = "none";
        }
        el.setAttribute("aria-hidden", String(!open));
        if (!open) el.setAttribute("inert", "");
        else el.removeAttribute("inert");
      }
      if (initial) return;
      if (this.els.some((el) => attr(el, "scroll") === "lock")) {
        const body = this.doc.body;
        if (open) {
          body.dataset.consentScrollPrev = body.style.overflow;
          body.style.overflow = "hidden";
        } else {
          body.style.overflow = body.dataset.consentScrollPrev ?? "";
          delete body.dataset.consentScrollPrev;
        }
      }
      if (this.modal && open) {
        this.lastFocus = this.doc.activeElement;
        if (!this.els.some((el) => el.querySelector(sel("", "interaction")))) this.focusInto();
      }
    }
    /** Keep Tab inside the open modal. Returns true when handled. */
    trapTab(e) {
      if (!this.open || !this.modal || e.key !== "Tab") return false;
      const el = this.els.find((x) => shown(x) && !isHidden(x));
      if (!el) return false;
      const items = qsa(el, FOCUSABLE).filter((i) => !isHidden(i));
      if (!items.length) {
        e.preventDefault();
        el.focus();
        return true;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = this.doc.activeElement;
      if (e.shiftKey && (active === first || active === el || !el.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !el.contains(active))) {
        e.preventDefault();
        first.focus();
      }
      return true;
    }
  }
  function syncCheckboxes(doc, granted, used) {
    for (const input of qsa(doc, sel("checkbox"))) {
      const cat = attr(input, "checkbox")?.trim().toLowerCase();
      if (!cat) continue;
      const necessary = cat === "necessary";
      const row = input.closest(sel("category")) ?? input.closest("label");
      if (row) row.style.display = necessary || used.has(cat) ? "" : "none";
      input.checked = necessary || granted(cat);
      if (necessary) {
        input.disabled = true;
        input.setAttribute("aria-disabled", "true");
      }
      const visual = input.parentElement?.querySelector(".w-checkbox-input");
      visual?.classList.toggle("w--redirected-checked", input.checked);
    }
  }
  function readCheckboxes(root) {
    const out = {};
    for (const input of qsa(root, sel("checkbox"))) {
      const cat = attr(input, "checkbox")?.trim().toLowerCase();
      if (cat && cat !== "necessary") out[cat] = input.checked;
    }
    return out;
  }
  function renderServices(doc, lang, active) {
    for (const host of qsa(doc, sel("services"))) {
      const cat = attr(host, "services")?.trim().toLowerCase();
      const template = host.querySelector(sel("template"));
      if (!cat || !template) continue;
      const parent = template.parentElement;
      const tplClone = template.cloneNode(true);
      template.remove();
      const defs = active.filter((s) => s.category === cat);
      host.style.display = defs.length ? "" : "none";
      for (const def of defs) {
        const node = tplClone.cloneNode(true);
        node.removeAttribute(`${ATTR}-template`);
        node.style.display = "";
        const cookieTpl = node.querySelector(sel("cookie-template"));
        const cookieParent = cookieTpl?.parentElement;
        const cookieClone = cookieTpl?.cloneNode(true);
        cookieTpl?.remove();
        for (const f of qsa(node, sel("field"))) {
          const name = attr(f, "field");
          if (name === "label") f.textContent = def.label[lang];
          else if (name === "vendor") f.textContent = def.vendor;
          else if (name === "description") f.textContent = def.description[lang] + (def.visitorNote ? " " + def.visitorNote[lang] : "");
          else if (name === "privacy-link" || name === "vendor-link") {
            const a = f;
            a.setAttribute("href", name === "privacy-link" ? def.privacyUrl : def.vendorUrl);
            a.setAttribute("target", "_blank");
            a.setAttribute("rel", "noopener noreferrer");
            if (!a.textContent?.trim()) a.textContent = name === "privacy-link" ? lang === "de" ? "Datenschutzerklärung" : "Privacy policy" : def.vendor;
          } else if (name === "cookies") {
            if (!def.cookies.length) f.style.display = "none";
            else if (!cookieClone) f.textContent = def.cookies.map((c) => c.name).join(", ");
          }
        }
        if (cookieClone && cookieParent) {
          for (const c of def.cookies) {
            const row = cookieClone.cloneNode(true);
            row.removeAttribute(`${ATTR}-cookie-template`);
            row.style.display = "";
            for (const f of qsa(row, sel("field"))) {
              const name = attr(f, "field");
              if (name === "name") f.textContent = c.name;
              else if (name === "duration") f.textContent = c.duration[lang];
              else if (name === "purpose") f.textContent = c.description[lang];
            }
            cookieParent.appendChild(row);
          }
        }
        parent.appendChild(node);
      }
    }
  }
  const MODE_FLAG = `__${GLOBAL}ModeDefault`;
  function getDataLayer(win) {
    if (!Array.isArray(win.dataLayer)) {
      if (win.dataLayer !== void 0) console.warn(`[${GLOBAL}] window.dataLayer is not an array - replaced by a new array`);
      win.dataLayer = [];
    }
    return win.dataLayer;
  }
  function ensureGtag(win) {
    const layer = getDataLayer(win);
    if (typeof win.gtag !== "function") {
      win.gtag = function gtag() {
        layer.push(arguments);
      };
    }
    return win.gtag;
  }
  function setConsentDefaults(win) {
    if (win[MODE_FLAG]) return;
    win[MODE_FLAG] = true;
    delete win[`__${GLOBAL}ModeLast`];
    const gtag = ensureGtag(win);
    gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
      functionality_storage: "denied",
      personalization_storage: "denied",
      security_storage: "granted",
      wait_for_update: 500
    });
  }
  function updateConsent(win, signals) {
    ensureGtag(win)("consent", "update", signals);
  }
  const LAST_FLAG = `__${GLOBAL}ModeLast`;
  function googleSignals(ctx) {
    const on = (id) => ctx.configOf(id) !== null && ctx.has(id);
    const gtm = on("gtm");
    const ga4 = on("ga4");
    const ads = on("google-ads");
    const g = (c) => ctx.hasCategory(c) ? "granted" : "denied";
    const out = {};
    if (ga4 || gtm) out.analytics_storage = g("analytics");
    if (gtm || ads) out.ad_storage = g("marketing");
    if (gtm || ads || ga4 && ctx.configOf("ga4")?.ads === true) {
      out.ad_user_data = g("marketing");
      out.ad_personalization = g("marketing");
    }
    if (gtm) {
      out.functionality_storage = g("functional");
      out.personalization_storage = g("functional");
    }
    return out;
  }
  function syncGoogleConsent(ctx) {
    const signals = googleSignals(ctx);
    const key = JSON.stringify(Object.entries(signals).sort(([a], [b]) => a < b ? -1 : 1));
    const win = ctx.win;
    if (win[LAST_FLAG] === key) return;
    win[LAST_FLAG] = key;
    if (Object.keys(signals).length) updateConsent(win, signals);
  }
  const service$B = {
    id: "adobe-fonts",
    vendor: "Adobe Inc.",
    vendorUrl: "https://fonts.adobe.com",
    privacyUrl: "https://www.adobe.com/privacy/typekit.html",
    category: "functional",
    // typography; loaded from external servers
    label: { de: "Adobe Fonts", en: "Adobe Fonts" },
    description: {
      de: "Lädt Schriftarten von Servern von Adobe. Dabei wird Ihre IP-Adresse an Adobe übertragen. Adobe setzt zur Auslieferung der Schriften keine Cookies.",
      en: "Loads fonts from Adobe servers. Your IP address is transmitted to Adobe. Adobe sets no cookies to serve the fonts."
    },
    cookies: [],
    cookieless: true,
    devNote: {
      de: "Laut Adobe werden u. a. Web-Projekt-ID, Account-ID und Hostname erfasst (Abrechnung, Lizenz); die IP-Adresse wird nicht gespeichert.",
      en: "According to Adobe, data such as web project ID, account ID and hostname is collected (billing, licensing); the IP address is not stored."
    },
    verification: {
      date: "2026-10-11",
      loader: "The kit stylesheet <link> is added only after consent and https://use.typekit.net/<kit>.css is requested (the endpoint answers; kits are restricted to their licensed domains, so a stylesheet body is only served there). Same URL pattern as on fonts.adobe.com.",
      observed: "No cookies or storage keys from Adobe Fonts were observed; Adobe's privacy page states that the Adobe Fonts service for websites does not set or use cookies.",
      liveSites: ["https://fonts.adobe.com/"]
    },
    sources: ["https://www.adobe.com/privacy/typekit.html"],
    load(ctx) {
      const kit = ctx.cfg.kitId;
      if (typeof kit !== "string" || !/^[a-z0-9]{5,10}$/i.test(kit)) {
        console.warn("[FivexConsent] adobe-fonts: invalid kitId");
        return;
      }
      const link = ctx.doc.createElement("link");
      link.rel = "stylesheet";
      link.href = `https://use.typekit.net/${encodeURIComponent(kit)}.css`;
      ctx.doc.head.appendChild(link);
    }
  };
  const __vite_glob_0_0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$B
  }, Symbol.toStringTag, { value: "Module" }));
  function scan(root, selector) {
    const out = Array.from(root.querySelectorAll(selector));
    if (root.matches(selector)) out.unshift(root);
    return out;
  }
  function claim(el, flag = "data-fivex-rendered") {
    if (el.hasAttribute(flag)) return false;
    el.setAttribute(flag, "");
    return true;
  }
  function until(get, ms = 5e3) {
    return new Promise((resolve) => {
      const t0 = Date.now();
      const poll = () => {
        const v = get();
        if (v !== void 0) resolve(v);
        else if (Date.now() - t0 >= ms) resolve(void 0);
        else setTimeout(poll, 50);
      };
      poll();
    });
  }
  const ORIGINS = ["https://cal.com", "https://app.cal.com"];
  let nsCount = 0;
  const service$A = {
    id: "cal-com",
    vendor: "Cal.com, Inc.",
    vendorUrl: "https://cal.com",
    privacyUrl: "https://cal.com/privacy",
    category: "functional",
    label: { de: "Cal.com", en: "Cal.com" },
    description: {
      de: "Zeigt die Online-Terminbuchung von Cal.com an. Dabei wird Ihre IP-Adresse an Server von Cal.com übertragen.",
      en: "Shows the Cal.com online booking widget. Your IP address is transferred to Cal.com servers."
    },
    cookies: [
      {
        name: "__cf_bm",
        duration: { de: "30 Minuten", en: "30 minutes" },
        description: { de: "Cloudflare-Bot-Schutz (Cal.com, HttpOnly, Drittanbieter-Cookie auf cal.com).", en: "Cloudflare bot management (Cal.com, HttpOnly, third-party cookie on cal.com)." },
        evidence: ["observed"]
      }
    ],
    devNote: { de: "Laut Cal.com-Datenschutzerklärung nutzt die App Cookies für Login, Einstellungen und Sicherheit und keine Werbe-Cookies von Drittanbietern. Im Test wurde nur __cf_bm gesetzt; bei einer Buchung können weitere hinzukommen.", en: "Per Cal.com's privacy page the app uses cookies for login, preferences and security and no third-party advertising cookies. Only __cf_bm was set in the test; further cookies may appear during an actual booking." },
    verification: {
      date: "2026-10-11",
      loader: 'Loaded after consent in a real Chrome profile; no request to the vendor before consent. The embed script and an inline booking page (app.cal.com) loaded; window.Cal queue stub works. Two containers released one after another, a late container after "allow all" and two at once each rendered an inline booking page (one Cal.com namespace per container; a second inline embed in the same namespace is ignored by Cal.com).',
      observed: "Cookie __cf_bm set by cal.com observed in the sandbox (public demo link)."
    },
    sources: ["https://cal.com/docs/llms.txt", "https://cal.com/privacy"],
    init(ctx) {
      const w = ctx.win;
      if (typeof w.Cal === "function") return;
      const cal = function(...args) {
        if (args[0] === "init" && typeof args[1] === "string") {
          const ns = args[1];
          const api = function(...a) {
            (api.q = api.q || []).push(a);
          };
          api.q = [];
          cal.ns[ns] = cal.ns[ns] || api;
          cal.ns[ns].q.push(args);
          cal.q.push(["initNamespace", ns]);
          return;
        }
        cal.q.push(args);
      };
      cal.ns = {};
      cal.q = [];
      w.Cal = cal;
    },
    load(ctx) {
      const origin = typeof ctx.cfg.origin === "string" ? ctx.cfg.origin : "https://app.cal.com";
      if (!ORIGINS.includes(origin)) {
        console.warn("[FivexConsent] cal-com: invalid origin");
        return;
      }
      const cal = ctx.win.Cal;
      if (cal && !cal.loaded) {
        cal.loaded = true;
        if (!cal.q.some((c) => c[0] === "init")) cal.q.unshift(["init", { origin }]);
      }
      return ctx.loadScript(origin + "/embed/embed.js");
    },
    refresh(ctx, el) {
      const cal = ctx.win.Cal;
      if (typeof cal !== "function") return;
      const origin = typeof ctx.cfg.origin === "string" && ORIGINS.includes(ctx.cfg.origin) ? ctx.cfg.origin : "https://app.cal.com";
      for (const w of scan(el, "[data-cal-link]")) {
        const link = w.getAttribute("data-cal-link") ?? "";
        if (!/^[\w.~-]+(\/[\w.~-]+)*$/.test(link) || !claim(w)) continue;
        let config = {};
        try {
          const parsed = JSON.parse(w.getAttribute("data-cal-config") || "{}");
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) config = parsed;
        } catch {
        }
        const ns = "fivex-" + ++nsCount;
        cal("init", ns, { origin });
        const api = cal.ns?.[ns];
        if (typeof api !== "function") continue;
        api("inline", { elementOrSelector: w, calLink: link, config });
      }
    },
    embed: {
      hosts: ["cal.com", "app.cal.com"],
      markup: { example: `<div class="cal-inline" data-cal-link="username/30min" data-cal-config='{"layout":"month_view"}'></div>` },
      placeholder: {
        de: "Die Terminbuchung wird von Cal.com bereitgestellt. Beim Laden werden Daten an Cal.com übertragen.",
        en: "The booking widget is provided by Cal.com. Loading it transfers data to Cal.com."
      }
    }
  };
  const __vite_glob_0_1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$A
  }, Symbol.toStringTag, { value: "Module" }));
  const service$z = {
    id: "calendly",
    vendor: "Calendly LLC",
    vendorUrl: "https://calendly.com",
    privacyUrl: "https://calendly.com/privacy",
    category: "functional",
    label: { de: "Calendly", en: "Calendly" },
    description: {
      de: "Zeigt die Online-Terminbuchung von Calendly an. Dabei wird Ihre IP-Adresse an Server von Calendly übertragen.",
      en: "Shows the Calendly online booking widget. Your IP address is transferred to Calendly servers."
    },
    cookies: [
      {
        name: "__cf_bm",
        duration: { de: "30 Minuten", en: "30 minutes" },
        description: { de: "Cloudflare-Bot-Schutz (HttpOnly, calendly.com).", en: "Cloudflare bot management (HttpOnly, calendly.com)." },
        evidence: ["observed"]
      },
      {
        name: "_cfuvid",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Cloudflare: unterscheidet Besucher hinter derselben IP für Ratenbegrenzung (HttpOnly, calendly.com).", en: "Cloudflare: tells visitors behind the same IP apart for rate limiting (HttpOnly, calendly.com)." },
        evidence: ["observed"]
      },
      {
        name: "OptanonConsent",
        duration: { de: "12 Monate", en: "12 months" },
        description: { de: "Speichert die Cookie-Einwilligung innerhalb des Calendly-Widgets (OneTrust, calendly.com).", en: "Stores the cookie consent inside the Calendly widget (OneTrust, calendly.com)." },
        evidence: ["observed"]
      },
      {
        name: "_cache",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Zwischenspeicher der Buchungsseite (calendly.com).", en: "Cache of the booking page (calendly.com)." },
        evidence: ["observed"]
      }
    ],
    devNote: {
      de: "Das Calendly-Widget lädt weitere Dienste (Stripe, Google reCAPTCHA, OneTrust). Deren Einträge (Stripe: Cookie m und Session-Storage-Schlüssel _ab, _mf; reCAPTCHA: rc::a, rc::c) stammen nicht von einer Calendly-Domain und sind deshalb nicht aufgeführt. Inhalt und Umfang können je nach Calendly-Konto variieren.",
      en: "The Calendly widget loads further services (Stripe, Google reCAPTCHA, OneTrust). Their entries (Stripe: cookie m and session storage keys _ab, _mf; reCAPTCHA: rc::a, rc::c) do not come from a Calendly origin and are therefore not listed. Scope can vary per Calendly account."
    },
    visitorNote: {
      de: "Beim Buchen können weitere Anbieter (z. B. für Zahlung oder Bot-Schutz) eigene Cookies und Speichereinträge setzen.",
      en: "While booking, further providers (for example for payment or bot protection) may set their own cookies and storage entries."
    },
    verification: {
      date: "2026-10-11",
      loader: 'Loaded after consent in a real Chrome profile; no request to the vendor before consent. widget.js and an inline booking widget (public demo account) loaded. Two containers released one after another, a late container after "allow all" and two containers at once each rendered an inline widget (Calendly.initInlineWidget for containers released after widget.js ran).',
      observed: "Cookies and storage keys of calendly.com observed in the sandbox. Entries written by embedded third parties (Stripe, reCAPTCHA) are not attributed to Calendly."
    },
    sources: ["https://calendly.com/help/embed-options-overview", "https://calendly.com/privacy"],
    load(ctx) {
      if (!ctx.doc.querySelector('link[href="https://assets.calendly.com/assets/external/widget.css"]')) {
        const link = ctx.doc.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://assets.calendly.com/assets/external/widget.css";
        ctx.doc.head.appendChild(link);
      }
      return ctx.loadScript("https://assets.calendly.com/assets/external/widget.js");
    },
    refresh(ctx, el) {
      const calendly = ctx.win.Calendly;
      if (!calendly?.initInlineWidget) return;
      for (const w of scan(el, ".calendly-inline-widget[data-url]")) {
        if (w.getAttribute("data-processed") || w.querySelector("iframe")) continue;
        const url = w.getAttribute("data-url") ?? "";
        if (!/^https:\/\/calendly\.com\//.test(url)) continue;
        w.setAttribute("data-processed", "true");
        calendly.initInlineWidget({ url, parentElement: w });
      }
    },
    embed: {
      hosts: ["calendly.com"],
      markup: { example: '<div class="calendly-inline-widget" data-url="https://calendly.com/you/30min"></div>' },
      placeholder: {
        de: "Die Terminbuchung wird von Calendly bereitgestellt. Beim Laden werden Daten an Calendly übertragen.",
        en: "The booking widget is provided by Calendly. Loading it transfers data to Calendly."
      }
    }
  };
  const __vite_glob_0_2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$z
  }, Symbol.toStringTag, { value: "Module" }));
  const service$y = {
    id: "clarity",
    vendor: "Microsoft Corporation",
    vendorUrl: "https://clarity.microsoft.com/",
    privacyUrl: "https://privacy.microsoft.com/privacystatement",
    category: "analytics",
    label: { de: "Microsoft Clarity", en: "Microsoft Clarity" },
    description: {
      de: "Zeichnet Klicks, Scrollen und Mausbewegungen auf, um die Nutzung der Website zu analysieren. Dabei werden Daten, auch Ihre IP-Adresse, an Server von Microsoft übertragen.",
      en: "Records clicks, scrolling and mouse movement to analyse website usage. Data, including your IP address, is transmitted to Microsoft servers."
    },
    cookies: [
      {
        name: "_clck",
        duration: { de: "1 Jahr", en: "1 year" },
        description: { de: "Speichert die Clarity-Nutzer-ID und -Einstellungen für die Website (First-Party, geschrieben vom Clarity-Skript).", en: "Persists the Clarity user ID and preferences for the website (first party, written by the Clarity script)." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "_clsk",
        duration: { de: "1 Tag", en: "1 day" },
        description: { de: "Verbindet mehrere Seitenaufrufe eines Besuchs zu einer Sitzungsaufzeichnung.", en: "Connects multiple page views of a visit into one session recording." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "MUID",
        duration: { de: "13 Monate", en: "13 months" },
        description: { de: "Microsoft-Browserkennung (Domains clarity.ms / bing.com), u. a. für Werbung und Analyse.", en: "Microsoft browser identifier (domains clarity.ms / bing.com), used for advertising and analytics among other things." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "MR",
        duration: { de: "7 Tage", en: "7 days" },
        description: { de: "Kennzeichen, ob MUID aufgefrischt werden soll (clarity.ms).", en: "Flag indicating whether MUID is to be refreshed (clarity.ms)." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "ANONCHK",
        duration: { de: "10 Minuten", en: "10 minutes" },
        description: { de: "Kennzeichen, ob MUID an ANID übertragen wird (Clarity nutzt ANID nicht, der Wert ist immer 0).", en: "Flag whether MUID is transferred to ANID (Clarity does not use ANID, so the value is always 0)." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "SM",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Synchronisiert MUID zwischen Microsoft-Domains.", en: "Synchronises MUID across Microsoft domains." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "_cltk",
        type: "sessionStorage",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Sitzungsdaten des Clarity-Skripts (Session Storage).", en: "Session data of the Clarity script (session storage)." },
        evidence: ["observed"]
      },
      {
        name: "SRM_B",
        duration: { de: "13 Monate", en: "13 months" },
        description: { de: "Microsoft-Kennung für die Synchronisierung zwischen Microsoft-Diensten (c.bing.com).", en: "Microsoft identifier used to synchronise between Microsoft services (c.bing.com)." },
        evidence: ["observed"]
      }
    ],
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. scripts.clarity.ms loaded and ran with a real project id taken from Microsoft Clarity's own website (tag request 200, no errors).",
      observed: "Cookies and session storage observed in the sandbox with a real project id and on live websites; cookie names also listed in Microsoft's documentation.",
      liveSites: ["https://clarity.microsoft.com/", "https://www.brevo.com/"]
    },
    sources: ["https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-cookies", "https://learn.microsoft.com/en-us/clarity/setup-and-installation/cookie-consent"],
    async load(ctx) {
      const id = String(ctx.cfg.id ?? "");
      if (!/^[a-z0-9]{6,16}$/i.test(id)) {
        console.warn("[FivexConsent] clarity: invalid id");
        return;
      }
      const w = ctx.win;
      w.clarity = w.clarity || function() {
        (w.clarity.q = w.clarity.q || []).push(arguments);
      };
      await ctx.loadScript("https://www.clarity.ms/tag/" + encodeURIComponent(id));
      signal(ctx);
    },
    /** Marketing consent drives ad_Storage, analytics consent drives analytics_Storage; re-sent on every decision. */
    update(ctx) {
      signal(ctx);
    }
  };
  function signal(ctx) {
    const g = (b) => b ? "granted" : "denied";
    ctx.win.clarity?.("consentv2", { ad_Storage: g(ctx.hasCategory("marketing")), analytics_Storage: g(ctx.hasCategory("analytics")) });
  }
  const __vite_glob_0_3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$y
  }, Symbol.toStringTag, { value: "Module" }));
  const service$x = {
    id: "crisp",
    vendor: "Crisp IM SAS",
    vendorUrl: "https://crisp.chat",
    privacyUrl: "https://crisp.chat/en/privacy/",
    category: "functional",
    // chat widget
    label: { de: "Crisp Chat", en: "Crisp Chat" },
    description: {
      de: "Zeigt einen Live-Chat für Fragen und Support an. Dabei wird Ihre IP-Adresse an Server von Crisp übertragen.",
      en: "Shows a live chat for questions and support. Your IP address is transmitted to Crisp servers."
    },
    cookies: [
      {
        name: "crisp-client%2F*",
        duration: { de: "6 Monate", en: "6 months" },
        description: { de: "Crisp-Chat: Sitzung des Besuchers, um den Nachrichtenverlauf wiederherzustellen (Präfix crisp-client/, Website-ID im Namen). Die Laufzeit wird bei jedem Besuch erneuert.", en: "Crisp chat: visitor session used to restore the message history (prefix crisp-client/, website ID in the name). The expiry is renewed on every visit." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "crisp-client/*",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
        description: { de: "Crisp-Chat: Sitzungs- und Trigger-Daten (Local Storage, Website-ID im Namen).", en: "Crisp chat: session and trigger data (local storage, website ID in the name)." },
        evidence: ["observed"]
      }
    ],
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. client.crisp.chat/l.js loaded (HTTP 200) with the $crisp stub from Crisp's official snippet.",
      observed: "Cookie and local storage entries observed on crisp.chat (writer: client.crisp.chat); name pattern and 6-month default expiry are in Crisp's cookie policy.",
      liveSites: ["https://crisp.chat/en/"]
    },
    sources: ["https://help.crisp.chat/en/article/crisp-chatbox-cookie-and-ip-policy-1147xor/"],
    load(ctx) {
      const id = ctx.cfg.id;
      if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        console.warn("[FivexConsent] crisp: invalid id");
        return;
      }
      ctx.win.$crisp = ctx.win.$crisp || [];
      ctx.win.CRISP_WEBSITE_ID = id;
      return ctx.loadScript("https://client.crisp.chat/l.js");
    }
  };
  const __vite_glob_0_4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$x
  }, Symbol.toStringTag, { value: "Module" }));
  const service$w = {
    id: "fathom",
    vendor: "Conva Ventures Inc.",
    vendorUrl: "https://usefathom.com/",
    privacyUrl: "https://usefathom.com/privacy",
    category: "analytics",
    cookies: [],
    cookieless: true,
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. cdn.usefathom.com/script.js loaded (HTTP 200) with a site id; no errors.",
      observed: "No cookies or storage keys observed; Fathom's documentation states that the embed script uses no cookies or similar technologies."
    },
    label: { de: "Fathom Analytics", en: "Fathom Analytics" },
    description: {
      de: "Misst die Nutzung der Website ohne Cookies. Dabei wird Ihre IP-Adresse kurzzeitig an Server von Fathom übertragen, um Statistiken zu erzeugen.",
      en: "Measures website usage without cookies. Your IP address is briefly sent to Fathom servers to produce statistics."
    },
    sources: ["https://usefathom.com/docs/script/script-advanced", "https://usefathom.com/docs/legal/privacy-policy-sample"],
    async load(ctx) {
      const id = String(ctx.cfg.id ?? "");
      if (!/^[A-Za-z0-9]{3,16}$/.test(id)) {
        console.warn("[FivexConsent] fathom: invalid id");
        return;
      }
      await ctx.loadScript("https://cdn.usefathom.com/script.js", { "data-site": id, defer: "" });
    }
  };
  const __vite_glob_0_5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$w
  }, Symbol.toStringTag, { value: "Module" }));
  const service$v = {
    id: "ga4",
    vendor: "Google Ireland Limited",
    vendorUrl: "https://marketingplatform.google.com/about/analytics/",
    privacyUrl: "https://policies.google.com/privacy",
    category: "analytics",
    label: { de: "Google Analytics 4", en: "Google Analytics 4" },
    description: {
      de: "Misst, wie die Website genutzt wird (Seitenaufrufe, Herkunft, Verweildauer). Dabei wird Ihre IP-Adresse an Server von Google übertragen.",
      en: "Measures how the website is used (page views, origin, time on site). Your IP address is transmitted to Google servers."
    },
    cookies: [
      {
        name: "_ga",
        duration: { de: "2 Jahre", en: "2 years" },
        description: { de: "Unterscheidet Besucher (Google-Analytics-Kennung).", en: "Used to distinguish users (Google Analytics identifier)." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "_ga_*",
        duration: { de: "2 Jahre", en: "2 years" },
        description: { de: "Hält den Sitzungsstatus (Container-ID als Suffix).", en: "Persists session state (container ID as suffix)." },
        evidence: ["observed", "vendor-docs"]
      }
    ],
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. gtag.js loaded with a real measurement id (HTTP 200); Consent Mode defaults are set before the script without any request to Google.",
      observed: "_ga and _ga_<id> observed in the sandbox with a real measurement id; names and 2-year default duration in Google's documentation (Chrome caps cookie lifetime at 400 days)."
    },
    devNote: {
      de: "Consent Mode v2 (Basic): Vor der Einwilligung wird kein Google-Skript geladen und es werden keine Daten gesendet. ad_user_data und ad_personalization werden nicht gesendet (Standard „denied“), außer die Website setzt ads: true oder konfiguriert gtm bzw. google-ads; dann folgen sie der Marketing-Einwilligung. Ein per beforeConsent geladener Tag Manager ist ein eigener Dienst und lädt vor der Einwilligung. Chrome begrenzt die Laufzeit von Cookies auf 400 Tage; angegeben ist der von Google dokumentierte Standardwert.",
      en: "Consent Mode v2 (basic): no Google script is loaded and no data is sent before consent. ad_user_data and ad_personalization are not sent (default denied) unless the site sets ads: true or configures gtm or google-ads; then they follow the marketing consent. A Tag Manager container loaded with beforeConsent is a separate service and loads before consent. Chrome caps cookie lifetime at 400 days; the value shown is the default documented by Google."
    },
    visitorNote: {
      de: "Google Analytics wird erst nach Ihrer Einwilligung in Statistik geladen.",
      en: "Google Analytics is loaded only after you consent to statistics."
    },
    sources: ["https://support.google.com/analytics/answer/11397207"],
    init(ctx) {
      setConsentDefaults(ctx.win);
    },
    async load(ctx) {
      const id = String(ctx.cfg.id ?? "");
      if (!/^G-[A-Z0-9]+$/.test(id)) {
        console.warn("[FivexConsent] ga4: invalid id");
        return;
      }
      setConsentDefaults(ctx.win);
      syncGoogleConsent(ctx);
      const gtag = ensureGtag(ctx.win);
      gtag("js", /* @__PURE__ */ new Date());
      gtag("config", id);
      await ctx.loadScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id));
    },
    update(ctx) {
      syncGoogleConsent(ctx);
    }
  };
  const __vite_glob_0_6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$v
  }, Symbol.toStringTag, { value: "Module" }));
  const service$u = {
    id: "google-ads",
    vendor: "Google Ireland Limited",
    vendorUrl: "https://ads.google.com/",
    privacyUrl: "https://policies.google.com/privacy",
    category: "marketing",
    label: { de: "Google Ads", en: "Google Ads" },
    description: {
      de: "Misst den Erfolg von Werbeanzeigen und ermöglicht Remarketing. Dabei werden Ihre IP-Adresse und Nutzungsdaten an Server von Google übertragen.",
      en: "Measures the success of ads and enables remarketing. Your IP address and usage data are transmitted to Google servers."
    },
    cookies: [
      {
        name: "_gcl_au",
        duration: { de: "90 Tage", en: "90 days" },
        description: { de: "Speichert und verfolgt Anzeigen-Conversions (First-Party).", en: "Stores and tracks ad conversions (first-party)." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "_gcl_aw",
        duration: { de: "90 Tage", en: "90 days" },
        description: { de: "Speichert Klickinformationen aus Google Ads zur Conversion-Messung.", en: "Stores click information from Google Ads for conversion measurement." },
        evidence: ["vendor-docs"]
      },
      {
        name: "_gcl_ls",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Zwischenspeicher für Consent-/Conversion-Daten von Google (Local Storage der Website).", en: "Google's consent/conversion cache (local storage of the site)." },
        evidence: ["observed"]
      },
      {
        name: "IDE",
        duration: { de: "13 Monate (EWR/UK), sonst 24 Monate", en: "13 months (EEA/UK), otherwise 24 months" },
        description: { de: "Drittanbieter-Cookie von doubleclick.net für Anzeigenauslieferung und Messung.", en: "Third-party cookie from doubleclick.net for ad serving and measurement." },
        evidence: ["vendor-docs"]
      },
      {
        name: "test_cookie",
        duration: { de: "15 Minuten", en: "15 minutes" },
        description: { de: "Prüft, ob der Browser Cookies zulässt (doubleclick.net).", en: "Checks whether the browser allows cookies (doubleclick.net)." },
        evidence: ["observed", "vendor-docs"]
      }
    ],
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. gtag.js loaded with a test conversion id (HTTP 200).",
      observed: "Cookies and local storage observed in the sandbox; IDE and _gcl_aw are in Google's ads cookie documentation."
    },
    sources: ["https://business.safety.google/adscookies/"],
    init(ctx) {
      setConsentDefaults(ctx.win);
    },
    async load(ctx) {
      const id = String(ctx.cfg.id ?? "");
      if (!/^AW-[0-9]+$/.test(id)) {
        console.warn("[FivexConsent] google-ads: invalid id");
        return;
      }
      setConsentDefaults(ctx.win);
      syncGoogleConsent(ctx);
      const gtag = ensureGtag(ctx.win);
      gtag("js", /* @__PURE__ */ new Date());
      gtag("config", id);
      await ctx.loadScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id));
    },
    update(ctx) {
      syncGoogleConsent(ctx);
    }
  };
  const __vite_glob_0_7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$u
  }, Symbol.toStringTag, { value: "Module" }));
  const service$t = {
    id: "google-fonts",
    vendor: "Google LLC",
    vendorUrl: "https://fonts.google.com",
    privacyUrl: "https://policies.google.com/privacy",
    category: "functional",
    // typography; loaded from external servers
    label: { de: "Google Fonts", en: "Google Fonts" },
    description: {
      de: "Lädt Schriftarten von Servern von Google. Dabei wird Ihre IP-Adresse an Google übertragen. Es werden keine Cookies gesetzt.",
      en: "Loads fonts from Google servers. Your IP address is transmitted to Google. No cookies are set."
    },
    cookies: [],
    cookieless: true,
    verification: {
      date: "2026-10-11",
      loader: "The library loads nothing for this service; fonts come from the site's own CSS and cannot be gated.",
      observed: "Not applicable (no loader). Google's documentation states that the Google Fonts API does not set or log cookies."
    },
    devNote: { de: "Die Bibliothek lädt nichts für diesen Dienst und kann Google Fonts nicht blockieren (Einbindung per CSS): am besten selbst hosten. Beim Abruf wird die IP-Adresse an Google übertragen; laut Google setzt die Google-Fonts-API keine Cookies.", en: "The library loads nothing for this service and cannot block Google Fonts (included via CSS): self-hosting is best. Your IP address is transmitted to Google on request; according to Google the Google Fonts API does not set cookies." },
    sources: ["https://developers.google.com/fonts/faq/privacy"]
  };
  const __vite_glob_0_8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$t
  }, Symbol.toStringTag, { value: "Module" }));
  const service$s = {
    id: "google-maps",
    vendor: "Google Ireland Limited",
    vendorUrl: "https://maps.google.com",
    privacyUrl: "https://policies.google.com/privacy",
    category: "functional",
    label: { de: "Google Maps", en: "Google Maps" },
    description: {
      de: "Zeigt eine eingebettete Google-Maps-Karte an. Dabei wird Ihre IP-Adresse an Server von Google übertragen.",
      en: "Shows an embedded Google Maps map. Your IP address is transferred to Google servers."
    },
    cookies: [
      {
        name: "__sak",
        type: "sessionStorage",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Google Maps: Sitzungsdaten der eingebetteten Karte (Session Storage, google.com).", en: "Google Maps: session data of the embedded map (session storage, google.com)." },
        evidence: ["observed"]
      }
    ],
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. The iframe (google.com/maps/embed) loads only after consent or a click on the placeholder; the host check applies.",
      observed: "Embed loaded in the sandbox (standard share-embed URL and output=embed URL): no cookies, one session storage key observed."
    },
    devNote: { de: "In unseren Tests setzte die eingebettete Karte keine Cookies; beobachtet wurde nur ein Eintrag im Session Storage.", en: "In our tests the embedded map set no cookies; only one session storage entry was observed." },
    sources: ["https://developers.google.com/maps/documentation/embed/get-started", "https://policies.google.com/technologies/cookies"],
    embed: {
      hosts: ["www.google.com/maps", "maps.google.com"],
      placeholder: {
        de: "Diese Karte wird von Google Maps bereitgestellt. Beim Laden werden Daten an Google übertragen.",
        en: "This map is provided by Google Maps. Loading it transfers data to Google."
      }
    }
  };
  const __vite_glob_0_9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$s
  }, Symbol.toStringTag, { value: "Module" }));
  const service$r = {
    id: "gtm",
    vendor: "Google Ireland Limited",
    vendorUrl: "https://tagmanager.google.com/",
    privacyUrl: "https://policies.google.com/privacy",
    category: "analytics",
    categories: ["analytics", "marketing", "functional"],
    loadsBeforeConsent: (cfg) => cfg.beforeConsent === true,
    label: { de: "Google Tag Manager", en: "Google Tag Manager" },
    description: {
      de: "Lädt und steuert weitere Dienste (Tags) der Website. Dabei wird Ihre IP-Adresse an Server von Google übertragen; welche Daten die Tags verarbeiten, hängt von der Konfiguration ab.",
      en: "Loads and manages further services (tags) on the website. Your IP address is transmitted to Google servers; which data the tags process depends on the container configuration."
    },
    cookies: [],
    devNote: {
      de: "Standardmäßig wird der Container erst nach Einwilligung in die gewählte Kategorie geladen (cfg.category, Standard: Statistik); die Consent-Mode-Signale folgen der Auswahl der Besucher. Mit beforeConsent: true wird der Container ohne Einwilligung geladen (alle Signale „denied“), dabei wird die IP-Adresse an Google übertragen. Der Container selbst setzt keine Cookies. Jedes Tag im Container MUSS die Consent-Signale oder die vom Paket gepushten dataLayer-Events als Bedingung nutzen.",
      en: "By default the container loads only after consent to the chosen category (cfg.category, default analytics); the Consent Mode signals follow the visitor's choices. With beforeConsent: true the container loads without consent (all signals denied) and the IP address is transmitted to Google. The container itself sets no cookies. EVERY tag inside the container MUST require the consent signals or the dataLayer events this package pushes."
    },
    visitorNote: {
      de: "Der Tag Manager selbst setzt keine Cookies; die über ihn geladenen Dienste können es tun.",
      en: "The Tag Manager itself sets no cookies; services loaded through it may do so."
    },
    verification: {
      date: "2026-10-11",
      loader: 'gtm.js was requested only after consent (no request before consent or after "deny all", also with beforeConsent unset); with beforeConsent: true it is requested on load with all signals denied and the signals are updated on every decision. The container id format is validated.',
      observed: "A container without tags sets no cookies or storage (sandbox, test container id)."
    },
    sources: ["https://support.google.com/tagmanager/answer/10718549", "https://developers.google.com/tag-platform/security/guides/consent"],
    init(ctx) {
      setConsentDefaults(ctx.win);
    },
    async load(ctx) {
      const id = String(ctx.cfg.id ?? "");
      if (!/^GTM-[A-Z0-9]+$/.test(id)) {
        console.warn("[FivexConsent] gtm: invalid id");
        return;
      }
      setConsentDefaults(ctx.win);
      syncGoogleConsent(ctx);
      getDataLayer(ctx.win).push({ "gtm.start": Date.now(), event: "gtm.js" });
      await ctx.loadScript("https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(id));
    },
    /** Later decisions only update the signals. */
    update(ctx) {
      syncGoogleConsent(ctx);
    }
  };
  const __vite_glob_0_10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$r
  }, Symbol.toStringTag, { value: "Module" }));
  const service$q = {
    id: "hcaptcha",
    vendor: "Intuition Machines, Inc.",
    vendorUrl: "https://www.hcaptcha.com",
    privacyUrl: "https://www.hcaptcha.com/privacy",
    category: "functional",
    // spam protection for forms
    label: { de: "hCaptcha", en: "hCaptcha" },
    description: {
      de: "Schützt Formulare vor Spam und Missbrauch. Dabei werden Browser- und Nutzungsdaten sowie Ihre IP-Adresse an hCaptcha übertragen.",
      en: "Protects forms from spam and abuse. Browser and usage data and your IP address are transmitted to hCaptcha."
    },
    cookies: [
      {
        name: "__cf_bm",
        duration: { de: "30 Minuten", en: "30 minutes" },
        description: { de: "Cloudflare-Bot-Schutz (HttpOnly, hcaptcha.com); laut hCaptcha bis zu 1 Tag.", en: "Cloudflare bot management (HttpOnly, hcaptcha.com); hCaptcha states up to 1 day." },
        evidence: ["observed", "vendor-docs"]
      }
    ],
    devNote: { de: "hCaptcha nennt außerdem localStorage-Einträge; mit dem Test-Schlüssel wurden keine beobachtet.", en: "hCaptcha also mentions localStorage entries; none were observed with the test key." },
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. api.js loaded and a widget rendered with hCaptcha's official test site key.",
      observed: "Cookie __cf_bm observed in the sandbox."
    },
    sources: ["https://docs.hcaptcha.com/faq/", "https://www.hcaptcha.com/privacy"],
    load(ctx) {
      const key = ctx.cfg.siteKey;
      if (typeof key !== "string" || !/^[0-9a-fA-F-]{36}$/.test(key)) {
        console.warn("[FivexConsent] hcaptcha: invalid siteKey");
        return;
      }
      return ctx.loadScript("https://js.hcaptcha.com/1/api.js");
    }
  };
  const __vite_glob_0_11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$q
  }, Symbol.toStringTag, { value: "Module" }));
  const service$p = {
    id: "hotjar",
    vendor: "Hotjar Ltd.",
    vendorUrl: "https://www.hotjar.com/",
    privacyUrl: "https://www.hotjar.com/legal/policies/privacy/",
    category: "analytics",
    label: { de: "Hotjar", en: "Hotjar" },
    description: {
      de: "Erstellt Heatmaps und Sitzungsaufzeichnungen, um die Nutzung der Website zu verbessern. Dabei werden Nutzungsdaten und Ihre IP-Adresse an Server von Hotjar übertragen.",
      en: "Creates heatmaps and session recordings to improve the website. Usage data and your IP address are transmitted to Hotjar servers."
    },
    cookies: [
      {
        name: "_hjSessionUser_*",
        duration: { de: "1 Jahr", en: "1 year" },
        description: { de: "Speichert die Hotjar-Nutzer-ID für die Website (Site-ID als Suffix).", en: "Persists the Hotjar user ID for the site (site ID as suffix)." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "_hjSession_*",
        duration: { de: "30 Minuten", en: "30 minutes" },
        description: { de: "Enthält die Daten der aktuellen Sitzung (Site-ID als Suffix).", en: "Holds current session data (site ID as suffix)." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "_hjHasCachedUserAttributes",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Zeigt, ob Nutzerattribute bereits zwischengespeichert sind.", en: "Indicates whether user attributes are already cached." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "_hjUserAttributesHash",
        duration: { de: "2 Minuten", en: "2 minutes" },
        description: { de: "Prüfsumme der Nutzerattribute, um Änderungen zu erkennen.", en: "Hash of the user attributes to detect changes." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "_hjUserAttributes",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
        description: { de: "Zwischengespeicherte Nutzerattribute (Local Storage).", en: "Cached user attributes (local storage)." },
        evidence: ["observed"]
      },
      {
        name: "hjActiveViewportIds",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
        description: { de: "Ansichtsfenster-Kennungen der Aufzeichnung (Local Storage).", en: "Viewport identifiers of the recording (local storage)." },
        evidence: ["observed"]
      },
      {
        name: "hjViewportId",
        type: "sessionStorage",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Kennung des Ansichtsfensters der aktuellen Sitzung (Session Storage).", en: "Viewport identifier of the current session (session storage)." },
        evidence: ["observed"]
      }
    ],
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. static.hotjar.com/c/hotjar-<id>.js?sv=<n> loaded (HTTP 200), the Hotjar modules loaded and the session started with a real site id, no errors.",
      observed: "Cookies and storage keys observed on live websites running Hotjar (writer: script.hotjar.com) and in the sandbox with a real site id; the names of the cookies are also in Hotjar's own cookie documentation.",
      liveSites: ["https://www.intercom.com/", "https://www.trustpilot.com/", "https://help.hotjar.com/"]
    },
    sources: ["https://help.hotjar.com/hc/en-us/articles/115011789248-Hotjar-Cookie-Information"],
    async load(ctx) {
      const id = String(ctx.cfg.id ?? "");
      const sv = String(ctx.cfg.snapshotVersion ?? "6");
      if (!/^\d{1,10}$/.test(id)) {
        console.warn("[FivexConsent] hotjar: invalid id");
        return;
      }
      if (!/^\d{1,3}$/.test(sv)) {
        console.warn("[FivexConsent] hotjar: invalid snapshotVersion");
        return;
      }
      const w = ctx.win;
      w.hj = w.hj || function() {
        (w.hj.q = w.hj.q || []).push(arguments);
      };
      w._hjSettings = { hjid: Number(id), hjsv: Number(sv) };
      await ctx.loadScript("https://static.hotjar.com/c/hotjar-" + encodeURIComponent(id) + ".js?sv=" + encodeURIComponent(sv));
    }
  };
  const __vite_glob_0_12 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$p
  }, Symbol.toStringTag, { value: "Module" }));
  let formCount = 0;
  const service$o = {
    id: "hubspot",
    vendor: "HubSpot Ireland Ltd.",
    vendorUrl: "https://www.hubspot.de",
    privacyUrl: "https://legal.hubspot.com/de/privacy-policy",
    category: "marketing",
    tracker: true,
    label: { de: "HubSpot", en: "HubSpot" },
    description: {
      de: "Zeigt HubSpot-Formulare an. Nutzt die Website den HubSpot-Tracking-Code, erfasst HubSpot nach Ihrer Einwilligung in Marketing außerdem Seitenaufrufe und ordnet Besucher Kontakten im HubSpot-CRM zu. Dabei werden Ihre IP-Adresse und Ihr Nutzungsverhalten an Server von HubSpot übertragen.",
      en: "Shows HubSpot forms. If the website uses the HubSpot tracking code, HubSpot also records page views and links visitors to contacts in the HubSpot CRM after your consent to marketing. Your IP address and usage behaviour are transmitted to HubSpot servers."
    },
    visitorNote: {
      de: "Ein einzelnes Formular über „Inhalt laden“ oder „Immer erlauben“ lädt nur das Formular; die Besucherverfolgung von HubSpot startet erst mit Ihrer Einwilligung in Marketing.",
      en: `Loading a single form with "Load content" or "Always allow" loads only the form; HubSpot's visitor tracking starts only with your consent to marketing.`
    },
    cookies: [
      {
        name: "__hstc",
        duration: { de: "6 Monate", en: "6 months" },
        description: { de: "Haupt-Tracking-Cookie (Domain, Besucher-ID, Zeitstempel, Sitzungsnummer).", en: "Main visitor tracking cookie (domain, visitor ID, timestamps, session number)." },
        evidence: ["vendor-docs"]
      },
      {
        name: "hubspotutk",
        duration: { de: "6 Monate", en: "6 months" },
        description: { de: "Besucher-Kennung; wird beim Absenden von Formularen übertragen, um Kontakte zu deduplizieren.", en: "Visitor identifier, sent on form submission to deduplicate contacts." },
        evidence: ["vendor-docs"]
      },
      {
        name: "__hssc",
        duration: { de: "30 Minuten", en: "30 minutes" },
        description: { de: "Verfolgt Sitzungen.", en: "Tracks sessions." },
        evidence: ["vendor-docs"]
      },
      {
        name: "__hssrc",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Erkennt, ob der Browser neu gestartet wurde.", en: "Detects whether the browser was restarted." },
        evidence: ["vendor-docs"]
      },
      {
        name: "messagesUtk",
        duration: { de: "6 Monate", en: "6 months" },
        description: { de: "Erkennt Besucher, die den HubSpot-Chat nutzen.", en: "Recognises visitors who use HubSpot chat." },
        evidence: ["vendor-docs"]
      },
      {
        name: "hs-messages-is-open",
        duration: { de: "30 Minuten", en: "30 minutes" },
        description: { de: "Merkt, ob das Chat-Widget geöffnet ist.", en: "Remembers whether the chat widget is open." },
        evidence: ["vendor-docs"]
      },
      {
        name: "hs-messages-hide-welcome-message",
        duration: { de: "1 Tag", en: "1 day" },
        description: { de: "Blendet die Chat-Begrüßung nach dem Schließen aus.", en: "Hides the chat welcome message once dismissed." },
        evidence: ["vendor-docs"]
      },
      {
        name: "__cf_bm",
        duration: { de: "30 Minuten", en: "30 minutes" },
        description: { de: "Bot-Schutz des CDN-Anbieters von HubSpot (HttpOnly).", en: "Bot protection by HubSpot's CDN provider (HttpOnly)." },
        evidence: ["observed", "vendor-docs"]
      }
    ],
    devNote: {
      de: "Je nach Einrichtung kann HubSpot weitere Cookies setzen (z. B. __hs_opt_out, __hs_cookie_cat_pref). Ein Formular über „Inhalt laden“ / „Immer erlauben“ lädt nur js.hsforms.net/forms/embed/v2.js, nie den Tracking-Code (js.hs-scripts.com); dieser startet nur mit der Marketing-Einwilligung. Ein HubSpot-Portal kann im Tracking-Code zusätzliche Werbe-Pixel einbinden (z. B. Meta); diese erfordern eine eigene Konfiguration des jeweiligen Dienstes (z. B. meta-pixel) und werden von diesem Paket nicht gesteuert.",
      en: 'Depending on setup HubSpot may set further cookies (e.g. __hs_opt_out, __hs_cookie_cat_pref). A form released with "Load content" / "Always allow" loads only js.hsforms.net/forms/embed/v2.js, never the tracking code (js.hs-scripts.com), which starts only with the marketing consent. A HubSpot portal can inject additional ad pixels (e.g. Meta) through its tracking code; these need the respective service configured separately (e.g. meta-pixel) and are not controlled by this package.'
    },
    verification: {
      date: "2026-10-11",
      loader: 'Loaded after consent in a real Chrome profile; no request to the vendor before consent. js.hs-scripts.com/<portalId>.js loaded after consent. A public form (portal 53) rendered in two containers released one after another, in a late container after "allow all" and in two at once, from js.hsforms.net/forms/embed/v2.js with hbspt.forms.create. A one-off load requested only js.hsforms.net, forms.hsforms.com and forms-na1.hsforms.com (set __cf_bm on hsforms.net / hsforms.com) and never js.hs-scripts.com; the tracking code was requested only after the marketing consent.',
      observed: "Tracking cookies observed on hubspot.com (writer: js.hs-analytics.net); the full list and durations are in HubSpot's documentation.",
      liveSites: ["https://www.hubspot.com/"]
    },
    sources: ["https://knowledge.hubspot.com/privacy-and-consent/what-cookies-does-hubspot-set-in-a-visitor-s-browser"],
    embed: {
      hosts: ["hsforms.com", "hsforms.net", "meetings.hubspot.com", "share.hsforms.com"],
      markup: { example: '<div class="hs-form-html" data-region="eu1" data-portal-id="1234567" data-form-id="00000000-0000-0000-0000-000000000000"></div>' },
      placeholder: {
        de: "Dieses Formular wird von HubSpot bereitgestellt. Beim Laden werden Daten an HubSpot übertragen.",
        en: "This form is provided by HubSpot. Loading it transmits data to HubSpot."
      }
    },
    /** Tracking code. Without an `id` (forms only) nothing is loaded. */
    load(ctx) {
      if (ctx.cfg.id === void 0) return;
      const id = String(ctx.cfg.id);
      if (!/^\d{3,12}$/.test(id)) {
        console.warn("[FivexConsent] hubspot: invalid id");
        return;
      }
      return ctx.loadScript("https://js.hs-scripts.com/" + encodeURIComponent(id) + ".js", { id: "hs-script-loader" });
    },
    /** Forms library only: no tracking. */
    loadEmbed(ctx) {
      return ctx.loadScript("https://js.hsforms.net/forms/embed/v2.js");
    },
    async refresh(ctx, el) {
      const create = await until(() => ctx.win.hbspt?.forms?.create);
      if (!create) return;
      for (const f of scan(el, ".hs-form-html")) {
        const portalId = f.getAttribute("data-portal-id") ?? "";
        const formId = f.getAttribute("data-form-id") ?? "";
        const region = f.getAttribute("data-region") ?? "";
        if (!/^\d{1,12}$/.test(portalId) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formId) || region && !/^[a-z]{2,3}\d$/.test(region) || !claim(f)) continue;
        f.id = "fivex-hs-form-" + ++formCount;
        create({ portalId, formId, ...region ? { region } : {}, target: "#" + f.id });
      }
    }
  };
  const __vite_glob_0_13 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$o
  }, Symbol.toStringTag, { value: "Module" }));
  const service$n = {
    id: "instagram",
    vendor: "Meta Platforms Ireland Ltd.",
    vendorUrl: "https://www.instagram.com",
    privacyUrl: "https://privacycenter.instagram.com/policy",
    category: "marketing",
    label: { de: "Instagram", en: "Instagram" },
    description: {
      de: "Bindet Beiträge von Instagram in diese Seite ein. Dabei wird Ihre IP-Adresse an Server von Meta übertragen; Meta kann Cookies setzen und Daten Ihrem Instagram-Konto zuordnen, wenn Sie angemeldet sind.",
      en: "Embeds Instagram posts in this page. Your IP address is transmitted to Meta servers; Meta may set cookies and link data to your Instagram account if you are logged in."
    },
    cookies: [
      {
        name: "csrftoken",
        duration: { de: "13 Monate (400 Tage)", en: "13 months" },
        description: { de: "Sicherheits-Token gegen Cross-Site-Request-Forgery (instagram.com).", en: "Security token against cross-site request forgery (instagram.com)." },
        evidence: ["observed"]
      }
    ],
    verification: {
      date: "2026-10-11",
      loader: 'Loaded after consent in a real Chrome profile; no request to the vendor before consent. embed.js and a public post embed loaded. Two blockquote containers released one after another, a late container after "allow all" and two at once each rendered the post (instgrm.Embeds.process()).',
      observed: "Cookie csrftoken observed in the sandbox with a public post embed."
    },
    sources: ["https://privacycenter.instagram.com/policy/cookies", "https://developers.facebook.com/docs/instagram-platform/oembed"],
    embed: {
      hosts: ["instagram.com", "cdninstagram.com"],
      markup: {
        example: '<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/p/POST_ID/" data-instgrm-version="14"><a href="https://www.instagram.com/p/POST_ID/" target="_blank" rel="noopener">View this post on Instagram</a></blockquote>'
      },
      placeholder: {
        de: "Dieser Beitrag wird von Instagram bereitgestellt. Beim Laden werden Daten an Meta übertragen.",
        en: "This post is provided by Instagram. Loading it transmits data to Meta."
      }
    },
    load(ctx) {
      return ctx.loadScript("https://www.instagram.com/embed.js").then(() => {
        ctx.win.instgrm?.Embeds?.process?.();
      });
    },
    refresh(ctx) {
      ctx.win.instgrm?.Embeds?.process?.();
    }
  };
  const __vite_glob_0_14 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$n
  }, Symbol.toStringTag, { value: "Module" }));
  const service$m = {
    id: "intercom",
    vendor: "Intercom, Inc.",
    vendorUrl: "https://www.intercom.com",
    privacyUrl: "https://www.intercom.com/legal/privacy",
    category: "functional",
    // chat/support widget
    label: { de: "Intercom", en: "Intercom" },
    description: {
      de: "Zeigt einen Chat für Fragen und Support an. Dabei werden Ihre IP-Adresse und Nutzungsdaten an Server von Intercom übertragen.",
      en: "Shows a chat for questions and support. Your IP address and usage data are transmitted to Intercom servers."
    },
    cookies: [
      {
        name: "intercom-id-*",
        duration: { de: "9 Monate (270 Tage)", en: "9 months (270 days)" },
        description: { de: "Anonyme Besucherkennung des Messengers (App-ID als Suffix).", en: "Anonymous visitor identifier of the Messenger (app ID as suffix)." },
        evidence: ["observed"],
        devNote: { de: "Intercom dokumentiert diesen Eintrag als Local Storage ohne Ablauf; im Test wurde er als Cookie beobachtet.", en: "Intercom documents this entry as local storage without expiry; it was observed as a cookie in the test." }
      },
      {
        name: "intercom-session-*",
        duration: { de: "7 Tage (einstellbar)", en: "7 days (adjustable)" },
        description: { de: "Kennung der Messenger-Sitzung (App-ID als Suffix).", en: "Identifier of the Messenger session (app ID as suffix)." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "intercom-device-id-*",
        duration: { de: "9 Monate (270 Tage)", en: "9 months (270 days)" },
        description: { de: "Kennung des Geräts (App-ID als Suffix).", en: "Identifier of the device (app ID as suffix)." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "intercom.intercom-state-*",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
        description: { de: "Zustand des Messengers (Local Storage, App-ID als Suffix).", en: "State of the Messenger (local storage, app ID as suffix)." },
        evidence: ["observed"]
      }
    ],
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. widget.intercom.io/widget/<appId> loaded and the Messenger booted with a real app id taken from Intercom's own website (origin intercom.com).",
      observed: "Cookies and local storage keys observed in the sandbox with a real app id; names and durations also in Intercom's documentation.",
      liveSites: ["https://www.intercom.com/"]
    },
    sources: ["https://www.intercom.com/help/en/articles/2361922-intercom-messenger-cookies"],
    load(ctx) {
      const id = ctx.cfg.appId;
      if (typeof id !== "string" || !/^[a-z0-9]{6,12}$/i.test(id)) {
        console.warn("[FivexConsent] intercom: invalid appId");
        return;
      }
      const settings = { app_id: id };
      ctx.win.intercomSettings = settings;
      return ctx.loadScript(`https://widget.intercom.io/widget/${encodeURIComponent(id)}`).then(() => {
        if (typeof ctx.win.Intercom === "function") ctx.win.Intercom("boot", settings);
      });
    }
  };
  const __vite_glob_0_15 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$m
  }, Symbol.toStringTag, { value: "Module" }));
  const service$l = {
    id: "linkedin-insight",
    vendor: "LinkedIn Ireland Unlimited Company",
    vendorUrl: "https://www.linkedin.com",
    privacyUrl: "https://www.linkedin.com/legal/privacy-policy",
    category: "marketing",
    label: { de: "LinkedIn Insight Tag", en: "LinkedIn Insight Tag" },
    description: {
      de: "Misst Conversions und Zielgruppen für LinkedIn-Werbung. Dabei werden Ihre IP-Adresse und Seitenaufrufe an Server von LinkedIn übertragen.",
      en: "Measures conversions and audiences for LinkedIn advertising. Your IP address and page views are transmitted to LinkedIn servers."
    },
    cookies: [
      {
        name: "bcookie",
        duration: { de: "1 Jahr", en: "1 year" },
        description: { de: "Browser-Kennung zur Missbrauchserkennung und für Diagnosen.", en: "Browser identifier used to detect abuse and for diagnostics." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "lidc",
        duration: { de: "24 Stunden", en: "24 hours" },
        description: { de: "Auswahl des Rechenzentrums.", en: "Data centre selection." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "li_gc",
        duration: { de: "6 Monate", en: "6 months" },
        description: { de: "Speichert die Cookie-Einwilligung von Gästen für nicht notwendige Zwecke.", en: "Stores the consent of guests for non-essential cookies." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "__cf_bm",
        duration: { de: "30 Minuten", en: "30 minutes" },
        description: { de: "Cloudflare-Bot-Schutz (HttpOnly, linkedin.com).", en: "Cloudflare bot management (HttpOnly, linkedin.com)." },
        evidence: ["observed"]
      }
    ],
    devNote: { de: "Namen und Laufzeiten stammen aus der Cookie-Tabelle von LinkedIn und wurden bestätigt (bcookie, lidc, li_gc).", en: "Names and durations are taken from LinkedIn's cookie table and were confirmed (bcookie, lidc, li_gc)." },
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. insight.min.js loaded and page-view beacons were sent to px.ads.linkedin.com.",
      observed: "Cookies observed in the sandbox; durations also in LinkedIn's cookie table."
    },
    sources: ["https://www.linkedin.com/legal/l/cookie-table", "https://www.linkedin.com/legal/cookie-policy"],
    load(ctx) {
      const id = String(ctx.cfg.id ?? "");
      if (!/^\d{3,12}$/.test(id)) {
        console.warn("[FivexConsent] linkedin-insight: invalid id");
        return;
      }
      const w = ctx.win;
      w._linkedin_data_partner_ids = w._linkedin_data_partner_ids || [];
      w._linkedin_data_partner_ids.push(id);
      w._linkedin_partner_id = id;
      return ctx.loadScript("https://snap.licdn.com/li.lms-analytics/insight.min.js");
    }
  };
  const __vite_glob_0_16 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$l
  }, Symbol.toStringTag, { value: "Module" }));
  const service$k = {
    id: "loom",
    vendor: "Loom, Inc. (Atlassian)",
    vendorUrl: "https://www.loom.com",
    privacyUrl: "https://www.atlassian.com/legal/privacy-policy",
    category: "functional",
    label: { de: "Loom", en: "Loom" },
    description: {
      de: "Zeigt eingebettete Loom-Videos an. Dabei wird Ihre IP-Adresse an Server von Loom übertragen.",
      en: "Shows embedded Loom videos. Your IP address is transferred to Loom servers."
    },
    cookies: [
      {
        name: "loom_anon_comment",
        duration: { de: "12 Monate (365 Tage)", en: "12 months" },
        description: { de: "Anonyme Kennung für Kommentare (loom.com).", en: "Anonymous identifier for comments (loom.com)." },
        evidence: ["observed"]
      },
      {
        name: "ajs_anonymous_id",
        duration: { de: "12 Monate (365 Tage)", en: "12 months" },
        description: { de: "Anonyme Besucher-ID der Analytics-Bibliothek (Cookie und Local Storage, loom.com).", en: "Anonymous visitor id of the analytics library (cookie and local storage, loom.com)." },
        evidence: ["observed"]
      },
      {
        name: "ajs_anonymous_id",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Anonyme Besucher-ID der Analytics-Bibliothek (loom.com).", en: "Anonymous visitor id of the analytics library (loom.com)." },
        evidence: ["observed"]
      },
      {
        name: "statsig.session_id.*",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Sitzungs-ID für Feature-Tests/Analysen (Statsig).", en: "Session id for feature tests/analytics (Statsig)." },
        evidence: ["observed"]
      },
      {
        name: "statsig.stable_id.*",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Stabile Geräte-ID für Feature-Tests/Analysen (Statsig).", en: "Stable device id for feature tests/analytics (Statsig)." },
        evidence: ["observed"]
      },
      {
        name: "awc.session.id",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Sitzungs-ID des Analytics-Clients von Atlassian.", en: "Session id of Atlassian's analytics client." },
        evidence: ["observed"]
      },
      {
        name: "awc.session.expiry",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Ablaufzeit der Analytics-Sitzung (Atlassian).", en: "Expiry of the analytics session (Atlassian)." },
        evidence: ["observed"]
      },
      {
        name: "awc.*",
        type: "sessionStorage",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Sitzungsdaten des Analytics-Clients von Atlassian (z. B. awc.tab.id, awc.taskSessions).", en: "Session data of Atlassian's analytics client (e.g. awc.tab.id, awc.taskSessions)." },
        evidence: ["observed"]
      },
      {
        name: "sentryReplaySession",
        type: "sessionStorage",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Fehler-Monitoring und Sitzungs-Replay (Sentry).", en: "Error monitoring and session replay (Sentry)." },
        evidence: ["observed"]
      },
      {
        name: "analytics-web-client",
        type: "indexedDB",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "IndexedDB des Analytics-Clients von Atlassian.", en: "IndexedDB of Atlassian's analytics client." },
        evidence: ["observed"]
      },
      {
        name: "viewer_session_data",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
        description: { de: "Loom: Daten der Zuschauer-Sitzung (Local Storage).", en: "Loom: viewer session data (local storage)." },
        evidence: ["observed"]
      }
    ],
    visitorNote: {
      de: "Loom gehört zu Atlassian; es gilt dessen Datenschutzerklärung.",
      en: "Loom is owned by Atlassian; its privacy policy applies."
    },
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. The embed iframe loaded with a public sample video.",
      observed: "Cookies, local/session storage and IndexedDB observed in the sandbox with a public sample video and on loom.com (writer: cdn.loom.com).",
      liveSites: ["https://www.loom.com/"]
    },
    sources: ["https://www.atlassian.com/legal/privacy-policy"],
    embed: {
      hosts: ["loom.com"],
      placeholder: {
        de: "Dieses Video wird von Loom bereitgestellt. Beim Laden werden Daten an Loom übertragen.",
        en: "This video is provided by Loom. Loading it transfers data to Loom."
      }
    }
  };
  const __vite_glob_0_17 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$k
  }, Symbol.toStringTag, { value: "Module" }));
  const service$j = {
    id: "matomo",
    vendor: "Matomo (InnoCraft Ltd. / self-hosted)",
    vendorUrl: "https://matomo.org/",
    privacyUrl: "https://matomo.org/privacy-policy/",
    category: "analytics",
    label: { de: "Matomo", en: "Matomo" },
    description: {
      de: "Misst, wie die Website genutzt wird. Dabei wird Ihre IP-Adresse an den Matomo-Server des Betreibers übertragen (bei Matomo Cloud: Server von InnoCraft).",
      en: "Measures how the website is used. Your IP address is transmitted to the site operator's Matomo server (for Matomo Cloud: InnoCraft servers)."
    },
    cookies: [
      {
        name: "_pk_id.*",
        duration: { de: "13 Monate", en: "13 months" },
        description: { de: "Speichert die Besucher-ID.", en: "Stores the visitor ID." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "_pk_ses.*",
        duration: { de: "30 Minuten", en: "30 minutes" },
        description: { de: "Kurzlebiges Sitzungs-Cookie.", en: "Short-lived session cookie." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "_pk_ref.*",
        duration: { de: "6 Monate", en: "6 months" },
        description: { de: "Speichert die Herkunft (Referrer) des Besuchers.", en: "Stores the visitor's referrer attribution." },
        evidence: ["vendor-docs"]
      }
    ],
    devNote: {
      de: "Matomo kann auch ohne Cookies betrieben werden; dieser Eintrag geht vom Standardbetrieb mit Cookies aus. Optionale Funktionen (z. B. Heatmaps, A/B-Tests) setzen weitere Cookies.",
      en: "Matomo can also run without cookies; this entry assumes the default mode with cookies. Optional features (e.g. heatmaps, A/B tests) set further cookies."
    },
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. matomo.js loaded from the public demo instance.",
      observed: "_pk_id and _pk_ses observed in the sandbox; _pk_ref is in Matomo's cookie documentation."
    },
    sources: ["https://matomo.org/faq/general/faq_146/", "https://developer.matomo.org/guides/tracking-javascript-guide"],
    load(ctx) {
      let base;
      try {
        base = new URL(String(ctx.cfg.url ?? ""));
      } catch {
        console.warn("[FivexConsent] matomo: invalid url");
        return;
      }
      const siteId = String(ctx.cfg.siteId ?? "");
      if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) {
        console.warn("[FivexConsent] matomo: invalid url");
        return;
      }
      if (!/^\d{1,9}$/.test(siteId)) {
        console.warn("[FivexConsent] matomo: invalid siteId");
        return;
      }
      const u = base.origin + base.pathname.replace(/\/?$/, "/");
      const paq = ctx.win._paq = ctx.win._paq || [];
      paq.push(["trackPageView"]);
      paq.push(["enableLinkTracking"]);
      paq.push(["setTrackerUrl", u + "matomo.php"]);
      paq.push(["setSiteId", siteId]);
      return ctx.loadScript(u + "matomo.js");
    }
  };
  const __vite_glob_0_18 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$j
  }, Symbol.toStringTag, { value: "Module" }));
  const service$i = {
    id: "meta-pixel",
    vendor: "Meta Platforms Ireland Ltd.",
    vendorUrl: "https://www.facebook.com",
    privacyUrl: "https://www.facebook.com/privacy/policy/",
    category: "marketing",
    label: { de: "Meta Pixel", en: "Meta Pixel" },
    description: {
      de: "Misst Seitenaufrufe und Aktionen für Werbung auf Facebook und Instagram und ermöglicht Remarketing. Dabei werden Daten, darunter Ihre IP-Adresse, an Server von Meta übertragen.",
      en: "Measures page views and actions for advertising on Facebook and Instagram and enables remarketing. Data, including your IP address, is transmitted to Meta servers."
    },
    cookies: [
      {
        name: "_fbp",
        duration: { de: "3 Monate", en: "3 months" },
        description: { de: "Meta-Browserkennung zur Zuordnung von Besuchen (First-Party-Cookie des Pixels).", en: "Meta browser identifier used to attribute visits (first-party cookie set by the pixel)." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "_fbc",
        duration: { de: "3 Monate", en: "3 months" },
        description: { de: "Speichert die Klick-ID (fbclid) nach einem Klick auf eine Meta-Anzeige.", en: "Stores the click ID (fbclid) after a click on a Meta ad." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "lastExternalReferrer",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
        description: { de: "Letzte externe Herkunftsseite (Local Storage, fbevents.js).", en: "Last external referrer (local storage, fbevents.js)." },
        evidence: ["observed"]
      },
      {
        name: "lastExternalReferrerTime",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
        description: { de: "Zeitpunkt der letzten externen Herkunftsseite (Local Storage, fbevents.js).", en: "Time of the last external referrer (local storage, fbevents.js)." },
        evidence: ["observed"]
      },
      {
        name: "multiFbc",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
        description: { de: "Liste der gespeicherten Klick-IDs (Local Storage, fbevents.js).", en: "List of stored click IDs (local storage, fbevents.js)." },
        evidence: ["observed"]
      }
    ],
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. fbevents.js, the pixel configuration and the PageView beacon (facebook.com/tr) worked with a real pixel id taken from a live website.",
      observed: "_fbp, _fbc (with a fbclid in the URL) and local storage keys observed in the sandbox; _fbp also on a live website (writer: fbevents.js).",
      liveSites: ["https://contentsquare.com/hotjar/"]
    },
    sources: ["https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/fbp-and-fbc", "https://developers.facebook.com/docs/meta-pixel/implementation/gdpr"],
    load(ctx) {
      const id = String(ctx.cfg.id ?? "");
      if (!/^\d{5,20}$/.test(id)) {
        console.warn("[FivexConsent] meta-pixel: invalid id");
        return;
      }
      const w = ctx.win;
      if (!w.fbq) {
        const n = w.fbq = function(...args) {
          if (n.callMethod) n.callMethod(...args);
          else n.queue.push(args);
        };
        if (!w._fbq) w._fbq = n;
        n.push = n;
        n.loaded = true;
        n.version = "2.0";
        n.queue = [];
      }
      w.fbq("init", id);
      w.fbq("track", "PageView");
      return ctx.loadScript("https://connect.facebook.net/en_US/fbevents.js");
    }
  };
  const __vite_glob_0_19 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$i
  }, Symbol.toStringTag, { value: "Module" }));
  const service$h = {
    id: "microsoft-uet",
    vendor: "Microsoft Ireland Operations Ltd.",
    vendorUrl: "https://ads.microsoft.com",
    privacyUrl: "https://privacy.microsoft.com/de-de/privacystatement",
    category: "marketing",
    label: { de: "Microsoft Advertising (UET)", en: "Microsoft Advertising (UET)" },
    description: {
      de: "Misst Conversions für Microsoft-/Bing-Werbung und ermöglicht Remarketing. Dabei werden Ihre IP-Adresse und Seitenaufrufe an Server von Microsoft übertragen.",
      en: "Measures conversions for Microsoft/Bing advertising and enables remarketing. Your IP address and page views are transmitted to Microsoft servers."
    },
    cookies: [
      {
        name: "_uetvid",
        duration: { de: "13 Monate (390 Tage)", en: "13 months (390 days)" },
        description: { de: "Anonymisierte Besucher-ID für Conversion-Messung und Remarketing (First-Party).", en: "Anonymised visitor ID for conversion measurement and remarketing (first-party)." },
        evidence: ["observed"]
      },
      {
        name: "_uetsid",
        duration: { de: "24 Stunden", en: "24 hours" },
        description: { de: "Kennung einer Sitzung auf der Website (First-Party).", en: "Identifier of a session on the website (first-party)." },
        evidence: ["observed"]
      },
      {
        name: "MUID",
        duration: { de: "13 Monate (390 Tage)", en: "13 months (390 days)" },
        description: { de: "Drittanbieter-Cookie von Bing zur Wiedererkennung über Websites hinweg.", en: "Third-party cookie from Bing to recognise users across sites." },
        evidence: ["observed"]
      },
      {
        name: "_uetvid",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Kopie der Besucher-ID im Local Storage (mit _uetvid_exp).", en: "Copy of the visitor ID in local storage (with _uetvid_exp)." },
        evidence: ["observed"]
      },
      {
        name: "_uetsid",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Kopie der Sitzungs-ID im Local Storage (mit _uetsid_exp).", en: "Copy of the session ID in local storage (with _uetsid_exp)." },
        evidence: ["observed"]
      },
      {
        name: "_uetvid_exp",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
        description: { de: "Ablaufzeit von _uetvid (Local Storage, bat.bing.com).", en: "Expiry time of _uetvid (local storage, bat.bing.com)." },
        evidence: ["observed"]
      },
      {
        name: "_uetsid_exp",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
        description: { de: "Ablaufzeit von _uetsid (Local Storage, bat.bing.com).", en: "Expiry time of _uetsid (local storage, bat.bing.com)." },
        evidence: ["observed"]
      }
    ],
    devNote: { de: "Microsoft nennt in der offiziellen Dokumentation keine Laufzeiten; die Angaben stammen aus der Beobachtung.", en: "Microsoft states no durations in its official documentation; the values come from observation." },
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. bat.js loaded; /action beacons returned 204.",
      observed: "Cookies and local storage keys observed in the sandbox (writer: bat.bing.com) and on live websites.",
      liveSites: ["https://www.brevo.com/", "https://www.intercom.com/"]
    },
    sources: [
      "https://help.ads.microsoft.com/apex/index/3/en/60119",
      "https://learn.microsoft.com/en-us/advertising/guides/universal-event-tracking?view=bingads-13"
    ],
    init(ctx) {
      const w = ctx.win;
      w.uetq = w.uetq || [];
      if (Array.isArray(w.uetq)) w.uetq.push("consent", "default", { ad_storage: "denied" });
    },
    load(ctx) {
      const id = String(ctx.cfg.id ?? "");
      if (!/^\d{4,12}$/.test(id)) {
        console.warn("[FivexConsent] microsoft-uet: invalid id");
        return;
      }
      const w = ctx.win;
      const q = w.uetq = w.uetq || [];
      q.push("consent", "update", { ad_storage: "granted" });
      return ctx.loadScript("https://bat.bing.com/bat.js").then(() => {
        if (typeof w.UET !== "function" || !Array.isArray(w.uetq)) return;
        const t = new w.UET({ ti: id, enableAutoSpaTracking: true, q: w.uetq });
        w.uetq = t;
        t.push("pageLoad");
      });
    }
  };
  const __vite_glob_0_20 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$h
  }, Symbol.toStringTag, { value: "Module" }));
  const service$g = {
    id: "openstreetmap",
    vendor: "OpenStreetMap Foundation",
    vendorUrl: "https://www.openstreetmap.org",
    privacyUrl: "https://osmfoundation.org/wiki/Privacy_Policy",
    category: "functional",
    label: { de: "OpenStreetMap", en: "OpenStreetMap" },
    description: {
      de: "Zeigt eine eingebettete OpenStreetMap-Karte an. Dabei wird Ihre IP-Adresse an Server der OpenStreetMap Foundation übertragen und in Server-Logs verarbeitet.",
      en: "Shows an embedded OpenStreetMap map. Your IP address is transferred to servers of the OpenStreetMap Foundation and processed in server logs."
    },
    cookies: [],
    cookieless: true,
    devNote: { de: "Die Einbettung setzte weder Cookies noch Speichereinträge.", en: "The embed set no cookies or storage entries." },
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. The embed iframe loaded; tiles come from tile.openstreetmap.org.",
      observed: "No cookies or storage keys observed in the sandbox."
    },
    sources: ["https://osmfoundation.org/wiki/Privacy_Policy"],
    embed: {
      hosts: ["www.openstreetmap.org", "openstreetmap.org"],
      placeholder: {
        de: "Diese Karte wird von OpenStreetMap bereitgestellt. Beim Laden werden Daten an die OpenStreetMap Foundation übertragen.",
        en: "This map is provided by OpenStreetMap. Loading it transfers data to the OpenStreetMap Foundation."
      }
    }
  };
  const __vite_glob_0_21 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$g
  }, Symbol.toStringTag, { value: "Module" }));
  const service$f = {
    id: "pinterest-tag",
    vendor: "Pinterest Europe Ltd.",
    vendorUrl: "https://www.pinterest.com",
    privacyUrl: "https://policy.pinterest.com/de/privacy-policy",
    category: "marketing",
    label: { de: "Pinterest Tag", en: "Pinterest Tag" },
    description: {
      de: "Misst Conversions für Pinterest-Werbung und ermöglicht Remarketing. Dabei werden Ihre IP-Adresse und Seitenaufrufe an Server von Pinterest übertragen.",
      en: "Measures conversions for Pinterest advertising and enables remarketing. Your IP address and page views are transmitted to Pinterest servers."
    },
    cookies: [
      {
        name: "_pin_unauth",
        duration: { de: "12 Monate", en: "12 months" },
        description: { de: "Pinterest-Kennung für nicht angemeldete Besucher (First-Party-Cookie des Tags).", en: "Pinterest identifier for visitors who are not logged in (first-party cookie set by the tag)." },
        evidence: ["observed"]
      },
      {
        name: "_epik",
        duration: { de: "12 Monate", en: "12 months" },
        description: { de: "Speichert die Klick-ID (epik) nach einem Klick auf eine Pinterest-Anzeige.", en: "Stores the click ID (epik) after a click on a Pinterest ad." },
        evidence: ["observed"]
      },
      {
        name: "is_eu",
        type: "sessionStorage",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Kennzeichen, ob der Besucher aus der EU kommt (Session Storage).", en: "Flag whether the visitor is located in the EU (session storage)." },
        evidence: ["observed"]
      }
    ],
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. s.pinimg.com/ct/core.js loaded and ct.pinterest.com beacons were sent with a real tag id taken from a live website.",
      observed: "_pin_unauth, _epik (with an epik parameter in the URL) and session storage observed in the sandbox with a real tag id."
    },
    sources: ["https://help.pinterest.com/en/business/article/track-conversions-with-pinterest-tag", "https://policy.pinterest.com/en/cookies"],
    load(ctx) {
      const id = String(ctx.cfg.id ?? "");
      if (!/^\d{6,20}$/.test(id)) {
        console.warn("[FivexConsent] pinterest-tag: invalid id");
        return;
      }
      const w = ctx.win;
      if (!w.pintrk) {
        const p = w.pintrk = (...a) => p.queue.push(a);
        p.queue = [];
        p.version = "3.0";
        ctx.loadScript("https://s.pinimg.com/ct/core.js");
      }
      w.pintrk("load", id);
      w.pintrk("page");
    }
  };
  const __vite_glob_0_22 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$f
  }, Symbol.toStringTag, { value: "Module" }));
  const service$e = {
    id: "plausible",
    vendor: "Plausible Insights OÜ",
    vendorUrl: "https://plausible.io/",
    privacyUrl: "https://plausible.io/privacy",
    category: "analytics",
    cookies: [],
    cookieless: true,
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. plausible.io/js/script.js loaded (HTTP 200).",
      observed: "No cookies or storage keys observed; Plausible's data policy states that no cookies are used."
    },
    label: { de: "Plausible Analytics", en: "Plausible Analytics" },
    description: {
      de: "Misst die Nutzung der Website ohne Cookies und ohne lokale Speicherung. Dabei wird Ihre IP-Adresse kurzzeitig an den Server übertragen, aber nicht gespeichert.",
      en: "Measures website usage without cookies or local storage. Your IP address is briefly sent to the server but not stored."
    },
    sources: ["https://plausible.io/data-policy"],
    async load(ctx) {
      const domain = String(ctx.cfg.domain ?? ctx.win.location.hostname);
      if (!/^[a-z0-9.-]+(,[a-z0-9.-]+)*$/i.test(domain)) {
        console.warn("[FivexConsent] plausible: invalid domain");
        return;
      }
      let src = "https://plausible.io/js/script.js";
      if (ctx.cfg.src != null) {
        try {
          const u = new URL(String(ctx.cfg.src));
          if (u.protocol !== "https:" || u.username || u.password) throw new Error();
          src = u.href;
        } catch {
          console.warn("[FivexConsent] plausible: invalid src");
          return;
        }
      }
      await ctx.loadScript(src, { defer: "", "data-domain": domain });
    }
  };
  const __vite_glob_0_23 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$e
  }, Symbol.toStringTag, { value: "Module" }));
  const service$d = {
    id: "recaptcha",
    vendor: "Google LLC",
    vendorUrl: "https://www.google.com/recaptcha/about/",
    privacyUrl: "https://policies.google.com/privacy",
    category: "functional",
    // spam protection for forms; not advertising
    label: { de: "Google reCAPTCHA", en: "Google reCAPTCHA" },
    description: {
      de: "Schützt Formulare vor Spam und Missbrauch. Dabei werden Browser- und Nutzungsdaten sowie Ihre IP-Adresse an Google übertragen.",
      en: "Protects forms from spam and abuse. Browser and usage data and your IP address are transmitted to Google."
    },
    cookies: [
      {
        name: "_GRECAPTCHA",
        duration: { de: "6 Monate (180 Tage)", en: "6 months" },
        description: { de: "Notwendiges Cookie für die Risikoanalyse (google.com bzw. recaptcha.net, je nach Einbindung).", en: "Necessary cookie for risk analysis (google.com or recaptcha.net, depending on the integration)." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "_grecaptcha",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Speichert Risikoanalyse-Daten (Local Storage der Website).", en: "Stores risk-analysis data (local storage of the site)." },
        evidence: ["observed"]
      },
      {
        name: "rc::a",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Bot-Erkennung (Local Storage, google.com).", en: "Bot detection (local storage, google.com)." },
        evidence: ["observed"]
      },
      {
        name: "rc::f",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Bot-Erkennung (Local Storage, google.com).", en: "Bot detection (local storage, google.com)." },
        evidence: ["observed"]
      },
      {
        name: "rc::b",
        type: "sessionStorage",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Bot-Erkennung (Session Storage, google.com).", en: "Bot detection (session storage, google.com)." },
        evidence: ["observed"]
      },
      {
        name: "rc::c",
        type: "sessionStorage",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Bot-Erkennung (Session Storage, google.com).", en: "Bot detection (session storage, google.com)." },
        evidence: ["observed"]
      }
    ],
    devNote: { de: "Formulare, die reCAPTCHA erfordern, funktionieren ohne Einwilligung nicht. Alternative Domain: www.recaptcha.net.", en: "Forms that require reCAPTCHA will not work without consent. Alternative domain: www.recaptcha.net." },
    visitorNote: {
      de: "Formulare mit reCAPTCHA funktionieren ohne Ihre Einwilligung nicht.",
      en: "Forms protected by reCAPTCHA do not work without your consent."
    },
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. api.js loaded and a v2 widget rendered with Google's official test site key.",
      observed: "Cookie and storage keys observed in the sandbox; _GRECAPTCHA also in Google's FAQ."
    },
    sources: ["https://docs.cloud.google.com/recaptcha/docs/faq"],
    load(ctx) {
      const key = ctx.cfg.siteKey;
      if (typeof key !== "string" || !/^[A-Za-z0-9_-]{20,64}$/.test(key)) {
        console.warn("[FivexConsent] recaptcha: invalid siteKey");
        return;
      }
      const host = ctx.cfg.domain === "recaptcha.net" ? "www.recaptcha.net" : "www.google.com";
      return ctx.loadScript(`https://${host}/recaptcha/api.js?render=${encodeURIComponent(key)}`);
    }
  };
  const __vite_glob_0_24 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$d
  }, Symbol.toStringTag, { value: "Module" }));
  const service$c = {
    id: "soundcloud",
    vendor: "SoundCloud Global Limited & Co. KG",
    vendorUrl: "https://soundcloud.com",
    privacyUrl: "https://soundcloud.com/pages/privacy",
    category: "functional",
    label: { de: "SoundCloud", en: "SoundCloud" },
    description: {
      de: "Zeigt eingebettete SoundCloud-Audioplayer an. Dabei wird Ihre IP-Adresse an Server von SoundCloud übertragen.",
      en: "Shows embedded SoundCloud audio players. Your IP address is transferred to SoundCloud servers."
    },
    cookies: [
      {
        name: "ddSession_datadome",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Bot-Schutz von DataDome innerhalb des Players (w.soundcloud.com).", en: "DataDome bot protection inside the player (w.soundcloud.com)." },
        evidence: ["observed"]
      }
    ],
    devNote: { de: "Zusätzlich schreibt der Player einen Schlüssel „getItem“ in den Session Storage.", en: 'The player also writes a key "getItem" to session storage.' },
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. A public track embed loaded.",
      observed: "Local storage key observed in the sandbox."
    },
    sources: ["https://soundcloud.com/pages/privacy"],
    embed: {
      hosts: ["w.soundcloud.com"],
      placeholder: {
        de: "Dieser Player wird von SoundCloud bereitgestellt. Beim Laden werden Daten an SoundCloud übertragen.",
        en: "This player is provided by SoundCloud. Loading it transfers data to SoundCloud."
      }
    }
  };
  const __vite_glob_0_25 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$c
  }, Symbol.toStringTag, { value: "Module" }));
  const service$b = {
    id: "spotify",
    vendor: "Spotify AB",
    vendorUrl: "https://www.spotify.com",
    privacyUrl: "https://www.spotify.com/legal/privacy-policy/",
    category: "functional",
    label: { de: "Spotify", en: "Spotify" },
    description: {
      de: "Zeigt eingebettete Spotify-Inhalte (Musik, Podcasts) an. Dabei wird Ihre IP-Adresse an Server von Spotify übertragen.",
      en: "Shows embedded Spotify content (music, podcasts). Your IP address is transferred to Spotify servers."
    },
    cookies: [
      {
        name: "sp_t",
        duration: { de: "12 Monate (365 Tage)", en: "12 months" },
        description: { de: "Geräte-Kennung (spotify.com).", en: "Device identifier (spotify.com)." },
        evidence: ["observed"]
      },
      {
        name: "sp_landing",
        duration: { de: "24 Stunden", en: "24 hours" },
        description: { de: "Merkt die erste aufgerufene Seite (HttpOnly, spotify.com).", en: "Remembers the landing page (HttpOnly, spotify.com)." },
        evidence: ["observed"]
      },
      {
        name: "sp_last_utm",
        duration: { de: "60 Tage", en: "60 days" },
        description: { de: "Speichert die letzten UTM-Parameter (spotify.com).", en: "Stores the last UTM parameters (spotify.com)." },
        evidence: ["observed"]
      },
      {
        name: "OptanonConsent",
        duration: { de: "12 Monate (365 Tage)", en: "12 months" },
        description: { de: "Speichert die Cookie-Einwilligung im Spotify-Player (OneTrust).", en: "Stores the cookie consent inside the Spotify player (OneTrust)." },
        evidence: ["observed"]
      },
      {
        name: "anonymous:*",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Oberflächen-Einstellungen des Web-Players (z. B. Spaltenbreiten, Ansicht).", en: "UI preferences of the web player (e.g. panel widths, view mode)." },
        evidence: ["observed"]
      },
      {
        name: "sentryReplaySession",
        type: "sessionStorage",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Fehler-Monitoring und Sitzungs-Replay (Sentry).", en: "Error monitoring and session replay (Sentry)." },
        evidence: ["observed"]
      },
      {
        name: "keyval-store",
        type: "indexedDB",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "IndexedDB des Web-Players.", en: "IndexedDB of the web player." },
        evidence: ["observed"]
      }
    ],
    devNote: { de: "Spotify nennt die Cookies des Embeds nicht; die Einträge stammen aus der Beobachtung eines öffentlichen Embeds.", en: "Spotify does not list the embed's cookies; the entries come from observing a public embed." },
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. A public track embed loaded.",
      observed: "Cookies and storage keys observed in the sandbox."
    },
    sources: ["https://www.spotify.com/us/legal/privacy-policy/"],
    embed: {
      hosts: ["open.spotify.com"],
      placeholder: {
        de: "Dieser Inhalt wird von Spotify bereitgestellt. Beim Laden werden Daten an Spotify übertragen.",
        en: "This content is provided by Spotify. Loading it transfers data to Spotify."
      }
    }
  };
  const __vite_glob_0_26 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$b
  }, Symbol.toStringTag, { value: "Module" }));
  const service$a = {
    id: "tally",
    vendor: "Tally BV",
    vendorUrl: "https://tally.so",
    privacyUrl: "https://tally.so/help/terms-and-privacy",
    category: "functional",
    label: { de: "Tally", en: "Tally" },
    description: {
      de: "Bindet ein Formular von Tally ein. Dabei wird Ihre IP-Adresse an Server von Tally übertragen.",
      en: "Embeds a form from Tally. Your IP address is transmitted to Tally servers."
    },
    cookies: [],
    verification: {
      date: "2026-10-11",
      loader: 'Loaded after consent in a real Chrome profile; no request to the vendor before consent. The embed iframe (tally.so/embed/<id>) and widgets/embed.js loaded with a public form. Two containers (<iframe data-tally-src>) released one after another, a late container after "allow all" and two at once each loaded the form (Tally.loadEmbeds()).',
      observed: "No cookies or storage keys observed in the sandbox or on tally.so's own form embed."
    },
    devNote: { de: "Das eingebettete Formular setzte in unseren Tests weder Cookies noch Speichereinträge.", en: "The embedded form set no cookies or storage entries in our tests." },
    cookieless: true,
    sources: ["https://tally.so/help/terms-and-privacy"],
    load(ctx) {
      return ctx.loadScript("https://tally.so/widgets/embed.js");
    },
    refresh(ctx, el) {
      const tally = ctx.win.Tally;
      if (tally?.loadEmbeds && scan(el, "iframe[data-tally-src],[data-tally-open]").length) tally.loadEmbeds();
    },
    embed: {
      hosts: ["tally.so"],
      markup: {
        elements: ["iframe"],
        example: '<iframe data-tally-src="https://tally.so/embed/abc123?dynamicHeight=1" loading="lazy" width="100%" height="276" title="Formular"></iframe>'
      },
      placeholder: {
        de: "Dieses Formular wird von Tally bereitgestellt. Beim Laden werden Daten an Tally übertragen.",
        en: "This form is provided by Tally. Loading it transmits data to Tally."
      }
    }
  };
  const __vite_glob_0_27 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$a
  }, Symbol.toStringTag, { value: "Module" }));
  const service$9 = {
    id: "tawk",
    vendor: "tawk.to Inc.",
    vendorUrl: "https://www.tawk.to",
    privacyUrl: "https://www.tawk.to/privacy-policy/",
    category: "functional",
    // chat widget
    label: { de: "tawk.to Chat", en: "tawk.to Chat" },
    description: {
      de: "Zeigt einen Live-Chat für Fragen und Support an. Dabei werden Ihre IP-Adresse und besuchte Seiten an Server von tawk.to übertragen.",
      en: "Shows a live chat for questions and support. Your IP address and visited pages are transmitted to tawk.to servers."
    },
    cookies: [
      {
        name: "twk_uuid_*",
        duration: { de: "6 Monate", en: "6 months" },
        description: { de: "Besucherkennung des Chats (Property-ID als Suffix; Domain tawk.to bzw. der Website).", en: "Visitor identifier of the chat (property ID as suffix)." },
        evidence: ["observed"]
      },
      {
        name: "TawkConnectionTime",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Zeitpunkt der letzten Verbindung des Chat-Widgets.", en: "Time of the last connection of the chat widget." },
        evidence: ["observed"]
      },
      {
        name: "twk_idm_key",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Schlüssel zur Zuordnung der Chat-Sitzung.", en: "Key that binds the chat session." },
        evidence: ["observed"]
      },
      {
        name: "twk_*",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
        description: { de: "Chat-Zustand und Token (Local Storage, Property-ID als Suffix).", en: "Chat state and token (local storage, property ID as suffix)." },
        evidence: ["observed"]
      },
      {
        name: "previousNav",
        type: "sessionStorage",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Vorherige Navigation für den Chat (Session Storage).", en: "Previous navigation for the chat (session storage)." },
        evidence: ["observed"]
      }
    ],
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. embed.tawk.to/<propertyId>/<widgetId> loaded and the chat started with a real property taken from tawk.to's own website (normal browser user agent).",
      observed: "Cookies and storage keys observed in the sandbox and on tawk.to (writer: embed.tawk.to).",
      liveSites: ["https://www.tawk.to/"]
    },
    sources: ["https://www.tawk.to/privacy-policy/"],
    load(ctx) {
      const p = ctx.cfg.propertyId;
      const w = ctx.cfg.widgetId;
      if (typeof p !== "string" || !/^[a-f0-9]{24}$/i.test(p)) {
        console.warn("[FivexConsent] tawk: invalid propertyId");
        return;
      }
      if (typeof w !== "string" || !/^[a-z0-9]{1,32}$/i.test(w)) {
        console.warn("[FivexConsent] tawk: invalid widgetId");
        return;
      }
      ctx.win.Tawk_API = ctx.win.Tawk_API || {};
      ctx.win.Tawk_LoadStart = /* @__PURE__ */ new Date();
      return ctx.loadScript(`https://embed.tawk.to/${encodeURIComponent(p)}/${encodeURIComponent(w)}`, { crossorigin: "*" });
    }
  };
  const __vite_glob_0_28 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$9
  }, Symbol.toStringTag, { value: "Module" }));
  const service$8 = {
    id: "tiktok-pixel",
    vendor: "TikTok Technology Limited",
    vendorUrl: "https://www.tiktok.com",
    privacyUrl: "https://www.tiktok.com/legal/page/eea/privacy-policy/de",
    category: "marketing",
    label: { de: "TikTok Pixel", en: "TikTok Pixel" },
    description: {
      de: "Misst Aktionen auf dieser Website für TikTok-Werbung und ermöglicht Remarketing. Dabei werden Ihre IP-Adresse und Seitenaufrufe an Server von TikTok übertragen.",
      en: "Measures actions on this website for TikTok advertising and enables remarketing. Your IP address and page views are transmitted to TikTok servers."
    },
    cookies: [
      {
        name: "_ttp",
        duration: { de: "13 Monate", en: "13 months" },
        description: { de: "TikTok-Kennung zur Zuordnung von Besuchen (First-Party-Cookie des Pixels; zusätzlich auf tiktok.com).", en: "TikTok identifier used to attribute visits (first-party cookie set by the pixel; also on tiktok.com)." },
        evidence: ["observed"]
      },
      {
        name: "_tt_enable_cookie",
        duration: { de: "13 Monate", en: "13 months" },
        description: { de: "Kennzeichen, dass der Pixel Cookies setzen darf.", en: "Flag that the pixel may set cookies." },
        evidence: ["observed"]
      },
      {
        name: "ttcsid_*",
        duration: { de: "13 Monate (ab letzter Nutzung)", en: "13 months (from last use)" },
        description: { de: "TikTok: Sitzungskennung des Pixels (Pixel-Code als Suffix).", en: "TikTok: session identifier of the pixel (pixel code as suffix)." },
        evidence: ["vendor-docs"]
      },
      {
        name: "tt_sessionId",
        type: "sessionStorage",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Sitzungskennung des Pixels (Session Storage).", en: "Session identifier of the pixel (session storage)." },
        evidence: ["observed"]
      },
      {
        name: "tt_pixel_session_index",
        type: "sessionStorage",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Zähler der Seitenaufrufe der Sitzung (Session Storage).", en: "Page view counter of the session (session storage)." },
        evidence: ["observed"]
      },
      {
        name: "tt_appInfo",
        type: "sessionStorage",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Informationen zur Pixel-Einbindung (Session Storage).", en: "Information about the pixel integration (session storage)." },
        evidence: ["observed"]
      },
      {
        name: "tt_adInfo",
        type: "sessionStorage",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Anzeigeninformationen der Sitzung (Session Storage).", en: "Ad information of the session (session storage)." },
        evidence: ["observed"]
      },
      {
        name: "ttclid",
        duration: { de: "13 Monate", en: "13 months" },
        description: { de: "TikTok-Klick-ID: wird nach einem Klick auf eine TikTok-Anzeige gespeichert (First-Party-Cookie des Pixels).", en: "TikTok click ID: stored after a click on a TikTok ad (first-party cookie set by the pixel)." },
        evidence: ["observed", "vendor-docs"],
        devNote: { de: "Beobachtet im Sandbox-Test: 24 Stunden Laufzeit. Angegeben ist die längere, in der TikTok-Dokumentation genannte Laufzeit (13 Monate), damit nichts zu kurz ausgewiesen wird.", en: "Observed in the sandbox test with a 24-hour expiry. The longer duration from TikTok's documentation (13 months) is shown so that nothing is understated." }
      }
    ],
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. analytics.tiktok.com/i18n/pixel/events.js loaded and beacons were sent with a real pixel code taken from a live website.",
      observed: "Cookies (including ttclid, set when the landing URL carries a ttclid parameter) and session storage observed in the sandbox with a real pixel code; ttcsid_* and ttclid are in TikTok's cookie documentation."
    },
    sources: ["https://ads.tiktok.com/help/article/faqs-for-partner-pixels-and-cookie-enablement"],
    load(ctx) {
      const id = String(ctx.cfg.id ?? "");
      if (!/^[A-Z0-9]{8,32}$/.test(id)) {
        console.warn("[FivexConsent] tiktok-pixel: invalid id");
        return;
      }
      const w = ctx.win;
      w.TiktokAnalyticsObject = "ttq";
      const ttq = w.ttq = w.ttq || [];
      ttq.methods = [
        "page",
        "track",
        "identify",
        "instances",
        "debug",
        "on",
        "off",
        "once",
        "ready",
        "alias",
        "group",
        "enableCookie",
        "disableCookie",
        "holdConsent",
        "revokeConsent",
        "grantConsent"
      ];
      ttq.setAndDefer = (t, e) => {
        t[e] = (...a) => t.push([e, ...a]);
      };
      for (const m of ttq.methods) ttq.setAndDefer(ttq, m);
      ttq.instance = (pid) => {
        const inst = ttq._i[pid] || [];
        for (const m of ttq.methods) ttq.setAndDefer(inst, m);
        return inst;
      };
      ttq.load = (pid, opts) => {
        const src = "https://analytics.tiktok.com/i18n/pixel/events.js";
        ttq._i = ttq._i || {};
        ttq._i[pid] = [];
        ttq._i[pid]._u = src;
        ttq._t = ttq._t || {};
        ttq._t[pid] = +/* @__PURE__ */ new Date();
        ttq._o = ttq._o || {};
        ttq._o[pid] = opts || {};
        ctx.loadScript(src + "?sdkid=" + encodeURIComponent(pid) + "&lib=ttq").catch((e) => console.warn("[FivexConsent] tiktok-pixel:", e));
      };
      ttq.load(id);
      ttq.page();
    }
  };
  const __vite_glob_0_29 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$8
  }, Symbol.toStringTag, { value: "Module" }));
  const service$7 = {
    id: "trustpilot",
    vendor: "Trustpilot A/S",
    vendorUrl: "https://www.trustpilot.com",
    privacyUrl: "https://legal.trustpilot.com/for-reviewers/privacy-policy",
    category: "functional",
    label: { de: "Trustpilot", en: "Trustpilot" },
    description: {
      de: "Zeigt Bewertungen von Trustpilot auf dieser Seite an. Dabei wird eine Verbindung zu Trustpilot-Servern aufgebaut und Ihre IP-Adresse übertragen.",
      en: "Displays Trustpilot reviews on this page. A connection to Trustpilot servers is made and your IP address is transmitted."
    },
    cookies: [],
    verification: {
      date: "2026-10-11",
      loader: 'Loaded after consent in a real Chrome profile; no request to the vendor before consent. tp.widget.bootstrap.min.js loaded and rendered a TrustBox (iframe, data and view statistics requests succeeded) with a public business unit. Two containers released one after another, a late container after "allow all" and two at once each rendered a TrustBox (Trustpilot.loadFromElement).',
      observed: "No cookies or storage keys observed in the sandbox or on live websites using TrustBoxes.",
      liveSites: ["https://www.vistaprint.com/", "https://www.hostinger.com/"]
    },
    devNote: { de: "Das Bewertungs-Widget (TrustBox) setzte in unseren Tests weder Cookies noch Speichereinträge; beim Laden werden Aufrufstatistiken (Impression/View) an Trustpilot gesendet und die IP-Adresse übertragen.", en: "The review widget (TrustBox) set no cookies or storage entries in our tests; on load it sends view statistics (impression/view) to Trustpilot and your IP address is transmitted." },
    visitorNote: {
      de: "Beim Laden werden Aufrufstatistiken an Trustpilot gesendet.",
      en: "Loading the reviews sends view statistics to Trustpilot."
    },
    cookieless: true,
    sources: ["https://legal.trustpilot.com/for-everyone/cookie-policy"],
    embed: {
      hosts: ["widget.trustpilot.com", "trustpilot.com"],
      markup: {
        example: '<div class="trustpilot-widget" data-locale="de-DE" data-template-id="5419b6a8b0d04a076446a9ad" data-businessunit-id="YOUR_BUSINESS_UNIT_ID" data-style-height="24px" data-style-width="100%"><a href="https://de.trustpilot.com/review/example.com" target="_blank" rel="noopener">Trustpilot</a></div>'
      },
      placeholder: {
        de: "Diese Bewertungen werden von Trustpilot bereitgestellt. Beim Laden werden Daten an Trustpilot übertragen.",
        en: "These reviews are provided by Trustpilot. Loading them transmits data to Trustpilot."
      }
    },
    load(ctx) {
      return ctx.loadScript("https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js");
    },
    refresh(ctx, el) {
      const tp = ctx.win.Trustpilot;
      if (!tp?.loadFromElement) return;
      for (const w of scan(el, ".trustpilot-widget")) if (!w.querySelector("iframe")) tp.loadFromElement(w, true);
    }
  };
  const __vite_glob_0_30 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$7
  }, Symbol.toStringTag, { value: "Module" }));
  const service$6 = {
    id: "turnstile",
    vendor: "Cloudflare, Inc.",
    vendorUrl: "https://www.cloudflare.com/products/turnstile/",
    privacyUrl: "https://www.cloudflare.com/privacypolicy/",
    category: "functional",
    // spam/bot protection for forms
    label: { de: "Cloudflare Turnstile", en: "Cloudflare Turnstile" },
    description: {
      de: "Schützt Formulare vor Bots und Spam. Dabei werden Browserdaten sowie Ihre IP-Adresse an Cloudflare übertragen.",
      en: "Protects forms from bots and spam. Browser data and your IP address are transmitted to Cloudflare."
    },
    cookies: [
      {
        name: "cf.turnstile.u",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
        description: { de: "Turnstile: Kennung für die Bot-Prüfung (Local Storage, challenges.cloudflare.com).", en: "Turnstile: identifier for the bot check (local storage, challenges.cloudflare.com)." },
        evidence: ["observed"]
      }
    ],
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. api.js loaded and a widget rendered with Cloudflare's official test site key.",
      observed: "Local storage key observed in the sandbox and on dash.cloudflare.com (origin challenges.cloudflare.com).",
      liveSites: ["https://dash.cloudflare.com/login"]
    },
    devNote: { de: "Mit aktivierter Pre-Clearance stellt Cloudflare zusätzlich ein cf_clearance-Cookie aus (siehe Cloudflare-Dokumentation).", en: "With pre-clearance enabled Cloudflare also issues a cf_clearance cookie (see the Cloudflare documentation)." },
    sources: ["https://developers.cloudflare.com/turnstile/get-started/pre-clearance/", "https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/"],
    load(ctx) {
      const key = ctx.cfg.siteKey;
      if (typeof key !== "string" || !/^[0-9A-Za-z_-]{10,64}$/.test(key)) {
        console.warn("[FivexConsent] turnstile: invalid siteKey");
        return;
      }
      return ctx.loadScript("https://challenges.cloudflare.com/turnstile/v0/api.js");
    }
  };
  const __vite_glob_0_31 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$6
  }, Symbol.toStringTag, { value: "Module" }));
  const service$5 = {
    id: "typeform",
    vendor: "Typeform S.L.",
    vendorUrl: "https://www.typeform.com",
    privacyUrl: "https://www.typeform.com/legal/privacy-policy/",
    category: "functional",
    label: { de: "Typeform", en: "Typeform" },
    description: {
      de: "Bindet ein Formular oder eine Umfrage von Typeform ein. Dabei wird Ihre IP-Adresse an Server von Typeform übertragen.",
      en: "Embeds a form or survey from Typeform. Your IP address is transmitted to Typeform servers."
    },
    cookies: [
      {
        name: "tf_respondent_cc",
        duration: { de: "6 Monate", en: "6 months" },
        description: { de: "Typeform: Kennung des Antwortenden (form.typeform.com / typeform.com).", en: "Typeform: respondent identifier (form.typeform.com / typeform.com)." },
        evidence: ["observed"]
      },
      {
        name: "attribution_user_id",
        duration: { de: "1 Jahr", en: "1 year" },
        description: { de: "Typeform: Kennung zur Zuordnung der Herkunft.", en: "Typeform: identifier for attribution." },
        evidence: ["observed"]
      },
      {
        name: "AWSALBTGCORS",
        duration: { de: "7 Tage", en: "7 days" },
        description: { de: "Lastverteilung der Typeform-Server (form.typeform.com).", en: "Load balancing of Typeform servers (form.typeform.com)." },
        evidence: ["observed"]
      },
      {
        name: "tf_random_id",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
        description: { de: "Typeform: zufällige Kennung (Local Storage, form.typeform.com).", en: "Typeform: random identifier (local storage, form.typeform.com)." },
        evidence: ["observed"]
      },
      {
        name: "*-visitorId",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
        description: { de: "Typeform: Besucherkennung je Formular (Local Storage).", en: "Typeform: visitor identifier per form (local storage)." },
        evidence: ["observed"]
      }
    ],
    verification: {
      date: "2026-10-11",
      loader: 'Loaded after consent in a real Chrome profile; no request to the vendor before consent. embed.typeform.com/next/embed.js loaded and rendered a public form (form.typeform.com) with a data-tf-widget element. Two containers released one after another, a late container after "allow all" and two containers at once each rendered the form (tf.load() for containers released after embed.js ran; data-tf-widget with a public form).',
      observed: "Cookies and local storage observed on form.typeform.com in the sandbox with a public form."
    },
    sources: ["https://www.typeform.com/legal/cookie-policy/"],
    load(ctx) {
      return ctx.loadScript("https://embed.typeform.com/next/embed.js");
    },
    refresh(ctx, el) {
      const tf = ctx.win.tf;
      if (tf?.load && scan(el, "[data-tf-live],[data-tf-widget],[data-tf-popover],[data-tf-slider],[data-tf-popup],[data-tf-sidetab]").length) tf.load();
    },
    embed: {
      hosts: ["form.typeform.com", "typeform.com"],
      markup: { example: '<div data-tf-live="01ABCDEF" class="typeform-embed"></div>' },
      placeholder: {
        de: "Dieses Formular wird von Typeform bereitgestellt. Beim Laden werden Daten an Typeform übertragen.",
        en: "This form is provided by Typeform. Loading it transmits data to Typeform."
      }
    }
  };
  const __vite_glob_0_32 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$5
  }, Symbol.toStringTag, { value: "Module" }));
  const service$4 = {
    id: "vimeo",
    vendor: "Vimeo.com, Inc.",
    vendorUrl: "https://vimeo.com",
    privacyUrl: "https://vimeo.com/privacy",
    category: "functional",
    label: { de: "Vimeo", en: "Vimeo" },
    description: {
      de: "Zeigt eingebettete Vimeo-Videos an. Dabei wird Ihre IP-Adresse an Server von Vimeo übertragen.",
      en: "Shows embedded Vimeo videos. Your IP address is transferred to Vimeo servers."
    },
    cookies: [
      {
        name: "vuid",
        duration: { de: "13 Monate (400 Tage)", en: "13 months" },
        description: { de: "Anonyme Besucher-Kennung für Statistiken (vimeo.com).", en: "Anonymous visitor identifier for statistics (vimeo.com)." },
        evidence: ["observed"]
      },
      {
        name: "player",
        duration: { de: "12 Monate (365 Tage)", en: "12 months" },
        description: { de: "Speichert Player-Einstellungen wie Lautstärke und Qualität (vimeo.com).", en: "Stores player preferences such as volume and quality (vimeo.com)." },
        evidence: ["observed"]
      },
      {
        name: "__cf_bm",
        duration: { de: "30 Minuten", en: "30 minutes" },
        description: { de: "Cloudflare-Bot-Schutz (HttpOnly, vimeo.com).", en: "Cloudflare bot management (HttpOnly, vimeo.com)." },
        evidence: ["observed"]
      },
      {
        name: "cf_clearance",
        duration: { de: "12 Monate (365 Tage)", en: "12 months" },
        description: { de: "Cloudflare: merkt eine bestandene Bot-Prüfung (HttpOnly, vimeo.com).", en: "Cloudflare: remembers a passed bot check (HttpOnly, vimeo.com)." },
        evidence: ["observed"]
      },
      {
        name: "__cf_ob",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Cloudflare: Origin-Bot-Prüfung (player.vimeo.com).", en: "Cloudflare: origin bot check (player.vimeo.com)." },
        evidence: ["observed"]
      },
      {
        name: "LOCAL_STORAGE_ID_VIMEO_PLAYER",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Player-Kennung (player.vimeo.com).", en: "Player identifier (player.vimeo.com)." },
        evidence: ["observed"]
      },
      {
        name: "LOCAL_STORAGE_ID_PICOX_ID",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Kennung der Vimeo-Player-Statistik (Picox).", en: "Identifier of Vimeo's player analytics (Picox)." },
        evidence: ["observed"]
      },
      {
        name: "PLAYER_PICOX_SAMPLING_SEED",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Stichproben-Wert der Player-Statistik.", en: "Sampling value of the player analytics." },
        evidence: ["observed"]
      },
      {
        name: "sync_active",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Synchronisationsstatus des Players.", en: "Sync status of the player." },
        evidence: ["observed"]
      },
      {
        name: "_cfPre_tabId",
        type: "sessionStorage",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Cloudflare: Tab-Kennung der Bot-Prüfung.", en: "Cloudflare: tab identifier of the bot check." },
        evidence: ["observed"]
      },
      {
        name: "orionV3",
        type: "indexedDB",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "IndexedDB des Players.", en: "IndexedDB of the player." },
        evidence: ["observed"]
      },
      {
        name: "picox",
        type: "indexedDB",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "IndexedDB der Player-Statistik.", en: "IndexedDB of the player analytics." },
        evidence: ["observed"]
      }
    ],
    devNote: { de: "Der Player-Parameter dnt=1 ersetzt keine Einwilligung: laut Vimeo bleiben einige notwendige Cookies auch dann aktiv.", en: "The player parameter dnt=1 does not replace consent: per Vimeo, some essential cookies stay active even then." },
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. A public sample video loaded and played.",
      observed: "Cookies and storage keys observed in the sandbox."
    },
    sources: ["https://help.vimeo.com/hc/en-us/articles/12426260232977-Player-parameters-overview", "https://vimeo.com/privacy"],
    embed: {
      hosts: ["player.vimeo.com"],
      placeholder: {
        de: "Dieses Video wird von Vimeo bereitgestellt. Beim Laden werden Daten an Vimeo übertragen.",
        en: "This video is provided by Vimeo. Loading it transfers data to Vimeo."
      }
    }
  };
  const __vite_glob_0_33 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$4
  }, Symbol.toStringTag, { value: "Module" }));
  const service$3 = {
    id: "wistia",
    vendor: "Wistia, Inc.",
    vendorUrl: "https://wistia.com",
    privacyUrl: "https://wistia.com/privacy",
    category: "functional",
    label: { de: "Wistia", en: "Wistia" },
    description: {
      de: "Zeigt eingebettete Wistia-Videos an. Dabei wird Ihre IP-Adresse an Server von Wistia übertragen; der Player nutzt lokalen Speicher statt Tracking-Cookies.",
      en: "Shows embedded Wistia videos. Your IP address is transferred to Wistia servers; the player uses local storage instead of tracking cookies."
    },
    cookies: [
      {
        name: "wistia",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Player-Einstellungen und Kennung (fast.wistia.net / Website).", en: "Player preferences and identifier (fast.wistia.net / site)." },
        evidence: ["observed"]
      },
      {
        name: "wistia-video-progress-*",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Merkt den Wiedergabefortschritt je Video.", en: "Remembers the playback progress per video." },
        evidence: ["observed"]
      }
    ],
    devNote: { de: "Laut Wistia setzt der Player keine Tracking-Cookies, sondern nutzt Local Storage; in der Beobachtung wurden nur Local-Storage-Einträge festgestellt.", en: "Per Wistia the player sets no tracking cookies and uses local storage instead; only local storage entries were observed." },
    verification: {
      date: "2026-10-11",
      loader: 'Loaded after consent in a real Chrome profile; no request to the vendor before consent. A public sample video loaded as iframe and via player.js with <wistia-player>. Two <wistia-player> containers released one after another, a late container after "allow all" and two at once each rendered the player (player.js plus fast.wistia.com/embed/<id>.js).',
      observed: "Local storage keys observed in the sandbox; Wistia's documentation states that the player uses local storage instead of cookies."
    },
    sources: ["https://support.wistia.com/en/articles/8264955-privacy-data-protection-and-security", "https://wistia.com/privacy"],
    load(ctx) {
      return ctx.loadScript("https://fast.wistia.com/player.js");
    },
    refresh(ctx, el) {
      const loads = [];
      const seen = /* @__PURE__ */ new Set();
      for (const p of scan(el, "wistia-player[media-id]")) {
        const id = p.getAttribute("media-id") ?? "";
        if (!/^[a-z0-9]{6,12}$/i.test(id) || seen.has(id)) continue;
        seen.add(id);
        const src = "https://fast.wistia.com/embed/" + id + ".js";
        if (!ctx.doc.querySelector(`script[src="${src}"]`)) loads.push(ctx.loadScript(src, { type: "module" }));
      }
      return Promise.all(loads).then(() => void 0);
    },
    embed: {
      hosts: ["fast.wistia.net", "fast.wistia.com"],
      markup: {
        elements: ["wistia-player"],
        attributes: [
          "media-id",
          "aspect",
          "seo",
          "autoplay",
          "muted",
          "silent-autoplay",
          "playsinline",
          "player-color",
          "controls-visible-on-load",
          "end-video-behavior",
          "big-play-button",
          "play-bar",
          "volume-control",
          "fullscreen-button",
          "settings-control",
          "playback-rate-control",
          "quality-control",
          "captions",
          "captions-default"
        ],
        example: '<wistia-player media-id="abc123def4" aspect="1.7777777777777777"></wistia-player>'
      },
      placeholder: {
        de: "Dieses Video wird von Wistia bereitgestellt. Beim Laden werden Daten an Wistia übertragen.",
        en: "This video is provided by Wistia. Loading it transfers data to Wistia."
      }
    }
  };
  const __vite_glob_0_34 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$3
  }, Symbol.toStringTag, { value: "Module" }));
  const service$2 = {
    id: "x-twitter",
    vendor: "X Corp. / Twitter International Unlimited Company",
    vendorUrl: "https://x.com",
    privacyUrl: "https://x.com/de/privacy",
    category: "marketing",
    label: { de: "X (Twitter)", en: "X (Twitter)" },
    description: {
      de: "Bindet Beiträge und Timelines von X in diese Seite ein. Dabei wird Ihre IP-Adresse an Server von X übertragen; X kann Cookies setzen und Daten für personalisierte Inhalte und Werbung nutzen.",
      en: "Embeds posts and timelines from X in this page. Your IP address is transmitted to X servers; X may set cookies and use data for personalised content and advertising."
    },
    cookies: [
      {
        name: "guest_id",
        duration: { de: "13 Monate (396 Tage)", en: "13 months" },
        description: { de: "Kennung für nicht angemeldete Besucher (x.com).", en: "Identifier for visitors who are not signed in (x.com)." },
        evidence: ["observed"]
      },
      {
        name: "__cf_bm",
        duration: { de: "30 Minuten", en: "30 minutes" },
        description: { de: "Cloudflare-Bot-Schutz (HttpOnly, x.com / twitter.com).", en: "Cloudflare bot management (HttpOnly, x.com / twitter.com)." },
        evidence: ["observed"]
      },
      {
        name: "gt",
        duration: { de: "2 Stunden", en: "2 hours" },
        description: { de: "Gast-Token für nicht angemeldete Besucher (x.com).", en: "Guest token for visitors who are not logged in (x.com)." },
        evidence: ["observed"]
      },
      {
        name: "__cuid",
        duration: { de: "13 Monate (400 Tage)", en: "13 months" },
        description: { de: "Kennung des Browsers (x.com).", en: "Browser identifier (x.com)." },
        evidence: ["observed"]
      }
    ],
    verification: {
      date: "2026-10-11",
      loader: 'Loaded after consent in a real Chrome profile; no request to the vendor before consent. widgets.js and a public tweet embed loaded. Two blockquote containers released one after another, a late container after "allow all" and two at once each rendered the post (twttr.widgets.load(container)).',
      observed: "Cookies observed in the sandbox."
    },
    sources: ["https://help.x.com/en/rules-and-policies/x-cookies", "https://developer.x.com/en/docs/twitter-for-websites/embedded-tweets/overview"],
    embed: {
      hosts: ["platform.twitter.com", "platform.x.com", "syndication.twitter.com"],
      markup: {
        example: '<blockquote class="twitter-tweet" lang="en" dir="ltr"><p lang="en" dir="ltr">Text of the post</p>&mdash; Name (@handle) <a href="https://twitter.com/handle/status/1234567890">Date</a></blockquote>'
      },
      placeholder: {
        de: "Dieser Beitrag wird von X bereitgestellt. Beim Laden werden Daten an X übertragen.",
        en: "This post is provided by X. Loading it transmits data to X."
      }
    },
    load(ctx) {
      return ctx.loadScript("https://platform.twitter.com/widgets.js").then(() => {
        ctx.win.twttr?.widgets?.load?.();
      });
    },
    refresh(ctx, el) {
      ctx.win.twttr?.widgets?.load?.(el);
    }
  };
  const __vite_glob_0_35 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$2
  }, Symbol.toStringTag, { value: "Module" }));
  const service$1 = {
    id: "youtube",
    vendor: "Google Ireland Limited",
    vendorUrl: "https://www.youtube.com",
    privacyUrl: "https://policies.google.com/privacy",
    category: "functional",
    label: { de: "YouTube", en: "YouTube" },
    description: {
      de: "Zeigt eingebettete YouTube-Videos an. Dabei wird Ihre IP-Adresse an Server von Google übertragen.",
      en: "Shows embedded YouTube videos. Your IP address is transferred to Google servers."
    },
    cookies: [
      {
        name: "YSC",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Stellt sicher, dass Anfragen innerhalb einer Sitzung vom Nutzer stammen (HttpOnly, youtube.com).", en: "Ensures requests within a session are made by the user (HttpOnly, youtube.com)." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "VISITOR_INFO1_LIVE",
        duration: { de: "6 Monate (180 Tage)", en: "6 months" },
        description: { de: "Schätzt die Bandbreite und erkennt Probleme (HttpOnly, youtube.com).", en: "Estimates bandwidth and detects problems (HttpOnly, youtube.com)." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "__Secure-YNID",
        duration: { de: "6 Monate (180 Tage)", en: "6 months" },
        description: { de: "Erkennt und behebt Probleme des Dienstes (Nachfolger von VISITOR_INFO1_LIVE).", en: "Detects and resolves problems with the service (successor of VISITOR_INFO1_LIVE)." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "VISITOR_PRIVACY_METADATA",
        duration: { de: "6 Monate (180 Tage)", en: "6 months" },
        description: { de: "Speichert den Datenschutz-/Einwilligungsstatus des Besuchers (youtube.com).", en: "Stores the visitor's privacy/consent state (youtube.com)." },
        evidence: ["observed"]
      },
      {
        name: "__Secure-ROLLOUT_TOKEN",
        duration: { de: "6 Monate (180 Tage)", en: "6 months" },
        description: { de: "Steuert die schrittweise Einführung neuer Funktionen (youtube.com).", en: "Used to launch new features gradually (youtube.com)." },
        evidence: ["observed", "vendor-docs"]
      },
      {
        name: "test_cookie",
        duration: { de: "15 Minuten", en: "15 minutes" },
        description: { de: "Prüft, ob der Browser Cookies zulässt (doubleclick.net).", en: "Checks whether the browser allows cookies (doubleclick.net)." },
        evidence: ["observed"]
      },
      {
        name: "ytidb::LAST_RESULT_ENTRY_KEY",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Interner Zwischenspeicher des Players.", en: "Internal cache of the player." },
        evidence: ["observed"]
      },
      {
        name: "yt-player-bandwidth",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Gemessene Bandbreite für die Qualitätswahl.", en: "Measured bandwidth for quality selection." },
        evidence: ["observed"]
      },
      {
        name: "yt-player-caption-persistence",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Merkt Untertitel-Einstellungen.", en: "Remembers caption settings." },
        evidence: ["observed"]
      },
      {
        name: "yt-icons-last-purged",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "Interne Cache-Pflege des Players.", en: "Internal cache maintenance of the player." },
        evidence: ["observed"]
      },
      {
        name: "YtIdbMeta",
        type: "indexedDB",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "IndexedDB des Players (Metadaten).", en: "IndexedDB of the player (metadata)." },
        evidence: ["observed"]
      },
      {
        name: "LogsDatabaseV2:*",
        type: "indexedDB",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "IndexedDB für Protokolldaten (nur youtube.com, nicht youtube-nocookie.com).", en: "IndexedDB for log data (youtube.com only, not youtube-nocookie.com)." },
        evidence: ["observed"]
      },
      {
        name: "ServiceWorkerLogsDatabase",
        type: "indexedDB",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
        description: { de: "IndexedDB für Protokolldaten des Players (nur youtube.com, nicht youtube-nocookie.com).", en: "IndexedDB for player log data (youtube.com only, not youtube-nocookie.com)." },
        evidence: ["observed"]
      }
    ],
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. The embed iframe loaded and played with youtube-nocookie.com and with youtube.com.",
      observed: "Cookies and storage keys observed in the sandbox and on a page with a standard embed; no cookies with the nocookie domain."
    },
    devNote: { de: "Mit der Domain youtube-nocookie.com wurden in unseren Tests keine Cookies gesetzt (nur Local Storage/IndexedDB), mit youtube.com mehrere. Nutzen Sie nach Möglichkeit die nocookie-Domain.", en: "With the youtube-nocookie.com domain no cookies were set in our tests (only local storage / IndexedDB), with youtube.com several. Use the nocookie domain where possible." },
    sources: [
      "https://support.google.com/youtube/answer/171780",
      "https://policies.google.com/technologies/cookies"
    ],
    embed: {
      hosts: ["youtube-nocookie.com", "youtube.com"],
      placeholder: {
        de: "Dieses Video wird von YouTube (Google) bereitgestellt. Beim Laden werden Daten an Google übertragen.",
        en: "This video is provided by YouTube (Google). Loading it transfers data to Google."
      }
    }
  };
  const __vite_glob_0_36 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service$1
  }, Symbol.toStringTag, { value: "Module" }));
  const service = {
    id: "zendesk-chat",
    vendor: "Zendesk, Inc.",
    vendorUrl: "https://www.zendesk.com",
    privacyUrl: "https://www.zendesk.com/company/agreements-and-terms/privacy-notice/",
    category: "functional",
    // support/chat widget
    label: { de: "Zendesk Web Widget", en: "Zendesk Web Widget" },
    description: {
      de: "Zeigt ein Support- und Chat-Widget an. Dabei werden Ihre IP-Adresse und Nutzungsdaten an Server von Zendesk übertragen.",
      en: "Shows a support and chat widget. Your IP address and usage data are transmitted to Zendesk servers."
    },
    cookies: [
      {
        name: "ZD-suid",
        type: "localStorage",
        duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
        description: { de: "Zendesk: Kennung der Besucher-Sitzung (Local Storage, zusätzlich Session Storage).", en: "Zendesk: visitor session identifier (local storage, also session storage)." },
        evidence: ["observed"]
      },
      {
        name: "ZD-suid",
        type: "sessionStorage",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Zendesk: Kennung der Besucher-Sitzung (Session Storage).", en: "Zendesk: visitor session identifier (session storage)." },
        evidence: ["observed"]
      },
      {
        name: "ZD-buid",
        type: "sessionStorage",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Zendesk: Kennung des Browsers (Session Storage).", en: "Zendesk: browser identifier (session storage)." },
        evidence: ["observed"]
      },
      {
        name: "*.clientId",
        type: "sessionStorage",
        duration: { de: "Sitzung", en: "session" },
        description: { de: "Zendesk: Client-Kennung des Messaging-Widgets (Session Storage).", en: "Zendesk: client identifier of the messaging widget (session storage)." },
        evidence: ["observed"]
      }
    ],
    verification: {
      date: "2026-10-11",
      loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. static.zdassets.com/ekr/snippet.js?key=<key> loaded and the widget booted with a real key taken from a live website.",
      observed: "Session storage and local storage keys observed in the sandbox (writer: static.zdassets.com).",
      liveSites: ["https://www.activecampaign.com/"]
    },
    sources: ["https://developer.zendesk.com/api-reference/widget/settings/"],
    load(ctx) {
      const key = ctx.cfg.key;
      if (typeof key !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
        console.warn("[FivexConsent] zendesk-chat: invalid key");
        return;
      }
      return ctx.loadScript(`https://static.zdassets.com/ekr/snippet.js?key=${encodeURIComponent(key)}`, { id: "ze-snippet" });
    }
  };
  const __vite_glob_0_37 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: service
  }, Symbol.toStringTag, { value: "Module" }));
  const modules = /* @__PURE__ */ Object.assign({ "./services/adobe-fonts.ts": __vite_glob_0_0, "./services/cal-com.ts": __vite_glob_0_1, "./services/calendly.ts": __vite_glob_0_2, "./services/clarity.ts": __vite_glob_0_3, "./services/crisp.ts": __vite_glob_0_4, "./services/fathom.ts": __vite_glob_0_5, "./services/ga4.ts": __vite_glob_0_6, "./services/google-ads.ts": __vite_glob_0_7, "./services/google-fonts.ts": __vite_glob_0_8, "./services/google-maps.ts": __vite_glob_0_9, "./services/gtm.ts": __vite_glob_0_10, "./services/hcaptcha.ts": __vite_glob_0_11, "./services/hotjar.ts": __vite_glob_0_12, "./services/hubspot.ts": __vite_glob_0_13, "./services/instagram.ts": __vite_glob_0_14, "./services/intercom.ts": __vite_glob_0_15, "./services/linkedin-insight.ts": __vite_glob_0_16, "./services/loom.ts": __vite_glob_0_17, "./services/matomo.ts": __vite_glob_0_18, "./services/meta-pixel.ts": __vite_glob_0_19, "./services/microsoft-uet.ts": __vite_glob_0_20, "./services/openstreetmap.ts": __vite_glob_0_21, "./services/pinterest-tag.ts": __vite_glob_0_22, "./services/plausible.ts": __vite_glob_0_23, "./services/recaptcha.ts": __vite_glob_0_24, "./services/soundcloud.ts": __vite_glob_0_25, "./services/spotify.ts": __vite_glob_0_26, "./services/tally.ts": __vite_glob_0_27, "./services/tawk.ts": __vite_glob_0_28, "./services/tiktok-pixel.ts": __vite_glob_0_29, "./services/trustpilot.ts": __vite_glob_0_30, "./services/turnstile.ts": __vite_glob_0_31, "./services/typeform.ts": __vite_glob_0_32, "./services/vimeo.ts": __vite_glob_0_33, "./services/wistia.ts": __vite_glob_0_34, "./services/x-twitter.ts": __vite_glob_0_35, "./services/youtube.ts": __vite_glob_0_36, "./services/zendesk-chat.ts": __vite_glob_0_37 });
  const SERVICES = Object.assign(
    /* @__PURE__ */ Object.create(null),
    Object.fromEntries(Object.values(modules).map((m) => [m.default.id, m.default]))
  );
  const ELEMENTS = /* @__PURE__ */ new Set([
    "div",
    "span",
    "p",
    "a",
    "strong",
    "em",
    "b",
    "i",
    "ul",
    "ol",
    "li",
    "br",
    "img",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "button",
    "small",
    "figure",
    "figcaption",
    "picture",
    "source",
    "blockquote"
  ]);
  const ATTRIBUTES = /* @__PURE__ */ new Set(["class", "href", "src", "srcset", "sizes", "alt", "title", "width", "height", "loading", "target", "rel", "role", "cite", "lang", "dir"]);
  const URL_ATTRIBUTES = /* @__PURE__ */ new Set(["href", "src", "srcset", "cite"]);
  const DATA_NAME = /^data-[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
  const DATA_DENIED = /^data-(bind$|bind-|hx-|htmx-|x-|v-|vue-|ng-|on|ko-|alpine-|action$|action-|controller$|controller-|turbo$|turbo-|bs-|toggle$|target$|dismiss$|trigger$|method$|remote$|confirm$|js$|js-|call$|click$)/;
  const ALLOWED_SCHEMES = /* @__PURE__ */ new Set(["http", "https", "mailto", "tel"]);
  const XHTML = "http://www.w3.org/1999/xhtml";
  const STRIP = /[\u0000-\u0020\u007F-\u00A0\u1680\u180E\u2000-\u200F\u2028-\u202F\u205F-\u206F\u3000\uFEFF]/g;
  function safeUrl(value) {
    let v = value.replace(STRIP, "");
    try {
      v = decodeURIComponent(v).replace(STRIP, "");
    } catch {
    }
    const m = /^([^:/?#]*):/.exec(v);
    if (!m) return true;
    return ALLOWED_SCHEMES.has(m[1].toLowerCase());
  }
  function safeSrcset(value) {
    return value.split(",").map((c) => c.trim().split(/\s+/)[0]).filter(Boolean).every(safeUrl);
  }
  function allowedAttribute(name, extra) {
    if (ATTRIBUTES.has(name) || extra.has(name)) return true;
    if (/^aria-[a-z0-9_.:-]+$/.test(name)) return true;
    return DATA_NAME.test(name) && !DATA_DENIED.test(name);
  }
  function hostOk(value, hosts) {
    try {
      const u = new URL(value, "https://invalid.invalid/");
      if (u.protocol !== "https:") return false;
      return hosts.some((h) => u.hostname === h || u.hostname.endsWith("." + h));
    } catch {
      return false;
    }
  }
  function clean(node, doc, into, extra) {
    const extraEls = new Set(extra.elements ?? []);
    const extraAttrs = new Set(extra.attributes ?? []);
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) {
        into.appendChild(doc.createTextNode(child.nodeValue ?? ""));
        continue;
      }
      if (child.nodeType !== 1) continue;
      const el = child;
      const tag = el.localName;
      const isExtra = extraEls.has(tag);
      if (el.namespaceURI !== XHTML || !(ELEMENTS.has(tag) || isExtra)) continue;
      const out = doc.createElement(tag);
      for (const a of Array.from(el.attributes)) {
        const name = a.name.toLowerCase();
        if (!allowedAttribute(name, isExtra ? extraAttrs : /* @__PURE__ */ new Set())) continue;
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
  function sanitizeHtml(html, doc, extra = {}) {
    const tpl = doc.createElement("template");
    tpl.innerHTML = html;
    const out = doc.createDocumentFragment();
    clean(tpl.content, doc, out, extra);
    return out;
  }
  const CATEGORIES = ["necessary", "functional", "analytics", "marketing"];
  function normalize(rec) {
    if (!rec || typeof rec !== "object") return null;
    const r = rec;
    if (r.v !== 1 || typeof r.rev !== "number" || !Number.isFinite(r.rev) || !r.cats || typeof r.cats !== "object") return null;
    const cats = {};
    for (const c of CATEGORIES) if (r.cats[c] === true) cats[c] = true;
    const svc = /* @__PURE__ */ Object.create(null);
    if (r.svc && typeof r.svc === "object") {
      for (const [k, v] of Object.entries(r.svc)) if (v === true) svc[k] = true;
    }
    const out = { v: 1, rev: r.rev, ts: typeof r.ts === "number" && Number.isFinite(r.ts) ? r.ts : 0, cats, svc };
    if (r.decided === false) out.decided = false;
    return out;
  }
  function readRecord(doc, name) {
    let best = null;
    for (const part of doc.cookie.split("; ")) {
      if (!part.startsWith(name + "=")) continue;
      let rec = null;
      try {
        rec = normalize(JSON.parse(decodeURIComponent(part.slice(name.length + 1))));
      } catch {
      }
      if (rec && (!best || rec.ts >= best.ts)) best = rec;
    }
    return best;
  }
  function domainVariants(hostname, first = true) {
    const parts = hostname.split(".");
    const out = [];
    for (let i = first ? 0 : 1; i < parts.length - 1; i++) out.push(parts.slice(i).join("."));
    return out;
  }
  function writeRecord(doc, name, rec, days, domain) {
    const secure = doc.location?.protocol === "https:" ? "; Secure" : "";
    const dom = domain ? `; Domain=${domain}` : "";
    doc.cookie = `${name}=${encodeURIComponent(JSON.stringify(rec))}; Max-Age=${Math.round(days * 86400)}; Path=/; SameSite=Lax${secure}${dom}`;
    const bare = (domain ?? "").replace(/^\./, "");
    const host = doc.location?.hostname ?? "";
    if (domain && bare !== host) doc.cookie = `${name}=; Max-Age=0; Path=/`;
    for (const d of domainVariants(host, false)) {
      if (d === bare) continue;
      doc.cookie = `${name}=; Max-Age=0; Path=/; Domain=${d}`;
      doc.cookie = `${name}=; Max-Age=0; Path=/; Domain=.${d}`;
    }
  }
  function eraseCookie(doc, name, hostname) {
    const domains = [""];
    for (const d of domainVariants(hostname)) domains.push(`; Domain=${d}`, `; Domain=.${d}`);
    for (const d of domains) doc.cookie = `${name}=; Max-Age=0; Path=/${d}`;
  }
  function cookieNames(doc) {
    return doc.cookie.split("; ").map((c) => c.split("=")[0]).filter(Boolean);
  }
  function matchName(pattern, name) {
    const re = new RegExp("^" + pattern.split("*").map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
    return re.test(name);
  }
  const MIN_DAYS = 1;
  const IDLE_MS = 50;
  const MAX_WAIT_MS = 1500;
  const TOGGLE_CATS = ["functional", "analytics", "marketing"];
  const DL_NAMES = {
    necessary: "essential-activated",
    functional: "personalization-activated",
    analytics: "analytics-activated",
    marketing: "marketing-activated"
  };
  const BLOCKED_SELECTOR = `script[type="${ATTR}"],${sel("src")},${sel("html")}`;
  function createConsent(opts = {}) {
    const win = opts.win ?? window;
    const doc = win.document;
    const registry = Object.assign(/* @__PURE__ */ Object.create(null), opts.services ?? SERVICES);
    const raw = opts.config ?? win[GLOBAL] ?? {};
    const lang = raw.lang === "en" || raw.lang === "de" ? raw.lang : (doc.documentElement.lang || "").toLowerCase().startsWith("en") ? "en" : "de";
    const revision = (() => {
      if (raw.revision === void 0) return 1;
      const n = Number(raw.revision);
      const rev = Number.isFinite(n) ? Math.trunc(n) : 1;
      if (typeof raw.revision !== "number" || !Number.isInteger(raw.revision)) console.warn(`[${GLOBAL}] revision must be an integer (got ${JSON.stringify(raw.revision)}), using ${rev}`);
      return rev;
    })();
    const days = (() => {
      if (raw.expires === void 0) return 180;
      const n = Number(raw.expires);
      if (!Number.isFinite(n) || n <= 0) {
        console.warn(`[${GLOBAL}] expires must be a number of days greater than 0 (got ${JSON.stringify(raw.expires)}), using 180`);
        return 180;
      }
      if (n < MIN_DAYS) {
        console.warn(`[${GLOBAL}] expires ${n} is below the minimum of ${MIN_DAYS} day, using ${MIN_DAYS}`);
        return MIN_DAYS;
      }
      return n;
    })();
    const cookieDomain = (() => {
      if (raw.cookieDomain === void 0 || raw.cookieDomain === "") return void 0;
      const host = (win.location?.hostname ?? "").toLowerCase();
      const bare = String(raw.cookieDomain).trim().toLowerCase().replace(/^\./, "");
      if (bare.includes(".") && (host === bare || host.endsWith("." + bare))) return bare;
      console.warn(`[${GLOBAL}] cookieDomain "${raw.cookieDomain}" does not match the current host "${host}", using a host-only cookie`);
      return void 0;
    })();
    const configured = /* @__PURE__ */ new Map();
    for (const [id, v] of Object.entries(raw.services ?? {})) {
      if (!v) continue;
      if (!registry[id]) {
        console.warn(`[${GLOBAL}] unknown service "${id}"`);
        continue;
      }
      configured.set(id, v === true ? {} : v);
    }
    const blocked = [];
    const known = /* @__PURE__ */ new WeakSet();
    const cats = (el) => list(attr(el, "categories")).map((c) => c).filter((c) => CATEGORIES.includes(c));
    function collect(root) {
      const els = qsa(root, BLOCKED_SELECTOR);
      if (root.matches?.(BLOCKED_SELECTOR)) els.unshift(root);
      const out = [];
      for (const el of els) {
        if (known.has(el)) continue;
        known.add(el);
        const kind = el.localName === "script" ? "script" : el.hasAttribute(`${ATTR}-src`) ? "iframe" : "container";
        out.push({ el, kind, service: attr(el, "service"), categories: cats(el), done: false });
      }
      return out;
    }
    const used = /* @__PURE__ */ new Set();
    const svcCategory = (id) => {
      const def = registry[id];
      const want = configured.get(id)?.category;
      return def.categories && def.categories.includes(want) ? want : def.category;
    };
    const catOf = (b) => b.service && registry[b.service] ? [svcCategory(b.service)] : b.categories;
    function register(items) {
      const added = [];
      for (const b of items) {
        if (b.service && !configured.has(b.service)) {
          if (registry[b.service]) {
            console.info(`[${GLOBAL}] "${b.service}" found on the page but missing in ${GLOBAL}.services - added automatically. Add it to the config.`);
            configured.set(b.service, {});
            added.push(b.service);
          } else {
            console.warn(`[${GLOBAL}] unknown service "${b.service}" - element stays blocked`);
          }
        }
      }
      for (const id of configured.keys()) used.add(svcCategory(id));
      for (const b of items) for (const c of catOf(b)) used.add(c);
      return added;
    }
    const byDocumentOrder = (a, b) => a.el === b.el ? 0 : a.el.compareDocumentPosition(b.el) & 4 ? -1 : 1;
    blocked.push(...collect(doc));
    blocked.sort(byDocumentOrder);
    register(blocked);
    const preConsent = (id) => !!registry[id].loadsBeforeConsent?.(configured.get(id) ?? {});
    const alwaysOn = (id) => registry[id].category === "necessary" || preConsent(id);
    const loadRecord = () => {
      const r = readRecord(doc, COOKIE);
      return r && r.rev === revision ? r : null;
    };
    let record = loadRecord();
    const sessionAllowed = /* @__PURE__ */ new Set();
    const activated = /* @__PURE__ */ new Set();
    const libs = /* @__PURE__ */ new Map();
    const activatedItems = /* @__PURE__ */ new Set();
    const listeners = [];
    const isDecided = () => !!record && record.decided !== false;
    const hasCategory = (c) => c === "necessary" || record?.cats[c] === true;
    const consented = (id) => !!registry[id] && configured.has(id) && (alwaysOn(id) || hasCategory(svcCategory(id)) || record?.svc[id] === true);
    const trackerOk = (id) => alwaysOn(id) || hasCategory(svcCategory(id));
    const has = (id) => consented(id) || !!registry[id] && configured.has(id) && sessionAllowed.has(id);
    const itemAllowed = (b) => {
      if (b.service) return has(b.service);
      const c = b.categories.length ? b.categories : TOGGLE_CATS;
      return c.every(hasCategory);
    };
    function whenInteractionsReady(run, fallback) {
      let done = false;
      const once = (f) => () => {
        if (done) return;
        done = true;
        f();
      };
      const viaWebflow = () => {
        const wf = win.Webflow;
        if (!wf || typeof wf.push !== "function") return false;
        wf.push(() => setTimeout(once(() => run(true)), 0));
        return true;
      };
      const afterDom = (f) => {
        if (doc.readyState === "complete") return f();
        let called = false;
        const go = () => {
          if (called) return;
          called = true;
          f();
        };
        doc.addEventListener("DOMContentLoaded", go, { once: true });
        if (doc.readyState === "interactive") setTimeout(go, IDLE_MS * 2);
      };
      if (viaWebflow()) {
        afterDom(() => setTimeout(once(fallback), MAX_WAIT_MS));
        return;
      }
      afterDom(() => {
        setTimeout(() => {
          if (!viaWebflow()) once(() => run(false))();
        }, IDLE_MS);
        setTimeout(once(fallback), MAX_WAIT_MS);
      });
    }
    const L = {
      de: { banner: "Cookie-Hinweis", prefs: "Cookie-Einstellungen" },
      en: { banner: "Cookie notice", prefs: "Cookie settings" }
    }[lang];
    const panels = {
      banner: new Panel("banner", qsa(doc, sel("", "banner")), doc, false, L.banner, whenInteractionsReady),
      preferences: new Panel("preferences", qsa(doc, sel("", "preferences")), doc, true, L.prefs, whenInteractionsReady),
      manager: new Panel("manager", qsa(doc, sel("", "manager")), doc, false, "", whenInteractionsReady)
    };
    function refreshUi() {
      syncCheckboxes(doc, hasCategory, used);
      const anyOpen = panels.preferences.open;
      panels.manager.set(!panels.banner.open && !anyOpen);
    }
    function restoreFocus(prev) {
      if (!prev || prev === doc.body) return;
      const insidePrefs = (el) => panels.preferences.els.some((p) => p.contains(el));
      const triggers = qsa(doc, sel("", "open-preferences")).filter((t2) => !insidePrefs(t2));
      const manager = panels.manager.els.flatMap((m) => qsa(m, FOCUSABLE));
      const page = qsa(doc.body, FOCUSABLE).filter((el) => !insidePrefs(el));
      const target = [prev, ...triggers, ...manager, ...page].find((el) => isFocusable(el) && !insidePrefs(el));
      if (target) target.focus();
      else doc.activeElement?.blur?.();
    }
    function open() {
      syncCheckboxes(doc, hasCategory, used);
      panels.banner.set(false);
      panels.preferences.set(true);
      panels.manager.set(false);
    }
    function closePrefs() {
      const prev = panels.preferences.takeFocusTarget() ?? doc.activeElement;
      panels.preferences.set(false);
      if (!isDecided()) panels.banner.set(true);
      refreshUi();
      restoreFocus(prev);
    }
    const ctx = (id) => ({
      cfg: configured.get(id) ?? {},
      lang,
      win,
      doc,
      loadScript: (src, attrs = {}) => new Promise((resolve, reject) => {
        const s = doc.createElement("script");
        s.src = src;
        s.async = true;
        for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`failed to load ${src}`));
        doc.head.appendChild(s);
      }),
      inlineScript: (code) => {
        const s = doc.createElement("script");
        s.text = code;
        doc.head.appendChild(s);
      },
      has,
      hasCategory,
      configOf: (sid) => configured.has(sid) ? configured.get(sid) : null
    });
    function hostAllowed(service2, def, url) {
      if (url.protocol !== "https:" && url.protocol !== "http:") return false;
      if (!service2) return true;
      if (!def?.embed) return false;
      return def.embed.hosts.some((h) => {
        const [host, ...path] = h.split("/");
        return (url.hostname === host || url.hostname.endsWith("." + host)) && (!path.length || url.pathname.startsWith("/" + path.join("/")));
      });
    }
    const scriptQueue = [];
    let scriptWaiting = false;
    function pumpScripts() {
      while (!scriptWaiting && scriptQueue.length) {
        const wait = scriptQueue.shift()();
        if (wait) {
          scriptWaiting = true;
          const next = () => {
            scriptWaiting = false;
            pumpScripts();
          };
          wait.then(next, next);
        }
      }
    }
    function runScript(old) {
      const s = doc.createElement("script");
      for (const a of Array.from(old.attributes)) {
        if (a.name === "type" || a.name.startsWith(ATTR)) continue;
        s.setAttribute(a.name, a.value);
      }
      s.text = old.text;
      if (old.src) {
        s.async = false;
        const done = new Promise((resolve) => {
          s.addEventListener("load", () => resolve());
          s.addEventListener("error", () => resolve());
        });
        old.replaceWith(s);
        return done;
      }
      old.replaceWith(s);
    }
    function phItems(ph) {
      return placeholders.get(ph) ?? [];
    }
    function activate(b) {
      if (b.done) return;
      const def = b.service ? registry[b.service] : void 0;
      if (b.service && !def) {
        console.warn(`[${GLOBAL}] unknown service "${b.service}" - element stays blocked`);
        return;
      }
      b.done = true;
      if (!b.service) activatedItems.add(b);
      if (b.kind === "script") {
        const old = b.el;
        scriptQueue.push(() => runScript(old));
        pumpScripts();
      } else if (b.kind === "iframe") {
        const src = attr(b.el, "src") ?? "";
        let url = null;
        try {
          url = new URL(src, doc.baseURI);
        } catch {
        }
        if (!url || !hostAllowed(b.service, def, url)) {
          console.warn(`[${GLOBAL}] blocked iframe src "${src}" (not an allowed host for "${b.service ?? "uncategorized"}")`);
          return;
        }
        b.el.setAttribute("src", url.href);
        b.el.removeAttribute("hidden");
        b.el.style.removeProperty("display");
        if (b.display) b.el.style.display = b.display;
      } else {
        const markup = def?.embed?.markup;
        b.el.replaceChildren(sanitizeHtml(attr(b.el, "html") ?? "", doc, { elements: markup?.elements, attributes: markup?.attributes, hosts: def?.embed?.hosts }));
        if (b.service) startContainer(b);
      }
      const ph = b.placeholder;
      if (ph && phItems(ph).every((x) => x.done)) {
        if (ph.hasAttribute("data-fivex-generated")) ph.remove();
        else ph.style.display = "none";
      }
    }
    function runLib(id, kind) {
      const def = registry[id];
      const fn = kind === "load" ? def.load : def.loadEmbed;
      if (!fn) return null;
      const key = kind === "load" ? id : id + ":embed";
      const known2 = libs.get(key);
      if (known2) return known2;
      const lib = { persistent: consented(id), done: false, failed: false, waiting: [] };
      libs.set(key, lib);
      if (kind === "load") activated.add(id);
      const finish2 = (ok) => {
        lib.done = true;
        lib.failed = !ok;
        const todo = lib.waiting.splice(0);
        if (ok) for (const b of todo) refreshContainer(b);
      };
      let r;
      try {
        r = fn(ctx(id));
      } catch (e) {
        console.warn(`[${GLOBAL}] ${id}:`, e);
        finish2(false);
        return lib;
      }
      Promise.resolve(r).then(
        () => finish2(true),
        (e) => {
          console.warn(`[${GLOBAL}] ${id}:`, e);
          finish2(false);
        }
      );
      return lib;
    }
    function startLoader(id) {
      if (registry[id].tracker && !trackerOk(id)) return;
      if (!registry[id].load) {
        if (!libs.has(id)) libs.set(id, { persistent: consented(id), done: true, failed: false, waiting: [] });
        activated.add(id);
        return;
      }
      runLib(id, "load");
    }
    function embedLib(id) {
      const def = registry[id];
      if (def.loadEmbed) return runLib(id, "embed");
      if (!def.tracker && def.load) return runLib(id, "load");
      return null;
    }
    function startContainer(b) {
      const lib = embedLib(b.service);
      if (!lib) {
        refreshContainer(b);
      } else if (lib.done) {
        if (!lib.failed) refreshContainer(b);
      } else lib.waiting.push(b);
    }
    function refreshContainer(b) {
      const id = b.service;
      const refresh = registry[id].refresh;
      if (!refresh || !b.el.isConnected) return;
      try {
        const r = refresh(ctx(id), b.el);
        if (r && typeof r.catch === "function") r.catch((e) => console.warn(`[${GLOBAL}] ${id} refresh:`, e));
      } catch (e) {
        console.warn(`[${GLOBAL}] ${id} refresh:`, e);
      }
    }
    function fireListeners() {
      for (const l of listeners) {
        if (l.fired) continue;
        const ok = CATEGORIES.includes(l.target) ? hasCategory(l.target) : has(l.target);
        if (ok) {
          l.fired = true;
          try {
            l.cb();
          } catch (e) {
            console.warn(`[${GLOBAL}]`, e);
          }
        }
      }
    }
    function apply(emit = true) {
      const ops = [];
      const items = /* @__PURE__ */ new Set();
      for (const id of configured.keys()) {
        if (!has(id)) continue;
        if (consented(id)) {
          for (const b of blocked) if (b.service === id && !b.done) items.add(b);
        }
        if (activated.has(id)) ops.push([id, "update"]);
        else if (consented(id) && (!registry[id].tracker || trackerOk(id))) ops.push([id, "start"]);
      }
      for (const b of blocked) if (!b.service && !b.done && itemAllowed(b)) items.add(b);
      for (const b of blocked) if (items.has(b)) activate(b);
      for (const [id, op] of ops) {
        if (op === "start") startLoader(id);
        else {
          try {
            registry[id].update?.(ctx(id));
          } catch (e) {
            console.warn(`[${GLOBAL}] ${id} update:`, e);
          }
        }
      }
      if (emit && record && isDecided()) {
        const dl = getDataLayer(win);
        for (const c of CATEGORIES) if (hasCategory(c) && c !== "necessary") dl.push({ event: DL_NAMES[c] });
        dl.push({ event: DL_EVENT, consent: { ...record.cats, necessary: true } });
      }
      fireListeners();
    }
    function revokedSomething() {
      for (const [key, lib] of libs) {
        const id = key.split(":")[0];
        if (lib.persistent && !consented(id) && !sessionAllowed.has(id)) return true;
      }
      for (const b of activatedItems) if (!b.viaSession && !itemAllowed(b)) return true;
      return false;
    }
    function clearCookiesOf(ids) {
      const names = cookieNames(doc);
      for (const id of ids) {
        for (const c of registry[id].cookies) {
          if (c.type && c.type !== "cookie") continue;
          for (const n of names) if (matchName(c.name, n)) eraseCookie(doc, n, win.location.hostname);
        }
      }
    }
    function eraseDenied() {
      clearCookiesOf([...configured.keys()].filter((id) => !alwaysOn(id) && !has(id)));
    }
    const hasChannel = typeof win.BroadcastChannel === "function";
    let channel = null;
    function openChannel() {
      if (!hasChannel || channel) return;
      const c = new win.BroadcastChannel(COOKIE);
      c.onmessage = () => syncFromCookie();
      channel = c;
    }
    function closeChannel() {
      channel?.close();
      channel = null;
    }
    function broadcast() {
      try {
        channel?.postMessage({ ts: record?.ts ?? 0 });
      } catch {
      }
    }
    function syncFromCookie() {
      const next = loadRecord();
      if (JSON.stringify(next) === JSON.stringify(record)) return;
      record = next;
      eraseDenied();
      if (revokedSomething()) {
        (opts.reload ?? (() => win.location.reload()))();
        return;
      }
      apply();
      panels.banner.set(!isDecided());
      refreshUi();
    }
    const onPageHide = () => closeChannel();
    const onPageShow = (e) => {
      openChannel();
      if (e.persisted) syncFromCookie();
    };
    const onVisible = () => {
      if (doc.visibilityState === "visible") syncFromCookie();
    };
    openChannel();
    function store(next, svc) {
      const catsOut = { necessary: true };
      for (const c of TOGGLE_CATS) catsOut[c] = next[c] === true;
      record = { v: 1, rev: revision, ts: Date.now(), cats: catsOut, svc: {}, decided: true };
      writeRecord(doc, COOKIE, record, days, cookieDomain);
      broadcast();
      eraseDenied();
      if (revokedSomething()) {
        (opts.reload ?? (() => win.location.reload()))();
        return;
      }
      apply();
    }
    const allowAll = () => finish({ functional: true, analytics: true, marketing: true });
    const denyAll = () => finish({});
    function finish(c, svc) {
      const prev = panels.preferences.takeFocusTarget() ?? doc.activeElement;
      store(c);
      panels.preferences.set(false);
      panels.banner.set(false);
      refreshUi();
      restoreFocus(prev);
    }
    function allowServices(ids) {
      const base = record ?? { v: 1, rev: revision, ts: Date.now(), cats: { necessary: true }, svc: {}, decided: false };
      const svc = { ...base.svc };
      for (const id of ids) svc[id] = true;
      record = { ...base, ts: Date.now(), svc };
      writeRecord(doc, COOKIE, record, days, cookieDomain);
      broadcast();
      apply();
      refreshUi();
    }
    const T = {
      de: { load: "Inhalt laden", always: "Immer erlauben", privacy: "Datenschutzerklärung", generic: "Dieser Inhalt wird erst nach Ihrer Einwilligung geladen.", unavailable: "Dieser Inhalt ist nicht verfügbar." },
      en: { load: "Load content", always: "Always allow", privacy: "Privacy policy", generic: "This content loads only after your consent.", unavailable: "This content is not available." }
    };
    const t = (k) => raw.texts?.[lang]?.[k] ?? T[lang][k];
    const placeholders = /* @__PURE__ */ new Map();
    function setupPlaceholders(items) {
      for (const b of items) {
        if (b.kind === "script") continue;
        const def = b.service ? registry[b.service] : void 0;
        let ph = null;
        const selector = attr(b.el, "placeholder");
        if (selector) {
          try {
            ph = doc.querySelector(selector);
          } catch {
          }
        } else {
          ph = b.el.parentElement?.querySelector(`${sel("placeholder")}:not([${ATTR}-src]):not([${ATTR}-html])`) ?? null;
        }
        if (!ph && !def?.embed && b.kind === "container") continue;
        if (!ph) {
          ph = doc.createElement("div");
          ph.className = CLS;
          ph.setAttribute("role", "group");
          ph.setAttribute("data-fivex-generated", "");
          ph.setAttribute("aria-label", def ? def.label[lang] : "");
          const text = doc.createElement("p");
          text.className = `${CLS}__text`;
          const unknown = !!b.service && !def;
          text.textContent = unknown ? T[lang].unavailable : def?.embed?.placeholder[lang] ?? T[lang].generic;
          ph.appendChild(text);
          const actions = doc.createElement("div");
          actions.className = `${CLS}__actions`;
          const mk = (kind, label) => {
            const btn = doc.createElement("button");
            btn.type = "button";
            btn.className = `${CLS}__btn ${CLS}__btn--${kind}`;
            btn.setAttribute(ATTR, kind === "load" ? "load-embed" : "allow-embed");
            btn.textContent = label;
            return btn;
          };
          if (!unknown) {
            actions.appendChild(mk("load", t("load")));
            if (def) actions.appendChild(mk("always", t("always")));
            ph.appendChild(actions);
          }
          const link = doc.createElement("a");
          link.className = `${CLS}__link`;
          link.href = raw.privacyUrl || def?.privacyUrl || "#";
          link.textContent = t("privacy");
          if (!raw.privacyUrl) {
            link.target = "_blank";
            link.rel = "noopener noreferrer";
          }
          ph.appendChild(link);
          b.el.parentElement?.insertBefore(ph, b.el);
        } else if (def) {
          for (const f of qsa(ph, sel("field"))) {
            const n = attr(f, "field");
            if (n === "vendor") f.textContent = def.vendor;
            else if (n === "text") f.textContent = def.embed?.placeholder[lang] ?? "";
            else if (n === "privacy-link") f.setAttribute("href", raw.privacyUrl || def.privacyUrl);
          }
        }
        b.placeholder = ph;
        const list2 = placeholders.get(ph) ?? [];
        list2.push(b);
        placeholders.set(ph, list2);
        if (b.kind === "iframe") {
          b.display = b.el.style.display;
          b.el.style.setProperty("display", "none", "important");
        }
      }
    }
    function placeholderOf(from) {
      for (let n = from; n; n = n.parentElement) if (placeholders.has(n)) return n;
      return null;
    }
    function onClick(e) {
      const target = e.target?.closest(sel("")) ?? null;
      if (!target) return;
      const r = role(target);
      switch (r) {
        case "allow":
          e.preventDefault();
          allowAll();
          break;
        case "deny":
          e.preventDefault();
          denyAll();
          break;
        case "submit": {
          e.preventDefault();
          submitFrom(target);
          break;
        }
        case "open-preferences":
          e.preventDefault();
          open();
          break;
        case "close":
          e.preventDefault();
          if (target.closest(sel("", "preferences"))) closePrefs();
          else {
            panels.banner.set(false);
            refreshUi();
          }
          break;
        case "load-embed":
        case "allow-embed": {
          e.preventDefault();
          const ph = placeholderOf(target);
          const governed = ph ? phItems(ph).filter((b) => !b.done && (!b.service || registry[b.service])) : [];
          if (!governed.length) break;
          if (r === "allow-embed") {
            const ids = [...new Set(governed.map((b) => b.service).filter((x) => !!x))];
            if (ids.length) allowServices(ids);
            for (const b of governed) {
              if (b.service) continue;
              b.viaSession = true;
              activate(b);
            }
          } else {
            for (const b of governed) {
              if (b.service) sessionAllowed.add(b.service);
              else b.viaSession = true;
              activate(b);
            }
            fireListeners();
          }
          break;
        }
      }
    }
    function submitFrom(from) {
      const root = from.closest("form") ?? from.closest(sel("", "preferences")) ?? from.closest(sel("", "banner")) ?? doc;
      finish(readCheckboxes(root));
    }
    function onSubmit(e) {
      const form = e.target;
      if (!form.closest?.(`${sel("", "preferences")},${sel("", "banner")}`)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      submitFrom(form);
    }
    function onKey(e) {
      if (e.key === "Escape" && panels.preferences.open) {
        closePrefs();
        return;
      }
      panels.preferences.trapTab(e);
    }
    function initService(id) {
      try {
        registry[id].init?.(ctx(id));
      } catch (e) {
        console.warn(`[${GLOBAL}] ${id} init:`, e);
      }
    }
    eraseDenied();
    for (const id of configured.keys()) initService(id);
    setupPlaceholders(blocked);
    renderServices(doc, lang, [...configured.keys()].map((id) => ({ ...registry[id], category: svcCategory(id) })));
    for (const a of qsa(doc, sel("link"))) {
      const k = attr(a, "link");
      const url = k === "privacy" ? raw.privacyUrl : k === "imprint" ? raw.imprintUrl : void 0;
      if (url) a.setAttribute("href", url);
    }
    doc.addEventListener("click", onClick);
    doc.addEventListener("submit", onSubmit, true);
    doc.addEventListener("keydown", onKey);
    win.addEventListener("pagehide", onPageHide);
    win.addEventListener("pageshow", onPageShow);
    if (!hasChannel) doc.addEventListener("visibilitychange", onVisible);
    apply();
    syncCheckboxes(doc, hasCategory, used);
    panels.banner.set(!isDecided());
    refreshUi();
    function prune() {
      const gone = (b) => !b.el.isConnected && !(b.kind === "script" && b.done && !b.service);
      for (let i = blocked.length - 1; i >= 0; i--) {
        const b = blocked[i];
        if (b.el.isConnected) continue;
        blocked.splice(i, 1);
        if (!b.done) known.delete(b.el);
      }
      for (const b of activatedItems) if (gone(b)) activatedItems.delete(b);
      for (const [ph, items] of placeholders) {
        const left = items.filter((b) => b.el.isConnected);
        if (left.length) {
          placeholders.set(ph, left);
          continue;
        }
        placeholders.delete(ph);
        if (ph.hasAttribute("data-fivex-generated")) ph.remove();
      }
    }
    let observer = null;
    if (raw.observe !== false && typeof win.MutationObserver === "function") {
      const obs = new win.MutationObserver((mutations) => {
        prune();
        const found = [];
        for (const m of mutations) for (const n of Array.from(m.addedNodes)) if (n.nodeType === 1) found.push(...collect(n));
        if (!found.length) return;
        blocked.push(...found);
        blocked.sort(byDocumentOrder);
        for (const id of register(found)) initService(id);
        setupPlaceholders(found);
        apply(false);
        refreshUi();
      });
      observer = obs;
      obs.observe(doc.documentElement, { childList: true, subtree: true });
    }
    const api = {
      open,
      close: () => {
        if (panels.preferences.open) closePrefs();
        else {
          panels.banner.set(false);
          refreshUi();
        }
      },
      allow: allowAll,
      deny: denyAll,
      /** Opt in to a single service (e.g. after your own click). */
      accept: (id) => {
        if (registry[id] && configured.has(id)) allowServices([id]);
      },
      has,
      hasCategory,
      hasConsent: isDecided,
      getConsent: () => record ? { ...record, cats: { ...record.cats }, svc: { ...record.svc } } : null,
      /** Run `cb` as soon as a service id (e.g. "vimeo") or category (e.g. "analytics") is consented; immediately if already so. */
      onConsent: (target, cb) => {
        listeners.push({ target, cb, fired: false });
        fireListeners();
      },
      destroy: () => {
        doc.removeEventListener("click", onClick);
        doc.removeEventListener("submit", onSubmit, true);
        doc.removeEventListener("keydown", onKey);
        doc.removeEventListener("visibilitychange", onVisible);
        win.removeEventListener("pagehide", onPageHide);
        win.removeEventListener("pageshow", onPageShow);
        observer?.disconnect();
        closeChannel();
      },
      /** Sizes of the internal bookkeeping (for tests). */
      _debug: () => ({ blocked: blocked.length, placeholders: placeholders.size, activatedItems: activatedItems.size }),
      /** Ids of the services in use (configured, plus those found on the page). */
      get services() {
        return [...configured.keys()];
      },
      /** Categories that have at least one service or element on the page. */
      get categories() {
        return [...used];
      }
    };
    return api;
  }
  function start() {
    const w = window;
    if (w.__fivexConsentStarted) return;
    w.__fivexConsentStarted = true;
    const config = w[GLOBAL] ?? {};
    const api = createConsent({ config });
    const descriptors = Object.getOwnPropertyDescriptors(api);
    delete descriptors._debug;
    const pub = Object.defineProperties({ config }, descriptors);
    w[GLOBAL] = pub;
    const ready = config.ready;
    const fns = typeof ready === "function" ? [ready] : Array.isArray(ready) ? ready : [];
    if (ready !== void 0 && !fns.length && !Array.isArray(ready)) console.warn(`[${GLOBAL}] ready must be a function or an array of functions`);
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
})();
