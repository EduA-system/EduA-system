"use client";

import { useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { extractEditableSections } from "../LessonEditor/lessonSections";
import {
  buildSectionDiffHtml,
  diffSectionLines,
  insertSectionDiff,
  resolveSectionDiff,
} from "../LessonEditor/sectionDiff";
import { DashboardIcon } from "../ui/DashboardIcon";
import {
  editLessonSection,
  type AuthFetch,
} from "@/services/lessonPlanService";

type AssistantStatus = "idle" | "loading" | "error";

interface AssistantPanelProps {
  collapsed?: boolean;
  editor?: Editor | null;
  authFetch?: AuthFetch;
}

export function AssistantPanel({ collapsed = false, editor = null, authFetch }: AssistantPanelProps) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<AssistantStatus>("idle");
  // Mục đang có diff chờ Chấp nhận/Bỏ (đang hiện trực tiếp trong editor chính) — v1 chỉ
  // cho 1 đề xuất tại 1 thời điểm, chặn gửi yêu cầu mới cho tới khi xử lý xong.
  const [pendingHeading, setPendingHeading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = useMemo(
    () => Boolean(editor && authFetch && input.trim() && status !== "loading" && !pendingHeading),
    [authFetch, editor, input, pendingHeading, status],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || editor.isDestroyed || !authFetch) {
      showError("Chưa thể dùng AI ở màn hình này.");
      return;
    }
    const instruction = input.trim();
    if (!instruction || pendingHeading) return;

    const sections = extractEditableSections(editor);
    if (sections.length === 0) {
      showError("Không tìm thấy phần giáo án có thể chỉnh sửa.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");
    try {
      const response = await editLessonSection(
        {
          instruction,
          sections: sections.map((section) => ({
            id: section.id,
            heading: section.heading,
            content: section.text,
            kind: section.kind,
          })),
        },
        authFetch,
      );
      const target = sections.find((section) => section.id === response.targetId);
      if (!target) {
        showError("AI đã chọn một phần không còn tồn tại trong giáo án.");
        return;
      }

      const newBodyText = stripReturnedHeading(response.content, target.heading);
      const chunks = diffSectionLines(target.bodyText, newBodyText);
      const diffHtml = buildSectionDiffHtml(chunks);
      if (!chunks.some((chunk) => chunk.state !== "unchanged")) {
        showError("AI không đề xuất thay đổi nào cho phần này.");
        return;
      }
      if (!insertSectionDiff(editor, target, diffHtml)) {
        showError("Không thể chèn bản đề xuất vào giáo án. Hãy thử lại.");
        return;
      }
      setPendingHeading(target.heading);
      setStatus("idle");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Không thể chỉnh sửa giáo án bằng AI.");
    }
  }

  function handleResolve(resolution: "accept" | "discard") {
    if (!editor || editor.isDestroyed || !pendingHeading) return;
    const applied = resolveSectionDiff(editor, pendingHeading, resolution);
    setPendingHeading(null);
    if (!applied) {
      showError("Không thể áp dụng thay đổi — mục có thể đã bị sửa. Hãy gửi lại yêu cầu.");
      return;
    }
    setInput("");
    setErrorMessage("");
    setStatus("idle");
  }

  function showError(message: string) {
    setErrorMessage(message);
    setStatus("error");
  }

  return (
    <aside
      className={`hidden h-full shrink-0 overflow-y-auto border-l border-[#d9d9d9] bg-white transition-[width,opacity] duration-300 xl:flex xl:flex-col ${
        collapsed ? "w-0 opacity-0" : "w-[320px] opacity-100"
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
          Giáo án đã được tạo xong. Bạn có muốn tôi điều chỉnh phần nào không? Tôi có thể
          tinh gọn nội dung, bổ sung hoạt động nhóm hoặc tạo câu hỏi kiểm tra.
        </div>

        {pendingHeading ? (
          <div className="mt-4 rounded-[10px] border border-[#e8e2d9] bg-white p-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#8a8178]">Đang chờ duyệt</p>
            <p className="mt-1 text-[13px] leading-5 text-[#2b2926]">
              Đề xuất chỉnh sửa cho <b>{pendingHeading}</b> đang hiện trực tiếp trong tài liệu — phần gạch đỏ
              là nội dung cũ, phần gạch xanh là nội dung mới.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => handleResolve("accept")}
                className="flex-1 rounded-lg bg-[#d97757] px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-[#c96545]"
              >
                Chấp nhận
              </button>
              <button
                type="button"
                onClick={() => handleResolve("discard")}
                className="flex-1 rounded-lg border border-[#d8d1c9] bg-white px-3 py-2 text-[12px] font-semibold text-[#4f4943] transition hover:bg-[#f5f1ec]"
              >
                Bỏ
              </button>
            </div>
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
            disabled={status === "loading" || Boolean(pendingHeading)}
            placeholder="Nhập yêu cầu chỉnh sửa..."
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
          {pendingHeading
            ? "Chấp nhận hoặc Bỏ đề xuất hiện tại trước khi gửi yêu cầu mới"
            : "AI sẽ chỉnh sửa trực tiếp trên giáo án của bạn"}
        </p>
      </form>
    </aside>
  );
}

function stripReturnedHeading(content: string, heading: string) {
  const lines = content.split("\n");
  const firstContentLine = lines.findIndex((line) => line.trim());
  if (firstContentLine < 0) return "";
  if (normalizeHeading(lines[firstContentLine]) === normalizeHeading(heading)) {
    return lines.slice(firstContentLine + 1).join("\n").trim();
  }
  return content.trim();
}

function normalizeHeading(value: string) {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("vi-VN");
}
