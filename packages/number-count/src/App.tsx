import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import NumberCount from "./count/NumberCount";

// Local dev sandbox only — not part of the shipped library. NumberCount is
// built entirely around Slot extraction (there's no slot-free "core" to
// mount directly, unlike the slider), and a real Slot only exists inside an
// actual shadow root with a light-DOM element assigned to it — so this
// builds that same real Shadow DOM structure by hand (same technique as
// NumberCount.test.tsx) purely to get a visible, scrollable page for manual
// verification alongside the automated jsdom tests.
//
// No cleanup here: a shadow root can never be reattached once created, so
// this intentionally runs its setup exactly once and never tears down —
// StrictMode's dev-mode double-invoke would otherwise try to attachShadow
// a second time on the same host and throw. These hosts live for the
// sandbox page's whole lifetime anyway.
function ShadowStat(props: { text: string; duration?: number; startValue?: number; replay?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || host.shadowRoot) return;

    const shadow = host.attachShadow({ mode: "open" });
    const mountPoint = document.createElement("div");
    shadow.appendChild(mountPoint);

    const lightChild = document.createElement("span");
    lightChild.textContent = props.text;
    lightChild.setAttribute("slot", "numberSlot");
    host.appendChild(lightChild);

    createRoot(mountPoint).render(
      <NumberCount
        numberSlot={<slot name="numberSlot" />}
        duration={props.duration ?? 1800}
        startValue={props.startValue ?? 0}
        decimalSeparator="."
        replay={props.replay ?? false}
      />,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className="stat" />;
}

function App() {
  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <p>Scroll down — each stat counts up once it enters the viewport.</p>
      <div style={{ height: "120vh" }} />
      <div style={{ display: "flex", gap: 48 }}>
        <ShadowStat text="500+" />
        <ShadowStat text="$1,234.56" />
        <ShadowStat text="99.9%" duration={2500} />
        <ShadowStat text="10,000" replay />
      </div>
      <div style={{ height: "120vh" }} />
    </div>
  );
}

export default App;
