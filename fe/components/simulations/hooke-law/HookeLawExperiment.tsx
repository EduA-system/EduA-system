"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import type { HookeLawPreset } from "../presets/types";
import { ParamPanel } from "../shared/param-panel";
import { SimulationTabs, type SimulationTab } from "../shared/simulation-tabs";
import { SimulationToolbar } from "../shared/simulation-toolbar";
import { ZoomControls } from "../shared/zoom-controls";
import {
  calculateHookeValues,
  INITIAL_HOOKE_MOTION,
  maxCompression,
  maxStretch,
  NATURAL_LENGTH,
  stepHookeMotion,
  type HookeLawParams,
  type HookeMotion,
} from "./physics";

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 620;
const SPRING_TOP = 132;
const NATURAL_LENGTH_PX = 190;
const COMPRESSION_ANCHOR_Y = 452;
const PIXELS_PER_METER = NATURAL_LENGTH_PX / NATURAL_LENGTH;
const CARD_HALF_WIDTH = 215;
// Khoảng cách giữa hai vòng xoắn liên tiếp (px) khi lò xo ở chiều dài tự nhiên.
// Số vòng xoắn được chốt theo l₀; khi giãn/nén chỉ bước xoắn thay đổi.
const RESTING_COIL_PITCH = 14;

function formatLength(meters: number) {
  return `${(meters * 100).toFixed(1)} cm`;
}

function springPath(
  x: number,
  top: number,
  bottom: number,
  radius = 15,
  fixedCoils?: number,
) {
  // Số vòng xoắn MẶC ĐỊNH theo mật độ vòng ở trạng thái tự nhiên. Nếu truyền
  // `fixedCoils` (lò xo hiển thị), dùng đúng số vòng đó để chỉ bước xoắn thay
  // đổi khi giãn/nén — vòng không thêm/bớt, không kéo dãn dây.
  const halfCoilPitch = 7;
  const span = Math.max(0, bottom - top);
  if (span < 12) return `M ${x} ${top} L ${x} ${bottom}`;
  const lead = Math.min(16, Math.max(4, span * 0.08), span / 3);
  const coilTop = top + lead;
  const availableCoilSpan = Math.max(0, bottom - coilTop - lead);
  if (availableCoilSpan < 10) return `M ${x} ${top} L ${x} ${bottom}`;
  const defaultSegments = Math.max(
    4,
    Math.floor(availableCoilSpan / halfCoilPitch),
  );
  const segments =
    fixedCoils !== undefined
      ? Math.max(2, Math.min(fixedCoils, Math.floor(availableCoilSpan / 5)))
      : defaultSegments;
  // Khi số vòng được chốt, khoảng cách giữa hai vòng thay đổi theo độ cao:
  // giãn → các vòng tách xa nhau; nén → các vòng khép lại, dây không bị kéo dài.
  const pitch =
    fixedCoils !== undefined
      ? Math.max(5, availableCoilSpan / segments)
      : halfCoilPitch;
  const coilBottom = coilTop + segments * pitch;
  const points = [`M ${x} ${top}`, `L ${x} ${coilTop}`];

  for (let index = 0; index <= segments; index += 1) {
    const ratio = index / segments;
    const y = coilTop + ratio * (coilBottom - coilTop);
    const offset =
      index === 0 || index === segments
        ? 0
        : index % 2 === 0
          ? -radius
          : radius;
    points.push(`L ${x + offset} ${y}`);
  }

  points.push(`L ${x} ${bottom}`);
  return points.join(" ");
}

function DoubleArrow({
  x,
  y1,
  y2,
  label,
  color,
  labelSide = "right",
}: {
  x: number;
  y1: number;
  y2: number;
  label: string;
  color: string;
  labelSide?: "left" | "right";
}) {
  const top = Math.min(y1, y2);
  const bottom = Math.max(y1, y2);
  const labelX = x + (labelSide === "right" ? 10 : -10);

  return (
    <g>
      <line
        x1={x}
        y1={top}
        x2={x}
        y2={bottom}
        stroke={color}
        strokeWidth="2"
        markerStart="url(#dimension-arrow)"
        markerEnd="url(#dimension-arrow)"
      />
      <rect
        x={labelSide === "right" ? labelX - 4 : labelX - 91}
        y={(top + bottom) / 2 - 13}
        width="85"
        height="25"
        rx="8"
        fill="rgba(2,6,23,0.9)"
        stroke={color}
        strokeOpacity="0.38"
      />
      <text
        x={labelSide === "right" ? labelX + 38 : labelX - 48}
        y={(top + bottom) / 2 + 4}
        textAnchor="middle"
        fill={color}
        fontSize="11.5"
        fontWeight="500"
      >
        {label}
      </text>
    </g>
  );
}

