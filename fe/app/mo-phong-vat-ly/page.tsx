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
import {
  Search,
  ChevronLeft,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  X,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { ParamPanel } from "@/components/simulations/shared/param-panel";
import { LandmarksPanel, type JumpMark } from "@/components/simulations/shared/landmarks-panel";
import { PRESETS, type Preset, type Domain } from "@/components/simulations/presets";
import { FLUID_SIMS, type FluidSim } from "@/components/simulations/fluid";
import { FluidDetailView } from "@/components/simulations/fluid/fluid-detail-view";
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

// Konva chạm DOM → chỉ tải phía client.
const SceneKonva2D = dynamic(
  () => import("@/components/simulations/renderers/mechanics/scene-konva-2d").then((m) => m.SceneKonva2D),
  { ssr: false },
);
const SceneKonvaWave2D = dynamic(
  () => import("@/components/simulations/renderers/wave/scene-konva-wave-2d").then((m) => m.SceneKonvaWave2D),
  { ssr: false },
);
const SceneKonvaStringWave = dynamic(
  () => import("@/components/simulations/renderers/string-wave/scene-konva-string-wave").then((m) => m.SceneKonvaStringWave),
  { ssr: false },
);
// Canvas thuần (không Konva) — cần thao tác ImageData trực tiếp cho heatmap.
const SceneCanvasWaveField = dynamic(
  () => import("@/components/simulations/renderers/wave-field/scene-canvas-wave-field").then((m) => m.SceneCanvasWaveField),
  { ssr: false },
);
const SceneKonvaRotation = dynamic(
  () => import("@/components/simulations/renderers/rotation/scene-konva-rotation").then((m) => m.SceneKonvaRotation),
  { ssr: false },
);
const SceneKonvaMagneticLoop = dynamic(
  () => import("@/components/simulations/renderers/magnetic-loop/scene-konva-magnetic-loop").then((m) => m.SceneKonvaMagneticLoop),
  { ssr: false },
);
const SceneKonvaMagnetism = dynamic(
  () => import("@/components/simulations/renderers/magnetism/scene-konva-magnetism").then((m) => m.SceneKonvaMagnetism),
  { ssr: false },
);
const SceneKonvaParallelCurrentSheets = dynamic(
  () => import("@/components/simulations/renderers/parallel-current-sheets/scene-konva-parallel-current-sheets").then((m) => m.SceneKonvaParallelCurrentSheets),
  { ssr: false },
);
const SceneKonvaElectromagneticInduction = dynamic(
  () => import("@/components/simulations/renderers/electromagnetic-induction/scene-konva-electromagnetic-induction").then((m) => m.SceneKonvaElectromagneticInduction),
  { ssr: false },
);
const SceneKonvaVariableCurrentInduction = dynamic(
  () => import("@/components/simulations/renderers/electromagnetic-induction/scene-konva-variable-current-induction").then((m) => m.SceneKonvaVariableCurrentInduction),
  { ssr: false },
);
const SceneKonvaIronFilings = dynamic(
  () => import("@/components/simulations/renderers/iron-filings/scene-konva-iron-filings").then((m) => m.SceneKonvaIronFilings),
  { ssr: false },
);
// Canvas thuần — điện phổ 2 điện tích điểm (đường sức truy vết RK4 thật).
const SceneCanvasPointChargeField = dynamic(
  () =>
    import("@/components/simulations/renderers/point-charge-field/scene-canvas-point-charge-field").then(
      (m) => m.SceneCanvasPointChargeField,
    ),
  { ssr: false },
);

/* ─────────────────────────── Dữ liệu catalog ─────────────────────────── */

const DOMAINS: Domain[] = ["Cơ học", "Dao động & Sóng", "Quang học", "Điện & Từ", "Nhiệt & Khí", "Hạt nhân"];
// Các mô phỏng đã được rà lại sau đợt cập nhật nội dung và trực quan hoá.
const REVIEWED_SIMULATION_IDS = new Set([
  "ong-newton",
  "nem-ngang",
  "nem-xien",
  "tong-hop-hai-luc-cung-phuong",
  "phan-tich-luc",
  "mang-cong-galilei",
  "dinh-luat-2-newton",
  "dinh-luat-3-newton",
  "do-p-t-bang-luc-ke",
]);

// Lĩnh vực chưa có kernel → hiển thị thẻ disabled để giữ bản đồ chương trình đầy đủ.
type Placeholder = { id: string; title: string; domain: Domain; grade: 10 | 11 | 12; desc: string };
const PLACEHOLDERS: Placeholder[] = [
  { id: "ohm", title: "Định luật Ohm", domain: "Điện & Từ", grade: 11, desc: "Mạch điện cơ bản, khảo sát quan hệ U – I – R." },
  { id: "boyle", title: "Định luật Boyle", domain: "Nhiệt & Khí", grade: 12, desc: "Nén khí đẳng nhiệt, quan sát quan hệ p – V." },
  { id: "decay", title: "Phóng xạ & chu kỳ bán rã", domain: "Hạt nhân", grade: 12, desc: "Mô phỏng phân rã ngẫu nhiên theo thời gian." },
];

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
          <line x1="20" y1="90" x2="180" y2="90" stroke="#475569" strokeWidth="2" />
          <rect x="48" y="64" width="30" height="22" rx="3" fill="#60a5fa" />
          <rect x="122" y="64" width="30" height="22" rx="3" fill="#f59e0b" />
          <path d="M78 75 h7 l4 -7 l5 14 l5 -14 l5 14 l5 -7 h13" fill="none" stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M58 48 h-23" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M39 44 l-8 4 l8 4" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M142 48 h23" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M161 44 l8 4 l-8 4" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="58" y="105" fontSize="11" fontWeight="700" fill="#cbd5e1">A</text>
          <text x="132" y="105" fontSize="11" fontWeight="700" fill="#cbd5e1">B</text>
        </>,
      );    case "luc-tuong-tac-hai-xe":
      return frame(
        <>
          <line x1="20" y1="90" x2="180" y2="90" stroke="#475569" strokeWidth="2" />
          <circle cx="58" cy="78" r="12" fill="#60a5fa" />
          <circle cx="132" cy="78" r="12" fill="#f472b6" />
          <path d="M22 78 h26" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
          <path d="M40 69 l11 9 l-11 9" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M74 78 h42" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
          <path d="M88 53 h28" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M108 46 l10 7 l-10 7" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M118 62 h-28" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M98 55 l-10 7 l10 7" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="52" y="103" fontSize="11" fontWeight="700" fill="#cbd5e1">A</text>
          <text x="126" y="103" fontSize="11" fontWeight="700" fill="#cbd5e1">B</text>
        </>,
      );
    case "do-p-t-bang-luc-ke":
      return frame(
        <>
          <line x1="54" y1="18" x2="146" y2="18" stroke="#475569" strokeWidth="3" />
          <rect x="78" y="24" width="44" height="28" rx="6" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
          <path d="M86 42 A14 14 0 0 1 114 42" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <path d="M100 42 L110 34" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="100" y1="52" x2="100" y2="78" stroke="#cbd5e1" strokeWidth="2" />
          <rect x="84" y="78" width="32" height="22" rx="3" fill="#f472b6" />
          <path d="M128 78 v24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M121 94 l7 10 l7 -10" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="134" y="96" fontSize="11" fontWeight="700" fill="#34d399">P</text>
          <path d="M72 78 v-24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M65 62 l7 -10 l7 10" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="58" y="58" fontSize="11" fontWeight="700" fill="#60a5fa">T</text>
        </>,
      );
    case "quy-tac-moment":
      return frame(
        <>
          <g transform="rotate(-6 100 58)">
            <line x1="28" y1="58" x2="172" y2="58" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
            <rect x="42" y="34" width="22" height="22" rx="4" fill="#60a5fa" />
            <rect x="134" y="34" width="30" height="30" rx="4" fill="#f472b6" />
          </g>
          <circle cx="100" cy="58" r="8" fill="#fbbf24" />
          <path d="M100 66 L84 102 H116 Z" fill="#475569" />
          <path d="M52 62 H100 M100 54 H150" stroke="#64748b" strokeWidth="2" strokeDasharray="5 4" />
          <text x="70" y="53" fontSize="10" fill="#93c5fd">d₁</text>
          <text x="124" y="51" fontSize="10" fill="#f9a8d4">d₂</text>
          <text x="66" y="116" fontSize="11" fontWeight="700" fill="#fbbf24">M = m·g·d</text>
        </>,
      );
    case "quy-tac-moment-dia-tron":
      return frame(
        <>
          <circle cx="100" cy="57" r="36" fill="#0c4a6e" opacity="0.45" stroke="#38bdf8" strokeWidth="3" />
          <circle cx="100" cy="57" r="27" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="100" cy="57" r="18" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <path d="M64 57 H136 M100 21 V93 M74 31 L126 83 M126 31 L74 83" stroke="#7dd3fc" strokeWidth="1.5" opacity="0.8" />
          <circle cx="100" cy="57" r="6" fill="#e2e8f0" stroke="#334155" strokeWidth="2" />
          <path d="M73 57 V84 M127 57 V73" stroke="#e2e8f0" strokeWidth="2" />
          <rect x="61" y="84" width="24" height="20" rx="3" fill="#60a5fa" />
          <rect x="115" y="73" width="24" height="20" rx="3" fill="#f472b6" />
          <path d="M56 100 v12 M144 88 v12" stroke="#93c5fd" strokeWidth="2" />
          <path d="M50 107 l6 8 l6 -8 M138 95 l6 8 l6 -8" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="50" y="45" fontSize="10" fontWeight="700" fill="#93c5fd">d₁</text>
          <text x="130" y="45" fontSize="10" fontWeight="700" fill="#f9a8d4">d₂</text>
          <text x="61" y="117" fontSize="10" fontWeight="700" fill="#fbbf24">M₁ = M₂</text>
        </>,
      );
    case "dinh-luat-2-newton":
      return frame(
        <>
          <line x1="20" y1="90" x2="180" y2="90" stroke="#475569" strokeWidth="2" />
          <rect x="58" y="66" width="30" height="24" rx="3" fill="#f472b6" />
          <path d="M96 78 h44" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M132 70 l12 8 l-12 8" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </>,
      );
    case "tong-hop-luc-dong-quy":
      return frame(
        <>
          <circle cx="100" cy="62" r="8" fill="#fbbf24" />
          <line x1="100" y1="62" x2="160" y2="62" stroke="#60a5fa" strokeWidth="2.5" />
          <line x1="100" y1="62" x2="70" y2="28" stroke="#f472b6" strokeWidth="2.5" />
          <line x1="100" y1="62" x2="64" y2="98" stroke="#34d399" strokeWidth="2.5" />
          <rect x="152" y="49" width="34" height="24" rx="6" fill="#111827" stroke="#60a5fa" strokeWidth="2" />
          <rect x="40" y="12" width="36" height="22" rx="6" fill="#111827" stroke="#f472b6" strokeWidth="2" transform="rotate(-28 58 23)" />
          <rect x="34" y="88" width="38" height="22" rx="6" fill="#111827" stroke="#34d399" strokeWidth="2" transform="rotate(35 53 99)" />
          <circle cx="162" cy="61" r="5" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.5" />
          <path d="M162 61 l6 -5" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" />
          <text x="157" y="68" fontSize="8" fontWeight="700" fill="#e2e8f0">10N</text>
          <path d="M112 54 l18 -10" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M112 70 l18 10" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />
          <text x="86" y="116" fontSize="11" fontWeight="700" fill="#fbbf24">ΣF = R</text>
        </>,
      );
    case "tong-hop-hai-luc-cung-phuong":
      return frame(
        <>
          <line x1="20" y1="92" x2="180" y2="92" stroke="#475569" strokeWidth="2" />
          <rect x="86" y="54" width="28" height="24" rx="3" fill="#f472b6" />
          {/* F₁ sang trái (xanh) */}
          <path d="M84 66 H36" fill="none" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
          <path d="M45 60 l-9 6 l9 6" fill="none" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <text x="30" y="52" fontSize="11" fontWeight="700" fill="#60a5fa">F₁</text>
          {/* F₂ sang phải (cam), dài hơn → hợp lực sang phải */}
          <path d="M116 66 H172" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
          <path d="M163 60 l9 6 l-9 6" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <text x="160" y="52" fontSize="11" fontWeight="700" fill="#f59e0b">F₂</text>
        </>,
      );
    case "nem-xien":
      return frame(
        <>
          <path d="M20 100 Q90 5 180 95" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeDasharray="4 4" />
          <circle cx="180" cy="95" r="6" fill="#f472b6" />
          <line x1="20" y1="100" x2="180" y2="100" stroke="#475569" strokeWidth="2" />
        </>,
      );
    case "mang-cong-galilei":
      return frame(
        <>
          <path d="M28 28 C52 80 76 96 100 96 C128 96 150 72 172 30" fill="none" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
          <path d="M28 28 C52 80 76 96 100 96 C128 96 150 72 172 30" fill="none" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="34" cy="34" r="7" fill="#f472b6" />
          <path d="M42 44 Q70 83 98 94" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 4" />
          <text x="126" y="54" fontSize="11" fontWeight="700" fill="#cbd5e1">h</text>
          <path d="M158 34 V92" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />
        </>,
      );
    case "ap-suat-chat-long":
      return frame(
        <>
          {/* Bể nước */}
          <rect x="40" y="24" width="120" height="80" fill="#1d4ed8" opacity="0.35" stroke="#475569" strokeWidth="2" />
          <line x1="40" y1="24" x2="160" y2="24" stroke="#93c5fd" strokeWidth="2" />
          {/* Điểm đo + mũi tên áp suất mọi hướng */}
          <g stroke="#fbbf24" strokeWidth="2" strokeLinecap="round">
            <line x1="100" y1="78" x2="100" y2="64" />
            <line x1="100" y1="78" x2="100" y2="92" />
            <line x1="100" y1="78" x2="86" y2="78" />
            <line x1="100" y1="78" x2="114" y2="78" />
            <line x1="100" y1="78" x2="90" y2="68" />
            <line x1="100" y1="78" x2="110" y2="68" />
            <line x1="100" y1="78" x2="90" y2="88" />
            <line x1="100" y1="78" x2="110" y2="88" />
          </g>
          <circle cx="100" cy="78" r="4" fill="#fbbf24" />
          <text x="44" y="60" fontSize="11" fontWeight="700" fill="#34d399">p = ρgh</text>
        </>,
      );
    case "binh-thong-nhau":
      return frame(
        <>
          {/* Ống chữ U */}
          <path d="M56 24 V96 H144 V24" fill="none" stroke="#475569" strokeWidth="3" />
          <path d="M78 24 V96 H122 V24" fill="none" stroke="#475569" strokeWidth="3" />
          {/* Nước hai nhánh cùng mực */}
          <rect x="56" y="52" width="22" height="44" fill="#1d4ed8" opacity="0.4" />
          <rect x="122" y="52" width="22" height="44" fill="#1d4ed8" opacity="0.4" />
          <rect x="56" y="84" width="88" height="12" fill="#1d4ed8" opacity="0.4" />
          {/* Đường ngang chuẩn nối hai mặt thoáng */}
          <line x1="56" y1="52" x2="144" y2="52" stroke="#34d399" strokeWidth="1.5" strokeDasharray="5 4" />
        </>,
      );
    case "dinh-luat-hooke":
      return frame(
        <>
          <line x1="60" y1="14" x2="140" y2="14" stroke="#475569" strokeWidth="3" />
          {/* Lò xo zig-zag từ giá treo xuống quả cân */}
          <path d="M100 14 l-7 6 l14 7 l-14 7 l14 7 l-14 7 l7 6" fill="none" stroke="#a78bfa" strokeWidth="2" />
          <rect x="86" y="66" width="28" height="22" rx="3" fill="#f472b6" />
          {/* Mũi tên độ giãn Δℓ */}
          <path d="M150 20 V64" stroke="#34d399" strokeWidth="1.5" strokeDasharray="3 3" />
          <text x="154" y="46" fontSize="11" fontWeight="700" fill="#34d399">Δℓ</text>
        </>,
      );
    case "luc-huong-tam":
      return frame(
        <>
          {/* Quỹ đạo tròn */}
          <circle cx="100" cy="60" r="42" fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
          <circle cx="100" cy="60" r="4" fill="#94a3b8" />
          {/* Dây + vật */}
          <line x1="100" y1="60" x2="142" y2="60" stroke="#94a3b8" strokeWidth="2" />
          <circle cx="142" cy="60" r="8" fill="#f472b6" />
          {/* Lực hướng tâm (vào tâm) + vận tốc (tiếp tuyến) */}
          <path d="M138 60 H112" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M120 55 l-8 5 l8 5" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M142 56 V26" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M137 34 l5 -8 l5 8" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="150" y="40" fontSize="10" fontWeight="700" fill="#60a5fa">v</text>
        </>,
      );
    case "mang-bao-toan-co-nang":
      return frame(
        <>
          {/* Máng chữ U đối xứng */}
          <path d="M26 26 C50 96 80 100 100 100 C120 100 150 96 174 26" fill="none" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
          <path d="M26 26 C50 96 80 100 100 100 C120 100 150 96 174 26" fill="none" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
          {/* Bi ở đỉnh trái + ảnh mờ ở đỉnh phải (cùng độ cao) */}
          <circle cx="30" cy="32" r="7" fill="#f472b6" />
          <circle cx="170" cy="32" r="7" fill="#f472b6" opacity="0.4" />
          {/* Đường ngang nét đứt nối hai đỉnh: cùng độ cao → bảo toàn */}
          <path d="M30 32 H170" stroke="#34d399" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x="82" y="24" fontSize="10" fontWeight="700" fill="#34d399">W = const</text>
        </>,
      );
    case "dong-nang-the-nang":
      return frame(
        <>
          {/* Ray: dốc cong xuống rồi chạy ngang (chạy một lần) */}
          <path d="M26 26 C44 92 66 98 92 98 L176 98" fill="none" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
          <path d="M26 26 C44 92 66 98 92 98 L176 98" fill="none" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
          {/* Xe hình hộp ở đỉnh dốc */}
          <rect x="24" y="24" width="15" height="12" rx="2" fill="#f472b6" transform="rotate(-42 31 30)" />
          {/* Nhãn năng lượng: đỉnh = Wt, chân dốc = Wđ */}
          <text x="30" y="18" fontSize="11" fontWeight="700" fill="#34d399">Wt</text>
          <text x="120" y="90" fontSize="11" fontWeight="700" fill="#fbbf24">Wđ</text>
        </>,
      );
    case "nem-ngang":
      return frame(
        <>
          <line x1="24" y1="100" x2="180" y2="100" stroke="#475569" strokeWidth="2" />
          <line x1="34" y1="24" x2="34" y2="100" stroke="#64748b" strokeWidth="3" />
          <line x1="34" y1="24" x2="78" y2="24" stroke="#64748b" strokeWidth="3" />
          <path d="M78 24 Q118 32 160 96" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeDasharray="4 4" />
          <line x1="52" y1="24" x2="52" y2="96" stroke="#60a5fa" strokeWidth="2" strokeDasharray="4 4" />
          <circle cx="78" cy="24" r="6" fill="#f472b6" />
          <circle cx="52" cy="24" r="6" fill="#60a5fa" />
          <path d="M88 24 h28" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M108 17 l10 7 l-10 7" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="160" cy="96" r="6" fill="#f472b6" />
          <circle cx="52" cy="96" r="6" fill="#60a5fa" />
        </>,
      );
    case "roi-tu-do":
      return frame(
        <>
          <line x1="100" y1="20" x2="100" y2="92" stroke="#a78bfa" strokeWidth="2" strokeDasharray="4 4" />
          <circle cx="100" cy="30" r="6" fill="#f472b6" />
          <path d="M94 70 L100 84 L106 70" fill="none" stroke="#34d399" strokeWidth="2" />
          <line x1="40" y1="100" x2="160" y2="100" stroke="#475569" strokeWidth="2" />
        </>,
      );
    case "ong-newton":
      return frame(
        <>
          <rect x="18" y="10" width="76" height="98" rx="16" fill="#111827" stroke="#94a3b8" strokeWidth="2" />
          <rect x="106" y="10" width="76" height="98" rx="16" fill="#111827" stroke="#7dd3fc" strokeWidth="2" />
          <line x1="22" y1="18" x2="90" y2="18" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
          <line x1="110" y1="18" x2="178" y2="18" stroke="#7dd3fc" strokeWidth="3" strokeLinecap="round" />
          <circle cx="43" cy="79" r="7" fill="#94a3b8" stroke="#e2e8f0" strokeWidth="1.5" />
          <image href="/simulations/newton/feather.png" x="57" y="38" width="30" height="30" transform="rotate(-48 72 53)" />
          <circle cx="131" cy="72" r="7" fill="#94a3b8" stroke="#e2e8f0" strokeWidth="1.5" />
          <image href="/simulations/newton/feather.png" x="145" y="57" width="30" height="30" transform="rotate(-48 160 72)" />
          <line x1="22" y1="100" x2="90" y2="100" stroke="#64748b" strokeWidth="4" />
          <line x1="110" y1="100" x2="178" y2="100" stroke="#64748b" strokeWidth="4" />
        </>,
      );
    case "con-lac-don":
      return frame(
        <>
          <line x1="100" y1="12" x2="148" y2="86" stroke="#94a3b8" strokeWidth="2" />
          <circle cx="148" cy="86" r="9" fill="#f472b6" />
          <line x1="60" y1="12" x2="140" y2="12" stroke="#475569" strokeWidth="3" />
          <path d="M100 24 A 64 64 0 0 1 148 86" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="3 3" />
        </>,
      );
    case "bao-toan-co-nang-con-lac":
      return frame(
        <>
          <line x1="60" y1="12" x2="140" y2="12" stroke="#475569" strokeWidth="3" />
          {/* Hai vị trí con lắc: biên (Wt max) và thấp nhất (Wđ max) */}
          <line x1="100" y1="12" x2="150" y2="84" stroke="#94a3b8" strokeWidth="1.5" opacity="0.5" />
          <circle cx="150" cy="84" r="8" fill="#34d399" opacity="0.55" />
          <line x1="100" y1="12" x2="100" y2="100" stroke="#94a3b8" strokeWidth="2" />
          <circle cx="100" cy="100" r="9" fill="#fbbf24" />
          <text x="120" y="72" fontSize="11" fontWeight="700" fill="#34d399">Wt</text>
          <text x="66" y="98" fontSize="11" fontWeight="700" fill="#fbbf24">Wđ</text>
        </>,
      );
    case "con-lac-lo-xo":
      return frame(
        <>
          <line x1="60" y1="20" x2="140" y2="20" stroke="#475569" strokeWidth="3" />
          <path d="M100 20 l-8 6 l16 8 l-16 8 l16 8 l-16 8 l8 6" fill="none" stroke="#a78bfa" strokeWidth="2" />
          <rect x="86" y="78" width="28" height="22" rx="3" fill="#f472b6" />
        </>,
      );
    case "cong-huong-con-lac":
      return frame(
        <>
          <line x1="30" y1="18" x2="170" y2="18" stroke="#475569" strokeWidth="3" />
          <line x1="60" y1="18" x2="86" y2="74" stroke="#94a3b8" strokeWidth="2" />
          <line x1="100" y1="18" x2="100" y2="80" stroke="#94a3b8" strokeWidth="2" />
          <line x1="140" y1="18" x2="140" y2="80" stroke="#94a3b8" strokeWidth="2" />
          <line x1="86" y1="74" x2="100" y2="80" stroke="#34d399" strokeWidth="1.5" strokeDasharray="2 2" />
          <line x1="100" y1="80" x2="140" y2="80" stroke="#34d399" strokeWidth="1.5" strokeDasharray="2 2" />
          <circle cx="86" cy="74" r="7" fill="#f472b6" />
          <circle cx="100" cy="80" r="7" fill="#a78bfa" />
          <circle cx="140" cy="80" r="7" fill="#60a5fa" />
        </>,
      );
    case "dao-dong-tat-dan":
      return frame(
        <path d="M20 60 Q35 20 50 60 T80 60 T110 60 T140 60 T170 60" fill="none" stroke="#a78bfa" strokeWidth="2" />,
      );
    case "phan-tich-luc":
      return frame(
        <>
          <path d="M28 98 L174 98 L174 42 Z" fill="#1e293b" stroke="#475569" strokeWidth="2" />
          <line x1="36" y1="94" x2="166" y2="45" stroke="#86efac" strokeWidth="4" strokeLinecap="round" />
          <rect x="110" y="54" width="28" height="18" rx="3" fill="#86efac" stroke="#14532d" strokeWidth="1.5" transform="rotate(-21 124 63)" />
          <path d="M124 63 v36" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M117 90 l7 10 l7 -10" fill="none" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="132" y="98" fontSize="11" fontWeight="700" fill="#f8fafc">P</text>
          <path d="M124 63 l-17 31" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M105 83 l2 12 l10 -7" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="88" y="93" fontSize="11" fontWeight="700" fill="#fbbf24">P1</text>
          <path d="M124 63 l34 13" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M147 68 l12 8 l-14 2" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="160" y="81" fontSize="11" fontWeight="700" fill="#60a5fa">P2</text>
        </>,
      );
    case "mat-nghieng-ma-sat":
      return frame(
        <>
          <path d="M30 100 L170 100 L170 50 Z" fill="#1e293b" stroke="#475569" strokeWidth="2" />
          <rect x="120" y="58" width="22" height="16" rx="2" fill="#f472b6" transform="rotate(-20 131 66)" />
        </>,
      );
    case "giao-thoa-song-nuoc":
      return frame(
        <>
          {[10, 20, 30, 42].map((r) => (
            <circle key={`a${r}`} cx="80" cy="60" r={r} fill="none" stroke="#475569" strokeWidth="1" />
          ))}
          {[10, 20, 30, 42].map((r) => (
            <circle key={`b${r}`} cx="120" cy="60" r={r} fill="none" stroke="#475569" strokeWidth="1" />
          ))}
          <path d="M100 8 V112" stroke="#f87171" strokeWidth="2" />
          <path d="M124 10 Q145 60 124 110" fill="none" stroke="#f87171" strokeWidth="1.5" />
          <path d="M76 10 Q55 60 76 110" fill="none" stroke="#f87171" strokeWidth="1.5" />
          <path d="M112 10 Q122 60 112 110" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M88 10 Q78 60 88 110" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="3 3" />
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
          <rect x="110" y="8" width="30" height="104" fill="url(#wf-thumb-grad)" opacity="0.85" />
          <circle cx="30" cy="60" r="4" fill="#facc15" />
          <line x1="45" y1="30" x2="45" y2="90" stroke="#334155" strokeWidth="5" />
          <line x1="45" y1="55" x2="105" y2="48" stroke="#f9a8d4" strokeWidth="1" opacity="0.7" />
          <line x1="45" y1="65" x2="105" y2="72" stroke="#f9a8d4" strokeWidth="1" opacity="0.7" />
          <circle cx="105" cy="48" r="3.5" fill="#fef08a" />
          <circle cx="105" cy="72" r="3.5" fill="#fef08a" />
          <line x1="176" y1="10" x2="176" y2="110" stroke="#e2e8f0" strokeWidth="2" />
        </>,
      );
    case "song-tren-day":
      return frame(
        <>
          <path d="M10 60 Q35 20 60 60 T110 60 T160 60 T190 60" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
          <circle cx="60" cy="60" r="6" fill="#facc15" />
          <path d="M20 30 h20" stroke="#e8724a" strokeWidth="2" />
          <path d="M40 30 l-6 -4 m6 4 l-6 4" fill="none" stroke="#e8724a" strokeWidth="2" />
        </>,
      );
    case "song-dung":
      return frame(
        <>
          <line x1="20" y1="60" x2="180" y2="60" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
          <path d="M20 60 Q55 15 90 60 T160 60 T180 60" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
          <path d="M20 60 Q55 105 90 60 T160 60 T180 60" fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
          {[20, 90, 160].map((x) => (
            <circle key={x} cx={x} cy={60} r="4" fill="#94a3b8" />
          ))}
          <rect x="14" y="40" width="8" height="40" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
          <rect x="158" y="40" width="8" height="40" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
        </>,
      );
    case "va-cham-dan-hoi":
    case "va-cham-mem":
      return frame(
        <>
          <line x1="20" y1="86" x2="180" y2="86" stroke="#475569" strokeWidth="2" />
          <circle cx="70" cy="74" r="12" fill="#f472b6" />
          <circle cx="120" cy="74" r="14" fill="#60a5fa" />
          <path d="M86 64 l16 0 m-4 -4 l4 4 l-4 4" fill="none" stroke="#34d399" strokeWidth="2" />
        </>,
      );
    case "nhiem-dien-day":
      return frame(
        <>
          <line x1="70" y1="15" x2="130" y2="15" stroke="#475569" strokeWidth="3" />
          <circle cx="100" cy="15" r="3" fill="#94a3b8" />
          <line x1="100" y1="15" x2="66" y2="86" stroke="#94a3b8" strokeWidth="2" />
          <line x1="100" y1="15" x2="134" y2="86" stroke="#94a3b8" strokeWidth="2" />
          <circle cx="66" cy="86" r="9" fill="#f472b6" />
          <circle cx="134" cy="86" r="9" fill="#f472b6" />
          <text x="61" y="90" fontSize="11" fontWeight="bold" fill="#0f172a">+</text>
          <text x="129" y="90" fontSize="11" fontWeight="bold" fill="#0f172a">+</text>
          <path d="M84 70 L96 70" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
          <path d="M92 66 L96 70 L92 74" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M116 70 L104 70" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
          <path d="M108 66 L104 70 L108 74" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>,
      );
    case "nhiem-dien-hut":
      return frame(
        <>
          <line x1="30" y1="15" x2="70" y2="15" stroke="#475569" strokeWidth="3" />
          <line x1="130" y1="15" x2="170" y2="15" stroke="#475569" strokeWidth="3" />
          <line x1="50" y1="15" x2="50" y2="95" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="150" y1="15" x2="150" y2="95" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="50" y1="15" x2="65" y2="90" stroke="#94a3b8" strokeWidth="2" />
          <line x1="150" y1="15" x2="135" y2="90" stroke="#94a3b8" strokeWidth="2" />
          <circle cx="65" cy="90" r="9" fill="#f472b6" />
          <circle cx="135" cy="90" r="9" fill="#60a5fa" />
          <text x="61" y="110" fontSize="11" fontWeight="bold" fill="#e2e8f0">1</text>
          <text x="131" y="110" fontSize="11" fontWeight="bold" fill="#e2e8f0">2</text>
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
            <path key={d} d={d} fill="none" stroke="#e8724a" strokeWidth="1.5" strokeLinecap="round" />
          ))}
          <circle cx="50" cy="60" r="10" fill="#f87171" stroke="#b91c1c" strokeWidth="1.5" />
          <circle cx="150" cy="60" r="10" fill="#60a5fa" stroke="#1d4ed8" strokeWidth="1.5" />
          <text x="46" y="64" fontSize="12" fontWeight="bold" fill="#ffffff">+</text>
          <text x="146" y="64" fontSize="12" fontWeight="bold" fill="#ffffff">−</text>
        </>,
      );
    case "dien-truong-2-ban-song-song":
      return frame(
        <>
          <line x1="55" y1="15" x2="55" y2="100" stroke="#475569" strokeWidth="3" />
          <line x1="145" y1="15" x2="145" y2="100" stroke="#475569" strokeWidth="3" />
          <text x="47" y="14" fontSize="12" fontWeight="bold" fill="#e2e8f0">+</text>
          <text x="140" y="14" fontSize="12" fontWeight="bold" fill="#e2e8f0">−</text>
          {[40, 60, 80].map((y) => (
            <g key={y}>
              <path d={`M63 ${y} h70`} fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" />
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
          <path d="M87 60 h14" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
          <path d="M97 56 L101 60 L97 64" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>,
      );
    case "tuong-tac-nam-cham-va-kim-nam-cham":
      return frame(
        <>
          <circle cx="132" cy="59" r="31" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
          <path d="M105 59 L132 53 L159 59 L132 65 Z" fill="#dc2626" stroke="#991b1b" strokeWidth="1" />
          <path d="M105 59 L132 53 L132 65 Z" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1" />
          <circle cx="132" cy="59" r="4" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
          <text x="148" y="51" fontSize="10" fontWeight="bold" fill="#dc2626">N</text>
          <text x="108" y="72" fontSize="10" fontWeight="bold" fill="#60a5fa">S</text>
          <rect x="22" y="45" width="60" height="28" rx="4" fill="#2563eb" stroke="#1e3a8a" strokeWidth="2" />
          <path d="M22 45h30v28H22z" fill="#dc2626" />
          <text x="34" y="63" fontSize="13" fontWeight="bold" fill="#fff">N</text>
          <text x="64" y="63" fontSize="13" fontWeight="bold" fill="#fff">S</text>
          <path d="M88 54 C98 43 105 43 113 48" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3 3" />
        </>,
      );
    case "tuong-tac-hai-tam-kim-loai-mang-dong-dien":
      return frame(
        <>
          <rect x="35" y="18" width="130" height="10" rx="2" fill="#b77945" />
          {[65, 135].map((x, index) => (
            <g key={x}>
              <rect x={x - 16} y="25" width="32" height="13" rx="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
              <circle cx={x - 11} cy="31" r="2.5" fill="#f8fafc" stroke="#334155" />
              <circle cx={x + 11} cy="31" r="2.5" fill="#f8fafc" stroke="#334155" />
              <rect x={x - 11} y="38" width="22" height="48" rx="2" fill="#b9c3cc" stroke="#475569" strokeWidth="1.5" />
              <path d={index === 0 ? "M" + x + " 76V48" : "M" + x + " 48V76"} stroke={index === 0 ? "#e11d48" : "#2563eb"} strokeWidth="3" />
              <path d={index === 0 ? "M" + (x - 4) + " 53 L" + x + " 47 L" + (x + 4) + " 53" : "M" + (x - 4) + " 71 L" + x + " 77 L" + (x + 4) + " 71"} fill="none" stroke={index === 0 ? "#e11d48" : "#2563eb"} strokeWidth="2" />
              <rect x={x - 16} y="84" width="32" height="10" rx="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
            </g>
          ))}
          <path d="M91 63 h18" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          <path d="M105 59 l6 4 l-6 4" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
          <rect x="62" y="50" width="76" height="20" rx="3" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.5" />
          <rect x="100" y="50" width="38" height="20" rx="3" fill="#2563eb" />
          <text x="72" y="64" fontSize="10" fontWeight="bold" fill="#fff">N</text>
          <text x="122" y="64" fontSize="10" fontWeight="bold" fill="#fff">S</text>
        </>,
      );
    case "bien-thien-dong-dien-bang-bien-tro-khoa-k":
      return frame(
        <>
          <path d="M31 79V99H94V80M45 79V59" fill="none" stroke="#60a5fa" strokeWidth="2.3" />
          <path d="M94 80V101H166V84M114 84V59" fill="none" stroke="#f87171" strokeWidth="2.3" />
          <rect x="22" y="28" width="38" height="31" rx="5" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
          <path d="M29 48 A12 12 0 0 1 53 48" fill="none" stroke="#64748b" strokeWidth="1.5" />
          <line x1="41" y1="48" x2="49" y2="38" stroke="#ef4444" strokeWidth="2" />
          <rect x="72" y="54" width="48" height="29" rx="4" fill="#8b5e3c" stroke="#5f3c27" strokeWidth="1.5" />
          {[79, 85, 91, 101, 107, 113].map((x) => <ellipse key={x} cx={x} cy="68" rx="5" ry="11" fill="none" stroke="#f59e0b" strokeWidth="1.4" />)}
          <rect x="133" y="27" width="42" height="30" rx="5" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
          <circle cx="144" cy="45" r="4" fill="#2563eb" />
          <circle cx="164" cy="45" r="4" fill="#dc2626" />
          <rect x="128" y="76" width="45" height="17" rx="4" fill="#d7a06b" stroke="#7c4a28" strokeWidth="1.5" />
          <line x1="135" y1="84" x2="166" y2="84" stroke="#b45309" strokeWidth="4" />
          <line x1="149" y1="76" x2="149" y2="91" stroke="#334155" strokeWidth="2" />
        </>,
        "#eef3f7",
      );
    case "cam-ung-dien-tu":
      return frame(
        <>
          <path d="M42 77 C25 60 28 34 58 31 C78 29 83 43 92 48" fill="none" stroke="#60a5fa" strokeWidth="2.5" />
          <path d="M42 82 C27 92 46 104 87 86" fill="none" stroke="#f87171" strokeWidth="2.5" />
          <rect x="28" y="55" width="52" height="33" rx="4" fill="#a56a38" stroke="#d4a574" strokeWidth="1.5" />
          {[36,42,48,54,60,66,72].map((x)=><ellipse key={x} cx={x} cy="71" rx="5" ry="14" fill="none" stroke="#fbbf24" strokeWidth="1.4" />)}
          <path d="M52 25 A27 27 0 0 1 106 25" fill="none" stroke="#cbd5e1" strokeWidth="3" />
          <line x1="79" y1="25" x2="94" y2="9" stroke="#ef4444" strokeWidth="2.5" />
          <circle cx="79" cy="25" r="3.5" fill="#e2e8f0" />
          <rect x="112" y="57" width="60" height="27" rx="3" fill="#2563eb" stroke="#1e3a8a" strokeWidth="1.5" />
          <rect x="112" y="57" width="30" height="27" rx="3" fill="#dc2626" />
          <text x="123" y="75" fontSize="12" fontWeight="bold" fill="#fff">N</text>
          <text x="153" y="75" fontSize="12" fontWeight="bold" fill="#fff">S</text>
          <path d="M105 70 h-14" stroke="#34d399" strokeWidth="2" strokeDasharray="3 2" />
          <path d="M96 66 l-6 4 l6 4" fill="none" stroke="#34d399" strokeWidth="2" />
        </>,
      );
    case "khung-day-quay-trong-tu-truong":
      return frame(
        <>
          {[27, 49, 71, 93].map((y) => (
            <g key={y}><line x1="12" y1={y} x2="188" y2={y} stroke="#1596b8" strokeWidth="1.4" opacity=".6" /><path d={`M181 ${y - 4} l7 4 l-7 4`} fill="none" stroke="#1596b8" strokeWidth="1.4" /></g>
          ))}
          <path d="M70 26 L62 91 L136 78 L145 17 Z" fill="none" stroke="#c8433b" strokeWidth="4" strokeLinejoin="round" />
          <path d="M66 59 l-22 22" stroke="#d92d20" strokeWidth="3" strokeLinecap="round" />
          <path d="M45 73 l-3 11 l11-3" fill="none" stroke="#d92d20" strokeWidth="3" />
          <path d="M140 48 l22-22" stroke="#d92d20" strokeWidth="3" strokeLinecap="round" />
          <path d="M153 28 l11-4 l-4 11" fill="none" stroke="#d92d20" strokeWidth="3" />
          <text x="55" y="57" fontSize="13" fontWeight="700" fill="#17324d">M</text>
          <text x="171" y="20" fontSize="14" fontWeight="700" fill="#1596b8">B</text>
        </>,
        "#f7faf9",
      );
    default: {
      const icons: Record<string, string> = {
        ohm: "M30 60h30l10-25 20 50 10-25h70",
        induction: "M40 40v40M60 40v40M80 40v40M100 40v40",
        boyle: "M60 30h80v60H60z M100 50h0",
        decay: "M40 90 Q70 30 100 60 T160 40",
      };
      return frame(
        <path d={icons[id] ?? "M40 60h120"} fill="none" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" />,
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
      <span className={active ? "text-[11px] text-white/80" : "text-[11px] text-[#b8aea5]"}>{count}</span>
    </button>
  );
}

/* ─────────────────────────── Trang chính ─────────────────────────── */

export default function MoPhongHubPage() {
  const [selected, setSelected] = useState<Preset | null>(null);
  const [selectedFluid, setSelectedFluid] = useState<FluidSim | null>(null);
  const [domainFilter, setDomainFilter] = useState<Set<Domain>>(new Set(DOMAINS));
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
  const fluidSims = FLUID_SIMS.filter((s) => matches(s.domain, s.title));
  const placeholders = PLACEHOLDERS.filter((p) => matches(p.domain, p.title));
  const total = presets.length + fluidSims.length + placeholders.length;

  const countInDomain = (d: Domain) =>
    PRESETS.filter((s) => s.domain === d).length +
    FLUID_SIMS.filter((s) => s.domain === d).length +
    PLACEHOLDERS.filter((s) => s.domain === d).length;

  const filtered = domainFilter.size < DOMAINS.length;

  if (selected) return <DetailView preset={selected} onBack={() => setSelected(null)} />;
  if (selectedFluid) return <FluidDetailView sim={selectedFluid} onBack={() => setSelectedFluid(null)} />;

  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#f5f1ec]">
      <Sidebar activeHref="/mo-phong-vat-ly" />

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header + thanh lọc nằm ngang */}
        <header className="shrink-0 border-b border-[#e8e2d9] bg-white px-8 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="font-libertine text-2xl font-bold text-[#171717]">Thư viện mô phỏng Vật lý</h1>
                <p className="mt-1 text-sm text-[#6b6b6b]">{total} mô phỏng • chọn để xem & tuỳ chỉnh</p>
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
              <Search className="h-5 w-5 shrink-0 text-[#8a8178]" strokeWidth={2} />
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
                  <div className="relative h-full w-full overflow-hidden rounded-[10px]">
                    <Thumb id={sim.id} />
                    {REVIEWED_SIMULATION_IDS.has(sim.id) && (
                      <span
                        className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm"
                        title="Đã kiểm tra"
                      >
                        <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
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
                  <p className="line-clamp-2 text-[12px] leading-relaxed text-[#6b6b6b]">{sim.desc}</p>
                </div>
              </button>
            ))}

            {fluidSims.map((sim) => (
              <button
                key={sim.id}
                onClick={() => setSelectedFluid(sim)}
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
                  <p className="line-clamp-2 text-[12px] leading-relaxed text-[#6b6b6b]">{sim.desc}</p>
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
                  <h3 className="text-[15px] font-semibold text-[#171717]">{sim.title}</h3>
                  <p className="line-clamp-2 text-[12px] leading-relaxed text-[#6b6b6b]">{sim.desc}</p>
                </div>
              </div>
            ))}

            {total === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-[#e8e2d9] bg-white/60 py-16 text-center">
                <p className="text-sm font-medium text-[#171717]">Không tìm thấy mô phỏng phù hợp</p>
                <p className="text-xs text-[#8a8178]">Thử đổi từ khoá tìm kiếm hoặc bỏ bớt bộ lọc lĩnh vực.</p>
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
    <line x1="0" y1="4" x2="20" y2="4" stroke={color} strokeWidth="2" strokeDasharray="4 3" />
  </svg>
);
const lineSwatch = (color: string) => (
  <svg width="20" height="8" viewBox="0 0 20 8">
    <line x1="0" y1="4" x2="20" y2="4" stroke={color} strokeWidth="2" />
  </svg>
);
const dotSwatch = (color: string) => <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />;

function LegendBox({ items }: { items: LegendItem[] }) {
  return (
    <div className="space-y-2 rounded-[10px] border border-[#e8e2d9] bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">Chú thích ký hiệu</p>
      <div className="space-y-1.5">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-2 text-[11px] leading-snug text-[#4f4943]">
            <span className="flex w-5 shrink-0 items-center justify-center">{it.swatch}</span>
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
    { swatch: dashSwatch("#60a5fa"), label: "CT — Cực tiểu (2 sóng ngược pha)" },
    { swatch: dotSwatch("#f472b6"), label: "S1, S2 — nguồn sóng kết hợp" },
    { swatch: dotSwatch("#f87171"), label: "Điểm giao cùng pha (đỉnh gặp đỉnh / đáy gặp đáy)" },
    { swatch: dotSwatch("#60a5fa"), label: "Điểm giao ngược pha (đỉnh gặp đáy)" },
  ];
  return <LegendBox items={items} />;
}

function ElectricFieldLegend() {
  const items: LegendItem[] = [
    { swatch: lineSwatch("#e8724a"), label: "Đường sức điện trường (chiều từ + sang −, đổi chiều nếu đảo cực)" },
    { swatch: dotSwatch("#f87171"), label: "+ — bản tích điện dương" },
    { swatch: dotSwatch("#cbd5e1"), label: "− — bản tích điện âm" },
    { swatch: dotSwatch("#60a5fa"), label: "Hạt mang điện q (kéo được để đặt lại vị trí)" },
    { swatch: lineSwatch("#34d399"), label: "v₀ — vector vận tốc ban đầu" },
  ];
  return <LegendBox items={items} />;
}

function PointChargeFieldLegend({ mode }: { mode: "field-lines" | "spectrum" }) {
  if (mode === "spectrum") {
    return (
      <>
        <LegendBox
          items={[
            { swatch: lineSwatch("#fde68a"), label: "Hạt điện phổ — định hướng theo điện trường tại đó" },
            { swatch: dotSwatch("#f87171"), label: "+ — điện tích dương" },
            { swatch: dotSwatch("#60a5fa"), label: "− — điện tích âm" },
          ]}
        />
        <p className="mt-2 text-[11px] leading-relaxed text-[#8a8178]">
          Các hạt chỉ minh hoạ sự định hướng của vật liệu điện môi theo điện trường, không phải quỹ đạo chuyển động
          của điện tích.
        </p>
      </>
    );
  }
  return (
    <LegendBox
      items={[
        { swatch: lineSwatch("#e8724a"), label: "Đường sức điện — mũi tên luôn hướng từ + sang −" },
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
          { swatch: dotSwatch("#94a3b8"), label: "N — Nút (biên độ luôn bằng 0)" },
          { swatch: dotSwatch("#f59e0b"), label: "B — Bụng (biên độ dao động cực đại ±2A)" },
          { swatch: dashSwatch("#475569"), label: "Đường bao — 2 vị trí biên của dây theo thời gian" },
        ]}
      />
    );
  }
  return (
    <LegendBox
      items={[
        { swatch: dotSwatch("#facc15"), label: "Chấm vàng — 1 phần tử dây (dao động vuông góc phương truyền)" },
        { swatch: lineSwatch("#facc15"), label: "A — vector biên độ" },
        { swatch: lineSwatch("#34d399"), label: "λ — 1 bước sóng" },
        { swatch: lineSwatch("#e8724a"), label: "Mũi tên cam — chiều truyền sóng" },
      ]}
    />
  );
}

/* ─────────────────────────── Màn chi tiết + tuỳ chỉnh ─────────────────────────── */

type AiState = "idle" | "thinking" | "review";

function DetailView({ preset, onBack }: { preset: Preset; onBack: () => void }) {
  const baseParams = Object.fromEntries(preset.params.map((p) => [p.key, p.default]));

  const [params, setParams] = useState<Record<string, number>>(baseParams);
  const [tab, setTab] = useState<"params" | "analysis" | "ai">("params");
  const [edited, setEdited] = useState(false);
  const [running, setRunning] = useState(() => !preset.startPaused);
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
    () => (preset.kind === undefined || preset.kind === "mechanics" ? preset.annotations?.(params) : undefined),
    [preset, params],
  );
  // bodyLabels có thể là object tĩnh HOẶC hàm của params (vd nhãn phản ánh dấu
  // điện tích hiện tại) — memo hoá tương tự `annotations` để tránh cùng lỗi
  // reference-mới-mỗi-render (đối tượng tĩnh vẫn ổn định qua useMemo bình thường).
  const bodyLabels = useMemo(() => {
    if (preset.kind !== undefined && preset.kind !== "mechanics") return undefined;
    const bl = preset.bodyLabels;
    return typeof bl === "function" ? bl(params) : bl;
  }, [preset, params]);
  const bodySigns = useMemo(() => {
    if (preset.kind !== undefined && preset.kind !== "mechanics") return undefined;
    const bs = preset.bodySigns;
    return typeof bs === "function" ? bs(params) : bs;
  }, [preset, params]);

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
          <span className="text-[14px] font-semibold text-[#171717]">{preset.title}</span>
          <span
            className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${
              edited ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
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
                ) : preset.kind === "electromagnetic-induction" ? (
                  <SceneKonvaElectromagneticInduction scene={scene as ElectromagneticInductionScene} running={running} resetSignal={resetSignal} onRunningChange={setRunning} speed={speed} />
                ) : preset.kind === "variable-current-induction" ? (
                  <SceneKonvaVariableCurrentInduction scene={scene as VariableCurrentInductionScene} running={running} resetSignal={resetSignal} onRunningChange={setRunning} speed={speed} />
                ) : preset.kind === "iron-filings" ? (
                  <SceneKonvaIronFilings scene={scene as IronFilingsScene} running={running} resetSignal={resetSignal} onRunningChange={setRunning} speed={speed} />
                ) : preset.kind === "parallel-current-sheets" ? (
                  <SceneKonvaParallelCurrentSheets scene={scene as ParallelCurrentSheetsScene} running={running} resetSignal={resetSignal} onRunningChange={setRunning} speed={speed} />
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
                    onReadout={setReadout}
                    seekSeconds={activeMark?.seconds}
                    seekToken={seekToken}
                    markLabel={activeMark?.label}
                    ghostSeconds={prevMark?.seconds ?? null}
                    ghostLabel={prevMark?.label}
                    bodyLabels={bodyLabels}
                    bodySigns={bodySigns}
                    annotations={annotations}
                    bodyColors={preset.kind === undefined || preset.kind === "mechanics" ? preset.bodyColors : undefined}
                    minimalOverlay={preset.kind === undefined || preset.kind === "mechanics" ? preset.minimalOverlay : undefined}
                    hideFixedSupportDecoration={preset.kind === undefined || preset.kind === "mechanics" ? preset.hideFixedSupportDecoration : undefined}
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
                          speed === s ? "bg-[#e8724a] text-white" : "text-[#6b6b6b] hover:bg-white hover:text-[#171717]"
                        }`}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-3 shrink-0 text-center text-[13px] text-[#6b6b6b]">{preset.objective}</p>
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
                        <td className="py-1 text-left text-[#4f4943]">{b.id}</td>
                        <td className="py-1 text-right tabular-nums text-[#2b2926]">{b.x.toFixed(2)}</td>
                        <td className="py-1 text-right tabular-nums text-[#2b2926]">{b.y.toFixed(2)}</td>
                        <td className="py-1 text-right tabular-nums text-[#2b2926]">{b.speed.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2 flex items-center justify-between rounded-[10px] bg-[#faf9f7] px-3 py-1.5">
                  <span className="text-xs font-medium text-[#6b6b6b]">Cơ năng</span>
                  <span className="text-xs text-[#4f4943]">
                    <span className="font-semibold tabular-nums text-[#171717]">
                      {readout.energy.total.toFixed(1)} J
                    </span>
                    <span className="ml-2 text-[#8a8178]">
                      Wđ {readout.energy.ke.toFixed(1)} + Wt {readout.energy.pe.toFixed(1)}
                    </span>
                  </span>
                </div>
              </div>
            )}
            {/* Tabs */}
            <div className="flex shrink-0 border-b border-[#e8e2d9] px-2">
              {([
                ["params", "Tham số"],
                ["analysis", "Phân tích"],
                ["ai", "Sửa bằng AI"],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`relative px-3 py-3 text-sm font-medium transition-colors duration-150 ease-out ${
                    tab === k ? "text-[#c96545]" : "text-[#6b6b6b] hover:text-[#171717]"
                  }`}
                >
                  {label}
                  {tab === k && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-[#e8724a]" />}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* TẦNG 1 — tham số (Tweakpane) */}
              {tab === "params" && (
                <div className="space-y-4">
                  <p className="rounded-[10px] bg-[#faf9f7] p-3 text-xs leading-relaxed text-[#6b6b6b]">
                    Rủi ro <b>bằng 0</b>: chỉ kéo slider, sim do dev build phản hồi tức thì. Dành cho mọi giáo viên.
                  </p>
                  {preset.kind === "wave" && <WaveLegend />}
                  {preset.kind === "string-wave" && <StringWaveLegend mode={(scene as StringWaveScene).mode} />}
                  {preset.id === "dien-truong-2-ban-song-song" && <ElectricFieldLegend />}
                  {preset.kind === "point-charge-field" && (
                    <PointChargeFieldLegend mode={(scene as PointChargeFieldScene).displayMode} />
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
                    <p className="text-sm text-[#8a8178]">Sim này chưa có tham số (prototype).</p>
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
                    <b>Power user.</b> AI sửa code <i>trên nền bản gốc đã đúng</i>. Có kiểm tra thị giác trước/sau và
                    luôn khôi phục được. (Đây là bản mô phỏng luồng — chưa nối AI thật.)
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {["Thêm vật thứ hai", "Vẽ vector vận tốc theo thời gian thực", "Đổi nền sang lưới toạ độ"].map((ex) => (
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
                      <p className="animate-pulse">↳ Render & chụp ảnh kiểm tra thị giác…</p>
                    </div>
                  )}

                  {aiState === "review" && (
                    <div className="space-y-3 rounded-[12px] border border-[#e8e2d9] p-4">
                      <p className="text-xs font-semibold text-[#4f4943]">Đề xuất thay đổi</p>
                      <pre className="overflow-x-auto rounded-[10px] bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-200">
{`  // + vẽ vector vận tốc tại vị trí vật
+ if (showVector) {
+   ctx.strokeStyle = "#34d399";
+   drawArrow(bx, by, vx, vy);
+ }`}
                      </pre>
                      <div className="flex items-center gap-2 rounded-[10px] bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                        Kiểm tra thị giác: không phát hiện vật ra khung / đè nhau / sai tỉ lệ
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

