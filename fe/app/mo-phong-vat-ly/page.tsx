"use client";

/**
 * Hub mô phỏng Vật lý kiểu PhET + tuỳ chỉnh bằng AI.
 *
 * - Render bằng SceneKonva2D (Konva 2D) chạy trên KERNEL THẬT (kernel/*.ts).
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
  ShieldCheck,
  PanelLeft,
  X,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { ParamPanel } from "@/components/simulations/param-panel";
import { LandmarksPanel } from "@/components/simulations/landmarks-panel";
import { PRESETS, type Preset, type Domain } from "@/components/simulations/presets";
import { FLUID_SIMS, type FluidSim } from "@/components/simulations/fluid";
import { FluidDetailView } from "@/components/simulations/fluid/fluid-detail-view";
import type { SceneReadout } from "@/components/simulations/scene-konva-2d";

// Konva chạm DOM → chỉ tải phía client.
const SceneKonva2D = dynamic(
  () => import("@/components/simulations/scene-konva-2d").then((m) => m.SceneKonva2D),
  { ssr: false },
);

/* ─────────────────────────── Dữ liệu catalog ─────────────────────────── */

const DOMAINS: Domain[] = ["Cơ học", "Dao động & Sóng", "Điện & Từ", "Nhiệt & Khí", "Hạt nhân"];

