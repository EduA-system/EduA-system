"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, RotateCcw } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  CATEGORY_LABELS,
  DEFAULT_RUTHERFORD_SCATTERING_PARAMS,
  SCATTERING_COLORS,
} from "../engines/rutherford-scattering/constants";
import {
  createRutherfordScatteringState,
  rutherfordScatteringMetrics,
} from "../engines/rutherford-scattering/physics";
import { SCATTERING_PHASE_LABELS } from "../engines/rutherford-scattering/state-machine";
import type {
  RutherfordScatteringCommand,
  RutherfordScatteringMetrics,
  RutherfordScatteringParams,
  ScatteringCategory,
} from "../engines/rutherford-scattering/types";
import type { RutherfordScatteringPreset } from "../presets/types";
import { RutherfordScatteringScene } from "../renderers/rutherford-scattering/rutherford-scattering-scene";
import { ParamPanel, type ParamDef } from "../shared/param-panel";
import { SimulationTabs, type SimulationTab } from "../shared/simulation-tabs";
import { SimulationToolbar } from "../shared/simulation-toolbar";

const PARAM_SCHEMA: ParamDef[] = [
  { key: "alphaEnergy", label: "Năng lượng hạt α", unit: "%", min: 25, max: 100, step: 1 },
  { key: "foilThickness", label: "Độ dày lá kim loại", unit: "lớp quy ước", min: 0.2, max: 3, step: 0.1 },
  { key: "atomicNumber", label: "Điện tích hạt nhân Z", min: 13, max: 79, step: 1 },
];

