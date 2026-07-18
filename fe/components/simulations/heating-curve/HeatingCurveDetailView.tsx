"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, Pause, Play, RotateCcw } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import type { HeatingCurvePreset } from "../presets/types";
import { HeatingCurvePanel } from "./heating-curve-panel";
import type { HeatingParams, HeatingSnapshot } from "./types";

const HeatingCurveCanvas = dynamic(() => import("./heating-curve-canvas").then((module) => module.HeatingCurveCanvas), { ssr: false });

const DEFAULT_PARAMS: HeatingParams = {
  initialTemperature: 20,
  meltingPoint: 1538,
  solidHeatingRate: 100,
  phaseChangeDuration: 4,
  liquidHeatingRate: 80,
  liquidHeatingDuration: 6,
  showGuides: true,
  showSamples: false,
  showThermometer: true,
  speed: 1,
};

export function HeatingCurveDetailView({ preset, onBack }: { preset: HeatingCurvePreset; onBack: () => void }) {
  const [params, setParams] = useState<HeatingParams>(DEFAULT_PARAMS);
  const [running, setRunning] = useState(true);
  const [latest, setLatest] = useState<HeatingSnapshot | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [stepSignal, setStepSignal] = useState(0);
  const [edited, setEdited] = useState(false);

  const updateParams = (patch: Partial<HeatingParams>) => {
    setParams((current) => ({ ...current, ...patch }));
    setLatest(null);
    setEdited(true);
  };
  const reset = () => {
    setLatest(null);
    setResetSignal((value) => value + 1);
    setRunning(true);
  };

  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#f5f1ec]">
      <Sidebar activeHref="/mo-phong-vat-ly" />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e8e2d9] bg-white px-4">
          <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-[13px] font-medium text-[#6b6b6b] hover:text-[#171717]"><ChevronLeft className="h-5 w-5" strokeWidth={2} />Thư viện</button>
          <span className="text-[#d8d1c9]">/</span>
          <span className="truncate text-[14px] font-semibold text-[#171717]">{preset.title}</span>
          <span className={`ml-auto flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${edited ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}><span className="size-1.5 rounded-full bg-current" />{edited ? "Đã chỉnh sửa" : "Bản gốc đã kiểm duyệt"}</span>
          {edited && <button type="button" onClick={() => { setParams(DEFAULT_PARAMS); setEdited(false); reset(); }} className="hidden items-center gap-1.5 rounded-[9px] border border-[#e8e2d9] px-3 py-1.5 text-[12px] font-semibold text-[#4f4943] hover:bg-[#f7f3ee] sm:flex"><RotateCcw className="h-3.5 w-3.5" />Khôi phục</button>}
        </header>

        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          <div className="flex min-h-[360px] min-w-0 flex-1 flex-col overflow-hidden p-2">
            <div className="relative min-h-0 flex-1">
              <div className="absolute inset-0 overflow-hidden rounded-[16px] border border-[#e8e2d9] shadow-sm"><HeatingCurveCanvas params={params} running={running} resetSignal={resetSignal} stepSignal={stepSignal} onSnapshot={setLatest} /></div>
              <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center"><div className="pointer-events-auto flex items-center gap-0.5 rounded-[11px] border border-[#e8e2d9] bg-white p-1 shadow-[0_8px_24px_rgba(43,41,38,0.12),0_2px_8px_rgba(43,41,38,0.08)]">
                <button type="button" onClick={() => setRunning((value) => !value)} title={running ? "Tạm dừng" : "Bắt đầu"} aria-label={running ? "Tạm dừng" : "Bắt đầu"} className={`flex h-8 w-8 items-center justify-center rounded-[9px] ${running ? "bg-[#e8724a] text-white hover:bg-[#d96a42]" : "text-[#4f4943] hover:bg-[#f7f3ee]"}`}>{running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
                <div className="mx-0.5 h-4 w-px bg-black/10" />
                <button type="button" onClick={reset} title="Đặt lại" aria-label="Đặt lại" className="flex h-8 w-8 items-center justify-center rounded-[9px] text-[#4f4943] hover:bg-[#f7f3ee]"><RotateCcw className="h-4 w-4" /></button>
                <div className="mx-0.5 h-4 w-px bg-black/10" />
                <div className="flex items-center gap-0.5 rounded-[9px] bg-[#f5f1ec] p-0.5">{[0.5, 1, 2].map((speed) => <button key={speed} type="button" onClick={() => updateParams({ speed })} title={`Tốc độ ${speed}×`} className={`h-6 rounded-[7px] px-1.5 text-[11px] font-semibold ${params.speed === speed ? "bg-[#e8724a] text-white" : "text-[#6b6b6b] hover:bg-white hover:text-[#171717]"}`}>{speed}×</button>)}</div>
              </div></div>
            </div>
            <p className="mt-3 shrink-0 text-center text-[13px] text-[#6b6b6b]">{preset.objective}</p>
          </div>
          <HeatingCurvePanel params={params} latest={latest} onParamsChange={updateParams} onRunningChange={setRunning} onReset={reset} onStep={() => { setRunning(false); setStepSignal((value) => value + 1); }} />
        </div>
      </div>
    </main>
  );
}
