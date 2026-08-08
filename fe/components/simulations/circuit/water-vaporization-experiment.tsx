"use client";
import { useCallback, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import {
  createWaterVaporizationState,
  snapshotWaterVaporization,
} from "../engines/circuit/water-vaporization-physics";
import type {
  WaterVaporizationParams,
  WaterVaporizationPoint,
  WaterVaporizationSnapshot,
} from "../engines/circuit/water-vaporization-types";
import { WaterVaporizationScene } from "../renderers/circuit/water-vaporization-scene";
import { ParamPanel, type ParamDef } from "../shared/param-panel";
import { SimulationToolbar } from "../shared/simulation-toolbar";
import { SimulationTabs, type SimulationTab } from "../shared/simulation-tabs";
import { ZoomControls } from "../shared/zoom-controls";

const DEFAULTS: WaterVaporizationParams = {
  voltage: 24,
  current: 5,
  waterMass: 0.03,
  latentHeat: 2260000,
  heatLossRatio: 0.08,
  switchClosed: false,
};
const SCHEMA: ParamDef[] = [
  {
    key: "voltage",
    label: "Hiệu điện thế U",
    unit: "V",
    min: 6,
    max: 30,
    step: 0.5,
  },
  {
    key: "current",
    label: "Cường độ dòng điện I",
    unit: "A",
    min: 1,
    max: 6,
    step: 0.1,
  },
  {
    key: "waterMass",
    label: "Khối lượng nước m₀",
    unit: "kg",
    min: 0.01,
    max: 0.08,
    step: 0.005,
  },
  {
    key: "heatLossPercent",
    label: "Tỉ lệ hao phí nhiệt",
    unit: "%",
    min: 0,
    max: 20,
    step: 1,
  },
];
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-[#faf9f7] p-2">
      <div className="text-[10px] leading-tight text-[#8a8178]">{label}</div>
      <b className="mt-1 block text-[12px] tabular-nums">{value}</b>
    </div>
  );
}
function Chart({
  points,
  mass,
}: {
  points: WaterVaporizationPoint[];
  mass: number;
}) {
  const maxTime = Math.max(1, points.at(-1)?.time ?? 1);
  return (
    <div className="rounded-[12px] border border-[#e8e2d9] p-3">
      <b className="text-xs">Khối lượng nước hoá hơi theo thời gian</b>
      <svg viewBox="0 0 280 105" className="mt-2 w-full">
        <path d="M25 6V84H276" fill="none" stroke="#d8d1c9" />
        <polyline
          fill="none"
          stroke="#0ea5e9"
          strokeWidth="2.5"
          points={points
            .map(
              (p) =>
                `${25 + (p.time / maxTime) * 251},${84 - (p.vaporizedMass / mass) * 72}`,
            )
            .join(" ")}
        />
      </svg>
      <div className="flex justify-between text-[10px] text-[#8a8178]">
        <span>
          Δm: {((points.at(-1)?.vaporizedMass ?? 0) * 1000).toFixed(1)} g
        </span>
        <span>t: {maxTime.toFixed(0)} s</span>
      </div>
    </div>
  );
}

