"use client";

import { useMemo, useRef, useState } from "react";
import {
  calculateState,
  calculateTemperatureFromVolume,
  clamp,
  mapHeightToVolume,
  mapVolumeToHeight,
  MAX_PRESSURE,
  MAX_TEMPERATURE_C,
  MAX_VOLUME,
  MIN_PRESSURE,
  MIN_TEMPERATURE_C,
  MIN_VOLUME,
} from "./physics";
import type { IsobaricParams } from "./types";

const VIEW_WIDTH = 980;
const VIEW_HEIGHT = 620;
const CYLINDER_X = 210;
const CYLINDER_WIDTH = 240;
const CYLINDER_BOTTOM = 438;
const MIN_GAS_HEIGHT = 105;
const MAX_GAS_HEIGHT = 255;

const GRAPH_X = 650;
const GRAPH_Y = 150;
const GRAPH_WIDTH = 265;
const GRAPH_HEIGHT = 240;

function createMolecules() {
  return Array.from({ length: 36 }, (_, index) => ({
    x: 0.05 + ((index * 37) % 90) / 100,
    y: 0.07 + ((index * 53) % 86) / 100,
    radius: 2.1 + (index % 3) * 0.35,
    duration: 1.5 + (index % 6) * 0.24,
    direction: index % 2 === 0 ? 1 : -1,
  }));
}

function pressureToLoadCount(pressure: number) {
  const ratio = clamp(
    (pressure - MIN_PRESSURE) / (MAX_PRESSURE - MIN_PRESSURE),
    0,
    1,
  );
  return Math.round(2 + ratio * 3);
}

function Thermometer({ temperatureC }: { temperatureC: number }) {
  const ratio = clamp(
    (temperatureC - MIN_TEMPERATURE_C) /
      (MAX_TEMPERATURE_C - MIN_TEMPERATURE_C),
    0,
    1,
  );
  const liquidTop = 322 - ratio * 105;

  return (
    <g aria-label={`Nhiệt kế ${temperatureC.toFixed(1)} độ C`}>
      <text
        x="118"
        y="175"
        textAnchor="middle"
        fill="#e2e8f0"
        fontSize="14"
        fontWeight="500"
      >
        Nhiệt kế T
      </text>
      <rect
        x="107"
        y="194"
        width="22"
        height="142"
        rx="11"
        fill="rgba(248,250,252,0.12)"
        stroke="#dbeafe"
        strokeWidth="2"
      />
      <rect
        x="114"
        y={liquidTop}
        width="8"
        height={329 - liquidTop}
        rx="4"
        fill="#fb4d61"
        style={{ transition: "y 240ms ease, height 240ms ease" }}
      />
      <circle
        cx="118"
        cy="342"
        r="16"
        fill="#f43f5e"
        stroke="#fecdd3"
        strokeWidth="2"
      />
      {[0, 1, 2, 3, 4, 5].map((tick) => (
        <line
          key={tick}
          x1="132"
          y1={211 + tick * 21}
          x2={tick % 2 === 0 ? "143" : "139"}
          y2={211 + tick * 21}
          stroke="#94a3b8"
          strokeWidth="1.5"
        />
      ))}
      <rect
        x="74"
        y="374"
        width="88"
        height="31"
        rx="15.5"
        fill="rgba(2,6,23,0.72)"
        stroke="rgba(148,163,184,0.3)"
      />
      <text
        x="118"
        y="395"
        textAnchor="middle"
        fill="#f8fafc"
        fontSize="13"
        fontWeight="500"
      >
        {temperatureC.toFixed(1)} °C
      </text>
    </g>
  );
}

