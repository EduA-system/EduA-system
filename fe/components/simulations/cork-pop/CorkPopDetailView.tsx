"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import type { CorkPopPreset } from "../presets/types";
import { holdingForce } from "./physics";
import { ParamRangeField } from "../shared/param-panel";
import type { CorkPopParams, CorkPopSnapshot } from "./types";

const CorkPopCanvas = dynamic(
  () => import("./cork-pop-canvas").then((module) => module.CorkPopCanvas),
  { ssr: false },
);

const DEFAULT_PARAMS: CorkPopParams = {
  heatPower: 50,
  corkTightness: 55,
  gasAmount: 60,
  initialTemperature: 25,
  corkMass: 15,
  showMolecules: true,
  showVelocityVectors: false,
  showCorkForce: false,
  showCorkTrail: true,
  showLabels: true,
  mode: "micro",
  speed: 1,
};

export function CorkPopDetailView({
  preset,
  onBack,
}: {
  preset: CorkPopPreset;
  onBack: () => void;
}) {
  const [params, setParams] = useState<CorkPopParams>(DEFAULT_PARAMS);
  const [running, setRunning] = useState(false);
  const [latest, setLatest] = useState<CorkPopSnapshot | null>(null);
  const [samples, setSamples] = useState<CorkPopSnapshot[]>([]);
  const [resetSignal, setResetSignal] = useState(0);
  const [stepSignal, setStepSignal] = useState(0);
  const [edited, setEdited] = useState(false);

  const updateParams = (patch: Partial<CorkPopParams>) => {
    setParams((current) => ({ ...current, ...patch }));
    setLatest(null);
    setSamples([]);
    setEdited(true);
  };
  const onSnapshot = (snapshot: CorkPopSnapshot) => {
    setLatest(snapshot);
    setSamples((current) => {
      const next = [...current, snapshot];
      return next.length > 260 ? next.slice(-260) : next;
    });
  };
  const reset = () => {
    setLatest(null);
    setSamples([]);
    setResetSignal((value) => value + 1);
    setRunning(false);
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
            <ChevronLeft className="h-5 w-5" />
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
                <CorkPopCanvas
                  params={params}
                  running={running}
                  resetSignal={resetSignal}
                  stepSignal={stepSignal}
                  onSnapshot={onSnapshot}
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
          <CorkPopPanel
            params={params}
            latest={latest}
            samples={samples}
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
      <div className="mt-0.5 font-sans text-[11px] font-semibold text-[#171717]">
        {value}
      </div>
    </div>
  );
}

