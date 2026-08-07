"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import {
  createIceFusionState,
  snapshotIceFusion,
} from "../engines/circuit/ice-fusion-physics";
import type {
  IceFusionParams,
  IceFusionPoint,
  IceFusionSnapshot,
} from "../engines/circuit/ice-fusion-types";
import { IceFusionScene } from "../renderers/circuit/ice-fusion-scene";
import { ParamPanel, type ParamDef } from "../shared/param-panel";
import { SimulationToolbar } from "../shared/simulation-toolbar";
import { SimulationTabs, type SimulationTab } from "../shared/simulation-tabs";
import { ZoomControls } from "../shared/zoom-controls";

const DEFAULTS: IceFusionParams = {
  voltage: 12,
  current: 3,
  iceMass: 0.06,
  latentHeat: 334000,
  heatLossRatio: 0.06,
  switchClosed: false,
};

const SCHEMA: ParamDef[] = [
  {
    key: "voltage",
    label: "Hiệu điện thế U",
    unit: "V",
    min: 6,
    max: 24,
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
    key: "iceMass",
    label: "Khối lượng nước đá m",
    unit: "kg",
    min: 0.02,
    max: 0.12,
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

function FusionChart({
  points,
  iceMass,
}: {
  points: IceFusionPoint[];
  iceMass: number;
}) {
  const maxTime = Math.max(1, points.at(-1)?.time ?? 1);
  return (
    <div className="rounded-[12px] border border-[#e8e2d9] p-3">
      <b className="text-xs">Khối lượng nước thu được theo thời gian</b>
      <svg viewBox="0 0 280 105" className="mt-2 w-full">
        <path d="M25 6V84H276" fill="none" stroke="#d8d1c9" />
        <polyline
          fill="none"
          stroke="#0ea5e9"
          strokeWidth="2.5"
          points={points
            .map(
              (point) =>
                `${25 + (point.time / maxTime) * 251},${84 - (point.collectedMass / iceMass) * 72}`,
            )
            .join(" ")}
        />
      </svg>
      <div className="flex justify-between text-[10px] text-[#8a8178]">
        <span>
          m nước: {((points.at(-1)?.collectedMass ?? 0) * 1000).toFixed(1)} g
        </span>
        <span>t: {maxTime.toFixed(0)} s</span>
      </div>
    </div>
  );
}

export function IceFusionExperiment({ onBack }: { onBack: () => void }) {
  const [params, setParams] = useState(DEFAULTS);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [resetSignal, setResetSignal] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [tab, setTab] = useState<SimulationTab>("params");
  const [live, setLive] = useState<IceFusionSnapshot>(() =>
    snapshotIceFusion(createIceFusionState(), DEFAULTS),
  );
  const [points, setPoints] = useState<IceFusionPoint[]>([]);
  const lastPoint = useRef(-1);
  const update = (patch: Partial<IceFusionParams>) =>
    setParams((old) => ({ ...old, ...patch }));
  const reset = () => {
    setRunning(false);
    setParams((old) => ({ ...old, switchClosed: false }));
    setResetSignal((value) => value + 1);
    setPoints([]);
    lastPoint.current = -1;
  };
  const onSnapshot = useCallback((snapshot: IceFusionSnapshot) => {
    setLive(snapshot);
    if (snapshot.time - lastPoint.current > 1) {
      lastPoint.current = snapshot.time;
      setPoints((old) =>
        [
          ...old,
          {
            time: snapshot.time,
            collectedMass: snapshot.collectedMass,
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
  const values = {
    voltage: params.voltage,
    current: params.current,
    iceMass: params.iceMass,
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
        <b className="truncate text-sm">
          Đo nhiệt nóng chảy riêng λ của nước đá
        </b>
      </header>
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <section className="flex min-h-[360px] min-w-0 flex-1 flex-col overflow-hidden p-2">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[16px] border border-[#e8e2d9] shadow-sm">
            <IceFusionScene
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
              onZoomIn={() => setZoom((value) => Math.min(130, value + 10))}
              onZoomOut={() => setZoom((value) => Math.max(70, value - 10))}
            />
          </div>
          <p className="mt-3 text-center text-[13px] text-[#6b6b6b]">
            Dây nung làm tan nước đá ở 0 °C; nước chảy vào cốc đặt trên cân để
            xác định λ = UIt/m.
          </p>
        </section>
        <aside className="flex max-h-[58vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-[#e8e2d9] bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
          <SimulationTabs value={tab} onChange={setTab} />
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            {tab === "params" && (
              <>
                <div className="rounded-[10px] bg-[#faf9f7] p-3 text-[11px] leading-relaxed text-[#6b6b6b]">
                  Khi nước đá đang nóng chảy ở 0 °C, điện năng <b>A = UIt</b>{" "}
                  dùng để chuyển thể: <b>UIt = mλ</b>.
                  <p className="mt-2 text-[10px] text-[#8a8178]">
                    U: hiệu điện thế · I: cường độ dòng điện · t: thời gian · m:
                    khối lượng nước thu được · λ: nhiệt nóng chảy riêng.
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
                    label="Ampe kế I"
                    value={`${params.switchClosed ? params.current.toFixed(2) : "0.00"} A`}
                  />
                  <Metric
                    label="Vôn kế U"
                    value={`${params.voltage.toFixed(1)} V`}
                  />
                  <Metric
                    label="m (nước thu được)"
                    value={`${(live.collectedMass * 1000).toFixed(1)} g`}
                  />
                  <Metric
                    label="Nước đá còn lại"
                    value={`${(live.remainingIceMass * 1000).toFixed(1)} g`}
                  />
                  <Metric
                    label="Điện năng A (UIt)"
                    value={`${live.electricalEnergy.toFixed(0)} J`}
                  />
                  <Metric
                    label="λ (nhiệt nóng chảy riêng)"
                    value={
                      live.measuredLatentHeat === null
                        ? "—"
                        : `${(live.measuredLatentHeat / 1000).toFixed(1)} kJ/kg`
                    }
                  />
                </div>
                <ParamPanel
                  schema={SCHEMA}
                  values={values}
                  onChange={(key, value) =>
                    key === "heatLossPercent"
                      ? update({ heatLossRatio: value / 100 })
                      : update({ [key]: value } as Partial<IceFusionParams>)
                  }
                />
              </>
            )}
            {tab === "analysis" && (
              <>
                <FusionChart points={points} iceMass={params.iceMass} />
                <div className="rounded-[10px] border border-[#e8e2d9] p-3 text-xs leading-relaxed">
                  <b>Quy trình đo</b>
                  <ol className="mt-2 list-decimal space-y-1 pl-4">
                    <li>
                      Đưa nước đá về gần 0 °C và đặt dây nung ngập trong đá.
                    </li>
                    <li>Đóng K, đồng thời bắt đầu đo thời gian.</li>
                    <li>Hứng và cân khối lượng nước đã nóng chảy.</li>
                    <li>Tính λ = UIt/m và đánh giá hao phí.</li>
                  </ol>
                </div>
                <div className="rounded-[10px] bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900">
                  <b>Kết quả</b>
                  <p className="mt-1">
                    {live.measuredLatentHeat === null
                      ? "Hãy đóng K và chờ có đủ nước trong cốc hứng."
                      : `λ đo = ${(live.measuredLatentHeat / 1000).toFixed(1)} kJ/kg, sai lệch ${Math.abs(live.relativeError ?? 0).toFixed(1)}% so với 334 kJ/kg.`}
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
