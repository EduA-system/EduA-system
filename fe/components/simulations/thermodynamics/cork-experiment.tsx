"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { ParamPanel, type ParamDef } from "../shared/param-panel";
import { SimulationToolbar } from "../shared/simulation-toolbar";
import { SimulationTabs } from "../shared/simulation-tabs";
import { ZoomControls } from "../shared/zoom-controls";
import { CorkScene } from "../renderers/thermodynamics/cork-scene";
import { DEFAULT_THERMAL_PARAMS } from "../engines/thermodynamics/constants";
import { createThermalState, metrics } from "../engines/thermodynamics/physics";
import type { ChartPoint, ThermalEvent, ThermalMetrics, ThermalParams } from "../engines/thermodynamics/types";

const PARAM_SCHEMA: ParamDef[] = [
  { key: "heaterPower", label: "Công suất đèn cồn", unit: "W", min: 10, max: 45, step: 1 },
  { key: "corkMass", label: "Khối lượng nút bấc", unit: "g", min: 5, max: 35, step: 1 },
  { key: "holdForce", label: "Lực giữ nút", unit: "N", min: 8, max: 35, step: 1 },
  { key: "gasAmount", label: "Lượng khí", unit: "mol", min: 0.025, max: 0.055, step: 0.001 },
  { key: "initialTemperature", label: "Nhiệt độ ban đầu", unit: "°C", min: 12, max: 47, step: 1 },
  { key: "atmospherePressure", label: "Áp suất khí quyển", unit: "kPa", min: 85, max: 110, step: 0.5 },
  { key: "heatLoss", label: "Mức thất thoát nhiệt", unit: "W/°C", min: 0, max: 0.6, step: 0.02 },
];

const QUICK_PRESETS: { label: string; patch: Partial<ThermalParams> }[] = [
  { label: "Nút nhẹ", patch: { corkMass: 0.007 } }, { label: "Nút nặng", patch: { corkMass: 0.028 } },
  { label: "Giữ lỏng", patch: { holdForce: 12 } }, { label: "Giữ chặt", patch: { holdForce: 30 } },
  { label: "Đun yếu", patch: { heaterPower: 10 } }, { label: "Đun mạnh", patch: { heaterPower: 40 } },
  { label: "Mặc định", patch: DEFAULT_THERMAL_PARAMS },
];

type ChartField = { key: keyof ChartPoint; color: string; label: string };
type AiState = "idle" | "thinking" | "review";

function MiniChart({ title, points, fields, releaseTime }: { title: string; points: ChartPoint[]; fields: ChartField[]; releaseTime: number | null }) {
  const values = points.flatMap((point) => fields.map((field) => Number(point[field.key])));
  const max = Math.max(...values, 1), min = Math.min(...values, 0), maxTime = Math.max(points.at(-1)?.time ?? 1, 1);
  return <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
    <div className="mb-3 flex items-center justify-between gap-2"><p className="text-[13px] font-semibold text-[#171717]">{title}</p><div className="flex flex-wrap justify-end gap-2">{fields.map((field) => <span key={field.key} className="text-[10px] font-medium" style={{ color: field.color }}>● {field.label}</span>)}</div></div>
    <svg viewBox="0 0 280 100" className="h-28 w-full" role="img" aria-label={title}>
      <path d="M28 6V82H274" fill="none" stroke="#d8d1c9" /><text x="4" y="14" fontSize="9" fill="#8a8178">{max.toFixed(0)}</text><text x="8" y="82" fontSize="9" fill="#8a8178">{min.toFixed(0)}</text>
      {fields.map((field) => <polyline key={field.key} fill="none" stroke={field.color} strokeWidth="2" points={points.map((point) => `${28 + point.time / maxTime * 246},${82 - (Number(point[field.key]) - min) / (max - min || 1) * 72}`).join(" ")} />)}
      {releaseTime !== null && <><line x1={28 + releaseTime / maxTime * 246} x2={28 + releaseTime / maxTime * 246} y1="6" y2="82" stroke="#e8724a" strokeDasharray="3 3" /><text x={Math.min(230, 32 + releaseTime / maxTime * 246)} y="14" fontSize="8" fill="#c96545">Nút bật</text></>}
    </svg>
  </div>;
}

