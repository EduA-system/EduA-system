"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import {
  createWaterCalorimetryState,
  snapshotWaterCalorimetry,
} from "../engines/circuit/water-calorimetry-physics";
import type {
  WaterCalorimetryParams,
  WaterCalorimetryPoint,
  WaterCalorimetrySnapshot,
} from "../engines/circuit/water-calorimetry-types";
import { WaterCalorimetryScene } from "../renderers/circuit/water-calorimetry-scene";
import { ParamPanel, type ParamDef } from "../shared/param-panel";
import { SimulationToolbar } from "../shared/simulation-toolbar";
import { SimulationTabs, type SimulationTab } from "../shared/simulation-tabs";
import { ZoomControls } from "../shared/zoom-controls";

const DEFAULTS: WaterCalorimetryParams = {
  voltage: 12,
  current: 3,
  waterMass: 0.2,
  specificHeat: 4200,
  heatLoss: 0.08,
  initialTemperature: 25,
  switchClosed: false,
};

export function WaterCalorimetryExperiment({ onBack }: { onBack: () => void }) {
  const [params, setParams] = useState(DEFAULTS);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [resetSignal, setResetSignal] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [tab, setTab] = useState<SimulationTab>("params");
  const [live, setLive] = useState<WaterCalorimetrySnapshot>(() =>
    snapshotWaterCalorimetry(createWaterCalorimetryState(DEFAULTS), DEFAULTS),
  );
  const [points, setPoints] = useState<WaterCalorimetryPoint[]>([]);
  const lastPoint = useRef(-1);
  const update = (patch: Partial<WaterCalorimetryParams>) =>
    setParams((old) => ({ ...old, ...patch }));
  const reset = () => {
    setRunning(false);
    setParams((old) => ({ ...old, switchClosed: false }));
    setResetSignal((value) => value + 1);
    setPoints([]);
    lastPoint.current = -1;
  };
  const onSnapshot = useCallback((snapshot: WaterCalorimetrySnapshot) => {
    setLive(snapshot);
    if (snapshot.time - lastPoint.current > 0.5) {
      lastPoint.current = snapshot.time;
      setPoints((old) =>
        [
          ...old,
          {
            time: snapshot.time,
            temperature: snapshot.temperature,
            electricalEnergy: snapshot.electricalEnergy,
          },
        ].slice(-300),
      );
    }
  }, []);
  const toggle = (closed: boolean) => {
    setRunning(closed);
    update({ switchClosed: closed });
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
        <b className="truncate text-sm">Đo nhiệt dung riêng c của nước</b>
      </header>
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <section className="flex min-h-[360px] min-w-0 flex-1 flex-col overflow-hidden p-2">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[16px] border border-[#e8e2d9] shadow-sm">
            <WaterCalorimetryScene
              params={params}
              running={running}
              speed={speed}
              resetSignal={resetSignal}
              zoom={zoom}
              onSnapshot={onSnapshot}
            />
            <SimulationToolbar
              running={params.switchClosed}
              speed={speed}
              onRunningChange={toggle}
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
            Đóng khóa K để dây nung truyền nhiệt cho nước; đọc đồng thời U, I, t
            và nhiệt độ rồi xác định c = UIt/(mΔT).
          </p>
        </section>
        <WaterCalorimetryPanel
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
    label: "Hiệu điện thế U",
    unit: "V",
    min: 3,
    max: 24,
    step: 0.5,
  },
  {
    key: "current",
    label: "Cường độ dòng điện I",
    unit: "A",
    min: 0.5,
    max: 6,
    step: 0.1,
  },
  {
    key: "waterMass",
    label: "Khối lượng nước m",
    unit: "kg",
    min: 0.05,
    max: 0.5,
    step: 0.01,
  },
  {
    key: "heatLoss",
    label: "Hệ số thất thoát nhiệt",
    unit: "W/K",
    min: 0,
    max: 0.4,
    step: 0.01,
  },
  {
    key: "initialTemperature",
    label: "Nhiệt độ ban đầu T₀",
    unit: "°C",
    min: 10,
    max: 40,
    step: 1,
  },
];

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-[#faf9f7] p-2">
      <div className="text-[10px] text-[#8a8178]">{label}</div>
      <b className="text-[12px] tabular-nums">{value}</b>
    </div>
  );
}