function ModeChip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-full border px-3 py-1 text-xs transition-colors ${active ? "border-[#d97757] bg-[#fff4ef] text-[#c96545]" : "border-[#e8e2d9] text-[#6b6b6b] hover:border-[#d97757] hover:text-[#c96545]"}`}>{children}</button>;
}

function MetricGrid({ metrics, params }: { metrics: RutherfordScatteringMetrics; params: RutherfordScatteringParams }) {
  const values = [
    ["Trạng thái", SCATTERING_PHASE_LABELS[metrics.phase]],
    ["Hạt α đã phát", String(metrics.counters.emitted)],
    ["Gần như đi thẳng", String(metrics.counters.straight)],
    ["Lệch góc nhỏ", String(metrics.counters.smallAngle)],
    ["Lệch góc lớn", String(metrics.counters.largeAngle)],
    ["Bật ngược", String(metrics.counters.backscattered)],
    ["Chớp ZnS", String(metrics.counters.detected)],
    ["Góc gần nhất", metrics.latestAngle === null ? "—" : `${metrics.latestAngle.toFixed(1)}°`],
    ["Góc trung bình", `${metrics.meanAngle.toFixed(1)}°`],
    ["Năng lượng hiện tại", metrics.currentEnergy > 0 ? `${(metrics.currentEnergy * 100).toFixed(0)}%` : "—"],
    ["Lá kim loại", params.atomicNumber >= 70 ? "Vàng Au" : `Z = ${params.atomicNumber.toFixed(0)}`],
    ["Độ dày", `${params.foilThickness.toFixed(1)} lớp`],
  ];
  return <div className="grid grid-cols-2 gap-2">{values.map(([label, value]) => <div key={label} className="rounded-[8px] bg-[#faf9f7] px-3 py-2"><div className="text-[10px] uppercase tracking-wide text-[#8a8178]">{label}</div><div className="mt-1 text-[12px] font-semibold text-[#171717]">{value}</div></div>)}</div>;
}

function CategoryChart({ metrics }: { metrics: RutherfordScatteringMetrics }) {
  const rows: Array<{ category: ScatteringCategory; value: number }> = [
    { category: "straight", value: metrics.counters.straight },
    { category: "small", value: metrics.counters.smallAngle },
    { category: "large", value: metrics.counters.largeAngle },
    { category: "backscatter", value: metrics.counters.backscattered },
  ];
  const max = Math.max(1, ...rows.map((row) => row.value));
  return <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4"><p className="mb-3 text-[13px] font-semibold">Phân loại quỹ đạo quan sát được</p><div className="space-y-3">{rows.map((row) => <div key={row.category} className="grid grid-cols-[94px_1fr_32px] items-center gap-2 text-[10px]"><span className="font-medium text-[#4f4943]">{CATEGORY_LABELS[row.category]}</span><div className="h-2.5 rounded-full bg-[#f0ece5]"><div className="h-2.5 rounded-full" style={{ width: `${row.value / max * 100}%`, backgroundColor: SCATTERING_COLORS[row.category] }} /></div><span className="text-right tabular-nums">{row.value}</span></div>)}</div></div>;
}

function AngleHistogram({ metrics }: { metrics: RutherfordScatteringMetrics }) {
  const bins = [
    { label: "0–5°", min: 0, max: 5 },
    { label: "5–15°", min: 5, max: 15 },
    { label: "15–30°", min: 15, max: 30 },
    { label: "30–60°", min: 30, max: 60 },
    { label: "60–90°", min: 60, max: 90 },
    { label: ">90°", min: 90, max: 181 },
  ].map((bin) => ({ ...bin, count: metrics.observations.filter((item) => item.angle >= bin.min && item.angle < bin.max).length }));
  const max = Math.max(1, ...bins.map((bin) => bin.count));
  return <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4"><p className="mb-3 text-[13px] font-semibold">Phân bố góc tán xạ thực tế</p><svg viewBox="0 0 280 160" className="h-44 w-full" role="img" aria-label="Biểu đồ số hạt theo góc tán xạ lấy từ lần chạy hiện tại"><path d="M28 12V132H272" fill="none" stroke="#d8d1c9" />{bins.map((bin, index) => { const height = bin.count / max * 100; const x = 39 + index * 38; return <g key={bin.label}><rect x={x} y={132 - height} width="25" height={height} rx="5" fill={index < 2 ? "#06b6d4" : index < 5 ? "#fbbf24" : "#fb7185"} opacity=".78" /><text x={x + 12.5} y="147" textAnchor="middle" fontSize="7" fill="#6b6b6b">{bin.label}</text><text x={x + 12.5} y={Math.max(10, 126 - height)} textAnchor="middle" fontSize="8" fill="#4f4943">{bin.count}</text></g>; })}</svg></div>;
}

function ImpactChart({ metrics }: { metrics: RutherfordScatteringMetrics }) {
  const data = metrics.observations.slice(-120);
  const maxImpact = Math.max(1, ...data.map((item) => item.impactParameter));
  return <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4"><p className="mb-3 text-[13px] font-semibold">Khoảng cách tiếp cận và góc lệch</p><svg viewBox="0 0 280 160" className="h-44 w-full" role="img" aria-label="Đồ thị quan hệ giữa khoảng cách tiếp cận hạt nhân và góc tán xạ"><path d="M30 12V132H270" fill="none" stroke="#d8d1c9" /><text x="4" y="18" fontSize="8" fill="#8a8178">180°</text><text x="10" y="134" fontSize="8" fill="#8a8178">0°</text>{data.map((item, index) => <circle key={`${item.time}-${index}`} cx={34 + item.impactParameter / maxImpact * 228} cy={130 - item.angle / 180 * 114} r="2.6" fill={SCATTERING_COLORS[item.category]} opacity=".72" />)}<text x="165" y="151" fontSize="8" fill="#8a8178">Khoảng cách tiếp cận b →</text></svg><p className="text-[10px] leading-relaxed text-[#8a8178]">Đi càng gần hạt nhân dương, lực đẩy Coulomb càng mạnh và góc lệch càng lớn.</p></div>;
}

function AnalysisPanel({ metrics, params }: { metrics: RutherfordScatteringMetrics; params: RutherfordScatteringParams }) {
  const total = Math.max(1, metrics.counters.straight + metrics.counters.smallAngle + metrics.counters.largeAngle + metrics.counters.backscattered);
  return <div className="space-y-4">
    <MetricGrid metrics={metrics} params={params} />
    <CategoryChart metrics={metrics} />
    <AngleHistogram metrics={metrics} />
    <ImpactChart metrics={metrics} />
    <div className="overflow-hidden rounded-[12px] border border-[#e8e2d9] bg-white"><table className="w-full text-left text-[10px]"><thead className="bg-[#faf9f7] text-[#8a8178]"><tr><th className="px-3 py-2">Nhóm</th><th className="px-3 py-2">Số hạt</th><th className="px-3 py-2">Tỉ lệ</th></tr></thead><tbody>{(["straight", "small", "large", "backscatter"] as ScatteringCategory[]).map((category) => { const value = category === "straight" ? metrics.counters.straight : category === "small" ? metrics.counters.smallAngle : category === "large" ? metrics.counters.largeAngle : metrics.counters.backscattered; return <tr key={category} className="border-t border-[#f0ece5]"><td className="px-3 py-2 font-semibold">{CATEGORY_LABELS[category]}</td><td className="px-3 py-2 tabular-nums">{value}</td><td className="px-3 py-2 tabular-nums">{(value / total * 100).toFixed(1)}%</td></tr>; })}</tbody></table></div>
    <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4"><p className="mb-2 text-[13px] font-semibold">Timeline sự kiện</p>{metrics.events.length > 0 ? metrics.events.slice(-12).map((event, index) => <div key={`${event.time}-${index}`} className="mt-2 flex gap-2 text-xs"><span className="w-12 shrink-0 font-sans text-[#c96545]">{event.time.toFixed(1)} s</span><span className="text-[#4f4943]">{event.label}</span></div>) : <p className="text-xs text-[#8a8178]">Nhấn Play để bắt đầu phát chùm α.</p>}</div>
    <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4 text-center"><p className="font-sans text-lg font-bold">N(θ) ∝ 1 / sin⁴(θ/2)</p><p className="mt-2 text-xs leading-relaxed text-[#6b6b6b]">Mô hình chuẩn hóa thể hiện xu hướng Rutherford: số hạt giảm rất nhanh khi góc tán xạ tăng.</p></div>
    <p className="rounded-[10px] bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900">Phần lớn hạt α xuyên qua lá vàng gần như không đổi hướng, chứng tỏ phần lớn thể tích nguyên tử là khoảng trống. Một số ít lệch mạnh hoặc bật ngược cho thấy điện tích dương và gần như toàn bộ khối lượng tập trung trong một hạt nhân rất nhỏ.</p>
  </div>;
}

export function RutherfordScatteringExperiment({ preset, onBack }: { preset: RutherfordScatteringPreset; onBack: () => void }) {
  const [params, setParams] = useState<RutherfordScatteringParams>(DEFAULT_RUTHERFORD_SCATTERING_PARAMS);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [resetSignal, setResetSignal] = useState(0);
  const [tab, setTab] = useState<SimulationTab>("params");
  const [edited, setEdited] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [command, setCommand] = useState<{ type: RutherfordScatteringCommand; token: number }>({ type: "start", token: 0 });
  const [metrics, setMetrics] = useState(() => rutherfordScatteringMetrics(createRutherfordScatteringState()));
  const panelValues = useMemo<Record<string, number>>(() => ({ ...params }), [params]);
  const sendCommand = (type: RutherfordScatteringCommand) => setCommand((current) => ({ type, token: current.token + 1 }));
  const reset = () => { setRunning(false); setSpeed(1); setResetSignal((value) => value + 1); };
  const restoreDefaults = () => { setParams(DEFAULT_RUTHERFORD_SCATTERING_PARAMS); setEdited(false); reset(); };
  const changeRunning = (next: boolean) => { sendCommand(next ? (metrics.phase === "paused" ? "resume" : "start") : "pause"); setRunning(next); };
  const emitOne = () => { sendCommand("emitOne"); setRunning(true); };

  return <main className="flex h-screen w-full overflow-hidden bg-[#f5f1ec]">
    <Sidebar activeHref="/mo-phong-vat-ly" />
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e8e2d9] bg-white px-4"><button type="button" onClick={onBack} className="flex items-center gap-1.5 text-[13px] font-medium text-[#6b6b6b] transition-colors hover:text-[#171717]"><ChevronLeft className="h-5 w-5" />Thư viện</button><span className="text-[#d8d1c9]">/</span><span className="truncate text-[14px] font-semibold text-[#171717]">{preset.title}</span><span className={`ml-auto hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium sm:flex ${edited ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}><span className="size-1.5 rounded-full bg-current" />{edited ? "Đã chỉnh sửa" : "Bản gốc đã kiểm duyệt"}</span>{edited && <button type="button" onClick={restoreDefaults} className="hidden items-center gap-1.5 rounded-[9px] border border-[#e8e2d9] px-3 py-1.5 text-[12px] font-semibold text-[#4f4943] hover:bg-[#f7f3ee] sm:flex"><RotateCcw className="h-3.5 w-3.5" />Khôi phục</button>}</header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <section className="flex min-h-[360px] min-w-0 flex-1 flex-col overflow-hidden p-2"><div className="relative min-h-0 flex-1 overflow-hidden rounded-[16px] border border-[#e8e2d9] shadow-sm"><RutherfordScatteringScene params={params} running={running} speed={speed} resetSignal={resetSignal} command={command} showTrails showLabels onData={setMetrics} onComplete={() => setRunning(false)} /><SimulationToolbar running={running} speed={speed} onRunningChange={changeRunning} onReset={reset} onSpeedChange={setSpeed} /></div><p className="mt-3 shrink-0 text-center text-[13px] leading-relaxed text-[#6b6b6b]">Các đường màu là quỹ đạo chuyển động được làm chậm để quan sát, không phải tia sáng phát ra từ hạt α.</p></section>
        <aside className="flex max-h-[58vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-[#e8e2d9] bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0"><SimulationTabs value={tab} onChange={setTab} /><div className="min-h-0 flex-1 overflow-y-auto p-5">
          {tab === "params" && <div className="space-y-4"><p className="rounded-[10px] bg-[#faf9f7] p-3 text-xs leading-relaxed text-[#6b6b6b]">Chùm hạt α được chiếu vào một lá kim loại rất mỏng. Phần lớn hạt đi gần thẳng; một số ít đi sát hạt nhân dương nên lệch mạnh hoặc bật ngược.</p><div className="rounded-[10px] border border-[#e8e2d9] bg-white p-3 text-xs leading-relaxed text-[#6b6b6b]"><b className="text-[#4f4943]">Ba biến cần quan sát</b><div className="mt-2 space-y-1.5"><p>• Giảm năng lượng hạt α → hạt dễ bị lệch hơn.</p><p>• Tăng độ dày lá → số lần tương tác tăng.</p><p>• Tăng Z → lực đẩy Coulomb mạnh hơn.</p></div></div><ModeChip active={false} onClick={emitOne}>Phát một hạt α</ModeChip><ParamPanel schema={PARAM_SCHEMA} values={panelValues} onChange={(key, value) => { setParams((current) => ({ ...current, [key]: value })); setEdited(true); }} /><p className="text-[10px] leading-relaxed text-[#8a8178]">Các đại lượng được chuẩn hóa cho mục đích giáo dục; xu hướng góc tuân theo mô hình tán xạ Coulomb Rutherford.</p></div>}
          {tab === "analysis" && <AnalysisPanel metrics={metrics} params={params} />}
          {tab === "ai" && <div className="space-y-4"><p className="rounded-[10px] bg-amber-50 p-3 text-xs leading-relaxed text-amber-800"><b>Power user.</b> Đây là luồng Sửa bằng AI chung của khu vực mô phỏng; dịch vụ AI thật chưa được kết nối.</p><div className="flex flex-wrap gap-2">{["Giải thích vì sao đa số hạt đi thẳng", "Làm rõ sự kiện bật ngược", "So sánh vàng với nhôm", "Giải thích khoảng cách tiếp cận", "Tạo câu hỏi kiểm tra", "Giảm tốc độ để quan sát"].map((suggestion) => <button key={suggestion} type="button" onClick={() => setAiPrompt(suggestion)} className="rounded-full border border-[#e8e2d9] px-3 py-1 text-xs text-[#6b6b6b] hover:border-[#d97757] hover:text-[#c96545]">{suggestion}</button>)}</div><textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} rows={3} placeholder="Mô tả thay đổi bạn muốn…" className="w-full resize-none rounded-[12px] border border-[#e8e2d9] p-3 text-sm outline-none focus:border-[#d97757] focus:ring-2 focus:ring-[#d97757]/15" /><button type="button" disabled className="w-full rounded-[12px] bg-[#e8724a] py-2.5 text-sm font-semibold text-white opacity-40">Gửi cho AI</button></div>}
        </div></aside>
      </div>
    </div>
  </main>;
}
