/**
 * Ảnh thu nhỏ (SVG) cho từng mô phỏng trong thư viện.
 *
 * Tách khỏi app/mo-phong-vat-ly/page.tsx để dùng chung với /sandbox — file đó
 * vốn dài 5038 dòng mà ~3400 dòng là các nhánh SVG dưới đây.
 *
 * Thuần hàm, không hook và không đụng DOM, nên dùng được ở cả Server lẫn
 * Client Component. `id` là id của preset; id lạ sẽ rơi vào nhánh mặc định.
 */

import type { ReactNode } from "react";

export function Thumb({ id }: { id: string }) {
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
          <text x="58" y="105" fontSize="11" fontWeight="500" fill="#cbd5e1">A</text>
          <text x="132" y="105" fontSize="11" fontWeight="500" fill="#cbd5e1">B</text>
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
          <text x="134" y="96" fontSize="11" fontWeight="500" fill="#34d399">P</text>
          <path d="M72 78 v-24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M65 62 l7 -10 l7 10" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="58" y="58" fontSize="11" fontWeight="500" fill="#60a5fa">T</text>
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
          <text x="66" y="116" fontSize="11" fontWeight="500" fill="#fbbf24">M = m·g·d</text>
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
          <text x="50" y="45" fontSize="10" fontWeight="500" fill="#93c5fd">d₁</text>
          <text x="130" y="45" fontSize="10" fontWeight="500" fill="#f9a8d4">d₂</text>
          <text x="61" y="117" fontSize="10" fontWeight="500" fill="#fbbf24">M₁ = M₂</text>
        </>,
      );
    case "dinh-luat-2-newton":
      return frame(
        <>
          {/* Máng trượt, xe và tấm chắn sáng. */}
          <rect x="18" y="72" width="156" height="10" rx="2" fill="#334155" stroke="#cbd5e1" strokeWidth="1.5" />
          <rect x="24" y="74" width="145" height="2" fill="#dbeafe" />
          <rect x="60" y="55" width="31" height="17" rx="3" fill="#60a5fa" stroke="#1e3a8a" strokeWidth="1.5" />
          <circle cx="67" cy="74" r="5" fill="#111827" stroke="#cbd5e1" strokeWidth="1.5" />
          <circle cx="84" cy="74" r="5" fill="#111827" stroke="#cbd5e1" strokeWidth="1.5" />
          <path d="M71 55 V35" stroke="#cbd5e1" strokeWidth="2" />
          <rect x="71" y="34" width="8" height="14" rx="1" fill="#e2e8f0" />

          {/* Hai cổng quang điện. */}
          <path d="M82 72 V32 M103 72 V32" stroke="#64748b" strokeWidth="3" />
          <rect x="77" y="29" width="10" height="7" rx="2" fill="#2563eb" />
          <rect x="98" y="29" width="10" height="7" rx="2" fill="#2563eb" />
          <path d="M82 43 H103" stroke="#7dd3fc" strokeWidth="1.5" strokeDasharray="3 3" />
          <text x="84" y="52" fontSize="8" fontWeight="500" fill="#7dd3fc">0,5 m</text>

          {/* Dây, ròng rọc và quả nặng. */}
          <path d="M91 63 H168 V101" fill="none" stroke="#cbd5e1" strokeWidth="1.8" />
          <circle cx="168" cy="63" r="9" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2" />
          <circle cx="168" cy="63" r="3" fill="#cbd5e1" />
          <rect x="160" y="96" width="16" height="17" rx="2" fill="#f59e0b" />

          {/* Bộ đo thời gian. */}
          <rect x="89" y="91" width="48" height="24" rx="4" fill="#111827" stroke="#94a3b8" strokeWidth="1.5" />
          <rect x="95" y="98" width="21" height="9" rx="1" fill="#0f3d2e" stroke="#34d399" strokeWidth="1" />
          <text x="98" y="105" fontSize="7" fontFamily="monospace" fill="#86efac">0.000</text>
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
          <text x="30" y="52" fontSize="11" fontWeight="500" fill="#60a5fa">F₁</text>
          {/* F₂ sang phải (cam), dài hơn → hợp lực sang phải */}
          <path d="M116 66 H172" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
          <path d="M163 60 l9 6 l-9 6" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <text x="160" y="52" fontSize="11" fontWeight="500" fill="#f59e0b">F₂</text>
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
    case "mang-cong-galilei":
      return frame(
        <>
          <path d="M28 28 C52 80 76 96 100 96 C128 96 150 72 172 30" fill="none" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
          <path d="M28 28 C52 80 76 96 100 96 C128 96 150 72 172 30" fill="none" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="34" cy="34" r="7" fill="#f472b6" />
          <path d="M42 44 Q70 83 98 94" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 4" />
          <text x="126" y="54" fontSize="11" fontWeight="500" fill="#cbd5e1">h</text>
          <path d="M158 34 V92" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />
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
          <text x="154" y="46" fontSize="11" fontWeight="500" fill="#34d399">Δℓ</text>
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
          <text x="150" y="40" fontSize="10" fontWeight="500" fill="#60a5fa">v</text>
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
          <text x="30" y="18" fontSize="11" fontWeight="500" fill="#34d399">Wt</text>
          <text x="120" y="90" fontSize="11" fontWeight="500" fill="#fbbf24">Wđ</text>
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
    case "bao-toan-co-nang-con-lac":
      return frame(
        <>
          <line x1="60" y1="12" x2="140" y2="12" stroke="#475569" strokeWidth="3" />
          {/* Hai vị trí con lắc: biên (Wt max) và thấp nhất (Wđ max) */}
          <line x1="100" y1="12" x2="150" y2="84" stroke="#94a3b8" strokeWidth="1.5" opacity="0.5" />
          <circle cx="150" cy="84" r="8" fill="#34d399" opacity="0.55" />
          <line x1="100" y1="12" x2="100" y2="100" stroke="#94a3b8" strokeWidth="2" />
          <circle cx="100" cy="100" r="9" fill="#fbbf24" />
          <text x="120" y="72" fontSize="11" fontWeight="500" fill="#34d399">Wt</text>
          <text x="66" y="98" fontSize="11" fontWeight="500" fill="#fbbf24">Wđ</text>
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
    case "phan-tich-luc":
      return frame(
        <>
          <path d="M28 98 L174 98 L174 42 Z" fill="#1e293b" stroke="#475569" strokeWidth="2" />
          <line x1="36" y1="94" x2="166" y2="45" stroke="#86efac" strokeWidth="4" strokeLinecap="round" />
          <rect x="110" y="54" width="28" height="18" rx="3" fill="#86efac" stroke="#14532d" strokeWidth="1.5" transform="rotate(-21 124 63)" />
          <path d="M124 63 v36" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M117 90 l7 10 l7 -10" fill="none" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="132" y="98" fontSize="11" fontWeight="500" fill="#f8fafc">P</text>
          <path d="M124 63 l-17 31" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M105 83 l2 12 l10 -7" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="88" y="93" fontSize="11" fontWeight="500" fill="#fbbf24">P1</text>
          <path d="M124 63 l34 13" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M147 68 l12 8 l-14 2" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="160" y="81" fontSize="11" fontWeight="500" fill="#60a5fa">P2</text>
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
          <path d="M18 30H62M18 30V95H72M138 30H181V95H132" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
          <path d="M62 30H78M122 30H138M72 95H86M116 95H132" fill="none" stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round" />
          <rect x="23" y="43" width="34" height="30" rx="5" fill="#111827" stroke="#94a3b8" strokeWidth="1.5" />
          <path d="M29 62A11 11 0 0 1 51 62" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
          <line x1="40" y1="62" x2="47" y2="52" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" />
          <text x="32" y="70" fontSize="7" fontWeight="500" fill="#e2e8f0">G</text>
          <rect x="78" y="20" width="44" height="36" rx="5" fill="#78350f" stroke="#f59e0b" strokeWidth="1.5" />
          {[84, 90, 96, 104, 110, 116].map((x) => <ellipse key={x} cx={x} cy="38" rx="5" ry="13" fill="none" stroke="#fbbf24" strokeWidth="1.4" />)}
          <rect x="85" y="84" width="32" height="22" rx="4" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
          <rect x="89" y="89" width="24" height="8" rx="2" fill="#14532d" />
          <text x="91" y="96" fontSize="6" fontFamily="monospace" fill="#86efac">6.0 V</text>
          <path d="M84 70C90 58 110 58 116 70M81 76C90 62 110 62 119 76" fill="none" stroke="#38bdf8" strokeWidth="1.2" opacity=".75" />
          <path d="M116 70l4 1l-3 3" fill="none" stroke="#38bdf8" strokeWidth="1.2" />
          <circle cx="151" cy="30" r="3.5" fill="#94a3b8" />
          <circle cx="174" cy="30" r="3.5" fill="#94a3b8" />
          <line x1="151" y1="30" x2="171" y2="21" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
          <text x="157" y="18" fontSize="8" fontWeight="500" fill="#fbbf24">K</text>
          <rect x="139" y="76" width="39" height="19" rx="4" fill="#451a03" stroke="#f59e0b" strokeWidth="1.5" />
          <path d="M145 86h27" stroke="#fb923c" strokeWidth="4" strokeLinecap="round" />
          <path d="M159 72v19" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
          <path d="M155 76l4-5l4 5" fill="none" stroke="#e2e8f0" strokeWidth="1.5" />
        </>,
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
            <g key={y}><line x1="12" y1={y} x2="188" y2={y} stroke="#38bdf8" strokeWidth="1.4" opacity=".62" /><path d={`M181 ${y - 4} l7 4 l-7 4`} fill="none" stroke="#38bdf8" strokeWidth="1.4" /></g>
          ))}
          <path d="M70 26 L62 91 L136 78 L145 17 Z" fill="none" stroke="#f87171" strokeWidth="4" strokeLinejoin="round" />
          <path d="M66 59 l-22 22" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
          <path d="M45 73 l-3 11 l11-3" fill="none" stroke="#fbbf24" strokeWidth="3" />
          <path d="M140 48 l22-22" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
          <path d="M153 28 l11-4 l-4 11" fill="none" stroke="#fbbf24" strokeWidth="3" />
          <text x="55" y="57" fontSize="13" fontWeight="500" fill="#e2e8f0">M</text>
          <text x="171" y="20" fontSize="14" fontWeight="500" fill="#7dd3fc">B</text>
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
