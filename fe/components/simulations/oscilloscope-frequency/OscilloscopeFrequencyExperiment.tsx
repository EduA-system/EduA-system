"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, RotateCcw } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { DEFAULT_OSCILLOSCOPE_PARAMS } from "../engines/oscilloscope-frequency/constants";
import {
  createOscilloscopeState,
  oscilloscopeMetrics,
} from "../engines/oscilloscope-frequency/physics";
import { OSCILLOSCOPE_PHASE_LABELS } from "../engines/oscilloscope-frequency/state-machine";
import type {
  OscilloscopeCommand,
  OscilloscopeFrequencyParams,
  OscilloscopeMetrics,
} from "../engines/oscilloscope-frequency/types";
import type { OscilloscopeFrequencyPreset } from "../presets/types";
import { OscilloscopeFrequencyScene } from "../renderers/oscilloscope-frequency/oscilloscope-frequency-scene";
import { ParamPanel, type ParamDef } from "../shared/param-panel";
import { SimulationTabs, type SimulationTab } from "../shared/simulation-tabs";
import { SimulationToolbar } from "../shared/simulation-toolbar";

const PARAM_SCHEMA: ParamDef[] = [
  { key: "frequency", label: "Tần số âm thoa", unit: "Hz", min: 100, max: 1000, step: 1 },
  { key: "sourceAmplitude", label: "Biên độ dao động âm thoa", unit: "%", min: 0, max: 100, step: 1 },
  { key: "damping", label: "Mức tắt dần", unit: "%", min: 0, max: 60, step: 1 },
  { key: "microphoneDistance", label: "Khoảng cách tới micro", unit: "cm", min: 5, max: 80, step: 1 },
  { key: "microphoneGain", label: "Độ khuếch đại micro", unit: "%", min: 20, max: 180, step: 1 },
  { key: "timePerDivision", label: "Núm TIME/DIV", unit: "ms/ô", min: 0.1, max: 5, step: 0.1 },
  { key: "voltsPerDivision", label: "Núm VOLT/DIV", unit: "V/ô", min: 0.1, max: 2, step: 0.1 },
  { key: "noise", label: "Nhiễu nền", unit: "%", min: 0, max: 35, step: 1 },
];

const QUICK_PRESETS: Array<{
  label: string;
  patch: Partial<OscilloscopeFrequencyParams>;
}> = [
  { label: "Âm thoa 256 Hz", patch: { frequency: 256, timePerDivision: 2, sourceAmplitude: 76 } },
  { label: "Nốt La 440 Hz", patch: { frequency: 440, timePerDivision: 1, sourceAmplitude: 76 } },
  { label: "Âm thoa 512 Hz", patch: { frequency: 512, timePerDivision: 1, sourceAmplitude: 76 } },
  { label: "Biên độ lớn", patch: { sourceAmplitude: 95, voltsPerDivision: 0.5 } },
  { label: "Biên độ nhỏ", patch: { sourceAmplitude: 22, voltsPerDivision: 0.5 } },
  { label: "Không phát âm", patch: { sourceAmplitude: 0 } },
  { label: "Micro ở xa", patch: { microphoneDistance: 72 } },
  { label: "Tín hiệu nhiễu", patch: { noise: 28 } },
  { label: "Mặc định", patch: DEFAULT_OSCILLOSCOPE_PARAMS },
];

function MetricGrid({ metrics }: { metrics: OscilloscopeMetrics }) {
  const measured = metrics.measuredFrequency !== null;
  const values = [
    ["Trạng thái", OSCILLOSCOPE_PHASE_LABELS[metrics.phase]],
    ["Tần số nguồn", `${metrics.sourceFrequency.toFixed(1)} Hz`],
    ["Tần số đo được", metrics.measuredFrequency === null ? "Chưa có tín hiệu" : `${metrics.measuredFrequency.toFixed(1)} Hz`],
    ["Chu kì T", `${metrics.periodMs.toFixed(3)} ms`],
    ["Biên độ tín hiệu", `${metrics.signalAmplitudeVolts.toFixed(3)} V`],
    ["Thời gian toàn màn", `${metrics.visibleTimeMs.toFixed(2)} ms`],
    ["Số chu kì giữa X₁–X₂", measured ? String(metrics.cursorCycles) : "—"],
    ["Khoảng thời gian Δt", measured ? `${metrics.cursorDeltaMs.toFixed(3)} ms` : "—"],
    ["Chu kì đã thu", metrics.acquiredCycles.toFixed(1)],
    ["Mức tín hiệu", `${metrics.signalPercent.toFixed(0)}%`],
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {values.map(([label, value]) => (
        <div key={label} className="rounded-[8px] bg-[#faf9f7] px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-[#8a8178]">{label}</div>
          <div className="mt-1 text-[12px] font-semibold text-[#171717]">{value}</div>
        </div>
      ))}
    </div>
  );
}

