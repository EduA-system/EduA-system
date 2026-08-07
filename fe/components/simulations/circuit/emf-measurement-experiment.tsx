"use client";
import { useCallback, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { emfMeasurement } from "../engines/circuit/emf-measurement-physics";
import type {
  EmfParams,
  EmfPoint,
  EmfSnapshot,
} from "../engines/circuit/emf-measurement-types";
import { EmfMeasurementScene } from "../renderers/circuit/emf-measurement-scene";
import { ParamPanel, type ParamDef } from "../shared/param-panel";
import { SimulationToolbar } from "../shared/simulation-toolbar";
import { SimulationTabs, type SimulationTab } from "../shared/simulation-tabs";
import { ZoomControls } from "../shared/zoom-controls";
const DEFAULTS: EmfParams = {
  emf: 4.5,
  internalResistance: 0.8,
  loadResistance: 8,
  protectiveResistance: 2,
  switchClosed: false,
};
export function EmfMeasurementExperiment({ onBack }: { onBack: () => void }) {
  const [params, setParams] = useState(DEFAULTS),
    [running, setRunning] = useState(false),
    [speed, setSpeed] = useState(1),
    [resetSignal, setResetSignal] = useState(0),
    [zoom, setZoom] = useState(100),
    [tab, setTab] = useState<SimulationTab>("params"),
    [live, setLive] = useState<EmfSnapshot>(() => emfMeasurement(DEFAULTS)),
    [points, setPoints] = useState<EmfPoint[]>([]);
  const last = useRef(-1),
    update = (p: Partial<EmfParams>) => setParams((old) => ({ ...old, ...p })),
    reset = () => {
      setRunning(false);
      setParams((old) => ({ ...old, switchClosed: false }));
      setResetSignal((v) => v + 1);
      setPoints([]);
      last.current = -1;
    },
    snapshot = useCallback((s: EmfSnapshot) => {
      setLive(s);
      if (s.time - last.current > 0.12) {
        last.current = s.time;
        setPoints((old) =>
          [
            ...old,
            {
              time: s.time,
              current: s.current,
              voltage: s.terminalVoltage,
              emf: s.calculatedEmf,
            },
          ].slice(-260),
        );
      }
    }, []),
    toggle = (closed: boolean) => {
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
        <b className="truncate text-sm">Đo suất điện động E của pin</b>
      </header>
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <section className="flex min-h-[360px] min-w-0 flex-1 flex-col overflow-hidden p-2">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[16px] border border-[#e8e2d9] shadow-sm">
            <EmfMeasurementScene
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
            Đo điện áp không tải, sau đó đóng K để đo U và I, kiểm chứng suất
            điện động E = U + Ir.
          </p>
        </section>
        <EmfMeasurementPanel
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
    key: "emf",
    label: "Suất điện động E",
    unit: "V",
    min: 1,
    max: 12,
    step: 0.1,
  },
  {
    key: "internalResistance",
    label: "Điện trở trong r",
    unit: "Ω",
    min: 0.1,
    max: 4,
    step: 0.05,
  },
  {
    key: "loadResistance",
    label: "Điện trở tải R",
    unit: "Ω",
    min: 1,
    max: 30,
    step: 0.5,
  },
  {
    key: "protectiveResistance",
    label: "Điện trở bảo vệ R₀",
    unit: "Ω",
    min: 0.5,
    max: 10,
    step: 0.5,
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
function Chart({ points }: { points: EmfPoint[] }) {
  const t = Math.max(1, points.at(-1)?.time ?? 1),
    max = Math.max(1, ...points.flatMap((p) => [p.voltage, p.emf]));
  return (
    <div className="rounded-[12px] border border-[#e8e2d9] p-3">
      <b className="text-xs">Số đo theo thời gian</b>
      <svg viewBox="0 0 280 105" className="mt-2 w-full">
        <path d="M25 6V84H276" fill="none" stroke="#d8d1c9" />
        <polyline
          fill="none"
          stroke="#0ea5e9"
          strokeWidth="2"
          points={points
            .map(
              (p) =>
                `${25 + (p.time / t) * 251},${84 - (p.voltage / max) * 72}`,
            )
            .join(" ")}
        />
        <polyline
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          points={points
            .map((p) => `${25 + (p.time / t) * 251},${84 - (p.emf / max) * 72}`)
            .join(" ")}
        />
      </svg>
      <div className="flex gap-3 text-[10px]">
        <span className="text-sky-600">● U</span>
        <span className="text-amber-600">● E = U + Ir</span>
      </div>
    </div>
  );
}
export function EmfMeasurementPanel({
  params,
  live,
  points,
  tab,
  onTabChange,
  onParamsChange,
}: {
  params: EmfParams;
  live: EmfSnapshot;
  points: EmfPoint[];
  tab: SimulationTab;
  onTabChange: (v: SimulationTab) => void;
  onParamsChange: (p: Partial<EmfParams>) => void;
}) {
  const values = {
    emf: params.emf,
    internalResistance: params.internalResistance,
    loadResistance: params.loadResistance,
    protectiveResistance: params.protectiveResistance,
  };
  return (
    <aside className="flex max-h-[58vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-[#e8e2d9] bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
      <SimulationTabs value={tab} onChange={onTabChange} />
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {tab === "params" && (
          <>
            <div className="rounded-[10px] bg-[#faf9f7] p-3 text-[11px] leading-relaxed text-[#6b6b6b]">
              K mở: vôn kế có điện trở rất lớn nên U₀ ≈ E. K đóng: đọc U và I,
              sau đó tính E = U + Ir.
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Metric
                label="Trạng thái K"
                value={params.switchClosed ? "Đóng" : "Mở"}
              />
              <Metric label="Ampe kế" value={`${live.current.toFixed(2)} A`} />
              <Metric
                label="Vôn kế"
                value={`${live.terminalVoltage.toFixed(2)} V`}
              />
              <Metric
                label="E tính được"
                value={`${live.calculatedEmf.toFixed(2)} V`}
              />
              <Metric
                label="Sụt áp Ir"
                value={`${(live.current * params.internalResistance).toFixed(2)} V`}
              />
              <Metric
                label="Công suất tải"
                value={`${live.loadPower.toFixed(2)} W`}
              />
            </div>
            <ParamPanel
              schema={SCHEMA}
              values={values}
              onChange={(key, value) =>
                onParamsChange({ [key]: value } as Partial<EmfParams>)
              }
            />
          </>
        )}
        {tab === "analysis" && (
          <>
            <Chart points={points} />
            <div className="rounded-[10px] border border-[#e8e2d9] p-3 text-xs leading-relaxed">
              <b>Quy trình đo</b>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>Mở K, đọc điện áp không tải U₀.</li>
                <li>Đóng K, đọc đồng thời U và I.</li>
                <li>Tính E = U + Ir và đối chiếu U₀.</li>
              </ol>
            </div>
            <div className="rounded-[10px] bg-emerald-50 p-3 text-xs text-emerald-900">
              Sai lệch mô hình:{" "}
              {Math.abs(params.emf - live.calculatedEmf).toFixed(3)} V.
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