function ForceArrow({
  x,
  y1,
  y2,
  color,
  marker,
  label,
  labelX,
  labelSubscript,
}: {
  x: number;
  y1: number;
  y2: number;
  color: string;
  marker: string;
  label: string;
  labelX: number;
  labelSubscript?: string;
}) {
  return (
    <g>
      <line
        x1={x}
        y1={y1}
        x2={x}
        y2={y2}
        stroke={color}
        strokeWidth="3.2"
        strokeLinecap="round"
        markerEnd={`url(#${marker})`}
      />
      <text
        x={labelX}
        y={(y1 + y2) / 2 + 5}
        fill={color}
        fontSize="12.5"
        fontWeight="500"
      >
        {label}
        {labelSubscript && (
          <tspan baselineShift="sub" fontSize="9">
            {labelSubscript}
          </tspan>
        )}
      </text>
    </g>
  );
}

function Support({ centerX }: { centerX: number }) {
  return (
    <g>
      <rect
        x={centerX - 100}
        y="104"
        width="200"
        height="18"
        rx="5"
        fill="url(#support-gradient)"
        stroke="#dbeafe"
        strokeWidth="2"
      />
      {Array.from({ length: 12 }, (_, index) => (
        <line
          key={index}
          x1={centerX - 94 + index * 17}
          y1="106"
          x2={centerX - 86 + index * 17}
          y2="119"
          stroke="#64748b"
          strokeWidth="1.3"
        />
      ))}
      <path
        d={`M ${centerX - 12} 122 Q ${centerX} 139 ${centerX + 12} 122`}
        fill="#cbd5e1"
        stroke="#f8fafc"
        strokeWidth="2"
      />
      <circle cx={centerX} cy="129" r="5" fill="#0f172a" />
      <line
        x1={centerX}
        y1="128"
        x2={centerX}
        y2={SPRING_TOP + 6}
        stroke="#cbd5e1"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </g>
  );
}

function GroundSupport({ centerX }: { centerX: number }) {
  return (
    <g>
      <rect
        x={centerX - 100}
        y={COMPRESSION_ANCHOR_Y}
        width="200"
        height="18"
        rx="5"
        fill="url(#support-gradient)"
        stroke="#dbeafe"
        strokeWidth="2"
      />
      <path
        d={`M ${centerX - 150} 480 H ${centerX + 150}`}
        stroke="#64748b"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d={`M ${centerX - 70} 470 V 489 M ${centerX + 70} 470 V 489`}
        stroke="#94a3b8"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx={centerX} cy={COMPRESSION_ANCHOR_Y - 1} r="5" fill="#0f172a" />
    </g>
  );
}

