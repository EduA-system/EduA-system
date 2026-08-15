"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, RotateCcw } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { DEFAULT_WATER_SURFACE_WAVE_PARAMS } from "../engines/water-surface-wave/constants";
import {
  createWaterWaveState,
  waterWaveMetrics,
} from "../engines/water-surface-wave/physics";
import { WATER_WAVE_PHASE_LABELS } from "../engines/water-surface-wave/state-machine";
import type {
  WaterSurfaceWaveParams,
  WaterWaveCommand,
  WaterWaveMetrics,
} from "../engines/water-surface-wave/types";
import type { WaterSurfaceWavePreset } from "../presets/types";
import { WaterSurfaceWaveScene } from "../renderers/water-surface-wave/water-surface-wave-scene";
import { ParamPanel, type ParamDef } from "../shared/param-panel";
import { SimulationTabs, type SimulationTab } from "../shared/simulation-tabs";
import { SimulationToolbar } from "../shared/simulation-toolbar";

const PARAM_SCHEMA: ParamDef[] = [
  { key: "frequency", label: "Tần số nguồn f", unit: "Hz", min: 0.5, max: 6, step: 0.1 },
  { key: "amplitude", label: "Biên độ nguồn A", unit: "cm", min: 0.2, max: 2.5, step: 0.1 },
  { key: "waveSpeed", label: "Tốc độ truyền sóng v", unit: "cm/s", min: 6, max: 24, step: 0.5 },
  { key: "damping", label: "Mức tắt dần theo khoảng cách", unit: "%", min: 0, max: 60, step: 1 },
  { key: "waterLevel", label: "Mực nước trong khay", unit: "%", min: 30, max: 100, step: 1 },
  { key: "sourceDiameter", label: "Đường kính đầu rung", unit: "cm", min: 1, max: 5, step: 0.2 },
  { key: "surfaceClarity", label: "Độ rõ mặt sóng", unit: "%", min: 30, max: 100, step: 1 },
];

const QUICK_PRESETS: Array<{
  label: string;
  patch: Partial<WaterSurfaceWaveParams>;
}> = [
  { label: "Sóng cơ bản", patch: { frequency: 2, amplitude: 1.3, waveSpeed: 14, damping: 18 } },
  { label: "Bước sóng dài", patch: { frequency: 1, waveSpeed: 18 } },
  { label: "Bước sóng ngắn", patch: { frequency: 4.5, waveSpeed: 10 } },
  { label: "Sóng truyền chậm", patch: { waveSpeed: 7 } },
  { label: "Sóng truyền nhanh", patch: { waveSpeed: 23 } },
  { label: "Biên độ nhỏ", patch: { amplitude: 0.4 } },
  { label: "Biên độ lớn", patch: { amplitude: 2.3 } },
  { label: "Tắt dần mạnh", patch: { damping: 55 } },
  { label: "Mặc định", patch: DEFAULT_WATER_SURFACE_WAVE_PARAMS },
];

