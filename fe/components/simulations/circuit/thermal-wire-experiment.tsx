"use client";
import { useCallback, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { createThermalWireState } from "../engines/circuit/thermal-wire-physics";
import type {
  ThermalWireParams,
  ThermalWirePoint,
  ThermalWireSnapshot,
} from "../engines/circuit/thermal-wire-types";
import { ThermalWireScene } from "../renderers/circuit/thermal-wire-scene";
import { ParamPanel, type ParamDef } from "../shared/param-panel";
import { SimulationToolbar } from "../shared/simulation-toolbar";
import { SimulationTabs, type SimulationTab } from "../shared/simulation-tabs";
import { ZoomControls } from "../shared/zoom-controls";
const DEFAULTS: ThermalWireParams = {
  voltage: 12,
  resistor: 1.2,
  wireResistance: 2.2,
  wireMass: 0.0025,
  heatCapacity: 450,
  heatLoss: 0.012,
  ignitionTemperature: 230,
  masterSwitchClosed: false,
};
export function ThermalWireExperiment({ onBack }: { onBack: () => void }) {
  const [params, setParams] = useState(DEFAULTS),
    [running, setRunning] = useState(false),
    [speed, setSpeed] = useState(1),
    [resetSignal, setResetSignal] = useState(0),
    [zoom, setZoom] = useState(100),
    [tab, setTab] = useState<SimulationTab>("params"),
    [live, setLive] = useState<ThermalWireSnapshot>(() =>
      createThermalWireState(DEFAULTS),
    ),
    [points, setPoints] = useState<ThermalWirePoint[]>([]);
  const last = useRef(-1);
  const update = (patch: Partial<ThermalWireParams>) =>
    setParams((old) => ({ ...old, ...patch }));
  const reset = () => {
    setRunning(false);
    setParams((old) => ({ ...old, masterSwitchClosed: false }));
    setResetSignal((v) => v + 1);
    setPoints([]);
    last.current = -1;
  };
  const snapshot = useCallback((value: ThermalWireSnapshot) => {
    setLive(value);
    if (value.time - last.current > 0.12) {
      last.current = value.time;
      setPoints((old) =>
        [
          ...old,
          {
            time: value.time,
            current: value.current,
            temperature: value.temperature,
            power: value.power,
            energy: value.energy,
            burn: value.burnProgress.reduce((a, b) => a + b, 0) / 3,
          },
        ].slice(-280),
      );
    }
  }, []);
  const switchCircuit = (closed: boolean) => {
    setRunning(closed);
    update({ masterSwitchClosed: closed });
  };
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e8e2d9] bg-white px-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13px] text-[#6b6b6b]"
        >
          <ChevronLeft className="h-5 w-5" />
          Thư viện
        </button>
        <span className="text-[#d8d1c9]">/</span>
        <b className="truncate text-sm">
          Tác dụng nhiệt của dòng điện – Dây sắt đốt cháy giấy
        </b>
      </header>
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <section className="flex min-h-[360px] min-w-0 flex-1 flex-col overflow-hidden p-2">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[16px] border border-[#e8e2d9] shadow-sm">
            <ThermalWireScene
              params={params}
              running={running}
              speed={speed}
              resetSignal={resetSignal}
              zoom={zoom}
              onSnapshot={snapshot}
            />
            <SimulationToolbar
              running={params.masterSwitchClosed}
              speed={speed}
              onRunningChange={switchCircuit}
              onReset={reset}
              onSpeedChange={setSpeed}
            />
            <ZoomControls
              percent={zoom}
              onZoomIn={() => setZoom((v) => Math.min(130, v + 10))}
              onZoomOut={() => setZoom((v) => Math.max(70, v - 10))}
            />
          </div>
          <p className="mt-3 text-center text-[13px] text-[#6b6b6b]">
            Dòng điện chạy qua dây sắt làm dây nóng lên. Khi nhiệt độ đủ cao,
            các mảnh giấy ám nâu, bắt lửa và cháy.
          </p>
        </section>
        <ThermalWirePanel
          params={params}
          live={live}
          points={points}
          tab={tab}
          onTabChange={setTab}
          onParamsChange={update}
        />
      </div>
    </div>
  );
}

