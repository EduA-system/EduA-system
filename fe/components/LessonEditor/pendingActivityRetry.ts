import type { Editor } from "@tiptap/react";

/**
 * Kênh truyền handler "Thử lại" từ hook streaming ({@code useLessonPlanStream}) tới NodeView
 * của block hoạt động lỗi, KHÔNG mutate `editor` (tránh vi phạm rule react-hooks/immutability
 * và không phải nhồi callback qua options lúc tạo editor).
 *
 * <p>WeakMap theo instance editor → tự dọn khi editor bị GC.
 */
const registry = new WeakMap<Editor, (order: number) => void>();

export function setRetryHandler(editor: Editor, handler: ((order: number) => void) | null): void {
  if (handler) {
    registry.set(editor, handler);
  } else {
    registry.delete(editor);
  }
}

export function getRetryHandler(editor: Editor): ((order: number) => void) | undefined {
  return registry.get(editor);
}
