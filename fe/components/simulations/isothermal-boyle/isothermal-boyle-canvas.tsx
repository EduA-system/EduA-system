"use client";

import { useMemo, useRef, useState } from "react";
import {
  calculateState,
  clampPistonPosition,
  mapCylinderHeightToVolume,
  mapPressureToGaugeAngle,
  mapVolumeToCylinderHeight,
  MAX_VOLUME,
  MIN_VOLUME,
} from "./physics";
import type { BoyleParams, BoyleState } from "./types";

const VIEW_WIDTH = 980;
const VIEW_HEIGHT = 720;
const CYLINDER_TOP = 126;
const CYLINDER_BOTTOM = 420;
const CYLINDER_WIDTH = 122;
const MIN_GAS_HEIGHT = 90;
const MAX_GAS_HEIGHT = 252;

type CylinderSpec = {
  label: "A" | "B";
  x: number;
  volume: number;
  pressure: number;
  temperature: number;
  constant: number;
};

function moleculePoints() {
  return Array.from({ length: 30 }, (_, index) => ({
    x: 0.12 + ((index * 37) % 76) / 100,
    y: 0.08 + ((index * 53) % 84) / 100,
    r: 1.45 + (index % 3) * 0.22,
  }));
}

function statusLabel(status: BoyleState["status"]) {
  if (status === "compressed") return "Nén";
  if (status === "expanded") return "Giãn";
  return "Tham chiếu";
}

function MiniThermometer({ x, y, temperature, label }: { x: number; y: number; temperature: number; label: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <text x="0" y="-13" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="700">{label}</text>
      <rect x="-7" y="0" width="14" height="78" rx="7" fill="rgba(226,232,240,0.1)" stroke="#67e8f9" strokeWidth="1.2" />
      <rect x="-3" y="21" width="6" height="54" rx="3" fill="#fb923c" />
      <circle cx="0" cy="88" r="11" fill="#fb923c" stroke="#fed7aa" strokeWidth="1.2" />
      <text x="0" y="116" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="700">{temperature.toFixed(0)} K</text>
      <text x="0" y="134" textAnchor="middle" fill="#67e8f9" fontSize="10" fontWeight="700">T = const</text>
    </g>
  );
}

function PressureGauge({ x, y, pressure, label }: { x: number; y: number; pressure: number; label: string }) {
  const angle = mapPressureToGaugeAngle(pressure);
  const ticks = Array.from({ length: 7 }, (_, index) => {
    const a = (-130 + index * (260 / 6)) * (Math.PI / 180);
    return {
      x1: x + Math.cos(a) * 35,
      y1: y + Math.sin(a) * 35,
      x2: x + Math.cos(a) * 45,
      y2: y + Math.sin(a) * 45,
    };
  });

  return (
    <g>
      <text x={x} y={y - 60} textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="700">{label}</text>
      <circle cx={x} cy={y} r="54" fill="rgba(15,23,42,0.64)" stroke="#cbd5e1" strokeWidth="1.6" />
      <path d={`M${x - 37} ${y + 37} A52 52 0 0 1 ${x + 37} ${y + 37}`} fill="none" stroke="rgba(103,232,249,0.28)" strokeWidth="8" strokeLinecap="round" />
      {ticks.map((tick, index) => <line key={index} {...tick} stroke="#94a3b8" strokeWidth={index % 2 === 0 ? 1.8 : 1} />)}
      <g transform={`rotate(${angle} ${x} ${y})`}>
        <line x1={x} y1={y} x2={x} y2={y - 38} stroke="#e8724a" strokeWidth="3.5" strokeLinecap="round" />
      </g>
      <circle cx={x} cy={y} r="5" fill="#e8724a" />
      <text x={x} y={y + 74} textAnchor="middle" fill="#f8fafc" fontSize="16" fontWeight="700">{pressure.toFixed(2)} atm</text>
    </g>
  );
}

