"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, RotateCcw } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { DEFAULT_TORSION_BALANCE_PARAMS } from "../engines/coulomb-torsion-balance/constants";
import {
  createTorsionBalanceState,
  theoreticalForceMicroN,
  torsionBalanceMetrics,
} from "../engines/coulomb-torsion-balance/physics";
import { TORSION_PHASE_LABELS } from "../engines/coulomb-torsion-balance/state-machine";
import type {
  TorsionBalanceCommand,
  TorsionBalanceMetrics,
  TorsionBalanceParams,
} from "../engines/coulomb-torsion-balance/types";
import type { CoulombTorsionBalancePreset } from "../presets/types";
import { CoulombTorsionBalanceScene } from "../renderers/coulomb-torsion-balance/coulomb-torsion-balance-scene";
import { ParamPanel, type ParamDef } from "../shared/param-panel";
import { SimulationTabs, type SimulationTab } from "../shared/simulation-tabs";
import { SimulationToolbar } from "../shared/simulation-toolbar";

const PARAM_SCHEMA: ParamDef[] = [
  { key: "movingCharge", label: "Điện tích quả cầu di động", unit: "nC", min: -1.2, max: 1.2, step: 0.05 },
  { key: "fixedCharge", label: "Điện tích quả cầu cố định", unit: "nC", min: -1.2, max: 1.2, step: 0.05 },
  { key: "initialSeparation", label: "Khoảng cách ban đầu", unit: "cm", min: 2.2, max: 10, step: 0.2 },
];

const interactionLabel = (value: TorsionBalanceMetrics["interaction"]) =>
  value === "repulsion" ? "Đẩy nhau (cùng dấu)" : value === "attraction" ? "Hút nhau (trái dấu)" : "Không có lực điện";

