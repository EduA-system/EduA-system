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

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 700;
const CYLINDER_TOP = 108;
const CYLINDER_BOTTOM = 424;
const CYLINDER_WIDTH = 138;
const MIN_GAS_HEIGHT = 92;
const MAX_GAS_HEIGHT = 254;
const CELSIUS_OFFSET = 273.15;

type CylinderSpec = {
  label: "A" | "B";
  x: number;
  volume: number;
  pressure: number;
  temperature: number;
};

function createMolecules() {
  return Array.from({ length: 34 }, (_, index) => ({
    x: 0.08 + ((index * 37) % 84) / 100,
    y: 0.08 + ((index * 53) % 84) / 100,
    radius: 1.7 + (index % 3) * 0.25,
    duration: 1.55 + (index % 5) * 0.25,
    direction: index % 2 === 0 ? 1 : -1,
  }));
}

function statusLabel(status: BoyleState["status"]) {
  if (status === "compressed") return "Nén";
  if (status === "expanded") return "Giãn";
  return "Tham chiếu";
}

function MiniThermometer({
  x,
  y,
  temperature,
  label,
}: {
  x: number;
  y: number;
  temperature: number;
  label: string;
}) {
  const temperatureC = temperature - CELSIUS_OFFSET;

  return (
    <g transform={`translate(${x} ${y})`}>
      <text
        x="0"
        y="-13"
        textAnchor="middle"
        fill="#e2e8f0"
        fontSize="11"
        fontWeight="500"
      >
        {label}
      </text>
      <rect
        x="-8"
        width="16"
        height="82"
        rx="8"
        fill="rgba(226,232,240,0.1)"
        stroke="#67e8f9"
        strokeWidth="1.5"
      />
      <rect x="-3.5" y="22" width="7" height="57" rx="3.5" fill="#fb923c" />
      <circle
        cx="0"
        cy="92"
        r="12"
        fill="#fb923c"
        stroke="#fed7aa"
        strokeWidth="1.5"
      />
      <text
        x="0"
        y="125"
        textAnchor="middle"
        fill="#f8fafc"
        fontSize="13"
        fontWeight="500"
      >
        {temperatureC.toFixed(1)} °C
      </text>
      <text
        x="0"
        y="147"
        textAnchor="middle"
        fill="#67e8f9"
        fontSize="10.5"
        fontWeight="500"
      >
        T = const
      </text>
    </g>
  );
}

function PressureGauge({
  x,
  y,
  pressure,
  label,
}: {
  x: number;
  y: number;
  pressure: number;
  label: string;
}) {
  const angle = mapPressureToGaugeAngle(pressure);
  const ticks = Array.from({ length: 7 }, (_, index) => {
    const tickAngle = (-130 + index * (260 / 6)) * (Math.PI / 180);
    return {
      x1: x + Math.cos(tickAngle) * 39,
      y1: y + Math.sin(tickAngle) * 39,
      x2: x + Math.cos(tickAngle) * 49,
      y2: y + Math.sin(tickAngle) * 49,
    };
  });

  return (
    <g>
      <text
        x={x}
        y={y - 66}
        textAnchor="middle"
        fill="#e2e8f0"
        fontSize="11"
        fontWeight="500"
      >
        {label}
      </text>
      <circle
        cx={x}
        cy={y}
        r="59"
        fill="rgba(15,23,42,0.72)"
        stroke="#cbd5e1"
        strokeWidth="2"
      />
      <path
        d={`M${x - 41} ${y + 41} A58 58 0 0 1 ${x + 41} ${y + 41}`}
        fill="none"
        stroke="rgba(103,232,249,0.3)"
        strokeWidth="9"
        strokeLinecap="round"
      />
      {ticks.map((tick, index) => (
        <line
          key={index}
          {...tick}
          stroke="#94a3b8"
          strokeWidth={index % 2 === 0 ? 2 : 1.2}
        />
      ))}
      <g
        transform={`rotate(${angle} ${x} ${y})`}
        style={{ transition: "transform 220ms ease" }}
      >
        <line
          x1={x}
          y1={y}
          x2={x}
          y2={y - 42}
          stroke="#e8724a"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
      <circle cx={x} cy={y} r="6" fill="#e8724a" />
      <text
        x={x}
        y={y + 82}
        textAnchor="middle"
        fill="#f8fafc"
        fontSize="17"
        fontWeight="500"
      >
        {pressure.toFixed(2)} atm
      </text>
    </g>
  );
}

