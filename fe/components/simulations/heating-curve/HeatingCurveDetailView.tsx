"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import type { HeatingCurvePreset } from "../presets/types";
import {
  phaseChangeEndTime,
  phaseLabel,
  solidHeatingDuration,
  totalHeatingTime,
} from "./physics";
import { ParamRangeField } from "../shared/param-panel";
import type { HeatingParams, HeatingSnapshot } from "./types";

const HeatingCurveCanvas = dynamic(
  () =>
    import("./heating-curve-canvas").then(
      (module) => module.HeatingCurveCanvas,
    ),
  { ssr: false },
);

const DEFAULT_PARAMS: HeatingParams = {
  initialTemperature: 20,
  meltingPoint: 1538,
  solidHeatingRate: 100,
  phaseChangeDuration: 4,
  liquidHeatingRate: 80,
  liquidHeatingDuration: 6,
  showGuides: true,
  showSamples: false,
  showThermometer: true,
  speed: 1,
};

export function HeatingCurveDetailView({
  preset,
  onBack,
}: {
  preset: HeatingCurvePreset;
  onBack: () => void;
}) {
  const [params, setParams] = useState<HeatingParams>(DEFAULT_PARAMS);
  const [running, setRunning] = useState(true);
  const [latest, setLatest] = useState<HeatingSnapshot | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [stepSignal, setStepSignal] = useState(0);
  const [edited, setEdited] = useState(false);

  const updateParams = (patch: Partial<HeatingParams>) => {
    setParams((current) => ({ ...current, ...patch }));
    setLatest(null);
    setEdited(true);
  };
  const reset = () => {
    setLatest(null);
    setResetSignal((value) => value + 1);
    setRunning(true);
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
              onClick={() => {
                setParams(DEFAULT_PARAMS);
                setEdited(false);
                reset();
              }}
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
                <HeatingCurveCanvas
                  params={params}
                  running={running}
                  resetSignal={resetSignal}
                  stepSignal={stepSignal}
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
                        className={`h-6 rounded-[7px] px-1.5 text-[11px] font-semibold ${params.speed === speed ? "bg-[#e8724a] text-white" : "text-[#6b6b6b] hover:bg-white hover:text-[#171717]"}`}
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
          <HeatingCurvePanel
            params={params}
            latest={latest}
            onParamsChange={updateParams}
            onRunningChange={setRunning}
            onReset={reset}
            onStep={() => {
              setRunning(false);
              setStepSignal((value) => value + 1);
            }}
          />
        </div>
      </div>
    </main>
  );
}

function format(value: number, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0";
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
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <ParamRangeField
      label={label}
      value={value}
      min={min}
      max={max}
      step={step}
      unit={suffix}
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
    <label className="flex cursor-pointer items-center justify-between gap-3 text-[12px] text-[#4f4943]">
      <span>{label}</span>
      <span className="relative inline-flex shrink-0 items-center">
        <input
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
    <div className="rounded-[9px] bg-[#faf9f7] px-2.5 py-2">
      <div className="text-[10px] text-[#8a8178]">{label}</div>
      <div className="mt-0.5 font-mono text-[12px] font-semibold text-[#171717]">
        {value}
      </div>
    </div>
  );
}