function MetricGrid({ metrics }: { metrics: TorsionBalanceMetrics }) {
  const values = [
    ["Trạng thái", TORSION_PHASE_LABELS[metrics.phase]],
    ["Tương tác", interactionLabel(metrics.interaction)],
    ["Góc lệch θ", `${metrics.angleDegrees.toFixed(2)}°`],
    ["Khoảng cách r", `${metrics.separationCm.toFixed(2)} cm`],
    ["Lực Coulomb", `${metrics.forceMicroN.toFixed(3)} µN`],
    ["Mô-men điện", `${metrics.electricTorqueNanoNm.toFixed(2)} nN·m`],
    ["Mô-men xoắn", `${metrics.torsionTorqueNanoNm.toFixed(2)} nN·m`],
    ["Tốc độ góc", `${metrics.angularVelocityDegrees.toFixed(2)} °/s`],
    ["Điện tích đã truyền", `${metrics.chargePercent.toFixed(0)}%`],
    ["Sai lệch cân bằng", `${metrics.equilibriumError.toFixed(2)} nN·m`],
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

function AngleChart({ metrics }: { metrics: TorsionBalanceMetrics }) {
  const history = metrics.history;
  const width = 280;
  const height = 150;
  const maxTime = Math.max(1, history[history.length - 1]?.time ?? 1);
  const maxAngle = Math.max(5, ...history.map((point) => Math.abs(point.angle)));
  const path = history
    .map((point, index) => {
      const x = 18 + (point.time / maxTime) * 244;
      const y = 72 - (point.angle / maxAngle) * 52;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
      <p className="mb-3 text-[13px] font-semibold text-[#171717]">Góc quay của lần đo hiện tại</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" role="img" aria-label="Đồ thị góc quay theo thời gian của cân xoắn">
        <line x1="18" x2="266" y1="72" y2="72" stroke="#d8d1c9" />
        <line x1="18" x2="18" y1="12" y2="132" stroke="#d8d1c9" />
        {[0.25, 0.5, 0.75, 1].map((tick) => <line key={tick} x1={18 + tick * 244} x2={18 + tick * 244} y1="12" y2="132" stroke="#f0ece5" />)}
        {path ? <path d={path} fill="none" stroke="#c96545" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /> : null}
        <text x="5" y="13" fontSize="9" fill="#8a8178">θ</text>
        <text x="258" y="146" fontSize="9" fill="#8a8178">t</text>
      </svg>
    </div>
  );
}

function InverseSquareTable({ params }: { params: TorsionBalanceParams }) {
  const base = params.initialSeparation;
  const distances = [base * 0.75, base, base * 1.5, base * 2];
  return (
    <div className="overflow-hidden rounded-[12px] border border-[#e8e2d9] bg-white">
      <div className="px-4 py-3 text-[13px] font-semibold text-[#171717]">So sánh định luật nghịch đảo bình phương</div>
      <table className="w-full text-left text-[11px]">
        <thead className="bg-[#faf9f7] text-[#8a8178]">
          <tr><th className="px-3 py-2">r (cm)</th><th className="px-3 py-2">F (µN)</th><th className="px-3 py-2">F·r²</th></tr>
        </thead>
        <tbody>
          {distances.map((distance) => {
            const force = theoreticalForceMicroN(params.movingCharge, params.fixedCharge, distance);
            return (
              <tr key={distance} className="border-t border-[#f0ece5]">
                <td className="px-3 py-2 tabular-nums">{distance.toFixed(2)}</td>
                <td className="px-3 py-2 tabular-nums">{force.toFixed(3)}</td>
                <td className="px-3 py-2 tabular-nums">{(force * distance * distance).toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AnalysisPanel({
  metrics,
  params,
}: {
  metrics: TorsionBalanceMetrics;
  params: TorsionBalanceParams;
}) {
  return (
    <div className="space-y-4">
      <MetricGrid metrics={metrics} />
      <AngleChart metrics={metrics} />
      <InverseSquareTable params={params} />
      <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
        <p className="text-center font-sans text-lg font-bold text-[#171717]">F = k|q₁q₂|/r²</p>
        <p className="mt-2 text-center font-sans text-base font-bold text-[#4f4943]">τ<sub>điện</sub> + τ<sub>xoắn</sub> = 0</p>
        <p className="mt-2 text-xs leading-relaxed text-[#6b6b6b]">Lực điện làm thanh quay, đồng thời sợi bạc bị xoắn và tạo mô-men ngược chiều. Khi hai mô-men cân bằng, góc lệch ổn định cho phép suy ra lực điện.</p>
      </div>
      <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
        <p className="mb-2 text-[13px] font-semibold">Tiến trình thí nghiệm</p>
        {metrics.events.length > 0 ? metrics.events.map((event, index) => (
          <div key={`${event.phase}-${index}`} className="mt-2 flex gap-2 text-xs">
            <span className="w-12 shrink-0 font-sans text-[#c96545]">{event.time.toFixed(1)} s</span>
            <span className="text-[#4f4943]">{event.label}</span>
          </div>
        )) : <p className="text-xs text-[#8a8178]">Nhấn Play để bắt đầu chỉnh 0, tích điện và thả cân.</p>}
      </div>
      <p className="rounded-[10px] bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900">Khi khoảng cách giữa hai quả cầu giảm một nửa, lực Coulomb tăng xấp xỉ bốn lần. Điện tích cùng dấu làm quả cầu di động quay ra xa; điện tích trái dấu làm nó quay về phía quả cầu cố định.</p>
    </div>
  );
}

export function CoulombTorsionBalanceExperiment({
  preset,
  onBack,
}: {
  preset: CoulombTorsionBalancePreset;
  onBack: () => void;
}) {
  const [params, setParams] = useState<TorsionBalanceParams>(DEFAULT_TORSION_BALANCE_PARAMS);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [resetSignal, setResetSignal] = useState(0);
  const [tab, setTab] = useState<SimulationTab>("params");
  const [edited, setEdited] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [command, setCommand] = useState<{ type: TorsionBalanceCommand; token: number }>({ type: "start", token: 0 });
  const [metrics, setMetrics] = useState(() => torsionBalanceMetrics(createTorsionBalanceState(), DEFAULT_TORSION_BALANCE_PARAMS));

  const panelValues = useMemo<Record<string, number>>(() => ({ ...params }), [params]);
  const sendCommand = (type: TorsionBalanceCommand) => setCommand((current) => ({ type, token: current.token + 1 }));
  const reset = () => {
    setRunning(false);
    setSpeed(1);
    setResetSignal((value) => value + 1);
  };
  const restoreDefaults = () => {
    setParams(DEFAULT_TORSION_BALANCE_PARAMS);
    setEdited(false);
    reset();
  };
  const changeRunning = (next: boolean) => {
    if (next) sendCommand(metrics.phase === "paused" ? "resume" : "start");
    else sendCommand("pause");
    setRunning(next);
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
              <CoulombTorsionBalanceScene params={params} running={running} speed={speed} resetSignal={resetSignal} command={command} onData={setMetrics} onComplete={() => setRunning(false)} />
              <SimulationToolbar running={running} speed={speed} onRunningChange={changeRunning} onReset={reset} onSpeedChange={setSpeed} />
            </div>
            <p className="mt-3 shrink-0 text-center text-[13px] leading-relaxed text-[#6b6b6b]">Cân xoắn biến lực điện rất nhỏ thành một góc quay có thể đo được: lực Coulomb làm thanh quay, còn sợi bạc xoắn lại để đưa hệ về cân bằng.</p>
          </section>

          <aside className="flex max-h-[58vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-[#e8e2d9] bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
            <SimulationTabs value={tab} onChange={setTab} />
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {tab === "params" && (
                <div className="space-y-4">
                  <p className="rounded-[10px] bg-[#faf9f7] p-3 text-xs leading-relaxed text-[#6b6b6b]">Hai quả cầu nhỏ được tích điện. Quả cầu cố định tác dụng lực lên quả cầu gắn ở đầu thanh. Thanh quay làm sợi bạc bị xoắn; mô-men xoắn tăng dần cho tới khi cân bằng lực điện.</p>
                  <div className="rounded-[10px] border border-[#e8e2d9] bg-white p-3 text-xs leading-relaxed text-[#6b6b6b]"><b className="text-[#4f4943]">Ba phép thử cần quan sát</b><div className="mt-2 space-y-1.5"><p>• Đổi dấu một điện tích → lực đổi từ đẩy sang hút.</p><p>• Tăng gấp đôi một điện tích → lực tăng gấp đôi.</p><p>• Tăng khoảng cách gấp đôi → lực giảm còn khoảng 1/4.</p></div></div>
                  <ParamPanel schema={PARAM_SCHEMA} values={panelValues} onChange={(key, value) => { setParams((current) => ({ ...current, [key]: value })); setEdited(true); reset(); }} />
                  <p className="text-[10px] leading-relaxed text-[#8a8178]">Kích thước quả cầu và hình học được phóng đại để dễ quan sát. Lực điện, chiều hút/đẩy và quan hệ nghịch đảo bình phương được tính từ các tham số hiện tại.</p>
                </div>
              )}
              {tab === "analysis" && <AnalysisPanel metrics={metrics} params={params} />}
              {tab === "ai" && (
                <div className="space-y-4">
                  <p className="rounded-[10px] bg-amber-50 p-3 text-xs leading-relaxed text-amber-800"><b>Power user.</b> Đây là luồng Sửa bằng AI chung của khu vực mô phỏng; dịch vụ AI thật chưa được kết nối.</p>
                  <div className="flex flex-wrap gap-2">{["Giải thích cân xoắn đơn giản hơn", "Cho thấy hai mô-men cân bằng", "So sánh hút và đẩy", "Giải thích quy luật 1/r²", "Tạo câu hỏi kiểm tra", "So sánh cân Coulomb và cân Cavendish"].map((suggestion) => <button key={suggestion} type="button" onClick={() => setAiPrompt(suggestion)} className="rounded-full border border-[#e8e2d9] px-3 py-1 text-xs text-[#6b6b6b] hover:border-[#d97757] hover:text-[#c96545]">{suggestion}</button>)}</div>
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
