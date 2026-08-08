"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, RotateCcw } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  DEFAULT_MAGNETIC_DEFLECTION_PARAMS,
  PARTICLE_START,
  RADIATION_COLORS,
  RADIATION_LABELS,
  SCREEN_X,
  TRACK_BOTTOM,
  TRACK_TOP,
} from "../engines/magnetic-deflection/constants";
import {
  createMagneticDeflectionState,
  magneticDeflectionMetrics,
} from "../engines/magnetic-deflection/physics";
import { MAGNETIC_PHASE_LABELS } from "../engines/magnetic-deflection/state-machine";
import type {
  MagneticDeflectionCommand,
  MagneticDeflectionMetrics,
  MagneticDeflectionParams,
  RadiationType,
} from "../engines/magnetic-deflection/types";
import type { MagneticDeflectionPreset } from "../presets/types";
import { MagneticDeflectionScene } from "../renderers/magnetic-deflection/magnetic-deflection-scene";
import { ParamPanel, type ParamDef } from "../shared/param-panel";
import { SimulationTabs, type SimulationTab } from "../shared/simulation-tabs";
import { SimulationToolbar } from "../shared/simulation-toolbar";

const PARAM_SCHEMA: ParamDef[] = [
  { key: "magneticField", label: "Cảm ứng từ B", unit: "T", min: 0, max: 1.2, step: 0.05 },
  { key: "fieldRegionWidth", label: "Bề rộng vùng từ trường", unit: "%", min: 55, max: 100, step: 1 },
];

const QUICK_PRESETS: Array<{
  label: string;
  patch: Partial<MagneticDeflectionParams>;
}> = [
  { label: "B hướng ra", patch: { magneticField: 0.65, fieldDirection: 1 } },
  { label: "B hướng vào", patch: { magneticField: 0.65, fieldDirection: -1 } },
  { label: "Không có từ trường", patch: { magneticField: 0 } },
  { label: "Từ trường yếu", patch: { magneticField: 0.25 } },
  { label: "Từ trường mạnh", patch: { magneticField: 1.05 } },
  { label: "Động lượng nhỏ", patch: { alphaMomentum: 58, betaMomentum: 58 } },
  { label: "Động lượng lớn", patch: { alphaMomentum: 145, betaMomentum: 145 } },
  { label: "Mặc định", patch: DEFAULT_MAGNETIC_DEFLECTION_PARAMS },
];

const PARTICLE_ORDER: RadiationType[] = ["alpha", "beta", "gamma"];

function formatRadius(value: number): string {
  return Number.isFinite(value) ? `${(value / 100).toFixed(1)} m (quy ước)` : "∞";
}

function formatDeflection(value: number): string {
  if (Math.abs(value) < 0.05) return "0,0 cm";
  return `${Math.abs(value / 4).toFixed(1)} cm ${value < 0 ? "lên" : "xuống"}`;
}

