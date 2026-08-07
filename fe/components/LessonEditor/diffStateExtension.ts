import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

/** Meta key đánh dấu transaction do luồng Chấp nhận/Bỏ diff AI phát ra — được phép
 * sửa/xoá node đang có `diffState`; transaction gõ tay của người dùng thì không. */
export const DIFF_RESOLUTION_META = "lp-diff-resolution";

export type DiffState = "added" | "removed";

/**
 * Gắn attribute `diffState` lên các node block có thể là 1 "dòng" diff (đoạn văn, mục
 * bullet, công thức khối, hàng bảng) — không cần Mark/Node riêng vì diff chạy theo
 * dòng/đoạn/hàng, mỗi node block đã là đúng 1 đơn vị diff. `tableRow` được gắn trực tiếp
 * bởi `tableText.ts#buildTableDiffHtml` (không qua `markDiffState` như các loại còn lại)
 * vì hàng tiêu đề không bao giờ được đánh dấu diff — xem `sectionDiff.ts`.
 */
export const DiffStateExtension = Extension.create({
  name: "diffState",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "listItem", "blockMath", "tableRow"],
        attributes: {
          diffState: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-diff-state"),
            renderHTML: (attributes) =>
              attributes.diffState ? { "data-diff-state": attributes.diffState } : {},
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        // Chặn gõ/xoá đè lên vùng đang có diff chờ duyệt; luồng resolve tự đánh dấu
        // transaction của mình bằng DIFF_RESOLUTION_META để không bị chặn.
        filterTransaction(tr, state) {
          if (!tr.docChanged) return true;
          if (tr.getMeta(DIFF_RESOLUTION_META)) return true;

          for (const step of tr.steps) {
            const range = step as unknown as { from?: number; to?: number };
            if (typeof range.from !== "number" || typeof range.to !== "number") continue;
            let touchesDiff = false;
            state.doc.nodesBetween(range.from, range.to, (node) => {
              if (node.attrs.diffState) touchesDiff = true;
            });
            if (touchesDiff) return false;
          }
          return true;
        },
      }),
    ];
  },
});