function Chart({
  points,
  initialTemperature,
}: {
  points: WaterCalorimetryPoint[];
  initialTemperature: number;
}) {
  const maxTime = Math.max(1, points.at(-1)?.time ?? 1);
  const maxDelta = Math.max(
    5,
    ...points.map((point) => point.temperature - initialTemperature),
  );
  return (
    <div className="rounded-[12px] border border-[#e8e2d9] p-3">
      <b className="text-xs">Nhiệt độ theo thời gian</b>
      <svg viewBox="0 0 280 105" className="mt-2 w-full">
        <path d="M25 6V84H276" fill="none" stroke="#d8d1c9" />
        <polyline
          fill="none"
          stroke="#e8724a"
          strokeWidth="2.5"
          points={points
            .map(
              (point) =>
                `${25 + (point.time / maxTime) * 251},${84 - ((point.temperature - initialTemperature) / maxDelta) * 72}`,
            )
            .join(" ")}
        />
      </svg>
      <div className="flex justify-between text-[10px] text-[#8a8178]">
        <span>T₀ = {initialTemperature.toFixed(0)} °C</span>
        <span>t = {maxTime.toFixed(0)} s</span>
      </div>
    </div>
  );
}

export function WaterCalorimetryPanel({
  params,
  live,
  points,
  tab,
  onTabChange,
  onParamsChange,
}: {
  params: WaterCalorimetryParams;
  live: WaterCalorimetrySnapshot;
  points: WaterCalorimetryPoint[];
  tab: SimulationTab;
  onTabChange: (value: SimulationTab) => void;
  onParamsChange: (patch: Partial<WaterCalorimetryParams>) => void;
}) {
  const values = {
    voltage: params.voltage,
    current: params.current,
    waterMass: params.waterMass,
    heatLoss: params.heatLoss,
    initialTemperature: params.initialTemperature,
  };
  return (
    <aside className="flex max-h-[58vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-[#e8e2d9] bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
      <SimulationTabs value={tab} onChange={onTabChange} />
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {tab === "params" && (
          <>
            <div className="rounded-[10px] bg-[#faf9f7] p-3 text-[11px] leading-relaxed text-[#6b6b6b]">
              Điện năng <b>A = UIt</b> được dây nung biến đổi thành nhiệt. Nếu
              bỏ qua nhiệt lượng kế và hao phí: <b>UIt = mcΔT</b>.
              <p className="mt-2 text-[10px] text-[#8a8178]">
                U: hiệu điện thế · I: cường độ dòng điện · t: thời gian · m:
                khối lượng nước · c: nhiệt dung riêng · ΔT = T − T₀: độ tăng
                nhiệt độ.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Metric
                label="Khóa K (công tắc)"
                value={params.switchClosed ? "Đóng" : "Mở"}
              />
              <Metric
                label="Đồng hồ t (thời gian)"
                value={`${live.time.toFixed(1)} s`}
              />
              <Metric
                label="Ampe kế I (dòng điện)"
                value={`${params.switchClosed ? params.current.toFixed(2) : "0.00"} A`}
              />
              <Metric
                label="Vôn kế U (hiệu điện thế)"
                value={`${params.voltage.toFixed(1)} V`}
              />
              <Metric
                label="Nhiệt kế T (nhiệt độ)"
                value={`${live.temperature.toFixed(2)} °C`}
              />
              <Metric
                label="ΔT (độ tăng nhiệt độ)"
                value={`${live.deltaTemperature.toFixed(2)} K`}
              />
              <Metric
                label="Điện năng A (UIt)"
                value={`${live.electricalEnergy.toFixed(0)} J`}
              />
              <Metric
                label="c (nhiệt dung riêng)"
                value={
                  live.measuredSpecificHeat === null
                    ? "—"
                    : `${live.measuredSpecificHeat.toFixed(0)} J/kg·K`
                }
              />
            </div>
            <ParamPanel
              schema={SCHEMA}
              values={values}
              onChange={(key, value) =>
                onParamsChange({
                  [key]: value,
                } as Partial<WaterCalorimetryParams>)
              }
            />
          </>
        )}
        {tab === "analysis" && (
          <>
            <Chart
              points={points}
              initialTemperature={params.initialTemperature}
            />
            <div className="rounded-[10px] border border-[#e8e2d9] p-3 text-xs leading-relaxed">
              <b>Quy trình đo</b>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>Đo khối lượng m và nhiệt độ ban đầu T₀.</li>
                <li>Đóng K, đồng thời bắt đầu tính thời gian.</li>
                <li>Khuấy đều, đọc U, I, t và nhiệt độ T.</li>
                <li>Tính c = UIt/[m(T − T₀)].</li>
              </ol>
            </div>
            <div className="rounded-[10px] bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900">
              <b>Kết quả</b>
              <p className="mt-1">
                {live.measuredSpecificHeat === null
                  ? "Hãy đóng K và chờ nhiệt độ tăng đủ để lấy số liệu."
                  : `c đo = ${live.measuredSpecificHeat.toFixed(0)} J/(kg·K), sai lệch ${Math.abs(live.relativeError ?? 0).toFixed(1)}% so với c = ${params.specificHeat.toFixed(0)} J/(kg·K).`}
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
