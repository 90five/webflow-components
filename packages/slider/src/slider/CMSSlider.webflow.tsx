import CMSSlider from "./CMSSlider";
import { props } from "@webflow/data-types";
import { declareComponent } from "@webflow/react";

const CMSSliderComponent = declareComponent(CMSSlider, {
  name: "Slider — CMS Collection",
  description: "A fully customizable carousel for a Webflow CMS Collection List — style it entirely with your own classes.",
  options: {
    ssr: false,
  },
  props: {
    cmsCollectionComponentSlot: props.Slot({
      name: "CMS Collection List",
      group: "Content",
      tooltip: "Place a Webflow Collection List here — each item becomes one slide.",
    }),
    showCMSCollectionComponent: props.Boolean({
      name: "Show CMS Collection (editing)",
      group: "Content",
      tooltip: "Show the source Collection List on canvas so you can edit its bindings.",
      defaultValue: false,
    }),
    loop: props.Boolean({
      name: "Loop",
      group: "Behavior",
      tooltip: "Loop back to the start after the last slide.",
      defaultValue: true,
    }),
    autoplay: props.Boolean({
      name: "Autoplay",
      group: "Behavior",
      tooltip: "Automatically advance slides. Pauses on hover, focus and when the tab is hidden.",
      defaultValue: false,
    }),
    autoplaySpeed: props.Number({
      name: "Autoplay Speed (ms)",
      group: "Behavior",
      tooltip: "Delay between automatic slides, in milliseconds.",
      defaultValue: 4000,
    }),
    slidesPerViewDesktop: props.Number({
      name: "Slides Per View — Desktop",
      group: "Layout",
      tooltip: "Visible slides at desktop width (992px and up).",
      defaultValue: 3,
    }),
    slidesPerViewTablet: props.Number({
      name: "Slides Per View — Tablet",
      group: "Layout",
      tooltip: "Visible slides between 768px and 991px.",
      defaultValue: 2,
    }),
    slidesPerViewMobile: props.Number({
      name: "Slides Per View — Mobile",
      group: "Layout",
      tooltip: "Visible slides below 768px.",
      defaultValue: 1,
    }),
    gapDesktop: props.Number({
      name: "Gap — Desktop (px)",
      group: "Layout",
      tooltip: "Space between slides at desktop width.",
      defaultValue: 24,
    }),
    gapTablet: props.Number({
      name: "Gap — Tablet (px)",
      group: "Layout",
      tooltip: "Space between slides on tablet.",
      defaultValue: 16,
    }),
    gapMobile: props.Number({
      name: "Gap — Mobile (px)",
      group: "Layout",
      tooltip: "Space between slides on mobile.",
      defaultValue: 16,
    }),
    prevButtonSlot: props.Slot({
      name: "Previous Button",
      group: "Controls",
      tooltip: "Optional. Place your own element here (not another Button/Link Block) — the slider wraps it in a real, accessible button.",
    }),
    nextButtonSlot: props.Slot({
      name: "Next Button",
      group: "Controls",
      tooltip: "Optional. Place your own element here (not another Button/Link Block) — the slider wraps it in a real, accessible button.",
    }),
    dotTemplateSlot: props.Slot({
      name: "Dot Template",
      group: "Controls",
      tooltip: "Optional. One dot element — the slider clones it once per slide and wraps each clone in a real, accessible button.",
    }),
  },
});

export default CMSSliderComponent;
