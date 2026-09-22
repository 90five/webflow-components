import { useMemo } from "react";
import Marquee from "./marquee/Marquee";

// Local dev sandbox only — not part of the shipped library. Mounts the
// shared Marquee directly with plain DOM items, since the Slot-based
// extraction CMSMarquee/StaticMarquee rely on needs Webflow's own runtime to
// reproduce faithfully (verified separately against real Shadow DOM).
function buildItem(label: string): Element {
  const el = document.createElement("div");
  el.className = "logo";
  el.textContent = label;
  return el;
}

const LOGOS = ["Acme", "Globex", "Initech", "Umbrella", "Soylent", "Hooli"];

function App() {
  const items = useMemo(() => LOGOS.map(buildItem), []);
  const fewItems = useMemo(() => ["Acme", "Globex"].map(buildItem), []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 48, padding: 24 }}>
      <section>
        <h2>Left, pause on hover, fade edges</h2>
        <Marquee items={items} speed={80} direction="left" pauseOnHover fadeEdges gap={32} />
      </section>

      <section>
        <h2>Right, no pause, no fade</h2>
        <Marquee items={items} speed={50} direction="right" pauseOnHover={false} fadeEdges={false} gap={32} />
      </section>

      <section>
        <h2>Very few items (narrower than viewport — tests copy-count math)</h2>
        <Marquee items={fewItems} speed={60} direction="left" pauseOnHover gap={32} />
      </section>
    </div>
  );
}

export default App;
