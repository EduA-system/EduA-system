import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { getQuestionRetryHandler } from "./pendingQuestionRetry";

const TYPE_LABELS: Record<string, string> = {
  MULTIPLE_CHOICE: "TN nhiều lựa chọn",
  TRUE_FALSE: "Đúng – sai",
  SHORT_ANSWER: "Trả lời ngắn",
  ESSAY: "Tự luận",
};

/**
 * NodeView React cho block câu hỏi đang chờ / lỗi. Mirror {@code PendingActivityView.tsx}.
 *
 * <p>`status="pending"`: hiển thị "⏳ Đang soạn nội dung…". `status="failed"`: hiển thị cảnh
 * báo + lý do (nếu có) và nút "Thử lại" — bấm sẽ gọi handler lấy qua
 * {@code getQuestionRetryHandler(editor)} (do {@code usePracticeExamStream} đăng ký), để sinh
 * lại đúng câu này (patch tại chỗ qua mỏ neo `order`).
 */
export function PendingQuestionView({ editor, node }: NodeViewProps) {
  const order = node.attrs.order as number | string | null;
  const scoreCentiPoints = node.attrs.scoreCentiPoints as number;
  const score = (scoreCentiPoints / 100).toFixed(2);
  const typeLabel = TYPE_LABELS[node.attrs.questionType as string] ?? "";
  const failed = node.attrs.status === "failed";
  const reason = (node.attrs.reason as string) || "";

  const handleRetry = () => {
    if (order == null) return;
    getQuestionRetryHandler(editor)?.(Number(order));
  };

  return (
    <NodeViewWrapper
      className={failed ? "lp-pending lp-pending-failed" : "lp-pending"}
      contentEditable={false}
    >
      <div className="lp-pending-title">{`Câu ${order} (${score} điểm) — ${typeLabel}`}</div>
      {failed ? (
        <div>
          <div className="lp-pending-status">⚠️ Chưa soạn được câu này — mời soạn tay.</div>
          {reason ? (
            <div className="mt-1 text-[12px] text-[#c0492b]/80">Lý do: {reason}</div>
          ) : null}
          <button
            type="button"
            onClick={handleRetry}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#ff9571] bg-[#fff0ea] px-3 py-1.5 text-[12px] font-medium text-[#e8724a] transition hover:bg-[#ffe4d9]"
          >
            ↻ Thử lại
          </button>
        </div>
      ) : (
        <div className="lp-pending-status">⏳ Đang soạn nội dung…</div>
      )}
    </NodeViewWrapper>
  );
}