function MetricGrid({ live }: { live: ThermalMetrics }) {
  const items = [
    ["Nhiệt độ", `${(live.temperature - 273.15).toFixed(1)} °C`], ["Áp suất", `${(live.pressure / 1000).toFixed(1)} kPa`],
    ["Chênh áp", `${(live.deltaPressure / 1000).toFixed(1)} kPa`], ["Lực đẩy", `${live.pressureForce.toFixed(2)} N`],
    ["Ngưỡng bật", `${live.releaseThreshold.toFixed(2)} N`], ["Q đã nhận", `${live.heatIn.toFixed(1)} J`],
    ["ΔU", `${live.deltaInternalEnergy.toFixed(1)} J`], ["Công W", `${live.work.toFixed(2)} J`],
    ["Vận tốc nút", `${live.corkVelocity.toFixed(2)} m/s`], ["Độ cao nút", `${(live.corkY * 100).toFixed(1)} cm`],
  ];
  return <div className="grid grid-cols-2 gap-2">{items.map(([label, value]) => <div key={label} className="rounded-[8px] bg-[#faf9f7] px-3 py-2"><div className="text-[10px] uppercase tracking-wide text-[#8a8178]">{label}</div><div className="mt-0.5 font-sans text-[13px] font-semibold text-[#171717]">{value}</div></div>)}</div>;
}

