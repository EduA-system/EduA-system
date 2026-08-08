"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { DEFAULT_ELECTRIC_BELL_PARAMS } from "../engines/circuit/constants";
import {
  createElectricBellState,
  electricBellSnapshot,
} from "../engines/circuit/physics";
import type {
  ElectricBellChartPoint,
  ElectricBellEvent,
  ElectricBellParams,
  ElectricBellSnapshot,
} from "../engines/circuit/types";
import { ElectricBellScene } from "../renderers/circuit/electric-bell-scene";
import { ParamPanel, type ParamDef } from "../shared/param-panel";
import { SimulationToolbar } from "../shared/simulation-toolbar";
import { ZoomControls } from "../shared/zoom-controls";
import { SimulationTabs, type SimulationTab } from "../shared/simulation-tabs";

export function ElectricBellExperiment({ onBack }: { onBack: () => void }) {
  const [params, setParams] = useState<ElectricBellParams>(
      DEFAULT_ELECTRIC_BELL_PARAMS,
    ),
    [running, setRunning] = useState(false),
    [speed, setSpeed] = useState(1),
    [resetSignal, setResetSignal] = useState(0),
    [zoom, setZoom] = useState(100),
    [tab, setTab] = useState<SimulationTab>("params");
  const [live, setLive] = useState<ElectricBellSnapshot>(() =>
      electricBellSnapshot(
        createElectricBellState(),
        DEFAULT_ELECTRIC_BELL_PARAMS,
      ),
    ),
    [points, setPoints] = useState<ElectricBellChartPoint[]>([]),
    [events, setEvents] = useState<ElectricBellEvent[]>([]);
  const lastSample = useRef(-1),
    lastEvent = useRef(0);
  const updateParams = (patch: Partial<ElectricBellParams>) =>
    setParams((old) => ({ ...old, ...patch }));
  const reset = () => {
    setRunning(false);
    setParams((old) => ({ ...old, masterSwitchClosed: false }));
    setResetSignal((v) => v + 1);
    setPoints([]);
    setEvents([]);
    lastSample.current = -1;
    lastEvent.current = 0;
    setLive(
      electricBellSnapshot(createElectricBellState(), {
        ...params,
        masterSwitchClosed: false,
      }),
    );
  };
  const onSnapshot = useCallback((value: ElectricBellSnapshot) => {
    setLive(value);
    if (value.time - lastSample.current >= 0.045) {
      lastSample.current = value.time;
      setPoints((old) =>
        [
          ...old,
          {
            time: value.time,
            current: value.current,
            fieldRelative: Math.abs(value.fieldRelative),
            magneticForce: value.magneticForce,
            springForce: value.springForce,
            displacement: value.displacement,
            strikeCount: value.strikeCount,
          },
        ].slice(-360),
      );
    }
    if (value.lastEvent && value.lastEvent.id !== lastEvent.current) {
      lastEvent.current = value.lastEvent.id;
      setEvents((old) => [...old, value.lastEvent!].slice(-100));
    }
  }, []);
  const setSwitch = (closed: boolean) => {
    setRunning(closed);
    updateParams({ masterSwitchClosed: closed });
    if (!closed) setResetSignal((value) => value + 1);
  };
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden font-sans">
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
        <span className="truncate text-[14px] font-semibold">
          Tác dụng từ của dòng điện – Chuông điện
        </span>
      </header>
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <section className="flex min-h-[360px] min-w-0 flex-1 flex-col overflow-hidden p-2">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[16px] border border-[#e8e2d9] shadow-sm">
            <ElectricBellScene
              params={params}
              running={running}
              speed={speed}
              resetSignal={resetSignal}
              zoom={zoom}
              onSnapshot={onSnapshot}
            />
            <SimulationToolbar
              running={params.masterSwitchClosed}
              speed={speed}
              onRunningChange={setSwitch}
              onReset={reset}
              onSpeedChange={setSpeed}
            />
            <ZoomControls
              percent={zoom}
              onZoomIn={() => setZoom((v) => Math.min(130, v + 10))}
              onZoomOut={() => setZoom((v) => Math.max(70, v - 10))}
            />
          </div>
          <p className="mt-3 shrink-0 text-center text-[13px] text-[#6b6b6b]">
            Đóng chốt để dòng điện chạy qua cuộn dây, từ hóa lõi sắt và hút phần
            ứng làm búa gõ chuông. Mở chốt để ngắt dòng điện và lá thép trở về
            vị trí ban đầu.
          </p>
        </section>
        <ElectricBellPanel
          params={params}
          live={live}
          points={points}
          events={events}
          tab={tab}
          onTabChange={setTab}
          onParamsChange={updateParams}
          onRunningChange={setSwitch}
        />
      </div>
    </div>
  );
}

const PARAMS: ParamDef[] = [
  {
    key: "voltage",
    label: "Hiệu điện thế nguồn U",
    unit: "V",
    min: 1,
    max: 12,
    step: 0.5,
  },
  {
    key: "coilResistance",
    label: "Điện trở cuộn dây",
    unit: "Ω",
    min: 2,
    max: 20,
    step: 0.5,
  },
  {
    key: "gapMm",
    label: "Khe hở lõi–phần ứng",
    unit: "mm",
    min: 4,
    max: 14,
    step: 0.2,
  },
  { key: "damping", label: "Độ giảm chấn", min: 0.05, max: 1.2, step: 0.01 },
];

type Field = {
  key: keyof ElectricBellChartPoint;
  label: string;
  color: string;
  scale?: number;
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-[#faf9f7] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-[#8a8178]">
        {label}
      </div>
      <div className="mt-0.5 truncate text-[12px] font-semibold text-[#171717]">
        {value}
      </div>
    </div>
  );
}

