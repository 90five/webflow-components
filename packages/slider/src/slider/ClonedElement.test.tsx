// @vitest-environment jsdom
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { describe, expect, it } from "vitest";
import ClonedElement from "./ClonedElement";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("ClonedElement", () => {
  it("appends exactly one clone, even under StrictMode's deliberate double-invoke", () => {
    const source = document.createElement("div");
    source.textContent = "hello";

    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    act(() => {
      root.render(
        <StrictMode>
          <ClonedElement source={source} />
        </StrictMode>,
      );
    });

    expect(host.textContent).toBe("hello");
    expect(host.querySelectorAll("div").length).toBe(2); // ClonedElement's own wrapper + the one clone inside it

    act(() => root.unmount());
    host.remove();
  });
});