function Spring({
  x,
  top = SPRING_TOP,
  bottom,
  ghost = false,
  fixedCoils,
}: {
  x: number;
  top?: number;
  bottom: number;
  ghost?: boolean;
  fixedCoils?: number;
}) {
  const path = springPath(x, top, bottom, 15, fixedCoils);

  return (
    <g opacity={ghost ? 0.19 : 1}>
      <path
        d={path}
        fill="none"
        stroke="#020617"
        strokeWidth={ghost ? 5 : 7}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.58"
      />
      <path
        d={path}
        fill="none"
        stroke={ghost ? "#94a3b8" : "url(#spring-gradient)"}
        strokeWidth={ghost ? 3 : 4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {!ghost && (
        <path
          d={path}
          fill="none"
          stroke="#f8fafc"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.64"
        />
      )}
    </g>
  );
}

function Mass({
  x,
  y,
  label,
  fill = "url(#mass-gradient)",
}: {
  x: number;
  y: number;
  label: string;
  fill?: string;
}) {
  return (
    <g>
      <rect
        x={x - 32}
        y={y - 28}
        width="64"
        height="56"
        rx="9"
        fill={fill}
        stroke="#fed7aa"
        strokeWidth="3"
        filter="url(#soft-shadow)"
      />
      <path
        d={`M ${x - 20} ${y - 18} H ${x + 18}`}
        stroke="rgba(255,255,255,0.34)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <text
        x={x}
        y={y + 6}
        textAnchor="middle"
        fill="#7c2d12"
        fontSize="15"
        fontWeight="500"
      >
        {label}
      </text>
    </g>
  );
}

function ApparatusCard({
  kind,
  centerX,
  displacement,
  length,
  naturalLength,
  pixelsPerMeter,
}: {
  kind: "stretch" | "compression";
  centerX: number;
  displacement: number;
  length: number;
  naturalLength: number;
  pixelsPerMeter: number;
}) {
  const isStretch = kind === "stretch";
  const naturalLengthPx = naturalLength * pixelsPerMeter;
  const naturalEnd = isStretch
    ? SPRING_TOP + naturalLengthPx
    : COMPRESSION_ANCHOR_Y - naturalLengthPx;
  const boundedDisplacement = isStretch
    ? Math.min(displacement, maxStretch(naturalLength))
    : Math.min(displacement, maxCompression(naturalLength));
  const signedPixels = boundedDisplacement * pixelsPerMeter;
  const currentEnd = naturalEnd + signedPixels;
  const massY = isStretch ? currentEnd + 28 : currentEnd - 28;
  const deltaTop = Math.min(naturalEnd, currentEnd);
  const deltaBottom = Math.max(naturalEnd, currentEnd);
  const deltaVisible = Math.abs(deltaBottom - deltaTop) > 5;
  // Số vòng xoắn chốt theo lò xo ở chiều dài tự nhiên (mật độ vòng không đổi).
  // Khi treo/nén vật, các vòng TÁCH RA / KHÉP LẠI — không thêm vòng, không kéo dãn dây.
  const coilSpanPx = Math.max(28, naturalLengthPx - 24);
  const fixedCoils = Math.max(4, Math.round(coilSpanPx / RESTING_COIL_PITCH));

  return (
    <g>
      <rect
        x={centerX - CARD_HALF_WIDTH}
        y="48"
        width={CARD_HALF_WIDTH * 2}
        height="520"
        rx="26"
        fill="rgba(15,32,51,0.92)"
        stroke={isStretch ? "#38bdf8" : "#f59e0b"}
        strokeOpacity="0.28"
        strokeWidth="2"
      />
      <rect
        x={centerX - 95}
        y="63"
        width="190"
        height="27"
        rx="13.5"
        fill={isStretch ? "rgba(14,165,233,0.16)" : "rgba(245,158,11,0.16)"}
        stroke={isStretch ? "#38bdf8" : "#f59e0b"}
        strokeOpacity="0.46"
      />
      <text
        x={centerX}
        y="81"
        textAnchor="middle"
        fill={isStretch ? "#7dd3fc" : "#fcd34d"}
        fontSize="11.5"
        fontWeight="500"
        letterSpacing="1"
      >
        {isStretch ? "THÍ NGHIỆM 1 · THẢ VẬT" : "THÍ NGHIỆM 2 · ÉP LÒ XO"}
      </text>

      {isStretch ? (
        <Support centerX={centerX} />
      ) : (
        <GroundSupport centerX={centerX} />
      )}
      <Spring
        x={centerX}
        top={isStretch ? SPRING_TOP : naturalEnd}
        bottom={isStretch ? naturalEnd : COMPRESSION_ANCHOR_Y}
        ghost
        fixedCoils={fixedCoils}
      />
      <line
        x1={centerX - 150}
        y1={naturalEnd}
        x2={centerX + 150}
        y2={naturalEnd}
        stroke="#94a3b8"
        strokeWidth="1.2"
        strokeDasharray="5 5"
        opacity="0.55"
      />
      <text
        x={centerX - 146}
        y={isStretch ? naturalEnd - 8 : naturalEnd + 18}
        fill="#94a3b8"
        fontSize="9.5"
        fontWeight="500"
      >
        Vị trí lò xo tự nhiên
      </text>
      <Spring
        x={centerX}
        top={isStretch ? SPRING_TOP : currentEnd}
        bottom={isStretch ? currentEnd : COMPRESSION_ANCHOR_Y}
        fixedCoils={fixedCoils}
      />
      <Mass x={centerX} y={massY} label={isStretch ? "m" : "m₂"} />

      <DoubleArrow
        x={centerX - 170}
        y1={isStretch ? SPRING_TOP : COMPRESSION_ANCHOR_Y}
        y2={naturalEnd}
        label={`l₀ = ${formatLength(naturalLength)}`}
        color="#94a3b8"
        labelSide="right"
      />
      <DoubleArrow
        x={centerX + 125}
        y1={isStretch ? SPRING_TOP : COMPRESSION_ANCHOR_Y}
        y2={currentEnd}
        label={`l = ${formatLength(length)}`}
        color="#cbd5e1"
        labelSide="left"
      />
      {deltaVisible && (
        <DoubleArrow
          x={centerX + 150}
          y1={deltaTop}
          y2={deltaBottom}
          label={`Δl = ${formatLength(boundedDisplacement)}`}
          color={isStretch ? "#22d3ee" : "#fbbf24"}
          labelSide="right"
        />
      )}

      {isStretch ? (
        <>
          <ForceArrow
            x={centerX - 16}
            y1={massY - 7}
            y2={massY - 74}
            color="#22d3ee"
            marker="cyan-arrow"
            label="F"
            labelSubscript="đh"
            labelX={centerX - 72}
          />
          <ForceArrow
            x={centerX + 17}
            y1={massY + 7}
            y2={Math.min(massY + 78, 490)}
            color="#fb7185"
            marker="rose-arrow"
            label="P"
            labelX={centerX + 31}
          />
        </>
      ) : (
        <>
          <ForceArrow
            x={centerX - 13}
            y1={massY + 4}
            y2={massY - 48}
            color="#34d399"
            marker="green-arrow"
            label="F"
            labelSubscript="đh"
            labelX={centerX - 60}
          />
          <ForceArrow
            x={centerX + 14}
            y1={massY + 4}
            y2={massY + 57}
            color="#fb7185"
            marker="rose-arrow"
            label="P"
            labelX={centerX + 25}
          />
        </>
      )}

    </g>
  );
}

function HookeLawScene({
  params,
  motion,
  zoom,
}: {
  params: HookeLawParams;
  motion: HookeMotion;
  zoom: number;
}) {
  const values = calculateHookeValues(params, motion);
  const pixelsPerMeter = PIXELS_PER_METER;

  return (
    <div className="relative h-full min-h-[390px] w-full overflow-hidden rounded-[15px] bg-[#071525]">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="h-full w-full select-none"
        role="img"
        aria-label="Hai thí nghiệm định luật Hooke: thả vật làm giãn lò xo và chồng thêm vật nặng để nén lò xo, có đầy đủ chiều dài và các vector lực"
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: "center center",
          transition: "transform 180ms ease",
        }}
      >
        <defs>
          <linearGradient id="spring-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#64748b" />
            <stop offset="0.34" stopColor="#f8fafc" />
            <stop offset="0.58" stopColor="#94a3b8" />
            <stop offset="1" stopColor="#e2e8f0" />
          </linearGradient>
          <linearGradient id="support-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e2e8f0" />
            <stop offset="1" stopColor="#64748b" />
          </linearGradient>
          <radialGradient id="mass-gradient" cx="35%" cy="28%" r="72%">
            <stop offset="0" stopColor="#fdba74" />
            <stop offset="0.55" stopColor="#f97316" />
            <stop offset="1" stopColor="#c2410c" />
          </radialGradient>
          <filter id="soft-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow
              dx="0"
              dy="6"
              stdDeviation="6"
              floodColor="#020617"
              floodOpacity="0.42"
            />
          </filter>
          <marker
            id="dimension-arrow"
            markerWidth="7"
            markerHeight="7"
            refX="3.5"
            refY="3.5"
            orient="auto-start-reverse"
          >
            <path d="M0,3.5 L7,0 L7,7 Z" fill="#cbd5e1" />
          </marker>
          <marker
            id="cyan-arrow"
            markerWidth="6"
            markerHeight="6"
            refX="5.5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="#22d3ee" />
          </marker>
          <marker
            id="rose-arrow"
            markerWidth="6"
            markerHeight="6"
            refX="5.5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="#fb7185" />
          </marker>
          <marker
            id="green-arrow"
            markerWidth="6"
            markerHeight="6"
            refX="5.5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="#34d399" />
          </marker>
        </defs>
        <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#071525" />
        <ApparatusCard
          kind="stretch"
          centerX={250}
          displacement={motion.stretch}
          length={values.stretchLength}
          naturalLength={params.naturalLength}
          pixelsPerMeter={pixelsPerMeter}
        />
        <ApparatusCard
          kind="compression"
          centerX={750}
          displacement={motion.compression}
          length={values.compressionLength}
          naturalLength={params.naturalLength}
          pixelsPerMeter={pixelsPerMeter}
        />
      </svg>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[9px] bg-[#faf9f7] p-2">
      <p className="text-[10px] text-[#8a8178]">{label}</p>
      <p className="mt-0.5 text-[12px] font-semibold tabular-nums text-[#171717]">
        {value}
      </p>
    </div>
  );
}

