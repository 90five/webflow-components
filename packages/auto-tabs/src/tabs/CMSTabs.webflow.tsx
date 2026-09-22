import CMSTabs from "./CMSTabs";
import { props } from "@webflow/data-types";
import { declareComponent } from "@webflow/react";

const CMSTabsComponent = declareComponent(CMSTabs, {
  name: "Auto Tabs — CMS Collection",
  description:
    "Auto-advancing showcase tabs for a Webflow CMS Collection List, with an optional per-tab progress indicator — style it entirely with your own classes.",
  options: {
    ssr: false,
  },
  props: {
    cmsCollectionComponentSlot: props.Slot({
      name: "CMS Collection List",
      group: "Content",
      tooltip:
        "Place a Webflow Collection List here. Each item needs one element with a Custom Attribute data-tab-trigger and one with data-tab-panel. An optional element inside the trigger with data-tab-progress becomes the per-tab progress fill.",
    }),
    showCMSCollectionComponent: props.Boolean({
      name: "Show CMS Collection (editing)",
      group: "Content",
      tooltip: "Show the source Collection List on canvas so you can edit its bindings.",
      defaultValue: false,
    }),
    autoplay: props.Boolean({
      name: "Autoplay",
      group: "Behavior",
      tooltip: "Automatically advance through tabs. Pauses on hover, focus and when the tab is hidden.",
      defaultValue: true,
    }),
    autoplaySpeed: props.Number({
      name: "Autoplay Speed (ms)",
      group: "Behavior",
      tooltip: "How long each tab stays active before advancing, in milliseconds.",
      defaultValue: 5000,
    }),
    defaultActiveIndex: props.Number({
      name: "Default Active Index",
      group: "Behavior",
      tooltip: "Which tab starts active (0-based).",
      defaultValue: 0,
    }),
  },
});

export default CMSTabsComponent;
