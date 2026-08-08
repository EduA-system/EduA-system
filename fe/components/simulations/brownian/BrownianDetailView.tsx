"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import dynamic from "next/dynamic";
import {
  ChevronLeft,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  SkipForward,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import type { BrownianPreset } from "../presets/types";
import {
  calculateDragCoefficient,
  calculateEnsembleMSD,
  diffusionInMicrometersSquaredPerSecond,
} from "./physics";
import { ParamRangeField } from "../shared/param-panel";
import type {
  BrownianParams,
  BrownianSample,
  BrownianSnapshot,
  BrownianViewMode,
} from "./types";

const BrownianCanvas = dynamic(
  () => import("./brownian-canvas").then((module) => module.BrownianCanvas),
  { ssr: false },
);

const DEFAULT_PARAMS: BrownianParams = {
  temperature: 298,
  viscosity: 0.89,
  radius: 1.8,
  mass: 2,
  moleculeDensity: 220,
  mode: "langevin",
  autoDiffusion: true,
  diffusion: 0.13,
  boundary: "reflect",
  showMolecules: true,
  showTrajectory: true,
  showSamples: false,
  showVelocity: false,
  showRandomForce: false,
  showDragForce: false,
  showGrid: false,
  showLabel: true,
  showRadius: false,
  keepFullPath: false,
  trailLength: 520,
  ensembleRuns: 25,
  seed: 104729,
  speed: 1,
};

type ChartKind = "displacement" | "msd";

export function BrownianDetailView({
  preset,
  onBack,
}: {
  preset: BrownianPreset;
  onBack: () => void;
}) {
  const [params, setParams] = useState<BrownianParams>(DEFAULT_PARAMS);
  const [running, setRunning] = useState(true);
  const [viewMode, setViewMode] = useState<BrownianViewMode>("micro");
  const [chartKind, setChartKind] = useState<ChartKind>("displacement");
  const [samples, setSamples] = useState<BrownianSample[]>([]);
  const [latest, setLatest] = useState<BrownianSnapshot | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [stepSignal, setStepSignal] = useState(0);
  const [edited, setEdited] = useState(false);

  const physicsKey = useMemo(
    () =>
      [
        params.seed,
        params.mode,
        params.temperature,
        params.viscosity,
        params.radius,
        params.mass,
        params.moleculeDensity,
        params.autoDiffusion,
        params.diffusion,
        params.boundary,
      ].join("|"),
    [params],
  );
  const previousPhysicsKey = useRef(physicsKey);
  useEffect(() => {
    if (previousPhysicsKey.current !== physicsKey) {
      setSamples([]);
      setLatest(null);
      setResetSignal((value) => value + 1);
      previousPhysicsKey.current = physicsKey;
    }
  }, [physicsKey]);

  const updateParams = (patch: Partial<BrownianParams>) => {
    setParams((current) => ({ ...current, ...patch }));
    setEdited(true);
  };
  const reset = () => {
    setSamples([]);
    setLatest(null);
    setResetSignal((value) => value + 1);
    setRunning(true);
  };
  const newSeed = () =>
    updateParams({ seed: Math.floor(10000 + Math.random() * 900000) });
  const onSnapshot = (snapshot: BrownianSnapshot) => {
    setLatest(snapshot);
    setSamples((current) => {
      const next = [...current, snapshot];
      return next.length > 320 ? next.slice(-320) : next;
    });
  };

  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#f5f1ec]">
      {/* Khung trang, không thuộc thí nghiệm: lặp lại y hệt LegacyExperimentLayout
          trong app/mo-phong-vat-ly/page.tsx, vốn đã bọc sẵn cho nhóm thí nghiệm
          điều phối theo preset.id. Nhóm điều phối theo `kind` (14 component) lại
          tự vẽ lấy, nên mỗi file đều chép lại đúng dòng Sidebar này. */}
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
                <BrownianCanvas
                  params={params}
                  running={running}
                  resetSignal={resetSignal}
                  stepSignal={stepSignal}
                  viewMode={viewMode}
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
                      <Pause className="h-4 w-4" strokeWidth={2} />
                    ) : (
                      <Play className="h-4 w-4" strokeWidth={2} />
                    )}
                  </button>
                  <div className="mx-0.5 h-4 w-px shrink-0 bg-black/10" />
                  <button
                    type="button"
                    onClick={reset}
                    title="Đặt lại"
                    aria-label="Đặt lại"
                    className="flex h-8 w-8 items-center justify-center rounded-[9px] text-[#4f4943] hover:bg-[#f7f3ee]"
                  >
                    <RotateCcw className="h-4 w-4" strokeWidth={2} />
                  </button>
                  <div className="mx-0.5 h-4 w-px shrink-0 bg-black/10" />
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
          <BrownianPanel
            params={params}
            samples={samples}
            latest={latest}
            viewMode={viewMode}
            chartKind={chartKind}
            onParamsChange={updateParams}
            onViewModeChange={setViewMode}
            onChartKindChange={setChartKind}
            onStep={() => {
              setRunning(false);
              setStepSignal((value) => value + 1);
            }}
            onNewSeed={newSeed}
          />
        </div>
      </div>
    </main>
  );
}

