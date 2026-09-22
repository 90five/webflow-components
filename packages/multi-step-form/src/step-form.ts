import { clampStepIndex, formatProgressLabel, isFreeEmailDomain, meetsMinWords } from "./logic";

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

interface StepFormInstance {
  form: HTMLFormElement;
  steps: HTMLElement[];
  currentIndex: number;
  dots: HTMLElement[];
}

const ENTER_ANIMATION: Keyframe[] = [
  { opacity: 0, transform: "translateY(8px)" },
  { opacity: 1, transform: "translateY(0)" },
];
const ENTER_DURATION_MS = 220;
const ENTER_EASING = "cubic-bezier(0.23, 1, 0.32, 1)";

const VISUALLY_HIDDEN_CSS =
  "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;";

let idCounter = 0;

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Escapes a value for safe use inside a `[attr="value"]` selector. Not a
// full CSS.escape() (that's not universally available in every embedding
// context) — just enough for the characters that would break out of the
// quotes, which is all this is ever used for.
function escapeAttributeValue(value: string): string {
  return value.replace(/["\\]/g, "\\$&");
}

function getFields(step: HTMLElement): FieldElement[] {
  return Array.from(step.querySelectorAll<FieldElement>("input, textarea, select"));
}

function getFieldError(field: FieldElement, form: HTMLFormElement): string | null {
  if (!field.checkValidity()) {
    return field.getAttribute("data-step-error-message") || field.validationMessage || "This field is invalid.";
  }

  const minWordsAttr = field.getAttribute("data-step-minwords");
  if (minWordsAttr && field.value.trim() !== "") {
    const min = Number(minWordsAttr);
    if (!meetsMinWords(field.value, min)) {
      const template = form.getAttribute("data-step-minwords-message") || "Please write at least {n} words.";
      return field.getAttribute("data-step-error-message") || template.replace("{n}", String(min));
    }
  }

  if (field.hasAttribute("data-step-business-email") && field.value.trim() !== "") {
    const extraDomains = (field.getAttribute("data-step-business-email") || "").split(",").filter(Boolean);
    if (isFreeEmailDomain(field.value, extraDomains)) {
      return (
        field.getAttribute("data-step-error-message") ||
        form.getAttribute("data-step-business-email-message") ||
        "Please use your business email address."
      );
    }
  }

  return null;
}

function findErrorElement(form: HTMLFormElement, field: FieldElement): HTMLElement | null {
  const name = field.getAttribute("name");
  if (!name) return null;
  return form.querySelector<HTMLElement>(`[data-step-error-for="${escapeAttributeValue(name)}"]`);
}

function ensureId(el: HTMLElement): string {
  if (!el.id) el.id = `step-form-error-${++idCounter}`;
  return el.id;
}

function showFieldError(form: HTMLFormElement, field: FieldElement, message: string) {
  field.setAttribute("aria-invalid", "true");
  const errorEl = findErrorElement(form, field);
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.style.display = "";
  field.setAttribute("aria-describedby", ensureId(errorEl));
}

function clearFieldError(form: HTMLFormElement, field: FieldElement) {
  field.removeAttribute("aria-invalid");
  const errorEl = findErrorElement(form, field);
  if (errorEl) errorEl.style.display = "none";
}

function hideAllErrors(form: HTMLFormElement) {
  form.querySelectorAll<HTMLElement>("[data-step-error-for]").forEach((el) => {
    el.style.display = "none";
  });
}

function validateStep(instance: StepFormInstance, index: number): boolean {
  const fields = getFields(instance.steps[index]);
  let firstInvalid: FieldElement | null = null;

  for (const field of fields) {
    const error = getFieldError(field, instance.form);
    if (error) {
      showFieldError(instance.form, field, error);
      firstInvalid ??= field;
    } else {
      clearFieldError(instance.form, field);
    }
  }

  firstInvalid?.focus();
  return firstInvalid === null;
}

function getFieldDisplayValue(form: HTMLFormElement, name: string): string | null {
  const field = form.elements.namedItem(name);
  if (!field) return null;

  if (field instanceof RadioNodeList) {
    const checked = Array.from(field).find((f): f is HTMLInputElement => f instanceof HTMLInputElement && f.checked);
    return checked?.value ?? "";
  }
  if (field instanceof HTMLInputElement) {
    return field.type === "checkbox" ? (field.checked ? field.value : "") : field.value;
  }
  if (field instanceof HTMLSelectElement) {
    return field.options[field.selectedIndex]?.text ?? "";
  }
  if (field instanceof HTMLTextAreaElement) {
    return field.value;
  }
  return null;
}

function updateFieldInterpolation(form: HTMLFormElement) {
  form.querySelectorAll<HTMLElement>("[data-step-field]").forEach((el) => {
    const name = el.getAttribute("data-step-field");
    if (!name) return;
    const value = getFieldDisplayValue(form, name);
    if (value !== null) el.textContent = value;
  });
}

function updateNavButtons(instance: StepFormInstance) {
  const isFirst = instance.currentIndex === 0;
  const isLast = instance.currentIndex === instance.steps.length - 1;
  instance.form.querySelectorAll<HTMLElement>("[data-step-back]").forEach((el) => {
    el.style.display = isFirst ? "none" : "";
  });
  instance.form.querySelectorAll<HTMLElement>("[data-step-next]").forEach((el) => {
    el.style.display = isLast ? "none" : "";
  });
  instance.form.querySelectorAll<HTMLElement>("[data-step-submit]").forEach((el) => {
    el.style.display = isLast ? "" : "none";
  });
}

function updateDots(instance: StepFormInstance) {
  instance.dots.forEach((dot, i) => {
    if (i === instance.currentIndex) dot.setAttribute("aria-current", "true");
    else dot.removeAttribute("aria-current");
    dot.toggleAttribute("data-step-dot-completed", i < instance.currentIndex);
  });
}

function updateProgressBar(instance: StepFormInstance) {
  const percent = ((instance.currentIndex + 1) / instance.steps.length) * 100;
  instance.form.querySelectorAll<HTMLElement>("[data-step-progress-bar]").forEach((el) => {
    el.style.width = `${percent}%`;
  });
}

function focusStep(step: HTMLElement) {
  const heading = step.querySelector<HTMLElement>("h1, h2, h3, h4, h5, h6");
  const target = heading ?? step.querySelector<HTMLElement>("input, textarea, select, button, a[href]");
  if (!target) return;
  if (target === heading && !target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus();
}

function announceProgress(instance: StepFormInstance) {
  let liveRegion = instance.form.querySelector<HTMLElement>("[data-step-live-region]");
  if (!liveRegion) {
    liveRegion = document.createElement("div");
    liveRegion.setAttribute("data-step-live-region", "");
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("aria-atomic", "true");
    liveRegion.style.cssText = VISUALLY_HIDDEN_CSS;
    instance.form.appendChild(liveRegion);
  }
  liveRegion.textContent = formatProgressLabel(instance.currentIndex, instance.steps.length);
}

function showStep(instance: StepFormInstance, index: number, options: { animate: boolean }) {
  instance.steps.forEach((step, i) => {
    step.style.display = i === index ? "" : "none";
  });
  instance.currentIndex = index;

  updateNavButtons(instance);
  updateDots(instance);
  updateProgressBar(instance);
  updateFieldInterpolation(instance.form);
  announceProgress(instance);

  const target = instance.steps[index];
  if (options.animate) {
    if (!prefersReducedMotion() && typeof target.animate === "function") {
      target.animate(ENTER_ANIMATION, { duration: ENTER_DURATION_MS, easing: ENTER_EASING });
    }
    focusStep(target);
  }

  instance.form.dispatchEvent(
    new CustomEvent("step.change", { detail: { index: instance.currentIndex, total: instance.steps.length } }),
  );
}

function goNext(instance: StepFormInstance) {
  if (!validateStep(instance, instance.currentIndex)) return;
  const next = clampStepIndex(instance.currentIndex + 1, instance.steps.length);
  if (next !== instance.currentIndex) showStep(instance, next, { animate: true });
}

function goBack(instance: StepFormInstance) {
  const prev = clampStepIndex(instance.currentIndex - 1, instance.steps.length);
  if (prev !== instance.currentIndex) showStep(instance, prev, { animate: true });
}

function setupDots(instance: StepFormInstance) {
  const template = instance.form.querySelector<HTMLElement>("[data-step-dot]");
  if (!template) return;
  const parent = template.parentElement;
  if (!parent) return;

  template.remove();
  instance.steps.forEach((_, i) => {
    const dot = template.cloneNode(true) as HTMLElement;
    dot.addEventListener("click", () => {
      if (i <= instance.currentIndex) showStep(instance, i, { animate: true });
    });
    parent.appendChild(dot);
    instance.dots.push(dot);
  });
  updateDots(instance);
}

export function initStepForm(form: HTMLFormElement): void {
  const steps = Array.from(form.querySelectorAll<HTMLElement>("[data-step]"));
  if (steps.length === 0) return;

  const instance: StepFormInstance = { form, steps, currentIndex: 0, dots: [] };

  hideAllErrors(form);
  setupDots(instance);
  showStep(instance, 0, { animate: false });

  form.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-step-next]")) {
      event.preventDefault();
      goNext(instance);
    } else if (target.closest("[data-step-back]")) {
      event.preventDefault();
      goBack(instance);
    }
  });

  form.addEventListener("input", () => updateFieldInterpolation(form));

  form.addEventListener("submit", (event) => {
    if (instance.currentIndex < instance.steps.length - 1) {
      event.preventDefault();
      goNext(instance);
      return;
    }
    if (!validateStep(instance, instance.currentIndex)) {
      event.preventDefault();
    }
  });
}

function autoInit() {
  document.querySelectorAll<HTMLFormElement>("[data-step-form]").forEach((form) => initStepForm(form));
}

declare global {
  interface Window {
    StepForm?: { init: (form: HTMLFormElement) => void };
  }
}

window.StepForm = { init: initStepForm };

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", autoInit);
} else {
  autoInit();
}
