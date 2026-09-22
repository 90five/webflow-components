import NumberCount from "./NumberCount";
import { props } from "@webflow/data-types";
import { declareComponent } from "@webflow/react";

const NumberCountComponent = declareComponent(NumberCount, {
  name: "Number Count",
  description: "Animates a number counting up when it scrolls into view — works with static text or a CMS-bound field.",
  options: {
    ssr: false,
  },
  props: {
    numberSlot: props.Slot({
      name: "Number",
      group: "Content",
      tooltip:
        "Place the text element with your number in it here — a Heading, Text Block, whatever. Type it exactly as it should read at the end, e.g. \"500+\", \"$1,234.56\", \"99.9%\". Works with a CMS-bound field too.",
    }),
    duration: props.Number({
      name: "Duration (ms)",
      group: "Behavior",
      tooltip: "How long the count-up animation takes, in milliseconds.",
      defaultValue: 2000,
    }),
    startValue: props.Number({
      name: "Start Value",
      group: "Behavior",
      tooltip: "The number it counts up from.",
      defaultValue: 0,
    }),
    decimalSeparator: props.Text({
      name: "Decimal Separator",
      group: "Behavior",
      tooltip: "Which character means the decimal point in your number: \".\" (default) or \",\". The other is treated as thousands grouping.",
      defaultValue: ".",
    }),
    replay: props.Boolean({
      name: "Replay Every Time",
      group: "Behavior",
      tooltip: "Re-run the animation every time it scrolls back into view, instead of only once.",
      defaultValue: false,
    }),
  },
});

export default NumberCountComponent;
