"use client";

/**
 * Hub mô phỏng Vật lý kiểu PhET + tuỳ chỉnh bằng AI.
 *
 * - Render bằng renderer riêng, nhận kết quả từ engine vật lý tương ứng.
 * - Thư viện = các PRESET đã kiểm duyệt (components/simulations/presets/).
 * - Luồng: Thư viện (browse + filter) → chọn sim → tham số / sửa bằng AI.
 * - Tầng AI là MOCK (giả độ trễ + diff + kiểm tra thị giác) minh hoạ mô hình an toàn:
 *   bản gốc bất khả xâm phạm, luôn revert được.
 */

import { useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, RotateCcw, CheckCircle2, X } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { ParamPanel } from "@/components/simulations/shared/param-panel";
import {
  LandmarksPanel,
  type JumpMark,
} from "@/components/simulations/shared/landmarks-panel";
import { SimulationToolbar } from "@/components/simulations/shared/simulation-toolbar";
import { SimulationTabs } from "@/components/simulations/shared/simulation-tabs";
import {
  PRESETS,
  type Preset,
  type Domain,
} from "@/components/simulations/presets";
import type { SceneReadout } from "@/components/simulations/shared/scene-types";
import type { Scene } from "@/components/simulations/engines/mechanics/types";
import type { WaveScene } from "@/components/simulations/engines/wave/types";
import type { StringWaveScene } from "@/components/simulations/engines/string-wave/types";
import type { WaveFieldScene } from "@/components/simulations/engines/wave-field/types";
import type { PointChargeFieldScene } from "@/components/simulations/engines/point-charge-field/types";
import { CorkExperiment } from "@/components/simulations/thermodynamics/cork-experiment";
import { BecquerelExperiment } from "@/components/simulations/radiography/becquerel-experiment";
import { ElectricBellExperiment } from "@/components/simulations/circuit/electric-bell-experiment";
import { ThermalWireExperiment } from "@/components/simulations/circuit/thermal-wire-experiment";
import { VaCharacteristicExperiment } from "@/components/simulations/circuit/va-characteristic-experiment";
import { EmfMeasurementExperiment } from "@/components/simulations/circuit/emf-measurement-experiment";
import { WaterCalorimetryExperiment } from "@/components/simulations/circuit/water-calorimetry-experiment";
import { IceFusionExperiment } from "@/components/simulations/circuit/ice-fusion-experiment";
import { WaterVaporizationExperiment } from "@/components/simulations/circuit/water-vaporization-experiment";
import { BrownianDetailView } from "@/components/simulations/brownian/BrownianDetailView";
import { HeatingCurveDetailView } from "@/components/simulations/heating-curve/HeatingCurveDetailView";
import { PendulumResonanceDetailView } from "@/components/simulations/pendulum-resonance/PendulumResonanceDetailView";
import { HeatTransferDetailView } from "@/components/simulations/heat-transfer/HeatTransferDetailView";
import { IsothermalBoyleDetailView } from "@/components/simulations/isothermal-boyle/IsothermalBoyleDetailView";

// Konva chạm DOM → chỉ tải phía client.
const SceneKonva2D = dynamic(
  () =>
    import("@/components/simulations/renderers/mechanics/scene-konva-2d").then(
      (m) => m.SceneKonva2D,
    ),
  { ssr: false },
);
const SceneKonvaWave2D = dynamic(
  () =>
    import("@/components/simulations/renderers/wave/scene-konva-wave-2d").then(
      (m) => m.SceneKonvaWave2D,
    ),
  { ssr: false },
);
const SceneKonvaStringWave = dynamic(
  () =>
    import(
      "@/components/simulations/renderers/string-wave/scene-konva-string-wave"
    ).then((m) => m.SceneKonvaStringWave),
  { ssr: false },
);
// Canvas thuần (không Konva) — cần thao tác ImageData trực tiếp cho heatmap.
const SceneCanvasWaveField = dynamic(
  () =>
    import(
      "@/components/simulations/renderers/wave-field/scene-canvas-wave-field"
    ).then((m) => m.SceneCanvasWaveField),
  { ssr: false },
);
// Canvas thuần — điện phổ 2 điện tích điểm (đường sức truy vết RK4 thật).
const SceneCanvasPointChargeField = dynamic(
  () =>
    import(
      "@/components/simulations/renderers/point-charge-field/scene-canvas-point-charge-field"
    ).then((m) => m.SceneCanvasPointChargeField),
  { ssr: false },
);

/* ─────────────────────────── Dữ liệu catalog ─────────────────────────── */

const DOMAINS: Domain[] = [
  "Cơ học",
  "Dao động & Sóng",
  "Quang học",
  "Điện & Từ",
  "Nhiệt & Khí",
  "Hạt nhân",
];

// Lĩnh vực chưa có kernel → hiển thị thẻ disabled để giữ bản đồ chương trình đầy đủ.
type Placeholder = {
  id: string;
  title: string;
  domain: Domain;
  grade: 10 | 11 | 12;
  desc: string;
};
const PLACEHOLDERS: Placeholder[] = [
  {
    id: "ohm",
    title: "Định luật Ohm",
    domain: "Điện & Từ",
    grade: 11,
    desc: "Mạch điện cơ bản, khảo sát quan hệ U – I – R.",
  },
  {
    id: "induction",
    title: "Cảm ứng điện từ",
    domain: "Điện & Từ",
    grade: 12,
    desc: "Nam châm chuyển động qua cuộn dây sinh dòng cảm ứng.",
  },
  {
    id: "decay",
    title: "Phóng xạ & chu kỳ bán rã",
    domain: "Hạt nhân",
    grade: 12,
    desc: "Mô phỏng phân rã ngẫu nhiên theo thời gian.",
  },
];

/* ─────────────────────────── Thumbnail SVG ─────────────────────────── */

