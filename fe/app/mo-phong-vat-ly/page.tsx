"use client";

/**
 * Hub mô phỏng Vật lý kiểu PhET + tuỳ chỉnh bằng AI.
 *
 * - Render bằng renderer riêng, nhận kết quả từ engine vật lý tương ứng.
 * - Thư viện = các PRESET đã kiểm duyệt (components/simulations/presets/).
 * - Luồng: Thư viện (browse + filter) → chọn sim → tham số / sửa bằng AI.
 * - Tầng AI gọi POST /api/physics-simulations/ai-edit: AI chỉ được đề xuất patch
 *   số cho các tham số đã có (Record<string, number>), backend validate theo
 *   đúng min/max của preset trước khi trả về — bản gốc bất khả xâm phạm, luôn
 *   revert được (xem revertAll).
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
import { useAuth } from "@/lib/auth/AuthContext";
import { editPhysicsSimulation } from "@/lib/api/physics-simulations";
import { createLibraryContent } from "@/lib/library";
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
import { CorkExperiment } from "@/components/simulations/thermodynamics/cork-experiment";
import { HookeLawExperiment } from "@/components/simulations/hooke-law/HookeLawExperiment";
import { calculateSimplePendulumValues } from "@/components/simulations/presets/con-lac-don";
import { Thumb } from "@/components/simulations/shared/simulation-thumb";

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
  "mat-nghieng-ma-sat",
  "dinh-luat-3-newton",
  "do-p-t-bang-luc-ke",
]);

// Lĩnh vực chưa có kernel → hiển thị thẻ disabled để giữ bản đồ chương trình đầy đủ.
type Placeholder = {
  id: string;
  title: string;
  domain: Domain;
  grade: 10 | 11 | 12;
  desc: string;
};
const PLACEHOLDERS: Placeholder[] = [
  { id: "ohm", title: "Định luật Ohm", domain: "Điện & Từ", grade: 11, desc: "Mạch điện cơ bản, khảo sát quan hệ U – I – R." },
  { id: "boyle", title: "Định luật Boyle", domain: "Nhiệt & Khí", grade: 12, desc: "Nén khí đẳng nhiệt, quan sát quan hệ p – V." },
  { id: "decay", title: "Phóng xạ & chu kỳ bán rã", domain: "Hạt nhân", grade: 12, desc: "Mô phỏng phân rã ngẫu nhiên theo thời gian." },
];


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
  // Resolve the stored selection back through PRESETS on every render. During
  // Fast Refresh the state can still contain the previous preset object; using
  // it directly would mix an old dynamic scene with refreshed annotations.
  const currentSelected = selected
    ? PRESETS.find((preset) => preset.id === selected.id) ?? selected
    : null;

  if (currentSelected)
    return <DetailView preset={currentSelected} onBack={() => setSelected(null)} />;

  return (
    <main className="flex h-screen w-full overflow-hidden bg-white">
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
        <span className="font-mono tabular-nums text-[#cbd5e1]">
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
      <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
    </main>
  );
}
function DetailView({
  preset,
  onBack,
}: {
  preset: Preset;
  onBack: () => void;
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
  return <GenericDetailView preset={preset} onBack={onBack} />;
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
  const [running, setRunning] = useState(() => !preset.startPaused);
  const [resetSignal, setResetSignal] = useState(0);
  const [speed, setSpeed] = useState(1);

  const { authFetch } = useAuth();
  const [aiState, setAiState] = useState<AiState>("idle");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiPatch, setAiPatch] = useState<Record<string, number> | null>(null);
  const [aiExplanation, setAiExplanation] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiInfo, setAiInfo] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
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
  const trackingLabels = useMemo(() => {
    if (preset.kind !== undefined && preset.kind !== "mechanics") return undefined;
    return preset.trackingLabels ?? bodyLabels;
  }, [preset, bodyLabels]);
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
    setAiPatch(null);
    setAiError(null);
    setAiInfo(null);
    setRunning(!preset.startPaused);
    setSpeed(1);
    setActiveMark(null);
    setPrevMark(null);
    setResetSignal((n) => n + 1);
  };

  const aiDiffRows = useMemo(() => {
    if (!aiPatch) return [];
    return preset.params
      .filter((p) => aiPatch[p.key] !== undefined)
      .map((p) => ({
        key: p.key,
        label: p.label,
        unit: p.unit,
        oldValue: params[p.key],
        newValue: aiPatch[p.key],
      }));
  }, [aiPatch, params, preset.params]);

  const runAi = async (prompt: string) => {
    setAiPrompt(prompt);
    setAiError(null);
    setAiInfo(null);
    setAiState("thinking");
    try {
      const paramSchema = preset.params.map(
        ({ key, label, min, max, step, unit, description }) => ({
          key,
          label,
          min,
          max,
          step,
          unit,
          description,
        }),
      );
      const res = await editPhysicsSimulation(authFetch, {
        instruction: prompt,
        presetTitle: preset.title,
        paramSchema,
        currentValues: params,
      });
      if (Object.keys(res.params).length === 0) {
        setAiInfo(
          res.explanation ||
            "AI không đề xuất thay đổi tham số nào cho yêu cầu này.",
        );
        setAiState("idle");
        return;
      }
      setAiPatch(res.params);
      setAiExplanation(res.explanation);
      setAiState("review");
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : "Không thể kết nối AI. Vui lòng thử lại.",
      );
      setAiState("idle");
    }
  };
  const applyAi = () => {
    if (!aiPatch) return;
    setParams((prev) => ({ ...prev, ...aiPatch }));
    markEdited();
    setAiState("idle");
    setAiPatch(null);
    setAiPrompt("");
  };
  const cancelAi = () => {
    setAiState("idle");
    setAiPatch(null);
  };

  const saveDraft = async () => {
    setSavingDraft(true);
    setSaveMessage(null);
    try {
      await createLibraryContent(authFetch, {
        type: "SIMULATION",
        title: preset.title,
        subject: "PHYSICS",
        payload: { presetId: preset.id, params },
      });
      setSaveMessage("Đã lưu bản nháp vào thư viện.");
    } catch (err) {
      setSaveMessage(
        err instanceof Error ? err.message : "Không thể lưu vào thư viện.",
      );
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <main className="flex h-screen w-full overflow-hidden bg-white">
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
          <button
            onClick={() => void saveDraft()}
            disabled={savingDraft}
            className="flex items-center gap-1.5 rounded-[10px] bg-[#171717] px-3 py-1.5 text-[12px] font-semibold text-white transition-colors duration-150 ease-out hover:bg-[#2b2b2b] disabled:opacity-40"
          >
            {savingDraft ? "Đang lưu…" : "Lưu vào thư viện"}
          </button>
          {saveMessage && (
            <span className="text-[12px] text-[#6b6b6b]">{saveMessage}</span>
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
                    onReadout={handleReadout}
                    seekSeconds={activeMark?.seconds}
                    seekToken={seekToken}
                    markLabel={activeMark?.label}
                    ghostSeconds={prevMark?.seconds ?? null}
                    ghostLabel={prevMark?.label}
                    bodyLabels={
                      (preset.kind === undefined || preset.kind === "mechanics") && preset.hideBodyLabelsOnCanvas
                        ? undefined
                        : bodyLabels
                    }
                    bodySigns={bodySigns}
                    annotations={annotations}
                    bodyColors={preset.kind === undefined || preset.kind === "mechanics" ? preset.bodyColors : undefined}
                    bodyTrails={preset.kind === undefined || preset.kind === "mechanics" ? preset.bodyTrails : undefined}
                    minimalOverlay={preset.kind === undefined || preset.kind === "mechanics" ? preset.minimalOverlay : undefined}
                    hideCoordinateLabels={preset.kind === undefined || preset.kind === "mechanics" ? preset.hideCoordinateLabels : undefined}
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
                        <td className="py-1 text-left text-[#4f4943]">{trackingLabels?.[b.id] ?? b.id}</td>
                        <td className="py-1 text-right tabular-nums text-[#2b2926]">{b.x.toFixed(2)}</td>
                        <td className="py-1 text-right tabular-nums text-[#2b2926]">{b.y.toFixed(2)}</td>
                        <td className="py-1 text-right tabular-nums text-[#2b2926]">{b.speed.toFixed(2)}</td>
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
                  ["ai", "Sửa bằng AI"],
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
                    {preset.id === "mat-nghieng-ma-sat" ? (
                      <>
                        m = <b>{inclinedValues.mass.toFixed(1)} kg</b> · α = <b>{inclinedValues.alpha.toFixed(0)}°</b> · μ = <b>{inclinedValues.mu.toFixed(2)}</b> · Fₖ = <b>{inclinedValues.pull.toFixed(1)} N</b>
                      </>
                    ) : (
                      preset.paramGuide ?? "Sửa tham số để quan sát mô phỏng thay đổi theo từng đại lượng đầu vào."
                    )}
                  </p>
                  {preset.id === "mat-nghieng-ma-sat" && (
                    <div className="space-y-2.5 rounded-[12px] border border-[#e8e2d9] bg-[#faf9f7] p-3 font-mono text-[13px] leading-relaxed text-[#2b2926]">
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
                    <div className="space-y-2.5 rounded-[12px] border border-[#e8e2d9] bg-[#faf9f7] p-3 font-mono text-[13px] leading-relaxed text-[#2b2926]">
                      <p><b>h = ℓ(1 − cos góc lệch)</b> = <b>{pendulumValues.maximumHeight.toFixed(3)} m</b></p>
                      <p className="text-[#0e7490]"><b>T ≈ 2π√(ℓ/g)</b> = <b>{pendulumValues.period.toFixed(3)} s</b></p>
                      <p className="text-[#7c3aed]"><b>f = 1/T</b> = <b>{pendulumValues.frequency.toFixed(3)} Hz</b></p>
                      <p className="text-[#d97706]"><b>vmax = √(2gh)</b> = <b>{pendulumValues.maximumSpeed.toFixed(2)} m/s</b></p>
                      <p><b>W = mgh</b> = <b>{pendulumValues.mechanicalEnergy.toFixed(3)} J</b></p>
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
                        setParams((prev) => (Object.is(prev[key], value) ? prev : { ...prev, [key]: value }));
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
                  {preset.paramCalculations && (
                    <div className="rounded-[12px] border border-[#e8e2d9] bg-[#faf9f7] p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6b6b6b]">Kết quả tính toán</p>
                      <div className="space-y-3">
                        {preset.paramCalculations(params).map((calculation) => (
                          <div key={calculation.label} className="rounded-[10px] bg-white p-3 shadow-sm">
                            <p className="text-xs font-semibold text-[#2b2926]">{calculation.label}</p>
                            <p className="mt-1 font-mono text-xs text-[#6b6b6b]">{calculation.formula}</p>
                            <p className="mt-1 font-mono text-[11px] leading-relaxed text-[#8a8178]">{calculation.substitution}</p>
                            <p className="mt-1.5 text-sm font-semibold text-[#c96545]">
                              = {calculation.value} {calculation.unit}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
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

              {/* TẦNG 3 — sửa bằng AI (có lưới an toàn: AI chỉ được đề xuất giá
                  trị tham số trong đúng min/max của preset, backend validate
                  lại trước khi trả về; bản gốc luôn khôi phục được). */}
              {tab === "ai" && (
                <div className="space-y-4">
                  <p className="rounded-[10px] bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                    <b>Power user.</b> AI chỉ chỉnh giá trị tham số{" "}
                    <i>trên nền bản gốc đã đúng</i>, luôn nằm trong giới hạn cho
                    phép và luôn khôi phục được.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {[
                      "Tăng vận tốc ban đầu lên gấp đôi",
                      "Giảm ma sát để vật trượt xa hơn",
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
                    onClick={() => void runAi(aiPrompt)}
                    className="w-full rounded-[12px] bg-[#e8724a] py-2.5 text-sm font-semibold text-white transition-colors duration-150 ease-out hover:bg-[#d96a42] disabled:opacity-40"
                  >
                    {aiState === "thinking" ? "AI đang sửa…" : "Gửi cho AI"}
                  </button>

                  {aiError && (
                    <p className="rounded-[10px] bg-red-50 p-3 text-xs text-red-700">
                      {aiError}
                    </p>
                  )}
                  {aiInfo && (
                    <p className="rounded-[10px] bg-slate-50 p-3 text-xs text-slate-600">
                      {aiInfo}
                    </p>
                  )}

                  {aiState === "thinking" && (
                    <div className="space-y-2 rounded-[12px] border border-[#e8e2d9] p-4 text-xs text-[#6b6b6b]">
                      <p className="animate-pulse">↳ Đọc yêu cầu…</p>
                      <p className="animate-pulse">↳ Tính toán tham số mới…</p>
                      <p className="animate-pulse">↳ Kiểm tra giới hạn cho phép…</p>
                    </div>
                  )}

                  {aiState === "review" && (
                    <div className="space-y-3 rounded-[12px] border border-[#e8e2d9] p-4">
                      <p className="text-xs font-semibold text-[#4f4943]">
                        Đề xuất thay đổi
                      </p>
                      <div className="space-y-1.5 rounded-[10px] bg-slate-50 p-3 text-xs">
                        {aiDiffRows.map((row) => (
                          <div
                            key={row.key}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="text-[#6b6b6b]">{row.label}</span>
                            <span className="font-medium text-[#171717]">
                              {row.oldValue} → {row.newValue}
                              {row.unit ? ` ${row.unit}` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                      {aiExplanation && (
                        <div className="flex items-start gap-2 rounded-[10px] bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                          <CheckCircle2
                            className="h-3.5 w-3.5 shrink-0 mt-0.5"
                            strokeWidth={2}
                          />
                          {aiExplanation}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={applyAi}
                          className="flex-1 rounded-[10px] bg-[#e8724a] py-2 text-sm font-semibold text-white transition-colors duration-150 ease-out hover:bg-[#d96a42]"
                        >
                          Áp dụng
                        </button>
                        <button
                          onClick={cancelAi}
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

