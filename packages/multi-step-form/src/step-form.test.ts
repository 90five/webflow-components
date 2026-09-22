// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { initStepForm } from "./step-form";

function buildForm(): HTMLFormElement {
  document.body.innerHTML = `
    <form data-step-form>
      <div data-step>
        <input name="firstName" required data-step-error-message="Please type your name" />
        <span data-step-error-for="firstName"></span>
        <span data-step-field="firstName"></span>
      </div>
      <div data-step>
        <h2>Bio</h2>
        <textarea name="bio" data-step-minwords="3"></textarea>
        <span data-step-error-for="bio"></span>
      </div>
      <div data-step>
        <input name="email" type="email" required data-step-business-email="mailinator.com" />
        <span data-step-error-for="email"></span>
      </div>
      <a href="#" data-step-back>Back</a>
      <a href="#" data-step-next>Next</a>
      <button type="submit" data-step-submit>Submit</button>
      <div data-step-dot></div>
      <div data-step-progress-bar></div>
    </form>
  `;
  const form = document.querySelector("form")!;
  initStepForm(form);
  return form;
}

function step(form: HTMLFormElement, i: number): HTMLElement {
  return form.querySelectorAll<HTMLElement>("[data-step]")[i];
}

describe("initStepForm", () => {
  beforeEach(() => buildForm());

  it("shows only the first step initially", () => {
    const form = document.querySelector("form")!;
    expect(step(form, 0).style.display).toBe("");
    expect(step(form, 1).style.display).toBe("none");
    expect(step(form, 2).style.display).toBe("none");
  });

  it("hides the back button on the first step, shows next, hides submit", () => {
    const form = document.querySelector("form")!;
    expect(form.querySelector<HTMLElement>("[data-step-back]")!.style.display).toBe("none");
    expect(form.querySelector<HTMLElement>("[data-step-next]")!.style.display).toBe("");
    expect(form.querySelector<HTMLElement>("[data-step-submit]")!.style.display).toBe("none");
  });

  it("blocks advancing when a required field is empty, and shows the custom error", () => {
    const form = document.querySelector("form")!;
    form.querySelector<HTMLElement>("[data-step-next]")!.click();
    expect(step(form, 0).style.display).toBe("");
    expect(form.querySelector("[data-step-error-for='firstName']")!.textContent).toBe("Please type your name");
    expect(form.querySelector("[name='firstName']")!.getAttribute("aria-invalid")).toBe("true");
  });

  it("advances once the field is valid, and clears the error", () => {
    const form = document.querySelector("form")!;
    const input = form.querySelector<HTMLInputElement>("[name='firstName']")!;
    input.value = "Niklas";
    form.querySelector<HTMLElement>("[data-step-next]")!.click();
    expect(step(form, 0).style.display).toBe("none");
    expect(step(form, 1).style.display).toBe("");
    expect(form.querySelector<HTMLElement>("[data-step-error-for='firstName']")!.style.display).toBe("none");
  });

  it("interpolates a field's live value into a data-step-field span", () => {
    const form = document.querySelector("form")!;
    const input = form.querySelector<HTMLInputElement>("[name='firstName']")!;
    input.value = "Niklas";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(form.querySelector("[data-step-field='firstName']")!.textContent).toBe("Niklas");
  });

  it("enforces a minimum word count on a textarea", () => {
    const form = document.querySelector("form")!;
    form.querySelector<HTMLInputElement>("[name='firstName']")!.value = "Niklas";
    form.querySelector<HTMLElement>("[data-step-next]")!.click();

    const bio = form.querySelector<HTMLTextAreaElement>("[name='bio']")!;
    bio.value = "too short";
    form.querySelector<HTMLElement>("[data-step-next]")!.click();
    expect(step(form, 1).style.display).toBe("");
    expect(form.querySelector("[data-step-error-for='bio']")!.textContent).toMatch(/at least 3 words/);

    bio.value = "this has five words";
    form.querySelector<HTMLElement>("[data-step-next]")!.click();
    expect(step(form, 2).style.display).toBe("");
  });

  it("skips the minwords check on an empty, optional field", () => {
    const form = document.querySelector("form")!;
    form.querySelector<HTMLInputElement>("[name='firstName']")!.value = "Niklas";
    form.querySelector<HTMLElement>("[data-step-next]")!.click();
    // bio is left empty and has no `required` attribute
    form.querySelector<HTMLElement>("[data-step-next]")!.click();
    expect(step(form, 2).style.display).toBe("");
  });

  it("shows the back button and hides next on the last step, revealing submit", () => {
    const form = document.querySelector("form")!;
    form.querySelector<HTMLInputElement>("[name='firstName']")!.value = "Niklas";
    form.querySelector<HTMLElement>("[data-step-next]")!.click();
    form.querySelector<HTMLElement>("[data-step-next]")!.click();

    expect(form.querySelector<HTMLElement>("[data-step-back]")!.style.display).toBe("");
    expect(form.querySelector<HTMLElement>("[data-step-next]")!.style.display).toBe("none");
    expect(form.querySelector<HTMLElement>("[data-step-submit]")!.style.display).toBe("");
  });

  it("goes back a step without re-validating", () => {
    const form = document.querySelector("form")!;
    form.querySelector<HTMLInputElement>("[name='firstName']")!.value = "Niklas";
    form.querySelector<HTMLElement>("[data-step-next]")!.click();
    form.querySelector<HTMLElement>("[data-step-back]")!.click();
    expect(step(form, 0).style.display).toBe("");
  });

  it("treats a mid-form submit (e.g. Enter key) as advancing, not submitting", () => {
    const form = document.querySelector("form")!;
    form.querySelector<HTMLInputElement>("[name='firstName']")!.value = "Niklas";
    const event = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(step(form, 1).style.display).toBe("");
  });

  it("blocks the real submit on the last step when invalid", () => {
    const form = document.querySelector("form")!;
    form.querySelector<HTMLInputElement>("[name='firstName']")!.value = "Niklas";
    form.querySelector<HTMLElement>("[data-step-next]")!.click();
    form.querySelector<HTMLElement>("[data-step-next]")!.click();

    const event = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("lets the real submit through on the last step when valid", () => {
    const form = document.querySelector("form")!;
    form.querySelector<HTMLInputElement>("[name='firstName']")!.value = "Niklas";
    form.querySelector<HTMLElement>("[data-step-next]")!.click();
    form.querySelector<HTMLElement>("[data-step-next]")!.click();
    form.querySelector<HTMLInputElement>("[name='email']")!.value = "niklas@90five.com";

    const event = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("blocks a free-email-provider address when data-step-business-email is set", () => {
    const form = document.querySelector("form")!;
    form.querySelector<HTMLInputElement>("[name='firstName']")!.value = "Niklas";
    form.querySelector<HTMLElement>("[data-step-next]")!.click();
    form.querySelector<HTMLElement>("[data-step-next]")!.click();
    form.querySelector<HTMLInputElement>("[name='email']")!.value = "niklas@gmail.com";

    const event = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(form.querySelector("[data-step-error-for='email']")!.textContent).toMatch(/business email/);
  });

  it("blocks a domain added via the attribute's own value, not just the built-in list", () => {
    const form = document.querySelector("form")!;
    form.querySelector<HTMLInputElement>("[name='firstName']")!.value = "Niklas";
    form.querySelector<HTMLElement>("[data-step-next]")!.click();
    form.querySelector<HTMLElement>("[data-step-next]")!.click();
    form.querySelector<HTMLInputElement>("[name='email']")!.value = "niklas@mailinator.com";

    const event = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("clones the dot template once per step and marks the current one", () => {
    const form = document.querySelector("form")!;
    const dots = form.querySelectorAll<HTMLElement>("[data-step-dot]");
    expect(dots.length).toBe(3);
    expect(dots[0].getAttribute("aria-current")).toBe("true");
    expect(dots[1].hasAttribute("aria-current")).toBe(false);
  });

  it("lets a dot click jump to an already-visited step, tracks aria-current", () => {
    const form = document.querySelector("form")!;
    form.querySelector<HTMLInputElement>("[name='firstName']")!.value = "Niklas";
    form.querySelector<HTMLElement>("[data-step-next]")!.click(); // now on step 1

    const dots = form.querySelectorAll<HTMLElement>("[data-step-dot]");
    dots[0].click(); // jump back to step 0
    expect(step(form, 0).style.display).toBe("");
    expect(dots[0].getAttribute("aria-current")).toBe("true");
  });

  it("marks passed steps as completed, but not the current or future ones", () => {
    const form = document.querySelector("form")!;
    form.querySelector<HTMLInputElement>("[name='firstName']")!.value = "Niklas";
    form.querySelector<HTMLElement>("[data-step-next]")!.click(); // now on step 1

    const dots = form.querySelectorAll<HTMLElement>("[data-step-dot]");
    expect(dots[0].hasAttribute("data-step-dot-completed")).toBe(true);
    expect(dots[1].hasAttribute("data-step-dot-completed")).toBe(false);
    expect(dots[2].hasAttribute("data-step-dot-completed")).toBe(false);
  });

  it("updates a progress bar's width to reflect the current step", () => {
    const form = document.querySelector("form")!;
    const bar = form.querySelector<HTMLElement>("[data-step-progress-bar]")!;
    expect(bar.style.width).toBe(`${(1 / 3) * 100}%`);

    form.querySelector<HTMLInputElement>("[name='firstName']")!.value = "Niklas";
    form.querySelector<HTMLElement>("[data-step-next]")!.click();
    expect(bar.style.width).toBe(`${(2 / 3) * 100}%`);
  });

  it("moves focus into the new step on navigation (its heading, if present)", () => {
    const form = document.querySelector("form")!;
    form.querySelector<HTMLInputElement>("[name='firstName']")!.value = "Niklas";
    form.querySelector<HTMLElement>("[data-step-next]")!.click();
    expect(document.activeElement).toBe(step(form, 1).querySelector("h2"));
  });

  it("does not steal focus on initial load", () => {
    const form = document.querySelector("form")!;
    expect(document.activeElement).not.toBe(step(form, 0).querySelector("input"));
  });

  it("applies a form-level {n} message template to minwords errors", () => {
    document.body.innerHTML = `
      <form data-step-form data-step-minwords-message="Bitte schreibe mindestens {n} Woerter.">
        <div data-step><input name="a" /></div>
        <div data-step><textarea name="bio" data-step-minwords="5"></textarea><span data-step-error-for="bio"></span></div>
        <a href="#" data-step-next>Next</a>
      </form>
    `;
    const form = document.querySelector("form")!;
    initStepForm(form);
    form.querySelector<HTMLElement>("[data-step-next]")!.click();
    form.querySelector<HTMLTextAreaElement>("[name='bio']")!.value = "too short";
    form.querySelector<HTMLElement>("[data-step-next]")!.click();
    expect(form.querySelector("[data-step-error-for='bio']")!.textContent).toBe("Bitte schreibe mindestens 5 Woerter.");
  });

  it("does not allow a dot click to skip ahead of the current step", () => {
    const form = document.querySelector("form")!;
    const dots = form.querySelectorAll<HTMLElement>("[data-step-dot]");
    dots[2].click(); // still on step 0, try to skip to step 3
    expect(step(form, 0).style.display).toBe("");
  });
});
