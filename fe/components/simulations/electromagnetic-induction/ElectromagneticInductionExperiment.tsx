"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ArrowLeftRight, ChevronLeft, RotateCcw } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { DEFAULT_ELECTROMAGNETIC_INDUCTION_PARAMS } from "../engines/electromagnetic-induction/constants";
import {
  inductionMetrics,
  initialInductionState,
} from "../engines/electromagnetic-induction/physics";
import { INDUCTION_PHASE_LABELS } from "../engines/electromagnetic-induction/state-machine";
import type {
  ElectromagneticInductionMetrics,
  ElectromagneticInductionParams,
} from "../engines/electromagnetic-induction/types";
import type { ElectromagneticInductionPreset } from "../presets/types";
import { ParamPanel } from "../shared/param-panel";
import { SimulationTabs, type SimulationTab } from "../shared/simulation-tabs";
import { SimulationToolbar } from "../shared/simulation-toolbar";

const ElectromagneticInductionScene = dynamic(
  () => import("../renderers/electromagnetic-induction/scene-konva-electromagnetic-induction")
    .then((module) => module.SceneKonvaElectromagneticInduction),
  { ssr: false },
);

function MetricGrid({ metrics }: { metrics: ElectromagneticInductionMetrics }) {
  const lenz = Math.abs(metrics.fluxRate) < 1e-4
    ? "Không có biến thiên"
    : metrics.fluxRate > 0
      ? "Chống từ thông tăng"
      : "Chống từ thông giảm";
  const values = [
    ["Trạng thái", INDUCTION_PHASE_LABELS[metrics.phase]],
    ["Vị trí nam châm", `${metrics.magnetX.toFixed(2)} đv`],
    ["Vận tốc", `${metrics.magnetVelocity.toFixed(2)} đv/s`],
    ["Từ thông mỗi vòng Φ", `${(metrics.fluxPerTurn * 1000).toFixed(3)} mWb`],
    ["Liên kết từ thông NΦ", `${(metrics.fluxLinkage * 1000).toFixed(2)} mWb·vòng`],
    ["d(NΦ)/dt", `${metrics.fluxRate.toFixed(3)} Wb·vòng/s`],
    ["Suất điện động ε", `${metrics.emf.toFixed(3)} V`],
    ["Dòng cảm ứng I", `${metrics.current.toFixed(4)} A`],
    ["Kim điện kế", `${(metrics.needle * 100).toFixed(0)}%`],
    ["Định luật Lenz", lenz],
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

function FluxEmfChart({ metrics }: { metrics: ElectromagneticInductionMetrics }) {
  const points = metrics.history;
  const startTime = points[0]?.time ?? 0;
  const endTime = points.at(-1)?.time ?? startTime + 1;
  const span = Math.max(0.01, endTime - startTime);
  const maxFlux = Math.max(1e-6, ...points.map((point) => Math.abs(point.fluxLinkage)));
  const maxEmf = Math.max(1e-6, ...points.map((point) => Math.abs(point.emf)));
  const pathFor = (key: "fluxLinkage" | "emf", max: number) => points.map((point, index) => {
    const x = 18 + ((point.time - startTime) / span) * 246;
    const y = 75 - (point[key] / max) * 54;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
      <p className="mb-3 text-[13px] font-semibold text-[#171717]">Từ thông và suất điện động theo thời gian</p>
      <svg viewBox="0 0 280 154" className="h-40 w-full" role="img" aria-label="Đồ thị liên kết từ thông và suất điện động cảm ứng của lần chạy hiện tại">
        <rect x="12" y="12" width="256" height="126" rx="8" fill="#071426" />
        {[33, 54, 75, 96, 117].map((y) => <line key={y} x1="18" x2="264" y1={y} y2={y} stroke="rgba(148,163,184,.16)" />)}
        <line x1="18" x2="264" y1="75" y2="75" stroke="rgba(203,213,225,.5)" strokeDasharray="4 4" />
        {points.length > 1 && <path d={pathFor("fluxLinkage", maxFlux)} fill="none" stroke="#67e8f9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
        {points.length > 1 && <path d={pathFor("emf", maxEmf)} fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
        <text x="20" y="150" fontSize="9" fill="#8a8178">{startTime.toFixed(1)} s</text>
        <text x="240" y="150" fontSize="9" fill="#8a8178">{endTime.toFixed(1)} s</text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-[10px] text-[#6b6b6b]"><span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-5 rounded bg-cyan-300" />NΦ</span><span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-5 rounded bg-amber-400" />ε</span><span>Mỗi đường dùng thang chuẩn hóa riêng.</span></div>
    </div>
  );
}

function AnalysisPanel({
  metrics,
  params,
}: {
  metrics: ElectromagneticInductionMetrics;
  params: ElectromagneticInductionParams;
}) {
  const hasObservation = metrics.peakEmf > 1e-4;
  return (
    <div className="space-y-4">
      <MetricGrid metrics={metrics} />
      <FluxEmfChart metrics={metrics} />
      <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
        <p className="text-center font-sans text-lg font-bold text-[#171717]">Φ = ∫ B⃗·dA⃗</p>
        <p className="mt-1 text-center font-sans text-lg font-bold text-[#171717]">ε = − d(NΦ)/dt &nbsp;·&nbsp; I = ε/R</p>
        <p className="mt-3 text-xs leading-relaxed text-[#6b6b6b]">Dấu trừ là nội dung của định luật Lenz: từ trường do dòng cảm ứng sinh ra luôn chống lại sự biến thiên từ thông, không phải luôn chống lại chính từ trường của nam châm.</p>
      </div>
      <div className="overflow-hidden rounded-[12px] border border-[#e8e2d9] bg-white">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-[#faf9f7] text-[#8a8178]"><tr><th className="px-3 py-2">Thay đổi</th><th className="px-3 py-2">Ảnh hưởng</th></tr></thead>
          <tbody>
            <tr className="border-t border-[#f0ece5]"><td className="px-3 py-2 font-semibold">Tăng tốc nam châm</td><td className="px-3 py-2">|d(NΦ)/dt| và |ε| tăng</td></tr>
            <tr className="border-t border-[#f0ece5]"><td className="px-3 py-2 font-semibold">Tăng số vòng N</td><td className="px-3 py-2">Liên kết từ thông và |ε| tăng</td></tr>
            <tr className="border-t border-[#f0ece5]"><td className="px-3 py-2 font-semibold">Tăng điện trở R</td><td className="px-3 py-2">ε gần như không đổi, |I| giảm</td></tr>
            <tr className="border-t border-[#f0ece5]"><td className="px-3 py-2 font-semibold">Đảo cực nam châm</td><td className="px-3 py-2">Dấu Φ, ε và chiều dòng đảo</td></tr>
          </tbody>
        </table>
      </div>
      <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
        <p className="mb-2 text-[13px] font-semibold">Timeline lần quan sát</p>
        {metrics.events.length > 0 ? metrics.events.slice(-10).map((event, index) => (
          <div key={`${event.time}-${event.phase}-${index}`} className="mt-2 flex gap-2 text-xs"><span className="w-12 shrink-0 font-sans text-[#c96545]">{event.time.toFixed(1)} s</span><span className="text-[#4f4943]">{event.label}</span></div>
        )) : <p className="text-xs text-[#8a8178]">Nhấn Play hoặc kéo nam châm để ghi dữ liệu.</p>}
      </div>
      <p className="rounded-[10px] bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900">
        {hasObservation
          ? `Với ${Math.round(params.turns)} vòng dây, mô phỏng ghi nhận |ε| cực đại ${metrics.peakEmf.toFixed(2)} V và |I| cực đại ${metrics.peakCurrent.toFixed(3)} A. Khi nam châm dừng, từ thông không còn biến thiên nên suất điện động và dòng cảm ứng trở về 0.`
          : "Di chuyển nam châm để quan sát: chỉ sự biến thiên từ thông mới tạo suất điện động cảm ứng; từ thông lớn nhưng không đổi vẫn không tạo dòng cảm ứng."}
      </p>
    </div>
  );
}

export function ElectromagneticInductionExperiment({
  preset,
  onBack,
}: {
  preset: ElectromagneticInductionPreset;
  onBack: () => void;
}) {
  const [params, setParams] = useState<ElectromagneticInductionParams>(DEFAULT_ELECTROMAGNETIC_INDUCTION_PARAMS);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [resetSignal, setResetSignal] = useState(0);
  const [tab, setTab] = useState<SimulationTab>("params");
  const [edited, setEdited] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [poleOrientation, setPoleOrientation] = useState<1 | -1>(1);
  const panelValues = useMemo<Record<string, number>>(() => ({ ...params, poleOrientation }), [params, poleOrientation]);
  const scene = useMemo(() => preset.applyParams(panelValues), [panelValues, preset]);
  const [metrics, setMetrics] = useState<ElectromagneticInductionMetrics>(() =>
    inductionMetrics(initialInductionState(scene, scene.magnetStartX)),
  );

  const reset = () => {
    setRunning(false);
    setSpeed(1);
    setResetSignal((value) => value + 1);
  };
  const restoreDefaults = () => {
    setParams(DEFAULT_ELECTROMAGNETIC_INDUCTION_PARAMS);
    setPoleOrientation(1);
    setEdited(false);
    reset();
  };
  const reverseMagnet = () => {
    setPoleOrientation((current) => current === 1 ? -1 : 1);
    setEdited(true);
    reset();
  };
  const applyPatch = (patch: Partial<ElectromagneticInductionParams>) => {
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
              <ElectromagneticInductionScene scene={scene} running={running} speed={speed} resetSignal={resetSignal} onRunningChange={setRunning} onData={setMetrics} />
              <SimulationToolbar running={running} speed={speed} onRunningChange={setRunning} onReset={reset} onSpeedChange={setSpeed} />
              <button type="button" onClick={reverseMagnet} className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-[9px] border border-[#e8e2d9] bg-white px-3 py-2 text-[11px] font-semibold text-[#4f4943] shadow-sm transition-colors hover:bg-[#f7f3ee]" title="Đảo cực nam châm">
                <ArrowLeftRight className="h-3.5 w-3.5" />Đảo chiều nam châm
              </button>
            </div>
            <p className="mt-3 shrink-0 text-center text-[13px] leading-relaxed text-[#6b6b6b]">Kéo nam châm trực tiếp hoặc nhấn Play để quan sát từ thông biến thiên.</p>
          </section>

          <aside className="flex max-h-[58vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-[#e8e2d9] bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
            <SimulationTabs value={tab} onChange={setTab} />
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {tab === "params" && (
                <div className="space-y-4">
                  <p className="rounded-[10px] bg-[#faf9f7] p-3 text-xs leading-relaxed text-[#6b6b6b]">Khi nam châm chuyển động, từ thông qua cuộn dây thay đổi và tạo suất điện động cảm ứng. Nam châm chuyển động càng nhanh, cuộn càng nhiều vòng thì |ε| càng lớn. Khi nam châm đứng yên, ε = 0 dù từ thông có thể khác 0.</p>
                  <div className="rounded-[10px] border border-[#e8e2d9] bg-white p-3 text-xs leading-relaxed text-[#6b6b6b]"><b className="text-[#4f4943]">Cách quan sát</b><p className="mt-2">So sánh dấu của d(NΦ)/dt với ε, hướng mũi tên từ trường cảm ứng và chiều lệch của kim điện kế khi nam châm đi vào rồi đi ra.</p></div>
                  <div className="flex flex-wrap gap-1.5">{preset.quickPresets?.map((item) => <button key={item.label} type="button" onClick={() => applyPatch(item.params as Partial<ElectromagneticInductionParams>)} className="rounded-full border border-[#e8e2d9] px-3 py-1 text-xs text-[#6b6b6b] transition-colors hover:border-[#d97757] hover:text-[#c96545]">{item.label}</button>)}</div>
                  <ParamPanel schema={preset.params} values={panelValues} onChange={(key, value) => applyPatch({ [key]: value } as Partial<ElectromagneticInductionParams>)} />
                  <p className="text-[10px] leading-relaxed text-[#8a8178]">Các giá trị từ trường và hình học được chuẩn hóa cho mục đích giáo dục. Quan hệ Faraday–Lenz, ảnh hưởng của N, R, tốc độ và việc đảo cực được giữ đúng.</p>
                </div>
              )}
              {tab === "analysis" && <AnalysisPanel metrics={metrics} params={params} />}
              {tab === "ai" && (
                <div className="space-y-4">
                  <p className="rounded-[10px] bg-amber-50 p-3 text-xs leading-relaxed text-amber-800"><b>Power user.</b> Đây là luồng Sửa bằng AI chung của khu vực mô phỏng; dịch vụ AI thật chưa được kết nối.</p>
                  <div className="flex flex-wrap gap-2">{["Giải thích định luật Lenz đơn giản hơn", "Làm rõ từ thông và suất điện động", "So sánh nam châm nhanh và chậm", "Giải thích vì sao đứng yên thì kim về 0", "Tạo câu hỏi kiểm tra", "Đảo cực nam châm"].map((suggestion) => <button key={suggestion} type="button" onClick={() => setAiPrompt(suggestion)} className="rounded-full border border-[#e8e2d9] px-3 py-1 text-xs text-[#6b6b6b] hover:border-[#d97757] hover:text-[#c96545]">{suggestion}</button>)}</div>
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