// Lĩnh vực chưa có kernel → hiển thị thẻ disabled để giữ bản đồ chương trình đầy đủ.
type Placeholder = { id: string; title: string; domain: Domain; grade: 10 | 11 | 12; desc: string };
const PLACEHOLDERS: Placeholder[] = [
  { id: "ohm", title: "Định luật Ohm", domain: "Điện & Từ", grade: 11, desc: "Mạch điện cơ bản, khảo sát quan hệ U – I – R." },
  { id: "induction", title: "Cảm ứng điện từ", domain: "Điện & Từ", grade: 12, desc: "Nam châm chuyển động qua cuộn dây sinh dòng cảm ứng." },
  { id: "boyle", title: "Định luật Boyle", domain: "Nhiệt & Khí", grade: 12, desc: "Nén khí đẳng nhiệt, quan sát quan hệ p – V." },
  { id: "decay", title: "Phóng xạ & chu kỳ bán rã", domain: "Hạt nhân", grade: 12, desc: "Mô phỏng phân rã ngẫu nhiên theo thời gian." },
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
    case "luc-tuong-tac-hai-xe":
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
          <line x1="52" y1="72" x2="52" y2="92" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" />
          <path d="M45 84 l7 10 l7 -10" fill="none" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="150" y1="56" x2="150" y2="86" stroke="#f9a8d4" strokeWidth="3" strokeLinecap="round" />
          <path d="M143 78 l7 10 l7 -10" fill="none" stroke="#f9a8d4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M52 62 H100 M100 54 H150" stroke="#64748b" strokeWidth="2" strokeDasharray="5 4" />
          <text x="41" y="30" fontSize="10" fontWeight="700" fill="#60a5fa">m1</text>
          <text x="142" y="30" fontSize="10" fontWeight="700" fill="#f472b6">m2</text>
          <text x="70" y="53" fontSize="10" fill="#93c5fd">d1</text>
          <text x="124" y="51" fontSize="10" fill="#f9a8d4">d2</text>
          <text x="70" y="116" fontSize="11" fontWeight="700" fill="#fbbf24">M = m.g.d</text>
        </>,
      );
    case "luc-can-chat-luu":
      return frame(
        <>
          <path d="M34 18 c14 10 14 24 0 34 c-14 -10 -14 -24 0 -34Z" fill="#60a5fa" />
          <circle cx="96" cy="52" r="10" fill="#f472b6" />
          <rect x="146" y="44" width="28" height="14" rx="3" fill="#fbbf24" />
          <path d="M34 58 V94" stroke="#60a5fa" strokeWidth="2" strokeDasharray="4 4" />
          <path d="M96 68 V96" stroke="#f472b6" strokeWidth="2" strokeDasharray="4 4" />
          <path d="M160 64 V104" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 4" />
          <path d="M22 34 h-12 M48 34 h12 M84 52 h-14 M108 52 h14 M138 51 h-18 M180 51 h10" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          <path d="M28 78 L34 90 L40 78" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M90 76 L96 88 L102 76" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M154 82 L160 94 L166 82" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="20" y1="104" x2="180" y2="104" stroke="#475569" strokeWidth="2" />
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
    case "ong-newton-khong-khi":
      return frame(
        <>
          <rect x="58" y="10" width="84" height="98" rx="20" fill="#111827" stroke="#64748b" strokeWidth="2" />
          <rect x="66" y="18" width="68" height="82" rx="16" fill="#0f172a" stroke="#334155" strokeWidth="1" />
          <line x1="100" y1="24" x2="100" y2="94" stroke="#334155" strokeWidth="1" strokeDasharray="3 4" />
          <circle cx="84" cy="78" r="8" fill="#f472b6" />
          <path d="M113 39 c10 4 13 14 5 22 c-8 -5 -12 -13 -5 -22Z" fill="#a78bfa" />
          <path d="M118 43 c-7 7 -7 11 -3 17" fill="none" stroke="#ddd6fe" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M75 54 L84 66 L93 54" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M108 70 L116 80 L124 70" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="66" y1="94" x2="134" y2="94" stroke="#475569" strokeWidth="2" />
        </>,
      );
    case "ong-newton-chan-khong":
      return frame(
        <>
          <rect x="58" y="10" width="84" height="98" rx="20" fill="#111827" stroke="#64748b" strokeWidth="2" />
          <rect x="66" y="18" width="68" height="82" rx="16" fill="#0f172a" stroke="#334155" strokeWidth="1" />
          <line x1="100" y1="24" x2="100" y2="94" stroke="#334155" strokeWidth="1" strokeDasharray="3 4" />
          <circle cx="84" cy="70" r="8" fill="#f472b6" />
          <path d="M111 61 c10 4 13 14 5 22 c-8 -5 -12 -13 -5 -22Z" fill="#a78bfa" />
          <path d="M116 65 c-7 7 -7 11 -3 17" fill="none" stroke="#ddd6fe" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M75 43 L84 55 L93 43" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M108 43 L116 55 L124 43" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M73 88 H127" fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="66" y1="94" x2="134" y2="94" stroke="#475569" strokeWidth="2" />
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

/* ─────────────────────────── Nút ẩn/hiện thanh điều hướng ─────────────────────────── */

function SidebarToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={collapsed ? "Hiện thanh điều hướng" : "Ẩn thanh điều hướng"}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-150 ease-out ${
        collapsed ? "text-[#6b6b6b] hover:bg-[#f7f3ee]" : "bg-[#f6eadf] text-[#c96545]"
      }`}
    >
      <PanelLeft className="h-[18px] w-[18px]" strokeWidth={2} />
    </button>
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
      <Sidebar collapsed={sidebarCollapsed} activeHref="/mo-phong-vat-ly" />

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header + thanh lọc nằm ngang */}
        <header className="shrink-0 border-b border-[#e8e2d9] bg-white px-8 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <SidebarToggle collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />
              <div>
                <h1 className="text-2xl font-bold text-[#171717]">Thư viện mô phỏng Vật lý</h1>
                <p className="mt-1 text-sm text-[#6b6b6b]">{total} mô phỏng • chọn để xem & tuỳ chỉnh</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#eadfd7] bg-[#fff7f1] px-3.5 py-2 text-[12px] font-medium text-[#c96545]">
              <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={2} />
              Mọi sim đã kiểm duyệt · luôn khôi phục được
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

/* ─────────────────────────── Màn chi tiết + tuỳ chỉnh ─────────────────────────── */

type AiState = "idle" | "thinking" | "review";

function DetailView({ preset, onBack }: { preset: Preset; onBack: () => void }) {
  const baseParams = Object.fromEntries(preset.params.map((p) => [p.key, p.default]));

  const [params, setParams] = useState<Record<string, number>>(baseParams);
  const [tab, setTab] = useState<"params" | "analysis" | "ai">("params");
  const [edited, setEdited] = useState(false);
  const [running, setRunning] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [aiState, setAiState] = useState<AiState>("idle");
  const [aiPrompt, setAiPrompt] = useState("");
  const [readout, setReadout] = useState<SceneReadout | null>(null); // tracking từ kernel

  // "Đi tới mốc thời gian t" — tăng seekToken để yêu cầu renderer nhảy thẳng
  // tới seekSeconds (tích phân xác định từ đầu, không phải tua có hoạt ảnh).
  const [seekSeconds, setSeekSeconds] = useState<number | null>(null);
  const [seekToken, setSeekToken] = useState(0);
  const jumpTo = (seconds: number) => {
    setSeekSeconds(seconds);
    setSeekToken((n) => n + 1);
  };

  // Tầng 2 → tầng 1: tham số hiện tại dựng thành Scene cho kernel.
  const scene = useMemo(() => preset.applyParams(params), [preset, params]);

  const markEdited = () => setEdited(true);
  const revertAll = () => {
    setParams(baseParams);
    setEdited(false);
    setAiState("idle");
    setAiPrompt("");
    setRunning(true);
    setSeekSeconds(null);
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
      <Sidebar collapsed={sidebarCollapsed} activeHref="/mo-phong-vat-ly" />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e8e2d9] bg-white px-4">
          <SidebarToggle collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />
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
          {/* Sim stage */}
          <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-8">
            <div className="w-full">
              <div className="relative">
                <div className="overflow-hidden rounded-[16px] border border-[#e8e2d9] shadow-sm">
                  <SceneKonva2D
                    scene={scene}
                    running={running}
                    resetSignal={resetSignal}
                    onRunningChange={setRunning}
                    onReadout={setReadout}
                    seekSeconds={seekSeconds ?? undefined}
                    seekToken={seekToken}
                  />
                </div>

                {/* Floating tool panel */}
                <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center">
                  <div className="pointer-events-auto flex items-center gap-1 rounded-[14px] border border-[#e8e2d9] bg-white p-1.5 shadow-[0_8px_24px_rgba(43,41,38,0.12),0_2px_8px_rgba(43,41,38,0.08)]">
                    <button
                      onClick={() => setRunning((r) => !r)}
                      title={running ? "Tạm dừng" : "Bắt đầu"}
                      className={`flex h-11 w-11 items-center justify-center rounded-[12px] transition-colors duration-150 ease-out ${
                        running
                          ? "bg-[#e8724a] text-white hover:bg-[#d96a42]"
                          : "text-[#4f4943] hover:bg-[#f7f3ee]"
                      }`}
                    >
                      {running ? (
                        <Pause className="h-5 w-5" strokeWidth={2} />
                      ) : (
                        <Play className="h-5 w-5" strokeWidth={2} />
                      )}
                    </button>
                    <div className="mx-1 h-6 w-px shrink-0 bg-black/10" />
                    <button
                      onClick={() => {
                        setSeekSeconds(null);
                        setResetSignal((n) => n + 1);
                        setRunning(true);
                      }}
                      title="Đặt lại"
                      className="flex h-11 w-11 items-center justify-center rounded-[12px] text-[#4f4943] transition-colors duration-150 ease-out hover:bg-[#f7f3ee]"
                    >
                      <RotateCcw className="h-5 w-5" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-[13px] text-[#6b6b6b]">{preset.objective}</p>
            </div>
          </div>

          {/* Customize panel */}
          <div className="flex w-96 shrink-0 flex-col border-l border-[#e8e2d9] bg-white">
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
                        <td className="py-1 text-right font-mono tabular-nums text-[#2b2926]">{b.x.toFixed(2)}</td>
                        <td className="py-1 text-right font-mono tabular-nums text-[#2b2926]">{b.y.toFixed(2)}</td>
                        <td className="py-1 text-right font-mono tabular-nums text-[#2b2926]">{b.speed.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2 flex items-center justify-between rounded-[10px] bg-[#faf9f7] px-3 py-1.5">
                  <span className="text-xs font-medium text-[#6b6b6b]">Cơ năng</span>
                  <span className="text-xs text-[#4f4943]">
                    <span className="font-mono font-semibold tabular-nums text-[#171717]">
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
                  activeSeconds={seekSeconds}
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

