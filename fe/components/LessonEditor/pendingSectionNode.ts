import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Block tĩnh "⏳ Đang soạn…" cho cả một phần (I/II/III) trong lúc chờ FRAME_READY.
 *
 * Cùng cấu trúc DOM/CSS với {@link ./pendingActivityNode} (`.lp-pending`) nhưng KHÔNG
 * cần plugin chặn xoá — ở giai đoạn này toàn bộ editor đã bị `setEditable(false)`
 * (xem `LessonEditDashboard`), nên không có transaction nào của người dùng để chặn.
 *
 * Lưu ý: phải khai báo là node riêng (không phải chuỗi HTML `<div>` thô) vì schema của
 * Tiptap chỉ giữ lại các thẻ khớp `parseHTML` của một node đã đăng ký — `<div>` không rõ
 * nguồn gốc sẽ bị trình phân tích bóc bỏ (mất class/border), y hệt lý do node
 * `pendingActivity` tồn tại thay vì chèn HTML thô cho hoạt động đang soạn.
 */
export const PendingSection = Node.create({
  name: "pendingSection",
  group: "block",
  atom: true,
  selectable: false,
  draggable: false,

  addAttributes() {
    return {
      label: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-label") ?? "",
        renderHTML: (attrs) => ({ "data-label": attrs.label ?? "" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-pending-section]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const label = node.attrs.label || "Đang soạn";
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-pending-section": "", class: "lp-pending" }),
      ["div", { class: "lp-pending-title" }, label],
      [
        "div",
        {
          class: "lp-pending-progress",
          role: "progressbar",
          "aria-label": "Đang soạn nội dung",
          "aria-valuetext": "Đang soạn nội dung",
        },
        ["div", { class: "lp-pending-progress-bar" }],
      ],
    ];
  },
});