export function WaterVaporizationExperiment({
  onBack,
}: {
  onBack: () => void;
}) {
  const [params, setParams] = useState(DEFAULTS),
    [running, setRunning] = useState(false),
    [speed, setSpeed] = useState(1),
    [resetSignal, setResetSignal] = useState(0),
    [zoom, setZoom] = useState(100),
    [tab, setTab] = useState<SimulationTab>("params");
  const [live, setLive] = useState<WaterVaporizationSnapshot>(() =>
    snapshotWaterVaporization(createWaterVaporizationState(), DEFAULTS),
  );
  const [points, setPoints] = useState<WaterVaporizationPoint[]>([]);
  const lastPoint = useRef(-1);
  const update = (patch: Partial<WaterVaporizationParams>) =>
    setParams((old) => ({ ...old, ...patch }));
  const reset = () => {
    setRunning(false);
    update({ switchClosed: false });
    setResetSignal((v) => v + 1);
    setPoints([]);
    lastPoint.current = -1;
  };
  const onSnapshot = useCallback((s: WaterVaporizationSnapshot) => {
    setLive(s);
    if (s.time - lastPoint.current > 2) {
      lastPoint.current = s.time;
      setPoints((old) =>
        [
          ...old,
          {
            time: s.time,
            vaporizedMass: s.vaporizedMass,
            electricalEnergy: s.electricalEnergy,
          },
        ].slice(-300),
      );
    }
  }, []);
  const toggle = (closed: boolean) => {
    setRunning(closed);
    update({ switchClosed: closed });
  };
  const values = {
    voltage: params.voltage,
    current: params.current,
    waterMass: params.waterMass,
    heatLossPercent: params.heatLossRatio * 100,
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
        <b className="truncate text-sm">Đo nhiệt hoá hơi riêng L của nước</b>
      </header>
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <section className="flex min-h-[360px] min-w-0 flex-1 flex-col overflow-hidden p-2">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[16px] border border-[#e8e2d9] shadow-sm">
            <WaterVaporizationScene
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
            Nước đang sôi ở 100 °C nhận điện năng và hoá hơi; đo độ giảm khối
            lượng để xác định L = UIt/Δm.
          </p>
        </section>
        <aside className="flex max-h-[58vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-[#e8e2d9] bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
          <SimulationTabs value={tab} onChange={setTab} />
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            {tab === "params" && (
              <>
                <div className="rounded-[10px] bg-[#faf9f7] p-3 text-[11px] leading-relaxed text-[#6b6b6b]">
                  Ở 100 °C, nhiệt độ không tăng khi nước hoá hơi. Bỏ qua hao
                  phí: <b>UIt = ΔmL</b>.
                  <p className="mt-2 text-[10px] text-[#8a8178]">
                    U: hiệu điện thế · I: cường độ dòng điện · t: thời gian ·
                    Δm: khối lượng nước hoá hơi · L: nhiệt hoá hơi riêng.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Metric
                    label="Khóa K (công tắc)"
                    value={params.switchClosed ? "Đóng" : "Mở"}
                  />
                  <Metric
                    label="t (thời gian)"
                    value={`${live.time.toFixed(1)} s`}
                  />
                  <Metric
                    label="Công suất P = UI"
                    value={`${live.power.toFixed(1)} W`}
                  />
                  <Metric label="Nhiệt độ sôi" value="100 °C" />
                  <Metric
                    label="Δm (đã hoá hơi)"
                    value={`${(live.vaporizedMass * 1000).toFixed(2)} g`}
                  />
                  <Metric
                    label="Nước còn lại"
                    value={`${(live.remainingWaterMass * 1000).toFixed(1)} g`}
                  />
                  <Metric
                    label="Điện năng A = UIt"
                    value={`${live.electricalEnergy.toFixed(0)} J`}
                  />
                  <Metric
                    label="L (nhiệt hoá hơi riêng)"
                    value={
                      live.measuredLatentHeat === null
                        ? "—"
                        : `${(live.measuredLatentHeat / 1e6).toFixed(3)} MJ/kg`
                    }
                  />
                </div>
                <ParamPanel
                  schema={SCHEMA}
                  values={values}
                  onChange={(key, value) =>
                    key === "heatLossPercent"
                      ? update({ heatLossRatio: value / 100 })
                      : update({
                          [key]: value,
                        } as Partial<WaterVaporizationParams>)
                  }
                />
              </>
            )}
            {tab === "analysis" && (
              <>
                <Chart points={points} mass={params.waterMass} />
                <div className="rounded-[10px] border border-[#e8e2d9] p-3 text-xs leading-relaxed">
                  <b>Quy trình đo</b>
                  <ol className="mt-2 list-decimal space-y-1 pl-4">
                    <li>Đưa nước đến trạng thái sôi ổn định ở 100 °C.</li>
                    <li>Đóng K và bắt đầu đo thời gian.</li>
                    <li>Đo độ giảm khối lượng Δm trên cân.</li>
                    <li>Tính L = UIt/Δm và đánh giá hao phí.</li>
                  </ol>
                </div>
                <div className="rounded-[10px] bg-emerald-50 p-3 text-xs text-emerald-900">
                  <b>Kết quả</b>
                  <p className="mt-1">
                    {live.measuredLatentHeat === null
                      ? "Hãy đóng K và chờ đủ lượng nước hoá hơi."
                      : `L đo = ${(live.measuredLatentHeat / 1e6).toFixed(3)} MJ/kg, sai lệch ${Math.abs(live.relativeError ?? 0).toFixed(1)}% so với 2,260 MJ/kg.`}
                  </p>
                </div>
              </>
            )}
            {tab === "ai" && (
              <div className="rounded-[10px] bg-amber-50 p-3 text-xs text-amber-800">
                <b>Sửa bằng AI</b>
                <p className="mt-1">
                  Luồng AI chung chưa được kết nối dịch vụ.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