export function CorkExperiment({ onBack }: { onBack: () => void }) {
  const [params, setParams] = useState<ThermalParams>(DEFAULT_THERMAL_PARAMS);
  const [running, setRunning] = useState(false), [speed, setSpeed] = useState(1), [resetSignal, setResetSignal] = useState(0);
  const [tab, setTab] = useState<"params" | "analysis" | "ai">("params"), [zoom, setZoom] = useState(100);
  const [aiState, setAiState] = useState<AiState>("idle"), [aiPrompt, setAiPrompt] = useState("");
  const [live, setLive] = useState(() => metrics(createThermalState(DEFAULT_THERMAL_PARAMS), DEFAULT_THERMAL_PARAMS));
  const [points, setPoints] = useState<ChartPoint[]>([]), [events, setEvents] = useState<ThermalEvent[]>([]);
  const lastPoint = useRef(-1), seenEvents = useRef(new Set<string>());
  const onMetrics = useCallback((value: ThermalMetrics) => setLive(value), []);
  const reset = useCallback(() => { setRunning(false); setResetSignal((value) => value + 1); setPoints([]); setEvents([]); lastPoint.current = -1; seenEvents.current.clear(); }, []);
  const panelValues = useMemo(() => ({ ...params, corkMass: params.corkMass * 1000, initialTemperature: params.initialTemperature - 273.15 }), [params]);
  const runAi = () => { setAiState("thinking"); window.setTimeout(() => setAiState("review"), 1400); };

  useEffect(() => {
    if (live.time - lastPoint.current >= 0.2) { lastPoint.current = live.time; setPoints((old) => [...old, { time: live.time, temperature: live.temperature - 273.15, pressure: live.pressure / 1000, heat: live.heatIn, deltaU: live.deltaInternalEnergy, work: live.work }].slice(-180)); }
    const candidates: [string, string, boolean][] = [["start", "Bắt đầu đun", live.time > 0.02], ["warm", "Nhiệt độ tăng", live.temperature > params.initialTemperature + 8], ["near", "Áp suất gần đạt ngưỡng", live.phase === "nearRelease"], ["move", "Nút bắt đầu chuyển động", live.releaseTime !== null], ["pop", "Nút bật khỏi bình", live.corkY >= 0.055], ["work", "Khí thực hiện công", live.work > 0.05], ["cool", "Khí giãn nở và nguội đi", live.phase === "completed"]];
    for (const [key, label, met] of candidates) if (met && !seenEvents.current.has(key)) { seenEvents.current.add(key); setEvents((old) => [...old, { key, label, time: live.time }]); }
  }, [live, params.initialTemperature]);

  const status = live.phase === "idle" ? "Sẵn sàng" : live.phase === "heating" ? "Đang đun" : live.phase === "nearRelease" ? "Gần bật" : live.phase === "paused" ? "Tạm dừng" : live.phase === "completed" ? "Hoàn thành" : "Đã bật";
  return <main className="flex h-screen min-w-0 flex-1 overflow-hidden bg-[#f5f1ec] font-sans">
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e8e2d9] bg-white px-4"><button onClick={onBack} className="flex items-center gap-1.5 text-[13px] font-medium text-[#6b6b6b] transition-colors hover:text-[#171717]" aria-label="Quay lại thư viện"><ChevronLeft className="h-5 w-5" />Thư viện</button><span className="text-[#d8d1c9]">/</span><span className="truncate text-[14px] font-semibold text-[#171717]">Nút bấc bật: Nội năng chuyển thành công</span></div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden p-2"><div className="relative min-h-0 flex-1 overflow-hidden rounded-[16px] border border-[#e8e2d9] shadow-sm"><CorkScene params={params} running={running} speed={speed} resetSignal={resetSignal} showLabels showParticles zoom={zoom} onMetrics={onMetrics} /><SimulationToolbar running={running} speed={speed} onRunningChange={setRunning} onReset={reset} onSpeedChange={setSpeed} /><ZoomControls percent={zoom} onZoomIn={() => setZoom((value) => Math.min(130, value + 10))} onZoomOut={() => setZoom((value) => Math.max(70, value - 10))} />
          {live.phase === "completed" && <div className="absolute bottom-4 right-4 max-w-xs rounded-[10px] border border-amber-200 bg-amber-50/95 p-3 text-xs font-semibold leading-relaxed text-amber-900 shadow-lg">Một phần nội năng của khí đã chuyển thành công làm nút bấc bật lên.</div>}
        </div><p className="mt-3 shrink-0 text-center text-[13px] leading-relaxed text-[#6b6b6b]">Khi được đun nóng, khí nhận nhiệt lượng làm nội năng và áp suất tăng. Khi lực do chênh lệch áp suất thắng lực giữ nút, khí giãn nở và thực hiện công làm nút bấc bật lên. <b className="text-[#c96545]">ΔU = Q − W</b></p></section>
        <aside className="flex w-80 shrink-0 flex-col border-l border-[#e8e2d9] bg-white"><SimulationTabs value={tab} onChange={setTab} />
          <div className="flex-1 overflow-y-auto p-5">{tab === "params" && <div className="space-y-4"><p className="rounded-[10px] bg-[#faf9f7] p-3 text-xs leading-relaxed text-[#6b6b6b]">Đun nóng làm các phân tử khí chuyển động nhanh hơn. Khi áp suất trong bình đủ lớn, khí thực hiện công đẩy nút bấc bật ra.</p><div className="rounded-[10px] bg-[#faf9f7] p-3 text-xs leading-relaxed text-[#6b6b6b]"><b className="text-[#4f4943]">Chú thích ký hiệu</b><div className="mt-2 grid grid-cols-[58px_1fr] gap-x-2 gap-y-1"><b>P_atm</b><span>Áp suất khí quyển</span><b>F_ap</b><span>Lực khí đẩy nút</span><b>mg</b><span>Trọng lực của nút</span><b>T</b><span>Nhiệt độ khí</span><b>P_trong</b><span>Áp suất trong bình</span><b>Q_in</b><span>Nhiệt lượng truyền vào</span><b>ΔU</b><span>Độ biến thiên nội năng</span><b>W</b><span>Công do khí thực hiện</span></div></div><div className="flex flex-wrap gap-1.5">{QUICK_PRESETS.map((preset) => <button key={preset.label} onClick={() => { setParams((old) => ({ ...old, ...preset.patch })); reset(); }} className="rounded-full border border-[#e8e2d9] px-3 py-1 text-xs text-[#6b6b6b] transition-colors hover:border-[#d97757] hover:text-[#c96545]">{preset.label}</button>)}</div><ParamPanel schema={PARAM_SCHEMA} values={panelValues} onChange={(key, value) => { setParams((old) => ({ ...old, [key]: key === "corkMass" ? value / 1000 : key === "initialTemperature" ? value + 273.15 : value })); reset(); }} /></div>}
            {tab === "analysis" && <div className="space-y-4"><div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4"><p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">Trạng thái: {status}</p><MetricGrid live={live} /></div><MiniChart title="Nhiệt độ T theo thời gian" points={points} fields={[{ key: "temperature", color: "#e8724a", label: "T (°C)" }]} releaseTime={live.releaseTime} /><MiniChart title="Áp suất P theo thời gian" points={points} fields={[{ key: "pressure", color: "#0ea5e9", label: "P (kPa)" }]} releaseTime={live.releaseTime} /><MiniChart title="Năng lượng theo thời gian" points={points} fields={[{ key: "heat", color: "#f59e0b", label: "Q" }, { key: "deltaU", color: "#10b981", label: "ΔU" }, { key: "work", color: "#8b5cf6", label: "W" }]} releaseTime={live.releaseTime} /><div className="rounded-[12px] border border-[#e8e2d9] p-4">{events.length ? events.map((event) => <div key={event.key} className="mt-2 flex gap-2 text-xs"><span className="font-sans text-[#c96545]">{event.time.toFixed(1)} s</span><span>{event.label}</span></div>) : <p className="text-xs text-[#8a8178]">Nhấn “Bắt đầu” để ghi dữ liệu.</p>}</div>{live.releaseTime !== null && <p className="rounded-[10px] bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900">Nút bật tại {live.releaseTime.toFixed(1)} giây khi áp suất đạt {((live.releasePressure ?? 0) / 1000).toFixed(1)} kPa. Khí đã thực hiện {live.work.toFixed(2)} J công.</p>}</div>}
            {tab === "ai" && <div className="space-y-4"><p className="rounded-[10px] bg-amber-50 p-3 text-xs leading-relaxed text-amber-800"><b>Power user.</b> AI sửa code trên nền bản gốc đã đúng, có kiểm tra thị giác trước/sau và luôn khôi phục được. Đây là luồng mô phỏng hiện có, chưa nối AI thật.</p><div className="flex flex-wrap gap-2">{["Làm nút bật mạnh hơn", "Giải thích đơn giản hơn", "Hiện dòng năng lượng"].map((text) => <button key={text} onClick={() => setAiPrompt(text)} className="rounded-full border border-[#e8e2d9] px-3 py-1 text-xs text-[#6b6b6b] hover:border-[#d97757] hover:text-[#c96545]">{text}</button>)}</div><textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} rows={3} placeholder="Mô tả thay đổi bạn muốn…" className="w-full resize-none rounded-[12px] border border-[#e8e2d9] p-3 text-sm outline-none focus:border-[#d97757] focus:ring-2 focus:ring-[#d97757]/15" /><button disabled={!aiPrompt.trim() || aiState === "thinking"} onClick={runAi} className="w-full rounded-[12px] bg-[#e8724a] py-2.5 text-sm font-semibold text-white hover:bg-[#d96a42] disabled:opacity-40">{aiState === "thinking" ? "AI đang sửa…" : "Gửi cho AI"}</button>{aiState === "thinking" && <div className="space-y-2 rounded-[12px] border border-[#e8e2d9] p-4 text-xs text-[#6b6b6b]"><p className="animate-pulse">↳ Đọc code bản gốc…</p><p className="animate-pulse">↳ Sinh thay đổi…</p><p className="animate-pulse">↳ Kiểm tra thị giác…</p></div>}{aiState === "review" && <div className="space-y-3 rounded-[12px] border border-[#e8e2d9] p-4"><p className="text-xs font-semibold text-[#4f4943]">Đề xuất thay đổi</p><div className="rounded-[10px] bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">Kiểm tra thị giác: không phát hiện vật ra khung hoặc sai tỉ lệ.</div><div className="flex gap-2"><button onClick={() => setAiState("idle")} className="flex-1 rounded-[10px] bg-[#e8724a] py-2 text-sm font-semibold text-white">Áp dụng</button><button onClick={() => setAiState("idle")} className="rounded-[10px] border border-[#e8e2d9] px-4 py-2 text-sm">Huỷ</button></div></div>}</div>}
            </div>
        </aside>
      </div>
    </div>
  </main>;
}
