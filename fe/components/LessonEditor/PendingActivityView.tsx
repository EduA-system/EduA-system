import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { getRetryHandler } from "./pendingActivityRetry";

/**
 * NodeView React cho block hoạt động Phần III đang chờ / lỗi.
 *
 * <p>`status="pending"`: hiển thị "⏳ Đang soạn nội dung…" (giống bản tĩnh cũ).
 * `status="failed"`: hiển thị cảnh báo + lý do (nếu có) và nút "Thử lại" — bấm sẽ gọi handler
 * lấy qua {@code getRetryHandler(editor)} (do {@code useLessonPlanStream} đăng ký), để soạn lại
 * đúng hoạt động này (patch tại chỗ qua mỏ neo `order`).
 */
export function PendingActivityView({ editor, node }: NodeViewProps) {
  const order = node.attrs.order as number | string | null;
  const name =
    (node.attrs.name as string) || (order != null ? `Hoạt động ${order}` : "Hoạt động");
  const duration = node.attrs.duration ? ` (${node.attrs.duration as string})` : "";
  const failed = node.attrs.status === "failed";
  const reason = (node.attrs.reason as string) || "";

  const handleRetry = () => {
    if (order == null) return;
    getRetryHandler(editor)?.(Number(order));
  };

  return (
    <NodeViewWrapper
      className={failed ? "lp-pending lp-pending-failed" : "lp-pending"}
      contentEditable={false}
    >
      <div className="lp-pending-title">{`${name}${duration}`}</div>
      {failed ? (
        <div>
          <div className="lp-pending-status">⚠️ Chưa soạn được nội dung — mời soạn tay.</div>
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
        <div
          className="lp-pending-progress"
          role="progressbar"
          aria-label="Đang soạn nội dung"
          aria-valuetext="Đang soạn nội dung"
        >
          <div className="lp-pending-progress-bar" />
        </div>
      )}
    </NodeViewWrapper>
  );
}
