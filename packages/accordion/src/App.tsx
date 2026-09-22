import { useMemo } from "react";
import Accordion from "./accordion/Accordion";

// Local dev sandbox only — not part of the shipped library. Mounts the
// shared Accordion directly with plain DOM items, since the Slot-based
// extraction CMSAccordion/StaticAccordion rely on needs Webflow's own
// runtime to reproduce faithfully (see useAssignedSlotContent.test.ts,
// enhanceItemDom.test.ts for that part, verified separately).
function buildItem(question: string, answer: string): Element {
  const el = document.createElement("div");
  el.className = "mock-item";
  el.innerHTML = `
    <div class="mock-trigger" data-accordion-trigger>
      <span>${question}</span>
      <span class="mock-icon" aria-hidden="true">+</span>
    </div>
    <div class="mock-panel" data-accordion-panel>
      <p>${answer}</p>
    </div>
  `;
  return el;
}

const FAQ = [
  ["What is this?", "A fully customizable accordion/tabs Code Component for Webflow."],
  ["Does it support CMS content?", "Yes — CMSAccordion wraps a Collection List the same way the slider does."],
  ["Can it behave like tabs?", "Yes, toggle Single Open — only one item stays open, others close automatically."],
  ["What about keyboard navigation?", "Arrow keys move between triggers, Home/End jump to the first/last one."],
];

function App() {
  const items = useMemo(() => FAQ.map(([q, a]) => buildItem(q, a)), []);
  const tabItems = useMemo(() => FAQ.map(([q, a]) => buildItem(q, a)), []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 48, padding: 24, maxWidth: 480 }}>
      <section>
        <h2>Accordion (multi-open, allowAllClosed)</h2>
        <Accordion items={items} singleOpen={false} allowAllClosed={true} defaultOpenIndex={0} />
      </section>

      <section>
        <h2>Tabs-like (singleOpen, must keep one open)</h2>
        <Accordion items={tabItems} singleOpen={true} allowAllClosed={false} defaultOpenIndex={0} />
      </section>
    </div>
  );
}

export default App;
