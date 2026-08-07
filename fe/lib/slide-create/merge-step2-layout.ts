import type { SlideElement } from "@/components/slide-editor/types";

const STEP2_LAYOUT_PREFIX = "layout:";

/**
 * Step 2 may be rerun, but it must only replace the layout it generated.
 * Skin/decorations from step 1 and user-created elements keep their IDs and
 * therefore remain intact.
 */
export function mergeStep2LayoutElements(
  current: SlideElement[],
  generatedLayout: SlideElement[],
): SlideElement[] {
  return [
    ...current.filter((element) => !element.id.startsWith(STEP2_LAYOUT_PREFIX)),
    ...generatedLayout.map((element) => ({ ...element })),
  ];
}
