import { useAssignedSlotContent } from "./useAssignedSlotContent";

const DOT_TEMPLATE_SLOT_NAME = "dotTemplateSlot";

/** Extracts the single Designer-authored dot element so it can be cloned once per slide. */
export function useDotTemplate() {
  const { containerRef, assigned } = useAssignedSlotContent(DOT_TEMPLATE_SLOT_NAME);
  return { containerRef, template: assigned?.[0] };
}

export { DOT_TEMPLATE_SLOT_NAME };
