"use client";

import { useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { extractEditableSections, type EditableLessonSection } from "../LessonEditor/lessonSections";
import { editDataToBodyText } from "../LessonEditor/editContentToLines";
import {
  buildSectionDiffHtml,
  diffSectionLines,
  insertSectionDiff,
  resolveSectionDiff,
  scanPendingDiffs,
  type PendingSectionDiff,
} from "../LessonEditor/sectionDiff";
import { DashboardIcon } from "../ui/DashboardIcon";
import {
  editLessonSection,
  type AuthFetch,
  type EditLessonSectionEdit,
} from "@/services/lessonPlanService";

type AssistantStatus = "idle" | "loading" | "error";

interface AssistantPanelProps {
  collapsed?: boolean;
  /** Đóng panel — bấm lớp phủ nền (chỉ hiện dưới `xl`, xem ghi chú ở JSX) hoặc nhấn Escape.
   * Optional vì panel vẫn dùng được khi nhúng nơi không cần overlay (dù hiện tại chỉ có 1 nơi
   * gọi, `LessonEditDashboard`). */
  onClose?: () => void;
  editor?: Editor | null;
  authFetch?: AuthFetch;
  /** Nguồn SGK của giáo án đang mở (phiên streaming sống hoặc `payload.source` khi mở lại từ
   * Personal Library) — optional, cho phép thiếu. Gửi kèm request sửa mục để BE nạp lại
   * `knowledge_json`, giúp viết mới một mục còn trống bám đúng kiến thức bài thay vì bịa khung
   * rỗng — xem `LessonEditDashboard`. */
  bookId?: string;
  chapterId?: string;
  lessonId?: string;
  /** Chỉ cho phép chỉnh sửa sau khi luồng tạo giáo án đã kết thúc. */
  lessonGenerationComplete?: boolean;
}

export function AssistantPanel({
  collapsed = false,
  onClose,
  editor = null,
  authFetch,
  bookId,
  chapterId,
  lessonId,
  lessonGenerationComplete = true,
}: AssistantPanelProps) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<AssistantStatus>("idle");
  // Các mục đang có diff chờ Chấp nhận/Bỏ (đang hiện trực tiếp trong editor chính) — một
  // yêu cầu có thể tạo diff cho nhiều mục cùng lúc, mỗi mục duyệt độc lập; chặn gửi yêu
  // cầu mới cho tới khi TẤT CẢ đã được xử lý (context trích từ editor không nhận biết
  // diff đang chờ, gửi lẫn cả nội dung cũ/mới sẽ làm hỏng ngữ cảnh cho AI).
  //
  // LUÔN suy ra từ chính tài liệu (`scanPendingDiffs`), không ghi tay ở từng nơi gọi — nếu
  // không, state này lệch khỏi tài liệu thật bất cứ khi nào doc có `diffState` xuất hiện/mất
  // đi ngoài 2 đường ghi tay cũ: Ctrl+Z hồi sinh một diff đã Chấp nhận/Bỏ (transaction resolve
  // vẫn nằm trong undo-stack), hoặc một edit khác trong cùng batch lỗi giữa chừng khiến các
  // diff đã chèn trước đó "mồ côi" không ai theo dõi.
  const [pendingDiffs, setPendingDiffs] = useState<PendingSectionDiff[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!editor) return;
    const sync = () => setPendingDiffs(scanPendingDiffs(editor));
    sync();
    editor.on("update", sync);
    return () => {
      editor.off("update", sync);
    };
  }, [editor]);

  // Panel hiện dưới dạng lớp phủ (overlay) khi màn hình hẹp hơn `xl` (xem JSX bên dưới) —
  // Escape đóng lại, giống hành vi drawer/modal chuẩn.
  useEffect(() => {
    if (collapsed || !onClose) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [collapsed, onClose]);

  const canSubmit = useMemo(
    () => Boolean(editor && authFetch && lessonGenerationComplete && input.trim() && status !== "loading" && pendingDiffs.length === 0),
    [authFetch, editor, input, lessonGenerationComplete, pendingDiffs.length, status],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || editor.isDestroyed || !authFetch) {
      showError("Chưa thể dùng AI ở màn hình này.");
      return;
    }
    const instruction = input.trim();
    if (!instruction || !lessonGenerationComplete || pendingDiffs.length > 0) return;

    const sections = extractEditableSections(editor);
    if (sections.length === 0) {
      showError("Không tìm thấy phần giáo án có thể chỉnh sửa.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");
    try {
      const edits = await editLessonSection(
        {
          instruction,
          sections: sections.map((section) => ({
            id: section.id,
            heading: section.heading,
            content: section.text,
            kind: section.kind,
          })),
          bookId,
          chapterId,
          lessonId,
        },
        authFetch,
      );
      if (edits.length === 0) {
        showError("AI không đề xuất chỉnh sửa nào.");
        setStatus("idle");
        return;
      }

      // Khớp từng edit với section theo id, rồi xử lý theo thứ tự VỊ TRÍ GIẢM DẦN trong
      // tài liệu — mỗi lần insertSectionDiff làm lệch offset của mọi nội dung phía SAU nó
      // (cùng lấy từ 1 lần extractEditableSections ở trên), nên xử lý từ cuối tài liệu lên
      // đầu đảm bảo không làm sai offset đã cache của các mục chưa xử lý.
      const matched = edits
        .map((edit) => ({ edit, target: sections.find((section) => section.id === edit.targetId) }))
        .filter((m): m is { edit: EditLessonSectionEdit; target: EditableLessonSection } => Boolean(m.target))
        .sort((a, b) => b.target.from - a.target.from);

      // Mỗi section xử lý ĐỘC LẬP trong try/catch riêng — một edit có `data` sai hình dạng
      // (vd `kind` BE trả không khớp union FE, xem `editContentToLines.ts`) không được phép
      // làm văng cả vòng lặp: nếu không, các diff đã chèn thành công ở section trước đó vẫn
      // nằm trong tài liệu (đỏ/xanh hiện ra, `DiffStateExtension` khoá không cho gõ đè) nhưng
      // im lặng "mồ côi" vì code thoát ra ngoài trước khi kịp thông báo pending — hiện đã
      // không còn cần lo việc này vì `pendingDiffs` được đồng bộ qua `scanPendingDiffs` ở
      // effect phía trên, nhưng vẫn giữ try/catch để 1 section lỗi không chặn các section
      // hợp lệ khác trong cùng đợt.
      let insertedCount = 0;
      let failedCount = 0;
      for (const { edit, target } of matched) {
        try {
          const newBodyText = editDataToBodyText(edit);
          const chunks = diffSectionLines(target.bodyText, newBodyText);
          if (!chunks.some((chunk) => chunk.state !== "unchanged")) continue;
          const diffHtml = buildSectionDiffHtml(chunks);
          if (!insertSectionDiff(editor, target, diffHtml)) continue;
          insertedCount++;
        } catch (sectionError) {
          failedCount++;
          console.error(`Không thể áp dụng đề xuất AI cho mục "${target.heading}":`, sectionError);
        }
      }

      if (insertedCount === 0) {
        showError(
          failedCount > 0
            ? "AI đề xuất chỉnh sửa nhưng dữ liệu trả về không hợp lệ, không thể áp dụng. Hãy thử lại."
            : "AI không đề xuất thay đổi nào cho các phần đã chọn.",
        );
        setStatus("idle");
        return;
      }
      setInput("");
      if (failedCount > 0) {
        showError(`Đã áp dụng ${insertedCount} đề xuất; ${failedCount} đề xuất khác bị lỗi và đã bị bỏ qua.`);
      } else {
        setErrorMessage("");
        setStatus("idle");
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : "Không thể chỉnh sửa giáo án bằng AI.");
    }
  }

  function handleResolve(sectionId: string, resolution: "accept" | "discard") {
    if (!editor || editor.isDestroyed) return;
    // Không tự xoá `sectionId` khỏi `pendingDiffs` ở đây — transaction resolve (nếu thành
    // công) phát ra sự kiện "update", effect phía trên tự quét lại tài liệu và cập nhật đúng
    // danh sách. Tự xoá tay ở đây từng gây lệch state khi resolve thất bại lặng lẽ hoặc khi
    // một request khác đang xử lý đồng thời.
    const applied = resolveSectionDiff(editor, sectionId, resolution);
    if (!applied) {
      showError("Không thể áp dụng thay đổi — mục có thể đã bị sửa. Hãy gửi lại yêu cầu.");
      return;
    }
    setErrorMessage("");
    setStatus("idle");
  }

  function showError(message: string) {
    setErrorMessage(message);
    setStatus("error");
  }

  return (
    <>
      {/* Lớp phủ nền — chỉ hiện dưới `xl` khi panel đang mở (drawer đè lên nội dung thay vì
       * đẩy layout, vì màn hẹp không đủ chỗ cho cột 320px cố định). Từ `xl` trở lên panel nằm
       * trong luồng layout như cột bên phải (đẩy nội dung), nên không cần lớp phủ — ẩn hẳn qua
       * `xl:hidden`. Trước đây panel dùng `hidden ... xl:flex`, khiến nó KHÔNG THỂ mở được ở
       * màn hẹp hơn `xl` dù bấm nút toggle — nếu đúng lúc đó có diff AI đang chờ Chấp
       * nhận/Bỏ, GV bị kẹt hoàn toàn: không thấy nút xử lý, mà "Lưu" cũng bị khoá vì còn diff
       * pending (xem `LessonEditDashboard`). */}
      {!collapsed ? (
        <div
          className="fixed inset-0 z-40 bg-[#171717]/40 xl:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[320px] max-w-[85vw] flex-col overflow-y-auto border-l border-[#d9d9d9] bg-white shadow-2xl transition-transform duration-300 xl:static xl:z-auto xl:h-full xl:max-w-none xl:shrink-0 xl:shadow-none xl:transition-[width,opacity] ${
          collapsed
            ? "translate-x-full xl:translate-x-0 xl:w-0 xl:opacity-0"
            : "translate-x-0 xl:w-[320px] xl:opacity-100"
        }`}
        aria-hidden={collapsed}
      >
      <div className="min-w-[320px] flex-1 px-5 py-4">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#6b6b6b]">
          <span className="flex size-4 items-center justify-center rounded-[5px] border border-[#ff9571]/25 bg-[#fff0ea] text-[#e8724a]">
            <DashboardIcon name="aiBadge" className="size-[9px]" />
          </span>
          EDUA AI
        </div>
        <div className="mt-2 w-[251px] rounded-bl-[14px] rounded-br-[14px] rounded-tl rounded-tr-[14px] border border-[#d8d1c9] bg-[#faf7f4] px-3.5 py-3 text-[13px] leading-[21px] text-[#171717]">
          {lessonGenerationComplete
            ? <>Giáo án đã được tạo xong. Bạn có muốn tôi điều chỉnh phần nào không? Tôi có thể tinh gọn nội dung, bổ sung hoạt động nhóm hoặc tạo câu hỏi kiểm tra.</>
            : <>EDUA AI đang soạn giáo án. Bạn có thể xem nội dung đang được tạo; tính năng chỉnh sửa sẽ sẵn sàng khi hoàn tất.</>}
        </div>

        {pendingDiffs.length > 0 ? (
          <div className="mt-4 space-y-3">
            {pendingDiffs.map((pending) => (
              <div key={pending.id} className="rounded-[10px] border border-[#e8e2d9] bg-white p-3 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#8a8178]">Đang chờ duyệt</p>
                <p className="mt-1 text-[13px] leading-5 text-[#2b2926]">
                  Đề xuất chỉnh sửa cho <b>{pending.heading}</b> đang hiện trực tiếp trong tài liệu — phần gạch đỏ
                  là nội dung cũ, phần gạch xanh là nội dung mới.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleResolve(pending.id, "accept")}
                    className="flex-1 rounded-lg bg-[#d97757] px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-[#c96545]"
                  >
                    Chấp nhận
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolve(pending.id, "discard")}
                    className="flex-1 rounded-lg border border-[#d8d1c9] bg-white px-3 py-2 text-[12px] font-semibold text-[#4f4943] transition hover:bg-[#f5f1ec]"
                  >
                    Bỏ
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {status === "error" && errorMessage ? (
          <p className="mt-3 rounded-lg border border-[#efc8ba] bg-[#fff7f3] px-3 py-2 text-[12px] leading-5 text-[#a3482e]" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="min-w-[320px] px-5 pb-5 pt-3">
        <div className="flex items-end gap-2 rounded-[12px] border border-[#d8d1c9] bg-[#faf7f4] px-[15px] py-[11px]">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={3}
            disabled={!lessonGenerationComplete || status === "loading" || pendingDiffs.length > 0}
            placeholder={lessonGenerationComplete ? "Nhập yêu cầu chỉnh sửa..." : "Đang soạn giáo án..."}
            className="max-h-32 min-h-14 flex-1 resize-none bg-transparent text-[13px] leading-5 text-[#171717] outline-none placeholder:text-[#171717]/50 disabled:cursor-wait"
          />
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#d97757] text-white transition hover:bg-[#c96545] disabled:cursor-not-allowed disabled:bg-[#d8d1c9]"
            aria-label="Gửi yêu cầu"
            title="Gửi yêu cầu"
          >
            {status === "loading" ? <span className="size-3 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <DashboardIcon name="send" />}
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] leading-[15px] text-[#6b6b6b]">
          {!lessonGenerationComplete
            ? "Vui lòng chờ EDUA AI soạn xong giáo án trước khi chỉnh sửa"
            : pendingDiffs.length > 0
            ? `Chấp nhận hoặc Bỏ ${pendingDiffs.length} đề xuất hiện tại trước khi gửi yêu cầu mới`
            : "AI sẽ chỉnh sửa trực tiếp trên giáo án của bạn"}
        </p>
      </form>
      </aside>
    </>
  );
}