function MetricGrid({ metrics }: { metrics: MagneticDeflectionMetrics }) {
  const values = [
    ["Trạng thái", MAGNETIC_PHASE_LABELS[metrics.phase]],
    ["Cảm ứng từ B", `${metrics.fieldStrength.toFixed(2)} T`],
    ["Chiều từ trường", metrics.fieldDirection === "out" ? "Ra khỏi màn hình ⊙" : "Vào màn hình ⊗"],
    ["Bán kính α", formatRadius(metrics.alphaRadius)],
    ["Bán kính β⁻", formatRadius(metrics.betaRadius)],
    ["Bán kính γ", "∞"],
    ["Độ lệch α", formatDeflection(metrics.alphaDeflection)],
    ["Độ lệch β⁻", formatDeflection(metrics.betaDeflection)],
    ["Độ lệch γ", formatDeflection(metrics.gammaDeflection)],
    ["Lực từ α tương đối", metrics.alphaForce.toFixed(2)],
    ["Lực từ β⁻ tương đối", metrics.betaForce.toFixed(2)],
    ["Số tia tới màn", String(metrics.impacts.length)],
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

function TrajectoryChart({ metrics }: { metrics: MagneticDeflectionMetrics }) {
  const width = 280;
  const height = 150;
  const mapX = (x: number) => 16 + ((x - PARTICLE_START.x) / (SCREEN_X - PARTICLE_START.x)) * 246;
  const mapY = (y: number) => 12 + ((y - TRACK_TOP) / (TRACK_BOTTOM - TRACK_TOP)) * 122;
  const pathData = (type: RadiationType) =>
    metrics.paths[type]
      .map((point, index) => `${index === 0 ? "M" : "L"}${mapX(point.x).toFixed(1)},${mapY(point.y).toFixed(1)}`)
      .join(" ");
  return (
    <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
      <p className="mb-3 text-[13px] font-semibold text-[#171717]">Quỹ đạo của lần chạy hiện tại</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full rounded-[10px] bg-[#0b1324]" role="img" aria-label="Biểu đồ quỹ đạo alpha beta và gamma của lần chạy hiện tại">
        <line x1="16" x2="262" y1={mapY(PARTICLE_START.y)} y2={mapY(PARTICLE_START.y)} stroke="#475569" strokeDasharray="4 4" />
        <line x1="262" x2="262" y1="8" y2="140" stroke="#cbd5e1" strokeWidth="3" />
        {PARTICLE_ORDER.map((type) => {
          const d = pathData(type);
          return d ? <path key={type} d={d} fill="none" stroke={RADIATION_COLORS[type]} strokeWidth={type === "alpha" ? 2.8 : 2.2} strokeLinecap="round" /> : null;
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-[#6b6b6b]">
        {PARTICLE_ORDER.map((type) => <span key={type} className="inline-flex items-center gap-1.5"><span className="h-1.5 w-5 rounded" style={{ backgroundColor: RADIATION_COLORS[type] }} />{RADIATION_LABELS[type]}</span>)}
      </div>
    </div>
  );
}

function DeflectionChart({ metrics }: { metrics: MagneticDeflectionMetrics }) {
  const values: Record<RadiationType, number> = {
    alpha: metrics.alphaDeflection,
    beta: metrics.betaDeflection,
    gamma: metrics.gammaDeflection,
  };
  const max = Math.max(1, ...PARTICLE_ORDER.map((type) => Math.abs(values[type])));
  return (
    <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
      <p className="mb-3 text-[13px] font-semibold text-[#171717]">Độ lệch có dấu tại màn</p>
      <svg viewBox="0 0 280 132" className="h-36 w-full" role="img" aria-label="Biểu đồ độ lệch có dấu của ba tia">
        <line x1="78" x2="270" y1="65" y2="65" stroke="#b8aea5" />
        {PARTICLE_ORDER.map((type, index) => {
          const value = values[type];
          const length = Math.abs(value) / max * 52;
          const x = 98 + index * 62;
          return (
            <g key={type}>
              <rect x={x} y={value < 0 ? 65 - length : 65} width="24" height={length || 1} rx="5" fill={RADIATION_COLORS[type]} opacity="0.82" />
              <text x={x + 12} y="124" textAnchor="middle" fontSize="10" fill="#6b6b6b">{type === "alpha" ? "α" : type === "beta" ? "β⁻" : "γ"}</text>
              <text x={x + 12} y={value < 0 ? Math.max(10, 59 - length) : Math.min(112, 78 + length)} textAnchor="middle" fontSize="8" fill="#4f4943">{(value / 4).toFixed(1)}</text>
            </g>
          );
        })}
        <text x="4" y="16" fontSize="9" fill="#8a8178">lên (−)</text>
        <text x="4" y="116" fontSize="9" fill="#8a8178">xuống (+)</text>
      </svg>
    </div>
  );
}

function AnalysisPanel({ metrics }: { metrics: MagneticDeflectionMetrics }) {
  return (
    <div className="space-y-4">
      <MetricGrid metrics={metrics} />
      <TrajectoryChart metrics={metrics} />
      <DeflectionChart metrics={metrics} />
      <div className="overflow-hidden rounded-[12px] border border-[#e8e2d9] bg-white">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-[#faf9f7] text-[#8a8178]"><tr><th className="px-3 py-2">Tia</th><th className="px-3 py-2">Điện tích</th><th className="px-3 py-2">Kết quả</th></tr></thead>
          <tbody>
            <tr className="border-t border-[#f0ece5]"><td className="px-3 py-2 font-semibold">α</td><td className="px-3 py-2">+2e</td><td className="px-3 py-2">Lệch ít</td></tr>
            <tr className="border-t border-[#f0ece5]"><td className="px-3 py-2 font-semibold">β⁻</td><td className="px-3 py-2">−e</td><td className="px-3 py-2">Lệch mạnh, ngược α</td></tr>
            <tr className="border-t border-[#f0ece5]"><td className="px-3 py-2 font-semibold">γ</td><td className="px-3 py-2">0</td><td className="px-3 py-2">Đi thẳng</td></tr>
          </tbody>
        </table>
      </div>
      <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
        <p className="text-center font-libertine text-lg font-bold text-[#171717]">F⃗ = q(v⃗ × B⃗) &nbsp;·&nbsp; r = p/(|q|B)</p>
        <p className="mt-2 text-xs leading-relaxed text-[#6b6b6b]">Tăng B làm bán kính quỹ đạo giảm nên tia cong mạnh hơn. Tăng động lượng p làm bán kính tăng nên tia lệch ít hơn. Với q = 0, tia γ không chịu lực Lorentz.</p>
      </div>
      <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
        <p className="mb-2 text-[13px] font-semibold">Timeline</p>
        {metrics.events.length > 0 ? metrics.events.map((event, index) => (
          <div key={`${event.phase}-${index}`} className="mt-2 flex gap-2 text-xs"><span className="w-12 shrink-0 font-mono text-[#c96545]">{event.time.toFixed(1)} s</span><span className="text-[#4f4943]">{event.label}</span></div>
        )) : <p className="text-xs text-[#8a8178]">Nhấn Play để ghi lại quá trình.</p>}
      </div>
      <p className="rounded-[10px] bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900">Trong từ trường, tia α và β⁻ bị lệch theo hai phía ngược nhau vì chúng mang điện trái dấu. Tia β⁻ cong mạnh hơn, còn tia γ không bị lệch vì không mang điện. Đảo chiều từ trường làm hai hướng lệch của α và β⁻ đổi chỗ.</p>
    </div>
  );
}

export function MagneticDeflectionExperiment({
  preset,
  onBack,
}: {
  preset: MagneticDeflectionPreset;
  onBack: () => void;
}) {
  const [params, setParams] = useState<MagneticDeflectionParams>(DEFAULT_MAGNETIC_DEFLECTION_PARAMS);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [resetSignal, setResetSignal] = useState(0);
  const [tab, setTab] = useState<SimulationTab>("params");
  const [edited, setEdited] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [command, setCommand] = useState<{ type: MagneticDeflectionCommand; token: number }>({ type: "start", token: 0 });
  const [metrics, setMetrics] = useState(() => magneticDeflectionMetrics(createMagneticDeflectionState(), DEFAULT_MAGNETIC_DEFLECTION_PARAMS));

  const panelValues = useMemo<Record<string, number>>(() => ({ ...params }), [params]);
  const sendCommand = (type: MagneticDeflectionCommand) => setCommand((current) => ({ type, token: current.token + 1 }));
  const reset = () => {
    setRunning(false);
    setSpeed(1);
    setResetSignal((value) => value + 1);
  };
  const restoreDefaults = () => {
    setParams(DEFAULT_MAGNETIC_DEFLECTION_PARAMS);
    setEdited(false);
    reset();
  };
  const changeRunning = (next: boolean) => {
    if (next) sendCommand(metrics.phase === "paused" ? "resume" : "start");
    else sendCommand("pause");
    setRunning(next);
  };
  const applyPreset = (patch: Partial<MagneticDeflectionParams>) => {
    setParams((current) => ({ ...current, ...patch }));
    setEdited(true);
    reset();
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
              <MagneticDeflectionScene params={params} running={running} speed={speed} resetSignal={resetSignal} command={command} onData={setMetrics} onComplete={() => setRunning(false)} />
              <SimulationToolbar running={running} speed={speed} onRunningChange={changeRunning} onReset={reset} onSpeedChange={setSpeed} />
            </div>
            <p className="mt-3 shrink-0 text-center text-[13px] leading-relaxed text-[#6b6b6b]">Từ trường làm α và β⁻ cong về hai phía ngược nhau; γ trung hòa nên đi thẳng. Các đường màu chỉ minh họa quỹ đạo, không phải màu thật của bức xạ.</p>
          </section>

          <aside className="flex max-h-[58vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-[#e8e2d9] bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
            <SimulationTabs value={tab} onChange={setTab} />
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {tab === "params" && (
                <div className="space-y-4">
                  <p className="rounded-[10px] bg-[#faf9f7] p-3 text-xs leading-relaxed text-[#6b6b6b]">Trong vùng từ trường đều vuông góc với mặt phẳng hình, lực Lorentz luôn vuông góc vận tốc. Vì vậy α và β⁻ chuyển động theo cung cong ngược phía, còn γ đi thẳng.</p>
                  <div className="rounded-[10px] border border-[#e8e2d9] bg-white p-3 text-xs leading-relaxed text-[#6b6b6b]"><b className="text-[#4f4943]">Cách đọc ký hiệu</b><p className="mt-2">⊙: B hướng ra khỏi màn hình.<br />⊗: B hướng vào màn hình.<br />Các vòng có chấm hoặc dấu × là ký hiệu vector B, không phải hạt vật chất.</p></div>
                  <div className="flex flex-wrap gap-1.5">{QUICK_PRESETS.map((item) => <button key={item.label} type="button" onClick={() => applyPreset(item.patch)} className="rounded-full border border-[#e8e2d9] px-3 py-1 text-xs text-[#6b6b6b] transition-colors hover:border-[#d97757] hover:text-[#c96545]">{item.label}</button>)}</div>
                  <ParamPanel schema={PARAM_SCHEMA} values={panelValues} onChange={(key, value) => { setParams((current) => ({ ...current, [key]: value })); setEdited(true); reset(); }} />
                  <p className="text-[10px] leading-relaxed text-[#8a8178]">Hình học quỹ đạo được chuẩn hóa để dễ quan sát. Quan hệ r ∝ p/(|q|B), dấu điện tích và chiều lực Lorentz được giữ đúng.</p>
                </div>
              )}
              {tab === "analysis" && <AnalysisPanel metrics={metrics} />}
              {tab === "ai" && (
                <div className="space-y-4">
                  <p className="rounded-[10px] bg-amber-50 p-3 text-xs leading-relaxed text-amber-800"><b>Power user.</b> Đây là luồng Sửa bằng AI chung của khu vực mô phỏng; dịch vụ AI thật chưa được kết nối.</p>
                  <div className="flex flex-wrap gap-2">{["Giải thích lực Lorentz đơn giản hơn", "Đảo chiều từ trường", "Giải thích vì sao β lệch nhiều hơn", "So sánh khi B bằng 0", "Tạo câu hỏi kiểm tra", "Hiện quy tắc bàn tay trái"].map((suggestion) => <button key={suggestion} type="button" onClick={() => setAiPrompt(suggestion)} className="rounded-full border border-[#e8e2d9] px-3 py-1 text-xs text-[#6b6b6b] hover:border-[#d97757] hover:text-[#c96545]">{suggestion}</button>)}</div>
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