function PressureGauge({ pressure }: { pressure: number }) {
  const centerX = 548;
  const centerY = 238;
  const ratio = clamp(
    (pressure - MIN_PRESSURE) / (MAX_PRESSURE - MIN_PRESSURE),
    0,
    1,
  );
  const angle = -125 + ratio * 250;
  const ticks = Array.from({ length: 9 }, (_, index) => {
    const tickAngle = (-125 + index * 31.25) * (Math.PI / 180);
    return {
      x1: centerX + Math.sin(tickAngle) * 43,
      y1: centerY - Math.cos(tickAngle) * 43,
      x2: centerX + Math.sin(tickAngle) * 53,
      y2: centerY - Math.cos(tickAngle) * 53,
    };
  });

  return (
    <g aria-label={`Áp kế ${pressure.toFixed(2)} atmosphere`}>
      <text
        x={centerX}
        y="153"
        textAnchor="middle"
        fill="#e2e8f0"
        fontSize="14"
        fontWeight="500"
      >
        Áp kế p
      </text>
      <circle
        cx={centerX}
        cy={centerY}
        r="68"
        fill="#f8fafc"
        stroke="#cbd5e1"
        strokeWidth="5"
      />
      {ticks.map((tick, index) => (
        <line
          key={index}
          {...tick}
          stroke="#64748b"
          strokeWidth={index % 2 === 0 ? 2.4 : 1.5}
          strokeLinecap="round"
        />
      ))}
      <g
        transform={`rotate(${angle} ${centerX} ${centerY})`}
        style={{ transition: "transform 240ms ease" }}
      >
        <line
          x1={centerX}
          y1={centerY + 8}
          x2={centerX}
          y2={centerY - 44}
          stroke="#ef4444"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
      <circle cx={centerX} cy={centerY} r="7" fill="#0f172a" />
      <text
        x={centerX}
        y={centerY + 30}
        textAnchor="middle"
        fill="#334155"
        fontSize="12"
        fontWeight="500"
      >
        atm
      </text>
      <rect
        x={centerX - 52}
        y="320"
        width="104"
        height="31"
        rx="15.5"
        fill="rgba(2,6,23,0.72)"
        stroke="rgba(148,163,184,0.3)"
      />
      <text
        x={centerX}
        y="341"
        textAnchor="middle"
        fill="#f8fafc"
        fontSize="13"
        fontWeight="500"
      >
        {pressure.toFixed(2)} atm
      </text>
      <text
        x={centerX}
        y="371"
        textAnchor="middle"
        fill="#67e8f9"
        fontSize="12"
        fontWeight="500"
      >
        p = const
      </text>
    </g>
  );
}

function HeatSource({
  temperatureC,
  running,
  speed,
}: {
  temperatureC: number;
  running: boolean;
  speed: number;
}) {
  const heating = temperatureC >= 20;
  const color = heating ? "#fb923c" : "#38bdf8";
  const lightColor = heating ? "#fbbf24" : "#a5f3fc";
  const label = heating ? "Q vào: khí nhận nhiệt" : "Q ra: khí tỏa nhiệt";

  return (
    <g>
      <rect
        x="237"
        y="486"
        width="216"
        height="44"
        rx="18"
        fill={heating ? "rgba(124,45,18,0.35)" : "rgba(7,89,133,0.3)"}
        stroke={color}
        strokeWidth="2"
      />
      <rect x="250" y="497" width="190" height="10" rx="5" fill={color}>
        {running && (
          <animate
            attributeName="opacity"
            values="0.5;1;0.5"
            dur={`${1.5 / speed}s`}
            repeatCount="indefinite"
          />
        )}
      </rect>
      {[282, 345, 408].map((x, index) => (
        <g key={x}>
          <path
            d={
              heating
                ? `M${x} 480 C${x - 9} 468 ${x + 9} 457 ${x} 444`
                : `M${x} 444 C${x - 9} 457 ${x + 9} 468 ${x} 480`
            }
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="5 7"
          >
            {running && (
              <animate
                attributeName="stroke-dashoffset"
                values="24;0"
                dur={`${(1.05 + index * 0.16) / speed}s`}
                repeatCount="indefinite"
              />
            )}
          </path>
          <circle cx={x} cy={heating ? 444 : 480} r="3.5" fill={lightColor} />
        </g>
      ))}
      <text
        x="345"
        y="554"
        textAnchor="middle"
        fill={heating ? "#fed7aa" : "#bae6fd"}
        fontSize="13"
        fontWeight="500"
      >
        {label}
      </text>
    </g>
  );
}

