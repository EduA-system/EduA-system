import type { Editor } from "@tiptap/react";

/**
 * Kênh truyền handler "Thử lại" từ hook streaming ({@code usePracticeExamStream}) tới NodeView
 * của block câu hỏi lỗi — mirror {@code pendingActivityRetry.ts}. WeakMap theo instance editor
 * → tự dọn khi editor bị GC.
 */
const registry = new WeakMap<Editor, (order: number) => void>();

export function setQuestionRetryHandler(editor: Editor, handler: ((order: number) => void) | null): void {
  if (handler) {
    registry.set(editor, handler);
  } else {
    registry.delete(editor);
  }
}

export function getQuestionRetryHandler(editor: Editor): ((order: number) => void) | undefined {
  return registry.get(editor);
}
