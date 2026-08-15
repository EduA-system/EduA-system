"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, Pause, Play, RotateCcw } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import type { HeatTransferPreset } from "../presets/types";
import {
  calculateEquilibriumTemperature,
  calculateHeatCapacity,
  calculateHeatFlowRate,
} from "./physics";
import { ParamRangeField } from "../shared/param-panel";
import type { HeatTransferParams, HeatTransferSnapshot } from "./types";

const HeatTransferCanvas = dynamic(
  () =>
    import("./heat-transfer-canvas").then(
      (module) => module.HeatTransferCanvas,
    ),
  { ssr: false },
);

const DEFAULT_PARAMS: HeatTransferParams = {
  initialTemperatureA: 80,
  massA: 1,
  specificHeatA: 1,
  initialTemperatureB: 20,
  massB: 1,
  specificHeatB: 1,
  transferCoefficient: 0.12,
  contacted: false,
  showMolecules: true,
  speed: 1,
};

export function HeatTransferDetailView({
  preset,
  onBack,
}: {
  preset: HeatTransferPreset;
  onBack: () => void;
}) {
  const [params, setParams] = useState<HeatTransferParams>(DEFAULT_PARAMS);
  const [running, setRunning] = useState(false);
  const [latest, setLatest] = useState<HeatTransferSnapshot | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [edited, setEdited] = useState(false);
  const [panelTab, setPanelTab] = useState<"params" | "analysis" | "ai">(
    "params",
  );

  const updateParams = (patch: Partial<HeatTransferParams>) => {
    setParams((current) => ({ ...current, ...patch }));
    setLatest(null);
    setEdited(true);
  };
  const contact = () => {
    updateParams({ contacted: true });
    setRunning(true);
  };
  const reset = () => {
    setParams((current) => ({ ...current, contacted: false }));
    setLatest(null);
    setResetSignal((value) => value + 1);
    setRunning(false);
  };
  const restore = () => {
    setParams(DEFAULT_PARAMS);
    setLatest(null);
    setResetSignal((value) => value + 1);
    setRunning(false);
    setEdited(false);
  };

  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#f5f1ec]">
      <Sidebar activeHref="/mo-phong-vat-ly" />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e8e2d9] bg-white px-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-[13px] font-medium text-[#6b6b6b] hover:text-[#171717]"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            Thư viện
          </button>
          <span className="text-[#d8d1c9]">/</span>
          <span className="truncate text-[14px] font-semibold text-[#171717]">
            {preset.title}
          </span>
          <span
            className={`ml-auto flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${edited ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {edited ? "Đã chỉnh sửa" : "Bản gốc đã kiểm duyệt"}
          </span>
          {edited && (
            <button
              type="button"
              onClick={restore}
              className="hidden items-center gap-1.5 rounded-[9px] border border-[#e8e2d9] px-3 py-1.5 text-[12px] font-semibold text-[#4f4943] hover:bg-[#f7f3ee] sm:flex"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Khôi phục
            </button>
          )}
        </header>
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          <div className="flex min-h-[360px] min-w-0 flex-1 flex-col overflow-hidden p-2">
            <div className="relative min-h-0 flex-1">
              <div className="absolute inset-0 overflow-hidden rounded-[16px] border border-[#e8e2d9] shadow-sm">
                <HeatTransferCanvas
                  params={params}
                  running={running}
                  resetSignal={resetSignal}
                  onSnapshot={setLatest}
                />
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
                <div className="pointer-events-auto flex items-center gap-0.5 rounded-[11px] border border-[#e8e2d9] bg-white p-1 shadow-[0_8px_24px_rgba(43,41,38,0.12),0_2px_8px_rgba(43,41,38,0.08)]">
                  <button
                    type="button"
                    onClick={() => setRunning((value) => !value)}
                    title={running ? "Tạm dừng" : "Bắt đầu"}
                    aria-label={running ? "Tạm dừng" : "Bắt đầu"}
                    className={`flex h-8 w-8 items-center justify-center rounded-[9px] ${running ? "bg-[#e8724a] text-white hover:bg-[#d96a42]" : "text-[#4f4943] hover:bg-[#f7f3ee]"}`}
                  >
                    {running ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>
                  <div className="mx-0.5 h-4 w-px bg-black/10" />
                  <button
                    type="button"
                    onClick={reset}
                    title="Đặt lại"
                    aria-label="Đặt lại"
                    className="flex h-8 w-8 items-center justify-center rounded-[9px] text-[#4f4943] hover:bg-[#f7f3ee]"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <div className="mx-0.5 h-4 w-px bg-black/10" />
                  <div className="flex items-center gap-0.5 rounded-[9px] bg-[#f5f1ec] p-0.5">
                    {[0.5, 1, 2].map((speed) => (
                      <button
                        key={speed}
                        type="button"
                        onClick={() => updateParams({ speed })}
                        title={`Tốc độ ${speed}×`}
                        className={`h-6 rounded-[7px] px-1.5 text-[11px] font-semibold ${params.speed === speed ? "bg-[#e8724a] text-white" : "text-[#6b6b6b] hover:bg-white"}`}
                      >
                        {speed}×
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-3 shrink-0 text-center text-[13px] text-[#6b6b6b]">
              {preset.objective}
            </p>
          </div>
          <HeatTransferPanel
            params={params}
            latest={latest}
            panelTab={panelTab}
            onPanelTabChange={setPanelTab}
            onParamsChange={updateParams}
            onContact={contact}
            onRunningChange={setRunning}
            onReset={reset}
          />
        </div>
      </div>
    </main>
  );
}

type PanelTab = "params" | "analysis" | "ai";

function format(value: number, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0.0";
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <ParamRangeField
      label={label}
      value={value}
      min={min}
      max={max}
      step={step}
      unit={suffix.trim()}
      onChange={onChange}
    />
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-[11px] text-[#4f4943]">
      <span>{label}</span>
      <span className="relative inline-flex shrink-0 items-center">
        <input
          aria-label={label}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="h-5 w-9 rounded-full bg-[#d8d1c9] peer-checked:bg-[#e8724a]" />
        <span className="pointer-events-none absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[9px] bg-[#faf9f7] p-2">
      <p className="text-[10px] text-[#8a8178]">{label}</p>
      <p className="mt-0.5 truncate text-[12px] font-semibold text-[#171717]">
        {value}
      </p>
    </div>
  );
}

export function HeatTransferPanel({
  params,
  latest,
  panelTab,
  onPanelTabChange,
  onParamsChange,
  onContact,
  onRunningChange,
  onReset,
}: {
  params: HeatTransferParams;
  latest: HeatTransferSnapshot | null;
  panelTab: PanelTab;
  onPanelTabChange: (tab: PanelTab) => void;
  onParamsChange: (patch: Partial<HeatTransferParams>) => void;
  onContact: () => void;
  onRunningChange: (running: boolean) => void;
  onReset: () => void;
}) {
  const capacityA = calculateHeatCapacity(params.massA, params.specificHeatA);
  const capacityB = calculateHeatCapacity(params.massB, params.specificHeatB);
  const equilibrium =
    latest?.equilibriumTemperature ??
    calculateEquilibriumTemperature(
      params.initialTemperatureA,
      capacityA,
      params.initialTemperatureB,
      capacityB,
    );
  const currentA = latest?.temperatureA ?? params.initialTemperatureA;
  const currentB = latest?.temperatureB ?? params.initialTemperatureB;
  const heatFlow =
    latest?.heatFlowRate ??
    calculateHeatFlowRate(params.transferCoefficient, currentA, currentB);
  const delta = currentA - currentB;
  const status =
    latest?.phase === "equilibrium"
      ? "Đã cân bằng"
      : params.contacted
        ? "Đang truyền nhiệt"
        : "Chưa tiếp xúc";
  const tabItems: Array<[PanelTab, string]> = [
    ["params", "Tham số"],
    ["analysis", "Phân tích"],
  ];
  const updateNumber = (key: keyof HeatTransferParams) => (value: number) =>
    onParamsChange({ [key]: value } as Partial<HeatTransferParams>);

  const applyPreset = (name: string) => {
    const base = { contacted: false };
    if (name === "equal") {
      onParamsChange({
        ...base,
        initialTemperatureA: 80,
        initialTemperatureB: 20,
        massA: 1,
        massB: 1,
        specificHeatA: 1,
        specificHeatB: 1,
      });
    }
    if (name === "a-large") {
      onParamsChange({
        ...base,
        initialTemperatureA: 80,
        initialTemperatureB: 20,
        massA: 3,
        massB: 1,
        specificHeatA: 1.2,
        specificHeatB: 1,
      });
    }
    if (name === "b-large") {
      onParamsChange({
        ...base,
        initialTemperatureA: 80,
        initialTemperatureB: 20,
        massA: 1,
        massB: 3,
        specificHeatA: 1,
        specificHeatB: 1.2,
      });
    }
    if (name === "small") {
      onParamsChange({
        ...base,
        initialTemperatureA: 55,
        initialTemperatureB: 45,
        massA: 1,
        massB: 1,
        specificHeatA: 1,
        specificHeatB: 1,
      });
    }
    if (name === "large") {
      onParamsChange({
        ...base,
        initialTemperatureA: 95,
        initialTemperatureB: 5,
        massA: 1,
        massB: 1,
        specificHeatA: 1,
        specificHeatB: 1,
      });
    }
    onRunningChange(false);
  };

  return (
    <aside className="flex max-h-[58vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-[#e8e2d9] bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
      <div className="flex shrink-0 border-b border-[#e8e2d9] px-2">
        {tabItems.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onPanelTabChange(key)}
            className={`relative px-3 py-3 text-[12px] font-medium ${panelTab === key ? "text-[#c96545]" : "text-[#6b6b6b] hover:text-[#171717]"}`}
          >
            {label}
            {panelTab === key && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-[#e8724a]" />
            )}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {panelTab === "params" && (
          <>
            <div className="rounded-[10px] bg-[#faf9f7] p-3 text-[11px] leading-relaxed text-[#6b6b6b]">
              Điều chỉnh nhiệt độ, khối lượng và nhiệt dung riêng, sau đó cho
              hai vật tiếp xúc để quan sát nhiệt truyền từ nóng sang lạnh.
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="T cân bằng" value={`${format(equilibrium)} °C`} />
              <Metric label="ΔT hiện tại" value={`${format(delta)} °C`} />
              <Metric
                label="Tốc độ truyền"
                value={`${format(Math.abs(heatFlow), 2)} kJ/s`}
              />
              <Metric label="Trạng thái" value={status} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                ["equal", "Hai vật giống nhau"],
                ["a-large", "A nhiệt dung lớn"],
                ["b-large", "B nhiệt dung lớn"],
                ["small", "Chênh lệch nhỏ"],
                ["large", "Chênh lệch lớn"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className="rounded-full border border-[#e8e2d9] px-2.5 py-1 text-[10px] text-[#6b6b6b] hover:border-[#d97757] hover:text-[#c96545]"
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onContact}
              disabled={params.contacted}
              className={`w-full rounded-[9px] px-3 py-2 text-[11px] font-semibold ${params.contacted ? "cursor-default border border-[#e8e2d9] text-[#8a8178]" : "bg-[#e8724a] text-white hover:bg-[#d96a42]"}`}
            >
              {params.contacted
                ? "Hai vật đã tiếp xúc"
                : "Cho hai vật tiếp xúc"}
            </button>
            <details open className="border-t border-[#e8e2d9] pt-3">
              <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
                Vật A
              </summary>
              <div className="mt-3 space-y-3">
                <RangeField
                  label="Nhiệt độ ban đầu TA"
                  value={params.initialTemperatureA}
                  min={0}
                  max={100}
                  step={1}
                  suffix=" °C"
                  onChange={updateNumber("initialTemperatureA")}
                />
                <RangeField
                  label="Khối lượng mA"
                  value={params.massA}
                  min={0.5}
                  max={4}
                  step={0.1}
                  suffix=" kg"
                  onChange={updateNumber("massA")}
                />
                <RangeField
                  label="Nhiệt dung riêng cA"
                  value={params.specificHeatA}
                  min={0.5}
                  max={4}
                  step={0.1}
                  suffix=" kJ/kg°C"
                  onChange={updateNumber("specificHeatA")}
                />
              </div>
            </details>
            <details open className="border-t border-[#e8e2d9] pt-3">
              <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
                Vật B
              </summary>
              <div className="mt-3 space-y-3">
                <RangeField
                  label="Nhiệt độ ban đầu TB"
                  value={params.initialTemperatureB}
                  min={0}
                  max={100}
                  step={1}
                  suffix=" °C"
                  onChange={updateNumber("initialTemperatureB")}
                />
                <RangeField
                  label="Khối lượng mB"
                  value={params.massB}
                  min={0.5}
                  max={4}
                  step={0.1}
                  suffix=" kg"
                  onChange={updateNumber("massB")}
                />
                <RangeField
                  label="Nhiệt dung riêng cB"
                  value={params.specificHeatB}
                  min={0.5}
                  max={4}
                  step={0.1}
                  suffix=" kJ/kg°C"
                  onChange={updateNumber("specificHeatB")}
                />
              </div>
            </details>
            <details open className="border-t border-[#e8e2d9] pt-3">
              <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
                Truyền nhiệt
              </summary>
              <div className="mt-3 space-y-3">
                <RangeField
                  label="Hệ số truyền nhiệt H"
                  value={params.transferCoefficient}
                  min={0.02}
                  max={0.4}
                  step={0.01}
                  suffix=" kJ/s°C"
                  onChange={updateNumber("transferCoefficient")}
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onRunningChange(true)}
                    className="rounded-[8px] bg-[#e8724a] px-2 py-2 text-[11px] font-semibold text-white"
                  >
                    Chạy tiếp
                  </button>
                  <button
                    type="button"
                    onClick={() => onRunningChange(false)}
                    className="rounded-[8px] border border-[#e8e2d9] px-2 py-2 text-[11px] font-semibold text-[#4f4943]"
                  >
                    Tạm dừng
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onReset}
                  className="w-full rounded-[8px] border border-[#e8e2d9] px-2 py-2 text-[11px] font-semibold text-[#4f4943]"
                >
                  Đặt lại
                </button>
              </div>
            </details>
            <details open className="border-t border-[#e8e2d9] pt-3">
              <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
                Hiển thị
              </summary>
              <div className="mt-3 space-y-3">
                <ToggleField
                  label="Hiện chuyển động phân tử"
                  checked={params.showMolecules}
                  onChange={(value) => onParamsChange({ showMolecules: value })}
                />
              </div>
            </details>
          </>
        )}
        {panelTab === "analysis" && (
          <div className="space-y-4 text-[12px] leading-relaxed text-[#4f4943]">
            <div className="rounded-[10px] bg-[#faf9f7] p-3">
              <p className="font-semibold text-[#171717]">Quan sát</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>
                  Nhiệt truyền tự phát từ vật có nhiệt độ cao sang vật có nhiệt
                  độ thấp.
                </li>
                <li>Tốc độ truyền nhiệt lớn khi độ chênh lệch nhiệt độ lớn.</li>
                <li>
                  Khi nhiệt độ hai vật tiến gần nhau, tốc độ truyền nhiệt giảm.
                </li>
                <li>Quá trình dừng khi hai vật đạt cùng nhiệt độ.</li>
                <li>
                  Nhiệt độ cân bằng phụ thuộc vào khối lượng và nhiệt dung riêng
                  của mỗi vật.
                </li>
              </ul>
            </div>
            <div className="rounded-[10px] border border-[#e8e2d9] p-3 font-sans text-[12px] text-[#c96545]">
              <p>Q = mcΔT</p>
              <p className="mt-1">T cân bằng = (CₐTₐ + CᵦTᵦ) / (Cₐ + Cᵦ)</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Metric
                label="Q A đã mất"
                value={`${format(latest?.heatLostA ?? 0, 2)} kJ`}
              />
              <Metric
                label="Q B đã nhận"
                value={`${format(latest?.heatReceivedB ?? 0, 2)} kJ`}
              />
            </div>
          </div>
        )}
        {panelTab === "ai" && (
          <div className="space-y-4 text-[12px] text-[#4f4943]">
            <div className="rounded-[10px] bg-[#faf9f7] p-3 leading-relaxed">
              <p className="font-semibold text-[#171717]">Sửa bằng AI</p>
              <p className="mt-1">
                Giữ nguyên chức năng AI dùng chung của EDUA cho mô phỏng này.
              </p>
            </div>
            <button
              type="button"
              className="w-full rounded-[9px] bg-[#e8724a] px-3 py-2 text-[12px] font-semibold text-white"
            >
              Gửi cho AI
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
