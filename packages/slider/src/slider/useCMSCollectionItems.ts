import { useMemo } from "react";
import { useAssignedSlotContent } from "./useAssignedSlotContent";

const CMS_COLLECTION_SLOT_NAME = "cmsCollectionComponentSlot";

/** Extracts the individual CMS items out of a Webflow Collection List placed in a Slot. */
export function useCMSCollectionItems() {
  const { containerRef, assigned } = useAssignedSlotContent(CMS_COLLECTION_SLOT_NAME);

  const items = useMemo(() => {
    const root = assigned?.[0];
    if (!root) return [];
    const nodes = Array.from(root.querySelectorAll(".w-dyn-item[role='listitem']"));
    return nodes.filter((node) => node.children.length > 0);
  }, [assigned]);

  return { containerRef, items };
}

export { CMS_COLLECTION_SLOT_NAME };
