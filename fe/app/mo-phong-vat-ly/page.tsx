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

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  ChevronLeft,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  BookmarkPlus,
  X,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import { createLibraryContent, getLibraryContent } from "@/lib/library";
import { getClassResourceLibraryContent } from "@/lib/classroom";
import { ParamPanel } from "@/components/simulations/shared/param-panel";
import {
  LandmarksPanel,
  type JumpMark,
} from "@/components/simulations/shared/landmarks-panel";
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
import type { RotationScene } from "@/components/simulations/engines/rotation/types";
import type { MagneticLoopScene } from "@/components/simulations/engines/magnetic-loop/types";
import type { MagneticScene } from "@/components/simulations/engines/magnetism/types";
import type { ParallelCurrentSheetsScene } from "@/components/simulations/engines/parallel-current-sheets/types";
import type { IronFilingsScene } from "@/components/simulations/engines/iron-filings/types";
import type {
  ElectromagneticInductionScene,
  VariableCurrentInductionScene,
} from "@/components/simulations/engines/electromagnetic-induction/types";
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
import { IsobaricProcessDetailView } from "@/components/simulations/isobaric-process/IsobaricProcessDetailView";
import { BlackettCloudChamberExperiment } from "@/components/simulations/cloud-chamber/BlackettCloudChamberExperiment";
import { MagneticDeflectionExperiment } from "@/components/simulations/magnetic-deflection/MagneticDeflectionExperiment";
import { CoulombTorsionBalanceExperiment } from "@/components/simulations/coulomb-torsion-balance/CoulombTorsionBalanceExperiment";
import { OscilloscopeFrequencyExperiment } from "@/components/simulations/oscilloscope-frequency/OscilloscopeFrequencyExperiment";
import { WaterSurfaceWaveExperiment } from "@/components/simulations/water-surface-wave/WaterSurfaceWaveExperiment";
import { RutherfordNitrogenExperiment } from "@/components/simulations/rutherford-nitrogen/RutherfordNitrogenExperiment";
import { RutherfordScatteringExperiment } from "@/components/simulations/rutherford-scattering/RutherfordScatteringExperiment";
import { ElectromagneticInductionExperiment } from "@/components/simulations/electromagnetic-induction/ElectromagneticInductionExperiment";
import { NewtonSecondLawRaceScene } from "@/components/simulations/newton-second-law/NewtonSecondLawRaceScene";
import { NewtonThirdLawScene } from "@/components/simulations/newton-third-law/NewtonThirdLawScene";
import { HookeLawExperiment } from "@/components/simulations/hooke-law/HookeLawExperiment";
import { calculateSimplePendulumValues } from "@/components/simulations/presets/con-lac-don";

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
const SceneKonvaRotation = dynamic(
  () =>
    import(
      "@/components/simulations/renderers/rotation/scene-konva-rotation"
    ).then((m) => m.SceneKonvaRotation),
  { ssr: false },
);
const SceneKonvaMagneticLoop = dynamic(
  () =>
    import(
      "@/components/simulations/renderers/magnetic-loop/scene-konva-ac-generator"
    ).then((m) => m.SceneKonvaAcGenerator),
  { ssr: false },
);
const SceneKonvaMagnetism = dynamic(
  () =>
    import(
      "@/components/simulations/renderers/magnetism/scene-konva-magnetism"
    ).then((m) => m.SceneKonvaMagnetism),
  { ssr: false },
);
const SceneKonvaParallelCurrentSheets = dynamic(
  () =>
    import(
      "@/components/simulations/renderers/parallel-current-sheets/scene-konva-parallel-current-sheets"
    ).then((m) => m.SceneKonvaParallelCurrentSheets),
  { ssr: false },
);
const SceneKonvaElectromagneticInduction = dynamic(
  () =>
    import(
      "@/components/simulations/renderers/electromagnetic-induction/scene-konva-electromagnetic-induction"
    ).then((m) => m.SceneKonvaElectromagneticInduction),
  { ssr: false },
);
const SceneKonvaVariableCurrentInduction = dynamic(
  () =>
    import(
      "@/components/simulations/renderers/electromagnetic-induction/scene-konva-variable-current-induction"
    ).then((m) => m.SceneKonvaVariableCurrentInduction),
  { ssr: false },
);
const SceneKonvaIronFilings = dynamic(
  () =>
    import(
      "@/components/simulations/renderers/iron-filings/scene-konva-iron-filings"
    ).then((m) => m.SceneKonvaIronFilings),
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
// Các mô phỏng đã được rà lại sau đợt cập nhật nội dung và trực quan hoá.
const REVIEWED_SIMULATION_IDS = new Set([
  "ong-newton",
  "nem-ngang",
  "nem-xien",
  "tong-hop-hai-luc-cung-phuong",
  "phan-tich-luc",
  "mat-nghieng-ma-sat",
  "mang-cong-galilei",
  "dinh-luat-3-newton",
  "do-p-t-bang-luc-ke",
]);

/* ─────────────────────────── Thumbnail SVG ─────────────────────────── */

function Thumb({ id }: { id: string }) {
  const common = "h-full w-full";
  const frame = (children: ReactNode, background = "#0f172a") => (
    <svg viewBox="0 0 200 120" className={common}>
      <rect width="200" height="120" fill={background} />
      {children}
    </svg>
  );

  switch (id) {
    case "dinh-luat-3-newton":
      return frame(
        <>
          <text
            x="100"
            y="14"
            textAnchor="middle"
            fontSize="8"
            fontWeight="500"
            fill="#cbd5e1"
          >
            TÁC DỤNG – PHẢN LỰC
          </text>
          <line
            x1="22"
            y1="64"
            x2="178"
            y2="64"
            stroke="#334155"
            strokeWidth="2"
          />
          <rect
            x="70"
            y="48"
            width="28"
            height="22"
            rx="4"
            fill="#38bdf8"
            stroke="#e2e8f0"
            strokeWidth="1.5"
          />
          <rect
            x="102"
            y="48"
            width="28"
            height="22"
            rx="4"
            fill="#fb923c"
            stroke="#e2e8f0"
            strokeWidth="1.5"
          />
          <path
            d="M98 59 H102"
            stroke="#cbd5e1"
            strokeWidth="2"
            strokeDasharray="2 2"
          />
          <path
            d="M68 38 H31"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M39 33 L31 38 L39 43"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M132 38 H169"
            stroke="#fb923c"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M161 33 L169 38 L161 43"
            fill="none"
            stroke="#fb923c"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text x="33" y="29" fontSize="8" fontWeight="500" fill="#bae6fd">
            F_BA
          </text>
          <text x="143" y="29" fontSize="8" fontWeight="500" fill="#fed7aa">
            F_AB
          </text>
          <text
            x="84"
            y="64"
            textAnchor="middle"
            fontSize="9"
            fontWeight="500"
            fill="#082f49"
          >
            A
          </text>
          <text
            x="116"
            y="64"
            textAnchor="middle"
            fontSize="9"
            fontWeight="500"
            fill="#431407"
          >
            B
          </text>
          <line
            x1="22"
            y1="108"
            x2="178"
            y2="108"
            stroke="#334155"
            strokeWidth="2"
          />
          <rect
            x="88"
            y="94"
            width="24"
            height="22"
            rx="4"
            fill="#84cc16"
            stroke="#ecfccb"
            strokeWidth="1.5"
          />
          <path
            d="M80 105 H53"
            stroke="#a7f3d0"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M61 100 L53 105 L61 110"
            fill="none"
            stroke="#a7f3d0"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M120 105 H147"
            stroke="#a7f3d0"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M139 100 L147 105 L139 110"
            fill="none"
            stroke="#a7f3d0"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text
            x="100"
            y="88"
            textAnchor="middle"
            fontSize="8"
            fontWeight="500"
            fill="#bbf7d0"
          >
            CÂN BẰNG · ΣF = 0
          </text>
        </>,
      );
    case "do-p-t-bang-luc-ke":
      return frame(
        <>
          {/* Giá treo chữ L và chân đế đúng bố trí của thí nghiệm. */}
          <path
            d="M42 109 V15 H103 V22"
            fill="none"
            stroke="#64748b"
            strokeWidth="7"
            strokeLinejoin="round"
          />
          <path
            d="M42 106 H32 L25 116 H64 L57 106 Z"
            fill="#475569"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <rect x="36" y="104" width="13" height="8" rx="2" fill="#475569" stroke="#94a3b8" />
          <path d="M46 19 H99" stroke="#cbd5e1" strokeWidth="1.5" opacity="0.7" />
          <rect x="97" y="16" width="12" height="8" rx="2" fill="#475569" stroke="#cbd5e1" />

          {/* Lực kế lò xo thẳng đứng: vỏ, lò xo, thang chia và vạch chỉ. */}
          <path d="M103 23 V28" stroke="#cbd5e1" strokeWidth="2" />
          <circle cx="103" cy="25" r="3" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
          <rect x="88" y="28" width="30" height="45" rx="4" fill="#f8fafc" stroke="#64748b" strokeWidth="1.8" />
          <rect x="92" y="32" width="22" height="37" rx="2" fill="#38bdf8" opacity="0.12" />
          <path
            d="M101 33 L106 37 L96 41 L106 45 L96 49 L106 53 L96 57 L103 61"
            fill="none"
            stroke="#64748b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M111 36 V64" stroke="#94a3b8" strokeWidth="1" />
          {[38, 43, 48, 53, 58, 63].map((tickY, index) => (
            <path
              key={tickY}
              d={`M${index % 2 === 0 ? 107 : 109} ${tickY} H111`}
              stroke="#64748b"
              strokeWidth="1"
            />
          ))}
          <path d="M91 51 H115" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="86" y="70" width="34" height="4" rx="1" fill="#d6a15f" stroke="#92400e" />
          <path d="M103 61 V80" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
          <circle cx="103" cy="80" r="3.5" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.8" />
          <path d="M103 84 V91" stroke="#cbd5e1" strokeWidth="2" />

          {/* Vật treo và hai lực tách riêng hai phía. */}
          <rect x="89" y="91" width="28" height="20" rx="4" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
          <text x="103" y="104" textAnchor="middle" fontSize="8" fontWeight="500" fill="#f8fafc">
            m
          </text>
          <path
            d="M76 97 V78"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M71 84 L76 77 L81 84"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text x="63" y="82" fontSize="10" fontWeight="500" fill="#67e8f9">
            T
          </text>
          <path
            d="M132 96 V115"
            fill="none"
            stroke="#fb7185"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M127 109 L132 116 L137 109"
            fill="none"
            stroke="#fb7185"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text x="141" y="113" fontSize="10" fontWeight="500" fill="#fda4af">
            P
          </text>
          <path d="M119 51 H128" stroke="#e2e8f0" strokeWidth="1.5" />
          <rect x="128" y="43" width="38" height="16" rx="6" fill="#071225" stroke="#38bdf8" />
          <text x="147" y="54" textAnchor="middle" fontSize="7.5" fontWeight="500" fill="#f8fafc">
            9,8 N
          </text>
        </>,
      );
    case "quy-tac-moment":
      return frame(
        <>
          <defs>
            <linearGradient id="seesaw-beam" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5eead4" />
              <stop offset="0.38" stopColor="#22b8aa" />
              <stop offset="1" stopColor="#0f766e" />
            </linearGradient>
          </defs>

          {/* Mặt sàn, hai chặn hành trình và chân đế giống renderer. */}
          <rect x="0" y="109" width="200" height="11" fill="#0b1220" />
          <path
            d="M0 109 H200"
            stroke="#475569"
            strokeWidth="2"
          />
          <rect x="24" y="101" width="28" height="8" rx="3" fill="#334155" stroke="#64748b" />
          <rect x="148" y="101" width="28" height="8" rx="3" fill="#334155" stroke="#64748b" />
          <path
            d="M91 72 H109 L129 109 H71 Z"
            fill="#27364b"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M95 80 H105 L117 104 H83 Z"
            fill="#1e293b"
            stroke="#475569"
            strokeWidth="1"
            strokeLinejoin="round"
          />

          {/* Thanh bập bênh xanh ngọc. */}
          <rect
            x="22"
            y="61"
            width="156"
            height="11"
            rx="5.5"
            fill="url(#seesaw-beam)"
            stroke="#99f6e4"
            strokeWidth="1.5"
          />
          <path
            d="M29 64 H171"
            stroke="#ccfbf1"
            strokeWidth="1.2"
            opacity="0.72"
            strokeLinecap="round"
          />
          {/* Dùng đúng ảnh người của thí nghiệm; hông người ngồi tì trực tiếp lên thanh. */}
          <svg
            x="51.5"
            y="22"
            width="25"
            height="56"
            viewBox="360 89 442 991"
            preserveAspectRatio="xMidYMid meet"
            overflow="visible"
          >
            <image href="/simulations/bapbenh/man.png" width="1200" height="1200" />
          </svg>
          <g transform="translate(248 0) scale(-1 1)">
            <svg
              x="111.5"
              y="22"
              width="25"
              height="56"
              viewBox="360 89 442 991"
              preserveAspectRatio="xMidYMid meet"
              overflow="visible"
            >
              <image href="/simulations/bapbenh/man.png" width="1200" height="1200" />
            </svg>
          </g>

          {/* Ổ trục nằm đè lên chính giữa thanh như mô phỏng. */}
          <circle cx="100" cy="66.5" r="8" fill="#cbd5e1" stroke="#0f172a" strokeWidth="3" />
          <circle cx="100" cy="66.5" r="3" fill="#475569" stroke="#f8fafc" strokeWidth="1" />

          {/* Trọng lực đặt sát ngoài hai người. */}
          <path
            d="M45 25 V50"
            stroke="#e2e8f0"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M41 45 L45 51 L49 45"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text x="35" y="21" fontSize="8" fontWeight="500" fill="#e2e8f0">
            P₁
          </text>
          <path
            d="M143 25 V50"
            stroke="#e2e8f0"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M139 45 L143 51 L147 45"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text x="146" y="21" fontSize="8" fontWeight="500" fill="#e2e8f0">
            P₂
          </text>

        </>,
      );
    case "quy-tac-moment-dia-tron":
      return frame(
        <>
          <circle cx="77" cy="49" r="39" fill="#153047" stroke="#7dd3fc" strokeWidth="2.5" />
          {[10, 17, 24, 31].map((radius) => (
            <circle key={radius} cx="77" cy="49" r={radius} fill="none" stroke="#38bdf8" strokeWidth="1.2" opacity="0.9" />
          ))}
          <circle cx="77" cy="49" r="4.5" fill="#f8fafc" stroke="#334155" strokeWidth="1.5" />
          <circle cx="77" cy="49" r="1.7" fill="#0f172a" />
          <path d="M38 49V92" stroke="#e2e8f0" strokeWidth="1.8" />
          <rect x="29" y="91" width="18" height="14" rx="3" fill="#fbbf24" stroke="#fef3c7" />
          <path d="M77 49L92 29L143 67" fill="none" stroke="#e2e8f0" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="143" cy="67" r="9" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="143" cy="67" r="2.4" fill="#0284c7" />
          <path d="M143 76V101" stroke="#e2e8f0" strokeWidth="1.8" />
          <rect x="135" y="84" width="16" height="6" rx="2" fill="#38bdf8" stroke="#e0f2fe" />
          <rect x="135" y="93" width="16" height="6" rx="2" fill="#7dd3fc" stroke="#e0f2fe" />
          <path d="M165 13V108M152 67H165" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
          <rect x="159" y="62" width="13" height="12" rx="2" fill="#334155" stroke="#cbd5e1" />
          <rect x="40" y="91" width="74" height="10" rx="2" fill="#d1fae5" stroke="#34d399" strokeWidth="1.5" />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((tick) => (
            <line key={tick} x1={44 + tick * 8} y1="101" x2={44 + tick * 8} y2={tick % 2 === 0 ? 95 : 97} stroke="#0f766e" strokeWidth="1" />
          ))}
          <path d="M77 49L92 29" stroke="#38bdf8" strokeWidth="1.8" />
          <path d="M77 49H38" stroke="#fbbf24" strokeWidth="1.8" />
          <text x="82" y="36" fontSize="8" fontWeight="500" fill="#7dd3fc">d₁</text>
          <text x="51" y="44" fontSize="8" fontWeight="500" fill="#fde68a">d₂</text>
          <text x="111" y="42" fontSize="9" fontWeight="500" fill="#38bdf8">F₁</text>
          <text x="21" y="69" fontSize="9" fontWeight="500" fill="#fbbf24">F₂</text>
          <rect x="31" y="109" width="143" height="5" rx="2.5" fill="#475569" />
        </>,
      );
    case "dinh-luat-2-newton":
      return frame(
        <>
          <path
            d="M0 16 H200 M0 60 H200 M0 104 H200"
            stroke="#263449"
            strokeWidth="1"
            opacity="0.5"
          />
          <path
            d="M20 32 H190 M20 76 H190"
            stroke="#334155"
            strokeWidth="1"
            strokeDasharray="4 6"
            opacity="0.72"
          />
          {/* Máng trượt, xe và tấm chắn sáng. */}
          <line
            x1="0"
            y1="58"
            x2="200"
            y2="58"
            stroke="#475569"
            strokeWidth="2.5"
          />
          <line
            x1="0"
            y1="102"
            x2="200"
            y2="102"
            stroke="#475569"
            strokeWidth="2.5"
          />
          <rect
            x="72"
            y="36"
            width="46"
            height="17"
            rx="4"
            fill="#38bdf8"
            stroke="#e2e8f0"
            strokeWidth="1.5"
          />
          <rect
            x="72"
            y="80"
            width="46"
            height="17"
            rx="4"
            fill="#fb923c"
            stroke="#e2e8f0"
            strokeWidth="1.5"
          />
          <circle
            cx="82"
            cy="58"
            r="5.5"
            fill="#020617"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          <circle
            cx="108"
            cy="58"
            r="5.5"
            fill="#020617"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          <circle
            cx="82"
            cy="102"
            r="5.5"
            fill="#020617"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          <circle
            cx="108"
            cy="102"
            r="5.5"
            fill="#020617"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          <circle cx="82" cy="58" r="1.8" fill="#38bdf8" />
          <circle cx="108" cy="58" r="1.8" fill="#38bdf8" />
          <circle cx="82" cy="102" r="1.8" fill="#fb923c" />
          <circle cx="108" cy="102" r="1.8" fill="#fb923c" />
          <rect
            x="82"
            y="20"
            width="25"
            height="16"
            rx="3"
            fill="#475569"
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />
          <rect
            x="80"
            y="65"
            width="17"
            height="15"
            rx="3"
            fill="#475569"
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />
          <rect
            x="99"
            y="70"
            width="13"
            height="10"
            rx="2.5"
            fill="#475569"
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />

          {/* Hai cổng quang điện. */}
          <path
            d="M38 45 H70"
            fill="none"
            stroke="#22c55e"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M62 40 L70 45 L62 50"
            fill="none"
            stroke="#22c55e"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text x="40" y="36" fontSize="10" fontWeight="500" fill="#bbf7d0">
            F
          </text>
          <path
            d="M120 30 H165"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M158 26 L165 30 L158 34"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text x="123" y="22" fontSize="9" fontWeight="500" fill="#bae6fd">
            a
          </text>

          {/* Dây, ròng rọc và quả nặng. */}
          <path
            d="M25 89 H70"
            fill="none"
            stroke="#22c55e"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M62 84 L70 89 L62 94"
            fill="none"
            stroke="#22c55e"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text x="29" y="80" fontSize="10" fontWeight="500" fill="#bbf7d0">
            F
          </text>
          <path
            d="M120 74 H146"
            fill="none"
            stroke="#fb923c"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M139 70 L146 74 L139 78"
            fill="none"
            stroke="#fb923c"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text x="123" y="66" fontSize="9" fontWeight="500" fill="#fed7aa">
            a
          </text>

          {/* Bộ đo thời gian. */}
          <text
            x="95"
            y="49"
            fontSize="8"
            fontWeight="500"
            textAnchor="middle"
            fill="#082f49"
          >
            A
          </text>
          <text
            x="95"
            y="93"
            fontSize="8"
            fontWeight="500"
            textAnchor="middle"
            fill="#431407"
          >
            B
          </text>
        </>,
      );
    case "tong-hop-hai-luc-cung-phuong":
      return frame(
        <>
          <line
            x1="20"
            y1="92"
            x2="180"
            y2="92"
            stroke="#475569"
            strokeWidth="2"
          />
          <rect x="86" y="54" width="28" height="24" rx="3" fill="#f472b6" />
          {/* F₁ sang trái (xanh) */}
          <path
            d="M84 66 H36"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M45 60 l-9 6 l9 6"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text x="30" y="52" fontSize="11" fontWeight="500" fill="#60a5fa">
            F₁
          </text>
          {/* F₂ sang phải (cam), dài hơn → hợp lực sang phải */}
          <path
            d="M116 66 H172"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M163 60 l9 6 l-9 6"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text x="160" y="52" fontSize="11" fontWeight="500" fill="#f59e0b">
            F₂
          </text>
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
    case "mang-cong-galilei":
      return frame(
        <>
          {/* 1. Hai nhánh dốc đối xứng. */}
          <path d="M13 13L64 38H13Z" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
          <path d="M64 38L115 13V38Z" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
          <circle cx="17" cy="15" r="4.3" fill="#ef4444" stroke="#fecaca" strokeWidth="0.8" />
          <circle cx="111" cy="15" r="3.3" fill="#ef4444" opacity="0.45" />
          <text x="125" y="27" fontSize="6.5" fontWeight="500" fill="#7dd3fc">dốc–dốc</text>

          {/* 2. Nhánh phải thoải hơn. */}
          <path d="M13 47L64 72H13Z" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
          <path d="M64 72H75" fill="none" stroke="#94a3b8" strokeWidth="2" />
          <path d="M75 72L177 47V72Z" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
          <circle cx="17" cy="49" r="4.3" fill="#ef4444" stroke="#fecaca" strokeWidth="0.8" />
          <circle cx="173" cy="49" r="3.3" fill="#ef4444" opacity="0.45" />
          <text x="112" y="62" fontSize="6.5" fontWeight="500" fill="#fde68a">dốc–thoải</text>

          {/* 3. Nhánh phải nằm ngang. */}
          <path d="M13 81L64 106H13Z" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
          <path d="M64 106H189" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          <circle cx="17" cy="83" r="4.3" fill="#ef4444" stroke="#fecaca" strokeWidth="0.8" />
          <circle cx="120" cy="102" r="3.6" fill="#ef4444" />
          <path d="M127 102H151M146 98L152 102L146 106" fill="none" stroke="#c084fc" strokeWidth="1.6" strokeLinecap="round" />
          <text x="153" y="100" fontSize="6.5" fontWeight="500" fill="#ddd6fe">v = const</text>
          <path d="M7 13V38M4 18L7 13L10 18M4 33L7 38L10 33" fill="none" stroke="#cbd5e1" strokeWidth="1" />
          <text x="2" y="29" fontSize="7" fontWeight="500" fill="#f8fafc">h</text>
        </>,
      );
    case "dinh-luat-hooke":
      return frame(
        <>
          <rect
            x="8"
            y="8"
            width="88"
            height="104"
            rx="10"
            fill="#102033"
            stroke="#38bdf8"
            strokeOpacity="0.35"
          />
          <rect
            x="104"
            y="8"
            width="88"
            height="104"
            rx="10"
            fill="#102033"
            stroke="#f59e0b"
            strokeOpacity="0.35"
          />
          <text
            x="52"
            y="20"
            textAnchor="middle"
            fontSize="7"
            fontWeight="500"
            fill="#7dd3fc"
          >
            THẢ VẬT
          </text>
          <text
            x="148"
            y="20"
            textAnchor="middle"
            fontSize="7"
            fontWeight="500"
            fill="#fcd34d"
          >
            ÉP LÒ XO
          </text>
          <path d="M28 29H76" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
          <path d="M52 31V38L44 43L60 49L44 55L60 61L44 67L60 73L52 80" fill="none" stroke="#e2e8f0" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="42" y="80" width="20" height="17" rx="3" fill="#f97316" stroke="#fed7aa" strokeWidth="1.5" />
          <text x="52" y="92" textAnchor="middle" fontSize="7" fontWeight="500" fill="#7c2d12">m</text>
          <path d="M124 99H172" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
          <path d="M148 96V91L140 87L156 82L140 77L156 72L140 67L148 63" fill="none" stroke="#e2e8f0" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="138" y="43" width="20" height="17" rx="3" fill="#f59e0b" stroke="#fde68a" strokeWidth="1.5" />
          <text x="148" y="55" textAnchor="middle" fontSize="7" fontWeight="500" fill="#78350f">m₂</text>
          <path
            d="M39 94V109"
            stroke="#fb7185"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M35 104L39 110L43 104"
            fill="none"
            stroke="#fb7185"
            strokeWidth="2.5"
          />
          <path
            d="M65 91V77"
            stroke="#22d3ee"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M61 82L65 76L69 82"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.5"
          />
          <path d="M163 35V48" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M159 42L163 49L167 42" fill="none" stroke="#facc15" strokeWidth="2.5" />
          <path
            d="M83 38V83"
            stroke="#34d399"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <text x="86" y="64" fontSize="8" fontWeight="500" fill="#67e8f9">
            Δl
          </text>
          <path d="M116 48V68" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="3 3" />
          <text
            x="110"
            y="61"
            textAnchor="end"
            fontSize="8"
            fontWeight="500"
            fill="#fde68a"
          >
            Δl
          </text>
        </>,
      );
    case "luc-huong-tam":
      return frame(
        <>
          {/* Quỹ đạo tròn */}
          <circle
            cx="100"
            cy="60"
            r="42"
            fill="none"
            stroke="#334155"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <circle cx="100" cy="60" r="4" fill="#94a3b8" />
          {/* Dây + vật */}
          <line
            x1="100"
            y1="60"
            x2="142"
            y2="60"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          <circle cx="142" cy="60" r="8" fill="#f472b6" />
          {/* Lực hướng tâm (vào tâm) + vận tốc (tiếp tuyến) */}
          <path
            d="M138 60 H112"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M120 55 l-8 5 l8 5"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M142 56 V26"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M137 34 l5 -8 l5 8"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text x="150" y="40" fontSize="10" fontWeight="500" fill="#60a5fa">
            v
          </text>
        </>,
      );
    case "dong-nang-the-nang":
      return frame(
        <>
          {/* Ray liên tục nhiều đỉnh, đúng bố cục mô phỏng tàu lượn */}
          <path
            d="M10 93H34C48 93 52 25 74 25C88 25 91 63 99 93C102 103 107 103 112 93C119 62 123 50 136 50C151 50 155 93 168 93H190"
            fill="none"
            stroke="#0b1220"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 93H34C48 93 52 25 74 25C88 25 91 63 99 93C102 103 107 103 112 93C119 62 123 50 136 50C151 50 155 93 168 93H190"
            fill="none"
            stroke="#2dd4bf"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 91H34C48 91 52 23 74 23C88 23 91 61 99 91C102 101 107 101 112 91C119 60 123 48 136 48C151 48 155 91 168 91H190"
            fill="none"
            stroke="#f43f5e"
            strokeWidth="1.5"
            strokeDasharray="3 4"
            strokeLinecap="round"
          />
          {/* Trụ đỡ và nền ray */}
          <path d="M48 93V106M74 26V106M99 93V106M136 51V106M161 93V106" stroke="#475569" strokeWidth="2" />
          <path d="M41 106H55M67 106H81M92 106H106M129 106H143M154 106H168" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
          {/* Đoàn tàu nằm trên đoạn ray phẳng */}
          <path d="M16 78H34L39 84V91H16Z" fill="#f97316" stroke="#fed7aa" strokeWidth="1" />
          <rect x="19" y="74" width="14" height="11" rx="2" fill="#ef4444" stroke="#fecaca" strokeWidth="1" />
          <rect x="22" y="76" width="4" height="4" rx="1" fill="#bae6fd" />
          <rect x="28" y="76" width="4" height="4" rx="1" fill="#bae6fd" />
          <path d="M15 82H11" stroke="#fbbf24" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="21" cy="93" r="3" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1" />
          <circle cx="33" cy="93" r="3" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1" />
          <circle cx="21" cy="93" r="1" fill="#94a3b8" />
          <circle cx="33" cy="93" r="1" fill="#94a3b8" />
          {/* Các mốc năng lượng */}
          <circle cx="74" cy="25" r="2.8" fill="#fbbf24" stroke="#fff" strokeWidth="0.8" />
          <circle cx="99" cy="93" r="2.8" fill="#34d399" stroke="#fff" strokeWidth="0.8" />
          <circle cx="136" cy="50" r="2.8" fill="#38bdf8" stroke="#fff" strokeWidth="0.8" />
          <text x="17" y="69" fontSize="7" fontWeight="500" fill="#cbd5e1">Wt = 0</text>
          <text x="74" y="15" textAnchor="middle" fontSize="7" fontWeight="500" fill="#fde68a">Wt max</text>
          <text x="99" y="116" textAnchor="middle" fontSize="7" fontWeight="500" fill="#6ee7b7">Wđ max</text>
          <text x="136" y="40" textAnchor="middle" fontSize="7" fontWeight="500" fill="#7dd3fc">Wt lớn</text>
        </>,
      );
    case "nem-ngang":
      return frame(
        <>
          <line
            x1="24"
            y1="100"
            x2="180"
            y2="100"
            stroke="#475569"
            strokeWidth="2"
          />
          <line
            x1="34"
            y1="24"
            x2="34"
            y2="100"
            stroke="#64748b"
            strokeWidth="3"
          />
          <line
            x1="34"
            y1="24"
            x2="78"
            y2="24"
            stroke="#64748b"
            strokeWidth="3"
          />
          <path
            d="M78 24 Q118 32 160 96"
            fill="none"
            stroke="#a78bfa"
            strokeWidth="2.5"
            strokeDasharray="4 4"
          />
          <line
            x1="52"
            y1="24"
            x2="52"
            y2="96"
            stroke="#60a5fa"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <circle cx="78" cy="24" r="6" fill="#f472b6" />
          <circle cx="52" cy="24" r="6" fill="#60a5fa" />
          <path
            d="M88 24 h28"
            fill="none"
            stroke="#34d399"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M108 17 l10 7 l-10 7"
            fill="none"
            stroke="#34d399"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="160" cy="96" r="6" fill="#f472b6" />
          <circle cx="52" cy="96" r="6" fill="#60a5fa" />
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
    case "ong-newton":
      return frame(
        <>
          <rect
            x="18"
            y="10"
            width="76"
            height="98"
            rx="16"
            fill="#111827"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          <rect
            x="106"
            y="10"
            width="76"
            height="98"
            rx="16"
            fill="#111827"
            stroke="#7dd3fc"
            strokeWidth="2"
          />
          <line
            x1="22"
            y1="18"
            x2="90"
            y2="18"
            stroke="#fbbf24"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <line
            x1="110"
            y1="18"
            x2="178"
            y2="18"
            stroke="#7dd3fc"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle
            cx="43"
            cy="79"
            r="7"
            fill="#94a3b8"
            stroke="#e2e8f0"
            strokeWidth="1.5"
          />
          <image
            href="/simulations/newton/feather.png"
            x="57"
            y="38"
            width="30"
            height="30"
            transform="rotate(-48 72 53)"
          />
          <circle
            cx="131"
            cy="72"
            r="7"
            fill="#94a3b8"
            stroke="#e2e8f0"
            strokeWidth="1.5"
          />
          <image
            href="/simulations/newton/feather.png"
            x="145"
            y="57"
            width="30"
            height="30"
            transform="rotate(-48 160 72)"
          />
          <line
            x1="22"
            y1="100"
            x2="90"
            y2="100"
            stroke="#64748b"
            strokeWidth="4"
          />
          <line
            x1="110"
            y1="100"
            x2="178"
            y2="100"
            stroke="#64748b"
            strokeWidth="4"
          />
        </>,
      );
    case "con-lac-don":
      return frame(
        <>
          <rect x="72" y="8" width="56" height="7" rx="3" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.4" />
          <line x1="100" y1="15" x2="100" y2="98" stroke="#64748b" strokeWidth="1.4" strokeDasharray="4 4" />
          <path d="M58 76 Q100 117 142 76" fill="none" stroke="#64748b" strokeWidth="2.2" />
          <line x1="100" y1="17" x2="138" y2="75" stroke="#e2e8f0" strokeWidth="2.5" />
          <circle cx="100" cy="17" r="4.5" fill="#0f172a" stroke="#e2e8f0" strokeWidth="1.6" />
          <circle cx="138" cy="75" r="8" fill="#f59e0b" stroke="#fde68a" strokeWidth="2" />
          <circle cx="100" cy="98" r="3.5" fill="#cbd5e1" />
          <text x="49" y="74" fontSize="10" fontWeight="500" fill="#fbbf24">B′</text>
          <text x="95" y="113" fontSize="10" fontWeight="500" fill="#e2e8f0">O</text>
          <text x="148" y="78" fontSize="10" fontWeight="500" fill="#fb7185">B</text>
          <text x="113" y="48" fontSize="10" fontWeight="500" fill="#bae6fd">ℓ</text>
          <path d="M138 84V108" stroke="#fb7185" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M133 102L138 110L143 102" fill="none" stroke="#fb7185" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="146" y="108" fontSize="9" fontWeight="500" fill="#fb7185">P</text>
        </>,
      );
    case "bao-toan-co-nang-con-lac":
      return frame(
        <>
          {/* Khung và máng U liền mạch như cảnh mô phỏng */}
          <path d="M17 103H183" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
          <rect x="18" y="21" width="13" height="82" rx="3" fill="#334155" stroke="#cbd5e1" strokeWidth="1.3" />
          <rect x="169" y="21" width="13" height="82" rx="3" fill="#334155" stroke="#cbd5e1" strokeWidth="1.3" />
          <path
            d="M31 28C33 68 60 96 100 96C140 96 167 68 169 28"
            fill="none"
            stroke="#0b1220"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <path
            d="M31 28C33 68 60 96 100 96C140 96 167 68 169 28"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            d="M31 28C33 68 60 96 100 96C140 96 167 68 169 28"
            fill="none"
            stroke="#475569"
            strokeWidth="1.4"
            strokeLinecap="round"
          />

          {/* Mốc A và B cùng độ cao, C ở đáy máng */}
          <circle cx="40" cy="39" r="3.8" fill="#fbbf24" stroke="#fef3c7" strokeWidth="0.9" />
          <circle cx="160" cy="39" r="3.8" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="0.9" />
          <circle cx="100" cy="96" r="3.8" fill="#34d399" stroke="#d1fae5" strokeWidth="0.9" />
          <text x="40" y="26" textAnchor="middle" fontSize="8" fontWeight="500" fill="#fde68a">A</text>
          <text x="160" y="26" textAnchor="middle" fontSize="8" fontWeight="500" fill="#7dd3fc">B</text>
          <text x="100" y="114" textAnchor="middle" fontSize="8" fontWeight="500" fill="#6ee7b7">C</text>

          {/* Một quả cầu thật tại trạng thái đầu A */}
          <circle cx="40" cy="39" r="7.2" fill="#991b1b" stroke="#fecaca" strokeWidth="1.3" />
          <circle cx="38" cy="36.5" r="3.5" fill="#ef4444" />
          <circle cx="36.8" cy="34.8" r="1.3" fill="#fee2e2" opacity="0.9" />

          {/* Độ cao ban đầu h₁ */}
          <path d="M10 96V39M6 46L10 38L14 46M6 89L10 97L14 89" fill="none" stroke="#fbbf24" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <text x="16" y="70" fontSize="7.5" fontWeight="500" fill="#fde68a">h₁</text>
          <text x="126" y="52" fontSize="6.5" fontWeight="500" fill="#7dd3fc">Wₜ ↑ · Wđ ↓</text>
          <text x="78" y="85" fontSize="6.5" fontWeight="500" fill="#6ee7b7">Wđ max</text>
        </>,
      );
    case "con-lac-lo-xo":
      return frame(
        <>
          <defs>
            <linearGradient id="spring-thumb-metal" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="42%" stopColor="#f8fafc" />
              <stop offset="68%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="spring-thumb-weight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>
          <rect x="59" y="14" width="82" height="7" rx="3.5" fill="#334155" stroke="#64748b" strokeWidth="1.2" />
          {[66, 82, 98, 114, 130].map((x) => (
            <line key={x} x1={x - 5} y1="14" x2={x + 2} y2="7" stroke="#64748b" strokeWidth="1.6" strokeLinecap="round" />
          ))}
          <path d="M88 21H112L100 31Z" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.4" />
          <circle cx="100" cy="31" r="3.8" fill="#0f172a" stroke="#7dd3fc" strokeWidth="1.8" />
          <path d="M100 35V40 L91 44 L109 50 L91 56 L109 62 L91 68 L109 74 L100 78V82" fill="none" stroke="#020617" strokeWidth="5" opacity=".55" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M100 35V40 L91 44 L109 50 L91 56 L109 62 L91 68 L109 74 L100 78V82" fill="none" stroke="url(#spring-thumb-metal)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="57" y1="91" x2="143" y2="91" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" opacity=".65" />
          <circle cx="100" cy="84" r="4.5" fill="#0f172a" stroke="#bae6fd" strokeWidth="1.5" />
          <path d="M82 89H118L121 111H79Z" fill="url(#spring-thumb-weight)" stroke="#bae6fd" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M87 94H113" stroke="#e0f2fe" strokeWidth="1.4" strokeLinecap="round" opacity=".8" />
          <text x="100" y="105" textAnchor="middle" fontSize="8" fontWeight="500" fill="#082f49">m</text>
        </>,
      );
    case "cong-huong-con-lac":
      return frame(
        <>
          <defs>
            <linearGradient id="resonance-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
          </defs>
          <rect x="21" y="15" width="158" height="11" rx="5.5" fill="url(#resonance-bar)" stroke="#67e8f9" strokeWidth="1.4" />
          <path d="M31 26V36M169 26V36M24 36H38M162 36H176" stroke="#64748b" strokeWidth="2.4" strokeLinecap="round" />

          <path d="M42 27L29 82" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" />
          <path d="M71 27V73" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" />
          <path d="M100 27V94" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />
          <path d="M129 27L139 84" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" />
          <path d="M158 27V67" stroke="#67e8f9" strokeWidth="2" strokeLinecap="round" />

          {[42, 71, 100, 129, 158].map((x) => (
            <circle key={`pivot-${x}`} cx={x} cy="27" r="2.7" fill="#0f172a" stroke="#e2e8f0" strokeWidth="1" />
          ))}

          <path d="M19 79A24 24 0 0 1 48 78" fill="none" stroke="#fb7185" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.72" />
          <path d="M121 82A22 22 0 0 1 153 80" fill="none" stroke="#4ade80" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.72" />

          {[
            { x: 29, y: 82, color: "#fb7185" },
            { x: 71, y: 73, color: "#fb923c" },
            { x: 100, y: 94, color: "#facc15" },
            { x: 139, y: 84, color: "#4ade80" },
            { x: 158, y: 67, color: "#67e8f9" },
          ].map((bob, index) => (
            <g key={`bob-${index}`}>
              <circle cx={bob.x} cy={bob.y} r="7.3" fill={bob.color} stroke="#fff7ed" strokeWidth="1.2" />
              <circle cx={bob.x - 2.2} cy={bob.y - 2.4} r="1.7" fill="#ffffff" opacity="0.58" />
            </g>
          ))}
          <text x="100" y="112" textAnchor="middle" fontSize="8" fontWeight="500" fill="#cbd5e1">5 CON LẮC · THANH TREO CHUNG</text>
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
    case "phan-tich-luc":
      return frame(
        <>
          <path d="M18 37L182 101H18Z" fill="#334155" stroke="#64748b" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M18 37L182 101" fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
          <rect x="91" y="58" width="30" height="21" rx="4" fill="#14b8a6" stroke="#99f6e4" strokeWidth="1.4" transform="rotate(21 106 68.5)" />

          <path d="M106 68V96" stroke="#fb7185" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M101 88L106 97L111 88" fill="none" stroke="#fb7185" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <text x="113" y="96" fontSize="9" fontWeight="500" fill="#fb7185">P</text>

          <path d="M106 68L118 42" stroke="#c084fc" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M111 48L118 41L119 51" fill="none" stroke="#c084fc" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <text x="121" y="43" fontSize="9" fontWeight="500" fill="#c084fc">N</text>

          <path d="M106 68L94 94" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
          <path d="M94 84L94 94L102 88" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="78" y="97" fontSize="8.5" fontWeight="500" fill="#60a5fa">P₁</text>

          <path d="M106 68L137 80" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          <path d="M130 73L138 80L128 81" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="140" y="85" fontSize="8.5" fontWeight="500" fill="#fbbf24">P₂</text>
        </>,
      );
    case "mat-nghieng-ma-sat":
      return frame(
        <>
          <path d="M20 101H182V42Z" fill="#334155" stroke="#64748b" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M20 101L182 42" fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
          <rect x="105" y="57" width="31" height="21" rx="4" fill="#f97316" stroke="#fed7aa" strokeWidth="1.4" transform="rotate(-20 120.5 67.5)" />

          <path d="M121 67V92" stroke="#f8fafc" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M116 84L121 93L126 84" fill="none" stroke="#f8fafc" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
          <text x="128" y="93" fontSize="8.5" fontWeight="500" fill="#f8fafc">P</text>

          <path d="M121 67L110 42" stroke="#c084fc" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M108 51L110 42L117 48" fill="none" stroke="#c084fc" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
          <text x="101" y="40" fontSize="8.5" fontWeight="500" fill="#c084fc">N</text>

          <path d="M121 67L158 54" stroke="#22d3ee" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M149 52L158 54L151 60" fill="none" stroke="#22d3ee" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <text x="161" y="53" fontSize="8.5" fontWeight="500" fill="#22d3ee">Fₖ</text>

          <path d="M121 67L91 78" stroke="#f43f5e" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M99 72L90 78L100 80" fill="none" stroke="#f43f5e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <text x="72" y="85" fontSize="8.5" fontWeight="500" fill="#f43f5e">Fₘₛ</text>

          <path d="M46 101A26 26 0 0 0 44.3 92" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" />
          <text x="39" y="96" textAnchor="middle" fontSize="10" fontWeight="500" fill="#fde68a">α</text>
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
          <path d="M10 95H190" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
          <path d="M10 91H190" stroke="#1e293b" strokeWidth="2" />
          <rect x="13" y="29" width="9" height="63" rx="3" fill="#334155" stroke="#cbd5e1" strokeWidth="1.5" />
          <rect x="178" y="29" width="9" height="63" rx="3" fill="#334155" stroke="#cbd5e1" strokeWidth="1.5" />
          <path d="M10 94H26M174 94H190" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
          <rect x="44" y="65" width="42" height="22" rx="5" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="1.5" />
          <rect x="114" y="65" width="42" height="22" rx="5" fill="#fb923c" stroke="#ffedd5" strokeWidth="1.5" />
          <text x="65" y="79" textAnchor="middle" fontSize="7" fontWeight="500" fill="#082f49">m₁</text>
          <text x="135" y="79" textAnchor="middle" fontSize="7" fontWeight="500" fill="#7c2d12">m₂</text>
          {[54, 76, 124, 146].map((x) => <circle key={x} cx={x} cy="91" r="5" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.3" />)}
          <path d="M40 53H72L66 49M72 53L66 57" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          {id === "va-cham-dan-hoi" ? (
            <path d="M160 53H128L134 49M128 53L134 57" fill="none" stroke="#fb923c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <text x="135" y="53" textAnchor="middle" fontSize="7" fontWeight="500" fill="#fb923c">v₂ = 0</text>
          )}
          <text x="100" y="18" textAnchor="middle" fontSize="8" fontWeight="500" fill={id === "va-cham-dan-hoi" ? "#bae6fd" : "#fed7aa"}>
            {id === "va-cham-dan-hoi" ? "VA CHẠM ĐÀN HỒI" : "VA CHẠM MỀM"}
          </text>
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
    case "tuong-tac-nam-cham-va-kim-nam-cham":
      return frame(
        <>
          <circle
            cx="132"
            cy="59"
            r="31"
            fill="#f8fafc"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          <path
            d="M105 59 L132 53 L159 59 L132 65 Z"
            fill="#dc2626"
            stroke="#991b1b"
            strokeWidth="1"
          />
          <path
            d="M105 59 L132 53 L132 65 Z"
            fill="#2563eb"
            stroke="#1d4ed8"
            strokeWidth="1"
          />
          <circle
            cx="132"
            cy="59"
            r="4"
            fill="#f8fafc"
            stroke="#475569"
            strokeWidth="1.5"
          />
          <text x="148" y="51" fontSize="10" fontWeight="bold" fill="#dc2626">
            N
          </text>
          <text x="108" y="72" fontSize="10" fontWeight="bold" fill="#60a5fa">
            S
          </text>
          <rect
            x="22"
            y="45"
            width="60"
            height="28"
            rx="4"
            fill="#2563eb"
            stroke="#1e3a8a"
            strokeWidth="2"
          />
          <path d="M22 45h30v28H22z" fill="#dc2626" />
          <text x="34" y="63" fontSize="13" fontWeight="bold" fill="#fff">
            N
          </text>
          <text x="64" y="63" fontSize="13" fontWeight="bold" fill="#fff">
            S
          </text>
          <path
            d="M88 54 C98 43 105 43 113 48"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeDasharray="3 3"
          />
        </>,
      );
    case "tuong-tac-hai-tam-kim-loai-mang-dong-dien":
      return frame(
        <>
          <rect x="35" y="18" width="130" height="10" rx="2" fill="#b77945" />
          {[65, 135].map((x, index) => (
            <g key={x}>
              <rect
                x={x - 16}
                y="25"
                width="32"
                height="13"
                rx="2"
                fill="#cbd5e1"
                stroke="#64748b"
                strokeWidth="1.5"
              />
              <circle
                cx={x - 11}
                cy="31"
                r="2.5"
                fill="#f8fafc"
                stroke="#334155"
              />
              <circle
                cx={x + 11}
                cy="31"
                r="2.5"
                fill="#f8fafc"
                stroke="#334155"
              />
              <rect
                x={x - 11}
                y="38"
                width="22"
                height="48"
                rx="2"
                fill="#b9c3cc"
                stroke="#475569"
                strokeWidth="1.5"
              />
              <path
                d={index === 0 ? "M" + x + " 76V48" : "M" + x + " 48V76"}
                stroke={index === 0 ? "#e11d48" : "#2563eb"}
                strokeWidth="3"
              />
              <path
                d={
                  index === 0
                    ? "M" + (x - 4) + " 53 L" + x + " 47 L" + (x + 4) + " 53"
                    : "M" + (x - 4) + " 71 L" + x + " 77 L" + (x + 4) + " 71"
                }
                fill="none"
                stroke={index === 0 ? "#e11d48" : "#2563eb"}
                strokeWidth="2"
              />
              <rect
                x={x - 16}
                y="84"
                width="32"
                height="10"
                rx="2"
                fill="#cbd5e1"
                stroke="#64748b"
                strokeWidth="1.5"
              />
            </g>
          ))}
          <path
            d="M91 63 h18"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M105 59 l6 4 l-6 4"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>,
      );

    case "tu-pho":
      return frame(
        <>
          <rect x="18" y="16" width="164" height="88" rx="6" fill="#17233a" />
          <g stroke="#94a3b8" strokeWidth="1" opacity=".8">
            <path d="M35 60 Q72 24 104 60 Q136 96 170 60" fill="none" />
            <path d="M30 45 Q75 12 108 55 Q142 94 174 44" fill="none" />
            <path d="M30 76 Q75 108 108 65 Q142 26 174 76" fill="none" />
            <path d="M42 32 Q78 15 110 55 Q135 82 160 31" fill="none" />
            <path d="M42 88 Q78 105 110 65 Q135 38 160 89" fill="none" />
          </g>
          <rect
            x="62"
            y="50"
            width="76"
            height="20"
            rx="3"
            fill="#dc2626"
            stroke="#7f1d1d"
            strokeWidth="1.5"
          />
          <rect x="100" y="50" width="38" height="20" rx="3" fill="#2563eb" />
          <text x="72" y="64" fontSize="10" fontWeight="bold" fill="#fff">
            N
          </text>
          <text x="122" y="64" fontSize="10" fontWeight="bold" fill="#fff">
            S
          </text>
        </>,
      );
    case "bien-thien-dong-dien-bang-bien-tro-khoa-k":
      return frame(
        <>
          {/* Mạch xoay chiều với khoá K, biến trở X, ampe kế và vôn kế. */}
          <rect x="7" y="12" width="77" height="96" rx="7" fill="#10233c" stroke="#334a65" />
          <path d="M18 53V29H32M47 29H73V91H18V69M50 29V45M50 67V91M70 29V48M70 66V91" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
          <circle cx="18" cy="61" r="8" fill="#d9f99d" stroke="#f8fafc" strokeWidth="1" />
          <path d="M12 61Q15 55 18 61T24 61" fill="none" stroke="#166534" strokeWidth="1.2" />
          <circle cx="32" cy="29" r="2" fill="#e2e8f0" />
          <circle cx="47" cy="29" r="2" fill="#e2e8f0" />
          <path d="M32 29L47 29" stroke="#f59e0b" strokeWidth="2.8" strokeLinecap="round" />
          <text x="39" y="22" textAnchor="middle" fontSize="5.5" fontWeight="500" fill="#fde68a">K</text>
          <rect x="44" y="45" width="12" height="22" rx="2" fill="#dbe4ee" stroke="#f8fafc" strokeWidth="1" />
          <path d="M50 48L46 52L54 56L46 60L50 64" fill="none" stroke="#475569" strokeWidth="1" />
          <text x="50" y="42" textAnchor="middle" fontSize="6" fontWeight="500" fill="#f8fafc">X</text>
          <circle cx="50" cy="79" r="7" fill="#e2e8f0" stroke="#f8fafc" />
          <text x="50" y="81" textAnchor="middle" fontSize="6" fontWeight="500" fill="#0f172a">A</text>
          <circle cx="70" cy="57" r="7" fill="#e2e8f0" stroke="#f8fafc" />
          <text x="70" y="59" textAnchor="middle" fontSize="6" fontWeight="500" fill="#0f172a">V</text>

          {/* Hai màn hình u(t), i(t) đồng bộ theo thời gian. */}
          {[15, 67].map((y) => (
            <g key={y}>
              <rect x="93" y={y} width="100" height="42" rx="5" fill="#10233c" stroke="#334a65" />
              {[108, 123, 138, 153, 168, 183].map((x) => <line key={x} x1={x} y1={y + 7} x2={x} y2={y + 35} stroke="#38bdf8" strokeWidth="0.45" opacity="0.35" />)}
              {[y + 9, y + 21, y + 33].map((gy) => <line key={gy} x1="101" y1={gy} x2="187" y2={gy} stroke="#38bdf8" strokeWidth="0.45" opacity="0.35" />)}
            </g>
          ))}
          <path d="M101 36C106 20 111 20 116 36S126 52 131 36S141 20 146 36S156 52 161 36S171 20 176 36S186 52 190 36" fill="none" stroke="#fb7185" strokeWidth="1.8" />
          <path d="M101 88C106 72 111 72 116 88S126 104 131 88S141 72 146 88S156 104 161 88S171 72 176 88S186 104 190 88" fill="none" stroke="#38bdf8" strokeWidth="1.8" />
          <text x="98" y="21" fontSize="6" fontWeight="500" fill="#fda4af">u(V)</text>
          <text x="98" y="73" fontSize="6" fontWeight="500" fill="#7dd3fc">i(mA)</text>
        </>,
        "#081526",
      );
    case "cam-ung-dien-tu":
      return frame(
        <>
          <path
            d="M10 61H145"
            stroke="#334155"
            strokeWidth="1.5"
            strokeDasharray="4 5"
          />
          <path
            d="M31 30C65 8 111 13 130 40"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.4"
            opacity="0.55"
          />
          <path
            d="M31 92C65 112 111 106 130 80"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.4"
            opacity="0.55"
          />
          <g>
            <rect
              x="15"
              y="48"
              width="66"
              height="27"
              rx="6"
              fill="#1e3a8a"
              stroke="#e2e8f0"
              strokeWidth="1.5"
            />
            <path d="M15 54Q15 48 21 48H48V75H21Q15 75 15 69Z" fill="#dc2626" />
            <path d="M48 48H75Q81 48 81 54V69Q81 75 75 75H48Z" fill="#2563eb" />
            <line
              x1="48"
              y1="50"
              x2="48"
              y2="73"
              stroke="#fff"
              strokeWidth="1"
              opacity="0.8"
            />
            <text
              x="31"
              y="66"
              textAnchor="middle"
              fontSize="10"
              fontWeight="500"
              fill="#fff"
            >
              N
            </text>
            <text
              x="65"
              y="66"
              textAnchor="middle"
              fontSize="10"
              fontWeight="500"
              fill="#fff"
            >
              S
            </text>
          </g>
          <path
            d="M84 61H97"
            stroke="#34d399"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M92 56L98 61L92 66"
            fill="none"
            stroke="#34d399"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <g>
            <path d="M102 38V84M133 38V84" stroke="#78350f" strokeWidth="2" />
            {[104, 109, 114, 119, 124, 129].map((x) => (
              <ellipse
                key={x}
                cx={x}
                cy="61"
                rx="5.5"
                ry="23"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.1"
              />
            ))}
            <path
              d="M104 39C110 35 124 35 133 39M104 83C111 87 124 87 133 83"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.2"
            />
          </g>
          <path
            d="M104 84V105H157V93"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M133 84V112H187V93"
            fill="none"
            stroke="#fb7185"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <g>
            <rect
              x="146"
              y="46"
              width="50"
              height="49"
              rx="10"
              fill="#eef4f8"
              stroke="#94a3b8"
              strokeWidth="2"
            />
            <path
              d="M154 78A17 17 0 0 1 188 78"
              fill="none"
              stroke="#64748b"
              strokeWidth="2.5"
            />
            {[0, 1, 2, 3, 4].map((index) => {
              const angle = Math.PI + (Math.PI * index) / 4;
              const centerX = 171;
              const centerY = 78;
              return (
                <line
                  key={index}
                  x1={centerX + Math.cos(angle) * 13}
                  y1={centerY + Math.sin(angle) * 13}
                  x2={centerX + Math.cos(angle) * 17}
                  y2={centerY + Math.sin(angle) * 17}
                  stroke="#475569"
                  strokeWidth="1"
                />
              );
            })}
            <line
              x1="171"
              y1="78"
              x2="180"
              y2="62"
              stroke="#e11d48"
              strokeWidth="2.3"
              strokeLinecap="round"
            />
            <circle cx="171" cy="78" r="3" fill="#334155" />
            <text
              x="171"
              y="58"
              textAnchor="middle"
              fontSize="8"
              fontWeight="500"
              fill="#0f172a"
            >
              G
            </text>
          </g>
        </>,
      );
    case "khung-day-quay-trong-tu-truong":
      return frame(
        <>
          {[27, 49, 71, 93].map((y) => (
            <g key={y}>
              <line
                x1="12"
                y1={y}
                x2="188"
                y2={y}
                stroke="#1596b8"
                strokeWidth="1.4"
                opacity=".6"
              />
              <path
                d={`M181 ${y - 4} l7 4 l-7 4`}
                fill="none"
                stroke="#1596b8"
                strokeWidth="1.4"
              />
            </g>
          ))}
          <path
            d="M70 26 L62 91 L136 78 L145 17 Z"
            fill="none"
            stroke="#c8433b"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M66 59 l-22 22"
            stroke="#d92d20"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M45 73 l-3 11 l11-3"
            fill="none"
            stroke="#d92d20"
            strokeWidth="3"
          />
          <path
            d="M140 48 l22-22"
            stroke="#d92d20"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M153 28 l11-4 l-4 11"
            fill="none"
            stroke="#d92d20"
            strokeWidth="3"
          />
          <text x="55" y="57" fontSize="13" fontWeight="500" fill="#17324d">
            M
          </text>
          <text x="171" y="20" fontSize="14" fontWeight="500" fill="#1596b8">
            B
          </text>
        </>,
        "#f7faf9",
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
          <text x="52" y="32" fontSize="8" fontWeight="500" fill="#f8fafc">
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
          <text x="145" y="7" fontSize="7" fontWeight="500" fill="#fb7185">
            +
          </text>
          <text x="163" y="12" fontSize="7" fontWeight="500" fill="#93c5fd">
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
    case "isobaric-process":
      return frame(
        <>
          <rect
            x="48"
            y="25"
            width="58"
            height="74"
            rx="8"
            fill="rgba(103,232,249,.12)"
            stroke="#cbd5e1"
            strokeWidth="1.8"
          />
          <rect
            x="54"
            y="55"
            width="46"
            height="39"
            rx="5"
            fill="rgba(103,232,249,.42)"
            stroke="#67e8f9"
          />
          <rect
            x="40"
            y="49"
            width="74"
            height="10"
            rx="3"
            fill="#e2e8f0"
            stroke="#94a3b8"
          />
          <line
            x1="77"
            y1="30"
            x2="77"
            y2="49"
            stroke="#cbd5e1"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {[0, 1, 2].map((index) => (
            <rect
              key={index}
              x={59 + index * 2}
              y={24 - index * 7}
              width={36 - index * 4}
              height="7"
              rx="2"
              fill={index === 2 ? "#fb923c" : "#64748b"}
              stroke="#e2e8f0"
              strokeWidth=".8"
            />
          ))}
          <path
            d="M128 31 V95 H184"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="1.6"
          />
          <path
            d="M132 58 H178"
            fill="none"
            stroke="#67e8f9"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="154" cy="58" r="5" fill="#fb923c" stroke="#ffedd5" />
          <text x="119" y="22" fill="#e2e8f0" fontSize="8" fontWeight="500">
            p
          </text>
          <text x="181" y="108" fill="#e2e8f0" fontSize="8" fontWeight="500">
            V
          </text>
          <path
            d="M59 111 C50 102 57 92 65 85 C75 95 77 104 69 111 Z"
            fill="#f97316"
          />
          <text x="10" y="18" fill="#67e8f9" fontSize="9" fontWeight="500">
            p = const
          </text>
        </>,
      );
    case "buong-suong-blackett":
      return frame(
        <>
          <ellipse
            cx="101"
            cy="62"
            rx="72"
            ry="43"
            fill="rgba(8,145,178,.12)"
            stroke="#cbd5e1"
            strokeWidth="2"
          />
          <rect
            x="22"
            y="53"
            width="28"
            height="18"
            rx="4"
            fill="#334155"
            stroke="#94a3b8"
          />
          <text x="31" y="66" fill="#f8fafc" fontSize="11" fontWeight="500">
            α
          </text>
          {Array.from({ length: 23 }, (_, index) => (
            <circle
              key={`a-${index}`}
              cx={49 + index * 3.2}
              cy={62 + (((index * 7) % 5) - 2) * 0.7}
              r={index % 3 === 0 ? 1.7 : 1.1}
              fill="#f8fafc"
              opacity=".88"
            />
          ))}
          {Array.from({ length: 16 }, (_, index) => (
            <circle
              key={`p-${index}`}
              cx={120 + index * 3.2}
              cy={62 - index * 1.45}
              r=".9"
              fill="#e2e8f0"
              opacity=".82"
            />
          ))}
          {Array.from({ length: 9 }, (_, index) => (
            <circle
              key={`o-${index}`}
              cx={120 + index * 2.5}
              cy={62 + index * 2.2}
              r={index % 2 ? 1.6 : 2}
              fill="#f8fafc"
              opacity=".9"
            />
          ))}
          <circle
            cx="120"
            cy="62"
            r="4"
            fill="none"
            stroke="#fde68a"
            strokeWidth="1.3"
          />
          <rect
            x="62"
            y="96"
            width="79"
            height="8"
            rx="3"
            fill="#cbd5e1"
            stroke="#64748b"
          />
          <rect x="91" y="104" width="20" height="11" fill="#475569" />
          <path d="M172 39h17v24h-17z" fill="#334155" stroke="#94a3b8" />
          <circle cx="171" cy="51" r="6" fill="#020617" stroke="#67e8f9" />
        </>,
      );
    case "rutherford-bien-doi-hat-nhan-nito":
      return frame(
        <>
          <rect
            x="12"
            y="42"
            width="40"
            height="46"
            rx="7"
            fill="#334155"
            stroke="#94a3b8"
          />
          <circle cx="38" cy="65" r="6" fill="#f59e0b" />
          <rect x="52" y="55" width="25" height="6" rx="2" fill="#94a3b8" />
          <rect x="52" y="70" width="25" height="6" rx="2" fill="#94a3b8" />
          <rect
            x="78"
            y="32"
            width="70"
            height="66"
            rx="12"
            fill="rgba(14,116,144,.16)"
            stroke="#67e8f9"
          />
          {Array.from({ length: 12 }, (_, index) => (
            <circle
              key={index}
              cx={89 + (index % 4) * 15}
              cy={44 + Math.floor(index / 4) * 20}
              r="2"
              fill="#7dd3fc"
              opacity=".42"
            />
          ))}
          <path
            d="M52 65H142"
            stroke="#fbbf24"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx="118" cy="65" r="4" fill="none" stroke="#f8fafc" />
          <path d="M118 65L158 55" stroke="#67e8f9" strokeWidth="1.8" />
          <rect x="151" y="31" width="8" height="68" rx="2" fill="#cbd5e1" />
          <rect
            x="171"
            y="26"
            width="10"
            height="78"
            rx="4"
            fill="#84cc16"
            stroke="#bef264"
          />
          <circle cx="176" cy="55" r="4" fill="#f7fee7" stroke="#d9f99d" />
          <path
            d="M184 46L197 38M184 64L197 72"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          <text x="93" y="113" fill="#cbd5e1" fontSize="8" fontWeight="500">
            N₂ → proton → ZnS
          </text>
        </>,
      );
    case "tan-xa-alpha-rutherford":
      return frame(
        <>
          <circle
            cx="112"
            cy="67"
            r="46"
            fill="rgba(22,101,52,.24)"
            stroke="#84cc16"
            strokeWidth="8"
          />
          <rect
            x="105"
            y="29"
            width="8"
            height="76"
            rx="2"
            fill="#facc15"
            stroke="#fef08a"
          />
          <rect
            x="12"
            y="50"
            width="38"
            height="34"
            rx="7"
            fill="#334155"
            stroke="#94a3b8"
          />
          <circle cx="39" cy="67" r="5" fill="#f59e0b" />
          <rect x="50" y="58" width="28" height="5" rx="2" fill="#94a3b8" />
          <rect x="50" y="72" width="28" height="5" rx="2" fill="#94a3b8" />
          <path
            d="M77 67H106M112 67L155 67M112 67L150 43M112 67L137 99M112 67L79 39"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <circle cx="158" cy="67" r="3.5" fill="#a7f3d0" />
          <circle cx="149" cy="43" r="3.5" fill="#67e8f9" />
          <circle cx="137" cy="100" r="3.5" fill="#fbbf24" />
          <circle cx="78" cy="39" r="3.5" fill="#fb7185" />
          <text x="83" y="119" fill="#e2e8f0" fontSize="8" fontWeight="500">
            lá Au · màn ZnS
          </text>
        </>,
      );
    case "do-lech-tia-alpha-beta-gamma":
      return frame(
        <>
          <rect
            x="18"
            y="43"
            width="42"
            height="42"
            rx="7"
            fill="#334155"
            stroke="#94a3b8"
          />
          <circle cx="44" cy="64" r="6" fill="#f59e0b" />
          <rect x="61" y="55" width="25" height="5" rx="2" fill="#94a3b8" />
          <rect x="61" y="68" width="25" height="5" rx="2" fill="#94a3b8" />
          {Array.from({ length: 12 }, (_, index) => (
            <g key={index} opacity=".4">
              <circle
                cx={98 + (index % 4) * 18}
                cy={35 + Math.floor(index / 4) * 28}
                r="4"
                fill="none"
                stroke="#7dd3fc"
              />
              <circle
                cx={98 + (index % 4) * 18}
                cy={35 + Math.floor(index / 4) * 28}
                r="1.2"
                fill="#7dd3fc"
              />
            </g>
          ))}
          <path
            d="M85 64 C120 64 145 48 174 35"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M85 64 C114 64 134 83 168 103"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M85 64 H178"
            fill="none"
            stroke="#a3e635"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <rect
            x="181"
            y="20"
            width="8"
            height="96"
            rx="3"
            fill="#cbd5e1"
            stroke="#64748b"
          />
          <text x="143" y="26" fill="#fbbf24" fontSize="9" fontWeight="500">
            α
          </text>
          <text x="143" y="111" fill="#67e8f9" fontSize="9" fontWeight="500">
            β⁻
          </text>
          <text x="150" y="59" fill="#bef264" fontSize="9" fontWeight="500">
            γ
          </text>
        </>,
      );
    case "can-xoan-coulomb":
      return frame(
        <>
          <ellipse
            cx="105"
            cy="73"
            rx="79"
            ry="42"
            fill="rgba(56,189,248,.08)"
            stroke="#cbd5e1"
            strokeWidth="2"
          />
          <rect
            x="98"
            y="14"
            width="14"
            height="58"
            rx="6"
            fill="rgba(186,230,253,.2)"
            stroke="#bae6fd"
          />
          <ellipse
            cx="105"
            cy="20"
            rx="24"
            ry="8"
            fill="#b77935"
            stroke="#fde68a"
          />
          <line
            x1="105"
            y1="25"
            x2="105"
            y2="73"
            stroke="#f5d28a"
            strokeWidth="1"
          />
          <line
            x1="47"
            y1="77"
            x2="161"
            y2="69"
            stroke="#e6d2a7"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle cx="161" cy="69" r="9" fill="#d9a94c" stroke="#fde68a" />
          <circle cx="174" cy="91" r="9" fill="#d9a94c" stroke="#fde68a" />
          <path
            d="M161 69 Q181 69 174 91"
            fill="none"
            stroke="#fb7185"
            strokeWidth="2"
          />
          <path
            d="M82 99 A36 22 0 0 0 130 101"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1.5"
          />
          <text x="88" y="116" fill="#fde68a" fontSize="9" fontWeight="500">
            θ
          </text>
          <text x="145" y="53" fill="#fef3c7" fontSize="10" fontWeight="500">
            +
          </text>
          <text x="181" y="94" fill="#fef3c7" fontSize="10" fontWeight="500">
            +
          </text>
        </>,
      );
    case "do-tan-so-bang-dao-dong-ki":
      return frame(
        <>
          <rect
            x="17"
            y="88"
            width="48"
            height="20"
            rx="5"
            fill="#9a5b25"
            stroke="#e9b568"
          />
          <path
            d="M41 88V62M41 65Q30 58 29 27M41 65Q52 58 53 27"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M78 43V101"
            stroke="#64748b"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M66 101H91"
            stroke="#64748b"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <rect
            x="70"
            y="34"
            width="29"
            height="11"
            rx="5"
            fill="#334155"
            stroke="#94a3b8"
          />
          <path
            d="M99 40C116 48 104 95 127 96"
            fill="none"
            stroke="#64748b"
            strokeWidth="1.7"
          />
          <rect
            x="120"
            y="19"
            width="73"
            height="88"
            rx="9"
            fill="#d69237"
            stroke="#ffdc8b"
            strokeWidth="2"
          />
          <rect
            x="128"
            y="29"
            width="48"
            height="48"
            rx="4"
            fill="#063344"
            stroke="#67e8f9"
          />
          <path
            d="M130 53C137 35 143 71 151 53S165 35 174 53"
            fill="none"
            stroke="#d9ff57"
            strokeWidth="2"
          />
          <circle cx="184" cy="38" r="4" fill="#94a3b8" />
          <circle cx="184" cy="55" r="4" fill="#94a3b8" />
          <circle cx="184" cy="72" r="4" fill="#86efac" />
          <path
            d="M56 47Q62 53 56 59M62 40Q74 53 62 66"
            fill="none"
            stroke="#67e8f9"
            strokeWidth="1.5"
            opacity=".8"
          />
        </>,
      );
    case "song-tren-mat-nuoc":
      return frame(
        <>
          <path
            d="M20 33H181L194 108H8Z"
            fill="rgba(8,145,178,.42)"
            stroke="#bae6fd"
            strokeWidth="2"
          />
          <ellipse
            cx="63"
            cy="70"
            rx="12"
            ry="6"
            fill="#f2c866"
            stroke="#fef3c7"
          />
          {[18, 31, 45, 60, 76].map((radius) => (
            <ellipse
              key={radius}
              cx="63"
              cy="70"
              rx={radius}
              ry={radius * 0.42}
              fill="none"
              stroke="#cffafe"
              strokeWidth={radius % 2 ? 1 : 1.4}
              opacity={1 - radius / 110}
            />
          ))}
          <rect
            x="55"
            y="9"
            width="16"
            height="58"
            rx="7"
            fill="#94a3b8"
            stroke="#e2e8f0"
          />
          <rect
            x="31"
            y="8"
            width="64"
            height="17"
            rx="6"
            fill="#475569"
            stroke="#cbd5e1"
          />
          <ellipse
            cx="143"
            cy="75"
            rx="8"
            ry="5"
            fill="#fbbf24"
            stroke="#fde68a"
          />
          <path d="M143 59V91" stroke="#fde68a" strokeDasharray="3 3" />
          <path d="M98 94H170" stroke="#fef08a" strokeWidth="1.5" />
          <path d="M98 89V99M170 89V99" stroke="#fef08a" strokeWidth="1.5" />
          <text x="130" y="108" fill="#fef08a" fontSize="9" fontWeight="500">
            λ
          </text>
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
          <text x="32" y="25" fill="#67e8f9" fontSize="10" fontWeight="500">
            T = const
          </text>
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
            fontWeight="500"
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
          {/* Khung mạch đúng theo mô phỏng: nguồn và công tắc ở phía trên. */}
          <path
            d="M10 24H32M46 24H72M99 24H185V53H170M10 24V88H55V68"
            fill="none"
            stroke="#71839b"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M35 15V33M43 18V30" stroke="#f8fafc" strokeWidth="3" />
          <text x="33" y="10" fontSize="7" fontWeight="500" fill="#fb7185">
            +
          </text>
          <text x="42" y="10" fontSize="7" fontWeight="500" fill="#7dd3fc">
            −
          </text>
          <circle cx="72" cy="24" r="3.4" fill="#dbeafe" />
          <circle cx="99" cy="24" r="3.4" fill="#dbeafe" />
          <path
            d="M72 24L94 14"
            stroke="#f59e0b"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Cuộn dây quấn quanh lõi sắt non nằm ngang. */}
          <rect
            x="58"
            y="64"
            width="72"
            height="12"
            rx="4"
            fill="#dbe4ef"
            stroke="#f8fafc"
            strokeWidth="1.2"
          />
          <path
            d="M55 68C55 52 62 52 62 68S69 84 69 68S76 52 76 68S83 84 83 68S90 52 90 68S97 84 97 68"
            fill="none"
            stroke="#d35f02"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M97 68H110M110 68V38H134"
            fill="none"
            stroke="#71839b"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Miếng sắt, lá thép đàn hồi và chốt kẹp. */}
          <rect
            x="111"
            y="64"
            width="25"
            height="12"
            rx="4"
            fill="#dbe4ef"
            stroke="#f8fafc"
            strokeWidth="1.2"
          />
          <rect
            x="138"
            y="35"
            width="8"
            height="57"
            rx="4"
            fill="#b97820"
            stroke="#fde68a"
            strokeWidth="1.4"
          />
          <rect
            x="132"
            y="28"
            width="22"
            height="15"
            rx="3"
            fill="#f8fafc"
            stroke="#fb7185"
            strokeWidth="2"
          />
          <circle cx="143" cy="35.5" r="3.8" fill="#ef4444" />

          {/* Tiếp điểm cố định nối đúng vào nhánh dây bên phải. */}
          <path
            d="M146 53H170"
            stroke="#fb7185"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="148" cy="53" r="3.3" fill="#fde68a" />

          {/* Chuông đỏ và cây gõ cong bên dưới, đúng vị trí mô phỏng. */}
          <circle
            cx="111"
            cy="98"
            r="18"
            fill="#dc2626"
            stroke="#fda4af"
            strokeWidth="2.2"
          />
          <circle
            cx="111"
            cy="98"
            r="4.5"
            fill="none"
            stroke="#fecaca"
            strokeWidth="2"
          />
          <path
            d="M142 89Q139 103 128 106"
            fill="none"
            stroke="#dbe4ef"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <circle cx="127" cy="106" r="5" fill="#e2e8f0" stroke="#f8fafc" />

          <path
            d="M20 116H180"
            stroke="#334155"
            strokeWidth="6"
            strokeLinecap="round"
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
          <text x="36" y="57" fontSize="8" fontWeight="500" fill="#f8fafc">
            A
          </text>
          <text x="161" y="57" fontSize="8" fontWeight="500" fill="#f8fafc">
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
          <text x="91" y="108" fontSize="8" fontWeight="500" fill="#fbbf24">
            K
          </text>
          <path
            d="M151 82 V106 M163 88 V100"
            stroke="#f8fafc"
            strokeWidth="3"
          />
          <text x="145" y="78" fontSize="8" fontWeight="500" fill="#fda4af">
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
          <text x="51" y="32" fontSize="9" fontWeight="500" fill="#f8fafc">
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
          <text x="51" y="76" fontSize="9" fontWeight="500" fill="#f8fafc">
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
          <text x="92" y="28" fontSize="10" fontWeight="500" fill="#f8fafc">
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
          <text x="92" y="61" fontSize="10" fontWeight="500" fill="#f8fafc">
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
        "nguyen-ly-truyen-nhiet": "M35 78h130 M55 64h90 M75 50h60 M95 36h30",
        "do-nhiet-dung-rieng-c-cua-nuoc":
          "M45 90V45h110v45 M65 45V25 M135 45V25",
        "do-nhiet-nong-chay-rieng-lambda-cua-nuoc-da":
          "M40 86h120 M55 86V42h90v44 M75 42V26 M125 42V26",
        "do-nhiet-hoa-hoi-rieng-l-cua-nuoc":
          "M45 90h110 M60 90V48h80v42 M80 48V27 M120 48V27",
        "buong-suong-blackett": "M35 30h130v65H35z M55 78q20-48 40 0t40 0",
        "rutherford-bien-doi-hat-nhan-nito":
          "M35 60h35 M130 60h35 M70 60q15-34 30 0t30 0",
        "tan-xa-alpha-rutherford":
          "M30 85q35-55 70-25t70-25 M35 40l25 20 M165 40l-25 20",
        "do-lech-tia-alpha-beta-gamma":
          "M35 85l55-50 75 50 M90 35v50 M55 62h70",
        "can-xoan-coulomb":
          "M100 22v76 M55 60h90 M65 40l-20 20 20 20 M135 40l20 20-20 20",
        "do-tan-so-bang-dao-dong-ki": "M30 62q12-42 24 0t24 0t24 0t24 0t24 0",
        "song-tren-mat-nuoc": "M25 85q25-50 50 0t50 0t50 0 M45 30h110",
        "isothermal-boyle": "M35 85h130 M55 85V35h90v50 M75 58h50",
        "nut-bac-bat-noi-nang-thanh-cong":
          "M35 86h130 M55 86V50h90v36 M80 50v-20 M120 50v-20",
        "becquerel-uranium-lam-den-kinh-anh":
          "M35 86h130 M55 86V35h90v51 M80 35V20 M120 35V20",
        "tac-dung-tu-cua-dong-dien-chuong-dien":
          "M35 80h130 M55 80V35h90v45 M75 35v-15 M125 35v-15",
        "tac-dung-nhiet-dong-dien-day-sat-dot-giay":
          "M35 86h130 M55 86V50h90v36 M70 50q30-30 60 0",
        "brownian-pollen":
          "M30 60h140 M55 40l20 20-20 20 M100 35v50 M145 40l-20 20 20 20",
        "dun-nong-nhiet-do-thoi-gian": "M30 90q30-65 60-25t80-30 M30 90h140",
        "dac-trung-va-dien-tro-bong-den-day-toc":
          "M35 88h130 M65 70v-35h70v35 M75 35q25 30 50 0",
        "do-suat-dien-dong-e-cua-pin":
          "M35 88h130 M60 70V35h80v35 M80 35v-18 M120 35v-18",
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
  return (
    <Suspense fallback={<main className="flex h-screen items-center justify-center bg-[#f5f1ec] text-sm text-[#6b6b6b]">Đang mở mô phỏng...</main>}>
      <MoPhongHubContent />
    </Suspense>
  );
}

function MoPhongHubContent() {
  const { user, authFetch } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const libraryId = searchParams.get("libraryId");
  const classId = searchParams.get("classId");
  const resourceId = searchParams.get("resourceId");
  const isClassResource = Boolean(classId && resourceId);
  const savedSimulationId = isClassResource ? resourceId : libraryId;
  const [selected, setSelected] = useState<Preset | null>(null);
  const [domainFilter, setDomainFilter] = useState<Set<Domain>>(
    new Set(DOMAINS),
  );
  const [query, setQuery] = useState("");
  const [savingPresetId, setSavingPresetId] = useState<string | null>(null);
  const [savedPresetIds, setSavedPresetIds] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState("");
  const [libraryOpenError, setLibraryOpenError] = useState("");
  const libraryScrollElementRef = useRef<HTMLDivElement | null>(null);
  const savedLibraryScrollTopRef = useRef(0);

  const setLibraryScrollElement = useCallback((element: HTMLDivElement | null) => {
    libraryScrollElementRef.current = element;
    if (element) element.scrollTop = savedLibraryScrollTopRef.current;
  }, []);

  const openPreset = (preset: Preset) => {
    savedLibraryScrollTopRef.current = libraryScrollElementRef.current?.scrollTop ?? 0;
    setSelected(preset);
  };

  // Bản mở từ thư viện hoặc snapshot trong lớp là nội dung đã lưu; không cho lưu chồng thêm bản sao.
  const canSaveToLibrary =
    !savedSimulationId &&
    user?.roles.some((role) => role === "TEACHER" || role === "MODERATOR") === true &&
    user.subject === "PHYSICS";

  useEffect(() => {
    if (!savedSimulationId) return;
    let cancelled = false;
    const contentRequest = isClassResource
      ? getClassResourceLibraryContent(authFetch, classId!, resourceId!)
      : getLibraryContent(authFetch, libraryId!);
    void contentRequest
      .then((content) => {
        const payload = content.payload as { source?: unknown; presetId?: unknown } | undefined;
        if (content.type !== "SIMULATION" || payload?.source !== "physics-preset" || typeof payload.presetId !== "string") {
          if (!cancelled) setLibraryOpenError("Nội dung đã lưu không phải là mô phỏng Vật lý hợp lệ.");
          return;
        }
        const preset = PRESETS.find((item) => item.id === payload.presetId);
        if (preset && !cancelled) setSelected(preset);
        else if (!cancelled) setLibraryOpenError("Không tìm thấy preset của mô phỏng đã lưu.");
      })
      .catch((reason: unknown) => { if (!cancelled) setLibraryOpenError(reason instanceof Error ? reason.message : "Không thể mở mô phỏng đã lưu."); });
    return () => { cancelled = true; };
  }, [authFetch, classId, isClassResource, libraryId, resourceId, savedSimulationId]);

  const saveToLibrary = async (preset: Preset) => {
    if (!canSaveToLibrary || savingPresetId || savedPresetIds.has(preset.id)) return;
    setSavingPresetId(preset.id);
    setSaveError("");
    try {
      await createLibraryContent(authFetch, {
        type: "SIMULATION",
        title: preset.title,
        subject: "PHYSICS",
        grade: preset.grade,
        payload: {
          source: "physics-preset",
          presetId: preset.id,
          kind: preset.kind,
          params: Object.fromEntries(preset.params.map((param) => [param.key, param.default])),
        },
      });
      setSavedPresetIds((ids) => new Set(ids).add(preset.id));
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : "Không thể lưu mô phỏng vào thư viện.");
    } finally {
      setSavingPresetId(null);
    }
  };

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
  const total = presets.length;

  const countInDomain = (d: Domain) =>
    PRESETS.filter((s) => s.domain === d).length;

  const filtered = domainFilter.size < DOMAINS.length;
  // Resolve the stored selection back through PRESETS on every render. During
  // Fast Refresh the state can still contain the previous preset object; using
  // it directly would mix an old dynamic scene with refreshed annotations.
  const currentSelected = selected
    ? PRESETS.find((preset) => preset.id === selected.id) ?? selected
    : null;

  const handleBack = () => {
    if (isClassResource) {
      router.back();
      return;
    }
    if (libraryId) {
      router.push("/library");
      return;
    }
    setSelected(null);
  };

  if (savedSimulationId && !currentSelected && !libraryOpenError) {
    return <main className="flex h-screen items-center justify-center bg-[#f5f1ec] text-sm text-[#6b6b6b]">Đang mở mô phỏng đã lưu...</main>;
  }

  if (currentSelected)
    return <DetailView preset={currentSelected} onBack={handleBack} canSaveToLibrary={canSaveToLibrary} onSaveToLibrary={saveToLibrary} saving={savingPresetId === currentSelected.id} saved={savedPresetIds.has(currentSelected.id)} />;

  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#f5f1ec]">
      <Sidebar activeHref="/mo-phong-vat-ly" />

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header + thanh lọc nằm ngang */}
        <header className="shrink-0 border-b border-[#e8e2d9] bg-white px-8 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="font-libertine text-2xl font-normal text-[#171717]">
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
        <div ref={setLibraryScrollElement} className="min-h-0 flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(saveError || libraryOpenError) && <p className="col-span-full rounded-[12px] border border-[#f3c6bd] bg-[#fff4f1] px-4 py-3 text-[13px] text-[#c2483c]">{saveError || libraryOpenError}</p>}
            {presets.map((sim) => (
              <div
                key={sim.id}
                className="group overflow-hidden rounded-[16px] border border-[#e8e2d9] bg-white text-left shadow-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-[#d97757] hover:shadow-md"
              >
                <button type="button" onClick={() => openPreset(sim)} className="block w-full text-left">
                <div className="aspect-[5/3] w-full overflow-hidden bg-[#0f172a] p-2.5">
                  <div className="relative h-full w-full overflow-hidden rounded-[10px]">
                    <Thumb id={sim.id} />
                    {REVIEWED_SIMULATION_IDS.has(sim.id) && (
                      <span
                        className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm"
                        title="Đã kiểm tra"
                      >
                        <CheckCircle2
                          className="h-4 w-4"
                          strokeWidth={2.5}
                          aria-hidden="true"
                        />
                        <span className="sr-only">Đã kiểm tra</span>
                      </span>
                    )}
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
                {canSaveToLibrary && (
                  <div className="px-5 pb-5">
                    <button type="button" onClick={() => void saveToLibrary(sim)} disabled={savingPresetId === sim.id || savedPresetIds.has(sim.id)} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[10px] border border-[#d8d1c9] text-[12px] font-semibold text-[#4f4943] transition hover:border-[#d97757] hover:text-[#c96545] disabled:cursor-not-allowed disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-700">
                      <BookmarkPlus className="size-3.5" />
                      {savedPresetIds.has(sim.id) ? "Đã lưu vào thư viện" : savingPresetId === sim.id ? "Đang lưu..." : "Lưu vào thư viện cá nhân"}
                    </button>
                  </div>
                )}
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

type VelocityPoint = { time: number; velocity: number };

function PendulumVelocityChart({
  points,
  maximumVelocity,
  windowSeconds,
}: {
  points: VelocityPoint[];
  maximumVelocity: number;
  windowSeconds: number;
}) {
  const width = 280;
  const height = 112;
  const padding = { left: 34, right: 9, top: 10, bottom: 22 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const lastTime = points.at(-1)?.time ?? 0;
  const startTime = Math.max(0, lastTime - windowSeconds);
  const endTime = Math.max(windowSeconds, lastTime);
  const visiblePoints = points.filter((point) => point.time >= startTime);
  const velocityLimit = Math.max(
    0.2,
    maximumVelocity * 1.12,
    ...visiblePoints.map((point) => Math.abs(point.velocity) * 1.08),
  );
  const xOf = (time: number) =>
    padding.left + ((time - startTime) / Math.max(0.001, endTime - startTime)) * plotWidth;
  const yOf = (velocity: number) =>
    padding.top + ((velocityLimit - velocity) / (2 * velocityLimit)) * plotHeight;
  const path = visiblePoints
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${xOf(point.time).toFixed(1)},${yOf(point.velocity).toFixed(1)}`,
    )
    .join(" ");
  const latest = visiblePoints.at(-1);

  return (
    <div className="mt-2 rounded-[10px] border border-[#e8e2d9] bg-[#0f172a] px-2 py-2">
      <div className="mb-1 flex items-center justify-between text-[10px]">
        <span className="font-semibold uppercase tracking-wide text-[#a7f3d0]">
          Đồ thị vận tốc v(t)
        </span>
        <span className="font-sans tabular-nums text-[#cbd5e1]">
          v = {latest?.velocity.toFixed(2) ?? "0.00"} m/s
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[112px] w-full"
        role="img"
        aria-label="Đồ thị vận tốc theo thời gian của con lắc đơn"
      >
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#64748b" />
        <line x1={padding.left} y1={yOf(0)} x2={width - padding.right} y2={yOf(0)} stroke="#94a3b8" />
        <line x1={padding.left} y1={padding.top + plotHeight * 0.25} x2={width - padding.right} y2={padding.top + plotHeight * 0.25} stroke="#334155" strokeDasharray="3 4" />
        <line x1={padding.left} y1={padding.top + plotHeight * 0.75} x2={width - padding.right} y2={padding.top + plotHeight * 0.75} stroke="#334155" strokeDasharray="3 4" />
        {path && <path d={path} fill="none" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}
        {latest && <circle cx={xOf(latest.time)} cy={yOf(latest.velocity)} r="3.2" fill="#f8fafc" stroke="#34d399" strokeWidth="2" />}
        <text x={padding.left - 4} y={padding.top + 4} textAnchor="end" fontSize="8" fill="#94a3b8">{velocityLimit.toFixed(1)}</text>
        <text x={padding.left - 4} y={yOf(0) + 3} textAnchor="end" fontSize="8" fill="#94a3b8">0</text>
        <text x={padding.left - 4} y={height - padding.bottom} textAnchor="end" fontSize="8" fill="#94a3b8">−{velocityLimit.toFixed(1)}</text>
        <text x={padding.left} y={height - 6} fontSize="8" fill="#94a3b8">{startTime.toFixed(1)} s</text>
        <text x={width - padding.right} y={height - 6} textAnchor="end" fontSize="8" fill="#94a3b8">{endTime.toFixed(1)} s</text>
      </svg>
    </div>
  );
}

function LegacyExperimentLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#f5f1ec]">
      <Sidebar activeHref="/mo-phong-vat-ly" />
      <div className="flex h-full min-w-0 flex-1 overflow-hidden">
        {children}
      </div>
    </main>
  );
}
function DetailView({
  preset,
  onBack,
  canSaveToLibrary,
  onSaveToLibrary,
  saving,
  saved,
}: {
  preset: Preset;
  onBack: () => void;
  canSaveToLibrary: boolean;
  onSaveToLibrary: (preset: Preset) => Promise<void>;
  saving: boolean;
  saved: boolean;
}) {
  if (preset.id === "nut-bac-bat-noi-nang-thanh-cong")
    return (
      <LegacyExperimentLayout>
        <CorkExperiment onBack={onBack} />
      </LegacyExperimentLayout>
    );
  if (preset.id === "becquerel-uranium-lam-den-kinh-anh")
    return (
      <LegacyExperimentLayout>
        <BecquerelExperiment onBack={onBack} />
      </LegacyExperimentLayout>
    );
  if (preset.id === "tac-dung-tu-cua-dong-dien-chuong-dien")
    return (
      <LegacyExperimentLayout>
        <ElectricBellExperiment onBack={onBack} />
      </LegacyExperimentLayout>
    );
  if (preset.id === "tac-dung-nhiet-dong-dien-day-sat-dot-giay")
    return (
      <LegacyExperimentLayout>
        <ThermalWireExperiment onBack={onBack} />
      </LegacyExperimentLayout>
    );
  if (preset.id === "dac-trung-va-dien-tro-bong-den-day-toc")
    return (
      <LegacyExperimentLayout>
        <VaCharacteristicExperiment onBack={onBack} />
      </LegacyExperimentLayout>
    );
  if (preset.id === "do-suat-dien-dong-e-cua-pin")
    return (
      <LegacyExperimentLayout>
        <EmfMeasurementExperiment onBack={onBack} />
      </LegacyExperimentLayout>
    );
  if (preset.id === "do-nhiet-dung-rieng-c-cua-nuoc")
    return (
      <LegacyExperimentLayout>
        <WaterCalorimetryExperiment onBack={onBack} />
      </LegacyExperimentLayout>
    );
  if (preset.id === "do-nhiet-nong-chay-rieng-lambda-cua-nuoc-da")
    return (
      <LegacyExperimentLayout>
        <IceFusionExperiment onBack={onBack} />
      </LegacyExperimentLayout>
    );
  if (preset.id === "do-nhiet-hoa-hoi-rieng-l-cua-nuoc")
    return (
      <LegacyExperimentLayout>
        <WaterVaporizationExperiment onBack={onBack} />
      </LegacyExperimentLayout>
    );
  if (preset.kind === "brownian")
    return <BrownianDetailView preset={preset} onBack={onBack} />;
  if (preset.kind === "heating-curve")
    return <HeatingCurveDetailView preset={preset} onBack={onBack} />;
  if (preset.kind === "pendulum-resonance")
    return <PendulumResonanceDetailView preset={preset} onBack={onBack} />;
  if (preset.kind === "heat-transfer")
    return <HeatTransferDetailView preset={preset} onBack={onBack} />;
  if (preset.kind === "isothermal-boyle")
    return <IsothermalBoyleDetailView preset={preset} onBack={onBack} />;
  if (preset.kind === "isobaric-process")
    return <IsobaricProcessDetailView preset={preset} onBack={onBack} />;
  if (preset.kind === "hooke-law")
    return (
      <LegacyExperimentLayout>
        <HookeLawExperiment preset={preset} onBack={onBack} />
      </LegacyExperimentLayout>
    );
  if (preset.kind === "cloud-chamber")
    return <BlackettCloudChamberExperiment preset={preset} onBack={onBack} />;
  if (preset.kind === "magnetic-deflection")
    return <MagneticDeflectionExperiment preset={preset} onBack={onBack} />;
  if (preset.kind === "coulomb-torsion-balance")
    return <CoulombTorsionBalanceExperiment preset={preset} onBack={onBack} />;
  if (preset.kind === "oscilloscope-frequency")
    return <OscilloscopeFrequencyExperiment preset={preset} onBack={onBack} />;
  if (preset.kind === "water-surface-wave")
    return <WaterSurfaceWaveExperiment preset={preset} onBack={onBack} />;
  if (preset.kind === "rutherford-nitrogen")
    return <RutherfordNitrogenExperiment preset={preset} onBack={onBack} />;
  if (preset.kind === "rutherford-scattering")
    return <RutherfordScatteringExperiment preset={preset} onBack={onBack} />;
  if (preset.kind === "electromagnetic-induction")
    return (
      <ElectromagneticInductionExperiment preset={preset} onBack={onBack} />
    );
  return <GenericDetailView preset={preset} onBack={onBack} canSaveToLibrary={canSaveToLibrary} onSaveToLibrary={onSaveToLibrary} saving={saving} saved={saved} />;
}
function GenericDetailView({
  preset,
  onBack,
  canSaveToLibrary,
  onSaveToLibrary,
  saving,
  saved,
}: {
  preset: Preset;
  onBack: () => void;
  canSaveToLibrary: boolean;
  onSaveToLibrary: (preset: Preset) => Promise<void>;
  saving: boolean;
  saved: boolean;
}) {
  const baseParams = Object.fromEntries(
    preset.params.map((p) => [p.key, p.default]),
  );

  const [params, setParams] = useState<Record<string, number>>(baseParams);
  const [tab, setTab] = useState<"params" | "analysis" | "ai">("params");
  const [edited, setEdited] = useState(false);
  const [running, setRunning] = useState(() => !preset.startPaused);
  const [resetSignal, setResetSignal] = useState(0);
  const [speed, setSpeed] = useState(1);

  const [aiState, setAiState] = useState<AiState>("idle");
  const [aiPrompt, setAiPrompt] = useState("");
  const [readout, setReadout] = useState<SceneReadout | null>(null); // tracking từ kernel
  const [velocityHistory, setVelocityHistory] = useState<VelocityPoint[]>([]);

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
    setPrevMark(
      preset.id === "con-lac-don"
        ? null
        : activeMark ?? { seconds: 0, label: "" },
    );
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
  const annotations = useMemo(() => {
    return preset.kind === undefined || preset.kind === "mechanics"
      ? preset.annotations?.(params)
      : undefined;
  }, [params, preset]);
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

  const inclinedValues = useMemo(() => {
    const alpha = params.alpha ?? 25;
    const mass = params.m ?? 2;
    const mu = params.mu ?? 0.2;
    const pull = params.Fk ?? 12;
    const angle = (alpha * Math.PI) / 180;
    const weight = mass * 9.8;
    const normalComponent = weight * Math.cos(angle);
    const slopeComponent = weight * Math.sin(angle);
    const frictionLimit = mu * normalComponent;
    const drive = pull - slopeComponent;
    const frictionSign = drive > 0 ? -1 : drive < 0 ? 1 : 0;
    const friction = Math.min(frictionLimit, Math.abs(drive));
    const net = drive + frictionSign * friction;
    const acceleration = Math.abs(net) / mass;
    const isInclined = preset.id === "mat-nghieng-ma-sat";
    const initialBody = isInclined ? (scene as Scene).bodies.find((body) => body.id === "vat") : undefined;
    const currentBody = isInclined ? readout?.bodies.find((body) => body.id === "vat") : undefined;
    const distance = initialBody && currentBody
      ? Math.hypot(currentBody.x - initialBody.x, currentBody.y - initialBody.y)
      : 0;
    const calculatedSpeed = Math.sqrt(Math.max(0, 2 * acceleration * distance));
    return {
      alpha,
      mass,
      mu,
      pull,
      weight,
      normalComponent,
      slopeComponent,
      frictionLimit,
      friction,
      frictionSign,
      net,
      acceleration,
      distance,
      calculatedSpeed,
    };
  }, [params, preset.id, readout, scene]);

  const pendulumValues = useMemo(
    () => calculateSimplePendulumValues(params),
    [params],
  );

  const springOscillatorValues = useMemo(() => {
    const mass = params.m ?? 1;
    const springConstant = params.k ?? 20;
    const amplitude = params.A ?? 0.4;
    const gravity = params.g ?? 9.8;
    const angularFrequency = Math.sqrt(springConstant / mass);
    return {
      amplitude,
      staticStretch: (mass * gravity) / springConstant,
      angularFrequency,
      period: (2 * Math.PI) / angularFrequency,
      frequency: angularFrequency / (2 * Math.PI),
    };
  }, [params]);

  const handleReadout = (nextReadout: SceneReadout) => {
    setReadout(nextReadout);
    if (preset.id !== "con-lac-don") return;
    const mechanicsScene = scene as Scene;
    const pivot = mechanicsScene.bodies.find((body) => body.id === "pivot");
    const bob = nextReadout.bodies.find((body) => body.id === "bob");
    if (!pivot || !bob) return;
    const radialX = bob.x - pivot.x;
    const radialY = bob.y - pivot.y;
    const radius = Math.hypot(radialX, radialY) || 1;
    const tangentX = -radialY / radius;
    const tangentY = radialX / radius;
    const point = {
      time: nextReadout.time,
      velocity: bob.vx * tangentX + bob.vy * tangentY,
    };

    setVelocityHistory((previous) => {
      const last = previous.at(-1);
      if (last && point.time < last.time - 1e-6) return [point];
      if (last && Math.abs(point.time - last.time) < 1e-6) {
        return [...previous.slice(0, -1), point];
      }
      return [...previous, point]
        .filter((sample) => sample.time >= point.time - 12)
        .slice(-180);
    });
  };

  const markEdited = () => setEdited(true);
  const revertAll = () => {
    setParams(baseParams);
    setEdited(false);
    setAiState("idle");
    setAiPrompt("");
    setRunning(!preset.startPaused);
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
          {canSaveToLibrary && (
            <button type="button" onClick={() => void onSaveToLibrary(preset)} disabled={saving || saved} className="ml-auto inline-flex items-center gap-1.5 rounded-[10px] border border-[#d8d1c9] px-3 py-1.5 text-[12px] font-semibold text-[#4f4943] transition hover:border-[#d97757] hover:text-[#c96545] disabled:cursor-not-allowed disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-700">
              <BookmarkPlus className="size-3.5" />
              {saved ? "Đã lưu" : saving ? "Đang lưu..." : "Lưu vào thư viện"}
            </button>
          )}
          <span
            className={`${canSaveToLibrary ? "" : "ml-auto "}flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${
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
                {preset.id === "dinh-luat-3-newton" ? (
                  <NewtonThirdLawScene
                    params={params}
                    running={running}
                    resetSignal={resetSignal}
                    onRunningChange={setRunning}
                    seekSeconds={activeMark?.seconds}
                    seekToken={seekToken}
                    markLabel={activeMark?.label}
                    speed={speed}
                  />
                ) : preset.id === "dinh-luat-2-newton" ? (
                  <NewtonSecondLawRaceScene
                    params={params}
                    running={running}
                    resetSignal={resetSignal}
                    onRunningChange={setRunning}
                    seekSeconds={activeMark?.seconds}
                    seekToken={seekToken}
                    markLabel={activeMark?.label}
                    speed={speed}
                  />
                ) : preset.kind === "wave" ? (
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
                ) : preset.kind === "electromagnetic-induction" ? (
                  <SceneKonvaElectromagneticInduction
                    scene={scene as ElectromagneticInductionScene}
                    running={running}
                    resetSignal={resetSignal}
                    onRunningChange={setRunning}
                    speed={speed}
                  />
                ) : preset.kind === "variable-current-induction" ? (
                  <SceneKonvaVariableCurrentInduction
                    scene={scene as VariableCurrentInductionScene}
                    running={running}
                    resetSignal={resetSignal}
                    onRunningChange={setRunning}
                    speed={speed}
                  />
                ) : preset.kind === "iron-filings" ? (
                  <SceneKonvaIronFilings
                    scene={scene as IronFilingsScene}
                    running={running}
                    resetSignal={resetSignal}
                    onRunningChange={setRunning}
                    speed={speed}
                  />
                ) : preset.kind === "parallel-current-sheets" ? (
                  <SceneKonvaParallelCurrentSheets
                    scene={scene as ParallelCurrentSheetsScene}
                    running={running}
                    resetSignal={resetSignal}
                    onRunningChange={setRunning}
                    speed={speed}
                  />
                ) : preset.kind === "magnetism" ? (
                  <SceneKonvaMagnetism
                    scene={scene as MagneticScene}
                    running={running}
                    resetSignal={resetSignal}
                    onRunningChange={setRunning}
                    speed={speed}
                  />
                ) : preset.kind === "magnetic-loop" ? (
                  <SceneKonvaMagneticLoop
                    scene={scene as MagneticLoopScene}
                    running={running}
                    resetSignal={resetSignal}
                    onRunningChange={setRunning}
                    seekSeconds={activeMark?.seconds}
                    seekToken={seekToken}
                    markLabel={activeMark?.label}
                    speed={speed}
                  />
                ) : preset.kind === "rotation" ? (
                  <SceneKonvaRotation
                    scene={scene as RotationScene}
                    running={running}
                    resetSignal={resetSignal}
                    onRunningChange={setRunning}
                    seekSeconds={activeMark?.seconds}
                    seekToken={seekToken}
                    markLabel={activeMark?.label}
                    speed={speed}
                  />
                ) : (
                  <SceneKonva2D
                    scene={scene as Scene}
                    running={running}
                    resetSignal={resetSignal}
                    onRunningChange={setRunning}
                    onReadout={handleReadout}
                    seekSeconds={activeMark?.seconds}
                    seekToken={seekToken}
                    markLabel={activeMark?.label}
                    ghostSeconds={
                      preset.id === "con-lac-don"
                        ? null
                        : prevMark?.seconds ?? null
                    }
                    ghostLabel={
                      preset.id === "con-lac-don" ? undefined : prevMark?.label
                    }
                    bodyLabels={bodyLabels}
                    bodySigns={bodySigns}
                    annotations={annotations}
                    bodyColors={
                      preset.kind === undefined || preset.kind === "mechanics"
                        ? preset.bodyColors
                        : undefined
                    }
                    bodyTrails={
                      preset.kind === undefined || preset.kind === "mechanics"
                        ? preset.bodyTrails
                        : undefined
                    }
                    hideBodyCoordinates={
                      preset.kind === undefined || preset.kind === "mechanics"
                        ? preset.hideBodyCoordinates
                        : undefined
                    }
                    minimalOverlay={
                      preset.kind === undefined || preset.kind === "mechanics"
                        ? preset.minimalOverlay
                        : undefined
                    }
                    hideFixedSupportDecoration={
                      preset.kind === undefined || preset.kind === "mechanics"
                        ? preset.hideFixedSupportDecoration
                        : undefined
                    }
                    lockPan={
                      preset.kind === undefined || preset.kind === "mechanics"
                        ? preset.lockPan
                        : undefined
                    }
                    contentScale={
                      preset.id === "dong-nang-the-nang"
                        ? 1.2
                        : preset.id === "con-lac-don"
                          ? 1.1
                          : undefined
                    }
                    minZoom={
                      preset.id === "dong-nang-the-nang" ? 1 : undefined
                    }
                    speed={speed}
                  />
                )}
              </div>

              {/* Floating tool panel */}
              <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
                <div className="pointer-events-auto flex items-center gap-0.5 rounded-[11px] border border-[#e8e2d9] bg-white p-1 shadow-[0_8px_24px_rgba(43,41,38,0.12),0_2px_8px_rgba(43,41,38,0.08)]">
                  <button
                    onClick={() => setRunning((r) => !r)}
                    title={running ? "Tạm dừng" : "Bắt đầu"}
                    className={`flex h-8 w-8 items-center justify-center rounded-[9px] transition-colors duration-150 ease-out ${
                      running
                        ? "bg-[#e8724a] text-white hover:bg-[#d96a42]"
                        : "text-[#4f4943] hover:bg-[#f7f3ee]"
                    }`}
                  >
                    {running ? (
                      <Pause className="h-4 w-4" strokeWidth={2} />
                    ) : (
                      <Play className="h-4 w-4" strokeWidth={2} />
                    )}
                  </button>
                  <div className="mx-0.5 h-4 w-px shrink-0 bg-black/10" />
                  <button
                    onClick={() => {
                      setActiveMark(null);
                      setPrevMark(null);
                      setResetSignal((n) => n + 1);
                      setRunning(!preset.startPaused);
                    }}
                    title="Đặt lại"
                    className="flex h-8 w-8 items-center justify-center rounded-[9px] text-[#4f4943] transition-colors duration-150 ease-out hover:bg-[#f7f3ee]"
                  >
                    <RotateCcw className="h-4 w-4" strokeWidth={2} />
                  </button>
                  <div className="mx-0.5 h-4 w-px shrink-0 bg-black/10" />
                  {/* Tốc độ mô phỏng — chỉ nhân vào dt mỗi khung hình, không đụng độ chính xác. */}
                  <div className="flex items-center gap-0.5 rounded-[9px] bg-[#f5f1ec] p-0.5">
                    {[0.5, 1, 2].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSpeed(s)}
                        title={`Tốc độ ${s}×`}
                        className={`h-6 rounded-[7px] px-1.5 text-[11px] font-semibold transition-colors duration-150 ease-out ${
                          speed === s
                            ? "bg-[#e8724a] text-white"
                            : "text-[#6b6b6b] hover:bg-white hover:text-[#171717]"
                        }`}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>
                </div>
              </div>
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
                          {preset.id === "con-lac-lo-xo" && b.id === "bob"
                            ? "Quả nặng"
                            : b.id}
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
                {preset.id === "con-lac-don" && (
                  <PendulumVelocityChart
                    points={velocityHistory}
                    maximumVelocity={pendulumValues.maximumSpeed}
                    windowSeconds={Math.max(4, pendulumValues.period * 2)}
                  />
                )}
              </div>
            )}
            {/* Tabs */}
            <div className="flex shrink-0 border-b border-[#e8e2d9] px-2">
              {(
                [
                  ["params", "Tham số"],
                  ["analysis", "Phân tích"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`relative px-3 py-3 text-sm font-medium transition-colors duration-150 ease-out ${
                    tab === k
                      ? "text-[#c96545]"
                      : "text-[#6b6b6b] hover:text-[#171717]"
                  }`}
                >
                  {label}
                  {tab === k && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-[#e8724a]" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* TẦNG 1 — tham số (Tweakpane) */}
              {tab === "params" && (
                <div className="space-y-4">
                  <p className="rounded-[10px] bg-[#faf9f7] p-3 text-xs leading-relaxed text-[#6b6b6b]">
                    {preset.id === "mang-cong-galilei" ? (
                      <>
                        <b>Môi trường lí tưởng:</b> bỏ qua hoàn toàn ma sát giữa
                        viên bi và máng; cơ năng của viên bi được bảo toàn.
                      </>
                    ) : preset.id === "quy-tac-moment-dia-tron" ? (
                      <>
                        <b className="text-sky-600">F₁, d₁</b> thuộc bộ quả cân
                        bên phải; <b className="text-amber-600">F₂, d₂</b> thuộc
                        bộ bên trái. Với g = 9,8 m/s²: F = mg và M = Fd.
                      </>
                    ) : preset.id === "mat-nghieng-ma-sat" ? (
                      <>
                        m = <b>{inclinedValues.mass.toFixed(1)} kg</b> · α = <b>{inclinedValues.alpha.toFixed(0)}°</b> · μ = <b>{inclinedValues.mu.toFixed(2)}</b> · Fₖ = <b>{inclinedValues.pull.toFixed(1)} N</b>
                      </>
                    ) : preset.id === "con-lac-don" ? (
                      <>
                        Kéo quả nặng tới một vị trí trên cung <b>B′–O–B</b> rồi thả.
                        Con lắc chuyển động qua <b>O</b>; trọng lực <b className="text-rose-500">P</b>
                        luôn hướng thẳng đứng xuống dưới.
                      </>
                    ) : preset.id === "con-lac-lo-xo" ? (
                      <>
                        Kéo quả nặng theo phương thẳng đứng rồi thả. Đường xanh
                        biểu diễn <b>vị trí cân bằng</b>; biên độ được giới hạn
                        trong khoảng <b>±A</b> để thí nghiệm luôn đúng mô hình.
                      </>
                    ) : (
                      <>
                        Rủi ro <b>bằng 0</b>: chỉ kéo slider, sim do dev build
                        phản hồi tức thì. Dành cho mọi giáo viên.
                      </>
                    )}
                  </p>
                  {preset.id === "mat-nghieng-ma-sat" && (
                    <div className="space-y-2.5 rounded-[12px] border border-[#e8e2d9] bg-[#faf9f7] p-3 font-sans text-[13px] leading-relaxed text-[#2b2926]">
                      <p><b>P = m·g</b> = {inclinedValues.mass.toFixed(1)} × 9,8 = <b>{inclinedValues.weight.toFixed(2)} N</b></p>
                      <p className="text-[#60a5fa]"><b>P₁ = P·cos α</b> = {inclinedValues.weight.toFixed(2)} × cos {inclinedValues.alpha.toFixed(0)}° = <b>{inclinedValues.normalComponent.toFixed(2)} N</b></p>
                      <p className="text-[#c084fc]"><b>N = P₁</b> = <b>{inclinedValues.normalComponent.toFixed(2)} N</b></p>
                      <p className="text-[#f43f5e]"><b>Fₘₛ,max = μ·N</b> = {inclinedValues.mu.toFixed(2)} × {inclinedValues.normalComponent.toFixed(2)} = <b>{inclinedValues.frictionLimit.toFixed(2)} N</b></p>
                      <p className="text-[#e11d48]"><b>Fₘₛ = min(Fₘₛ,max; |Fₖ − P₂|)</b> = <b>{inclinedValues.friction.toFixed(2)} N</b></p>
                      <p className="border-t border-[#e8e2d9] pt-2 text-[#15803d]"><b>ΣFₓ</b> = {inclinedValues.pull.toFixed(2)} − {inclinedValues.slopeComponent.toFixed(2)} {inclinedValues.frictionSign < 0 ? "−" : "+"} {inclinedValues.friction.toFixed(2)} = <b>{inclinedValues.net.toFixed(2)} N</b></p>
                      <p className="text-[#0f766e]"><b>a = |ΣFₓ|/m</b> = {Math.abs(inclinedValues.net).toFixed(2)} ÷ {inclinedValues.mass.toFixed(1)} = <b>{inclinedValues.acceleration.toFixed(2)} m/s²</b></p>
                      <p className="text-[#65a30d]"><b>v = √(2·a·s)</b> = √(2 × {inclinedValues.acceleration.toFixed(2)} × {inclinedValues.distance.toFixed(2)}) = <b>{inclinedValues.calculatedSpeed.toFixed(2)} m/s</b></p>
                    </div>
                  )}
                  {preset.id === "con-lac-don" && (
                    <div className="space-y-2.5 rounded-[12px] border border-[#e8e2d9] bg-[#faf9f7] p-3 font-sans text-[13px] leading-relaxed text-[#2b2926]">
                      <p><b>h = ℓ(1 − cos góc lệch)</b> = <b>{pendulumValues.maximumHeight.toFixed(3)} m</b></p>
                      <p className="text-[#0e7490]"><b>T ≈ 2π√(ℓ/g)</b> = <b>{pendulumValues.period.toFixed(3)} s</b></p>
                      <p className="text-[#7c3aed]"><b>f = 1/T</b> = <b>{pendulumValues.frequency.toFixed(3)} Hz</b></p>
                      <p className="text-[#d97706]"><b>vmax = √(2gh)</b> = <b>{pendulumValues.maximumSpeed.toFixed(2)} m/s</b></p>
                      <p><b>W = mgh</b> = <b>{pendulumValues.mechanicalEnergy.toFixed(3)} J</b></p>
                    </div>
                  )}
                  {preset.id === "con-lac-lo-xo" && (
                    <div className="space-y-2.5 rounded-[12px] border border-[#e8e2d9] bg-[#faf9f7] p-3 font-sans text-[13px] leading-relaxed text-[#2b2926]">
                      <p><b>Δℓ₀ = mg/k</b> = <b>{springOscillatorValues.staticStretch.toFixed(3)} m</b></p>
                      <p className="text-[#0369a1]"><b>ω = √(k/m)</b> = <b>{springOscillatorValues.angularFrequency.toFixed(3)} rad/s</b></p>
                      <p className="text-[#0f766e]"><b>T = 2π√(m/k)</b> = <b>{springOscillatorValues.period.toFixed(3)} s</b></p>
                      <p className="text-[#7c3aed]"><b>f = 1/T</b> = <b>{springOscillatorValues.frequency.toFixed(3)} Hz</b></p>
                      <p className="text-[#c2410c]"><b>vₘₐₓ = Aω</b> = <b>{(springOscillatorValues.amplitude * springOscillatorValues.angularFrequency).toFixed(3)} m/s</b></p>
                    </div>
                  )}
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
                  {preset.id === "dong-nang-the-nang" && (
                    <div className="space-y-2 rounded-[12px] border border-[#e8e2d9] bg-[#faf9f7] p-3">
                      <p className="text-xs font-semibold text-[#171717]">
                        Cách tính động năng – thế năng
                      </p>
                      <div className="space-y-1.5 text-[11px] leading-relaxed text-[#4f4943]">
                        <p>
                          <b className="text-[#171717]">Động năng:</b> Wđ ={" "}
                          <b className="text-[#34d399]">½·m·v²</b> — phụ thuộc vận
                          tốc của tàu.
                        </p>
                        <p>
                          <b className="text-[#171717]">Thế năng:</b> Wt ={" "}
                          <b className="text-[#fbbf24]">m·g·h</b> — phụ thuộc độ
                          cao so với mốc (đoạn ngang trái).
                        </p>
                        <p>
                          <b className="text-[#171717]">Cơ năng:</b> W = Wđ + Wt ={" "}
                          <b className="text-[#a5f3fc]">½·m·v₀²</b> — bảo toàn khi
                          bỏ qua ma sát.
                        </p>
                      </div>
                      {readout && readout.energy && (
                        <div className="mt-1 flex items-center justify-between rounded-[9px] bg-white px-3 py-2 text-[11px]">
                          <span className="font-medium text-[#6b6b6b]">
                            Tại vị trí tàu hiện tại
                          </span>
                          <span className="tabular-nums text-[#2b2926]">
                            Wđ{" "}
                            <b className="text-[#34d399]">
                              {readout.energy.ke.toFixed(2)}
                            </b>{" "}
                            J + Wt{" "}
                            <b className="text-[#fbbf24]">
                              {readout.energy.pe.toFixed(2)}
                            </b>{" "}
                            J = W{" "}
                            <b className="text-[#a5f3fc]">
                              {readout.energy.total.toFixed(2)}
                            </b>{" "}
                            J
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {preset.quickPresets && (
                    <div className="flex flex-wrap gap-1.5">
                      {preset.quickPresets.map((qp) => (
                        <button
                          key={qp.label}
                          type="button"
                          onClick={() => {
                            setParams((prev) => ({ ...prev, ...qp.params }));
                            if (
                              preset.id === "quy-tac-moment-dia-tron" ||
                              preset.id === "mat-nghieng-ma-sat"
                            ) {
                              setRunning(true);
                            } else if (preset.id === "con-lac-don") {
                              setRunning(false);
                            }
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
                        setParams((prev) =>
                          Object.is(prev[key], value)
                            ? prev
                            : { ...prev, [key]: value },
                        );
                        if (
                          preset.id === "quy-tac-moment-dia-tron" ||
                          preset.id === "mat-nghieng-ma-sat"
                        ) {
                          setRunning(true);
                        } else if (preset.id === "con-lac-don") {
                          setRunning(false);
                        } else if (preset.id === "nem-xien") {
                          // Mỗi lần chỉnh thông số đều nạp lại vật ở nòng và chờ
                          // người học chủ động nhấn Bắt đầu để phóng.
                          setRunning(false);
                        }
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
                  showGhostHint={preset.id !== "con-lac-don"}
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
