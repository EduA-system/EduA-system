"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import type { PendulumResonancePreset } from "../presets/types";
import { ParamRangeField } from "../shared/param-panel";
import type {
  PendulumResonanceParams,
  PendulumResonanceSnapshot,
  ResonanceMode,
} from "./types";

const PendulumResonanceCanvas = dynamic(
  () =>
    import("./pendulum-resonance-canvas").then(
      (module) => module.PendulumResonanceCanvas,
    ),
  { ssr: false },
);

const DEFAULT_PARAMS: PendulumResonanceParams = {
  sourceIndex: 0,
  initialAngle: 18,
  initialAngularVelocity: 0,
  gravity: 9.81,
  lengths: [1, 0.82, 1.18, 1.02, 0.72],
  masses: [0.12, 0.12, 0.12, 0.12, 0.12],
  damping: [0.018, 0.018, 0.018, 0.018, 0.018],
  supportMass: 0.8,
  supportStiffness: 4,
  supportDamping: 0.5,
  visualSupportScale: 8,
  driveEnabled: false,
  driveAmplitude: 0,
  driveFrequency: 0.5,
  drivePhase: 0,
  showTrails: true,
  showShadows: true,
  showBalance: true,
  showLabels: true,
  showEnergy: false,
  showSupportMotion: true,
  perspective: 0.9,
  speed: 1,
};

