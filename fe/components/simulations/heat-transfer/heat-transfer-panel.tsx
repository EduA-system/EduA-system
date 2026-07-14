"use client";

import {
  calculateEquilibriumTemperature,
  calculateHeatCapacity,
  calculateHeatFlowRate,
} from "./physics";
import type { HeatTransferParams, HeatTransferSnapshot } from "./types";

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
  const digits = step < 0.1 ? 2 : step < 1 ? 1 : 0;
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-[#4f4943]">
        <span>{label}</span>
        <span className="font-mono text-[10px] text-[#c96545]">
          {value.toFixed(digits)}
          {suffix}
        </span>
      </div>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer accent-[#e8724a]"
      />
    </label>
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
      <p className="mt-0.5 truncate text-[12px] font-semibold text-[#171717]">{value}</p>
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
  const equilibrium = latest?.equilibriumTemperature
    ?? calculateEquilibriumTemperature(params.initialTemperatureA, capacityA, params.initialTemperatureB, capacityB);
  const currentA = latest?.temperatureA ?? params.initialTemperatureA;
  const currentB = latest?.temperatureB ?? params.initialTemperatureB;
  const heatFlow = latest?.heatFlowRate ?? calculateHeatFlowRate(params.transferCoefficient, currentA, currentB);
  const delta = currentA - currentB;
  const status = latest?.phase === "equilibrium"
    ? "Đã cân bằng"
    : params.contacted
      ? "Đang truyền nhiệt"
      : "Chưa tiếp xúc";
  const tabItems: Array<[PanelTab, string]> = [["params", "Tham số"], ["analysis", "Phân tích"], ["ai", "Sửa bằng AI"]];
  const updateNumber = (key: keyof HeatTransferParams) => (value: number) => onParamsChange({ [key]: value } as Partial<HeatTransferParams>);

  const applyPreset = (name: string) => {
    const base = { contacted: false };
    if (name === "equal") {
      onParamsChange({ ...base, initialTemperatureA: 80, initialTemperatureB: 20, massA: 1, massB: 1, specificHeatA: 1, specificHeatB: 1 });
    }
    if (name === "a-large") {
      onParamsChange({ ...base, initialTemperatureA: 80, initialTemperatureB: 20, massA: 3, massB: 1, specificHeatA: 1.2, specificHeatB: 1 });
    }
    if (name === "b-large") {
      onParamsChange({ ...base, initialTemperatureA: 80, initialTemperatureB: 20, massA: 1, massB: 3, specificHeatA: 1, specificHeatB: 1.2 });
    }
    if (name === "small") {
      onParamsChange({ ...base, initialTemperatureA: 55, initialTemperatureB: 45, massA: 1, massB: 1, specificHeatA: 1, specificHeatB: 1 });
    }
    if (name === "large") {
      onParamsChange({ ...base, initialTemperatureA: 95, initialTemperatureB: 5, massA: 1, massB: 1, specificHeatA: 1, specificHeatB: 1 });
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
            {panelTab === key && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-[#e8724a]" />}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {panelTab === "params" && (
          <>
            <div className="rounded-[10px] bg-[#faf9f7] p-3 text-[11px] leading-relaxed text-[#6b6b6b]">
              Điều chỉnh nhiệt độ, khối lượng và nhiệt dung riêng, sau đó cho hai vật tiếp xúc để quan sát nhiệt truyền từ nóng sang lạnh.
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="T cân bằng" value={`${format(equilibrium)} °C`} />
              <Metric label="ΔT hiện tại" value={`${format(delta)} °C`} />
              <Metric label="Tốc độ truyền" value={`${format(Math.abs(heatFlow), 2)} kJ/s`} />
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
              {params.contacted ? "Hai vật đã tiếp xúc" : "Cho hai vật tiếp xúc"}
            </button>
            <details open className="border-t border-[#e8e2d9] pt-3">
              <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">Vật A</summary>
              <div className="mt-3 space-y-3">
                <RangeField label="Nhiệt độ ban đầu TA" value={params.initialTemperatureA} min={0} max={100} step={1} suffix=" °C" onChange={updateNumber("initialTemperatureA")} />
                <RangeField label="Khối lượng mA" value={params.massA} min={0.5} max={4} step={0.1} suffix=" kg" onChange={updateNumber("massA")} />
                <RangeField label="Nhiệt dung riêng cA" value={params.specificHeatA} min={0.5} max={4} step={0.1} suffix=" kJ/kg°C" onChange={updateNumber("specificHeatA")} />
              </div>
            </details>
            <details open className="border-t border-[#e8e2d9] pt-3">
              <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">Vật B</summary>
              <div className="mt-3 space-y-3">
                <RangeField label="Nhiệt độ ban đầu TB" value={params.initialTemperatureB} min={0} max={100} step={1} suffix=" °C" onChange={updateNumber("initialTemperatureB")} />
                <RangeField label="Khối lượng mB" value={params.massB} min={0.5} max={4} step={0.1} suffix=" kg" onChange={updateNumber("massB")} />
                <RangeField label="Nhiệt dung riêng cB" value={params.specificHeatB} min={0.5} max={4} step={0.1} suffix=" kJ/kg°C" onChange={updateNumber("specificHeatB")} />
              </div>
            </details>
            <details open className="border-t border-[#e8e2d9] pt-3">
              <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">Truyền nhiệt</summary>
              <div className="mt-3 space-y-3">
                <RangeField label="Hệ số truyền nhiệt H" value={params.transferCoefficient} min={0.02} max={0.4} step={0.01} suffix=" kJ/s°C" onChange={updateNumber("transferCoefficient")} />
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => onRunningChange(true)} className="rounded-[8px] bg-[#e8724a] px-2 py-2 text-[11px] font-semibold text-white">Chạy tiếp</button>
                  <button type="button" onClick={() => onRunningChange(false)} className="rounded-[8px] border border-[#e8e2d9] px-2 py-2 text-[11px] font-semibold text-[#4f4943]">Tạm dừng</button>
                </div>
                <button type="button" onClick={onReset} className="w-full rounded-[8px] border border-[#e8e2d9] px-2 py-2 text-[11px] font-semibold text-[#4f4943]">Đặt lại</button>
              </div>
            </details>
            <details open className="border-t border-[#e8e2d9] pt-3">
              <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">Hiển thị</summary>
              <div className="mt-3 space-y-3">
                <ToggleField label="Hiện chuyển động phân tử" checked={params.showMolecules} onChange={(value) => onParamsChange({ showMolecules: value })} />
              </div>
            </details>
          </>
        )}
        {panelTab === "analysis" && (
          <div className="space-y-4 text-[12px] leading-relaxed text-[#4f4943]">
            <div className="rounded-[10px] bg-[#faf9f7] p-3">
              <p className="font-semibold text-[#171717]">Quan sát</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>Nhiệt truyền tự phát từ vật có nhiệt độ cao sang vật có nhiệt độ thấp.</li>
                <li>Tốc độ truyền nhiệt lớn khi độ chênh lệch nhiệt độ lớn.</li>
                <li>Khi nhiệt độ hai vật tiến gần nhau, tốc độ truyền nhiệt giảm.</li>
                <li>Quá trình dừng khi hai vật đạt cùng nhiệt độ.</li>
                <li>Nhiệt độ cân bằng phụ thuộc vào khối lượng và nhiệt dung riêng của mỗi vật.</li>
              </ul>
            </div>
            <div className="rounded-[10px] border border-[#e8e2d9] p-3 font-mono text-[12px] text-[#c96545]">
              <p>Q = mcΔT</p>
              <p className="mt-1">T cân bằng = (CₐTₐ + CᵦTᵦ) / (Cₐ + Cᵦ)</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Q A đã mất" value={`${format(latest?.heatLostA ?? 0, 2)} kJ`} />
              <Metric label="Q B đã nhận" value={`${format(latest?.heatReceivedB ?? 0, 2)} kJ`} />
            </div>
          </div>
        )}
        {panelTab === "ai" && (
          <div className="space-y-4 text-[12px] text-[#4f4943]">
            <div className="rounded-[10px] bg-[#faf9f7] p-3 leading-relaxed">
              <p className="font-semibold text-[#171717]">Sửa bằng AI</p>
              <p className="mt-1">Giữ nguyên chức năng AI dùng chung của EDUA cho mô phỏng này.</p>
            </div>
            <button type="button" className="w-full rounded-[9px] bg-[#e8724a] px-3 py-2 text-[12px] font-semibold text-white">Gửi cho AI</button>
          </div>
        )}
      </div>
    </aside>
  );
}
