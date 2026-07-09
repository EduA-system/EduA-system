"use client";

// Panel "Phân tích" — thay cho benchmark đo sai số cũ. Gồm:
//  1. MỐC THỜI GIAN: chung cho MỌI thí nghiệm — bấm để mô phỏng nhảy thẳng tới
//     đúng giây đó (tích phân xác định từ trạng thái đầu, không phải tua nhanh
//     có hoạt ảnh) rồi tự dừng lại để xem/đối chiếu.
//  2. MỐC GIÁ TRỊ QUAN TRỌNG: trạng thái đặc biệt do preset khai báo (biên, vị
//     trí cân bằng, đỉnh quỹ đạo, lúc va chạm…), có thể kèm nút "Đi tới" nếu
//     preset cho biết đúng thời điểm xảy ra (atTime).
//
// Giao diện theo hệ màu sáng EDUA. Không đụng kernel — chỉ gọi onJumpTo(seconds).

import { Clock, Crosshair, MoveRight } from "lucide-react";
import type { PresetAnalysis } from "./presets/types";

// Mốc thời gian mặc định — áp dụng chung, không cần preset khai báo riêng.
const TIME_MARKS = [0.5, 1, 2, 3, 4, 5, 6, 8];

function TimeMarkButton({
  seconds,
  active,
  onClick,
}: {
  seconds: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-9 min-w-[52px] items-center justify-center rounded-[10px] border px-2.5 font-mono text-[13px] font-medium transition-colors duration-150 ease-out ${
        active
          ? "border-[#e8724a] bg-[#e8724a] text-white"
          : "border-[#e8e2d9] bg-white text-[#4f4943] hover:border-[#d97757] hover:text-[#c96545]"
      }`}
    >
      {seconds}s
    </button>
  );
}

export function LandmarksPanel({
  analysis,
  params,
  activeSeconds,
  onJumpTo,
}: {
  analysis?: PresetAnalysis;
  params: Record<string, number>;
  activeSeconds: number | null;
  onJumpTo: (seconds: number) => void;
}) {
  const landmarks = analysis?.landmarks ?? [];

  return (
    <div className="space-y-5">
      {/* Mốc thời gian — chung cho mọi thí nghiệm */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#c96545]" strokeWidth={2} />
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
            Mốc thời gian
          </h3>
        </div>
        <p className="text-[11px] leading-relaxed text-[#6b6b6b]">
          Bấm một mốc để mô phỏng nhảy thẳng tới đúng giây đó (tính từ lúc thả) và dừng lại — xem
          trạng thái tại thời điểm đó thay vì phải canh giờ bằng mắt.
        </p>
        <div className="flex flex-wrap gap-2">
          {TIME_MARKS.map((sec) => (
            <TimeMarkButton
              key={sec}
              seconds={sec}
              active={activeSeconds === sec}
              onClick={() => onJumpTo(sec)}
            />
          ))}
        </div>
      </div>

      {/* Mốc giá trị quan trọng — theo preset */}
      {landmarks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-[#c96545]" strokeWidth={2} />
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
              Mốc giá trị quan trọng
            </h3>
          </div>
          {landmarks.map((lm) => {
            const values = lm.values(params);
            const t = lm.atTime ? lm.atTime(params) : null;
            const isActive = t != null && activeSeconds != null && Math.abs(activeSeconds - t) < 1e-6;
            return (
              <div
                key={lm.key}
                className={`rounded-[12px] border p-4 transition-colors duration-150 ease-out ${
                  isActive ? "border-[#e8724a] bg-[#fff7f1]" : "border-[#e8e2d9] bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#171717]">{lm.label}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#6b6b6b]">{lm.description}</p>
                  </div>
                  {t != null && (
                    <button
                      type="button"
                      onClick={() => onJumpTo(Math.max(0, t))}
                      title={`t ≈ ${t.toFixed(2)}s`}
                      className={`flex shrink-0 items-center gap-1 rounded-[8px] px-2.5 py-1.5 text-[11px] font-semibold transition-colors duration-150 ease-out ${
                        isActive
                          ? "bg-[#e8724a] text-white"
                          : "border border-[#e8e2d9] text-[#4f4943] hover:bg-[#f7f3ee]"
                      }`}
                    >
                      <MoveRight className="h-3 w-3" strokeWidth={2} />
                      Đi tới
                    </button>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {values.map((v) => (
                    <div key={v.label} className="rounded-[8px] bg-[#faf9f7] px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wide text-[#8a8178]">
                        {v.label}
                      </div>
                      <div className="mt-0.5 font-mono text-[14px] font-semibold text-[#171717]">
                        {v.value}
                        {v.unit && (
                          <span className="ml-1 text-[10px] font-normal text-[#8a8178]">
                            {v.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
