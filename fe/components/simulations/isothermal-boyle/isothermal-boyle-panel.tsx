"use client";

import {
  calculatePressureFromVolume,
  calculateVolumeFromPressure,
  MAX_PRESSURE,
  MAX_TEMPERATURE,
  MAX_VOLUME,
  MIN_PRESSURE,
  MIN_TEMPERATURE,
  MIN_VOLUME,
  REFERENCE_TEMPERATURE,
  REFERENCE_VOLUME,
} from "./physics";
import type { BoyleParams, BoyleState } from "./types";

type PanelTab = "params" | "analysis" | "ai";

function format(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0.00";
}

function statusLabel(status: BoyleState["status"]) {
  if (status === "compressed") return "Nén";
  if (status === "expanded") return "Giãn";
  return "Tham chiếu";
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

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-[11px] text-[#4f4943]">
      <span>{label}</span>
      <span className="relative inline-flex shrink-0 items-center">
        <input aria-label={label} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
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

export function IsothermalBoylePanel({
  params,
  stateA,
  stateB,
  panelTab,
  onPanelTabChange,
  onParamsChange,
  onReset,
}: {
  params: BoyleParams;
  stateA: BoyleState;
  stateB: BoyleState;
  panelTab: PanelTab;
  onPanelTabChange: (tab: PanelTab) => void;
  onParamsChange: (patch: Partial<BoyleParams>) => void;
  onReset: () => void;
}) {
  const tabItems: Array<[PanelTab, string]> = [["params", "Tham số"], ["analysis", "Phân tích"], ["ai", "Sửa bằng AI"]];
  const pressureA = calculatePressureFromVolume(params.volumeA, params.temperature);
  const pressureB = calculatePressureFromVolume(params.volumeB, params.temperature);

  const applyPreset = (name: string) => {
    if (name === "standard") onParamsChange({ volumeA: REFERENCE_VOLUME, volumeB: REFERENCE_VOLUME, temperature: REFERENCE_TEMPERATURE });
    if (name === "compressed") onParamsChange({ volumeA: REFERENCE_VOLUME, volumeB: 2.4, temperature: REFERENCE_TEMPERATURE });
    if (name === "expanded") onParamsChange({ volumeA: REFERENCE_VOLUME, volumeB: 5.8, temperature: REFERENCE_TEMPERATURE });
    if (name === "strong") onParamsChange({ volumeA: 5.8, volumeB: 1.8, temperature: REFERENCE_TEMPERATURE });
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
              Kéo piston A hoặc B, hoặc chỉnh thanh trượt riêng cho từng xi lanh. Nhiệt độ được giữ không đổi trong quá trình đẳng nhiệt.
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="PA" value={`${format(stateA.pressure)} atm`} />
              <Metric label="VA" value={`${format(stateA.volume)} L`} />
              <Metric label="PB" value={`${format(stateB.pressure)} atm`} />
              <Metric label="VB" value={`${format(stateB.volume)} L`} />
              <Metric label="T" value={`${format(params.temperature, 0)} K`} />
              <Metric label="pV" value={`${format(stateA.constant)} atmL`} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                ["standard", "Chuẩn"],
                ["compressed", "B nén"],
                ["expanded", "B giãn"],
                ["strong", "So rõ"],
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
            <section className="space-y-3 border-t border-[#e8e2d9] pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">Xi lanh A</p>
              <RangeField label="Thể tích VA" value={params.volumeA} min={MIN_VOLUME} max={MAX_VOLUME} step={0.1} suffix=" L" onChange={(volumeA) => onParamsChange({ volumeA })} />
              <RangeField
                label="Áp suất PA"
                value={pressureA}
                min={MIN_PRESSURE}
                max={MAX_PRESSURE}
                step={0.05}
                suffix=" atm"
                onChange={(pressure) => onParamsChange({ volumeA: calculateVolumeFromPressure(pressure, params.temperature) })}
              />
            </section>
            <section className="space-y-3 border-t border-[#e8e2d9] pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">Xi lanh B</p>
              <RangeField label="Thể tích VB" value={params.volumeB} min={MIN_VOLUME} max={MAX_VOLUME} step={0.1} suffix=" L" onChange={(volumeB) => onParamsChange({ volumeB })} />
              <RangeField
                label="Áp suất PB"
                value={pressureB}
                min={MIN_PRESSURE}
                max={MAX_PRESSURE}
                step={0.05}
                suffix=" atm"
                onChange={(pressure) => onParamsChange({ volumeB: calculateVolumeFromPressure(pressure, params.temperature) })}
              />
            </section>
            <section className="space-y-3 border-t border-[#e8e2d9] pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">Nhiệt độ & hiển thị</p>
              <RangeField label="Nhiệt độ cài đặt T" value={params.temperature} min={MIN_TEMPERATURE} max={MAX_TEMPERATURE} step={5} suffix=" K" onChange={(temperature) => onParamsChange({ temperature })} />
              <ToggleField label="Hiện phân tử khí" checked={params.showMolecules} onChange={(showMolecules) => onParamsChange({ showMolecules })} />
              <button type="button" onClick={onReset} className="w-full rounded-[8px] border border-[#e8e2d9] px-2 py-2 text-[11px] font-semibold text-[#4f4943]">Đặt lại</button>
            </section>
          </>
        )}
        {panelTab === "analysis" && (
          <div className="space-y-4 text-[12px] leading-relaxed text-[#4f4943]">
            <div className="rounded-[10px] bg-[#faf9f7] p-3">
              <p className="font-semibold text-[#171717]">Quan sát</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>Trong quá trình đẳng nhiệt, nhiệt độ của khí được giữ không đổi.</li>
                <li>Khi thể tích giảm thì áp suất tăng.</li>
                <li>Khi thể tích tăng thì áp suất giảm.</li>
                <li>Hai xi lanh đang dùng cùng một lượng khí và cùng T, nên pV gần như bằng nhau.</li>
              </ul>
            </div>
            <div className="rounded-[10px] border border-[#e8e2d9] p-3 font-mono text-[12px] text-[#c96545]">
              <p>pV = const</p>
              <p className="mt-1">P = K / V</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Trạng thái A" value={statusLabel(stateA.status)} />
              <Metric label="Trạng thái B" value={statusLabel(stateB.status)} />
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
