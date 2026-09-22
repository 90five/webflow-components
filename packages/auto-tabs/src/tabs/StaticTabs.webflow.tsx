import StaticTabs from "./StaticTabs";
import { props } from "@webflow/data-types";
import { declareComponent } from "@webflow/react";

const StaticTabsComponent = declareComponent(StaticTabs, {
  name: "Auto Tabs — Static Content",
  description:
    "Auto-advancing showcase tabs for plain Webflow elements (no CMS needed), with an optional per-tab progress indicator — style it entirely with your own classes.",
  options: {
    ssr: false,
  },
  props: {
    itemsSlot: props.Slot({
      name: "Items",
      group: "Content",
      tooltip:
        "Place one element per tab here. Each one needs a child with a Custom Attribute data-tab-trigger and one with data-tab-panel. An optional element inside the trigger with data-tab-progress becomes the per-tab progress fill.",
    }),
    showItemsComponent: props.Boolean({
      name: "Show Items (editing)",
      group: "Content",
      tooltip: "Show the source elements on canvas so you can edit them directly.",
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

export default StaticTabsComponent;