function HookeGraph({ springConstant }: { springConstant: number }) {
  const maxStretch = 0.08;
  const points = Array.from({ length: 9 }, (_, index) => {
    const stretch = (index / 8) * maxStretch;
    const force = springConstant * stretch;
    return `${30 + (stretch / maxStretch) * 220},${92 - (force / (springConstant * maxStretch)) * 72}`;
  }).join(" ");

  return (
    <div className="rounded-[12px] border border-[#e8e2d9] p-3">
      <p className="text-xs font-semibold text-[#171717]">Đồ thị Fđh – Δl</p>
      <svg
        viewBox="0 0 280 112"
        className="mt-2 w-full"
        role="img"
        aria-label="Đồ thị lực đàn hồi theo độ biến dạng là đường thẳng qua gốc tọa độ"
      >
        <path
          d="M30 12V92H262"
          fill="none"
          stroke="#b8aea5"
          strokeWidth="1.5"
        />
        <path
          d="M26 16L30 10L34 16M256 88L262 92L256 96"
          fill="none"
          stroke="#b8aea5"
          strokeWidth="1.5"
        />
        <polyline
          points={points}
          fill="none"
          stroke="#e8724a"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="30" cy="92" r="3.5" fill="#e8724a" />
        <text x="13" y="15" fill="#6b6b6b" fontSize="10" fontWeight="500">
          Fđh
        </text>
        <text x="246" y="108" fill="#6b6b6b" fontSize="10" fontWeight="500">
          Δl
        </text>
        <text x="170" y="44" fill="#c96545" fontSize="10.5" fontWeight="500">
          Hệ số góc = k
        </text>
      </svg>
    </div>
  );
}

