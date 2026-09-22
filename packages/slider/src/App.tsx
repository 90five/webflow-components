import Slider from "./slider/Slider";

// Local dev sandbox only — not part of the shipped library. Exercises the
// shared engine/controls directly with plain slides, since the Slot-based
// extraction CMSSlider/StaticSlider rely on needs Webflow's own runtime to
// reproduce faithfully (see useAssignedSlotContent.test.ts for that part,
// verified against real Shadow DOM slot distribution instead).
const slides = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"].map((label) => (
  <div key={label} className="mock-slide">
    Slide {label}
  </div>
));

function App() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 48, padding: 24 }}>
      <section>
        <h2>Loop + autoplay, 3/2/1 per breakpoint</h2>
        <Slider
          slides={slides}
          loop
          autoplay
          autoplaySpeed={2000}
          slidesPerViewDesktop={3}
          slidesPerViewTablet={2}
          slidesPerViewMobile={1}
          gapDesktop={24}
          gapTablet={16}
          gapMobile={16}
          prevButtonSlot={<span className="mock-arrow">Prev</span>}
          nextButtonSlot={<span className="mock-arrow">Next</span>}
          dotTemplateSlot={<span className="mock-dot" />}
        />
      </section>

      <section>
        <h2>No loop, 1 per view, no autoplay</h2>
        <Slider
          slides={slides}
          loop={false}
          autoplay={false}
          autoplaySpeed={4000}
          slidesPerViewDesktop={1}
          slidesPerViewTablet={1}
          slidesPerViewMobile={1}
          gapDesktop={16}
          gapTablet={16}
          gapMobile={16}
          prevButtonSlot={<span className="mock-arrow">Prev</span>}
          nextButtonSlot={<span className="mock-arrow">Next</span>}
        />
      </section>

      <section>
        <h2>No controls at all (drag/swipe only)</h2>
        <Slider
          slides={slides}
          loop
          autoplay={false}
          autoplaySpeed={4000}
          slidesPerViewDesktop={2}
          slidesPerViewTablet={2}
          slidesPerViewMobile={1}
          gapDesktop={16}
          gapTablet={16}
          gapMobile={16}
        />
      </section>
    </div>
  );
}

export default App;
