"use client";

import type { ReactNode } from "react";
import type { LessonSection } from "@/data/lessonMock";
import { EditableText } from "./EditableText";

interface LessonSectionProps {
  section: LessonSection;
  index: number;
  totalSections: number;
  newItemId: string | null;
  onUpdateTitle: (title: string) => void;
  onUpdateItem: (itemId: string, text: string) => void;
  onAddItem: () => void;
  onDeleteItem: (itemId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function LessonSection({
  section,
  index,
  totalSections,
  newItemId,
  onUpdateTitle,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}: LessonSectionProps) {
  return (
    <div className="group/section rounded-[14px] border border-[#d8d1c9] bg-white transition hover:border-[#c8beb5] hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]">

      {/* Section header */}
      <div className="flex items-center justify-between gap-3 rounded-t-[13px] border-b border-[#e8e2dc] bg-[#faf8f6] px-5 py-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-[#e8724a] text-[11px] font-semibold text-white">
            {index + 1}
          </span>
          <EditableText
            value={section.title}
            onChange={onUpdateTitle}
            placeholder="Tên phần..."
            className="flex-1 text-[13px] font-semibold leading-[20px] text-[#1f1f1f]"
          />
        </div>

        {/* Controls — visible on section hover */}
        <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/section:opacity-100">
          <CtrlBtn onClick={onMoveUp} disabled={index === 0} title="Lên">
            ↑
          </CtrlBtn>
          <CtrlBtn onClick={onMoveDown} disabled={index === totalSections - 1} title="Xuống">
            ↓
          </CtrlBtn>
          <CtrlBtn onClick={onDuplicate} title="Nhân đôi phần">
            ⧉
          </CtrlBtn>
          <div className="mx-1 h-3.5 w-px bg-[#d8d1c9]" />
          <CtrlBtn onClick={onDelete} title="Xóa phần" danger>
            ✕
          </CtrlBtn>
        </div>
      </div>

      {/* Items list */}
      <div className="px-5 pt-3 pb-2">
        {section.items.map((item) => (
          <div
            key={item.id}
            className="group/item flex items-start gap-2.5 rounded-lg px-2.5 py-1.5 transition hover:bg-[#faf8f6]"
          >
            <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#d97757]" />
            <EditableText
              value={item.text}
              onChange={(text) => onUpdateItem(item.id, text)}
              placeholder="Nhập nội dung mục..."
              className="min-h-[20px] flex-1 text-[13px] leading-[22px] text-[#1f1f1f]"
              autoFocus={newItemId === item.id}
              onEnter={onAddItem}
              onBackspaceEmpty={() => {
                if (section.items.length > 1) onDeleteItem(item.id);
              }}
            />
            <button
              type="button"
              onClick={() => onDeleteItem(item.id)}
              title="Xóa mục"
              className="mt-[4px] flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-[11px] text-[#b0a8a0] opacity-0 transition hover:bg-[#f5f1ec] hover:text-[#e8724a] group-hover/item:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Add item */}
      <div className="px-5 pb-4">
        <button
          type="button"
          onClick={onAddItem}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-[#6b6b6b] transition hover:bg-[#f5f1ec] hover:text-[#d97757]"
        >
          <span className="text-[15px] leading-none">+</span>
          Thêm mục
        </button>
      </div>
    </div>
  );
}

/* ── Helper button ── */
function CtrlBtn({
  children,
  onClick,
  disabled = false,
  title,
  danger = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        "flex h-[22px] w-[22px] items-center justify-center rounded-md text-[12px] transition",
        disabled
          ? "cursor-not-allowed opacity-25"
          : danger
            ? "text-[#6b6b6b] hover:bg-red-50 hover:text-red-500"
            : "text-[#6b6b6b] hover:bg-[#f5f1ec] hover:text-[#1f1f1f]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