function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "0";
  return value.toFixed(digits);
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
  onChange: (checked: boolean) => void;
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
        <span className="h-5 w-9 rounded-full bg-[#d8d1c9] transition-colors peer-checked:bg-[#e8724a]" />
        <span className="pointer-events-none absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-[12px] text-[#4f4943]">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="max-w-[155px] rounded-[8px] border border-[#e8e2d9] bg-white px-2 py-1.5 text-[11px] text-[#4f4943] outline-none focus:border-[#d97757]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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

function BrownianChart({
  samples,
  diffusion,
  ensembleRuns,
  seed,
  kind,
}: {
  samples: BrownianSample[];
  diffusion: number;
  ensembleRuns: number;
  seed: number;
  kind: ChartKind;
}) {
  const ensemble = useMemo(
    () =>
      calculateEnsembleMSD(
        diffusion,
        Math.max(4, samples.at(-1)?.time ?? 4),
        ensembleRuns,
        seed,
      ),
    [diffusion, ensembleRuns, samples, seed],
  );
  const actual =
    kind === "displacement"
      ? samples.map((sample) => ({
          time: sample.time,
          value: sample.displacement * 1e6,
        }))
      : samples.map((sample) => ({
          time: sample.time,
          value: sample.squaredDisplacement * 1e12,
        }));
  const ensembleData =
    kind === "msd"
      ? ensemble.map((sample) => ({
          time: sample.time,
          value: sample.squaredDisplacement,
        }))
      : [];
  const maxTime = Math.max(
    4,
    actual.at(-1)?.time ?? 0,
    ensembleData.at(-1)?.time ?? 0,
  );
  const theoreticalMax = kind === "msd" ? 4 * diffusion * maxTime : 0;
  const maxValue =
    Math.max(
      kind === "msd" ? 0.1 : 0.1,
      ...actual.map((point) => point.value),
      ...ensembleData.map((point) => point.value),
      theoreticalMax,
    ) * 1.15;
  const width = 520;
  const height = 190;
  const pad = { left: 42, right: 12, top: 12, bottom: 28 };
  const x = (time: number) =>
    pad.left + (time / maxTime) * (width - pad.left - pad.right);
  const y = (value: number) =>
    height - pad.bottom - (value / maxValue) * (height - pad.top - pad.bottom);
  const path = (data: { time: number; value: number }[]) =>
    data
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"}${x(point.time).toFixed(1)},${y(point.value).toFixed(1)}`,
      )
      .join(" ");
  const yLabel = kind === "displacement" ? "µm" : "µm²";
  const title =
    kind === "displacement"
      ? "Độ dịch chuyển theo thời gian"
      : "Bình phương độ dịch chuyển (MSD)";

  return (
    <div className="rounded-[10px] border border-[#e8e2d9] bg-white p-3">
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
          {title}
        </p>
        <span className="text-[10px] text-[#8a8178]">t (s) / {yLabel}</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={title}
      >
        {[0, 1, 2, 3, 4].map((line) => {
          const value = (maxValue / 4) * line;
          return (
            <line
              key={`h-${line}`}
              x1={pad.left}
              x2={width - pad.right}
              y1={y(value)}
              y2={y(value)}
              stroke="#eee8e1"
              strokeWidth="1"
            />
          );
        })}
        {[0, 1, 2, 3, 4].map((line) => {
          const time = (maxTime / 4) * line;
          return (
            <line
              key={`v-${line}`}
              x1={x(time)}
              x2={x(time)}
              y1={pad.top}
              y2={height - pad.bottom}
              stroke="#f1ede8"
              strokeWidth="1"
            />
          );
        })}
        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={height - pad.bottom}
          y2={height - pad.bottom}
          stroke="#b8aea5"
        />
        <line
          x1={pad.left}
          x2={pad.left}
          y1={pad.top}
          y2={height - pad.bottom}
          stroke="#b8aea5"
        />
        {kind === "msd" && (
          <path
            d={`M${x(0)},${y(0)} L${x(maxTime)},${y(theoreticalMax)}`}
            fill="none"
            stroke="#8a8178"
            strokeDasharray="5 4"
            strokeWidth="1.5"
          />
        )}
        {actual.length > 1 && (
          <path
            d={path(actual)}
            fill="none"
            stroke="#e8724a"
            strokeLinejoin="miter"
            strokeWidth="2"
          />
        )}
        {kind === "msd" && ensembleData.length > 1 && (
          <path
            d={path(ensembleData)}
            fill="none"
            stroke="#67e8f9"
            strokeWidth="2"
          />
        )}
        {actual.slice(-1).map((point) => (
          <circle
            key="current"
            cx={x(point.time)}
            cy={y(point.value)}
            r="3.5"
            fill="#e8724a"
          >
            <title>{`${point.time.toFixed(2)} s: ${point.value.toFixed(2)} ${yLabel}`}</title>
          </circle>
        ))}
        <text x={pad.left} y={height - 8} fill="#8a8178" fontSize="10">
          0
        </text>
        <text
          x={width - pad.right - 22}
          y={height - 8}
          fill="#8a8178"
          fontSize="10"
        >
          {maxTime.toFixed(0)}s
        </text>
        <text
          x={pad.left - 5}
          y={height - pad.bottom + 4}
          textAnchor="end"
          fill="#8a8178"
          fontSize="10"
        >
          0
        </text>
        <text
          x={pad.left - 5}
          y={pad.top + 4}
          textAnchor="end"
          fill="#8a8178"
          fontSize="10"
        >
          {maxValue.toFixed(1)}
        </text>
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[#6b6b6b]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-5 rounded bg-[#e8724a]" />
          Một lần chạy
        </span>
        {kind === "msd" && (
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-5 rounded bg-[#67e8f9]" />
              Trung bình {ensembleRuns} lần
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-5 border-t border-dashed border-[#8a8178]" />
              4Dt
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export function BrownianPanel({
  params,
  samples,
  latest,
  viewMode,
  chartKind,
  onParamsChange,
  onViewModeChange,
  onChartKindChange,
  onStep,
  onNewSeed,
}: {
  params: BrownianParams;
  samples: BrownianSample[];
  latest: BrownianSnapshot | null;
  viewMode: BrownianViewMode;
  chartKind: ChartKind;
  onParamsChange: (patch: Partial<BrownianParams>) => void;
  onViewModeChange: (mode: BrownianViewMode) => void;
  onChartKindChange: (kind: ChartKind) => void;
  onStep: () => void;
  onNewSeed: () => void;
}) {
  const [panelTab, setPanelTab] = useState<"params" | "analysis" | "ai">(
    "params",
  );
  const diffusion = diffusionInMicrometersSquaredPerSecond(params);
  const gamma = calculateDragCoefficient(params.viscosity, params.radius);
  const latestX = latest ? latest.x * 1e6 : 0;
  const latestY = latest ? latest.y * 1e6 : 0;
  const latestDisplacement = latest ? latest.displacement * 1e6 : 0;
  const latestSquared = latest ? latest.squaredDisplacement * 1e12 : 0;
  const updateNumber = (key: keyof BrownianParams) => (value: number) =>
    onParamsChange({ [key]: value } as Partial<BrownianParams>);
  const updateBoolean = (key: keyof BrownianParams) => (value: boolean) =>
    onParamsChange({ [key]: value } as Partial<BrownianParams>);
  const handleSeed = (event: ChangeEvent<HTMLInputElement>) =>
    onParamsChange({
      seed: Math.max(1, Math.floor(Number(event.target.value) || 1)),
    });

  return (
    <div className="flex max-h-[58vh] w-full shrink-0 flex-col overflow-hidden border-t border-[#e8e2d9] bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
      <div className="flex border-b border-[#e8e2d9] px-2">
        {(
          [
            ["params", "Tham số"],
            ["analysis", "Phân tích"],
            ["ai", "Sửa bằng AI"],
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

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
        {panelTab === "params" && (
          <>
            <div className="flex rounded-[9px] bg-[#f5f1ec] p-0.5">
              {(
                [
                  ["micro", "Quan sát vi mô"],
                  ["trajectory", "Quỹ đạo Brown"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onViewModeChange(key)}
                  className={`flex-1 rounded-[7px] px-2 py-1.5 text-[11px] font-semibold ${viewMode === key ? "bg-white text-[#c96545] shadow-sm" : "text-[#6b6b6b]"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Metric
                label="Thời gian"
                value={`${formatNumber(latest?.time ?? 0, 2)} s`}
              />
              <Metric
                label="Độ dịch chuyển"
                value={`${formatNumber(latestDisplacement, 2)} µm`}
              />
              <Metric
                label="Vị trí x / y"
                value={`${formatNumber(latestX, 2)} / ${formatNumber(latestY, 2)} µm`}
              />
              <Metric
                label="Tốc độ |v|"
                value={`${formatNumber((latest?.speed ?? 0) * 1e6, 2)} µm/s`}
              />
              <Metric
                label="MSD một lần chạy"
                value={`${formatNumber(latestSquared, 2)} µm²`}
              />
              <Metric
                label="Hệ số D"
                value={`${formatNumber(diffusion, 3)} µm²/s`}
              />
            </div>

            <div className="flex rounded-[9px] bg-[#f5f1ec] p-0.5">
              {(
                [
                  ["displacement", "Độ dịch chuyển"],
                  ["msd", "Bình phương / MSD"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onChartKindChange(key)}
                  className={`flex-1 rounded-[7px] px-2 py-1.5 text-[11px] font-semibold ${chartKind === key ? "bg-white text-[#c96545] shadow-sm" : "text-[#6b6b6b]"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <BrownianChart
              samples={samples}
              diffusion={diffusion}
              ensembleRuns={params.ensembleRuns ?? 25}
              seed={params.seed + 101}
              kind={chartKind}
            />
            {chartKind === "msd" && (
              <RangeField
                label="Số lần lấy trung bình"
                value={params.ensembleRuns ?? 25}
                min={10}
                max={100}
                step={5}
                suffix="lần"
                onChange={updateNumber("ensembleRuns")}
              />
            )}

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
                <SelectField
                  label="Mô hình"
                  value={params.mode}
                  options={[
                    { value: "langevin", label: "Langevin vật lý" },
                    { value: "random-walk", label: "Random walk giáo dục" },
                  ]}
                  onChange={(value) =>
                    onParamsChange({ mode: value as BrownianParams["mode"] })
                  }
                />
                <SelectField
                  label="Biên quan sát"
                  value={params.boundary}
                  options={[
                    { value: "reflect", label: "Phản xạ" },
                    { value: "wrap", label: "Cuốn vòng" },
                    { value: "large-field", label: "Trường lớn" },
                  ]}
                  onChange={(value) =>
                    onParamsChange({
                      boundary: value as BrownianParams["boundary"],
                    })
                  }
                />
                <div className="flex items-center gap-2">
                  <label className="flex flex-1 items-center gap-2 text-[12px] text-[#4f4943]">
                    Seed
                    <input
                      type="number"
                      min={1}
                      value={params.seed}
                      onChange={handleSeed}
                      className="min-w-0 w-full rounded-[8px] border border-[#e8e2d9] px-2 py-1.5 font-mono text-[11px] outline-none focus:border-[#d97757]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={onNewSeed}
                    className="mt-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[#e8e2d9] text-[#6b6b6b] hover:bg-[#f7f3ee]"
                    title="Tạo seed mới"
                    aria-label="Tạo seed mới"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </details>

            <details open className="border-t border-[#e8e2d9] pt-3">
              <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
                Môi trường và hạt
              </summary>
              <div className="mt-3 space-y-3">
                <RangeField
                  label="Nhiệt độ T"
                  value={params.temperature - 273.15}
                  min={250 - 273.15}
                  max={380 - 273.15}
                  step={1}
                  suffix="°C"
                  onChange={(temperatureC) =>
                    onParamsChange({ temperature: temperatureC + 273.15 })
                  }
                />
                <RangeField
                  label="Độ nhớt η"
                  value={params.viscosity}
                  min={0.2}
                  max={5}
                  step={0.05}
                  suffix="mPa·s"
                  onChange={updateNumber("viscosity")}
                />
                <RangeField
                  label="Bán kính hạt R"
                  value={params.radius}
                  min={0.8}
                  max={5}
                  step={0.1}
                  suffix="µm"
                  onChange={updateNumber("radius")}
                />
                <RangeField
                  label="Khối lượng hiệu dụng m"
                  value={params.mass}
                  min={0.2}
                  max={8}
                  step={0.1}
                  suffix="10⁻⁹ kg"
                  onChange={updateNumber("mass")}
                />
                <ToggleField
                  label="Tính D tự động"
                  checked={params.autoDiffusion}
                  onChange={updateBoolean("autoDiffusion")}
                />
                {!params.autoDiffusion && (
                  <RangeField
                    label="Hệ số khuếch tán D"
                    value={params.diffusion}
                    min={0.01}
                    max={2}
                    step={0.01}
                    suffix="µm²/s"
                    onChange={updateNumber("diffusion")}
                  />
                )}
                <p className="text-[10px] leading-relaxed text-[#8a8178]">
                  γ = 6πηR = {gamma.toExponential(2)} kg/s. D được tính theo
                  Einstein–Stokes khi bật tự động.
                </p>
              </div>
            </details>

            <details open className="border-t border-[#e8e2d9] pt-3">
              <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
                Hiển thị
              </summary>
              <div className="mt-3 space-y-3">
                <RangeField
                  label="Mật độ phân tử nước"
                  value={params.moleculeDensity}
                  min={60}
                  max={320}
                  step={10}
                  suffix="hạt"
                  onChange={updateNumber("moleculeDensity")}
                />
                <RangeField
                  label="Độ dài vệt quỹ đạo"
                  value={params.trailLength}
                  min={80}
                  max={1200}
                  step={40}
                  suffix="mẫu"
                  onChange={updateNumber("trailLength")}
                />
                <ToggleField
                  label="Hiện phân tử nước"
                  checked={params.showMolecules}
                  onChange={updateBoolean("showMolecules")}
                />
                <ToggleField
                  label="Hiện quỹ đạo"
                  checked={params.showTrajectory}
                  onChange={updateBoolean("showTrajectory")}
                />
                <ToggleField
                  label="Hiện điểm mẫu"
                  checked={params.showSamples}
                  onChange={updateBoolean("showSamples")}
                />
                <ToggleField
                  label="Hiện vòng dịch chuyển"
                  checked={params.showRadius}
                  onChange={updateBoolean("showRadius")}
                />
                <ToggleField
                  label="Giữ toàn bộ quỹ đạo"
                  checked={params.keepFullPath}
                  onChange={updateBoolean("keepFullPath")}
                />
                <ToggleField
                  label="Hiện lưới mờ"
                  checked={params.showGrid}
                  onChange={updateBoolean("showGrid")}
                />
                <ToggleField
                  label="Hiện nhãn hạt"
                  checked={params.showLabel}
                  onChange={updateBoolean("showLabel")}
                />
                <ToggleField
                  label="Vector vận tốc"
                  checked={params.showVelocity}
                  onChange={updateBoolean("showVelocity")}
                />
                <ToggleField
                  label="Vector lực nhiệt"
                  checked={params.showRandomForce}
                  onChange={updateBoolean("showRandomForce")}
                />
                <ToggleField
                  label="Vector lực cản"
                  checked={params.showDragForce}
                  onChange={updateBoolean("showDragForce")}
                />
              </div>
            </details>

            <div className="rounded-[10px] bg-[#faf9f7] p-3 text-[11px] leading-relaxed text-[#6b6b6b]">
              Các phân tử nước được hiển thị theo mô hình minh họa rút gọn; quỹ
              đạo Brown được tính từ chuyển động random Gaussian và mô hình
              Langevin.
            </div>
          </>
        )}

        {panelTab === "analysis" && (
          <div className="space-y-4 text-[12px] leading-relaxed text-[#4f4943]">
            <div className="rounded-[10px] bg-[#faf9f7] p-3">
              <p className="font-semibold text-[#171717]">
                Quan sát và giải thích
              </p>
              <p className="mt-1">
                Hạt phấn hoa chuyển động liên tục theo đường gấp khúc, không có
                hướng ưu tiên và không lặp lại.
              </p>
            </div>
            <div className="space-y-2 border-b border-[#e8e2d9] pb-4">
              <p>
                Các phân tử nước va chạm không cân bằng lên hạt trong từng
                khoảng thời gian rất ngắn. Tổng hợp các va chạm đó làm hạt đổi
                hướng ngẫu nhiên.
              </p>
              <p>
                Khi nhiệt độ tăng, chuyển động mạnh hơn. Độ nhớt tăng hoặc hạt
                lớn hơn làm chuyển động yếu hơn.
              </p>
            </div>
            <div className="rounded-[10px] border border-[#e8e2d9] p-3 font-mono text-[12px] text-[#c96545]">
              <p>D = kBT / (6πηR)</p>
              <p className="mt-1">MSD(t) ≈ 4Dt</p>
            </div>
            <div>
              <p className="font-semibold text-[#171717]">Thử khám phá</p>
              <ul className="mt-2 space-y-2 pl-4">
                <li>• Điều gì xảy ra khi tăng nhiệt độ?</li>
                <li>• Hạt nhỏ hay hạt lớn chuyển động rõ hơn?</li>
                <li>
                  • Vì sao cần lấy trung bình nhiều lần để thấy MSD = 4Dt?
                </li>
              </ul>
            </div>
            <p className="text-[11px] text-[#8a8178]">
              Đường gấp khúc nối các vị trí được ghi nhận tại những thời điểm
              rời rạc, không mô tả toàn bộ đường đi liên tục giữa hai lần quan
              sát.
            </p>
          </div>
        )}

        {panelTab === "ai" && (
          <div className="space-y-4 text-[12px] text-[#4f4943]">
            <div className="rounded-[10px] bg-[#faf9f7] p-3 leading-relaxed">
              <p className="font-semibold text-[#171717]">Sửa bằng AI</p>
              <p className="mt-1">
                Mô phỏng đang dùng bộ tham số vật lý hiện tại. Bạn có thể ghi
                yêu cầu để chuẩn bị một biến thể thí nghiệm.
              </p>
            </div>
            <textarea
              className="min-h-28 w-full resize-none rounded-[9px] border border-[#e8e2d9] p-3 text-[12px] outline-none focus:border-[#d97757]"
              placeholder="Ví dụ: tạo một kịch bản so sánh nhiệt độ thấp và cao..."
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