export function HookeLawExperiment({
  preset,
  onBack,
}: {
  preset: HookeLawPreset;
  onBack: () => void;
}) {
  const initialParams = useMemo(
    () =>
      preset.applyParams(
        Object.fromEntries(
          preset.params.map((param) => [param.key, param.default]),
        ),
      ),
    [preset],
  );
  const [params, setParams] = useState<HookeLawParams>(initialParams);
  const [motion, setMotion] = useState<HookeMotion>(INITIAL_HOOKE_MOTION);
  const motionRef = useRef<HookeMotion>(INITIAL_HOOKE_MOTION);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [tab, setTab] = useState<SimulationTab>("params");
  const values = calculateHookeValues(params, motion);

  useEffect(() => {
    if (!running) return;
    let animationFrame = 0;
    let previous = performance.now();

    const animate = (now: number) => {
      const elapsed = ((now - previous) / 1000) * speed;
      previous = now;
      const next = stepHookeMotion(motionRef.current, params, elapsed);
      motionRef.current = next;
      setMotion(next);
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [params, running, speed]);

  const resetMotion = () => {
    motionRef.current = INITIAL_HOOKE_MOTION;
    setMotion(INITIAL_HOOKE_MOTION);
  };

  const reset = () => {
    setParams(initialParams);
    resetMotion();
    setRunning(false);
    setSpeed(1);
    setZoom(100);
  };

  const updateParam = (key: string, value: number) => {
    setParams((current) => ({ ...current, [key]: value }));
    resetMotion();
    setRunning(false);
  };

  const panelValues = {
    springConstant: params.springConstant,
    mass: params.mass,
    compressionMass: params.compressionMass,
    naturalLength: params.naturalLength,
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
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
        <b className="truncate text-sm text-[#171717]">{preset.title}</b>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <section className="flex min-h-[390px] min-w-0 flex-1 flex-col overflow-hidden p-2">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[16px] border border-[#e8e2d9] shadow-sm">
            <HookeLawScene params={params} motion={motion} zoom={zoom} />
            <SimulationToolbar
              running={running}
              speed={speed}
              onRunningChange={setRunning}
              onReset={reset}
              onSpeedChange={setSpeed}
            />
            <ZoomControls
              percent={zoom}
              onZoomIn={() => setZoom((current) => Math.min(130, current + 10))}
              onZoomOut={() => setZoom((current) => Math.max(70, current - 10))}
            />
          </div>
          <p className="mt-3 shrink-0 text-center text-[13px] text-[#6b6b6b]">
            {preset.objective}
          </p>
        </section>

        <aside className="flex max-h-[58vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-[#e8e2d9] bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
          <SimulationTabs value={tab} onChange={setTab} />
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            {tab === "params" && (
              <>
                <div className="rounded-[10px] bg-[#faf9f7] p-3 text-[11px] leading-relaxed text-[#6b6b6b]">
                  <b className="text-[#171717]">Định luật Hooke:</b> trong giới
                  hạn đàn hồi, độ lớn lực đàn hồi tỉ lệ với độ biến dạng:{" "}
                  <b>Fđh = k·|Δl|</b>.
                  <p className="mt-2 text-[10px] text-[#8a8178]">
                    k: độ cứng lò xo · m: khối lượng vật treo · m₂: khối lượng vật đè ·
                    P = mg: trọng lực · l₀: chiều dài tự nhiên · Δl = |l − l₀|: độ biến dạng.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Metric
                    label="l₀ (Chiều dài tự nhiên)"
                    value={formatLength(params.naturalLength)}
                  />
                  <Metric
                    label="P kéo (mg)"
                    value={`${values.weight.toFixed(2)} N`}
                  />
                  <Metric
                    label="P nén (m₂g)"
                    value={`${values.compressionWeight.toFixed(2)} N`}
                  />
                  <Metric
                    label="Δl kéo (Độ giãn)"
                    value={formatLength(motion.stretch)}
                  />
                  <Metric
                    label="Δl nén (Độ nén)"
                    value={formatLength(motion.compression)}
                  />
                  <Metric
                    label="Fđh kéo (Lực đàn hồi)"
                    value={`${values.stretchSpringForce.toFixed(2)} N`}
                  />
                  <Metric
                    label="Fđh nén (Lực đàn hồi)"
                    value={`${values.compressionSpringForce.toFixed(2)} N`}
                  />
                </div>
                <ParamPanel
                  schema={preset.params}
                  values={panelValues}
                  onChange={updateParam}
                />
              </>
            )}

            {tab === "analysis" && (
              <div className="space-y-4 text-[12px] leading-relaxed text-[#4f4943]">
                <HookeGraph springConstant={params.springConstant} />
                <div className="rounded-[10px] bg-[#faf9f7] p-3">
                  <p className="font-semibold text-[#171717]">
                    Thí nghiệm thả vật
                  </p>
                  <p className="mt-1">
                    Khi vật đã đứng yên sau dao động: <b>P = Fđh</b>, suy ra
                    <b> k·Δl = mg</b> và Δl ={" "}
                    {(values.stretchEquilibrium * 100).toFixed(2)} cm.
                  </p>
                </div>
                <div className="rounded-[10px] bg-[#faf9f7] p-3">
                  <p className="font-semibold text-[#171717]">
                    Thí nghiệm ép lò xo
                  </p>
                  <p className="mt-1">
                    Đặt vật m₂ lên đỉnh lò xo làm lò xo ngắn lại. Khi vật đứng
                    yên, độ nén quan sát được là Δl ={" "}
                    {(values.compressionEquilibrium * 100).toFixed(2)} cm.
                  </p>
                </div>
                <div className="rounded-[10px] border border-[#e8e2d9] p-3 font-sans text-[12px] text-[#c96545]">
                  <p>Fđh = −k·Δl</p>
                  <p className="mt-1 text-[10px] font-sans text-[#8a8178]">
                    Dấu “−” cho biết lực đàn hồi luôn ngược chiều biến dạng.
                  </p>
                </div>
              </div>
            )}

            {tab === "ai" && (
              <div className="space-y-4 text-[12px] text-[#4f4943]">
                <div className="rounded-[10px] bg-[#faf9f7] p-3 leading-relaxed">
                  <p className="font-semibold text-[#171717]">Sửa bằng AI</p>
                  <p className="mt-1">
                    Giữ nguyên chức năng AI dùng chung của EDUA cho mô phỏng
                    này.
                  </p>
                </div>
                <button
                  type="button"
                  className="w-full rounded-[9px] bg-[#e8724a] px-3 py-2 text-[12px] font-semibold text-white"
                >
                  Gửi cho AI
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