const SCHEMA: ParamDef[] = [
  {
    key: "voltage",
    label: "Hiệu điện thế E",
    unit: "V",
    min: 2,
    max: 18,
    step: 0.5,
  },
  {
    key: "resistor",
    label: "Điện trở bảo vệ R",
    unit: "Ω",
    min: 0.5,
    max: 8,
    step: 0.1,
  },
  {
    key: "wireResistance",
    label: "Điện trở dây sắt",
    unit: "Ω",
    min: 0.3,
    max: 4,
    step: 0.1,
  },
  {
    key: "heatLoss",
    label: "Mức thất thoát nhiệt",
    unit: "W/K",
    min: 0.002,
    max: 0.08,
    step: 0.002,
  },
  {
    key: "ignitionTemperature",
    label: "Nhiệt độ bắt cháy giấy",
    unit: "°C",
    min: 180,
    max: 320,
    step: 5,
  },
];
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-[#faf9f7] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-[#8a8178]">
        {label}
      </div>
      <div className="mt-1 text-[12px] font-semibold">{value}</div>
    </div>
  );
}
function Chart({ points }: { points: ThermalWirePoint[] }) {
  const t = Math.max(1, points.at(-1)?.time ?? 1),
    temp = Math.max(100, ...points.map((p) => p.temperature));
  return (
    <div className="rounded-[12px] border border-[#e8e2d9] p-3">
      <b className="text-xs">Nhiệt độ và mức cháy theo thời gian</b>
      <svg viewBox="0 0 280 100" className="mt-2 h-28 w-full">
        <path d="M25 5V82H276" fill="none" stroke="#d8d1c9" />
        <polyline
          fill="none"
          stroke="#f97316"
          strokeWidth="2"
          points={points
            .map(
              (p) =>
                `${25 + (p.time / t) * 251},${82 - (p.temperature / temp) * 72}`,
            )
            .join(" ")}
        />
        <polyline
          fill="none"
          stroke="#78350f"
          strokeWidth="2"
          points={points
            .map((p) => `${25 + (p.time / t) * 251},${82 - p.burn * 72}`)
            .join(" ")}
        />
      </svg>
      <div className="flex gap-3 text-[10px]">
        <span className="text-orange-600">● Nhiệt độ</span>
        <span className="text-amber-900">● Mức cháy</span>
      </div>
    </div>
  );
}
export function ThermalWirePanel({
  params,
  live,
  points,
  tab,
  onTabChange,
  onParamsChange,
}: {
  params: ThermalWireParams;
  live: ThermalWireSnapshot;
  points: ThermalWirePoint[];
  tab: SimulationTab;
  onTabChange: (v: SimulationTab) => void;
  onParamsChange: (p: Partial<ThermalWireParams>) => void;
}) {
  const values = {
    voltage: params.voltage,
    resistor: params.resistor,
    wireResistance: params.wireResistance,
    heatLoss: params.heatLoss,
    ignitionTemperature: params.ignitionTemperature,
  };
  const mean = live.burnProgress.reduce((a, b) => a + b, 0) / 3;
  return (
    <aside className="flex max-h-[58vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-[#e8e2d9] bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
      <SimulationTabs value={tab} onChange={onTabChange} />
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {tab === "params" && (
          <>
            <div className="rounded-[10px] bg-[#faf9f7] p-3 text-[11px] leading-relaxed text-[#6b6b6b]">
              Dòng điện làm dây sắt tỏa nhiệt theo công suất P = I²R. Giấy tiếp
              xúc với dây nóng sẽ ám nâu, bắt lửa và cháy thủng.
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Metric
                label="Chốt K"
                value={params.masterSwitchClosed ? "Đóng" : "Mở"}
              />
              <Metric
                label="Dòng điện"
                value={`${live.current.toFixed(2)} A`}
              />
              <Metric
                label="Nhiệt độ dây"
                value={`${live.temperature.toFixed(0)} °C`}
              />
              <Metric
                label="Công suất nhiệt"
                value={`${live.power.toFixed(1)} W`}
              />
              <Metric
                label="Năng lượng"
                value={`${live.energy.toFixed(1)} J`}
              />
              <Metric label="Mức cháy" value={`${(mean * 100).toFixed(0)}%`} />
            </div>
            <ParamPanel
              schema={SCHEMA}
              values={values}
              onChange={(key, value) =>
                onParamsChange({ [key]: value } as Partial<ThermalWireParams>)
              }
            />
          </>
        )}
        {tab === "analysis" && (
          <>
            <Chart points={points} />
            <div className="rounded-[10px] border border-[#e8e2d9] p-3 text-xs leading-relaxed">
              <b>Kết luận</b>
              <p className="mt-1">
                Dòng điện qua dây sắt biến điện năng thành nhiệt năng. Khi nhiệt
                độ vượt ngưỡng bắt cháy, giấy bị oxi hóa nhanh và cháy.
              </p>
            </div>
          </>
        )}
        {tab === "ai" && (
          <div className="rounded-[10px] bg-amber-50 p-3 text-xs text-amber-800">
            <b>Sửa bằng AI</b>
            <p className="mt-1">Luồng AI chung chưa được kết nối dịch vụ.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
