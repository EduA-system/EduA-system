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
    case "dinh-luat-2-newton":
      return frame(
        <>
          <line x1="20" y1="90" x2="180" y2="90" stroke="#475569" strokeWidth="2" />
          <rect x="58" y="66" width="30" height="24" rx="3" fill="#f472b6" />
          <path d="M96 78 h44" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M132 70 l12 8 l-12 8" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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
    case "roi-tu-do":
      return frame(
        <>
          <line x1="100" y1="20" x2="100" y2="92" stroke="#a78bfa" strokeWidth="2" strokeDasharray="4 4" />
          <circle cx="100" cy="30" r="6" fill="#f472b6" />
          <path d="M94 70 L100 84 L106 70" fill="none" stroke="#34d399" strokeWidth="2" />
          <line x1="40" y1="100" x2="160" y2="100" stroke="#475569" strokeWidth="2" />
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
  const placeholders = PLACEHOLDERS.filter((p) => matches(p.domain, p.title));
  const total = presets.length + placeholders.length;

  const countInDomain = (d: Domain) =>
    PRESETS.filter((s) => s.domain === d).length + PLACEHOLDERS.filter((s) => s.domain === d).length;

  const filtered = domainFilter.size < DOMAINS.length;

  if (selected) return <DetailView preset={selected} onBack={() => setSelected(null)} />;

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
