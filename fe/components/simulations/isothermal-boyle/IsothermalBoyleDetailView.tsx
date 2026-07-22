"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, RotateCcw } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import type { IsothermalBoylePreset } from "../presets/types";
import {
  calculatePressureFromVolume,
  calculateState,
  calculateVolumeFromPressure,
  MAX_PRESSURE,
  MAX_TEMPERATURE,
  MAX_VOLUME,
  MIN_PRESSURE,
  MIN_TEMPERATURE,
  MIN_VOLUME,
  REFERENCE_TEMPERATURE,
  REFERENCE_VOLUME,
  resetIsothermalExperiment,
} from "./physics";
import { IsothermalBoyleCanvas } from "./isothermal-boyle-canvas";
import type { BoyleParams, BoyleState } from "./types";
import { ParamRangeField } from "../shared/param-panel";

export function IsothermalBoyleDetailView({
  preset,
  onBack,
}: {
  preset: IsothermalBoylePreset;
  onBack: () => void;
}) {
  const [params, setParams] = useState<BoyleParams>(
    resetIsothermalExperiment(),
  );
  const [edited, setEdited] = useState(false);
  const [panelTab, setPanelTab] = useState<"params" | "analysis" | "ai">(
    "params",
  );
  const stateA = useMemo(
    () =>
      calculateState({
        volume: params.volumeA,
        temperature: params.temperature,
      }),
    [params.volumeA, params.temperature],
  );
  const stateB = useMemo(
    () =>
      calculateState({
        volume: params.volumeB,
        temperature: params.temperature,
      }),
    [params.volumeB, params.temperature],
  );

  const updateParams = (patch: Partial<BoyleParams>) => {
    setParams((current) => ({ ...current, ...patch }));
    setEdited(true);
  };

  const reset = () => {
    setParams(resetIsothermalExperiment());
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
              onClick={reset}
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
                <IsothermalBoyleCanvas
                  params={params}
                  onParamsChange={updateParams}
                />
              </div>
            </div>
            <p className="mt-3 shrink-0 text-center text-[13px] text-[#6b6b6b]">
              {preset.objective}
            </p>
          </div>
          <IsothermalBoylePanel
            params={params}
            stateA={stateA}
            stateB={stateB}
            panelTab={panelTab}
            onPanelTabChange={setPanelTab}
            onParamsChange={updateParams}
            onReset={reset}
          />
        </div>
      </div>
    </main>
  );
}

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
  const tabItems: Array<[PanelTab, string]> = [
    ["params", "Tham số"],
    ["analysis", "Phân tích"],
    ["ai", "Sửa bằng AI"],
  ];
  const pressureA = calculatePressureFromVolume(
    params.volumeA,
    params.temperature,
  );
  const pressureB = calculatePressureFromVolume(
    params.volumeB,
    params.temperature,
  );

  const applyPreset = (name: string) => {
    if (name === "standard")
      onParamsChange({
        volumeA: REFERENCE_VOLUME,
        volumeB: REFERENCE_VOLUME,
        temperature: REFERENCE_TEMPERATURE,
      });
    if (name === "compressed")
      onParamsChange({
        volumeA: REFERENCE_VOLUME,
        volumeB: 2.4,
        temperature: REFERENCE_TEMPERATURE,
      });
    if (name === "expanded")
      onParamsChange({
        volumeA: REFERENCE_VOLUME,
        volumeB: 5.8,
        temperature: REFERENCE_TEMPERATURE,
      });
    if (name === "strong")
      onParamsChange({
        volumeA: 5.8,
        volumeB: 1.8,
        temperature: REFERENCE_TEMPERATURE,
      });
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
              Kéo piston A hoặc B, hoặc chỉnh thanh trượt riêng cho từng xi
              lanh. Nhiệt độ được giữ không đổi trong quá trình đẳng nhiệt.
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
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
                Xi lanh A
              </p>
              <RangeField
                label="Thể tích VA"
                value={params.volumeA}
                min={MIN_VOLUME}
                max={MAX_VOLUME}
                step={0.1}
                suffix=" L"
                onChange={(volumeA) => onParamsChange({ volumeA })}
              />
              <RangeField
                label="Áp suất PA"
                value={pressureA}
                min={MIN_PRESSURE}
                max={MAX_PRESSURE}
                step={0.05}
                suffix=" atm"
                onChange={(pressure) =>
                  onParamsChange({
                    volumeA: calculateVolumeFromPressure(
                      pressure,
                      params.temperature,
                    ),
                  })
                }
              />
            </section>
            <section className="space-y-3 border-t border-[#e8e2d9] pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
                Xi lanh B
              </p>
              <RangeField
                label="Thể tích VB"
                value={params.volumeB}
                min={MIN_VOLUME}
                max={MAX_VOLUME}
                step={0.1}
                suffix=" L"
                onChange={(volumeB) => onParamsChange({ volumeB })}
              />
              <RangeField
                label="Áp suất PB"
                value={pressureB}
                min={MIN_PRESSURE}
                max={MAX_PRESSURE}
                step={0.05}
                suffix=" atm"
                onChange={(pressure) =>
                  onParamsChange({
                    volumeB: calculateVolumeFromPressure(
                      pressure,
                      params.temperature,
                    ),
                  })
                }
              />
            </section>
            <section className="space-y-3 border-t border-[#e8e2d9] pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
                Nhiệt độ & hiển thị
              </p>
              <RangeField
                label="Nhiệt độ cài đặt T"
                value={params.temperature}
                min={MIN_TEMPERATURE}
                max={MAX_TEMPERATURE}
                step={5}
                suffix=" K"
                onChange={(temperature) => onParamsChange({ temperature })}
              />
              <ToggleField
                label="Hiện phân tử khí"
                checked={params.showMolecules}
                onChange={(showMolecules) => onParamsChange({ showMolecules })}
              />
              <button
                type="button"
                onClick={onReset}
                className="w-full rounded-[8px] border border-[#e8e2d9] px-2 py-2 text-[11px] font-semibold text-[#4f4943]"
              >
                Đặt lại
              </button>
            </section>
          </>
        )}
        {panelTab === "analysis" && (
          <div className="space-y-4 text-[12px] leading-relaxed text-[#4f4943]">
            <div className="rounded-[10px] bg-[#faf9f7] p-3">
              <p className="font-semibold text-[#171717]">Quan sát</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>
                  Trong quá trình đẳng nhiệt, nhiệt độ của khí được giữ không
                  đổi.
                </li>
                <li>Khi thể tích giảm thì áp suất tăng.</li>
                <li>Khi thể tích tăng thì áp suất giảm.</li>
                <li>
                  Hai xi lanh đang dùng cùng một lượng khí và cùng T, nên pV gần
                  như bằng nhau.
                </li>
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
