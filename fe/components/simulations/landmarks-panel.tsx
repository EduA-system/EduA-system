"use client";

// Panel "Phân tích" — gồm:
//  1. MỐC THỜI GIAN (t1, t2, t3…): chung cho MỌI thí nghiệm — bấm để mô phỏng
//     nhảy thẳng tới đúng giây đó rồi tự dừng lại.
//  2. MỐC GIÁ TRỊ QUAN TRỌNG (A, B, C…): trạng thái đặc biệt do preset khai báo.
// Cả hai đều hiện nhãn NGAY TRÊN canvas (qua markLabel/ghostLabel của
// SceneKonva2D) và để lại TÀN ẢNH nét đứt của mốc vừa xem trước đó.
//
// Giao diện theo hệ màu sáng EDUA. Không đụng kernel.

import { Clock, Crosshair, MoveRight } from "lucide-react";
import type { PresetAnalysis } from "./presets/types";

// Mốc thời gian mặc định — áp dụng chung, không cần preset khai báo riêng.
const TIME_MARK_SECONDS = [0.5, 1, 2, 3, 4, 5, 6, 8];

export type JumpMark = { seconds: number; label: string };

function TimeMarkButton({
  label,
  seconds,
  active,
  onClick,
}: {
  label: string;
  seconds: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 min-w-[46px] flex-col items-center justify-center rounded-[10px] border px-2 transition-colors duration-150 ease-out ${
        active
          ? "border-[#e8724a] bg-[#e8724a] text-white"
          : "border-[#e8e2d9] bg-white text-[#4f4943] hover:border-[#d97757] hover:text-[#c96545]"
      }`}
    >
      <span className="font-mono text-[13px] font-semibold leading-none">{label}</span>
      <span className={`mt-1 text-[9px] leading-none ${active ? "text-white/75" : "text-[#b8aea5]"}`}>
        {seconds}s
      </span>
    </button>
  );
}

function LandmarkBadge({ letter, active }: { letter: string; active: boolean }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[13px] font-bold ${
        active ? "bg-[#e8724a] text-white" : "bg-[#f5f1ec] text-[#4f4943]"
      }`}
    >
      {letter}
    </span>
  );
}

export function LandmarksPanel({
  analysis,
  params,
  active,
  onJumpTo,
}: {
  analysis?: PresetAnalysis;
  params: Record<string, number>;
  active: JumpMark | null;
  onJumpTo: (mark: JumpMark) => void;
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
          Bấm t1, t2… để nhảy thẳng tới đúng giây đó — mốc trước hiện tàn ảnh nét đứt để so sánh.
        </p>
        <div className="flex flex-wrap gap-2">
          {TIME_MARK_SECONDS.map((seconds, i) => {
            const label = `t${i + 1}`;
            return (
              <TimeMarkButton
                key={seconds}
                label={label}
                seconds={seconds}
                active={active?.label === label}
                onClick={() => onJumpTo({ seconds, label })}
              />
            );
          })}
        </div>
      </div>

      {/* Mốc giá trị quan trọng — theo preset, đặt tên A, B, C… */}
      {landmarks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-[#c96545]" strokeWidth={2} />
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
              Mốc giá trị quan trọng
            </h3>
          </div>
          {landmarks.map((lm, i) => {
            const letter = String.fromCharCode(65 + i); // A, B, C…
            const values = lm.values(params);
            const t = lm.atTime ? lm.atTime(params) : null;
            const isActive = active?.label === letter;
            return (
              <div
                key={lm.key}
                className={`rounded-[12px] border p-4 transition-colors duration-150 ease-out ${
                  isActive ? "border-[#e8724a] bg-[#fff7f1]" : "border-[#e8e2d9] bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <LandmarkBadge letter={letter} active={isActive} />
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[13px] font-semibold text-[#171717]">{lm.label}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-[#8a8178]">{lm.description}</p>
                    </div>
                  </div>
                  {t != null && (
                    <button
                      type="button"
                      onClick={() => onJumpTo({ seconds: Math.max(0, t), label: letter })}
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