function AlcoholLamp({
  x,
  running,
  speed,
}: {
  x: number;
  running: boolean;
  speed: number;
}) {
  return (
    <g transform={`translate(${x} 510)`}>
      <ellipse cx="0" cy="59" rx="50" ry="12" fill="rgba(2,6,23,0.45)" />
      <path
        d="M-31 34 Q-28 18 -13 14 H13 Q28 18 31 34 L27 59 H-27 Z"
        fill="#9a5b30"
        stroke="#fdba74"
        strokeWidth="2"
      />
      <rect
        x="-12"
        y="7"
        width="24"
        height="12"
        rx="4"
        fill="#475569"
        stroke="#cbd5e1"
      />
      <path
        d="M0 9 C-19 -7 -13 -27 0 -43 C16 -25 21 -7 0 9 Z"
        fill="#f97316"
        stroke="#fed7aa"
        strokeWidth="1.5"
      >
        {running && (
          <animate
            attributeName="d"
            values="M0 9 C-19 -7 -13 -27 0 -43 C16 -25 21 -7 0 9 Z;M0 9 C-14 -9 -8 -34 4 -48 C13 -25 17 -5 0 9 Z;M0 9 C-19 -7 -13 -27 0 -43 C16 -25 21 -7 0 9 Z"
            dur={`${1.2 / speed}s`}
            repeatCount="indefinite"
          />
        )}
      </path>
      <path d="M0 4 C-8 -7 -5 -18 1 -27 C9 -14 9 -4 0 4 Z" fill="#fef3c7" />
      <text
        x="0"
        y="83"
        textAnchor="middle"
        fill="#fed7aa"
        fontSize="11"
        fontWeight="500"
      >
        Đèn cồn cấp nhiệt Q
      </text>
    </g>
  );
}