function Thumb({ id }: { id: string }) {
  const common = "h-full w-full";
  const frame = (children: ReactNode) => (
    <svg viewBox="0 0 200 120" className={common}>
      <rect width="200" height="120" fill="#0f172a" />
      {children}
    </svg>
  );

  switch (id) {
    case "dinh-luat-2-newton":
      return frame(
        <>
          <line
            x1="20"
            y1="90"
            x2="180"
            y2="90"
            stroke="#475569"
            strokeWidth="2"
          />
          <rect x="58" y="66" width="30" height="24" rx="3" fill="#f472b6" />
          <path
            d="M96 78 h44"
            fill="none"
            stroke="#34d399"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M132 70 l12 8 l-12 8"
            fill="none"
            stroke="#34d399"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>,
      );
    case "nem-xien":
      return frame(
        <>
          <path
            d="M20 100 Q90 5 180 95"
            fill="none"
            stroke="#a78bfa"
            strokeWidth="2.5"
            strokeDasharray="4 4"
          />
          <circle cx="180" cy="95" r="6" fill="#f472b6" />
          <line
            x1="20"
            y1="100"
            x2="180"
            y2="100"
            stroke="#475569"
            strokeWidth="2"
          />
        </>,
      );
    case "roi-tu-do":
      return frame(
        <>
          <line
            x1="100"
            y1="20"
            x2="100"
            y2="92"
            stroke="#a78bfa"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <circle cx="100" cy="30" r="6" fill="#f472b6" />
          <path
            d="M94 70 L100 84 L106 70"
            fill="none"
            stroke="#34d399"
            strokeWidth="2"
          />
          <line
            x1="40"
            y1="100"
            x2="160"
            y2="100"
            stroke="#475569"
            strokeWidth="2"
          />
        </>,
      );
    case "con-lac-don":
      return frame(
        <>
          <line
            x1="100"
            y1="12"
            x2="148"
            y2="86"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          <circle cx="148" cy="86" r="9" fill="#f472b6" />
          <line
            x1="60"
            y1="12"
            x2="140"
            y2="12"
            stroke="#475569"
            strokeWidth="3"
          />
          <path
            d="M100 24 A 64 64 0 0 1 148 86"
            fill="none"
            stroke="#a78bfa"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        </>,
      );
    case "con-lac-lo-xo":
      return frame(
        <>
          <line
            x1="60"
            y1="20"
            x2="140"
            y2="20"
            stroke="#475569"
            strokeWidth="3"
          />
          <path
            d="M100 20 l-8 6 l16 8 l-16 8 l16 8 l-16 8 l8 6"
            fill="none"
            stroke="#a78bfa"
            strokeWidth="2"
          />
          <rect x="86" y="78" width="28" height="22" rx="3" fill="#f472b6" />
        </>,
      );
    case "cong-huong-con-lac":
      return frame(
        <>
          <rect
            x="27"
            y="18"
            width="146"
            height="8"
            rx="2"
            fill="#e2e8f0"
            stroke="#67e8f9"
            strokeWidth="1.5"
          />
          <path
            d="M35 26 V40 M165 26 V40 M28 40 H42 M158 40 H172"
            stroke="#94a3b8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {[
            { pivot: 47, bob: 44, y: 82 },
            { pivot: 73, bob: 75, y: 77 },
            { pivot: 100, bob: 100, y: 87 },
            { pivot: 127, bob: 124, y: 76 },
            { pivot: 153, bob: 157, y: 82 },
          ].map(({ pivot, bob, y }, index) => (
            <g key={pivot}>
              <circle cx={pivot} cy="26" r="2" fill="#cbd5e1" />
              <line
                x1={pivot}
                y1="27"
                x2={bob}
                y2={y - 5}
                stroke="#a8b4c4"
                strokeWidth="1.5"
              />
              <circle
                cx={bob}
                cy={y}
                r="6"
                fill={
                  ["#fb7185", "#fb923c", "#facc15", "#4ade80", "#67e8f9"][index]
                }
                stroke="#fff7ed"
                strokeWidth="1.2"
              />
            </g>
          ))}
          <path
            d="M47 45 Q39 58 44 72 M127 45 Q135 57 124 70"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1.4"
            strokeDasharray="3 3"
            opacity=".7"
          />
        </>,
      );
    case "nguyen-ly-truyen-nhiet":
      return frame(
        <>
          <rect
            x="31"
            y="55"
            width="53"
            height="35"
            rx="7"
            fill="#f97316"
            stroke="#fed7aa"
            strokeWidth="1.5"
          />
          <rect
            x="116"
            y="55"
            width="53"
            height="35"
            rx="7"
            fill="#38bdf8"
            stroke="#cffafe"
            strokeWidth="1.5"
          />
          <path d="M53 50 V27 M147 50 V27" stroke="#cbd5e1" strokeWidth="2" />
          <circle cx="53" cy="23" r="5" fill="#fb923c" stroke="#fed7aa" />
          <circle cx="147" cy="23" r="5" fill="#67e8f9" stroke="#cffafe" />
          <path d="M88 72 H112" stroke="#fbbf24" strokeWidth="2.5" />
          <path d="M112 72 l-6 -4 v8 z" fill="#fbbf24" />
          {[0, 1, 2].map((index) => (
            <circle
              key={index}
              cx={91 + index * 7}
              cy={68 + (index % 2) * 8}
              r="1.7"
              fill="#fde68a"
            />
          ))}
        </>,
      );
    case "do-nhiet-dung-rieng-c-cua-nuoc":
      return frame(
        <>
          <path
            d="M48 43 V99 Q48 108 58 108 H136 Q146 108 146 99 V43"
            fill="rgba(148,163,184,.18)"
            stroke="#e2e8f0"
            strokeWidth="3"
          />
          <path
            d="M52 68 H142 V98 Q142 104 134 104 H60 Q52 104 52 98 Z"
            fill="#38bdf8"
            opacity=".78"
          />
          <path d="M43 42 H151" stroke="#cbd5e1" strokeWidth="5" />
          <rect
            x="66"
            y="35"
            width="11"
            height="58"
            rx="6"
            fill="#f8fafc"
            stroke="#cbd5e1"
          />
          <path d="M71.5 84 V55" stroke="#ef4444" strokeWidth="3" />
          <circle cx="71.5" cy="87" r="5" fill="#ef4444" />
          <path
            d="M108 29 V75"
            stroke="#fb923c"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M137 29 V75"
            stroke="#fb923c"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M108 75 V82 C108 72 114 72 114 82 C114 92 120 92 120 82 C120 72 126 72 126 82 C126 92 132 92 132 82 C132 72 137 72 137 82 V75"
            fill="none"
            stroke="#fb923c"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="108" cy="29" r="3" fill="#fb7185" />
          <circle cx="137" cy="29" r="3" fill="#60a5fa" />
          <path d="M20 29 H45" stroke="#38bdf8" strokeWidth="2.5" />
          <circle
            cx="55"
            cy="29"
            r="9"
            fill="#0f172a"
            stroke="#f8fafc"
            strokeWidth="2"
          />
          <text x="52" y="32" fontSize="8" fontWeight="700" fill="#f8fafc">
            A
          </text>
          <path
            d="M64 29 H108 M137 29 H180 V18 H160"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
          />
          <path
            d="M20 29 V18 H52"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
          />
          <circle cx="52" cy="18" r="3" fill="#e2e8f0" />
          <circle cx="76" cy="18" r="3" fill="#e2e8f0" />
          <path
            d="M52 18 L72 8"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path d="M76 18 H151" stroke="#38bdf8" strokeWidth="2.5" />
          <path d="M151 8 V28 M160 12 V24" stroke="#f8fafc" strokeWidth="3" />
          <text x="145" y="7" fontSize="7" fontWeight="700" fill="#fb7185">
            +
          </text>
          <text x="163" y="12" fontSize="7" fontWeight="700" fill="#93c5fd">
            −
          </text>
          <circle
            cx="174"
            cy="82"
            r="20"
            fill="#f8fafc"
            stroke="#cbd5e1"
            strokeWidth="3"
          />
          <rect x="167" y="58" width="14" height="6" rx="2" fill="#94a3b8" />
          <path
            d="M174 82 L186 76"
            stroke="#ef4444"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="174" cy="82" r="3" fill="#172235" />
        </>,
      );
    case "do-nhiet-nong-chay-rieng-lambda-cua-nuoc-da":
      return frame(
        <>
          <path
            d="M22 15 V106 M16 106 H50 M22 28 H91"
            stroke="#94a3b8"
            strokeWidth="3"
          />
          <path
            d="M62 30 H126 V72 Q126 82 116 82 H72 Q62 82 62 72 Z"
            fill="rgba(207,250,254,.16)"
            stroke="#dbeafe"
            strokeWidth="2"
          />
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <rect
              key={index}
              x={68 + (index % 3) * 17}
              y={39 + Math.floor(index / 3) * 17}
              width="14"
              height="12"
              rx="3"
              fill="#cffafe"
              stroke="#67e8f9"
            />
          ))}
          <path
            d="M74 22 V52 C75 63 81 65 84 53 C87 42 92 43 94 54 C96 66 102 65 104 53 C106 43 111 43 114 53 V22"
            fill="none"
            stroke="#fb923c"
            strokeWidth="2.5"
          />
          <circle cx="94" cy="90" r="3" fill="#67e8f9" />
          <path
            d="M72 95 H116 L111 110 H77 Z"
            fill="rgba(103,232,249,.35)"
            stroke="#cffafe"
            strokeWidth="1.5"
          />
          <path
            d="M68 110 H120 L124 117 H64 Z"
            fill="#94a3b8"
            stroke="#e2e8f0"
          />
          <rect
            x="145"
            y="58"
            width="43"
            height="40"
            rx="6"
            fill="#172b40"
            stroke="#cbd5e1"
            strokeWidth="2"
          />
          <rect
            x="152"
            y="65"
            width="29"
            height="11"
            rx="2"
            fill="#0f172a"
            stroke="#67e8f9"
          />
          <circle cx="156" cy="87" r="4" fill="#fb7185" />
          <circle cx="177" cy="87" r="4" fill="#60a5fa" />
          <path
            d="M74 22 V10 H156 V58 M114 22 V17 H177 V58"
            fill="none"
            stroke="#64748b"
            strokeWidth="2"
          />
        </>,
      );
    case "do-nhiet-hoa-hoi-rieng-l-cua-nuoc":
      return frame(
        <>
          <path
            d="M25 16 V108 M19 108 H50 M25 30 H91"
            stroke="#94a3b8"
            strokeWidth="3"
          />
          <path
            d="M64 33 H125 V78 Q125 86 116 86 H73 Q64 86 64 78 Z"
            fill="rgba(207,250,254,.14)"
            stroke="#dbeafe"
            strokeWidth="2"
          />
          <path
            d="M68 59 H121 V78 Q121 82 115 82 H74 Q68 82 68 78 Z"
            fill="#38bdf8"
            opacity=".72"
          />
          <path
            d="M76 26 V67 C76 77 82 80 85 69 C88 58 93 58 95 69 C98 81 104 80 106 68 C108 58 113 58 115 68 V26"
            fill="none"
            stroke="#fb923c"
            strokeWidth="2.5"
          />
          {[0, 1, 2, 3].map((i) => (
            <circle
              key={i}
              cx={76 + i * 13}
              cy={69 - (i % 2) * 8}
              r={2 + (i % 2)}
              fill="#cffafe"
            />
          ))}
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              cx={82 + i * 15}
              cy={44 - i * 8}
              r={5 + i}
              fill="#e2e8f0"
              opacity={0.35 - i * 0.06}
            />
          ))}
          <path
            d="M117 33 H143 Q151 33 151 42 V73"
            fill="none"
            stroke="#dce8ef"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle cx="151" cy="84" r="3" fill="#67e8f9" />
          <path
            d="M130 92 H173 L168 109 H135 Z"
            fill="rgba(103,232,249,.32)"
            stroke="#cffafe"
            strokeWidth="1.5"
          />
          <path
            d="M127 109 H176 L180 116 H123 Z"
            fill="#94a3b8"
            stroke="#e2e8f0"
          />
          <rect
            x="151"
            y="18"
            width="37"
            height="33"
            rx="5"
            fill="#172b40"
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />
          <rect
            x="158"
            y="25"
            width="23"
            height="9"
            rx="2"
            fill="#0f172a"
            stroke="#67e8f9"
          />
          <circle cx="160" cy="42" r="3" fill="#fb7185" />
          <circle cx="179" cy="42" r="3" fill="#60a5fa" />
        </>,
      );
    case "isothermal-boyle":
      return frame(
        <>
          <rect
            x="78"
            y="20"
            width="44"
            height="78"
            rx="7"
            fill="rgba(103,232,249,.12)"
            stroke="#cbd5e1"
            strokeWidth="1.8"
          />
          <rect
            x="84"
            y="52"
            width="32"
            height="42"
            rx="5"
            fill="rgba(103,232,249,.42)"
            stroke="#67e8f9"
            strokeWidth="1"
          />
          <rect
            x="70"
            y="45"
            width="60"
            height="10"
            rx="3"
            fill="#e2e8f0"
            stroke="#94a3b8"
            strokeWidth="1.2"
          />
          <line
            x1="100"
            y1="22"
            x2="100"
            y2="45"
            stroke="#cbd5e1"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="100" cy="18" r="5" fill="#e8724a" stroke="#fed7aa" />
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <circle
              key={index}
              cx={88 + (index % 3) * 10}
              cy={64 + Math.floor(index / 3) * 14}
              r="1.7"
              fill="#cffafe"
            />
          ))}
          <circle
            cx="154"
            cy="55"
            r="22"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="1.8"
          />
          <path
            d="M140 70 A20 20 0 0 1 168 70"
            fill="none"
            stroke="#67e8f9"
            strokeWidth="3"
            opacity=".45"
          />
          <line
            x1="154"
            y1="55"
            x2="166"
            y2="43"
            stroke="#e8724a"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="154" cy="55" r="2.5" fill="#e8724a" />
          <path d="M43 35 V82" stroke="#cbd5e1" strokeWidth="2" />
          <circle cx="43" cy="88" r="6" fill="#fb923c" stroke="#fed7aa" />
          <line
            x1="34"
            y1="76"
            x2="52"
            y2="76"
            stroke="#fb923c"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <text x="32" y="25" fill="#67e8f9" fontSize="10" fontWeight="700">
            T = const
          </text>
        </>,
      );
    case "dao-dong-tat-dan":
      return frame(
        <path
          d="M20 60 Q35 20 50 60 T80 60 T110 60 T140 60 T170 60"
          fill="none"
          stroke="#a78bfa"
          strokeWidth="2"
        />,
      );
    case "mat-nghieng-ma-sat":
      return frame(
        <>
          <path
            d="M30 100 L170 100 L170 50 Z"
            fill="#1e293b"
            stroke="#475569"
            strokeWidth="2"
          />
          <rect
            x="120"
            y="58"
            width="22"
            height="16"
            rx="2"
            fill="#f472b6"
            transform="rotate(-20 131 66)"
          />
        </>,
      );
    case "giao-thoa-song-nuoc":
      return frame(
        <>
          {[10, 20, 30, 42].map((r) => (
            <circle
              key={`a${r}`}
              cx="80"
              cy="60"
              r={r}
              fill="none"
              stroke="#475569"
              strokeWidth="1"
            />
          ))}
          {[10, 20, 30, 42].map((r) => (
            <circle
              key={`b${r}`}
              cx="120"
              cy="60"
              r={r}
              fill="none"
              stroke="#475569"
              strokeWidth="1"
            />
          ))}
          <path d="M100 8 V112" stroke="#f87171" strokeWidth="2" />
          <path
            d="M124 10 Q145 60 124 110"
            fill="none"
            stroke="#f87171"
            strokeWidth="1.5"
          />
          <path
            d="M76 10 Q55 60 76 110"
            fill="none"
            stroke="#f87171"
            strokeWidth="1.5"
          />
          <path
            d="M112 10 Q122 60 112 110"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <path
            d="M88 10 Q78 60 88 110"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <circle cx="80" cy="60" r="4" fill="#f472b6" />
          <circle cx="120" cy="60" r="4" fill="#f472b6" />
        </>,
      );
    case "giao-thoa-anh-sang-day-du":
      return frame(
        <>
          <defs>
            <linearGradient id="wf-thumb-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="20%" stopColor="#fbbf24" />
              <stop offset="35%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="65%" stopColor="#0f172a" />
              <stop offset="80%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          <rect
            x="110"
            y="8"
            width="30"
            height="104"
            fill="url(#wf-thumb-grad)"
            opacity="0.85"
          />
          <circle cx="30" cy="60" r="4" fill="#facc15" />
          <line
            x1="45"
            y1="30"
            x2="45"
            y2="90"
            stroke="#334155"
            strokeWidth="5"
          />
          <line
            x1="45"
            y1="55"
            x2="105"
            y2="48"
            stroke="#f9a8d4"
            strokeWidth="1"
            opacity="0.7"
          />
          <line
            x1="45"
            y1="65"
            x2="105"
            y2="72"
            stroke="#f9a8d4"
            strokeWidth="1"
            opacity="0.7"
          />
          <circle cx="105" cy="48" r="3.5" fill="#fef08a" />
          <circle cx="105" cy="72" r="3.5" fill="#fef08a" />
          <line
            x1="176"
            y1="10"
            x2="176"
            y2="110"
            stroke="#e2e8f0"
            strokeWidth="2"
          />
        </>,
      );
    case "song-tren-day":
      return frame(
        <>
          <path
            d="M10 60 Q35 20 60 60 T110 60 T160 60 T190 60"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
          />
          <circle cx="60" cy="60" r="6" fill="#facc15" />
          <path d="M20 30 h20" stroke="#e8724a" strokeWidth="2" />
          <path
            d="M40 30 l-6 -4 m6 4 l-6 4"
            fill="none"
            stroke="#e8724a"
            strokeWidth="2"
          />
        </>,
      );
    case "song-dung":
      return frame(
        <>
          <line
            x1="20"
            y1="60"
            x2="180"
            y2="60"
            stroke="#475569"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <path
            d="M20 60 Q55 15 90 60 T160 60 T180 60"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
          />
          <path
            d="M20 60 Q55 105 90 60 T160 60 T180 60"
            fill="none"
            stroke="#475569"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          {[20, 90, 160].map((x) => (
            <circle key={x} cx={x} cy={60} r="4" fill="#94a3b8" />
          ))}
          <rect
            x="14"
            y="40"
            width="8"
            height="40"
            fill="#1e293b"
            stroke="#475569"
            strokeWidth="1.5"
          />
          <rect
            x="158"
            y="40"
            width="8"
            height="40"
            fill="#1e293b"
            stroke="#475569"
            strokeWidth="1.5"
          />
        </>,
      );
    case "va-cham-dan-hoi":
    case "va-cham-mem":
      return frame(
        <>
          <line
            x1="20"
            y1="86"
            x2="180"
            y2="86"
            stroke="#475569"
            strokeWidth="2"
          />
          <circle cx="70" cy="74" r="12" fill="#f472b6" />
          <circle cx="120" cy="74" r="14" fill="#60a5fa" />
          <path
            d="M86 64 l16 0 m-4 -4 l4 4 l-4 4"
            fill="none"
            stroke="#34d399"
            strokeWidth="2"
          />
        </>,
      );
    case "nhiem-dien-day":
      return frame(
        <>
          <line
            x1="70"
            y1="15"
            x2="130"
            y2="15"
            stroke="#475569"
            strokeWidth="3"
          />
          <circle cx="100" cy="15" r="3" fill="#94a3b8" />
          <line
            x1="100"
            y1="15"
            x2="66"
            y2="86"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          <line
            x1="100"
            y1="15"
            x2="134"
            y2="86"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          <circle cx="66" cy="86" r="9" fill="#f472b6" />
          <circle cx="134" cy="86" r="9" fill="#f472b6" />
          <text x="61" y="90" fontSize="11" fontWeight="bold" fill="#0f172a">
            +
          </text>
          <text x="129" y="90" fontSize="11" fontWeight="bold" fill="#0f172a">
            +
          </text>
          <path
            d="M84 70 L96 70"
            stroke="#34d399"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M92 66 L96 70 L92 74"
            fill="none"
            stroke="#34d399"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M116 70 L104 70"
            stroke="#34d399"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M108 66 L104 70 L108 74"
            fill="none"
            stroke="#34d399"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>,
      );
    case "nhiem-dien-hut":
      return frame(
        <>
          <line
            x1="30"
            y1="15"
            x2="70"
            y2="15"
            stroke="#475569"
            strokeWidth="3"
          />
          <line
            x1="130"
            y1="15"
            x2="170"
            y2="15"
            stroke="#475569"
            strokeWidth="3"
          />
          <line
            x1="50"
            y1="15"
            x2="50"
            y2="95"
            stroke="#475569"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <line
            x1="150"
            y1="15"
            x2="150"
            y2="95"
            stroke="#475569"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <line
            x1="50"
            y1="15"
            x2="65"
            y2="90"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          <line
            x1="150"
            y1="15"
            x2="135"
            y2="90"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          <circle cx="65" cy="90" r="9" fill="#f472b6" />
          <circle cx="135" cy="90" r="9" fill="#60a5fa" />
          <text x="61" y="110" fontSize="11" fontWeight="bold" fill="#e2e8f0">
            1
          </text>
          <text x="131" y="110" fontSize="11" fontWeight="bold" fill="#e2e8f0">
            2
          </text>
        </>,
      );
    case "dien-pho-hai-dien-tich":
      return frame(
        <>
          {[
            "M60,60 Q100,60 140,60",
            "M58,53 Q100,35 142,53",
            "M58,67 Q100,85 142,67",
            "M56,46 Q100,18 144,46",
            "M56,74 Q100,102 144,74",
            "M62,58 Q100,52 138,58",
            "M62,62 Q100,68 138,62",
          ].map((d) => (
            <path
              key={d}
              d={d}
              fill="none"
              stroke="#e8724a"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          ))}
          <circle
            cx="50"
            cy="60"
            r="10"
            fill="#f87171"
            stroke="#b91c1c"
            strokeWidth="1.5"
          />
          <circle
            cx="150"
            cy="60"
            r="10"
            fill="#60a5fa"
            stroke="#1d4ed8"
            strokeWidth="1.5"
          />
          <text x="46" y="64" fontSize="12" fontWeight="bold" fill="#ffffff">
            +
          </text>
          <text x="146" y="64" fontSize="12" fontWeight="bold" fill="#ffffff">
            −
          </text>
        </>,
      );
    case "dien-truong-2-ban-song-song":
      return frame(
        <>
          <line
            x1="55"
            y1="15"
            x2="55"
            y2="100"
            stroke="#475569"
            strokeWidth="3"
          />
          <line
            x1="145"
            y1="15"
            x2="145"
            y2="100"
            stroke="#475569"
            strokeWidth="3"
          />
          <text x="47" y="14" fontSize="12" fontWeight="bold" fill="#e2e8f0">
            +
          </text>
          <text x="140" y="14" fontSize="12" fontWeight="bold" fill="#e2e8f0">
            −
          </text>
          {[40, 60, 80].map((y) => (
            <g key={y}>
              <path
                d={`M63 ${y} h70`}
                fill="none"
                stroke="#34d399"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d={`M129 ${y - 4} L137 ${y} L129 ${y + 4}`}
                fill="none"
                stroke="#34d399"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          ))}
          <circle cx="80" cy="60" r="6" fill="#f472b6" />
          <path
            d="M87 60 h14"
            stroke="#60a5fa"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M97 56 L101 60 L97 64"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>,
      );
    case "nut-bac-bat-noi-nang-thanh-cong":
      return frame(
        <>
          <line
            x1="48"
            y1="14"
            x2="48"
            y2="108"
            stroke="#64748b"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <line
            x1="28"
            y1="108"
            x2="142"
            y2="108"
            stroke="#64748b"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M72 36v45q0 12 12 12h32q12 0 12-12V36"
            fill="rgba(110,231,211,.14)"
            stroke="#bae6fd"
            strokeWidth="3"
          />
          <rect
            x="76"
            y="29"
            width="48"
            height="14"
            rx="4"
            fill="#c58b55"
            stroke="#8a5a32"
            strokeWidth="1.5"
          />
          <rect x="84" y="41" width="32" height="8" rx="2" fill="#b97842" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
            <circle
              key={index}
              cx={84 + (index % 4) * 10}
              cy={58 + Math.floor(index / 4) * 18}
              r="2.5"
              fill={index % 2 ? "#fde68a" : "#6ee7d3"}
            />
          ))}
          <rect x="82" y="99" width="36" height="12" rx="5" fill="#64748b" />
          <path d="M100 98c-12-12-5-24 0-31 7 9 13 19 0 31Z" fill="#f59e0b" />
          <path d="M100 98c-5-7-2-13 0-17 4 5 6 11 0 17Z" fill="#38bdf8" />
          <path
            d="M132 42q18-22 34-8"
            fill="none"
            stroke="#e8724a"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          <rect
            x="158"
            y="22"
            width="30"
            height="10"
            rx="3"
            fill="#c58b55"
            stroke="#8a5a32"
            strokeWidth="1"
            transform="rotate(24 173 27)"
          />
        </>,
      );
    case "becquerel-uranium-lam-den-kinh-anh":
      return frame(
        <>
          <ellipse
            cx="100"
            cy="102"
            rx="79"
            ry="6"
            fill="#020617"
            opacity=".42"
          />
          <path
            d="M25 96h150"
            stroke="#64748b"
            strokeWidth="7"
            strokeLinecap="round"
          />

          <rect
            x="43"
            y="54"
            width="114"
            height="36"
            rx="7"
            fill="#080b12"
            stroke="#64748b"
            strokeWidth="2.5"
          />
          <rect
            x="50"
            y="59"
            width="100"
            height="25"
            rx="4"
            fill="#d9e7eb"
            stroke="#f8fafc"
            strokeWidth="1"
          />
          <rect x="54" y="62" width="92" height="19" rx="2" fill="#93b7c3" />
          <rect
            x="58"
            y="65"
            width="84"
            height="13"
            rx="2"
            fill="#263744"
            opacity=".82"
          />
          <path
            d="M100 62v19M74 71.5h52"
            stroke="#cbd5e1"
            strokeWidth="8"
            strokeLinecap="square"
          />
          <path
            d="M100 62v19M74 71.5h52"
            stroke="#172333"
            strokeWidth="5.5"
            strokeLinecap="square"
          />

          <path
            d="M62 50L73 39M82 50l5-13M100 50V35M118 50l-5-13M138 50l-11-11"
            stroke="#fde68a"
            strokeWidth="1.4"
            strokeDasharray="3 3"
            opacity=".78"
          />
          {[70, 87, 100, 113, 130].map((x, index) => (
            <circle
              key={x}
              cx={x}
              cy={45 + (index % 2) * 3}
              r="1.8"
              fill="#fef08a"
              opacity=".9"
            />
          ))}

          <rect
            x="69"
            y="20"
            width="62"
            height="21"
            rx="7"
            fill="#8f7a20"
            stroke="#fde68a"
            strokeWidth="2"
          />
          <path d="M75 24h50v5H75z" fill="#d4b63f" opacity=".72" />
          <text
            x="100"
            y="35"
            textAnchor="middle"
            fontSize="9.5"
            fontWeight="700"
            fill="#fffbd1"
          >
            URANIUM
          </text>

          <circle
            cx="166"
            cy="29"
            r="16"
            fill="#172235"
            stroke="#94a3b8"
            strokeWidth="2.4"
          />
          <circle
            cx="166"
            cy="29"
            r="11.5"
            fill="none"
            stroke="#334155"
            strokeWidth="1"
          />
          <path
            d="M166 29v-8M166 29l6 4"
            stroke="#f8fafc"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="166" cy="29" r="2" fill="#f8fafc" />
        </>,
      );
    case "tac-dung-tu-cua-dong-dien-chuong-dien":
      return frame(
        <>
          <path
            d="M24 96h152"
            stroke="#64748b"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <rect
            x="28"
            y="27"
            width="34"
            height="42"
            rx="5"
            fill="#334155"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          <path d="M38 40h14M42 48h6" stroke="#f8fafc" strokeWidth="2" />
          <path
            d="M45 27V18h55m28 0h44v35"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
          />
          <circle cx="101" cy="18" r="3" fill="#e2e8f0" />
          <circle cx="128" cy="18" r="3" fill="#e2e8f0" />
          <path
            d="M101 18l23-10"
            stroke="#f59e0b"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M64 56 V89 Q64 96 71 96 H108 Q115 96 115 89 V56"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {[60, 67, 74, 81].map((y) => (
            <g key={y}>
              <path
                d={`M57 ${y} H76`}
                stroke="#fb923c"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d={`M103 ${y} H122`}
                stroke="#fb923c"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>
          ))}
          <text x="71" y="108" fontSize="7" fontWeight="700" fill="#cbd5e1">
            Lõi sắt
          </text>
          <path
            d="M128 45 V82"
            stroke="#cbd5e1"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M128 55 L153 62"
            stroke="#cbd5e1"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="128" cy="55" r="4" fill="#94a3b8" />
          <circle cx="157" cy="63" r="5" fill="#d1a45d" />
          <path
            d="M124 43 H139"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="141" cy="43" r="3" fill="#fbbf24" />
          <path
            d="M174 38 Q194 62 174 88 Q160 78 160 63 Q160 48 174 38 Z"
            fill="#d9a92f"
            stroke="#fde68a"
            strokeWidth="2"
          />
          <path
            d="M62 82 V96 M117 82 V96 M128 82 V96"
            stroke="#38bdf8"
            strokeWidth="2"
          />
        </>,
      );
    case "tac-dung-nhiet-dong-dien-day-sat-dot-giay":
      return frame(
        <>
          <path
            d="M22 94 V62 H42 M158 62 H178 V94 M22 94 H76 M122 94 H178"
            fill="none"
            stroke="#64748b"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M42 62 H158"
            stroke="#fb923c"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <text x="36" y="57" fontSize="8" fontWeight="700" fill="#f8fafc">
            A
          </text>
          <text x="161" y="57" fontSize="8" fontWeight="700" fill="#f8fafc">
            B
          </text>
          <rect
            x="50"
            y="31"
            width="27"
            height="58"
            rx="3"
            fill="#eef5e8"
            stroke="#cbd5b1"
            strokeWidth="1.2"
          />
          <path d="M54 62 H73" stroke="#fb923c" strokeWidth="2.5" />
          <rect
            x="87"
            y="31"
            width="27"
            height="58"
            rx="3"
            fill="#b97842"
            stroke="#f59e0b"
            strokeWidth="1.2"
          />
          <ellipse cx="100.5" cy="62" rx="8" ry="11" fill="#3f2414" />
          <path d="M91 62 H110" stroke="#fb923c" strokeWidth="2.5" />
          <path
            d="M125 34 L151 31 L149 87 L123 89 Z"
            fill="#3b2114"
            stroke="#7c2d12"
            strokeWidth="1.2"
          />
          <path d="M126 62 H149" stroke="#fde68a" strokeWidth="2.5" />
          <path
            d="M130 49 C122 36 129 22 138 14 C151 27 153 41 145 51 Z"
            fill="#f97316"
          />
          <path
            d="M134 47 C130 38 135 30 139 25 C146 34 146 42 142 48 Z"
            fill="#fef3c7"
          />
          <path
            d="M137 14 C130 7 139 3 143 8 M147 17 C157 10 159 19 154 23"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
            opacity=".7"
          />
          <circle cx="76" cy="94" r="4" fill="#e2e8f0" />
          <circle cx="122" cy="94" r="4" fill="#e2e8f0" />
          <path
            d="M76 94 L112 75"
            stroke="#f59e0b"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <text x="91" y="108" fontSize="8" fontWeight="700" fill="#fbbf24">
            K
          </text>
          <path
            d="M151 82 V106 M163 88 V100"
            stroke="#f8fafc"
            strokeWidth="3"
          />
          <text x="145" y="78" fontSize="8" fontWeight="700" fill="#fda4af">
            E
          </text>
        </>,
      );
    case "brownian-pollen":
      return frame(
        <>
          <path
            d="M24 78 L38 64 L48 74 L61 51 L75 66 L88 46 L105 57 L119 38 L135 54 L151 34 L174 45"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2.2"
            strokeLinejoin="miter"
          />
          {[24, 38, 48, 61, 75, 88, 105, 119, 135, 151, 174].map((x, i) => (
            <circle
              key={`${x}-${i}`}
              cx={x}
              cy={[78, 64, 74, 51, 66, 46, 57, 38, 54, 34, 45][i]}
              r="1.5"
              fill="#fdba74"
            />
          ))}
          {[
            "34,22",
            "54,88",
            "88,20",
            "132,78",
            "168,24",
            "180,84",
            "20,42",
            "105,98",
          ].map((point) => {
            const [x, y] = point.split(",");
            return (
              <circle
                key={point}
                cx={x}
                cy={y}
                r="2"
                fill="#67e8f9"
                opacity="0.85"
              />
            );
          })}
          <circle
            cx="104"
            cy="57"
            r="3.8"
            fill="#f59e0b"
            stroke="#fed7aa"
            strokeWidth="1"
          />
          <circle cx="103" cy="56" r="1" fill="#fff7ed" opacity="0.7" />
        </>,
      );
    case "dun-nong-nhiet-do-thoi-gian":
      return frame(
        <>
          <line
            x1="30"
            y1="96"
            x2="180"
            y2="96"
            stroke="#cbd5e1"
            strokeWidth="1.2"
          />
          <line
            x1="30"
            y1="96"
            x2="30"
            y2="18"
            stroke="#cbd5e1"
            strokeWidth="1.2"
          />
          <path
            d="M30 84 L82 68 L82 56 L116 56 L162 30"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M82 56 H116"
            fill="none"
            stroke="#fb7185"
            strokeWidth="2.5"
          />
          <rect
            x="45"
            y="31"
            width="34"
            height="9"
            rx="3"
            fill="#b91c1c"
            stroke="#fed7aa"
            strokeWidth="1"
          />
          <path
            d="M48 48 Q62 34 76 48 Q70 64 62 68 Q54 63 48 48"
            fill="#fb923c"
          />
          <path
            d="M50 93 H75"
            stroke="#94a3b8"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="162" cy="30" r="3" fill="#fff7ed" />
        </>,
      );
    case "dac-trung-va-dien-tro-bong-den-day-toc":
      return frame(
        <>
          <path
            d="M20 28h24m30 0h35M20 72h24m30 0h35M20 28v44M109 28v44"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.2"
          />
          <circle
            cx="56"
            cy="28"
            r="12"
            fill="#111827"
            stroke="#f8fafc"
            strokeWidth="2"
          />
          <text x="51" y="32" fontSize="9" fontWeight="700" fill="#f8fafc">
            A₁
          </text>
          <rect
            x="75"
            y="20"
            width="31"
            height="16"
            rx="2"
            fill="#cbd5e1"
            stroke="#f8fafc"
          />
          <circle
            cx="56"
            cy="72"
            r="12"
            fill="#111827"
            stroke="#f8fafc"
            strokeWidth="2"
          />
          <text x="51" y="76" fontSize="9" fontWeight="700" fill="#f8fafc">
            A₂
          </text>
          <circle
            cx="90"
            cy="72"
            r="16"
            fill="none"
            stroke="#f8fafc"
            strokeWidth="2"
          />
          <path
            d="M76 72h4c4-11 8 11 12 0s8 11 12 0h2"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.4"
          />
          <path
            d="M124 91V17h56"
            fill="none"
            stroke="#64748b"
            strokeWidth="1.4"
          />
          <path
            d="M129 82q17-40 45-51"
            fill="none"
            stroke="#fb923c"
            strokeWidth="2.4"
          />
          <path
            d="M130 82L174 25"
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="1.6"
            opacity=".8"
          />
          <text x="126" y="16" fontSize="8" fill="#94a3b8">
            I
          </text>
          <text x="178" y="97" fontSize="8" fill="#94a3b8">
            U
          </text>
        </>,
      );
    case "do-suat-dien-dong-e-cua-pin":
      return frame(
        <>
          <path
            d="M35 24h48m27 0h55v62h-38m-34 0H35V62m0-22V24"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.2"
          />
          <circle
            cx="96"
            cy="24"
            r="13"
            fill="#111827"
            stroke="#f8fafc"
            strokeWidth="2"
          />
          <text x="92" y="28" fontSize="10" fontWeight="700" fill="#f8fafc">
            A
          </text>
          <circle
            cx="96"
            cy="57"
            r="14"
            fill="#111827"
            stroke="#f8fafc"
            strokeWidth="2"
          />
          <text x="92" y="61" fontSize="10" fontWeight="700" fill="#f8fafc">
            V
          </text>
          <path d="M96 38v5m0 28v15" stroke="#38bdf8" strokeWidth="2" />
          <rect
            x="145"
            y="40"
            width="22"
            height="35"
            fill="#dbe4ec"
            stroke="#f8fafc"
          />
          <rect
            x="93"
            y="80"
            width="34"
            height="12"
            fill="#dbe4ec"
            stroke="#f8fafc"
          />
          <path d="M25 45h20m-15 9h10" stroke="#f8fafc" strokeWidth="2.5" />
          <circle cx="35" cy="40" r="2.5" fill="#e2e8f0" />
          <circle cx="35" cy="62" r="2.5" fill="#e2e8f0" />
          <path d="M35 40l-10 16" stroke="#f59e0b" strokeWidth="2.5" />
          <text x="18" y="76" fontSize="8" fill="#fda4af">
            E, r
          </text>
        </>,
      );
    default: {
      const icons: Record<string, string> = {
        ohm: "M30 60h30l10-25 20 50 10-25h70",
        induction: "M40 40v40M60 40v40M80 40v40M100 40v40",
        boyle: "M60 30h80v60H60z M100 50h0",
        decay: "M40 90 Q70 30 100 60 T160 40",
      };
      return frame(
        <path
          d={icons[id] ?? "M40 60h120"}
          fill="none"
          stroke="#a78bfa"
          strokeWidth="3"
          strokeLinecap="round"
        />,
      );
    }
  }
}

