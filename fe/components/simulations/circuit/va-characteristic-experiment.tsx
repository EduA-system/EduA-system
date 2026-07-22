"use client";
import { useCallback, useState } from "react";
import { ChevronLeft } from "lucide-react";
import {
  createVaState,
  steadyVaPoint,
} from "../engines/circuit/va-characteristic-physics";
import type {
  VaParams,
  VaSnapshot,
} from "../engines/circuit/va-characteristic-types";
import { VaCharacteristicScene } from "../renderers/circuit/va-characteristic-scene";
import { ParamPanel, type ParamDef } from "../shared/param-panel";
import { SimulationToolbar } from "../shared/simulation-toolbar";
import { SimulationTabs, type SimulationTab } from "../shared/simulation-tabs";
import { ZoomControls } from "../shared/zoom-controls";
const DEFAULTS: VaParams = {
  voltage: 6,
  resistorOhms: 10,
  lampColdResistance: 3.2,
  temperatureCoefficient: 0.0042,
  thermalMass: 0.8,
  heatLoss: 0.018,
  switchClosed: false,
};
export function VaCharacteristicExperiment({ onBack }: { onBack: () => void }) {
  const [params, setParams] = useState(DEFAULTS),
    [running, setRunning] = useState(false),
    [speed, setSpeed] = useState(1),
    [resetSignal, setResetSignal] = useState(0),
    [zoom, setZoom] = useState(100),
    [tab, setTab] = useState<SimulationTab>("params"),
    [live, setLive] = useState<VaSnapshot>(() => createVaState(DEFAULTS));
  const update = (p: Partial<VaParams>) =>
    setParams((old) => ({ ...old, ...p }));
  const reset = () => {
    setRunning(false);
    setParams((old) => ({ ...old, switchClosed: false }));
    setResetSignal((v) => v + 1);
  };
  const snapshot = useCallback((s: VaSnapshot) => setLive(s), []);
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
        <b className="truncate text-sm">
          Đặc trưng V–A: Điện trở và bóng đèn dây tóc
        </b>
      </header>
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <section className="flex min-h-[360px] min-w-0 flex-1 flex-col overflow-hidden p-2">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[16px] border border-[#e8e2d9] shadow-sm">
            <VaCharacteristicScene
              params={params}
              running={running}
              speed={speed}
              resetSignal={resetSignal}
              zoom={zoom}
              onSnapshot={snapshot}
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
            So sánh điện trở có đặc trưng V–A gần tuyến tính với dây tóc bóng
            đèn có điện trở tăng mạnh theo nhiệt độ.
          </p>
        </section>
        <VaCharacteristicPanel
          params={params}
          live={live}
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
    min: 0,
    max: 12,
    step: 0.2,
  },
  {
    key: "resistorOhms",
    label: "Điện trở chuẩn R",
    unit: "Ω",
    min: 2,
    max: 30,
    step: 0.5,
  },
  {
    key: "lampColdResistance",
    label: "Điện trở nguội dây tóc",
    unit: "Ω",
    min: 1,
    max: 12,
    step: 0.2,
  },
  {
    key: "temperatureCoefficient",
    label: "Hệ số nhiệt điện trở",
    unit: "1/°C",
    min: 0.001,
    max: 0.006,
    step: 0.0001,
  },
  {
    key: "heatLoss",
    label: "Tản nhiệt dây tóc",
    unit: "W/°C",
    min: 0.005,
    max: 0.06,
    step: 0.001,
  },
];
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-[#faf9f7] p-2">
      <div className="text-[10px] text-[#8a8178]">{label}</div>
      <b className="text-[12px]">{value}</b>
    </div>
  );
}
function VaChart({ params }: { params: VaParams }) {
  const points = Array.from({ length: 31 }, (_, i) =>
      steadyVaPoint((i * 12) / 30, params),
    ),
    maxI = Math.max(
      1,
      ...points.flatMap((p) => [p.resistorCurrent, p.lampCurrent]),
    );
  return (
    <div className="rounded-[12px] border border-[#e8e2d9] p-3">
      <b className="text-xs">Đặc trưng V–A</b>
      <svg viewBox="0 0 280 130" className="mt-2 w-full">
        <path d="M28 8V108H274" fill="none" stroke="#d8d1c9" />
        <polyline
          fill="none"
          stroke="#0ea5e9"
          strokeWidth="2.2"
          points={points
            .map(
              (p) =>
                `${28 + (p.voltage / 12) * 246},${108 - (p.resistorCurrent / maxI) * 94}`,
            )
            .join(" ")}
        />
        <polyline
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.2"
          points={points
            .map(
              (p) =>
                `${28 + (p.voltage / 12) * 246},${108 - (p.lampCurrent / maxI) * 94}`,
            )
            .join(" ")}
        />
        <text x="8" y="15" fontSize="9" fill="#8a8178">
          I
        </text>
        <text x="266" y="123" fontSize="9" fill="#8a8178">
          U
        </text>
      </svg>
      <div className="flex gap-3 text-[10px]">
        <span className="text-sky-600">● Điện trở</span>
        <span className="text-amber-600">● Dây tóc</span>
      </div>
    </div>
  );
}
export function VaCharacteristicPanel({
  params,
  live,
  tab,
  onTabChange,
  onParamsChange,
}: {
  params: VaParams;
  live: VaSnapshot;
  tab: SimulationTab;
  onTabChange: (v: SimulationTab) => void;
  onParamsChange: (p: Partial<VaParams>) => void;
}) {
  const values = {
    voltage: params.voltage,
    resistorOhms: params.resistorOhms,
    lampColdResistance: params.lampColdResistance,
    temperatureCoefficient: params.temperatureCoefficient,
    heatLoss: params.heatLoss,
  };
  return (
    <aside className="flex max-h-[58vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-[#e8e2d9] bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
      <SimulationTabs value={tab} onChange={onTabChange} />
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {tab === "params" && (
          <>
            <div className="rounded-[10px] bg-[#faf9f7] p-3 text-[11px] leading-relaxed text-[#6b6b6b]">
              Điện trở chuẩn gần tuân theo định luật Ohm. Dây tóc nóng lên khi
              dòng tăng, làm điện trở tăng và đường đặc trưng V–A bị cong.
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="U" value={`${params.voltage.toFixed(1)} V`} />
              <Metric
                label="I điện trở"
                value={`${live.resistorCurrent.toFixed(2)} A`}
              />
              <Metric
                label="I bóng đèn"
                value={`${live.lampCurrent.toFixed(2)} A`}
              />
              <Metric
                label="R dây tóc"
                value={`${live.lampResistance.toFixed(1)} Ω`}
              />
              <Metric
                label="T dây tóc"
                value={`${live.lampTemperature.toFixed(0)} °C`}
              />
              <Metric
                label="P bóng đèn"
                value={`${live.lampPower.toFixed(1)} W`}
              />
            </div>
            <ParamPanel
              schema={SCHEMA}
              values={values}
              onChange={(key, value) =>
                onParamsChange({ [key]: value } as Partial<VaParams>)
              }
            />
          </>
        )}
        {tab === "analysis" && (
          <>
            <VaChart params={params} />
            <div className="rounded-[10px] bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900">
              <b>Kết luận</b>
              <p className="mt-1">
                Với điện trở ở nhiệt độ gần ổn định, I tỉ lệ thuận U. Với bóng
                đèn, U tăng làm dây tóc nóng hơn và điện trở tăng, nên I tăng
                chậm dần.
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