export function IsothermalBoyleCanvas({
  params,
  onParamsChange,
}: {
  params: BoyleParams;
  onParamsChange: (patch: Partial<BoyleParams>) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragTarget, setDragTarget] = useState<"A" | "B" | null>(null);
  const stateAValue = calculateState({ volume: params.volumeA, temperature: params.temperature });
  const stateBValue = calculateState({ volume: params.volumeB, temperature: params.temperature });
  const points = useMemo(() => moleculePoints(), []);

  const stateA: CylinderSpec = {
    label: "A",
    x: 300,
    volume: stateAValue.volume,
    pressure: stateAValue.pressure,
    temperature: stateAValue.temperature,
    constant: stateAValue.constant,
  };
  const stateB: CylinderSpec = {
    label: "B",
    x: 690,
    volume: stateBValue.volume,
    pressure: stateBValue.pressure,
    temperature: stateBValue.temperature,
    constant: stateBValue.constant,
  };

  const pointerToVolume = (clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return dragTarget === "A" ? params.volumeA : params.volumeB;
    const rect = svg.getBoundingClientRect();
    const y = ((clientY - rect.top) / rect.height) * VIEW_HEIGHT;
    const clampedY = clampPistonPosition(y, CYLINDER_BOTTOM - MAX_GAS_HEIGHT, CYLINDER_BOTTOM - MIN_GAS_HEIGHT);
    return mapCylinderHeightToVolume(CYLINDER_BOTTOM - clampedY, MIN_GAS_HEIGHT, MAX_GAS_HEIGHT);
  };

  const updateVolume = (label: "A" | "B", volume: number) => {
    onParamsChange(label === "A" ? { volumeA: volume } : { volumeB: volume });
  };

  const startDrag = (event: React.PointerEvent<SVGElement>, label: "A" | "B") => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragTarget(label);
    updateVolume(label, pointerToVolume(event.clientY));
  };

  const moveDrag = (event: React.PointerEvent<SVGElement>) => {
    if (!dragTarget) return;
    updateVolume(dragTarget, pointerToVolume(event.clientY));
  };

  const endDrag = (event: React.PointerEvent<SVGElement>) => {
    setDragTarget(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const renderCylinder = (spec: CylinderSpec) => {
    const gasHeight = mapVolumeToCylinderHeight(spec.volume, MIN_GAS_HEIGHT, MAX_GAS_HEIGHT);
    const gasTop = CYLINDER_BOTTOM - gasHeight;
    const pistonY = gasTop;
    const cylinderX = spec.x - CYLINDER_WIDTH / 2;

    return (
      <g key={spec.label}>
        <text x={spec.x} y="88" textAnchor="middle" fill="#e2e8f0" fontSize="15" fontWeight="800">Trạng thái {spec.label}</text>
        <MiniThermometer x={spec.x - 128} y={148} temperature={spec.temperature} label={`T${spec.label}`} />
        <PressureGauge x={spec.x + 145} y={218} pressure={spec.pressure} label={`P${spec.label}`} />

        <rect x={cylinderX - 13} y={CYLINDER_TOP - 6} width={CYLINDER_WIDTH + 26} height={CYLINDER_BOTTOM - CYLINDER_TOP + 18} rx="17" fill="rgba(226,232,240,0.055)" stroke="rgba(226,232,240,0.2)" />
        <rect x={cylinderX} y={CYLINDER_TOP} width={CYLINDER_WIDTH} height={CYLINDER_BOTTOM - CYLINDER_TOP} rx="13" fill="rgba(8,145,178,0.08)" stroke="#cbd5e1" strokeWidth="1.8" />
        <rect x={cylinderX + 8} y={gasTop} width={CYLINDER_WIDTH - 16} height={gasHeight} rx="9" fill="rgba(103,232,249,0.35)" stroke="rgba(103,232,249,0.48)" />

        {params.showMolecules && points.map((point, index) => (
          <circle
            key={`${spec.label}-${index}`}
            cx={cylinderX + 15 + point.x * (CYLINDER_WIDTH - 30)}
            cy={gasTop + 10 + point.y * Math.max(1, gasHeight - 20)}
            r={point.r}
            fill="rgba(207,250,254,0.78)"
          />
        ))}

        {[MIN_VOLUME, 2.6, 3.5, 4.5, 5.4, MAX_VOLUME].map((volume) => {
          const tickHeight = mapVolumeToCylinderHeight(volume, MIN_GAS_HEIGHT, MAX_GAS_HEIGHT);
          const y = CYLINDER_BOTTOM - tickHeight;
          return (
            <g key={`${spec.label}-${volume}`}>
              <line x1={cylinderX - 9} y1={y} x2={cylinderX} y2={y} stroke="#94a3b8" strokeWidth="1" />
              <text x={cylinderX - 14} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="8.5">{volume.toFixed(1)} L</text>
            </g>
          );
        })}

        <g
          className="cursor-ns-resize"
          onPointerDown={(event) => startDrag(event, spec.label)}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <rect x={cylinderX - 20} y={pistonY - 13} width={CYLINDER_WIDTH + 40} height="26" rx="7" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.8" />
          <rect x={cylinderX + 28} y={pistonY - 52} width={CYLINDER_WIDTH - 56} height="39" rx="6" fill="rgba(226,232,240,0.16)" stroke="#cbd5e1" />
          <line x1={spec.x} y1={pistonY - 84} x2={spec.x} y2={pistonY - 13} stroke="#cbd5e1" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx={spec.x} cy={pistonY - 90} r="12" fill="#e8724a" stroke="#fed7aa" strokeWidth="1.8" />
        </g>

        <text x={spec.x} y={CYLINDER_BOTTOM + 34} textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="800">Xi lanh {spec.label}</text>
        <text x={spec.x} y={CYLINDER_BOTTOM + 54} textAnchor="middle" fill="#94a3b8" fontSize="11">P = {spec.pressure.toFixed(2)} atm · V = {spec.volume.toFixed(2)} L</text>
        <rect x={spec.x - 64} y={CYLINDER_BOTTOM + 74} width="128" height="17" rx="8.5" fill="rgba(251,146,60,0.2)" stroke="#fb923c" />
        <text x={spec.x} y={CYLINDER_BOTTOM + 87} textAnchor="middle" fill="#fed7aa" fontSize="9.5">Bể nhiệt giữ T không đổi</text>
      </g>
    );
  };

  return (
    <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-lg bg-[#0f172a]">
      <svg
        ref={svgRef}
        viewBox="128 38 750 560"
        className="h-full w-full select-none"
        role="img"
        aria-label="Mô phỏng quá trình đẳng nhiệt định luật Boyle"
      >
        <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#0f172a" />
        <text x="152" y="80" fill="#e2e8f0" fontSize="17" fontWeight="700">Quá trình đẳng nhiệt</text>
        <text x="152" y="103" fill="#94a3b8" fontSize="12">Kéo piston A hoặc B để so sánh P và V khi T luôn được giữ không đổi.</text>

        {renderCylinder(stateA)}
        {renderCylinder(stateB)}

        <g transform="translate(404 528)">
          <rect width="200" height="42" rx="12" fill="rgba(2,6,23,0.52)" stroke="rgba(148,163,184,0.18)" />
          <text x="100" y="18" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="800">pV = const = {stateAValue.constant.toFixed(2)} atmL</text>
          <text x="100" y="34" textAnchor="middle" fill="#67e8f9" fontSize="10.5">A: {statusLabel(stateAValue.status)} · B: {statusLabel(stateBValue.status)}</text>
        </g>
      </svg>
    </div>
  );
}