function MiniChart({
  samples,
  kind,
}: {
  samples: CorkPopSnapshot[];
  kind: "thermal" | "energy";
}) {
  const points =
    samples.length > 1
      ? samples
      : [
          {
            time: 0,
            temperature: 298,
            pressure: 101.3,
            internalEnergy: 0,
            heatAdded: 0,
            work: 0,
            force: 0,
            corkPosition: 0,
            corkVelocity: 0,
            status: "holding" as const,
            popped: false,
          },
        ];
  const first =
    kind === "thermal"
      ? points.map((point) => point.temperature - 273.15)
      : points.map((point) => point.internalEnergy);
  const second =
    kind === "thermal"
      ? points.map((point) => point.pressure)
      : points.map((point) => point.work);
  const maxTime = Math.max(1, points.at(-1)!.time);
  const maxValue = Math.max(1, ...first, ...second);
  const width = 280;
  const height = 112;
  const makePath = (values: number[]) =>
    values
      .map(
        (value, index) =>
          `${index === 0 ? "M" : "L"}${(10 + (points[index]!.time / maxTime) * 260).toFixed(1)},${(height - 16 - (Math.max(0, value) / maxValue) * 82).toFixed(1)}`,
      )
      .join(" ");
  const popped = points.find((point) => point.popped);
  return (
    <div className="rounded-[10px] border border-[#e8e2d9] p-2">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#8a8178]">
        {kind === "thermal" ? "Nhiệt độ và áp suất" : "Nội năng và công"}
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={
          kind === "thermal"
            ? "Biểu đồ nhiệt độ và áp suất"
            : "Biểu đồ nội năng và công"
        }
      >
        <line
          x1="10"
          y1={height - 16}
          x2="270"
          y2={height - 16}
          stroke="#c8bfb7"
        />
        <line x1="10" y1="10" x2="10" y2={height - 16} stroke="#c8bfb7" />
        <path
          d={makePath(first)}
          fill="none"
          stroke="#e8724a"
          strokeWidth="2"
        />
        <path
          d={makePath(second)}
          fill="none"
          stroke="#67e8f9"
          strokeWidth="2"
        />
        {popped && (
          <line
            x1={10 + (popped.time / maxTime) * 260}
            x2={10 + (popped.time / maxTime) * 260}
            y1="10"
            y2={height - 16}
            stroke="#fbbf24"
            strokeDasharray="4 3"
          />
        )}
        <text x="12" y="10" fontSize="8" fill="#8a8178">
          {kind === "thermal" ? "T / P" : "U / A"}
        </text>
        <text x="244" y="105" fontSize="8" fill="#8a8178">
          t
        </text>
      </svg>
      <div className="flex gap-3 text-[9px] text-[#6b6b6b]">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-4 rounded bg-[#e8724a]" />
          {kind === "thermal" ? "T" : "U"}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-4 rounded bg-[#67e8f9]" />
          {kind === "thermal" ? "P" : "A"}
        </span>
        {popped && <span className="text-[#c96545]">Nút bật</span>}
      </div>
    </div>
  );
}

export function CorkPopPanel({
  params,
  latest,
  samples,
  onParamsChange,
  onRunningChange,
  onReset,
  onStep,
}: {
  params: CorkPopParams;
  latest: CorkPopSnapshot | null;
  samples: CorkPopSnapshot[];
  onParamsChange: (patch: Partial<CorkPopParams>) => void;
  onRunningChange: (running: boolean) => void;
  onReset: () => void;
  onStep: () => void;
}) {
  const [panelTab, setPanelTab] = useState<"params" | "analysis" | "ai">(
    "params",
  );
  const [aiPrompt, setAiPrompt] = useState("");
  const updateNumber = (key: keyof CorkPopParams) => (value: number) =>
    onParamsChange({ [key]: value } as Partial<CorkPopParams>);
  const updateBoolean = (key: keyof CorkPopParams) => (value: boolean) =>
    onParamsChange({ [key]: value } as Partial<CorkPopParams>);
  const statusLabel =
    latest?.status === "popped"
      ? "Đã bật"
      : latest?.status === "near-pop"
        ? "Sắp bật"
        : "Đang giữ";
  const hold = holdingForce(params);
  const quickPresets = useMemo(
    () =>
      [
        ["Đun nhẹ", { heatPower: 25 }],
        ["Đun mạnh", { heatPower: 85 }],
        ["Nút lỏng", { corkTightness: 25 }],
        ["Nút chặt", { corkTightness: 85 }],
        ["Chế độ vi mô", { mode: "micro" as const }],
        ["Chế độ năng lượng", { mode: "energy" as const }],
      ] as const,
    [],
  );

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
            <p className="rounded-[10px] bg-[#faf9f7] p-3 text-[11px] leading-relaxed text-[#6b6b6b]">
              Điều chỉnh mức đun và độ chặt của nút, sau đó chạy mô phỏng để
              quan sát khí thực hiện công.
            </p>
            <div className="rounded-[10px] border border-[#e8e2d9] p-3 text-[10px] leading-relaxed text-[#6b6b6b]">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
                Chú thích ký hiệu
              </p>
              <p>
                <span className="mr-1.5 inline-block size-2 rounded-full bg-cyan-300" />
                Chấm cyan: phân tử khí
              </p>
              <p>
                <span className="mr-1.5 inline-block h-px w-3 bg-purple-300" />
                Mũi tên tím: vector vận tốc
              </p>
              <p>
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-orange-400" />
                Màu cam: nhiệt lượng Q
              </p>
              <p>
                <span className="mr-1.5 inline-block h-2 w-3 rounded-sm bg-orange-500" />
                Nút bấc: vật nhận công
              </p>
              <p>
                <span className="mr-1.5 inline-block h-px w-3 bg-rose-400" />
                T: nhiệt độ · P: áp suất
              </p>
              <p>
                <span className="mr-1.5 inline-block h-1 w-3 rounded bg-cyan-300" />
                U: nội năng · A: công cơ học
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickPresets.map(([label, patch]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onParamsChange(patch)}
                  className="rounded-full border border-[#e8e2d9] px-2.5 py-1 text-[10px] text-[#6b6b6b] hover:border-[#d97757] hover:text-[#c96545]"
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Metric
                label="Nhiệt độ"
                value={`${format(latest ? latest.temperature - 273.15 : params.initialTemperature, 1)} °C`}
              />
              <Metric
                label="Áp suất"
                value={`${format(latest?.pressure ?? 101.3, 1)} kPa`}
              />
              <Metric
                label="Nội năng ΔU"
                value={`${format(latest?.internalEnergy ?? 0, 2)} J`}
              />
              <Metric
                label="Công A"
                value={`${format(latest?.work ?? 0, 2)} J`}
              />
              <Metric
                label="Lực lên nút"
                value={`${format(latest?.force ?? 0, 2)} N`}
              />
              <Metric label="Trạng thái" value={statusLabel} />
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
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  Tiến một bước
                </button>
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
                Thông số hệ khí
              </summary>
              <div className="mt-3 space-y-3">
                <RangeField
                  label="Công suất nguồn nhiệt"
                  value={params.heatPower}
                  min={0}
                  max={100}
                  step={5}
                  suffix="%"
                  onChange={updateNumber("heatPower")}
                />
                <RangeField
                  label="Độ chặt của nút"
                  value={params.corkTightness}
                  min={0}
                  max={100}
                  step={5}
                  suffix="%"
                  onChange={updateNumber("corkTightness")}
                />
                <RangeField
                  label="Lượng khí trong bình"
                  value={params.gasAmount}
                  min={20}
                  max={100}
                  step={5}
                  suffix="%"
                  onChange={updateNumber("gasAmount")}
                />
                <RangeField
                  label="Nhiệt độ ban đầu"
                  value={params.initialTemperature}
                  min={20}
                  max={80}
                  step={1}
                  suffix="°C"
                  onChange={updateNumber("initialTemperature")}
                />
                <RangeField
                  label="Khối lượng nút"
                  value={params.corkMass}
                  min={5}
                  max={50}
                  step={1}
                  suffix="g"
                  onChange={updateNumber("corkMass")}
                />
                <p className="text-[10px] leading-relaxed text-[#8a8178]">
                  Lực giữ xấp xỉ {hold.toFixed(2)} N. Nút bật khi lực khí vượt
                  lực giữ và trọng lực.
                </p>
              </div>
            </details>
            <details open className="border-t border-[#e8e2d9] pt-3">
              <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
                Hiển thị
              </summary>
              <div className="mt-3 space-y-3">
                <ToggleField
                  label="Hiển thị phân tử"
                  checked={params.showMolecules}
                  onChange={updateBoolean("showMolecules")}
                />
                <ToggleField
                  label="Hiển thị vector vận tốc"
                  checked={params.showVelocityVectors}
                  onChange={updateBoolean("showVelocityVectors")}
                />
                <ToggleField
                  label="Hiển thị lực lên nút"
                  checked={params.showCorkForce}
                  onChange={updateBoolean("showCorkForce")}
                />
                <ToggleField
                  label="Hiển thị dấu vết nút"
                  checked={params.showCorkTrail}
                  onChange={updateBoolean("showCorkTrail")}
                />
                <ToggleField
                  label="Hiển thị nhãn đại lượng"
                  checked={params.showLabels}
                  onChange={updateBoolean("showLabels")}
                />
              </div>
            </details>
          </>
        )}
        {panelTab === "analysis" && (
          <div className="space-y-4 text-[12px] leading-relaxed text-[#4f4943]">
            <div className="rounded-[10px] bg-[#faf9f7] p-3">
              <p className="font-semibold text-[#171717]">
                Chuỗi chuyển hóa năng lượng
              </p>
              <p className="mt-1">
                Nhiệt lượng cung cấp → nội năng khí tăng → áp suất tăng → khí
                thực hiện công → động năng của nút tăng.
              </p>
            </div>
            <MiniChart samples={samples} kind="thermal" />
            <MiniChart samples={samples} kind="energy" />
            <div className="space-y-2 border-t border-[#e8e2d9] pt-3">
              <p>
                <b>Ban đầu:</b> phân tử chuyển động hỗn loạn với tốc độ trung
                bình thấp.
              </p>
              <p>
                <b>Nhận nhiệt:</b> nội năng và tốc độ phân tử tăng.
              </p>
              <p>
                <b>Áp suất tăng:</b> va chạm với thành bình mạnh và thường xuyên
                hơn.
              </p>
              <p>
                <b>Thực hiện công:</b> khi lực khí vượt ngưỡng, nút chuyển động
                và công A tăng.
              </p>
              <p>
                <b>Sau khi bật:</b> khí giãn nở, áp suất và nhiệt độ giảm một
                phần.
              </p>
            </div>
          </div>
        )}
        {panelTab === "ai" && (
          <div className="space-y-4 text-[12px] text-[#4f4943]">
            <div className="rounded-[10px] bg-[#faf9f7] p-3 leading-relaxed">
              <p className="font-semibold text-[#171717]">Sửa bằng AI</p>
              <p className="mt-1">
                Giữ nguyên component AI của EDUA để đề xuất biến thể cho thí
                nghiệm nhiệt học.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Làm nút bật chậm hơn",
                "Tăng số phân tử khí",
                "Hiển thị rõ chuyển hóa năng lượng",
                "Tạo câu hỏi kiểm tra",
                "Giải thích cho học sinh lớp 10",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setAiPrompt(suggestion)}
                  className="rounded-full border border-[#e8e2d9] px-2.5 py-1 text-[10px] text-[#6b6b6b] hover:border-[#d97757] hover:text-[#c96545]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <textarea
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
              className="min-h-24 w-full resize-none rounded-[9px] border border-[#e8e2d9] p-3 text-[12px] outline-none focus:border-[#d97757]"
              placeholder="Nhập yêu cầu thay đổi mô phỏng..."
            />
            <button
              type="button"
              className="w-full rounded-[9px] bg-[#e8724a] px-3 py-2 text-[12px] font-semibold text-white"
            >
              Gửi cho AI
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
