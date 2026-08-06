"use client";

import { useEditorStore } from "@/stores/slide-editor-store";
import { isSlideLockedForGeneration } from "./types";

function SparkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.8l1.2 3.4L12.6 6.4 9.2 7.6 8 11 6.8 7.6 3.4 6.4l3.4-1.2z" />
      <path d="M12.6 9.6l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5z" />
    </svg>
  );
}

export function AiPanel() {
  const slide = useEditorStore((s) => s.slides.find((sl) => sl.id === s.currentSlideId));
  const slideLocked = isSlideLockedForGeneration(slide);
  const selectedCount = useEditorStore((s) => s.selectedIds.length);

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-l border-[#e8e2d9] bg-white">
      <div className="flex shrink-0 items-center gap-2 border-b border-[#e8e2d9] px-4 py-3">
        <span className="flex size-7 items-center justify-center rounded-[10px] bg-[#f6eadf] text-[#d97757]">
          <SparkIcon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-[#2b2926]">Trợ lý AI</div>
          <div className="text-[10px] text-[#8a8178]">Gợi ý & chỉnh sửa bằng AI</div>
        </div>
      </div>

      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mb-3 rounded-[12px] border border-[#eadfd7] bg-[#fff7f1] p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-[#9f5a3e]">
            <SparkIcon />
            Đang phát triển
          </div>
          <p className="text-[11px] leading-relaxed text-[#6b625a]">
            Bảng trợ lý AI sẽ sớm được bổ sung các thao tác như tạo lại slide, gợi ý bố cục và chỉnh sửa nội dung bằng AI.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-[10px] border border-[#e8e2d9] bg-white px-3 py-2 text-[11px] text-[#4f4943]">
            <span>Slide hiện tại</span>
            <span className="font-semibold text-[#2b2926]">{slide ? "Đã sẵn sàng" : "Trống"}</span>
          </div>
          <div className="flex items-center justify-between rounded-[10px] border border-[#e8e2d9] bg-white px-3 py-2 text-[11px] text-[#4f4943]">
            <span>Đang chọn</span>
            <span className="font-semibold text-[#2b2926]">{selectedCount} phần tử</span>
          </div>
          <div className="flex items-center justify-between rounded-[10px] border border-[#e8e2d9] bg-white px-3 py-2 text-[11px] text-[#4f4943]">
            <span>Trạng thái</span>
            <span className={`font-semibold ${slideLocked ? "text-[#d97757]" : "text-[#2b2926]"}`}>
              {slideLocked ? "Đang tạo" : "Sẵn sàng chỉnh sửa"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