export function PendulumResonanceDetailView({
  preset,
  onBack,
}: {
  preset: PendulumResonancePreset;
  onBack: () => void;
}) {
  const [params, setParams] = useState<PendulumResonanceParams>(() => ({
    ...DEFAULT_PARAMS,
    lengths: [...DEFAULT_PARAMS.lengths],
    masses: [...DEFAULT_PARAMS.masses],
    damping: [...DEFAULT_PARAMS.damping],
  }));
  const [running, setRunning] = useState(false);
  const [latest, setLatest] = useState<PendulumResonanceSnapshot | null>(null);
  const [samples, setSamples] = useState<PendulumResonanceSnapshot[]>([]);
  const [resetSignal, setResetSignal] = useState(0);
  const [stepSignal, setStepSignal] = useState(0);
  const [edited, setEdited] = useState(false);
  const [panelTab, setPanelTab] = useState<"params" | "analysis" | "ai">(
    "params",
  );
  const [mode, setMode] = useState<ResonanceMode>("energy-transfer");

  const updateParams = (patch: Partial<PendulumResonanceParams>) => {
    setParams((current) => ({ ...current, ...patch }));
    setLatest(null);
    setSamples([]);
    setEdited(true);
  };
  const onSnapshot = (snapshot: PendulumResonanceSnapshot) => {
    setLatest(snapshot);
    setSamples((current) => {
      const next = [...current, snapshot];
      return next.length > 280 ? next.slice(-280) : next;
    });
  };
  const reset = () => {
    setLatest(null);
    setSamples([]);
    setResetSignal((value) => value + 1);
    setRunning(false);
  };
  const restore = () => {
    setParams({
      ...DEFAULT_PARAMS,
      lengths: [...DEFAULT_PARAMS.lengths],
      masses: [...DEFAULT_PARAMS.masses],
      damping: [...DEFAULT_PARAMS.damping],
    });
    setEdited(false);
    setMode("energy-transfer");
    reset();
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
                <PendulumResonanceCanvas
                  params={params}
                  running={running}
                  resetSignal={resetSignal}
                  stepSignal={stepSignal}
                  onRunningChange={setRunning}
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
          <PendulumResonancePanel
            params={params}
            latest={latest}
            samples={samples}
            panelTab={panelTab}
            mode={mode}
            onPanelTabChange={setPanelTab}
            onModeChange={(nextMode) => {
              setMode(nextMode);
              if (nextMode === "forced-drive")
                updateParams({
                  driveEnabled: true,
                  driveAmplitude: params.driveAmplitude || 0.6,
                });
            }}
            onParamsChange={updateParams}
            onReset={reset}
            onRunningChange={setRunning}
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

type PanelTab = "params" | "analysis" | "ai";
const colors = ["#fb7185", "#fb923c", "#facc15", "#4ade80", "#67e8f9"];

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-[9px] bg-[#faf9f7] p-2">
      <p className="text-[10px] text-[#8a8178]">{label}</p>
      <p
        className="mt-0.5 truncate text-[12px] font-semibold"
        style={color ? { color } : { color: "#171717" }}
      >
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
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-[11px] text-[#4f4943]">
      <span>{label}</span>
      <input
        aria-label={label}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#e8724a]"
      />
    </label>
  );
}

function MiniChart({
  samples,
  kind,
}: {
  samples: PendulumResonanceSnapshot[];
  kind: "amplitude" | "energy" | "spectrum";
}) {
  const width = 260;
  const height = 84;
  if (kind === "spectrum") {
    const values = [0.18, 0.34, 0.22, 0.72, 0.28, 0.16, 0.12, 0.2, 0.31, 0.18];
    const points = values
      .map(
        (value, index) =>
          `${12 + (index / (values.length - 1)) * 236},${height - 12 - value * 54}`,
      )
      .join(" ");
    return (
      <div className="rounded-[10px] border border-[#e8e2d9] p-2">
        <p className="mb-1 text-[11px] font-semibold text-[#4f4943]">
          Phổ đáp ứng
        </p>
        <svg viewBox={`0 0 ${width} ${height}`} className="h-20 w-full">
          <path d="M12 10V72H248" fill="none" stroke="#d8d1c9" />
          <polyline
            points={points}
            fill="none"
            stroke="#e8724a"
            strokeWidth="2"
          />
          <text x="12" y="82" fontSize="8" fill="#8a8178">
            fDrive
          </text>
          <text x="226" y="82" fontSize="8" fill="#8a8178">
            Hz
          </text>
        </svg>
        <p className="text-[10px] text-[#8a8178]">
          Quét tần số để đo biên độ xác lập của con lắc đang theo dõi.
        </p>
      </div>
    );
  }
  const values = samples.length
    ? samples
    : [
        {
          time: 0,
          amplitudes: [0, 0, 0, 0, 0],
          energies: [0, 0, 0, 0, 0],
          supportEnergy: 0,
          totalEnergy: 0,
        } as PendulumResonanceSnapshot,
      ];
  const getValue = (sample: PendulumResonanceSnapshot, index: number) =>
    kind === "amplitude"
      ? Math.abs(sample.amplitudes[index] ?? 0)
      : (sample.energies[index] ?? 0);
  const maxValue = Math.max(
    0.001,
    ...values.flatMap((sample) =>
      Array.from({ length: 5 }, (_, index) => getValue(sample, index)),
    ),
  );
  const pathFor = (index: number) =>
    values
      .map(
        (sample, sampleIndex) =>
          `${12 + (sampleIndex / Math.max(1, values.length - 1)) * 236},${height - 12 - (getValue(sample, index) / maxValue) * 54}`,
      )
      .join(" ");
  return (
    <div className="rounded-[10px] border border-[#e8e2d9] p-2">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[11px] font-semibold text-[#4f4943]">
          {kind === "amplitude"
            ? "Biên độ theo thời gian"
            : "Năng lượng từng con lắc"}
        </p>
        <span className="text-[9px] text-[#8a8178]">
          {kind === "amplitude" ? "θmax" : "J"}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-20 w-full">
        <path d="M12 10V72H248" fill="none" stroke="#d8d1c9" />
        <path d="M12 44H248M12 24H248" stroke="#eee8e2" strokeDasharray="2 3" />
        {colors.map((color, index) => (
          <polyline
            key={color}
            points={pathFor(index)}
            fill="none"
            stroke={color}
            strokeWidth={index === 0 ? 2 : 1.2}
            opacity={0.9}
          />
        ))}
        <text x="12" y="82" fontSize="8" fill="#8a8178">
          0 s
        </text>
        <text x="228" y="82" fontSize="8" fill="#8a8178">
          t
        </text>
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1">
        {colors.map((color, index) => (
          <span key={color} className="text-[9px]" style={{ color }}>
            ● {index + 1}
          </span>
        ))}
      </div>
    </div>
  );
}

export function PendulumResonancePanel({
  params,
  latest,
  samples,
  panelTab,
  mode,
  onPanelTabChange,
  onModeChange,
  onParamsChange,
  onReset,
  onRunningChange,
  onStep,
}: {
  params: PendulumResonanceParams;
  latest: PendulumResonanceSnapshot | null;
  samples: PendulumResonanceSnapshot[];
  panelTab: PanelTab;
  mode: ResonanceMode;
  onPanelTabChange: (tab: PanelTab) => void;
  onModeChange: (mode: ResonanceMode) => void;
  onParamsChange: (patch: Partial<PendulumResonanceParams>) => void;
  onReset: () => void;
  onRunningChange: (running: boolean) => void;
  onStep: () => void;
}) {
  const updateArray = (
    key: "lengths" | "masses" | "damping",
    index: number,
    value: number,
  ) =>
    onParamsChange({
      [key]: params[key].map((item, itemIndex) =>
        itemIndex === index ? value : item,
      ),
    });
  const applyPreset = (name: string) => {
    if (name === "equal") onParamsChange({ lengths: [1, 1, 1, 1, 1] });
    if (name === "pair")
      onParamsChange({
        lengths: [1, 0.82, 1.18, 1.02, 0.72],
        initialAngle: 18,
        sourceIndex: 0,
      });
    if (name === "increasing")
      onParamsChange({ lengths: [0.72, 0.86, 1, 1.14, 1.28] });
    if (name === "random")
      onParamsChange({ lengths: [0.76, 1.11, 0.91, 1.27, 0.69] });
    if (name === "off")
      onParamsChange({ lengths: [1, 0.62, 1.38, 0.74, 1.52] });
  };
  const strongest = latest
    ? latest.amplitudes.indexOf(Math.max(...latest.amplitudes))
    : 0;
  const nearest = latest
    ? latest.naturalFrequencies.reduce(
        (best, value, index) =>
          Math.abs(value - latest.naturalFrequencies[params.sourceIndex]!) <
          Math.abs(
            latest.naturalFrequencies[best]! -
              latest.naturalFrequencies[params.sourceIndex]!,
          )
            ? index
            : best,
        0,
      )
    : 0;
  const tabItems: Array<[PanelTab, string]> = [
    ["params", "Tham số"],
    ["analysis", "Phân tích"],
    ["ai", "Sửa bằng AI"],
  ];
  const modeItems: Array<[ResonanceMode, string]> = [
    ["energy-transfer", "Truyền năng lượng"],
    ["frequency-comparison", "So sánh tần số riêng"],
    ["forced-drive", "Kích thích cưỡng bức"],
  ];

  return (
    <aside className="flex max-h-[58vh] min-h-0 w-full flex-col border-t border-[#e8e2d9] bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
      <div className="flex shrink-0 border-b border-[#e8e2d9]">
        {tabItems.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onPanelTabChange(key)}
            className={`relative flex-1 px-2 py-3 text-[12px] font-medium ${panelTab === key ? "text-[#c96545]" : "text-[#6b6b6b] hover:text-[#171717]"}`}
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
              Kéo con lắc nguồn rồi thả để quan sát năng lượng truyền qua thanh
              treo chung. Không có lò xo nối trực tiếp giữa các quả nặng.
            </p>
            <div className="grid grid-cols-1 gap-1 rounded-[10px] border border-[#e8e2d9] p-1">
              {modeItems.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onModeChange(key)}
                  className={`rounded-[8px] px-2 py-1.5 text-left text-[10px] ${mode === key ? "bg-[#e8724a] font-semibold text-white" : "text-[#6b6b6b] hover:bg-[#f7f3ee]"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="rounded-[10px] border border-[#e8e2d9] p-3 text-[10px] leading-relaxed text-[#6b6b6b]">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
                Chú thích ký hiệu
              </p>
              <p>
                <span className="mr-1.5 inline-block size-2 rounded-full bg-cyan-300" />
                Thanh treo chung và dây độc lập
              </p>
              <p>
                <span className="mr-1.5 inline-block size-2 rounded-full bg-orange-400" />
                Con lắc nguồn
              </p>
              <p>
                <span className="mr-1.5 inline-block size-2 rounded-full bg-green-400" />
                Con lắc nhận cộng hưởng
              </p>
              <p>
                <span className="mr-1.5 inline-block h-px w-3 bg-purple-300" />
                Vector vận tốc góc
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                ["equal", "Tất cả giống nhau"],
                ["pair", "Một cặp cộng hưởng"],
                ["increasing", "Chiều dài tăng dần"],
                ["random", "Chiều dài ngẫu nhiên"],
                ["off", "Lệch tần số mạnh"],
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
            <div className="grid grid-cols-2 gap-2">
              <Metric
                label="f nguồn"
                value={`${(latest?.naturalFrequencies[params.sourceIndex] ?? 0).toFixed(2)} Hz`}
              />
              <Metric
                label="Gần nhất"
                value={`con lắc ${nearest + 1}`}
                color={colors[nearest]}
              />
              <Metric
                label="Biên độ lớn nhất"
                value={`con lắc ${strongest + 1}`}
                color={colors[strongest]}
              />
              <Metric label="Thanh treo" value="Cố định" />
            </div>
            <details open className="border-t border-[#e8e2d9] pt-3">
              <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
                Thí nghiệm
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
                <RangeField
                  label="Con lắc nguồn"
                  value={params.sourceIndex + 1}
                  min={1}
                  max={5}
                  step={1}
                  suffix=""
                  onChange={(value) =>
                    onParamsChange({ sourceIndex: Math.round(value) - 1 })
                  }
                />
                <RangeField
                  label="Góc lệch ban đầu"
                  value={params.initialAngle}
                  min={0}
                  max={35}
                  step={1}
                  suffix="°"
                  onChange={(value) => onParamsChange({ initialAngle: value })}
                />
              </div>
            </details>
            <details open className="border-t border-[#e8e2d9] pt-3">
              <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
                Năm con lắc
              </summary>
              <div className="mt-3 space-y-3">
                {params.lengths.map((length, index) => (
                  <div key={index} className="rounded-[9px] bg-[#faf9f7] p-2.5">
                    <p
                      className="mb-2 text-[11px] font-semibold"
                      style={{ color: colors[index] }}
                    >
                      Con lắc {index + 1}
                    </p>
                    <RangeField
                      label="Chiều dài"
                      value={length}
                      min={0.55}
                      max={1.6}
                      step={0.01}
                      suffix=" m"
                      onChange={(value) => updateArray("lengths", index, value)}
                    />
                    <div className="mt-2">
                      <RangeField
                        label="Khối lượng"
                        value={params.masses[index] ?? 0.12}
                        min={0.04}
                        max={0.4}
                        step={0.01}
                        suffix=" kg"
                        onChange={(value) =>
                          updateArray("masses", index, value)
                        }
                      />
                    </div>
                    <div className="mt-2">
                      <RangeField
                        label="Cản"
                        value={params.damping[index] ?? 0.018}
                        min={0}
                        max={0.12}
                        step={0.005}
                        suffix=""
                        onChange={(value) =>
                          updateArray("damping", index, value)
                        }
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-[#8a8178]">
                      f ={" "}
                      {latest?.naturalFrequencies[index]?.toFixed(2) ?? "0.00"}{" "}
                      Hz
                    </p>
                  </div>
                ))}
              </div>
            </details>
            <details className="border-t border-[#e8e2d9] pt-3">
              <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
                Thanh treo
              </summary>
              <div className="mt-3 space-y-3">
                <RangeField
                  label="Khối lượng hiệu dụng"
                  value={params.supportMass}
                  min={0.2}
                  max={2}
                  step={0.1}
                  suffix=" kg"
                  onChange={(value) => onParamsChange({ supportMass: value })}
                />
                <RangeField
                  label="Độ cứng với khung"
                  value={params.supportStiffness}
                  min={0}
                  max={12}
                  step={0.5}
                  suffix=""
                  onChange={(value) =>
                    onParamsChange({ supportStiffness: value })
                  }
                />
                <RangeField
                  label="Hệ số cản thanh"
                  value={params.supportDamping}
                  min={0}
                  max={2}
                  step={0.05}
                  suffix=""
                  onChange={(value) =>
                    onParamsChange({ supportDamping: value })
                  }
                />
                <RangeField
                  label="Khuếch đại khi vẽ"
                  value={params.visualSupportScale}
                  min={1}
                  max={16}
                  step={1}
                  suffix="×"
                  onChange={(value) =>
                    onParamsChange({ visualSupportScale: value })
                  }
                />
              </div>
            </details>
            <details className="border-t border-[#e8e2d9] pt-3">
              <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
                Ngoại lực
              </summary>
              <div className="mt-3 space-y-3">
                <ToggleField
                  label="Bật kích thích cưỡng bức"
                  checked={params.driveEnabled}
                  onChange={(checked) =>
                    onParamsChange({ driveEnabled: checked })
                  }
                />
                <RangeField
                  label="Biên độ lực"
                  value={params.driveAmplitude}
                  min={0}
                  max={2}
                  step={0.05}
                  suffix=""
                  onChange={(value) =>
                    onParamsChange({ driveAmplitude: value })
                  }
                />
                <RangeField
                  label="Tần số kích thích"
                  value={params.driveFrequency}
                  min={0.1}
                  max={1.4}
                  step={0.01}
                  suffix=" Hz"
                  onChange={(value) =>
                    onParamsChange({ driveFrequency: value })
                  }
                />
                <RangeField
                  label="Pha"
                  value={params.drivePhase}
                  min={0}
                  max={6.28}
                  step={0.1}
                  suffix=" rad"
                  onChange={(value) => onParamsChange({ drivePhase: value })}
                />
              </div>
            </details>
            <details open className="border-t border-[#e8e2d9] pt-3">
              <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
                Hiển thị
              </summary>
              <div className="mt-3 space-y-3">
                <ToggleField
                  label="Hiện quỹ đạo chiều sâu"
                  checked={params.showTrails}
                  onChange={(checked) =>
                    onParamsChange({ showTrails: checked })
                  }
                />
                <ToggleField
                  label="Hiện bóng"
                  checked={params.showShadows}
                  onChange={(checked) =>
                    onParamsChange({ showShadows: checked })
                  }
                />
                <ToggleField
                  label="Hiện đường cân bằng"
                  checked={params.showBalance}
                  onChange={(checked) =>
                    onParamsChange({ showBalance: checked })
                  }
                />
                <ToggleField
                  label="Hiện nhãn"
                  checked={params.showLabels}
                  onChange={(checked) =>
                    onParamsChange({ showLabels: checked })
                  }
                />
                <ToggleField
                  label="Hiện năng lượng"
                  checked={params.showEnergy}
                  onChange={(checked) =>
                    onParamsChange({ showEnergy: checked })
                  }
                />
                <ToggleField
                  label="Hiện rung thanh treo"
                  checked={params.showSupportMotion}
                  onChange={(checked) =>
                    onParamsChange({ showSupportMotion: checked })
                  }
                />
              </div>
            </details>
          </>
        )}
        {panelTab === "analysis" && (
          <div className="space-y-4 text-[12px] leading-relaxed text-[#4f4943]">
            <div className="rounded-[10px] bg-[#faf9f7] p-3">
              <p className="font-semibold text-[#171717]">
                Năng lượng truyền qua đâu?
              </p>
              <p className="mt-1">
                Phản lực của từng con lắc làm thanh treo rung nhẹ. Gia tốc của
                thanh trở thành kích thích nền cho cả năm con lắc, vì vậy không
                có lực nối trực tiếp giữa các quả nặng.
              </p>
            </div>
            <MiniChart samples={samples} kind="amplitude" />
            <MiniChart samples={samples} kind="energy" />
            <MiniChart samples={samples} kind="spectrum" />
            <div className="space-y-2 border-t border-[#e8e2d9] pt-3">
              <p>
                <b>Tần số riêng:</b> f = √(g/L)/(2π), chiều dài càng gần nhau
                thì đáp ứng càng gần nhau.
              </p>
              <p>
                <b>Cộng hưởng:</b> con lắc có biên độ đo được tăng mạnh nhất
                được làm nổi bật, không chỉ dựa vào công thức.
              </p>
              <p>
                <b>Góc nhìn:</b> quả nặng dao động trong mặt phẳng y-z, tiến ra
                trước rồi lùi về sau qua phép chiếu phối cảnh.
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
                nghiệm dao động.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Làm cặp cộng hưởng rõ hơn",
                "Giảm rung thanh treo",
                "Tăng độ lệch con lắc nguồn",
                "Hiển thị rõ năng lượng",
                "Giải thích cho học sinh lớp 12",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="rounded-full border border-[#e8e2d9] px-2.5 py-1 text-[10px] text-[#6b6b6b] hover:border-[#d97757] hover:text-[#c96545]"
                >
                  {suggestion}
                </button>
              ))}
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