export function IsothermalBoyleCanvas({
  params,
  onParamsChange,
  running,
  speed,
  zoom,
}: {
  params: BoyleParams;
  onParamsChange: (patch: Partial<BoyleParams>) => void;
  running: boolean;
  speed: number;
  zoom: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragTarget, setDragTarget] = useState<"A" | "B" | null>(null);
  const stateAValue = calculateState({
    volume: params.volumeA,
    temperature: params.temperature,
  });
  const stateBValue = calculateState({
    volume: params.volumeB,
    temperature: params.temperature,
  });
  const molecules = useMemo(() => createMolecules(), []);
  const zoomScale = zoom / 100;

  const states: CylinderSpec[] = [
    {
      label: "A",
      x: 300,
      volume: stateAValue.volume,
      pressure: stateAValue.pressure,
      temperature: stateAValue.temperature,
    },
    {
      label: "B",
      x: 700,
      volume: stateBValue.volume,
      pressure: stateBValue.pressure,
      temperature: stateBValue.temperature,
    },
  ];

  const pointerToVolume = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return dragTarget === "A" ? params.volumeA : params.volumeB;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return dragTarget === "A" ? params.volumeA : params.volumeB;
    const localPoint = point.matrixTransform(matrix.inverse());
    const unscaledY =
      VIEW_HEIGHT / 2 + (localPoint.y - VIEW_HEIGHT / 2) / zoomScale;
    const y = clampPistonPosition(
      unscaledY,
      CYLINDER_BOTTOM - MAX_GAS_HEIGHT,
      CYLINDER_BOTTOM - MIN_GAS_HEIGHT,
    );
    return mapCylinderHeightToVolume(
      CYLINDER_BOTTOM - y,
      MIN_GAS_HEIGHT,
      MAX_GAS_HEIGHT,
    );
  };

  const updateVolume = (label: "A" | "B", volume: number) => {
    onParamsChange(label === "A" ? { volumeA: volume } : { volumeB: volume });
  };

  const startDrag = (
    event: React.PointerEvent<SVGGElement>,
    label: "A" | "B",
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragTarget(label);
    updateVolume(label, pointerToVolume(event.clientX, event.clientY));
  };

  const moveDrag = (event: React.PointerEvent<SVGGElement>) => {
    if (!dragTarget) return;
    updateVolume(dragTarget, pointerToVolume(event.clientX, event.clientY));
  };

  const endDrag = (event: React.PointerEvent<SVGGElement>) => {
    setDragTarget(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const renderCylinder = (spec: CylinderSpec) => {
    const gasHeight = mapVolumeToCylinderHeight(
      spec.volume,
      MIN_GAS_HEIGHT,
      MAX_GAS_HEIGHT,
    );
    const pistonY = CYLINDER_BOTTOM - gasHeight;
    const cylinderX = spec.x - CYLINDER_WIDTH / 2;

    return (
      <g key={spec.label}>
        <text
          x={spec.x}
          y="68"
          textAnchor="middle"
          fill="#e2e8f0"
          fontSize="16"
          fontWeight="500"
        >
          Trạng thái {spec.label}
        </text>
        <MiniThermometer
          x={spec.x - 145}
          y={154}
          temperature={spec.temperature}
          label={`T${spec.label}`}
        />
        <PressureGauge
          x={spec.x + 145}
          y={224}
          pressure={spec.pressure}
          label={`p${spec.label}`}
        />

        <rect
          x={cylinderX - 15}
          y={CYLINDER_TOP - 8}
          width={CYLINDER_WIDTH + 30}
          height={CYLINDER_BOTTOM - CYLINDER_TOP + 24}
          rx="19"
          fill="rgba(226,232,240,0.055)"
          stroke="rgba(226,232,240,0.2)"
        />
        <path
          d={`M${cylinderX} ${CYLINDER_TOP} V${CYLINDER_BOTTOM - 12} Q${cylinderX} ${CYLINDER_BOTTOM} ${cylinderX + 12} ${CYLINDER_BOTTOM} H${cylinderX + CYLINDER_WIDTH - 12} Q${cylinderX + CYLINDER_WIDTH} ${CYLINDER_BOTTOM} ${cylinderX + CYLINDER_WIDTH} ${CYLINDER_BOTTOM - 12} V${CYLINDER_TOP}`}
          fill="rgba(8,145,178,0.08)"
          stroke="#cbd5e1"
          strokeWidth="2.4"
        />
        <path
          d={`M${cylinderX + 3} ${pistonY + 10} H${cylinderX + CYLINDER_WIDTH - 3} V${CYLINDER_BOTTOM - 12} Q${cylinderX + CYLINDER_WIDTH - 3} ${CYLINDER_BOTTOM - 3} ${cylinderX + CYLINDER_WIDTH - 12} ${CYLINDER_BOTTOM - 3} H${cylinderX + 12} Q${cylinderX + 3} ${CYLINDER_BOTTOM - 3} ${cylinderX + 3} ${CYLINDER_BOTTOM - 12} Z`}
          fill="rgba(103,232,249,0.46)"
          stroke="rgba(165,243,252,0.68)"
          style={{ transition: "d 220ms ease" }}
        />

        {params.showMolecules &&
          molecules.map((molecule, index) => {
            const x = cylinderX + 12 + molecule.x * (CYLINDER_WIDTH - 24);
            const y = pistonY + 20 + molecule.y * Math.max(8, gasHeight - 35);
            const drift = molecule.direction * (3 + (index % 3));
            return (
              <circle
                key={`${spec.label}-${index}`}
                cx={x}
                cy={y}
                r={molecule.radius}
                fill="rgba(207,250,254,0.88)"
              >
                {running && (
                  <>
                    <animate
                      attributeName="cx"
                      values={`${x - drift};${x + drift};${x - drift}`}
                      dur={`${molecule.duration / speed}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="cy"
                      values={`${y - 3};${y + 3};${y - 3}`}
                      dur={`${(molecule.duration + 0.4) / speed}s`}
                      repeatCount="indefinite"
                    />
                  </>
                )}
              </circle>
            );
          })}

        {[MIN_VOLUME, 2.6, 3.5, 4.5, 5.4, MAX_VOLUME].map((volume) => {
          const height = mapVolumeToCylinderHeight(
            volume,
            MIN_GAS_HEIGHT,
            MAX_GAS_HEIGHT,
          );
          const y = CYLINDER_BOTTOM - height;
          return (
            <g key={`${spec.label}-${volume}`}>
              <line
                x1={cylinderX - 10}
                y1={y}
                x2={cylinderX}
                y2={y}
                stroke="#94a3b8"
              />
              <text
                x={cylinderX - 15}
                y={y + 4}
                textAnchor="end"
                fill="#93c5fd"
                fontSize="9"
              >
                {volume.toFixed(1)} L
              </text>
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
          <rect
            x={cylinderX - 22}
            y={pistonY - 13}
            width={CYLINDER_WIDTH + 44}
            height="26"
            rx="7"
            fill="#e2e8f0"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          <rect
            x={cylinderX + 30}
            y={pistonY - 53}
            width={CYLINDER_WIDTH - 60}
            height="40"
            rx="7"
            fill="rgba(226,232,240,0.18)"
            stroke="#cbd5e1"
          />
          <line
            x1={spec.x}
            y1={pistonY - 85}
            x2={spec.x}
            y2={pistonY - 13}
            stroke="#cbd5e1"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle
            cx={spec.x}
            cy={pistonY - 91}
            r="13"
            fill="#e8724a"
            stroke="#fed7aa"
            strokeWidth="2"
          />
        </g>

        <text
          x={spec.x}
          y="457"
          textAnchor="middle"
          fill="#e2e8f0"
          fontSize="14"
          fontWeight="500"
        >
          Xi lanh {spec.label}
        </text>
        <text
          x={spec.x}
          y="480"
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="11.5"
        >
          p = {spec.pressure.toFixed(2)} atm · V = {spec.volume.toFixed(2)} L
        </text>
        <AlcoholLamp x={spec.x} running={running} speed={speed} />
      </g>
    );
  };

  return (
    <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-lg bg-[#0f172a]">
      <svg
        ref={svgRef}
        viewBox="100 0 800 700"
        className="h-full w-full touch-none select-none"
        role="img"
        aria-label="Mô phỏng quá trình đẳng nhiệt với hai piston và hai đèn cồn"
      >
        <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#0f172a" />
        <g
          transform={`translate(${VIEW_WIDTH / 2} ${VIEW_HEIGHT / 2}) scale(${zoomScale}) translate(${-VIEW_WIDTH / 2} ${-VIEW_HEIGHT / 2})`}
          style={{ transition: "transform 180ms ease" }}
        >
          {states.map(renderCylinder)}
          <g transform="translate(390 626)">
            <rect
              width="220"
              height="48"
              rx="14"
              fill="rgba(2,6,23,0.62)"
              stroke="rgba(148,163,184,0.22)"
            />
            <text
              x="110"
              y="20"
              textAnchor="middle"
              fill="#fbbf24"
              fontSize="13"
              fontWeight="500"
            >
              pV = const = {stateAValue.constant.toFixed(2)} atm·L
            </text>
            <text
              x="110"
              y="38"
              textAnchor="middle"
              fill="#67e8f9"
              fontSize="10.5"
              fontWeight="500"
            >
              A: {statusLabel(stateAValue.status)} · B:{" "}
              {statusLabel(stateBValue.status)}
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}
