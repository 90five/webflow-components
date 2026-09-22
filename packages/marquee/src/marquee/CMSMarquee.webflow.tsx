import CMSMarquee from "./CMSMarquee";
import { props } from "@webflow/data-types";
import { declareComponent } from "@webflow/react";

const CMSMarqueeComponent = declareComponent(CMSMarquee, {
  name: "Marquee — CMS Collection",
  description: "A seamless, infinitely-looping marquee for a Webflow CMS Collection List — style it entirely with your own classes.",
  options: {
    ssr: false,
  },
  props: {
    cmsCollectionComponentSlot: props.Slot({
      name: "CMS Collection List",
      group: "Content",
      tooltip: "Place a Webflow Collection List here — each item becomes one piece of the marquee.",
    }),
    showCMSCollectionComponent: props.Boolean({
      name: "Show CMS Collection (editing)",
      group: "Content",
      tooltip: "Show the source Collection List on canvas so you can edit its bindings.",
      defaultValue: false,
    }),
    speed: props.Number({
      name: "Speed (px/second)",
      group: "Behavior",
      tooltip: "How fast the marquee scrolls, in pixels per second. Visual speed stays constant regardless of how many items you have.",
      defaultValue: 60,
    }),
    direction: props.Text({
      name: "Direction",
      group: "Behavior",
      tooltip: "\"left\" or \"right\".",
      defaultValue: "left",
    }),
    pauseOnHover: props.Boolean({
      name: "Pause On Hover",
      group: "Behavior",
      tooltip: "Pause the scroll while the pointer is over it.",
      defaultValue: true,
    }),
    gap: props.Number({
      name: "Gap (px)",
      group: "Layout",
      tooltip: "Space between items, and between each loop of the set.",
      defaultValue: 24,
    }),
    fadeEdges: props.Boolean({
      name: "Fade Edges",
      group: "Layout",
      tooltip: "Fade content out at the left/right edges instead of a hard clip. Not achievable with plain Webflow classes, hence the toggle here.",
      defaultValue: false,
    }),
  },
});

export default CMSMarqueeComponent;
