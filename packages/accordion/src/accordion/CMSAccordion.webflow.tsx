import CMSAccordion from "./CMSAccordion";
import { props } from "@webflow/data-types";
import { declareComponent } from "@webflow/react";

const CMSAccordionComponent = declareComponent(CMSAccordion, {
  name: "Accordion — CMS Collection",
  description:
    "A fully customizable accordion/tabs for a Webflow CMS Collection List — style it entirely with your own classes.",
  options: {
    ssr: false,
  },
  props: {
    cmsCollectionComponentSlot: props.Slot({
      name: "CMS Collection List",
      group: "Content",
      tooltip:
        "Place a Webflow Collection List here. Each item needs one element with a Custom Attribute data-accordion-trigger and one with data-accordion-panel.",
    }),
    showCMSCollectionComponent: props.Boolean({
      name: "Show CMS Collection (editing)",
      group: "Content",
      tooltip: "Show the source Collection List on canvas so you can edit its bindings.",
      defaultValue: false,
    }),
    singleOpen: props.Boolean({
      name: "Single Open (tabs-like)",
      group: "Behavior",
      tooltip: "Only one item open at a time. Opening one closes the others.",
      defaultValue: true,
    }),
    allowAllClosed: props.Boolean({
      name: "Allow All Closed",
      group: "Behavior",
      tooltip:
        "Whether the last open item can be closed by clicking it again, leaving nothing open. Turn off for true tabs behavior (always exactly one open).",
      defaultValue: true,
    }),
    defaultOpenIndex: props.Number({
      name: "Default Open Index",
      group: "Behavior",
      tooltip: "Which item starts open (0-based). Use -1 to start with everything closed.",
      defaultValue: 0,
    }),
  },
});

export default CMSAccordionComponent;