function PVGraph({
  pressure,
  volume,
  comparisonVolume,
  running,
}: {
  pressure: number;
  volume: number;
  comparisonVolume: number;
  running: boolean;
}) {
  const toX = (value: number) =>
    GRAPH_X + ((value - MIN_VOLUME) / (MAX_VOLUME - MIN_VOLUME)) * GRAPH_WIDTH;
  const toY = (value: number) =>
    GRAPH_Y + GRAPH_HEIGHT - ((value - 0.6) / (1.6 - 0.6)) * GRAPH_HEIGHT;
  const currentX = toX(volume);
  const comparisonX = toX(comparisonVolume);
  const pressureY = toY(pressure);

  return (
    <g>
      <rect
        x="622"
        y="92"
        width="326"
        height="394"
        rx="20"
        fill="rgba(2,6,23,0.42)"
        stroke="rgba(148,163,184,0.2)"
      />
      <text
        x="785"
        y="124"
        textAnchor="middle"
        fill="#e2e8f0"
        fontSize="16"
        fontWeight="500"
      >
        Đồ thị quá trình p–V
      </text>
      {[0, 1, 2, 3, 4].map((index) => {
        const y = GRAPH_Y + (index / 4) * GRAPH_HEIGHT;
        return (
          <line
            key={`horizontal-${index}`}
            x1={GRAPH_X}
            y1={y}
            x2={GRAPH_X + GRAPH_WIDTH}
            y2={y}
            stroke="rgba(148,163,184,0.14)"
          />
        );
      })}
      {[0, 1, 2, 3, 4].map((index) => {
        const x = GRAPH_X + (index / 4) * GRAPH_WIDTH;
        return (
          <line
            key={`vertical-${index}`}
            x1={x}
            y1={GRAPH_Y}
            x2={x}
            y2={GRAPH_Y + GRAPH_HEIGHT}
            stroke="rgba(148,163,184,0.14)"
          />
        );
      })}
      <line
        x1={GRAPH_X}
        y1={GRAPH_Y - 8}
        x2={GRAPH_X}
        y2={GRAPH_Y + GRAPH_HEIGHT + 12}
        stroke="#cbd5e1"
        strokeWidth="2"
      />
      <line
        x1={GRAPH_X - 8}
        y1={GRAPH_Y + GRAPH_HEIGHT}
        x2={GRAPH_X + GRAPH_WIDTH + 14}
        y2={GRAPH_Y + GRAPH_HEIGHT}
        stroke="#cbd5e1"
        strokeWidth="2"
      />
      <line
        x1={GRAPH_X}
        y1={pressureY}
        x2={GRAPH_X + GRAPH_WIDTH}
        y2={pressureY}
        stroke="#67e8f9"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <line
        x1={currentX}
        y1={pressureY}
        x2={currentX}
        y2={GRAPH_Y + GRAPH_HEIGHT}
        stroke="#fb923c"
        strokeDasharray="5 5"
      />
      <circle
        cx={comparisonX}
        cy={pressureY}
        r="7"
        fill="#0f172a"
        stroke="#a5f3fc"
        strokeWidth="2.5"
      />
      <circle
        cx={currentX}
        cy={pressureY}
        r="9"
        fill="#fb923c"
        stroke="#ffedd5"
        strokeWidth="3"
        style={{ transition: "cx 240ms ease, cy 240ms ease" }}
      >
        {running && (
          <animate
            attributeName="r"
            values="8;10;8"
            dur="1.8s"
            repeatCount="indefinite"
          />
        )}
      </circle>
      <text
        x={GRAPH_X - 8}
        y={GRAPH_Y - 16}
        textAnchor="middle"
        fill="#f8fafc"
        fontSize="13"
        fontWeight="500"
      >
        p (atm)
      </text>
      <text
        x={GRAPH_X + GRAPH_WIDTH + 8}
        y={GRAPH_Y + GRAPH_HEIGHT + 29}
        textAnchor="end"
        fill="#f8fafc"
        fontSize="13"
        fontWeight="500"
      >
        V (L)
      </text>
      {[3, 4, 5, 6, 7, 8].map((tick) => (
        <text
          key={tick}
          x={toX(tick)}
          y={GRAPH_Y + GRAPH_HEIGHT + 20}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="10"
        >
          {tick}
        </text>
      ))}
      {[0.8, 1, 1.2, 1.4].map((tick) => (
        <text
          key={tick}
          x={GRAPH_X - 12}
          y={toY(tick) + 4}
          textAnchor="end"
          fill="#94a3b8"
          fontSize="10"
        >
          {tick.toFixed(1)}
        </text>
      ))}
      <g transform="translate(651 429)">
        <circle cx="7" cy="7" r="5" fill="#fb923c" />
        <text x="19" y="11" fill="#fed7aa" fontSize="11" fontWeight="500">
          Trạng thái hiện tại
        </text>
        <circle
          cx="158"
          cy="7"
          r="5"
          fill="#0f172a"
          stroke="#a5f3fc"
          strokeWidth="2"
        />
        <text x="170" y="11" fill="#bae6fd" fontSize="11" fontWeight="500">
          Điểm so sánh
        </text>
      </g>
      <text
        x="785"
        y="467"
        textAnchor="middle"
        fill="#fbbf24"
        fontSize="13"
        fontWeight="500"
      >
        p = {pressure.toFixed(2)} atm = const
      </text>
    </g>
  );
}

