"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, RotateCcw } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import type { IsobaricProcessPreset } from "../presets/types";
import { ParamRangeField } from "../shared/param-panel";
import { SimulationToolbar } from "../shared/simulation-toolbar";
import { ZoomControls } from "../shared/zoom-controls";
import { IsobaricProcessCanvas } from "./isobaric-process-canvas";
import {
  calculateState,
  mapVolumeToHeight,
  MAX_PRESSURE,
  MAX_TEMPERATURE_C,
  MIN_PRESSURE,
  MIN_TEMPERATURE_C,
  resetIsobaricExperiment,
} from "./physics";
import type { IsobaricParams, IsobaricState } from "./types";

type PanelTab = "params" | "analysis" | "ai";

function format(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0.00";
}

function stateLabel(status: IsobaricState["status"]) {
  if (status === "cooling") return "Đang làm lạnh";
  if (status === "heating") return "Đang gia nhiệt";
  return "Trạng thái chuẩn";
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

function RangeField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <ParamRangeField
      label={label}
      value={value}
      min={min}
      max={max}
      step={step}
      unit={unit}
      onChange={onChange}
    />
  );
}

export function IsobaricProcessDetailView({
  preset,
  onBack,
}: {
  preset: IsobaricProcessPreset;
  onBack: () => void;
}) {
  const [params, setParams] = useState<IsobaricParams>(
    resetIsobaricExperiment(),
  );
  const [edited, setEdited] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("params");
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [zoom, setZoom] = useState(100);
  const state = useMemo(
    () =>
      calculateState({
        temperatureC: params.temperatureC,
        pressure: params.pressure,
      }),
    [params.temperatureC, params.pressure],
  );
  const comparisonState = useMemo(
    () =>
      calculateState({
        temperatureC: params.comparisonTemperatureC,
        pressure: params.pressure,
      }),
    [params.comparisonTemperatureC, params.pressure],
  );

  const updateParams = (patch: Partial<IsobaricParams>) => {
    setParams((current) => ({ ...current, ...patch }));
    setEdited(true);
  };

  const reset = () => {
    setParams(resetIsobaricExperiment());
    setEdited(false);
    setRunning(true);
    setSpeed(1);
    setZoom(100);
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
          <section className="flex min-h-[360px] min-w-0 flex-1 flex-col overflow-hidden p-2">
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[16px] border border-[#e8e2d9] shadow-sm">
              <IsobaricProcessCanvas
                params={params}
                onParamsChange={updateParams}
                running={running}
                speed={speed}
                zoom={zoom}
              />
              <SimulationToolbar
                running={running}
                speed={speed}
                onRunningChange={setRunning}
                onReset={reset}
                onSpeedChange={setSpeed}
              />
              <ZoomControls
                percent={zoom}
                onZoomIn={() => setZoom((value) => Math.min(130, value + 10))}
                onZoomOut={() => setZoom((value) => Math.max(70, value - 10))}
              />
            </div>
            <p className="mt-3 shrink-0 text-center text-[13px] text-[#6b6b6b]">
              {preset.objective}
            </p>
          </section>

          <IsobaricProcessPanel
            params={params}
            state={state}
            comparisonState={comparisonState}
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

function IsobaricProcessPanel({
  params,
  state,
  comparisonState,
  panelTab,
  onPanelTabChange,
  onParamsChange,
  onReset,
}: {
  params: IsobaricParams;
  state: IsobaricState;
  comparisonState: IsobaricState;
  panelTab: PanelTab;
  onPanelTabChange: (tab: PanelTab) => void;
  onParamsChange: (patch: Partial<IsobaricParams>) => void;
  onReset: () => void;
}) {
  const pistonHeight = mapVolumeToHeight(state.volume, 105, 255) / 10;
  const tabs: Array<[PanelTab, string]> = [
    ["params", "Tham số"],
    ["analysis", "Phân tích"],
  ];

  const applyPreset = (temperatureC: number) => {
    onParamsChange({ temperatureC });
  };

  return (
    <aside className="flex max-h-[58vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-[#e8e2d9] bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
      <div className="flex shrink-0 border-b border-[#e8e2d9] px-2">
        {tabs.map(([key, label]) => (
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
              Tải trên piston được giữ cố định nên áp suất không đổi. Gia nhiệt
              làm khí nở và đẩy piston lên; làm lạnh khiến piston đi xuống.
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Metric
                label="p (Áp suất)"
                value={`${format(state.pressure)} atm`}
              />
              <Metric
                label="V (Thể tích)"
                value={`${format(state.volume)} L`}
              />
              <Metric
                label="h (Vị trí piston)"
                value={`${format(pistonHeight, 1)} cm`}
              />
              <Metric
                label="T (Nhiệt độ)"
                value={`${format(state.temperatureC, 1)} °C`}
              />
              <Metric
                label="V/T (Hằng số)"
                value={`${format(state.volumeTemperatureRatio, 4)} L/K`}
              />
              <Metric label="Trạng thái" value={stateLabel(state.status)} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                [0, "Lạnh 0 °C"],
                [20, "Chuẩn 20 °C"],
                [60, "Ấm 60 °C"],
                [120, "Nóng 120 °C"],
              ].map(([temperature, label]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => applyPreset(Number(temperature))}
                  className="rounded-full border border-[#e8e2d9] px-2.5 py-1 text-[10px] text-[#6b6b6b] hover:border-[#d97757] hover:text-[#c96545]"
                >
                  {label}
                </button>
              ))}
            </div>
            <section className="space-y-3 border-t border-[#e8e2d9] pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
                Trạng thái đang xét
              </p>
              <RangeField
                label="T (Nhiệt độ khí)"
                value={params.temperatureC}
                min={MIN_TEMPERATURE_C}
                max={MAX_TEMPERATURE_C}
                step={1}
                unit="°C"
                onChange={(temperatureC) => onParamsChange({ temperatureC })}
              />
              <RangeField
                label="p (Áp suất không đổi)"
                value={params.pressure}
                min={MIN_PRESSURE}
                max={MAX_PRESSURE}
                step={0.05}
                unit="atm"
                onChange={(pressure) => onParamsChange({ pressure })}
              />
            </section>
            <section className="space-y-3 border-t border-[#e8e2d9] pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
                Điểm so sánh trên đồ thị
              </p>
              <RangeField
                label="T₂ (Nhiệt độ so sánh)"
                value={params.comparisonTemperatureC}
                min={MIN_TEMPERATURE_C}
                max={MAX_TEMPERATURE_C}
                step={1}
                unit="°C"
                onChange={(comparisonTemperatureC) =>
                  onParamsChange({ comparisonTemperatureC })
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <Metric
                  label="V₂ (Thể tích)"
                  value={`${format(comparisonState.volume)} L`}
                />
                <Metric
                  label="p₂ (Áp suất)"
                  value={`${format(comparisonState.pressure)} atm`}
                />
              </div>
            </section>
            <section className="space-y-3 border-t border-[#e8e2d9] pt-3">
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
                <li>Tải cố định giữ áp suất p không đổi.</li>
                <li>Khi nhiệt độ tăng, thể tích khí tăng.</li>
                <li>Khi nhiệt độ giảm, thể tích khí giảm.</li>
                <li>
                  Trên đồ thị p–V, quá trình đẳng áp là một đoạn thẳng nằm
                  ngang.
                </li>
              </ul>
            </div>
            <div className="rounded-[10px] border border-[#e8e2d9] p-3 font-mono text-[12px] text-[#c96545]">
              <p>p = const</p>
              <p className="mt-1">V/Tₖ = const</p>
              <p className="mt-1 text-[10px] text-[#8a8178]">
                Tₖ = T(°C) + 273,15
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Metric
                label="Nhiệt độ hiện tại"
                value={`${format(state.temperatureC, 1)} °C`}
              />
              <Metric
                label="Nhiệt độ so sánh"
                value={`${format(comparisonState.temperatureC, 1)} °C`}
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