function MetricGrid({ metrics }: { metrics: WaterWaveMetrics }) {
  const values = [
    ["Trạng thái", WATER_WAVE_PHASE_LABELS[metrics.phase]],
    ["Tần số f", `${metrics.frequency.toFixed(2)} Hz`],
    ["Chu kì T", `${metrics.period.toFixed(3)} s`],
    ["Bước sóng λ", `${metrics.wavelength.toFixed(2)} cm`],
    ["Tốc độ v", `${metrics.waveSpeed.toFixed(1)} cm/s`],
    ["Bán kính mặt sóng đầu", `${metrics.frontRadius.toFixed(1)} cm`],
    ["Li độ nguồn", `${metrics.sourceDisplacement.toFixed(2)} cm`],
    ["Li độ phao", `${metrics.probeDisplacement.toFixed(2)} cm`],
    ["Thời gian tới phao", `${metrics.travelTimeToProbe.toFixed(2)} s`],
    ["Số đỉnh đang thấy", String(metrics.visibleCrests)],
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

function DisplacementChart({ metrics }: { metrics: WaterWaveMetrics }) {
  const history = metrics.history.slice(-180);
  const width = 280;
  const height = 154;
  const firstTime = history[0]?.time ?? 0;
  const lastTime = history[history.length - 1]?.time ?? firstTime + 1;
  const duration = Math.max(0.1, lastTime - firstTime);
  const maxAmplitude = Math.max(0.25, ...history.flatMap((point) => [Math.abs(point.sourceDisplacement), Math.abs(point.probeDisplacement)]));
  const makePath = (key: "sourceDisplacement" | "probeDisplacement") => history.map((point, index) => {
    const x = 18 + ((point.time - firstTime) / duration) * 246;
    const y = 73 - (point[key] / maxAmplitude) * 52;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
      <p className="mb-3 text-[13px] font-semibold text-[#171717]">Dao động tại nguồn và tại phao</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" role="img" aria-label="Đồ thị li độ nguồn và phao theo thời gian">
        <line x1="18" x2="264" y1="73" y2="73" stroke="#d8d1c9" />
        <line x1="18" x2="18" y1="12" y2="134" stroke="#d8d1c9" />
        <path d={makePath("sourceDisplacement")} fill="none" stroke="#c96545" strokeWidth="2" strokeLinecap="round" />
        <path d={makePath("probeDisplacement")} fill="none" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" />
        <text x="20" y="146" fontSize="9" fill="#c96545">Nguồn</text>
        <text x="70" y="146" fontSize="9" fill="#0891b2">Phao</text>
        <text x="257" y="146" fontSize="9" fill="#8a8178">t</text>
      </svg>
    </div>
  );
}

function AnalysisPanel({ metrics }: { metrics: WaterWaveMetrics }) {
  return (
    <div className="space-y-4">
      <MetricGrid metrics={metrics} />
      <DisplacementChart metrics={metrics} />
      <div className="overflow-hidden rounded-[12px] border border-[#e8e2d9] bg-white">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-[#faf9f7] text-[#8a8178]"><tr><th className="px-3 py-2">Quan sát</th><th className="px-3 py-2">Kết quả hiện tại</th></tr></thead>
          <tbody>
            <tr className="border-t border-[#f0ece5]"><td className="px-3 py-2">Khoảng cách hai đỉnh liên tiếp</td><td className="px-3 py-2 font-semibold">λ = {metrics.wavelength.toFixed(2)} cm</td></tr>
            <tr className="border-t border-[#f0ece5]"><td className="px-3 py-2">Thời gian một dao động</td><td className="px-3 py-2 font-semibold">T = {metrics.period.toFixed(3)} s</td></tr>
            <tr className="border-t border-[#f0ece5]"><td className="px-3 py-2">Thời gian sóng đi {metrics.probeDistance} cm</td><td className="px-3 py-2 font-semibold">{metrics.travelTimeToProbe.toFixed(2)} s</td></tr>
            <tr className="border-t border-[#f0ece5]"><td className="px-3 py-2">Chuyển động của phao</td><td className="px-3 py-2 font-semibold">Nhấp nhô quanh vị trí cũ</td></tr>
          </tbody>
        </table>
      </div>
      <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
        <p className="text-center font-sans text-lg font-bold text-[#171717]">v = λf &nbsp;·&nbsp; T = 1/f</p>
        <p className="mt-2 text-xs leading-relaxed text-[#6b6b6b]">Khi tốc độ truyền không đổi, tăng tần số làm các đỉnh sóng gần nhau hơn nên bước sóng giảm. Biên độ làm gợn mạnh hoặc yếu nhưng không quyết định tốc độ truyền.</p>
      </div>
      <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
        <p className="mb-2 text-[13px] font-semibold">Tiến trình thí nghiệm</p>
        {metrics.events.length > 0 ? metrics.events.map((event, index) => (
          <div key={`${event.phase}-${index}`} className="mt-2 flex gap-2 text-xs"><span className="w-12 shrink-0 font-sans text-[#c96545]">{event.time.toFixed(2)} s</span><span className="text-[#4f4943]">{event.label}</span></div>
        )) : <p className="text-xs text-[#8a8178]">Nguồn đang chuẩn bị tạo sóng.</p>}
      </div>
      <p className="rounded-[10px] bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900">Sóng truyền năng lượng và trạng thái dao động ra xa nguồn. Nước không chạy theo các vòng sóng: mỗi phần tử nước và chiếc phao chỉ dao động quanh vị trí cân bằng của nó.</p>
    </div>
  );
}

export function WaterSurfaceWaveExperiment({
  preset,
  onBack,
}: {
  preset: WaterSurfaceWavePreset;
  onBack: () => void;
}) {
  const [params, setParams] = useState<WaterSurfaceWaveParams>(DEFAULT_WATER_SURFACE_WAVE_PARAMS);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [resetSignal, setResetSignal] = useState(0);
  const [tab, setTab] = useState<SimulationTab>("params");
  const [edited, setEdited] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [command, setCommand] = useState<{ type: WaterWaveCommand; token: number }>({ type: "start", token: 0 });
  const [metrics, setMetrics] = useState(() => waterWaveMetrics(createWaterWaveState(), DEFAULT_WATER_SURFACE_WAVE_PARAMS));

  const panelValues = useMemo<Record<string, number>>(() => ({ ...params }), [params]);
  const sendCommand = (type: WaterWaveCommand) => setCommand((current) => ({ type, token: current.token + 1 }));
  const reset = () => {
    setRunning(true);
    setSpeed(1);
    setResetSignal((value) => value + 1);
    sendCommand("start");
  };
  const restoreDefaults = () => {
    setParams(DEFAULT_WATER_SURFACE_WAVE_PARAMS);
    setEdited(false);
    reset();
  };
  const changeRunning = (next: boolean) => {
    if (next) sendCommand(metrics.phase === "paused" ? "resume" : "start");
    else sendCommand("pause");
    setRunning(next);
  };
  const applyPreset = (patch: Partial<WaterSurfaceWaveParams>) => {
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
              <WaterSurfaceWaveScene params={params} running={running} speed={speed} resetSignal={resetSignal} command={command} onData={setMetrics} onComplete={() => undefined} />
              <SimulationToolbar running={running} speed={speed} onRunningChange={changeRunning} onReset={reset} onSpeedChange={setSpeed} />
            </div>
            <p className="mt-3 shrink-0 text-center text-[13px] leading-relaxed text-[#6b6b6b]">Nguồn làm mặt nước dao động và tạo các gợn tròn lan ra xa. Phao nhấp nhô tại chỗ cho thấy phần tử môi trường không chuyển động theo mặt sóng.</p>
          </section>

          <aside className="flex max-h-[58vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-[#e8e2d9] bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
            <SimulationTabs value={tab} onChange={setTab} />
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {tab === "params" && (
                <div className="space-y-4">
                  <p className="rounded-[10px] bg-[#faf9f7] p-3 text-xs leading-relaxed text-[#6b6b6b]">Đầu rung dao động tuần hoàn tạo ra các mặt sóng tròn. Mỗi đỉnh sóng mới cách đỉnh trước một bước sóng λ; trong một chu kì, trạng thái sóng truyền được quãng đường vT.</p>
                  <div className="rounded-[10px] border border-[#e8e2d9] bg-white p-3 text-xs leading-relaxed text-[#6b6b6b]"><b className="text-[#4f4943]">Cách quan sát</b><p className="mt-2">Theo dõi vòng gợn lan ra ngoài và chiếc phao chỉ nhấp nhô. Tăng f để các vòng sít lại; tăng v để mặt sóng chạy nhanh và khoảng cách hai đỉnh tăng.</p></div>
                  <div className="flex flex-wrap gap-1.5">{QUICK_PRESETS.map((item) => <button key={item.label} type="button" onClick={() => applyPreset(item.patch)} className="rounded-full border border-[#e8e2d9] px-3 py-1 text-xs text-[#6b6b6b] transition-colors hover:border-[#d97757] hover:text-[#c96545]">{item.label}</button>)}</div>
                  <ParamPanel schema={PARAM_SCHEMA} values={panelValues} onChange={(key, value) => { setParams((current) => ({ ...current, [key]: value })); setEdited(true); }} />
                  <p className="text-[10px] leading-relaxed text-[#8a8178]">Độ cao và kích thước đầu rung được phóng đại để dễ quan sát. Màu sáng–tối trên mặt nước chỉ minh họa li độ bề mặt.</p>
                </div>
              )}
              {tab === "analysis" && <AnalysisPanel metrics={metrics} />}
              {tab === "ai" && (
                <div className="space-y-4">
                  <p className="rounded-[10px] bg-amber-50 p-3 text-xs leading-relaxed text-amber-800"><b>Power user.</b> Đây là luồng Sửa bằng AI chung của khu vực mô phỏng; dịch vụ AI thật chưa được kết nối.</p>
                  <div className="flex flex-wrap gap-2">{["Giải thích v = λf đơn giản hơn", "Làm mặt sóng rõ hơn", "Giải thích chuyển động của phao", "So sánh tần số cao và thấp", "Tạo câu hỏi kiểm tra", "Phân biệt truyền sóng và chuyển động vật chất"].map((suggestion) => <button key={suggestion} type="button" onClick={() => setAiPrompt(suggestion)} className="rounded-full border border-[#e8e2d9] px-3 py-1 text-xs text-[#6b6b6b] hover:border-[#d97757] hover:text-[#c96545]">{suggestion}</button>)}</div>
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
