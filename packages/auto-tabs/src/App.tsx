import { useMemo } from "react";
import Tabs from "./tabs/Tabs";

// Local dev sandbox only — not part of the shipped library. Mounts the
// shared Tabs directly with plain DOM items, since the Slot-based extraction
// CMSTabs/StaticTabs rely on needs Webflow's own runtime to reproduce
// faithfully (see useAssignedSlotContent.test.ts, enhanceTabItemDom.test.ts
// for that part, verified separately).
function buildItem(title: string, body: string): Element {
  const el = document.createElement("div");
  el.className = "mock-item";
  el.innerHTML = `
    <div class="mock-trigger" data-tab-trigger>
      <span class="mock-progress" data-tab-progress></span>
      <span class="mock-title">${title}</span>
    </div>
    <div class="mock-panel" data-tab-panel>
      <p>${body}</p>
    </div>
  `;
  return el;
}

const FEATURES = [
  ["Automate", "Runs on a timer and advances through your feature list on its own."],
  ["Customize", "Every pixel is yours — no colors, spacing or icon opinions shipped."],
  ["Ship faster", "Drop it into any client project, CMS-driven or static."],
];

function App() {
  const items = useMemo(() => FEATURES.map(([t, b]) => buildItem(t, b)), []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 48, padding: 24, maxWidth: 480 }}>
      <section>
        <h2>Auto Tabs (3s, hover/focus to pause)</h2>
        <Tabs items={items} autoplay={true} autoplaySpeed={3000} defaultActiveIndex={0} />
      </section>
    </div>
  );
}

export default App;
