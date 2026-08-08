"use client";

import { Pause, Play, RotateCcw, Sparkles } from "lucide-react";

type Props = {
  running: boolean;
  speed: number;
  onRunningChange: (running: boolean) => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  showParticles?: boolean;
  onParticlesChange?: (show: boolean) => void;
};

export function SimulationToolbar({ running, speed, onRunningChange, onReset, onSpeedChange, showParticles, onParticlesChange }: Props) {
  const buttonClass = "flex h-8 w-8 items-center justify-center rounded-[9px] text-[#4f4943] outline-none transition-colors duration-150 ease-out hover:bg-[#f7f3ee] focus-visible:ring-2 focus-visible:ring-[#e8724a]/50";
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-2">
      <div className="pointer-events-auto flex max-w-full items-center gap-0.5 rounded-[11px] border border-[#e8e2d9] bg-white p-1 shadow-[0_8px_24px_rgba(43,41,38,0.12),0_2px_8px_rgba(43,41,38,0.08)]">
        <button type="button" onClick={() => onRunningChange(!running)} title={running ? "Tạm dừng" : "Bắt đầu"} aria-label={running ? "Tạm dừng" : "Bắt đầu đun"} className={`${buttonClass} ${running ? "bg-[#e8724a] text-white hover:bg-[#d96a42]" : ""}`}>
          {running ? <Pause className="h-4 w-4" strokeWidth={2} /> : <Play className="h-4 w-4" strokeWidth={2} />}
        </button>
        <div className="mx-0.5 h-4 w-px shrink-0 bg-black/10" />
        <button type="button" onClick={onReset} title="Đặt lại" aria-label="Đặt lại mô phỏng" className={buttonClass}><RotateCcw className="h-4 w-4" strokeWidth={2} /></button>
        <div className="mx-0.5 h-4 w-px shrink-0 bg-black/10" />
        <div className="flex h-7 items-center gap-0.5 rounded-[9px] bg-[#f5f1ec] p-0.5">
          {[0.5, 1, 2].map((value) => <button type="button" key={value} onClick={() => onSpeedChange(value)} title={`Tốc độ ${value}x`} aria-label={`Tốc độ ${value} lần`} className={`flex h-6 min-w-7 items-center justify-center rounded-[7px] px-1.5 text-[11px] font-semibold leading-none tabular-nums outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-[#e8724a]/50 ${speed === value ? "bg-[#e8724a] text-white" : "text-[#6b6b6b] hover:bg-white hover:text-[#171717]"}`}>{value === 0.5 ? "0,5x" : `${value}x`}</button>)}
        </div>
        {onParticlesChange && <button type="button" onClick={() => onParticlesChange(!showParticles)} title={showParticles ? "Ẩn hạt khí" : "Hiện hạt khí"} aria-label={showParticles ? "Ẩn hạt khí" : "Hiện hạt khí"} className={`${buttonClass} ${showParticles ? "text-[#c96545]" : ""}`}><Sparkles className="h-4 w-4" /></button>}
      </div>
    </div>
  );
}