/* ─────────────────────────── Badge (pill) ─────────────────────────── */

function Badge({
  children,
  tone = "neutral",
  icon,
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "success";
  icon?: ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-[#f5f1ec] text-[#6b6b6b]",
    primary: "bg-[#fff4ed] text-[#c96545]",
    success: "bg-emerald-50 text-emerald-600",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${tones[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

/* ─────────────────────────── Chip lọc theo lĩnh vực ─────────────────────────── */

function DomainChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors duration-150 ease-out ${
        active
          ? "border-[#e8724a] bg-[#e8724a] text-white"
          : "border-[#e8e2d9] bg-white text-[#6b6b6b] hover:border-[#d97757] hover:text-[#c96545]"
      }`}
    >
      {label}
      <span
        className={
          active ? "text-[11px] text-white/80" : "text-[11px] text-[#b8aea5]"
        }
      >
        {count}
      </span>
    </button>
  );
}

/* ─────────────────────────── Trang chính ─────────────────────────── */

export default function MoPhongHubPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Preset | null>(null);
  const [domainFilter, setDomainFilter] = useState<Set<Domain>>(
    new Set(DOMAINS),
  );
  const [query, setQuery] = useState("");

  const toggleDomain = (d: Domain) => {
    setDomainFilter((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  const q = query.toLowerCase();
  const matches = (domain: Domain, title: string) =>
    domainFilter.has(domain) && title.toLowerCase().includes(q);

  const presets = PRESETS.filter((p) => matches(p.domain, p.title));
  const placeholders = PLACEHOLDERS.filter((p) => matches(p.domain, p.title));
  const total = presets.length + placeholders.length;

  const countInDomain = (d: Domain) =>
    PRESETS.filter((s) => s.domain === d).length +
    PLACEHOLDERS.filter((s) => s.domain === d).length;

  const filtered = domainFilter.size < DOMAINS.length;

  const backToLibrary = () => {
    setSelected(null);
    router.replace("/mo-phong-vat-ly");
  };

  if (selected?.kind === "brownian")
    return <BrownianDetailView preset={selected} onBack={backToLibrary} />;
  if (selected?.kind === "heating-curve")
    return <HeatingCurveDetailView preset={selected} onBack={backToLibrary} />;
  if (selected?.kind === "pendulum-resonance")
    return (
      <PendulumResonanceDetailView preset={selected} onBack={backToLibrary} />
    );
  if (selected?.kind === "heat-transfer")
    return <HeatTransferDetailView preset={selected} onBack={backToLibrary} />;
  if (selected?.kind === "isothermal-boyle")
    return (
      <IsothermalBoyleDetailView preset={selected} onBack={backToLibrary} />
    );
  if (selected) return <DetailView preset={selected} onBack={backToLibrary} />;

  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#f5f1ec]">
      <Sidebar activeHref="/mo-phong-vat-ly" />

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header + thanh lọc nằm ngang */}
        <header className="shrink-0 border-b border-[#e8e2d9] bg-white px-8 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="font-libertine text-2xl font-bold text-[#171717]">
                  Thư viện mô phỏng Vật lý
                </h1>
                <p className="mt-1 text-sm text-[#6b6b6b]">
                  {total} mô phỏng • chọn để xem & tuỳ chỉnh
                </p>
              </div>
            </div>
          </div>

          {/* Thanh lọc theo lĩnh vực — nằm ngang thay cho sidebar dọc cũ */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {DOMAINS.map((d) => (
              <DomainChip
                key={d}
                label={d}
                count={countInDomain(d)}
                active={domainFilter.has(d)}
                onClick={() => toggleDomain(d)}
              />
            ))}
            {filtered && (
              <button
                type="button"
                onClick={() => setDomainFilter(new Set(DOMAINS))}
                className="flex items-center gap-1 rounded-full px-2.5 py-2 text-[12px] font-medium text-[#8a8178] transition-colors duration-150 ease-out hover:text-[#c96545]"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
                Bỏ lọc
              </button>
            )}

            <div className="ml-auto flex h-11 w-full max-w-xs items-center gap-2 rounded-[12px] border border-[#e8e2d9] bg-white px-3.5 shadow-[0_1px_2px_rgba(43,41,38,0.04)] transition-colors duration-150 ease-out focus-within:border-[#d97757]">
              <Search
                className="h-5 w-5 shrink-0 text-[#8a8178]"
                strokeWidth={2}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm mô phỏng…"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-[#171717] outline-none placeholder:text-[#b8aea5]"
              />
            </div>
          </div>
        </header>

        {/* Library grid */}
        <div className="min-h-0 flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {presets.map((sim) => (
              <button
                key={sim.id}
                onClick={() => setSelected(sim)}
                className="group overflow-hidden rounded-[16px] border border-[#e8e2d9] bg-white text-left shadow-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-[#d97757] hover:shadow-md"
              >
                <div className="aspect-[5/3] w-full overflow-hidden bg-[#0f172a] p-2.5">
                  <div className="h-full w-full overflow-hidden rounded-[10px]">
                    <Thumb id={sim.id} />
                  </div>
                </div>
                <div className="space-y-1.5 p-5">
                  <div className="flex items-center gap-2">
                    <Badge tone="primary">Lớp {sim.grade}</Badge>
                    <Badge tone="neutral">{sim.domain}</Badge>
                  </div>
                  <h3 className="text-[15px] font-semibold text-[#171717] group-hover:text-[#c96545]">
                    {sim.title}
                  </h3>
                  <p className="line-clamp-2 text-[12px] leading-relaxed text-[#6b6b6b]">
                    {sim.desc}
                  </p>
                </div>
              </button>
            ))}

            {placeholders.map((sim) => (
              <div
                key={sim.id}
                className="cursor-not-allowed overflow-hidden rounded-[16px] border border-[#e8e2d9] bg-white opacity-60 shadow-sm"
                title="Lĩnh vực này chưa có kernel"
              >
                <div className="aspect-[5/3] w-full overflow-hidden bg-[#0f172a] p-2.5">
                  <div className="h-full w-full overflow-hidden rounded-[10px]">
                    <Thumb id={sim.id} />
                  </div>
                </div>
                <div className="space-y-1.5 p-5">
                  <div className="flex items-center gap-2">
                    <Badge tone="neutral">Lớp {sim.grade}</Badge>
                    <Badge tone="neutral">{sim.domain}</Badge>
                    <span className="ml-auto">
                      <Badge tone="neutral">Đang phát triển</Badge>
                    </span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-[#171717]">
                    {sim.title}
                  </h3>
                  <p className="line-clamp-2 text-[12px] leading-relaxed text-[#6b6b6b]">
                    {sim.desc}
                  </p>
                </div>
              </div>
            ))}

            {total === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-[#e8e2d9] bg-white/60 py-16 text-center">
                <p className="text-sm font-medium text-[#171717]">
                  Không tìm thấy mô phỏng phù hợp
                </p>
                <p className="text-xs text-[#8a8178]">
                  Thử đổi từ khoá tìm kiếm hoặc bỏ bớt bộ lọc lĩnh vực.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

/* ─────────────────────────── Chú thích ký hiệu (sóng) ─────────────────────────── */

type LegendItem = { swatch: ReactNode; label: string };

const dashSwatch = (color: string) => (
  <svg width="20" height="8" viewBox="0 0 20 8">
    <line
      x1="0"
      y1="4"
      x2="20"
      y2="4"
      stroke={color}
      strokeWidth="2"
      strokeDasharray="4 3"
    />
  </svg>
);
const lineSwatch = (color: string) => (
  <svg width="20" height="8" viewBox="0 0 20 8">
    <line x1="0" y1="4" x2="20" y2="4" stroke={color} strokeWidth="2" />
  </svg>
);
const dotSwatch = (color: string) => (
  <span
    className="inline-block h-2.5 w-2.5 rounded-full"
    style={{ background: color }}
  />
);

function LegendBox({ items }: { items: LegendItem[] }) {
  return (
    <div className="space-y-2 rounded-[10px] border border-[#e8e2d9] bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
        Chú thích ký hiệu
      </p>
      <div className="space-y-1.5">
        {items.map((it) => (
          <div
            key={it.label}
            className="flex items-center gap-2 text-[11px] leading-snug text-[#4f4943]"
          >
            <span className="flex w-5 shrink-0 items-center justify-center">
              {it.swatch}
            </span>
            {it.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function WaveLegend() {
  const items: LegendItem[] = [
    { swatch: lineSwatch("#f87171"), label: "CĐ — Cực đại (2 sóng cùng pha)" },
    {
      swatch: dashSwatch("#60a5fa"),
      label: "CT — Cực tiểu (2 sóng ngược pha)",
    },
    { swatch: dotSwatch("#f472b6"), label: "S1, S2 — nguồn sóng kết hợp" },
    {
      swatch: dotSwatch("#f87171"),
      label: "Điểm giao cùng pha (đỉnh gặp đỉnh / đáy gặp đáy)",
    },
    {
      swatch: dotSwatch("#60a5fa"),
      label: "Điểm giao ngược pha (đỉnh gặp đáy)",
    },
  ];
  return <LegendBox items={items} />;
}

function ElectricFieldLegend() {
  const items: LegendItem[] = [
    {
      swatch: lineSwatch("#e8724a"),
      label: "Đường sức điện trường (chiều từ + sang −, đổi chiều nếu đảo cực)",
    },
    { swatch: dotSwatch("#f87171"), label: "+ — bản tích điện dương" },
    { swatch: dotSwatch("#cbd5e1"), label: "− — bản tích điện âm" },
    {
      swatch: dotSwatch("#60a5fa"),
      label: "Hạt mang điện q (kéo được để đặt lại vị trí)",
    },
    { swatch: lineSwatch("#34d399"), label: "v₀ — vector vận tốc ban đầu" },
  ];
  return <LegendBox items={items} />;
}

function PointChargeFieldLegend({
  mode,
}: {
  mode: "field-lines" | "spectrum";
}) {
  if (mode === "spectrum") {
    return (
      <>
        <LegendBox
          items={[
            {
              swatch: lineSwatch("#fde68a"),
              label: "Hạt điện phổ — định hướng theo điện trường tại đó",
            },
            { swatch: dotSwatch("#f87171"), label: "+ — điện tích dương" },
            { swatch: dotSwatch("#60a5fa"), label: "− — điện tích âm" },
          ]}
        />
        <p className="mt-2 text-[11px] leading-relaxed text-[#8a8178]">
          Các hạt chỉ minh hoạ sự định hướng của vật liệu điện môi theo điện
          trường, không phải quỹ đạo chuyển động của điện tích.
        </p>
      </>
    );
  }
  return (
    <LegendBox
      items={[
        {
          swatch: lineSwatch("#e8724a"),
          label: "Đường sức điện — mũi tên luôn hướng từ + sang −",
        },
        { swatch: dotSwatch("#f87171"), label: "+ — điện tích dương" },
        { swatch: dotSwatch("#60a5fa"), label: "− — điện tích âm" },
      ]}
    />
  );
}

function StringWaveLegend({ mode }: { mode: "traveling" | "standing" }) {
  if (mode === "standing") {
    return (
      <LegendBox
        items={[
          {
            swatch: dotSwatch("#94a3b8"),
            label: "N — Nút (biên độ luôn bằng 0)",
          },
          {
            swatch: dotSwatch("#f59e0b"),
            label: "B — Bụng (biên độ dao động cực đại ±2A)",
          },
          {
            swatch: dashSwatch("#475569"),
            label: "Đường bao — 2 vị trí biên của dây theo thời gian",
          },
        ]}
      />
    );
  }
  return (
    <LegendBox
      items={[
        {
          swatch: dotSwatch("#facc15"),
          label: "Chấm vàng — 1 phần tử dây (dao động vuông góc phương truyền)",
        },
        { swatch: lineSwatch("#facc15"), label: "A — vector biên độ" },
        { swatch: lineSwatch("#34d399"), label: "λ — 1 bước sóng" },
        {
          swatch: lineSwatch("#e8724a"),
          label: "Mũi tên cam — chiều truyền sóng",
        },
      ]}
    />
  );
}

/* ─────────────────────────── Màn chi tiết + tuỳ chỉnh ─────────────────────────── */

type AiState = "idle" | "thinking" | "review";

function DetailView(props: { preset: Preset; onBack: () => void }) {
  if (props.preset.id === "nut-bac-bat-noi-nang-thanh-cong") {
    return (
      <div className="flex h-screen">
        <Sidebar activeHref="/mo-phong-vat-ly" />
        <CorkExperiment onBack={props.onBack} />
      </div>
    );
  }
  if (props.preset.id === "becquerel-uranium-lam-den-kinh-anh") {
    return (
      <div className="flex h-screen">
        <Sidebar activeHref="/mo-phong-vat-ly" />
        <BecquerelExperiment onBack={props.onBack} />
      </div>
    );
  }
  if (props.preset.id === "tac-dung-tu-cua-dong-dien-chuong-dien") {
    return (
      <div className="flex h-screen">
        <Sidebar activeHref="/mo-phong-vat-ly" />
        <ElectricBellExperiment onBack={props.onBack} />
      </div>
    );
  }
  if (props.preset.id === "tac-dung-nhiet-dong-dien-day-sat-dot-giay") {
    return (
      <div className="flex h-screen">
        <Sidebar activeHref="/mo-phong-vat-ly" />
        <ThermalWireExperiment onBack={props.onBack} />
      </div>
    );
  }
  if (props.preset.id === "dac-trung-va-dien-tro-bong-den-day-toc") {
    return (
      <div className="flex h-screen">
        <Sidebar activeHref="/mo-phong-vat-ly" />
        <VaCharacteristicExperiment onBack={props.onBack} />
      </div>
    );
  }
  if (props.preset.id === "do-suat-dien-dong-e-cua-pin") {
    return (
      <div className="flex h-screen">
        <Sidebar activeHref="/mo-phong-vat-ly" />
        <EmfMeasurementExperiment onBack={props.onBack} />
      </div>
    );
  }
  if (props.preset.id === "do-nhiet-dung-rieng-c-cua-nuoc") {
    return (
      <div className="flex h-screen">
        <Sidebar activeHref="/mo-phong-vat-ly" />
        <WaterCalorimetryExperiment onBack={props.onBack} />
      </div>
    );
  }
  if (props.preset.id === "do-nhiet-nong-chay-rieng-lambda-cua-nuoc-da") {
    return (
      <div className="flex h-screen">
        <Sidebar activeHref="/mo-phong-vat-ly" />
        <IceFusionExperiment onBack={props.onBack} />
      </div>
    );
  }
  if (props.preset.id === "do-nhiet-hoa-hoi-rieng-l-cua-nuoc") {
    return (
      <div className="flex h-screen">
        <Sidebar activeHref="/mo-phong-vat-ly" />
        <WaterVaporizationExperiment onBack={props.onBack} />
      </div>
    );
  }
  return <GenericDetailView {...props} />;
}

function GenericDetailView({
  preset,
  onBack,
}: {
  preset: Preset;
  onBack: () => void;
}) {
  const baseParams = Object.fromEntries(
    preset.params.map((p) => [p.key, p.default]),
  );

  const [params, setParams] = useState<Record<string, number>>(baseParams);
  const [tab, setTab] = useState<"params" | "analysis" | "ai">("params");
  const [edited, setEdited] = useState(false);
  const [running, setRunning] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [speed, setSpeed] = useState(1);

  const [aiState, setAiState] = useState<AiState>("idle");
  const [aiPrompt, setAiPrompt] = useState("");
  const [readout, setReadout] = useState<SceneReadout | null>(null); // tracking từ kernel

  // "Đi tới mốc" — tăng seekToken để yêu cầu renderer nhảy thẳng tới mốc đó
  // (tích phân xác định từ đầu, không phải tua có hoạt ảnh). Giữ lại mốc TRƯỚC
  // đó (prevMark) để renderer vẽ tàn ảnh nét đứt so sánh.
  const [activeMark, setActiveMark] = useState<JumpMark | null>(null);
  const [prevMark, setPrevMark] = useState<JumpMark | null>(null);
  const [seekToken, setSeekToken] = useState(0);
  const jumpTo = (mark: JumpMark) => {
    // Chưa từng đi tới mốc nào (activeMark null) → lấy trạng thái BAN ĐẦU
    // (t=0) làm tàn ảnh mặc định, để ngay lần bấm đầu tiên cũng có cái để so
    // sánh thay vì không hiện gì cả. Không gắn nhãn chữ (label rỗng) vì đây
    // không phải một mốc được đặt tên, chỉ là "trước khi bắt đầu".
    setPrevMark(activeMark ?? { seconds: 0, label: "" });
    setActiveMark(mark);
    setSeekToken((n) => n + 1);
  };

  // Tầng 2 → tầng 1: tham số hiện tại dựng thành Scene cho kernel.
  const scene = useMemo(() => preset.applyParams(params), [preset, params]);
  // Chú thích tuỳ chọn (mũi tên trường, nhãn +/−…) — PHẢI memo hoá giống `scene`:
  // preset.annotations(params) tạo mảng object MỚI mỗi lần gọi, nếu gọi trực
  // tiếp trong JSX thì mỗi render cha sẽ đổi reference → useEffect của
  // SceneKonva2D (phụ thuộc `annotations`) chạy lại → dựng lại stage → gọi
  // onReadout ngay khi setup → setState ở cha → render lại → lặp vô hạn
  // ("Maximum update depth exceeded").
  const annotations = useMemo(
    () =>
      preset.kind === undefined || preset.kind === "mechanics"
        ? preset.annotations?.(params)
        : undefined,
    [preset, params],
  );
  // bodyLabels có thể là object tĩnh HOẶC hàm của params (vd nhãn phản ánh dấu
  // điện tích hiện tại) — memo hoá tương tự `annotations` để tránh cùng lỗi
  // reference-mới-mỗi-render (đối tượng tĩnh vẫn ổn định qua useMemo bình thường).
  const bodyLabels = useMemo(() => {
    if (preset.kind !== undefined && preset.kind !== "mechanics")
      return undefined;
    const bl = preset.bodyLabels;
    return typeof bl === "function" ? bl(params) : bl;
  }, [preset, params]);
  const bodySigns = useMemo(() => {
    if (preset.kind !== undefined && preset.kind !== "mechanics")
      return undefined;
    const bs = preset.bodySigns;
    return typeof bs === "function" ? bs(params) : bs;
  }, [preset, params]);

  const markEdited = () => setEdited(true);
  const revertAll = () => {
    setParams(baseParams);
    setEdited(false);
    setAiState("idle");
    setAiPrompt("");
    setRunning(true);
    setSpeed(1);
    setActiveMark(null);
    setPrevMark(null);
    setResetSignal((n) => n + 1);
  };

  const runAi = (prompt: string) => {
    setAiPrompt(prompt);
    setAiState("thinking");
    setTimeout(() => setAiState("review"), 1400);
  };
  const applyAi = () => {
    // Mock: AI áp dụng cú sửa → đánh dấu "đã chỉnh sửa" (bản gốc vẫn revert được).
    markEdited();
    setAiState("idle");
  };

  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#f5f1ec]">
      <Sidebar activeHref="/mo-phong-vat-ly" />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e8e2d9] bg-white px-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[13px] font-medium text-[#6b6b6b] transition-colors duration-150 ease-out hover:text-[#171717]"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            Thư viện
          </button>
          <span className="text-[#d8d1c9]">/</span>
          <span className="text-[14px] font-semibold text-[#171717]">
            {preset.title}
          </span>
          <span
            className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${
              edited
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {edited ? "Đã chỉnh sửa" : "Bản gốc đã kiểm duyệt"}
          </span>
          {edited && (
            <button
              onClick={revertAll}
              className="flex items-center gap-1.5 rounded-[10px] border border-[#e8e2d9] px-3 py-1.5 text-[12px] font-semibold text-[#4f4943] transition-colors duration-150 ease-out hover:bg-[#f7f3ee]"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
              Khôi phục bản gốc
            </button>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sim stage — trải kín không gian dành cho (canvas tự đo & lấp đầy,
              xem shared/use-container-size.ts), chỉ chừa lề nhỏ quanh khung. */}
          <div className="flex flex-1 flex-col overflow-hidden p-2">
            <div className="relative min-h-0 flex-1">
              <div className="absolute inset-0 overflow-hidden rounded-[16px] border border-[#e8e2d9] shadow-sm">
                {preset.kind === "wave" ? (
                  <SceneKonvaWave2D
                    scene={scene as WaveScene}
                    running={running}
                    resetSignal={resetSignal}
                    onRunningChange={setRunning}
                    seekSeconds={activeMark?.seconds}
                    seekToken={seekToken}
                    markLabel={activeMark?.label}
                    speed={speed}
                  />
                ) : preset.kind === "string-wave" ? (
                  <SceneKonvaStringWave
                    scene={scene as StringWaveScene}
                    running={running}
                    resetSignal={resetSignal}
                    onRunningChange={setRunning}
                    seekSeconds={activeMark?.seconds}
                    seekToken={seekToken}
                    markLabel={activeMark?.label}
                    speed={speed}
                  />
                ) : preset.kind === "wave-field" ? (
                  <SceneCanvasWaveField
                    scene={scene as WaveFieldScene}
                    running={running}
                    resetSignal={resetSignal}
                    onRunningChange={setRunning}
                    seekSeconds={activeMark?.seconds}
                    seekToken={seekToken}
                    markLabel={activeMark?.label}
                    speed={speed}
                    onParamsChange={(patch) => {
                      setParams((prev) => ({ ...prev, ...patch }));
                      markEdited();
                    }}
                  />
                ) : preset.kind === "point-charge-field" ? (
                  <SceneCanvasPointChargeField
                    scene={scene as PointChargeFieldScene}
                    running={running}
                    resetSignal={resetSignal}
                    onRunningChange={setRunning}
                    seekSeconds={activeMark?.seconds}
                    seekToken={seekToken}
                    markLabel={activeMark?.label}
                    speed={speed}
                    onParamsChange={(patch) => {
                      setParams((prev) => ({ ...prev, ...patch }));
                      markEdited();
                    }}
                  />
                ) : (
                  <SceneKonva2D
                    scene={scene as Scene}
                    running={running}
                    resetSignal={resetSignal}
                    onRunningChange={setRunning}
                    onReadout={setReadout}
                    seekSeconds={activeMark?.seconds}
                    seekToken={seekToken}
                    markLabel={activeMark?.label}
                    ghostSeconds={prevMark?.seconds ?? null}
                    ghostLabel={prevMark?.label}
                    bodyLabels={bodyLabels}
                    bodySigns={bodySigns}
                    annotations={annotations}
                    bodyColors={
                      preset.kind === undefined || preset.kind === "mechanics"
                        ? preset.bodyColors
                        : undefined
                    }
                    minimalOverlay={
                      preset.kind === undefined || preset.kind === "mechanics"
                        ? preset.minimalOverlay
                        : undefined
                    }
                    speed={speed}
                  />
                )}
              </div>

              <SimulationToolbar
                running={running}
                speed={speed}
                onRunningChange={setRunning}
                onSpeedChange={setSpeed}
                onReset={() => {
                  setActiveMark(null);
                  setPrevMark(null);
                  setResetSignal((n) => n + 1);
                  setRunning(true);
                }}
              />
            </div>
            <p className="mt-3 shrink-0 text-center text-[13px] text-[#6b6b6b]">
              {preset.objective}
            </p>
          </div>

          {/* Customize panel */}
          <div className="flex w-80 shrink-0 flex-col border-l border-[#e8e2d9] bg-white">
            {/* Tracking (live) — gom thành một bảng, hiển thị ở mọi tab */}
            {readout && readout.bodies.length > 0 && (
              <div className="shrink-0 border-b border-[#e8e2d9] px-4 py-3">
                <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-[#8a8178] uppercase">
                  Theo dõi (thời gian thực)
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[#8a8178]">
                      <th className="pb-1 text-left font-medium">Vật</th>
                      <th className="pb-1 text-right font-medium">x (m)</th>
                      <th className="pb-1 text-right font-medium">y (m)</th>
                      <th className="pb-1 text-right font-medium">|v| (m/s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readout.bodies.map((b) => (
                      <tr key={b.id} className="border-t border-[#f0ece5]">
                        <td className="py-1 text-left text-[#4f4943]">
                          {b.id}
                        </td>
                        <td className="py-1 text-right tabular-nums text-[#2b2926]">
                          {b.x.toFixed(2)}
                        </td>
                        <td className="py-1 text-right tabular-nums text-[#2b2926]">
                          {b.y.toFixed(2)}
                        </td>
                        <td className="py-1 text-right tabular-nums text-[#2b2926]">
                          {b.speed.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2 flex items-center justify-between rounded-[10px] bg-[#faf9f7] px-3 py-1.5">
                  <span className="text-xs font-medium text-[#6b6b6b]">
                    Cơ năng
                  </span>
                  <span className="text-xs text-[#4f4943]">
                    <span className="font-semibold tabular-nums text-[#171717]">
                      {readout.energy.total.toFixed(1)} J
                    </span>
                    <span className="ml-2 text-[#8a8178]">
                      Wđ {readout.energy.ke.toFixed(1)} + Wt{" "}
                      {readout.energy.pe.toFixed(1)}
                    </span>
                  </span>
                </div>
              </div>
            )}
            {/* Tabs */}
            <SimulationTabs value={tab} onChange={setTab} />

            <div className="flex-1 overflow-y-auto p-5">
              {/* TẦNG 1 — tham số (Tweakpane) */}
              {tab === "params" && (
                <div className="space-y-4">
                  <p className="rounded-[10px] bg-[#faf9f7] p-3 text-xs leading-relaxed text-[#6b6b6b]">
                    Rủi ro <b>bằng 0</b>: chỉ kéo slider, sim do dev build phản
                    hồi tức thì. Dành cho mọi giáo viên.
                  </p>
                  {preset.kind === "wave" && <WaveLegend />}
                  {preset.kind === "string-wave" && (
                    <StringWaveLegend mode={(scene as StringWaveScene).mode} />
                  )}
                  {preset.id === "dien-truong-2-ban-song-song" && (
                    <ElectricFieldLegend />
                  )}
                  {preset.kind === "point-charge-field" && (
                    <PointChargeFieldLegend
                      mode={(scene as PointChargeFieldScene).displayMode}
                    />
                  )}
                  {preset.quickPresets && (
                    <div className="flex flex-wrap gap-1.5">
                      {preset.quickPresets.map((qp) => (
                        <button
                          key={qp.label}
                          type="button"
                          onClick={() => {
                            setParams((prev) => ({ ...prev, ...qp.params }));
                            markEdited();
                          }}
                          className="rounded-full border border-[#e8e2d9] px-3 py-1 text-xs text-[#6b6b6b] transition-colors duration-150 ease-out hover:border-[#d97757] hover:text-[#c96545]"
                        >
                          {qp.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {preset.params.length === 0 ? (
                    <p className="text-sm text-[#8a8178]">
                      Sim này chưa có tham số (prototype).
                    </p>
                  ) : (
                    <ParamPanel
                      schema={preset.params}
                      values={params}
                      onChange={(key, value) => {
                        setParams((prev) => ({ ...prev, [key]: value }));
                        markEdited();
                      }}
                    />
                  )}
                </div>
              )}

              {/* PHÂN TÍCH — mốc thời gian (đi tới t giây) + mốc giá trị quan trọng */}
              {tab === "analysis" && (
                <LandmarksPanel
                  analysis={preset.analysis}
                  params={params}
                  active={activeMark}
                  onJumpTo={jumpTo}
                />
              )}

              {/* TẦNG 3 — sửa bằng AI (mock, có lưới an toàn) */}
              {tab === "ai" && (
                <div className="space-y-4">
                  <p className="rounded-[10px] bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                    <b>Power user.</b> AI sửa code{" "}
                    <i>trên nền bản gốc đã đúng</i>. Có kiểm tra thị giác
                    trước/sau và luôn khôi phục được. (Đây là bản mô phỏng luồng
                    — chưa nối AI thật.)
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {[
                      "Thêm vật thứ hai",
                      "Vẽ vector vận tốc theo thời gian thực",
                      "Đổi nền sang lưới toạ độ",
                    ].map((ex) => (
                      <button
                        key={ex}
                        onClick={() => setAiPrompt(ex)}
                        className="rounded-full border border-[#e8e2d9] px-3 py-1 text-xs text-[#6b6b6b] transition-colors duration-150 ease-out hover:border-[#d97757] hover:text-[#c96545]"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={3}
                    placeholder="Mô tả thay đổi bạn muốn…"
                    className="w-full resize-none rounded-[12px] border border-[#e8e2d9] p-3 text-sm outline-none transition-colors duration-150 ease-out focus:border-[#d97757] focus:ring-2 focus:ring-[#d97757]/15"
                  />
                  <button
                    disabled={!aiPrompt.trim() || aiState === "thinking"}
                    onClick={() => runAi(aiPrompt)}
                    className="w-full rounded-[12px] bg-[#e8724a] py-2.5 text-sm font-semibold text-white transition-colors duration-150 ease-out hover:bg-[#d96a42] disabled:opacity-40"
                  >
                    {aiState === "thinking" ? "AI đang sửa…" : "Gửi cho AI"}
                  </button>

                  {aiState === "thinking" && (
                    <div className="space-y-2 rounded-[12px] border border-[#e8e2d9] p-4 text-xs text-[#6b6b6b]">
                      <p className="animate-pulse">↳ Đọc code bản gốc…</p>
                      <p className="animate-pulse">↳ Sinh thay đổi (diff)…</p>
                      <p className="animate-pulse">
                        ↳ Render & chụp ảnh kiểm tra thị giác…
                      </p>
                    </div>
                  )}

                  {aiState === "review" && (
                    <div className="space-y-3 rounded-[12px] border border-[#e8e2d9] p-4">
                      <p className="text-xs font-semibold text-[#4f4943]">
                        Đề xuất thay đổi
                      </p>
                      <pre className="overflow-x-auto rounded-[10px] bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-200">
                        {`  // + vẽ vector vận tốc tại vị trí vật
+ if (showVector) {
+   ctx.strokeStyle = "#34d399";
+   drawArrow(bx, by, vx, vy);
+ }`}
                      </pre>
                      <div className="flex items-center gap-2 rounded-[10px] bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                        <CheckCircle2
                          className="h-3.5 w-3.5 shrink-0"
                          strokeWidth={2}
                        />
                        Kiểm tra thị giác: không phát hiện vật ra khung / đè
                        nhau / sai tỉ lệ
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={applyAi}
                          className="flex-1 rounded-[10px] bg-[#e8724a] py-2 text-sm font-semibold text-white transition-colors duration-150 ease-out hover:bg-[#d96a42]"
                        >
                          Áp dụng
                        </button>
                        <button
                          onClick={() => setAiState("idle")}
                          className="rounded-[10px] border border-[#e8e2d9] px-4 py-2 text-sm font-medium text-[#4f4943] transition-colors duration-150 ease-out hover:bg-[#f7f3ee]"
                        >
                          Huỷ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