function Chart({
  title,
  points,
  fields,
  events,
}: {
  title: string;
  points: ElectricBellChartPoint[];
  fields: Field[];
  events: ElectricBellEvent[];
}) {
  const values = points.flatMap((point) =>
    fields.map((field) => Number(point[field.key]) * (field.scale ?? 1)),
  );
  const max = Math.max(1, ...values),
    min = Math.min(0, ...values),
    maxTime = Math.max(1, points.at(-1)?.time ?? 1);
  return (
    <div className="rounded-[12px] border border-[#e8e2d9] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <b className="text-[12px]">{title}</b>
        <div className="flex flex-wrap justify-end gap-2">
          {fields.map((field) => (
            <span
              key={field.key}
              className="text-[9px]"
              style={{ color: field.color }}
            >
              ● {field.label}
            </span>
          ))}
        </div>
      </div>
      <svg viewBox="0 0 280 92" className="h-24 w-full">
        <path d="M24 5V78H276" fill="none" stroke="#d8d1c9" />
        {fields.map((field) => (
          <polyline
            key={field.key}
            fill="none"
            stroke={field.color}
            strokeWidth="1.8"
            points={points
              .map(
                (point) =>
                  `${24 + (point.time / maxTime) * 252},${78 - ((Number(point[field.key]) * (field.scale ?? 1) - min) / (max - min || 1)) * 68}`,
              )
              .join(" ")}
          />
        ))}
        {events.slice(-18).map((event) => (
          <line
            key={event.id}
            x1={24 + (event.time / maxTime) * 252}
            x2={24 + (event.time / maxTime) * 252}
            y1="5"
            y2="78"
            stroke={
              event.type === "strike"
                ? "#f59e0b"
                : event.type === "contact-open"
                  ? "#fb7185"
                  : "#10b981"
            }
            opacity=".35"
            strokeDasharray="2 3"
          />
        ))}
      </svg>
    </div>
  );
}

export function ElectricBellPanel({
  params,
  live,
  points,
  events,
  tab,
  onTabChange,
  onParamsChange,
}: {
  params: ElectricBellParams;
  live: ElectricBellSnapshot;
  points: ElectricBellChartPoint[];
  events: ElectricBellEvent[];
  tab: SimulationTab;
  onTabChange: (value: SimulationTab) => void;
  onParamsChange: (patch: Partial<ElectricBellParams>) => void;
  onRunningChange: (value: boolean) => void;
}) {
  const metrics = [
    ["Chốt K", params.masterSwitchClosed ? "Đóng" : "Mở"],
    ["U", `${params.voltage.toFixed(1)} V`],
    ["I", `${live.current.toFixed(2)} A`],
    ["B", `${Math.abs(live.fieldRelative).toFixed(2)} tương đối`],
    ["F từ", `${live.magneticForce.toFixed(2)} N`],
    ["Khe hở", `${live.gapCurrentMm.toFixed(1)} mm`],
    ["Vận tốc búa", `${live.velocity.toFixed(2)} m/s`],
    ["Tần số gõ", `${live.strikeFrequency.toFixed(1)} Hz`],
    ["Số lần gõ", `${live.strikeCount}`],
  ];
  const values = {
    voltage: params.voltage,
    coilResistance: params.coilResistance,
    gapMm: params.gapMm,
    damping: params.damping,
  };
  return (
    <aside className="flex max-h-[58vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-[#e8e2d9] bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
      <SimulationTabs value={tab} onChange={onTabChange} />
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {tab === "params" && (
          <>
            <div className="rounded-[10px] bg-[#faf9f7] p-3 text-[11px] leading-relaxed text-[#6b6b6b]">
              Đóng chốt K để dòng điện chạy qua cuộn dây. Nam châm điện hút phần
              ứng và cơ cấu đòn bẩy làm búa gõ chuông.
            </div>
            <div className="grid grid-cols-2 gap-2">
              {metrics.map(([label, value]) => (
                <Metric key={label} label={label} value={value} />
              ))}
            </div>
            <ParamPanel
              schema={PARAMS}
              values={values}
              onChange={(key, value) =>
                onParamsChange({ [key]: value } as Partial<ElectricBellParams>)
              }
            />
          </>
        )}
        {tab === "analysis" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {metrics.map(([label, value]) => (
                <Metric key={label} label={label} value={value} />
              ))}
            </div>
            <Chart
              title="Dòng điện và từ trường"
              points={points}
              fields={[
                { key: "current", label: "I", color: "#0ea5e9" },
                { key: "fieldRelative", label: "B", color: "#8b5cf6" },
              ]}
              events={events}
            />
            <Chart
              title="Độ lệch lá thép"
              points={points}
              fields={[
                {
                  key: "displacement",
                  label: "x (mm)",
                  color: "#f59e0b",
                  scale: 1000,
                },
              ]}
              events={events}
            />
            <Chart
              title="Các lực tác dụng"
              points={points}
              fields={[
                { key: "magneticForce", label: "F từ", color: "#06b6d4" },
                { key: "springForce", label: "F đàn hồi", color: "#fb7185" },
              ]}
              events={events}
            />
            <Chart
              title="Số lần gõ"
              points={points}
              fields={[{ key: "strikeCount", label: "lần", color: "#10b981" }]}
              events={events}
            />
          </>
        )}
        {tab === "ai" && (
          <div className="space-y-3 text-[12px]">
            <div className="rounded-[10px] bg-amber-50 p-3 text-amber-800">
              <b>Sửa bằng AI</b>
              <p className="mt-1">
                Luồng AI của khu vực mô phỏng chưa được kết nối dịch vụ.
              </p>
            </div>
            <button
              disabled
              className="w-full rounded-[9px] bg-[#e8724a] py-2 text-white opacity-40"
            >
              Gửi cho AI
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
