"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, RotateCcw } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  average,
  gasComparison,
  rutherfordConclusion,
} from "../engines/rutherford-nitrogen/analysis";
import {
  DEFAULT_RUTHERFORD_PARAMS,
  GAS_LABELS,
  GAS_SHORT_LABELS,
  gasFromCode,
} from "../engines/rutherford-nitrogen/constants";
import {
  createRutherfordState,
  rutherfordMetrics,
} from "../engines/rutherford-nitrogen/physics";
import { RUTHERFORD_PHASE_LABELS } from "../engines/rutherford-nitrogen/state-machine";
import type {
  ObservationView,
  RutherfordCommand,
  RutherfordMetrics,
  RutherfordParams,
} from "../engines/rutherford-nitrogen/types";
import type { RutherfordNitrogenPreset } from "../presets/types";
import { RutherfordNitrogenScene } from "../renderers/rutherford-nitrogen/rutherford-nitrogen-scene";
import { ParamPanel, type ParamDef } from "../shared/param-panel";
import { SimulationTabs, type SimulationTab } from "../shared/simulation-tabs";
import { SimulationToolbar } from "../shared/simulation-toolbar";

const PARAM_SCHEMA: ParamDef[] = [
  { key: "gasPressure", label: "Áp suất khí", unit: "%", min: 10, max: 120, step: 1 },
  { key: "gasDensity", label: "Mật độ khí", unit: "%", min: 10, max: 120, step: 1 },
  { key: "alphaEnergy", label: "Năng lượng α tương đối", unit: "%", min: 30, max: 100, step: 1 },
  { key: "sourceIntensity", label: "Cường độ nguồn", unit: "%", min: 20, max: 100, step: 1 },
  { key: "sourceScreenDistance", label: "Khoảng cách nguồn–màn", unit: "cm quy ước", min: 45, max: 120, step: 1 },
  { key: "flashLifetime", label: "Thời gian tồn tại chớp", unit: "s", min: 0.2, max: 2, step: 0.1 },
  { key: "emissionRate", label: "Tốc độ phát hạt", unit: "hạt/s", min: 0.4, max: 5, step: 0.1 },
];

const QUICK_PRESETS: Array<{
  label: string;
  patch: Partial<RutherfordParams>;
  observationView?: ObservationView;
}> = [
  { label: "Nitrogen N₂", patch: { gasCode: 4 }, observationView: "apparatus" },
  { label: "Oxygen", patch: { gasCode: 1 } },
  { label: "Năng lượng α thấp", patch: { alphaEnergy: 42 } },
  { label: "Năng lượng α cao", patch: { alphaEnergy: 98 } },
  { label: "Mặc định", patch: DEFAULT_RUTHERFORD_PARAMS, observationView: "apparatus" },
];

const GAS_EXPLANATIONS = {
  oxygen: "Buồng chỉ có các hạt nhân oxygen. α có thể đi lọt hoặc tán xạ nhẹ khi đi sát hạt nhân O, nhưng không tạo phản ứng proton đặc trưng của ¹⁴N.",
  nitrogen: "Buồng chứa nhiều hạt nhân ¹⁴N. Chỉ khi quỹ đạo α đi trúng vùng va chạm rất nhỏ của một hạt nhân thì phản ứng mới tạo proton.",
} as const;

function ModeChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${active ? "border-[#d97757] bg-[#fff4ef] text-[#c96545]" : "border-[#e8e2d9] text-[#6b6b6b] hover:border-[#d97757] hover:text-[#c96545]"}`}
    >
      {children}
    </button>
  );
}

function MetricGrid({ metrics }: { metrics: RutherfordMetrics }) {
  const values = [
    ["Trạng thái", RUTHERFORD_PHASE_LABELS[metrics.phase]],
    ["Loại khí", GAS_LABELS[metrics.currentGas]],
    ["Hạt α đã phát", String(metrics.counters.alphasEmitted)],
    ["Hạt α bị hấp thụ", String(metrics.counters.alphasAbsorbed)],
    ["Va chạm hạt nhân", String(metrics.counters.nuclearCollisions)],
    ["Proton sinh ra", String(metrics.counters.protonsCreated)],
    ["Proton tới màn", String(metrics.counters.protonsReached)],
    ["Số chớp sáng", String(metrics.counters.flashes)],
    ["Tỉ lệ phản ứng", `${(metrics.reactionRate * 100).toFixed(2)}%`],
    ["Năng lượng hạt hiện tại", metrics.currentEnergy > 0 ? `${(metrics.currentEnergy * 100).toFixed(0)}%` : "—"],
    ["Độ dày lớp chắn", `${metrics.absorberThickness.toFixed(2)} mm quy ước`],
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

function GasFlashChart({ metrics }: { metrics: RutherfordMetrics }) {
  const rows = gasComparison(metrics);
  const maxValue = Math.max(1, ...rows.map((row) => Math.max(row.flashes, row.protonsReached)));
  return (
    <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
      <p className="mb-3 text-[13px] font-semibold text-[#171717]">Số chớp theo loại khí</p>
      <svg viewBox="0 0 280 160" className="h-44 w-full" role="img" aria-label="Biểu đồ số chớp ZnS lấy từ dữ liệu các lần chạy hiện tại">
        <path d="M30 10V132H270" fill="none" stroke="#d8d1c9" />
        {rows.map((row, index) => {
          const x = 44 + index * 45;
          const height = (row.flashes / maxValue) * 104;
          return (
            <g key={row.gas}>
              <rect x={x} y={132 - height} width="24" height={height} rx="5" fill={row.gas === "nitrogen" ? "#06b6d4" : "#94a3b8"} opacity=".78" />
              <text x={x + 12} y={147} textAnchor="middle" fontSize="8" fill="#6b6b6b">{GAS_SHORT_LABELS[row.gas]}</text>
              <text x={x + 12} y={Math.max(10, 126 - height)} textAnchor="middle" fontSize="8" fill="#4f4943">{row.flashes}</text>
            </g>
          );
        })}
      </svg>
      <p className="text-[10px] leading-relaxed text-[#8a8178]">Cột chỉ dùng số chớp đã tạo thực sự trong từng lần chạy; đổi khí không xóa dữ liệu so sánh, còn Reset sẽ xóa toàn bộ.</p>
    </div>
  );
}

function ProtonHistoryChart({ metrics }: { metrics: RutherfordMetrics }) {
  const history = metrics.history;
  const firstTime = history[0]?.time ?? 0;
  const duration = Math.max(1, (history[history.length - 1]?.time ?? 1) - firstTime);
  const maxValue = Math.max(1, ...history.map((sample) => sample.protonsReached));
  const path = history.map((sample, index) => {
    const x = 28 + ((sample.time - firstTime) / duration) * 238;
    const y = 126 - (sample.protonsReached / maxValue) * 102;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
      <p className="mb-3 text-[13px] font-semibold text-[#171717]">Proton tới màn theo thời gian</p>
      <svg viewBox="0 0 280 150" className="h-40 w-full" role="img" aria-label="Đồ thị tích lũy proton tới màn ZnS theo thời gian chạy">
        <path d="M28 14V126H268" fill="none" stroke="#d8d1c9" />
        {path && <path d={path} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        <text x="26" y="142" fontSize="8" fill="#8a8178">0 s</text>
        <text x="244" y="142" fontSize="8" fill="#8a8178">{duration.toFixed(0)} s</text>
      </svg>
    </div>
  );
}

function RangeChart({ metrics }: { metrics: RutherfordMetrics }) {
  const rows = [
    { label: "Hạt α", value: average(metrics.ranges.alpha), color: "#f59e0b" },
    { label: "Proton", value: average(metrics.ranges.proton), color: "#06b6d4" },
    { label: "¹⁷O", value: average(metrics.ranges.oxygen17), color: "#c084fc" },
  ];
  const maxValue = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
      <p className="mb-3 text-[13px] font-semibold text-[#171717]">Tầm bay tương đối đã đo</p>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[48px_1fr_54px] items-center gap-2 text-[10px]">
            <span className="font-semibold text-[#4f4943]">{row.label}</span>
            <div className="h-2 rounded-full bg-[#f0ece5]"><div className="h-2 rounded-full" style={{ width: `${(row.value / maxValue) * 100}%`, backgroundColor: row.color }} /></div>
            <span className="text-right tabular-nums text-[#8a8178]">{row.value > 0 ? row.value.toFixed(0) : "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalysisPanel({ metrics }: { metrics: RutherfordMetrics }) {
  const rows = gasComparison(metrics);
  const absorptionRate = metrics.counters.alphasEmitted > 0
    ? metrics.counters.alphasAbsorbed / metrics.counters.alphasEmitted
    : 0;
  return (
    <div className="space-y-4">
      <MetricGrid metrics={metrics} />
      <GasFlashChart metrics={metrics} />
      <ProtonHistoryChart metrics={metrics} />
      <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
        <div className="flex items-center justify-between text-[13px]"><b>Tỉ lệ hạt α bị hấp thụ</b><span className="font-semibold text-[#c96545]">{(absorptionRate * 100).toFixed(1)}%</span></div>
        <div className="mt-3 h-2 rounded-full bg-[#f0ece5]"><div className="h-2 rounded-full bg-[#e8724a]" style={{ width: `${absorptionRate * 100}%` }} /></div>
      </div>
      <RangeChart metrics={metrics} />
      <div className="overflow-hidden rounded-[12px] border border-[#e8e2d9] bg-white">
        <table className="w-full text-left text-[10px]">
          <thead className="bg-[#faf9f7] text-[#8a8178]"><tr><th className="px-2 py-2">Khí</th><th className="px-2 py-2">α phát</th><th className="px-2 py-2">Va chạm</th><th className="px-2 py-2">Tới màn</th><th className="px-2 py-2">Chớp</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.gas} className="border-t border-[#f0ece5]"><td className="px-2 py-2 font-semibold">{GAS_SHORT_LABELS[row.gas]}</td><td className="px-2 py-2 tabular-nums">{row.emitted}</td><td className="px-2 py-2 tabular-nums">{row.collisions}</td><td className="px-2 py-2 tabular-nums">{row.protonsReached}</td><td className="px-2 py-2 tabular-nums">{row.flashes}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
        <p className="mb-3 text-[13px] font-semibold text-[#171717]">Timeline sự kiện thực tế gần nhất</p>
        {metrics.events.length > 0 ? metrics.events.slice(-12).map((event, index) => (
          <div key={`${event.time}-${event.phase}-${index}`} className="mt-2 flex gap-2 text-xs"><span className="w-12 shrink-0 font-sans text-[#c96545]">{event.time.toFixed(1)} s</span><span className="text-[#4f4943]">{event.label}</span></div>
        )) : <p className="text-xs text-[#8a8178]">Nhấn Play hoặc “Phát một hạt α” để ghi timeline.</p>}
      </div>
      <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4 text-center">
        <p className="font-sans text-xl font-bold text-[#171717]">¹⁴₇N + ⁴₂He → ¹⁷₈O + ¹₁H</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-left text-xs"><div className="rounded-[8px] bg-emerald-50 p-3 text-emerald-900"><b>Số khối</b><br />14 + 4 = 17 + 1</div><div className="rounded-[8px] bg-emerald-50 p-3 text-emerald-900"><b>Điện tích hạt nhân</b><br />7 + 2 = 8 + 1</div></div>
      </div>
      <p className="rounded-[10px] bg-[#faf9f7] p-3 text-xs leading-relaxed text-[#4f4943]">{rutherfordConclusion(metrics)}</p>
      <p className="rounded-[10px] bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900">Khi các hạt α năng lượng cao đi qua khí nitơ, một số rất ít hạt có thể tương tác với hạt nhân nitơ và làm phát ra proton. Proton có tầm bay dài hơn, vượt qua lớp hấp thụ và tạo chớp sáng trên màn ZnS. Theo cách hiểu hiện đại, hạt nhân nitơ hấp thụ hạt α và biến đổi thành oxygen-17, đồng thời phát ra một proton.</p>
    </div>
  );
}

export function RutherfordNitrogenExperiment({
  preset,
  onBack,
}: {
  preset: RutherfordNitrogenPreset;
  onBack: () => void;
}) {
  const [params, setParams] = useState<RutherfordParams>(DEFAULT_RUTHERFORD_PARAMS);
  const [observationView, setObservationView] = useState<ObservationView>("apparatus");
  const [showTrails, setShowTrails] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [resetSignal, setResetSignal] = useState(0);
  const [tab, setTab] = useState<SimulationTab>("params");
  const [edited, setEdited] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [command, setCommand] = useState<{ type: RutherfordCommand; token: number }>({ type: "start", token: 0 });
  const [metrics, setMetrics] = useState(() => rutherfordMetrics(createRutherfordState(DEFAULT_RUTHERFORD_PARAMS), DEFAULT_RUTHERFORD_PARAMS));

  const panelValues = useMemo<Record<string, number>>(() => ({ ...params }), [params]);
  const sendCommand = (type: RutherfordCommand) => setCommand((current) => ({ type, token: current.token + 1 }));
  const reset = () => {
    setRunning(false);
    setSpeed(1);
    setResetSignal((value) => value + 1);
  };
  const restoreDefaults = () => {
    setParams(DEFAULT_RUTHERFORD_PARAMS);
    setObservationView("apparatus");
    setShowTrails(true);
    setShowLabels(true);
    setEdited(false);
    reset();
  };
  const changeRunning = (next: boolean) => {
    sendCommand(next ? (metrics.phase === "paused" ? "resume" : "start") : "pause");
    setRunning(next);
  };
  const emitOne = () => {
    sendCommand("emitOne");
    setRunning(true);
  };
  const applyPreset = (item: (typeof QUICK_PRESETS)[number]) => {
    setParams((current) => ({ ...current, ...item.patch }));
    if (item.observationView) setObservationView(item.observationView);
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
              <RutherfordNitrogenScene
                params={params}
                running={running}
                speed={speed}
                resetSignal={resetSignal}
                command={command}
                observationView={observationView}
                showTrails={showTrails}
                showLabels={showLabels}
                onData={setMetrics}
                onComplete={() => setRunning(false)}
              />
              <SimulationToolbar running={running} speed={speed} onRunningChange={changeRunning} onReset={reset} onSpeedChange={setSpeed} />
            </div>
            <p className="mt-3 shrink-0 text-center text-[13px] leading-relaxed text-[#6b6b6b]"><b>Rutherford bắn phá hạt nhân nitơ bằng hạt α.</b> Các chấm và quỹ đạo là lớp minh họa chuyển động hạt, không phải tia laser phát sáng.</p>
          </section>

          <aside className="flex max-h-[58vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-[#e8e2d9] bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
            <SimulationTabs value={tab} onChange={setTab} />
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {tab === "params" && (
                <div className="space-y-4">
                  <p className="rounded-[10px] bg-[#faf9f7] p-3 text-xs leading-relaxed text-[#6b6b6b]">Rutherford cho hạt α đi qua khí nitơ. Một số rất ít va chạm hạt nhân làm phát ra proton có tầm bay dài. Proton vượt qua lớp hấp thụ và tạo chớp sáng trên màn ZnS.</p>
                  <div className="rounded-[10px] border border-[#e8e2d9] bg-white p-3 text-xs leading-relaxed text-[#6b6b6b]"><b className="text-[#4f4943]">Hai lớp quan sát</b><p className="mt-2">Thiết bị Rutherford tái hiện điều người quan sát đo được qua chớp ZnS. Giải thích hạt nhân phóng đại phản ứng để chỉ ra α bị hấp thụ, proton bay xa và ¹⁷O chỉ đi quãng ngắn.</p></div>
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#8a8178]">Chế độ hiển thị</p>
                    <div className="flex flex-wrap gap-1.5"><ModeChip active={observationView === "apparatus"} onClick={() => setObservationView("apparatus")}>Thiết bị Rutherford</ModeChip><ModeChip active={observationView === "nuclearExplanation"} onClick={() => setObservationView("nuclearExplanation")}>Giải thích hạt nhân</ModeChip></div>
                  </div>
                  <p className="rounded-[10px] bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">Mô phỏng dùng xác suất tự nhiên theo hình học: α chỉ phản ứng khi quỹ đạo đi trúng vùng va chạm nhỏ quanh một hạt nhân ¹⁴N. Hình hạt nhân được phóng đại để nhìn rõ, còn vùng va chạm tính toán nhỏ hơn nhiều.</p>
                  <div className="flex flex-wrap gap-1.5"><ModeChip active={false} onClick={emitOne}>Phát một hạt α</ModeChip><ModeChip active={running} onClick={() => changeRunning(true)}>Phát liên tục</ModeChip><ModeChip active={showTrails} onClick={() => setShowTrails((value) => !value)}>Quỹ đạo</ModeChip><ModeChip active={showLabels} onClick={() => setShowLabels((value) => !value)}>Nhãn</ModeChip></div>
                  <div className="flex flex-wrap gap-1.5">{QUICK_PRESETS.map((item) => <button key={item.label} type="button" onClick={() => applyPreset(item)} className="rounded-full border border-[#e8e2d9] px-3 py-1 text-xs text-[#6b6b6b] transition-colors hover:border-[#d97757] hover:text-[#c96545]">{item.label}</button>)}</div>
                  <div className="rounded-[10px] bg-[#faf9f7] p-3 text-xs leading-relaxed text-[#6b6b6b]"><b>{GAS_LABELS[gasFromCode(params.gasCode)]}:</b> {GAS_EXPLANATIONS[gasFromCode(params.gasCode)]}</div>
                  <ParamPanel schema={PARAM_SCHEMA} values={panelValues} onChange={(key, value) => { setParams((current) => ({ ...current, [key]: value })); setEdited(true); }} />
                  <p className="text-[10px] leading-relaxed text-[#8a8178]">Kích thước hạt nhân, tầm bay và hệ số suy giảm được chuẩn hóa để quan sát rõ; không phải kích thước hay số liệu đo lịch sử chính xác.</p>
                </div>
              )}
              {tab === "analysis" && <AnalysisPanel metrics={metrics} />}
              {tab === "ai" && (
                <div className="space-y-4">
                  <p className="rounded-[10px] bg-amber-50 p-3 text-xs leading-relaxed text-amber-800"><b>Power user.</b> Đây là luồng Sửa bằng AI chung của khu vực mô phỏng; dịch vụ AI thật chưa được kết nối.</p>
                  <div className="flex flex-wrap gap-2">{["Giải thích phản ứng đơn giản hơn", "Hiện rõ proton", "So sánh các loại khí", "Tạo câu hỏi kiểm tra", "Giải thích vai trò lớp hấp thụ", "Hiện bảo toàn số khối và điện tích", "Giảm tốc độ hạt để dễ quan sát"].map((suggestion) => <button key={suggestion} type="button" onClick={() => setAiPrompt(suggestion)} className="rounded-full border border-[#e8e2d9] px-3 py-1 text-xs text-[#6b6b6b] hover:border-[#d97757] hover:text-[#c96545]">{suggestion}</button>)}</div>
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
