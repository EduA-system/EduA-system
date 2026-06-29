import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";

// Meta key đánh dấu transaction do CHÍNH luồng streaming phát ra (được phép thay/xoá
// block "đang soạn"); transaction của người dùng thì không.
export const LP_STREAM_META = "lp-stream";

/**
 * Node block hiển thị một hoạt động Phần III đang chờ AI soạn ("⏳ Đang soạn…").
 *
 * <p>Là <b>atom</b> → con trỏ không vào trong, GV không sửa được nội dung block này
 * (đáp ứng yêu cầu "chỉ khoá block đang fill"). Khi hoạt động về (ACTIVITY_READY/FAILED),
 * luồng streaming thay node này bằng HTML thật. Một plugin kèm theo chặn GV xoá nhầm
 * block đang chờ (transaction không mang {@link LP_STREAM_META}).
 */
export const PendingActivity = Node.create({
  name: "pendingActivity",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      order: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-order"),
        renderHTML: (attrs) => (attrs.order == null ? {} : { "data-order": String(attrs.order) }),
      },
      name: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-name") ?? "",
        renderHTML: (attrs) => ({ "data-name": attrs.name ?? "" }),
      },
      duration: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-duration") ?? "",
        renderHTML: (attrs) => ({ "data-duration": attrs.duration ?? "" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-pending-activity]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const order = node.attrs.order;
    const name = node.attrs.name || (order != null ? `Hoạt động ${order}` : "Hoạt động");
    const duration = node.attrs.duration ? ` (${node.attrs.duration})` : "";
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-pending-activity": "", class: "lp-pending" }),
      ["div", { class: "lp-pending-title" }, `${name}${duration}`],
      ["div", { class: "lp-pending-status" }, "⏳ Đang soạn nội dung…"],
    ];
  },

  addProseMirrorPlugins() {
    const typeName = this.name;
    const countPending = (doc: PMNode) => {
      let n = 0;
      doc.descendants((node) => {
        if (node.type.name === typeName) n += 1;
      });
      return n;
    };
    return [
      new Plugin({
        // Chặn người dùng xoá block "đang soạn"; cho phép transaction của luồng stream.
        filterTransaction(tr, state) {
          if (!tr.docChanged) return true;
          if (tr.getMeta(LP_STREAM_META)) return true;
          return countPending(tr.doc) >= countPending(state.doc);
        },
      }),
    ];
  },
});