function SignalChart({
  metrics,
  params,
}: {
  metrics: OscilloscopeMetrics;
  params: OscilloscopeFrequencyParams;
}) {
  const width = 280;
  const height = 150;
  const path = metrics.samples.map((sample, index) => {
    const x = 16 + (sample.timeMs / Math.max(0.01, metrics.visibleTimeMs)) * 248;
    const y = Math.min(132, Math.max(10, 72 - (sample.voltage / Math.max(0.1, params.voltsPerDivision)) * 18));
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const x1 = 16 + (metrics.cursorStartMs / Math.max(0.01, metrics.visibleTimeMs)) * 248;
  const x2 = 16 + (metrics.cursorEndMs / Math.max(0.01, metrics.visibleTimeMs)) * 248;
  return (
    <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
      <p className="mb-3 text-[13px] font-semibold text-[#171717]">Ảnh tín hiệu của lần đo hiện tại</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full rounded-[9px] bg-[#062b38]" role="img" aria-label="Dạng sóng điện áp trên màn hình dao động kí">
        {Array.from({ length: 11 }, (_, index) => <line key={`x-${index}`} x1={16 + index * 24.8} x2={16 + index * 24.8} y1="10" y2="132" stroke="rgba(125,211,252,.18)" />)}
        {Array.from({ length: 9 }, (_, index) => <line key={`y-${index}`} x1="16" x2="264" y1={11 + index * 15.1} y2={11 + index * 15.1} stroke="rgba(125,211,252,.18)" />)}
        <line x1="16" x2="264" y1="72" y2="72" stroke="rgba(125,211,252,.46)" />
        <path d={path} fill="none" stroke="#d9ff57" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {(metrics.phase === "measuring" || metrics.phase === "complete") && <>
          <line x1={x1} x2={x1} y1="10" y2="132" stroke="#fbbf24" strokeDasharray="4 3" />
          <line x1={x2} x2={x2} y1="10" y2="132" stroke="#fbbf24" strokeDasharray="4 3" />
          <text x={x1} y="9" textAnchor="middle" fontSize="8" fill="#fde68a">X₁</text>
          <text x={x2} y="9" textAnchor="middle" fontSize="8" fill="#fde68a">X₂</text>
        </>}
      </svg>
    </div>
  );
}

function AnalysisPanel({
  metrics,
  params,
}: {
  metrics: OscilloscopeMetrics;
  params: OscilloscopeFrequencyParams;
}) {
  const calculatedFrequency = metrics.cursorDeltaMs > 0
    ? (metrics.cursorCycles / metrics.cursorDeltaMs) * 1000
    : 0;
  const measured = metrics.measuredFrequency !== null;
  return (
    <div className="space-y-4">
      <MetricGrid metrics={metrics} />
      <SignalChart metrics={metrics} params={params} />
      <div className="overflow-hidden rounded-[12px] border border-[#e8e2d9] bg-white">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-[#faf9f7] text-[#8a8178]"><tr><th className="px-3 py-2">Đại lượng</th><th className="px-3 py-2">Cách đọc</th><th className="px-3 py-2">Giá trị</th></tr></thead>
          <tbody>
            <tr className="border-t border-[#f0ece5]"><td className="px-3 py-2 font-semibold">Số chu kì N</td><td className="px-3 py-2">Đếm giữa X₁–X₂</td><td className="px-3 py-2 tabular-nums">{measured ? metrics.cursorCycles : "—"}</td></tr>
            <tr className="border-t border-[#f0ece5]"><td className="px-3 py-2 font-semibold">Δt</td><td className="px-3 py-2">Số ô × TIME/DIV</td><td className="px-3 py-2 tabular-nums">{measured ? `${metrics.cursorDeltaMs.toFixed(3)} ms` : "—"}</td></tr>
            <tr className="border-t border-[#f0ece5]"><td className="px-3 py-2 font-semibold">T = Δt/N</td><td className="px-3 py-2">Chu kì một dao động</td><td className="px-3 py-2 tabular-nums">{measured ? `${metrics.periodMs.toFixed(3)} ms` : "—"}</td></tr>
            <tr className="border-t border-[#f0ece5]"><td className="px-3 py-2 font-semibold">f = N/Δt</td><td className="px-3 py-2">Đổi ms sang s</td><td className="px-3 py-2 tabular-nums">{measured ? `${calculatedFrequency.toFixed(1)} Hz` : "—"}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
        <p className="text-center font-libertine text-lg font-bold text-[#171717]">T = Δt/N &nbsp;·&nbsp; f = 1/T = N/Δt</p>
        <p className="mt-2 text-xs leading-relaxed text-[#6b6b6b]">TIME/DIV cho biết thời gian ứng với mỗi ô ngang. VOLT/DIV chỉ thay đổi chiều cao hiển thị, không làm thay đổi chu kì hay tần số của tín hiệu.</p>
      </div>
      <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
        <p className="mb-2 text-[13px] font-semibold">Tiến trình thí nghiệm</p>
        {metrics.events.length > 0 ? metrics.events.map((event, index) => (
          <div key={`${event.phase}-${index}`} className="mt-2 flex gap-2 text-xs"><span className="w-12 shrink-0 font-mono text-[#c96545]">{event.time.toFixed(2)} s</span><span className="text-[#4f4943]">{event.label}</span></div>
        )) : <p className="text-xs text-[#8a8178]">Nhấn Play để gõ âm thoa và bắt đầu thu tín hiệu.</p>}
      </div>
      <p className="rounded-[10px] bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900">Biên độ âm thoa quyết định độ cao của đường tín hiệu, còn tần số quyết định số chu kì xuất hiện trong cùng một khoảng thời gian. Đo nhiều chu kì rồi chia cho N giúp đọc chu kì rõ hơn.</p>
    </div>
  );
}

export function OscilloscopeFrequencyExperiment({
  preset,
  onBack,
}: {
  preset: OscilloscopeFrequencyPreset;
  onBack: () => void;
}) {
  const [params, setParams] = useState<OscilloscopeFrequencyParams>(DEFAULT_OSCILLOSCOPE_PARAMS);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [resetSignal, setResetSignal] = useState(0);
  const [tab, setTab] = useState<SimulationTab>("params");
  const [edited, setEdited] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [command, setCommand] = useState<{ type: OscilloscopeCommand; token: number }>({ type: "start", token: 0 });
  const [metrics, setMetrics] = useState(() => oscilloscopeMetrics(createOscilloscopeState(), DEFAULT_OSCILLOSCOPE_PARAMS));

  const panelValues = useMemo<Record<string, number>>(() => ({ ...params }), [params]);
  const sendCommand = (type: OscilloscopeCommand) => setCommand((current) => ({ type, token: current.token + 1 }));
  const reset = () => {
    setRunning(true);
    setSpeed(1);
    setResetSignal((value) => value + 1);
    sendCommand("start");
  };
  const restoreDefaults = () => {
    setParams(DEFAULT_OSCILLOSCOPE_PARAMS);
    setEdited(false);
    reset();
  };
  const changeRunning = (next: boolean) => {
    if (next) sendCommand(metrics.phase === "paused" ? "resume" : "start");
    else sendCommand("pause");
    setRunning(next);
  };
  const applyPreset = (patch: Partial<OscilloscopeFrequencyParams>) => {
    setParams((current) => ({ ...current, ...patch }));
    setEdited(true);
  };

  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#f5f1ec]">
      <Sidebar activeHref="/mo-phong-vat-ly" />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e8e2d9] bg-white px-4">
          <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-[13px] font-medium text-[#6b6b6b] transition-colors hover:text-[#171717]"><ChevronLeft className="h-5 w-5" />Thư viện</button>
          <span className="text-[#d8d1c9]">/</span>
          <span className="truncate text-[14px] font-semibold text-[#171717]">{preset.title}</span>
          <span className={`ml-auto hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium sm:flex ${edited ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}><span className="size-1.5 rounded-full bg-current" />{edited ? "Đã chỉnh sửa" : "Bản gốc đã kiểm duyệt"}</span>
          {edited && <button type="button" onClick={restoreDefaults} className="hidden items-center gap-1.5 rounded-[9px] border border-[#e8e2d9] px-3 py-1.5 text-[12px] font-semibold text-[#4f4943] hover:bg-[#f7f3ee] sm:flex"><RotateCcw className="h-3.5 w-3.5" />Khôi phục</button>}
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <section className="flex min-h-[360px] min-w-0 flex-1 flex-col overflow-hidden p-2">
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[16px] border border-[#e8e2d9] shadow-sm">
              <OscilloscopeFrequencyScene params={params} running={running} speed={speed} resetSignal={resetSignal} command={command} onData={setMetrics} onComplete={() => setRunning(false)} />
              <SimulationToolbar running={running} speed={speed} onRunningChange={changeRunning} onReset={reset} onSpeedChange={setSpeed} />
            </div>
            <p className="mt-3 shrink-0 text-center text-[13px] leading-relaxed text-[#6b6b6b]">Micro chuyển dao động âm thành điện áp biến thiên cùng tần số. Trên dao động kí, đo thời gian của N chu kì rồi tính f = N/Δt.</p>
          </section>

          <aside className="flex max-h-[58vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-[#e8e2d9] bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
            <SimulationTabs value={tab} onChange={setTab} />
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {tab === "params" && (
                <div className="space-y-4">
                  <p className="rounded-[10px] bg-[#faf9f7] p-3 text-xs leading-relaxed text-[#6b6b6b]">Khi âm thoa rung, nó làm áp suất không khí biến thiên tuần hoàn. Micro biến dao động này thành điện áp cùng tần số để dao động kí vẽ thành đường hình sin.</p>
                  <div className="rounded-[10px] border border-[#e8e2d9] bg-white p-3 text-xs leading-relaxed text-[#6b6b6b]"><b className="text-[#4f4943]">Cách đo</b><p className="mt-2">Nhấn Play, đợi đường tín hiệu ổn định rồi đọc hai con trỏ X₁ và X₂. Đếm N chu kì trong Δt, sau đó tính T = Δt/N và f = N/Δt.</p></div>
                  <div className="flex flex-wrap gap-1.5">{QUICK_PRESETS.map((item) => <button key={item.label} type="button" onClick={() => applyPreset(item.patch)} className="rounded-full border border-[#e8e2d9] px-3 py-1 text-xs text-[#6b6b6b] transition-colors hover:border-[#d97757] hover:text-[#c96545]">{item.label}</button>)}</div>
                  <ParamPanel schema={PARAM_SCHEMA} values={panelValues} onChange={(key, value) => { setParams((current) => ({ ...current, [key]: value })); setEdited(true); }} />
                  <p className="text-[10px] leading-relaxed text-[#8a8178]">Chuyển động của nhánh âm thoa được làm chậm và phóng đại để quan sát. Tần số của đường điện áp trên màn hình vẫn được tính theo giá trị thật đã chọn.</p>
                </div>
              )}
              {tab === "analysis" && <AnalysisPanel metrics={metrics} params={params} />}
              {tab === "ai" && (
                <div className="space-y-4">
                  <p className="rounded-[10px] bg-amber-50 p-3 text-xs leading-relaxed text-amber-800"><b>Power user.</b> Đây là luồng Sửa bằng AI chung của khu vực mô phỏng; dịch vụ AI thật chưa được kết nối.</p>
                  <div className="flex flex-wrap gap-2">{["Giải thích cách đọc TIME/DIV", "Giải thích vì sao micro tạo điện áp", "Làm tín hiệu dễ đo hơn", "So sánh biên độ lớn và nhỏ", "Tạo câu hỏi kiểm tra", "Hướng dẫn tính f từ hai con trỏ"].map((suggestion) => <button key={suggestion} type="button" onClick={() => setAiPrompt(suggestion)} className="rounded-full border border-[#e8e2d9] px-3 py-1 text-xs text-[#6b6b6b] hover:border-[#d97757] hover:text-[#c96545]">{suggestion}</button>)}</div>
                  <textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} rows={3} placeholder="Mô tả thay đổi bạn muốn…" className="w-full resize-none rounded-[12px] border border-[#e8e2d9] p-3 text-sm outline-none focus:border-[#d97757] focus:ring-2 focus:ring-[#d97757]/15" />
                  <button type="button" disabled className="w-full rounded-[12px] bg-[#e8724a] py-2.5 text-sm font-semibold text-white opacity-40">Gửi cho AI</button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
