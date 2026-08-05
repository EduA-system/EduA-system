"use client";

import { diffLines } from "diff";
import type { Editor } from "@tiptap/react";
import { aiSectionTextToHtml } from "./LessonEditor";
import { extractEditableSections, type EditableLessonSection } from "./lessonSections";
import { DIFF_RESOLUTION_META, type DiffState } from "./diffStateExtension";

export type SectionDiffChunk = { state: "unchanged" | DiffState; text: string };

/** So sánh nội dung cũ/mới theo dòng (giống git diff) — khớp quy ước backend trả nội
 * dung "mỗi đoạn/bullet/công thức 1 dòng" (xem LessonPlanEditPromptBuilder). */
export function diffSectionLines(oldText: string, newText: string): SectionDiffChunk[] {
  const chunks: SectionDiffChunk[] = [];
  for (const change of diffLines(oldText, newText)) {
    const text = change.value.replace(/\n+$/, "");
    if (!text) continue;
    chunks.push({
      state: change.added ? "added" : change.removed ? "removed" : "unchanged",
      text,
    });
  }
  return chunks;
}

/** Gắn `data-diff-state` lên đúng các block top-level mà `aiSectionTextToHtml` sinh ra
 * (`<p>`, `<li>` trong `<ul>/<ol>`, `<div data-type="block-math">`) — thao tác trên chuỗi
 * HTML, không cần DOM, vì cấu trúc output của `aiSectionTextToHtml` đã biết trước. */
function markDiffState(html: string, state: DiffState): string {
  return html
    .replace(/<p(?=[\s>])/g, `<p data-diff-state="${state}"`)
    .replace(/<li(?=[\s>])/g, `<li data-diff-state="${state}"`)
    .replace(/<div(?=\s+data-type="block-math")/g, `<div data-diff-state="${state}"`);
}

export function buildSectionDiffHtml(chunks: SectionDiffChunk[]): string {
  return chunks
    .map((chunk) => {
      const html = aiSectionTextToHtml(chunk.text);
      return chunk.state === "unchanged" ? html : markDiffState(html, chunk.state);
    })
    .join("");
}

/** Chèn diff (cũ gạch đỏ + mới gạch xanh) vào đúng phần thân mục, thay vì ghi đè thẳng. */
export function insertSectionDiff(editor: Editor, section: EditableLessonSection, diffHtml: string) {
  if (editor.isDestroyed) return false;
  return editor
    .chain()
    .setMeta(DIFF_RESOLUTION_META, true)
    .insertContentAt({ from: section.bodyFrom, to: section.to }, diffHtml, {
      parseOptions: { preserveWhitespace: false },
    })
    .run();
}

/**
 * Chấp nhận hoặc bỏ diff đang chờ duyệt của 1 mục, xác định lại vị trí mục theo tiêu đề
 * tại thời điểm gọi (không dùng offset đã lưu trước đó — tài liệu có thể đã đổi kích
 * thước từ lúc chèn diff tới lúc bấm Chấp nhận/Bỏ).
 */
export function resolveSectionDiff(
  editor: Editor,
  headingLabel: string,
  resolution: "accept" | "discard",
): boolean {
  if (editor.isDestroyed) return false;
  const target = extractEditableSections(editor).find((section) => section.heading === headingLabel);
  if (!target || target.bodyFrom >= target.to) return false;

  const dropState: DiffState = resolution === "accept" ? "removed" : "added";
  const keepState: DiffState = resolution === "accept" ? "added" : "removed";

  const { tr } = editor.state;
  const toDelete: Array<{ from: number; to: number }> = [];
  let changed = false;

  editor.state.doc.nodesBetween(target.bodyFrom, target.to, (node, pos) => {
    const diffState = node.attrs.diffState as DiffState | null | undefined;
    if (!diffState) return true;
    if (diffState === dropState) {
      toDelete.push({ from: pos, to: pos + node.nodeSize });
    } else if (diffState === keepState) {
      tr.setNodeAttribute(pos, "diffState", null);
      changed = true;
    }
    return false;
  });

  // Xoá từ cuối lên đầu để vị trí các đoạn xoá trước đó không lệch.
  toDelete
    .sort((a, b) => b.from - a.from)
    .forEach(({ from, to }) => {
      tr.delete(from, to);
      changed = true;
    });

  if (!changed) return false;
  tr.setMeta(DIFF_RESOLUTION_META, true);
  editor.view.dispatch(tr);
  return true;
}
