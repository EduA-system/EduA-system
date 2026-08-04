"use client";

import { useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { aiSectionTextToHtml } from "../LessonEditor";
import {
  extractEditableSections,
  replaceSectionRange,
  type EditableLessonSection,
} from "../LessonEditor/lessonSections";
import { DashboardIcon } from "../ui/DashboardIcon";
import {
  editLessonSection,
  type AuthFetch,
} from "@/services/lessonPlanService";

type AssistantStatus = "idle" | "loading" | "preview" | "error";

type Proposal = {
  targetId: string;
  headingLabel: string;
  previewHtml: string;
};

interface AssistantPanelProps {
  collapsed?: boolean;
  editor?: Editor | null;
  authFetch?: AuthFetch;
}

export function AssistantPanel({ collapsed = false, editor = null, authFetch }: AssistantPanelProps) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<AssistantStatus>("idle");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = useMemo(
    () => Boolean(editor && authFetch && input.trim() && status !== "loading"),
    [authFetch, editor, input, status],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || editor.isDestroyed || !authFetch) {
      showError("Chưa thể dùng AI ở màn hình này.");
      return;
    }
    const instruction = input.trim();
    if (!instruction) return;

    const sections = extractEditableSections(editor);
    if (sections.length === 0) {
      showError("Không tìm thấy phần giáo án có thể chỉnh sửa.");
      return;
    }

    setStatus("loading");
    setProposal(null);
    setErrorMessage("");
    try {
      const response = await editLessonSection(
        {
          instruction,
          sections: sections.map((section) => ({
            id: section.id,
            heading: section.heading,
            content: section.text,
          })),
        },
        authFetch,
      );
      const target = sections.find((section) => section.id === response.targetId);
      if (!target) {
        showError("AI đã chọn một phần không còn tồn tại trong giáo án.");
        return;
      }
      setProposal({
        targetId: response.targetId,
        headingLabel: target.heading,
        previewHtml: buildSectionHtml(target, response.content),
      });
      setStatus("preview");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Không thể chỉnh sửa giáo án bằng AI.");
    }
  }

  function handleAccept() {
    if (!editor || editor.isDestroyed || !proposal) return;
    const sections = extractEditableSections(editor);
    const target = sections.find(
      (section) => section.id === proposal.targetId && section.heading === proposal.headingLabel,
    ) ?? sections.find((section) => section.heading === proposal.headingLabel);
    if (!target) {
      showError("Phần cần thay đã thay đổi. Hãy gửi lại yêu cầu để AI tạo bản sửa mới.");
      return;
    }
    const applied = replaceSectionRange(editor, target.from, target.to, proposal.previewHtml);
    if (!applied) {
      showError("Không thể áp dụng bản sửa vào giáo án. Hãy thử lại.");
      return;
    }
    setProposal(null);
    setInput("");
    setErrorMessage("");
    setStatus("idle");
  }

  function handleDiscard() {
    setProposal(null);
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

        {proposal ? (
          <div className="mt-4 rounded-[10px] border border-[#e8e2d9] bg-white p-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#8a8178]">Bản xem trước</p>
            <h2 className="mt-1 text-[13px] font-semibold leading-5 text-[#2b2926]">{proposal.headingLabel}</h2>
            <div
              className="lesson-document-editor mt-3 max-h-[340px] overflow-y-auto rounded-lg border border-[#eee5dc] bg-[#fbfaf8] px-3 py-2 text-[13px] leading-5"
              dangerouslySetInnerHTML={{ __html: proposal.previewHtml }}
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleAccept}
                className="flex-1 rounded-lg bg-[#d97757] px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-[#c96545]"
              >
                Chấp nhận
              </button>
              <button
                type="button"
                onClick={handleDiscard}
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
            disabled={status === "loading"}
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
          AI sẽ chỉnh sửa trực tiếp trên giáo án của bạn
        </p>
      </form>
    </aside>
  );
}

function buildSectionHtml(section: EditableLessonSection, content: string) {
  const bodyText = stripReturnedHeading(content, section.heading);
  return `<h${section.level}>${escapeHtml(section.heading)}</h${section.level}>${aiSectionTextToHtml(bodyText)}`;
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