export function HeatingCurvePanel({
  params,
  latest,
  onParamsChange,
  onRunningChange,
  onReset,
  onStep,
}: {
  params: HeatingParams;
  latest: HeatingSnapshot | null;
  onParamsChange: (patch: Partial<HeatingParams>) => void;
  onRunningChange: (running: boolean) => void;
  onReset: () => void;
  onStep: () => void;
}) {
  const [panelTab, setPanelTab] = useState<"params" | "analysis" | "ai">(
    "params",
  );
  const latestTime = latest?.time ?? 0;
  const latestTemperature = latest?.temperature ?? params.initialTemperature;
  const phase = latest?.phase ?? "solid-heating";
  const updateNumber = (key: keyof HeatingParams) => (value: number) =>
    onParamsChange({ [key]: value } as Partial<HeatingParams>);
  const updateBoolean = (key: keyof HeatingParams) => (value: boolean) =>
    onParamsChange({ [key]: value } as Partial<HeatingParams>);

  return (
    <div className="flex max-h-[58vh] w-full shrink-0 flex-col overflow-hidden border-t border-[#e8e2d9] bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
      <div className="flex shrink-0 border-b border-[#e8e2d9] px-2">
        {(
          [
            ["params", "Tham số"],
            ["analysis", "Phân tích"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setPanelTab(key)}
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
            <div className="grid grid-cols-2 gap-2">
              <Metric
                label="Thời gian"
                value={`${format(latestTime, 1)} phút`}
              />
              <Metric
                label="Nhiệt độ"
                value={`${format(latestTemperature, 1)} °C`}
              />
              <Metric
                label="Giai đoạn"
                value={phaseLabel(phase).replace("Đun nóng ", "")}
              />
              <Metric
                label="Thời gian kết thúc"
                value={`${format(totalHeatingTime(params), 1)} phút`}
              />
            </div>

            <details open className="border-t border-[#e8e2d9] pt-3">
              <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
                Điều khiển thí nghiệm
              </summary>
              <div className="mt-3 space-y-3">
                <button
                  type="button"
                  onClick={onStep}
                  className="flex h-8 w-full items-center justify-center gap-1.5 rounded-[8px] border border-[#e8e2d9] text-[11px] font-semibold text-[#4f4943] hover:bg-[#f7f3ee]"
                  title="Tiến một bước"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  Tiến một bước
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onRunningChange(true)}
                    className="rounded-[8px] bg-[#e8724a] px-2 py-2 text-[11px] font-semibold text-white hover:bg-[#d96a42]"
                  >
                    Tiếp tục
                  </button>
                  <button
                    type="button"
                    onClick={() => onRunningChange(false)}
                    className="rounded-[8px] border border-[#e8e2d9] px-2 py-2 text-[11px] font-semibold text-[#4f4943] hover:bg-[#f7f3ee]"
                  >
                    Tạm dừng
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onReset}
                  className="w-full rounded-[8px] border border-[#e8e2d9] px-2 py-2 text-[11px] font-semibold text-[#4f4943] hover:bg-[#f7f3ee]"
                >
                  Đặt lại thí nghiệm
                </button>
              </div>
            </details>

            <details open className="border-t border-[#e8e2d9] pt-3">
              <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
                Thông số đun nóng
              </summary>
              <div className="mt-3 space-y-3">
                <RangeField
                  label="Nhiệt độ ban đầu"
                  value={params.initialTemperature}
                  min={0}
                  max={200}
                  step={10}
                  suffix="°C"
                  onChange={updateNumber("initialTemperature")}
                />
                <RangeField
                  label="Nhiệt độ nóng chảy của sắt"
                  value={params.meltingPoint}
                  min={1200}
                  max={1800}
                  step={10}
                  suffix="°C"
                  onChange={updateNumber("meltingPoint")}
                />
                <RangeField
                  label="Tốc độ nóng thỏi sắt"
                  value={params.solidHeatingRate}
                  min={20}
                  max={250}
                  step={10}
                  suffix="°C/phút"
                  onChange={updateNumber("solidHeatingRate")}
                />
                <RangeField
                  label="Thời gian chuyển thể"
                  value={params.phaseChangeDuration}
                  min={1}
                  max={8}
                  step={1}
                  suffix="phút"
                  onChange={updateNumber("phaseChangeDuration")}
                />
                <RangeField
                  label="Tốc độ sau khi nóng chảy"
                  value={params.liquidHeatingRate}
                  min={20}
                  max={200}
                  step={10}
                  suffix="°C/phút"
                  onChange={updateNumber("liquidHeatingRate")}
                />
                <RangeField
                  label="Thời gian pha lỏng"
                  value={params.liquidHeatingDuration}
                  min={2}
                  max={12}
                  step={1}
                  suffix="phút"
                  onChange={updateNumber("liquidHeatingDuration")}
                />
                <p className="text-[10px] leading-relaxed text-[#8a8178]">
                  Thời điểm bắt đầu chuyển thể:{" "}
                  {format(solidHeatingDuration(params), 1)} phút. Kết thúc
                  chuyển thể: {format(phaseChangeEndTime(params), 1)} phút.
                </p>
              </div>
            </details>

            <details open className="border-t border-[#e8e2d9] pt-3">
              <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
                Hiển thị
              </summary>
              <div className="mt-3 space-y-3">
                <ToggleField
                  label="Hiện đường gióng"
                  checked={params.showGuides}
                  onChange={updateBoolean("showGuides")}
                />
                <ToggleField
                  label="Hiện điểm mẫu"
                  checked={params.showSamples}
                  onChange={updateBoolean("showSamples")}
                />
                <ToggleField
                  label="Hiện nhiệt kế"
                  checked={params.showThermometer}
                  onChange={updateBoolean("showThermometer")}
                />
              </div>
            </details>

            <div className="rounded-[10px] bg-[#faf9f7] p-3 text-[11px] leading-relaxed text-[#6b6b6b]">
              Thỏi sắt nhận nhiệt từ ngọn lửa nên nhiệt độ tăng dần. Khi tiến
              gần nhiệt độ nóng chảy, sắt có thể phát sáng đỏ; đoạn nằm ngang
              biểu thị năng lượng dùng cho chuyển thể.
            </div>
          </>
        )}

        {panelTab === "analysis" && (
          <div className="space-y-4 text-[12px] leading-relaxed text-[#4f4943]">
            <div className="rounded-[10px] bg-[#faf9f7] p-3">
              <p className="font-semibold text-[#171717]">Đọc đồ thị</p>
              <p className="mt-1">
                Đoạn nghiêng cho biết nhiệt độ thay đổi theo thời gian. Đoạn nằm
                ngang biểu thị giai đoạn chuyển thể.
              </p>
            </div>
            <div className="rounded-[10px] border border-[#e8e2d9] p-3 font-mono text-[12px] text-[#c96545]">
              <p>Q = mcΔT</p>
              <p className="mt-1">Q = λm</p>
            </div>
            <p>
              Sắt nóng lên khi nhận nhiệt từ bếp. Ở gần nhiệt độ nóng chảy, năng
              lượng tiếp tục cung cấp chủ yếu làm thay đổi trạng thái thay vì
              tăng nhiệt độ.
            </p>
            <div>
              <p className="font-semibold text-[#171717]">Thử khám phá</p>
              <ul className="mt-2 space-y-2 pl-4">
                <li>• Tăng tốc độ đun ở pha rắn, đồ thị thay đổi thế nào?</li>
                <li>• Vì sao có đoạn nằm ngang?</li>
                <li>
                  • Kéo dài thời gian chuyển thể ảnh hưởng đến đồ thị ra sao?
                </li>
              </ul>
            </div>
          </div>
        )}

        {panelTab === "ai" && (
          <div className="space-y-4 text-[12px] text-[#4f4943]">
            <div className="rounded-[10px] bg-[#faf9f7] p-3 leading-relaxed">
              <p className="font-semibold text-[#171717]">Sửa bằng AI</p>
              <p className="mt-1">
                Ghi yêu cầu để chuẩn bị một biến thể của thí nghiệm đun nóng.
              </p>
            </div>
            <textarea
              className="min-h-28 w-full resize-none rounded-[9px] border border-[#e8e2d9] p-3 text-[12px] outline-none focus:border-[#d97757]"
              placeholder="Ví dụ: kéo dài giai đoạn nóng chảy..."
            />
            <button
              type="button"
              className="w-full rounded-[9px] bg-[#e8724a] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#d96a42]"
            >
              Gửi cho AI
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
