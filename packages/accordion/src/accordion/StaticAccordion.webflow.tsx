import StaticAccordion from "./StaticAccordion";
import { props } from "@webflow/data-types";
import { declareComponent } from "@webflow/react";

const StaticAccordionComponent = declareComponent(StaticAccordion, {
  name: "Accordion — Static Content",
  description:
    "A fully customizable accordion/tabs for plain Webflow elements (no CMS needed) — style it entirely with your own classes.",
  options: {
    ssr: false,
  },
  props: {
    itemsSlot: props.Slot({
      name: "Items",
      group: "Content",
      tooltip:
        "Place one element per item here. Each one needs a child with a Custom Attribute data-accordion-trigger and one with data-accordion-panel.",
    }),
    showItemsComponent: props.Boolean({
      name: "Show Items (editing)",
      group: "Content",
      tooltip: "Show the source elements on canvas so you can edit them directly.",
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

export default StaticAccordionComponent;