export function IsobaricProcessCanvas({
  params,
  onParamsChange,
  running,
  speed,
  zoom,
}: {
  params: IsobaricParams;
  onParamsChange: (patch: Partial<IsobaricParams>) => void;
  running: boolean;
  speed: number;
  zoom: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const molecules = useMemo(() => createMolecules(), []);
  const state = calculateState(params);
  const comparisonState = calculateState({
    temperatureC: params.comparisonTemperatureC,
    pressure: params.pressure,
  });
  const gasHeight = mapVolumeToHeight(
    state.volume,
    MIN_GAS_HEIGHT,
    MAX_GAS_HEIGHT,
  );
  const pistonY = CYLINDER_BOTTOM - gasHeight;
  const heightCentimeters = gasHeight / 10;
  const loadCount = pressureToLoadCount(state.pressure);

  const pointerToTemperature = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return state.temperatureC;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return state.temperatureC;
    const localPoint = point.matrixTransform(matrix.inverse());
    const y = clamp(
      localPoint.y,
      CYLINDER_BOTTOM - MAX_GAS_HEIGHT,
      CYLINDER_BOTTOM - MIN_GAS_HEIGHT,
    );
    const volume = mapHeightToVolume(
      CYLINDER_BOTTOM - y,
      MIN_GAS_HEIGHT,
      MAX_GAS_HEIGHT,
    );
    return calculateTemperatureFromVolume(volume, state.pressure);
  };

  const startDrag = (event: React.PointerEvent<SVGGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    onParamsChange({
      temperatureC: pointerToTemperature(event.clientX, event.clientY),
    });
  };

  const moveDrag = (event: React.PointerEvent<SVGGElement>) => {
    if (!dragging) return;
    onParamsChange({
      temperatureC: pointerToTemperature(event.clientX, event.clientY),
    });
  };

  const endDrag = (event: React.PointerEvent<SVGGElement>) => {
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-lg bg-[#0f172a]">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="h-full w-full touch-none select-none"
        role="img"
        aria-label="Mô phỏng quá trình đẳng áp với piston có tải, nguồn nhiệt, nhiệt kế, áp kế và đồ thị p V"
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: "center center",
          transition: "transform 180ms ease",
        }}
      >
        <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#0f172a" />
        <text x="40" y="44" fill="#f8fafc" fontSize="20" fontWeight="500">
          Quá trình đẳng áp p–V
        </text>
        <text x="40" y="69" fill="#94a3b8" fontSize="12.5">
          Kéo piston hoặc thay đổi nhiệt độ. Tải trên piston giữ áp suất không
          đổi trong suốt quá trình.
        </text>

        <Thermometer temperatureC={state.temperatureC} />
        <PressureGauge pressure={state.pressure} />

        <g>
          <rect
            x={CYLINDER_X - 18}
            y="91"
            width={CYLINDER_WIDTH + 36}
            height="363"
            rx="23"
            fill="rgba(226,232,240,0.06)"
            stroke="rgba(226,232,240,0.18)"
          />
          <path
            d={`M${CYLINDER_X} 101 V${CYLINDER_BOTTOM - 14} Q${CYLINDER_X} ${CYLINDER_BOTTOM} ${CYLINDER_X + 14} ${CYLINDER_BOTTOM} H${CYLINDER_X + CYLINDER_WIDTH - 14} Q${CYLINDER_X + CYLINDER_WIDTH} ${CYLINDER_BOTTOM} ${CYLINDER_X + CYLINDER_WIDTH} ${CYLINDER_BOTTOM - 14} V101`}
            fill="rgba(8,145,178,0.08)"
            stroke="#cbd5e1"
            strokeWidth="3"
          />
          <rect
            x={CYLINDER_X + 10}
            y={pistonY + 7}
            width={CYLINDER_WIDTH - 20}
            height={gasHeight - 17}
            rx="11"
            fill="rgba(14,165,233,0.34)"
            stroke="rgba(103,232,249,0.5)"
            style={{
              transition: dragging ? "none" : "y 240ms ease, height 240ms ease",
            }}
          />

          {molecules.map((molecule, index) => {
            const x = CYLINDER_X + 18 + molecule.x * (CYLINDER_WIDTH - 36);
            const y = pistonY + 18 + molecule.y * Math.max(12, gasHeight - 38);
            const drift = molecule.direction * (4 + (index % 4));
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r={molecule.radius}
                fill="rgba(207,250,254,0.9)"
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
                      values={`${y - 4};${y + 4};${y - 4}`}
                      dur={`${(molecule.duration + 0.42) / speed}s`}
                      repeatCount="indefinite"
                    />
                  </>
                )}
              </circle>
            );
          })}

          <g
            transform={`translate(0 ${pistonY})`}
            className="cursor-ns-resize"
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={{
              transition: dragging
                ? "none"
                : "transform 240ms cubic-bezier(.2,.8,.2,1)",
            }}
          >
            <rect
              x={CYLINDER_X - 18}
              y="-12"
              width={CYLINDER_WIDTH + 36}
              height="24"
              rx="6"
              fill="#e2e8f0"
              stroke="#94a3b8"
              strokeWidth="2"
            />
            <rect
              x={CYLINDER_X + 10}
              y="3"
              width={CYLINDER_WIDTH - 20}
              height="10"
              rx="4"
              fill="#94a3b8"
              opacity="0.75"
            />
            <line
              x1={CYLINDER_X + CYLINDER_WIDTH / 2}
              y1="-58"
              x2={CYLINDER_X + CYLINDER_WIDTH / 2}
              y2="-12"
              stroke="#cbd5e1"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {Array.from({ length: loadCount }, (_, index) => (
              <g key={index} transform={`translate(0 ${-76 - index * 18})`}>
                <rect
                  x={CYLINDER_X + 66}
                  width="108"
                  height="16"
                  rx="5"
                  fill={index === loadCount - 1 ? "#fb923c" : "#64748b"}
                  stroke="#e2e8f0"
                  strokeWidth="1.2"
                />
                <rect
                  x={CYLINDER_X + 84}
                  y="4"
                  width="72"
                  height="5"
                  rx="2.5"
                  fill="rgba(15,23,42,0.35)"
                />
              </g>
            ))}
            <rect
              x={CYLINDER_X - 24}
              y="-172"
              width={CYLINDER_WIDTH + 48}
              height="186"
              fill="transparent"
            />
          </g>

          <text
            x="330"
            y={Math.max(35, pistonY - 84 - loadCount * 18)}
            textAnchor="middle"
            fill="#fed7aa"
            fontSize="12"
            fontWeight="500"
          >
            Tải cố định: {loadCount} quả cân
          </text>

          <line
            x1="472"
            y1={pistonY + 10}
            x2="472"
            y2={CYLINDER_BOTTOM}
            stroke="#a5f3fc"
            strokeWidth="2"
          />
          <path
            d={`M466 ${pistonY + 18} L472 ${pistonY + 10} L478 ${pistonY + 18}`}
            fill="none"
            stroke="#a5f3fc"
            strokeWidth="2"
          />
          <path
            d={`M466 ${CYLINDER_BOTTOM - 8} L472 ${CYLINDER_BOTTOM} L478 ${CYLINDER_BOTTOM - 8}`}
            fill="none"
            stroke="#a5f3fc"
            strokeWidth="2"
          />
          <text
            x="464"
            y={(pistonY + CYLINDER_BOTTOM) / 2}
            textAnchor="end"
            fill="#cffafe"
            fontSize="11.5"
            fontWeight="500"
          >
            h = {heightCentimeters.toFixed(1)} cm
          </text>

          <rect
            x="272"
            y={pistonY + Math.min(84, gasHeight * 0.45)}
            width="116"
            height="36"
            rx="18"
            fill="rgba(15,23,42,0.72)"
            stroke="rgba(165,243,252,0.34)"
          />
          <text
            x="330"
            y={pistonY + Math.min(84, gasHeight * 0.45) + 24}
            textAnchor="middle"
            fill="#f8fafc"
            fontSize="14"
            fontWeight="500"
          >
            V = {state.volume.toFixed(2)} L
          </text>
        </g>

        <HeatSource
          temperatureC={state.temperatureC}
          running={running}
          speed={speed}
        />
        <PVGraph
          pressure={state.pressure}
          volume={state.volume}
          comparisonVolume={comparisonState.volume}
          running={running}
        />

        <g transform="translate(640 518)">
          <rect
            width="302"
            height="67"
            rx="14"
            fill="rgba(2,6,23,0.42)"
            stroke="rgba(148,163,184,0.2)"
          />
          <text
            x="151"
            y="25"
            textAnchor="middle"
            fill="#e2e8f0"
            fontSize="12"
            fontWeight="500"
          >
            T tăng → khí nở → piston đi lên → V tăng
          </text>
          <text
            x="151"
            y="48"
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="11.5"
          >
            T giảm → khí co → piston đi xuống; p luôn không đổi
          </text>
        </g>
      </svg>
    </div>
  );
}
