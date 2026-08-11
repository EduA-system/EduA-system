import { Node, mergeAttributes } from "@tiptap/core";
import type { JSONContent } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { Plugin } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import { PendingActivityView } from "./PendingActivityView";

// Meta key đánh dấu transaction do CHÍNH luồng streaming phát ra (được phép thay/xoá
// block "đang soạn"); transaction của người dùng thì không.
export const LP_STREAM_META = "lp-stream";

/** Trạng thái block hoạt động Phần III đang chờ / lỗi. */
export type PendingActivityStatus = "pending" | "failed";

/**
 * Node block hiển thị một hoạt động Phần III đang chờ AI soạn ("⏳ Đang soạn…") hoặc đã lỗi
 * ("⚠️ … [Thử lại]").
 *
 * <p>Là <b>atom</b> → con trỏ không vào trong, GV không sửa được nội dung block này
 * (đáp ứng yêu cầu "chỉ khoá block đang fill"). Khi hoạt động về:
 * <ul>
 *   <li>ACTIVITY_READY → luồng streaming thay node này bằng HTML thật.</li>
 *   <li>ACTIVITY_FAILED → giữ nguyên node (đổi {@code status="failed"}) để CÒN mỏ neo
 *       {@code order}, cho phép bấm "Thử lại" soạn lại đúng hoạt động đó.</li>
 * </ul>
 * Một plugin kèm theo chặn GV xoá nhầm block đang chờ (transaction không mang
 * {@link LP_STREAM_META}).
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
      status: {
        default: "pending",
        parseHTML: (el) => el.getAttribute("data-status") ?? "pending",
        renderHTML: (attrs) => ({ "data-status": attrs.status ?? "pending" }),
      },
      reason: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-reason") ?? "",
        renderHTML: (attrs) => (attrs.reason ? { "data-reason": attrs.reason } : {}),
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
    const failed = node.attrs.status === "failed";
    const status = "⚠️ Chưa soạn được nội dung — mời soạn tay hoặc bấm Thử lại.";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-pending-activity": "",
        class: failed ? "lp-pending lp-pending-failed" : "lp-pending",
      }),
      ["div", { class: "lp-pending-title" }, `${name}${duration}`],
      failed
        ? ["div", { class: "lp-pending-status" }, status]
        : [
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

  addNodeView() {
    return ReactNodeViewRenderer(PendingActivityView);
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

/**
 * Thay mọi node `pendingActivity` "chết" (không còn phiên streaming nào có thể tự phục hồi nó)
 * bằng heading THẬT + một dòng văn bản thường ("Mời soạn tay.") — thay vì lưu nguyên khối
 * lỗi/đang-soạn làm "phần tử" vĩnh viễn trong tài liệu đã lưu. Sau khi thay, mục đó trở thành
 * một heading bình thường mà GV sửa tay được VÀ `extractEditableSections` (dùng bởi
 * AssistantPanel) nhận diện được như mọi mục khác — không còn kẹt ở trạng thái không sửa được.
 *
 * @param includePending Có coi cả node đang `status: "pending"` là "chết" hay không.
 *   - `true` khi MỞ một tài liệu đã lưu (`LessonEditDashboard`'s `getLibraryContent` flow) —
 *     chắc chắn không còn phiên streaming sống nào sẽ gửi `ACTIVITY_READY`/`ACTIVITY_FAILED`
 *     cho node đó nữa, kể cả khi nó lỡ dở ở "pending" (vd server crash giữa chừng).
 *   - `false` khi LƯU ngay trong lúc còn đang generate (nút "Lưu" bấm tay giữa chừng, xem
 *     `saveLesson`) — một số hoạt động có thể vẫn đang chạy THẬT trong phiên hiện tại, không
 *     được đụng vào; chỉ node đã chắc chắn `status: "failed"` mới bị thay.
 */
export function resolveDeadPendingActivities(doc: JSONContent, includePending: boolean): JSONContent {
  if (!doc || typeof doc !== "object" || !Array.isArray(doc.content)) return doc;

  const content: JSONContent[] = [];
  for (const node of doc.content) {
    const isDead =
      node.type === "pendingActivity" && (includePending || node.attrs?.status === "failed");
    if (isDead) {
      content.push(...pendingActivityFallbackNodes(node));
      continue;
    }
    content.push(resolveDeadPendingActivities(node, includePending));
  }
  return { ...doc, content };
}

/** Heading (khớp định dạng `activityHtml` sinh ra khi soạn thành công) + 1 đoạn "Mời soạn tay." */
function pendingActivityFallbackNodes(node: JSONContent): JSONContent[] {
  const name = (typeof node.attrs?.name === "string" && node.attrs.name.trim()) || "Hoạt động";
  const duration = typeof node.attrs?.duration === "string" ? node.attrs.duration.trim() : "";
  const heading = duration ? `${name} (${duration})` : name;
  return [
    { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: heading }] },
    { type: "paragraph", content: [{ type: "text", text: "Mời soạn tay." }] },
  ];
}
