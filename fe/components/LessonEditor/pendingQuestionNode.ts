import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { Plugin } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import { PendingQuestionView } from "./PendingQuestionView";

// Meta key đánh dấu transaction do CHÍNH luồng streaming phát ra (được phép thay/xoá
// block "đang soạn"); transaction của người dùng thì không. Mirror LP_STREAM_META.
export const PE_STREAM_META = "pe-stream";

/** Trạng thái block câu hỏi đang chờ / lỗi. */
export type PendingQuestionStatus = "pending" | "failed";

const TYPE_LABELS: Record<string, string> = {
  MULTIPLE_CHOICE: "TN nhiều lựa chọn",
  TRUE_FALSE: "Đúng – sai",
  SHORT_ANSWER: "Trả lời ngắn",
  ESSAY: "Tự luận",
};

/**
 * Node block hiển thị một câu hỏi đang chờ AI soạn ("⏳ Đang soạn câu…") hoặc đã lỗi
 * ("⚠️ … [Thử lại]"). Mirror {@code pendingActivityNode.ts}, khác ở chỗ mỗi node ứng với
 * 1 CÂU HỎI (không phải 1 hoạt động) — 1 sự kiện BATCH_READY/BATCH_FAILED có thể thay/đánh
 * dấu NHIỀU node cùng lúc (vì 1 batch có thể gồm nhiều câu).
 *
 * <p>Là <b>atom</b> → con trỏ không vào trong, GV không sửa được nội dung block này. Khi câu về:
 * <ul>
 *   <li>BATCH_READY (câu này nằm trong batch) → luồng streaming thay node này bằng HTML thật.</li>
 *   <li>BATCH_FAILED → giữ nguyên node (đổi {@code status="failed"}) để CÒN mỏ neo
 *       {@code order}, cho phép bấm "Thử lại" soạn lại đúng câu đó.</li>
 * </ul>
 */
export const PendingQuestion = Node.create({
  name: "pendingQuestion",
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
      questionType: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-question-type") ?? "",
        renderHTML: (attrs) => ({ "data-question-type": attrs.questionType ?? "" }),
      },
      scoreCentiPoints: {
        default: 0,
        parseHTML: (el) => Number(el.getAttribute("data-score") ?? 0),
        renderHTML: (attrs) => ({ "data-score": String(attrs.scoreCentiPoints ?? 0) }),
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
    return [{ tag: "div[data-pending-question]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const order = node.attrs.order;
    const score = ((node.attrs.scoreCentiPoints as number) / 100).toFixed(2);
    const typeLabel = TYPE_LABELS[node.attrs.questionType as string] ?? "";
    const failed = node.attrs.status === "failed";
    const status = failed
      ? "⚠️ Chưa soạn được nội dung — mời soạn tay hoặc bấm Thử lại."
      : "⏳ Đang soạn nội dung…";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-pending-question": "",
        class: failed ? "lp-pending lp-pending-failed" : "lp-pending",
      }),
      ["div", { class: "lp-pending-title" }, `Câu ${order} (${score} điểm) — ${typeLabel}`],
      ["div", { class: "lp-pending-status" }, status],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PendingQuestionView);
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
          if (tr.getMeta(PE_STREAM_META)) return true;
          return countPending(tr.doc) >= countPending(state.doc);
        },
      }),
    ];
  },
});
