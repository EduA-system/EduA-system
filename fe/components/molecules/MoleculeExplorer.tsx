"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Atom, Pause, Play, Save, Search, Sparkles, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { getMoleculeAiBuildDiagnostics, logMoleculeAiBuildResponse } from "@/lib/api/molecule-ai-debug";
import { createLibraryContent, getLibraryContent } from "@/lib/library";
import { getClassResourceLibraryContent } from "@/lib/classroom";
import { findMolecules, MOLECULE_CATALOG } from "./catalog";
import type { Molecule, RenderMode } from "./types";

const MoleculeViewer = dynamic(
  () => import("./MoleculeViewer").then((module) => module.MoleculeViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_45%_38%,#ffffff_0%,#eef7f3_58%,#e4efec_100%)] text-xs text-[#6b6b6b]">
        Đang tải mô phỏng 3D...
      </div>
    ),
  },
);

type Family = "all" | "alkane" | "alkene" | "alkyne";
type MessageTone = "info" | "error";

const FAMILY_LABELS: Record<Family, string> = {
  all: "Tất cả",
  alkane: "Ankan",
  alkene: "Anken",
  alkyne: "Ankin",
};

const ELEMENT_META: Record<string, { label: string; color: string; mass: number }> = {
  H: { label: "Hydro", color: "#f8fafc", mass: 1.008 },
  C: { label: "Carbon", color: "#30343b", mass: 12.011 },
  N: { label: "Nitơ", color: "#3b82f6", mass: 14.007 },
  O: { label: "Oxy", color: "#ef4444", mass: 15.999 },
  F: { label: "Flo", color: "#22c55e", mass: 18.998 },
  P: { label: "Phốt pho", color: "#f97316", mass: 30.974 },
  S: { label: "Lưu huỳnh", color: "#eab308", mass: 32.06 },
  Cl: { label: "Clo", color: "#22c55e", mass: 35.45 },
  Br: { label: "Brom", color: "#9a3412", mass: 79.904 },
  I: { label: "Iốt", color: "#7c3aed", mass: 126.904 },
};

const SUBSCRIPT_DIGITS: Record<string, string> = {
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",
};

function parseFormula(formula: string): Array<{ element: string; count: number }> {
  const normalized = formula.replace(/[₀-₉]/g, (digit) => SUBSCRIPT_DIGITS[digit] ?? digit);
  const composition: Array<{ element: string; count: number }> = [];
  for (const match of normalized.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    const element = match[1];
    if (!ELEMENT_META[element]) continue;
    composition.push({ element, count: Number(match[2] || "1") });
  }
  return composition;
}

function getFamily(molecule: Molecule): Exclude<Family, "all"> | "other" {
  const highestOrder = Math.max(0, ...molecule.bonds.map((bond) => bond.order));
  const carbonOnly = molecule.atoms.every((atom) => atom.element === "C");
  if (!carbonOnly) return "other";
  if (highestOrder === 3) return "alkyne";
  if (highestOrder === 2) return "alkene";
  return "alkane";
}

function getScientificDescription(molecule: Molecule, generatedByAi: boolean): string {
  const family = getFamily(molecule);
  const familyText = family === "alkane"
    ? "ankan"
    : family === "alkene"
      ? "anken"
      : family === "alkyne"
        ? "ankin"
        : "hợp chất";
  const highestOrder = Math.max(0, ...molecule.bonds.map((bond) => bond.order));
  const bondText = highestOrder === 3
    ? "liên kết ba tạo vùng cấu trúc thẳng đặc trưng"
    : highestOrder === 2
      ? "liên kết đôi tạo vùng cấu trúc gần phẳng"
      : "các liên kết đơn cho phép quan sát rõ khung phân tử";
  const sourceText = generatedByAi ? "Mô hình được AI đề xuất và dựng thành cấu trúc 3D." : "Mô hình thuộc danh mục học liệu có sẵn.";
  return `${molecule.name} (${molecule.formula}) là ${familyText}; ${bondText}. ${sourceText}`;
}

export function MoleculeExplorer() {
  const { authFetch, user } = useAuth();
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId");
  const resourceId = searchParams.get("resourceId");
  const readOnlyClassResource = Boolean(classId && resourceId);
  const libraryId = searchParams.get("libraryId");
  const readOnlySavedMolecule = Boolean(libraryId || readOnlyClassResource);
  const savedMoleculeKey = libraryId ?? (readOnlyClassResource ? `${classId}:${resourceId}` : null);
  const backHref = libraryId ? "/library" : readOnlyClassResource
    ? `${user?.role === "STUDENT" ? "/detail-resource" : "/class-detail/resources"}?${new URLSearchParams(user?.role === "STUDENT" ? { classId: classId!, resourceId: resourceId! } : { classId: classId! }).toString()}`
    : null;
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<Family>("all");
  const [molecule, setMolecule] = useState<Molecule>(MOLECULE_CATALOG[1]);
  const [mode, setMode] = useState<RenderMode>("ball-and-stick");
  const [rotating, setRotating] = useState(true);
  const [aiInput, setAiInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFingerprint, setSavedFingerprint] = useState<string | null>(null);
  const [loadedSavedMoleculeKey, setLoadedSavedMoleculeKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("info");
  const [generatedByAi, setGeneratedByAi] = useState(false);

  const choices = useMemo(() => findMolecules(query, family), [query, family]);
  const composition = useMemo(() => parseFormula(molecule.formula), [molecule.formula]);
  const atomCount = useMemo(() => composition.reduce((total, item) => total + item.count, 0), [composition]);
  const molarMass = useMemo(
    () => composition.reduce((total, item) => total + (ELEMENT_META[item.element]?.mass ?? 0) * item.count, 0),
    [composition],
  );
  const bondOrders = useMemo(() => [...new Set(molecule.bonds.map((bond) => bond.order))].sort(), [molecule.bonds]);
  const fingerprint = JSON.stringify({ molecule, mode, rotating });
  const saved = Boolean(libraryId) || savedFingerprint === fingerprint;
  const loadingSavedMolecule = Boolean(savedMoleculeKey && loadedSavedMoleculeKey !== savedMoleculeKey);

  useEffect(() => {
    const id = libraryId;
    if (!id && !readOnlyClassResource) return;
    let cancelled = false;
    void (readOnlyClassResource
      ? getClassResourceLibraryContent(authFetch, classId!, resourceId!)
      : getLibraryContent(authFetch, id!))
      .then((item) => {
        if (cancelled) return;
        const payload = item.payload as { molecule?: Molecule; mode?: RenderMode; rotating?: boolean };
        if (payload?.molecule) setMolecule(payload.molecule);
        if (payload?.mode) setMode(payload.mode);
        if (typeof payload?.rotating === "boolean") setRotating(payload.rotating);
        setMessageTone("info");
        setMessage(readOnlyClassResource ? "Đang xem tài nguyên được chia sẻ trong lớp học." : `Đã mở “${item.title}” từ thư viện.`);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setMessageTone("error");
        setMessage(error instanceof Error ? error.message : "Không thể mở mô phỏng.");
      })
      .finally(() => {
        if (!cancelled) setLoadedSavedMoleculeKey(savedMoleculeKey);
      });
    return () => { cancelled = true; };
  }, [authFetch, classId, libraryId, readOnlyClassResource, resourceId, savedMoleculeKey]);

  function selectMolecule(item: Molecule) {
    setMolecule(item);
    setGeneratedByAi(false);
    setMessage("");
  }

  async function save() {
    if (readOnlySavedMolecule || saving || saved) return;
    setSaving(true);
    try {
      await createLibraryContent(authFetch, {
        type: "SIMULATION",
        title: molecule.name,
        subject: "CHEMISTRY",
        payload: { source: "molecule-explorer", molecule, mode, rotating },
      });
      setSavedFingerprint(fingerprint);
      setMessageTone("info");
      setMessage("Đã lưu mô phỏng vào Thư viện của tôi.");
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Không thể lưu mô phỏng.");
    } finally {
      setSaving(false);
    }
  }

  async function buildWithAi() {
    const input = aiInput.trim();
    if (readOnlySavedMolecule || !input || loading) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/molecules/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const body = await response.json() as Molecule & { message?: string };
      const aiResult = {
        input,
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        body,
      };
      logMoleculeAiBuildResponse(aiResult);
      const diagnostics = getMoleculeAiBuildDiagnostics(aiResult);
      if (!diagnostics.success) throw new Error(diagnostics.userMessage);
      setMolecule(body);
      setGeneratedByAi(true);
      setMessageTone("info");
      setMessage(`Đã tạo mô hình ${body.name}.`);
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Không thể tạo cấu trúc.");
    } finally {
      setLoading(false);
    }
  }

  if (loadingSavedMolecule) {
    return <main className="grid min-h-screen place-items-center bg-[#f5f1ec] text-sm text-[#6b6b6b]">{backHref ? <Link href={backHref} className="inline-flex items-center gap-1.5"><ArrowLeft className="size-4" /> Quay lại</Link> : "Đang mở mô phỏng..."}</main>;
  }

  return (
    <div className="grid min-h-screen grid-cols-1 overflow-hidden bg-[#f5f1ec] font-sans text-[#1f1f1f] md:grid-cols-[210px_minmax(0,1fr)] xl:h-screen xl:grid-cols-[210px_minmax(0,1fr)_240px]">
      <aside className="flex min-h-0 flex-col border-b border-[#e1dad2] py-4 md:border-b-0 md:border-r xl:h-screen">
        <div className="px-3.5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#d97757]">
            <Atom className="size-3.5" /> Phòng thí nghiệm số
          </div>
          <h1 className="font-libertine mt-2.5 text-[32px] font-normal leading-[0.92] tracking-[-0.025em]">Cấu tạo chất</h1>
          <p className="mt-2 text-[12px] leading-5 text-[#746d65]">Khám phá cấu trúc phân tử bằng mô hình 3D trực quan.</p>
        </div>

        <div className="px-3 pb-3 pt-4">
          <label htmlFor="molecule-ai-input" className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#d97757]">Tạo bằng AI</label>
          <div className="mt-2 flex h-10 items-center rounded-[13px] border border-[#ded7ce] bg-white px-3 shadow-sm focus-within:border-[#d97757] focus-within:ring-2 focus-within:ring-[#d97757]/10">
            <Sparkles className="mr-2 size-3.5 shrink-0 text-[#d97757]" />
            <input
              id="molecule-ai-input"
              value={aiInput}
              disabled={readOnlySavedMolecule}
              onChange={(event) => setAiInput(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") void buildWithAi(); }}
              placeholder={readOnlySavedMolecule ? "Chế độ chỉ xem" : "Tên hoặc công thức"}
              className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#1f1f1f]/40 disabled:cursor-not-allowed"
            />
          </div>
          <button
            type="button"
            onClick={() => void buildWithAi()}
            disabled={readOnlySavedMolecule || loading || !aiInput.trim()}
            className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[13px] bg-[#d97757] text-[13px] font-semibold text-white shadow-sm transition-[transform,background-color] hover:bg-[#c86748] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#e8e2da] disabled:text-[#aaa29a]"
          >
            <Sparkles className={`size-3.5 ${loading ? "animate-pulse" : ""}`} />
            {loading ? "Đang dựng phân tử..." : "Tạo phân tử"}
          </button>
        </div>

        <div className="px-3 pb-2.5">
          <label className="flex h-10 items-center gap-2 rounded-[13px] border border-[#ded7ce] bg-white px-3 shadow-sm focus-within:border-[#1f1f1f]/40">
            <Search className="size-3.5 shrink-0 text-[#8c857d]" />
            <span className="sr-only">Tìm kiếm phân tử</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm etan, C2H6..." className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#1f1f1f]/40" />
            {query ? (
              <button type="button" onClick={() => setQuery("")} className="rounded-md p-1 text-[#8c857d] hover:bg-[#f0ece7]" aria-label="Xóa nội dung tìm kiếm">
                <X className="size-3.5" />
              </button>
            ) : null}
          </label>
        </div>

        <div className="mx-3 grid grid-cols-3 gap-1 rounded-[10px] bg-[#eee9e3] p-1">
          {(["alkane", "alkene", "alkyne"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFamily((current) => current === item ? "all" : item)}
              aria-pressed={family === item}
              className={`rounded-[7px] px-1.5 py-1.5 text-[11px] font-medium transition-colors ${family === item ? "bg-[#1f1f1f] text-white shadow-sm" : "text-[#6b6b6b] hover:bg-white/70"}`}
            >
              {FAMILY_LABELS[item]}
            </button>
          ))}
        </div>

        <div className="mt-2.5 max-h-64 min-h-0 flex-1 overflow-y-auto px-1.5 md:max-h-none">
          {choices.length > 0 ? choices.map((item) => {
            const active = molecule.name === item.name && !generatedByAi;
            return (
              <button
                key={`${item.name}-${item.formula}`}
                type="button"
                onClick={() => selectMolecule(item)}
                className={`my-px flex w-full items-center justify-between gap-2 rounded-xl border-l-[3px] px-3 py-2 text-left transition-colors ${active ? "border-[#d97757] bg-white text-[#1f1f1f] shadow-sm" : "border-transparent text-[#625c55] hover:bg-white/70"}`}
              >
                <span className="truncate text-[13px] font-medium">{item.name}</span>
                <span className="shrink-0 text-[11px] text-[#8b847c]">{item.formula}</span>
              </button>
            );
          }) : (
            <div className="rounded-xl border border-dashed border-[#d8d1c9] px-4 py-8 text-center text-xs text-[#817970]">Không tìm thấy phân tử phù hợp.</div>
          )}
        </div>
      </aside>

      <main className="min-h-0 min-w-0 p-2 sm:p-2.5 md:p-3 xl:h-screen">
        <section className="relative flex min-h-[600px] flex-col overflow-hidden rounded-[14px] bg-white shadow-[0_1px_10px_rgba(0,0,0,0.06)] xl:h-full xl:min-h-0">
          <header className="relative z-10 flex flex-col gap-2.5 border-b border-[#eee9e3] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h2 className="truncate text-[22px] font-bold tracking-[-0.02em]">{molecule.name}</h2>
                <span className="text-[15px] text-[#746d65]">{molecule.formula}</span>
                {generatedByAi ? <span className="rounded-full bg-[#fff1eb] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#b85b3d]">AI tạo</span> : null}
              </div>
              <p className="mt-1 text-[11px] text-[#8a827a]">Kéo để xoay · cuộn để phóng to · chuột phải để di chuyển</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-[11px] bg-[#f2eee9] p-[3px]">
                <button type="button" onClick={() => setMode("ball-and-stick")} aria-pressed={mode === "ball-and-stick"} className={`rounded-[8px] px-3 py-1.5 text-[11px] font-medium transition-colors ${mode === "ball-and-stick" ? "bg-[#1f1f1f] text-white shadow-sm" : "text-[#6b6b6b]"}`}>Ball &amp; Stick</button>
                <button type="button" onClick={() => setMode("space-filling")} aria-pressed={mode === "space-filling"} className={`rounded-[8px] px-3 py-1.5 text-[11px] font-medium transition-colors ${mode === "space-filling" ? "bg-[#1f1f1f] text-white shadow-sm" : "text-[#6b6b6b]"}`}>Space Fill</button>
              </div>
              <button type="button" onClick={() => setRotating((value) => !value)} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#ded7ce] px-3 text-[11px] font-medium text-[#554f49] transition-colors hover:bg-[#f5f1ec]">
                {rotating ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                {rotating ? "Dừng" : "Tự xoay"}
              </button>
              {!readOnlySavedMolecule ? (
                <button type="button" disabled={saving || saved} onClick={() => void save()} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-[#d97757] px-3.5 text-[11px] font-semibold text-white transition-[transform,background-color] hover:bg-[#c86748] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#e8e2da] disabled:text-[#aaa29a]">
                  <Save className="size-3.5" /> {saving ? "Đang lưu..." : saved ? "Đã lưu" : "Lưu vào thư viện"}
                </button>
              ) : (
                <span className="inline-flex h-9 items-center rounded-[10px] bg-[#eee9e3] px-3 text-[11px] font-medium text-[#746d65]">Chỉ xem</span>
              )}
            </div>
          </header>

          <div className="relative min-h-[500px] flex-1">
            <MoleculeViewer molecule={molecule} mode={mode} rotating={rotating} theme="light" />
            <div className="pointer-events-none absolute bottom-4 left-4 rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-[10px] text-[#746d65] shadow-sm backdrop-blur-md">
              Mô hình minh họa phục vụ học tập
            </div>
          </div>

          {message ? (
            <div className={`absolute bottom-4 left-1/2 z-20 max-w-[calc(100%-32px)] -translate-x-1/2 rounded-xl border px-4 py-2.5 text-center text-xs shadow-lg backdrop-blur-md ${messageTone === "error" ? "border-red-200 bg-red-50/95 text-red-700" : "border-[#efc4b3] bg-[#fff8f4]/95 text-[#9c563b]"}`} role="status">
              {message}
            </div>
          ) : null}
        </section>
      </main>

      <aside className="min-h-0 border-t border-[#e1dad2] p-3 md:col-start-2 md:grid md:grid-cols-2 md:gap-2 md:border-t xl:col-start-auto xl:block xl:h-screen xl:overflow-y-auto xl:border-l xl:border-t-0">
        <InfoCard title="Thông tin phân tử">
          <InfoRow label="Công thức phân tử" value={molecule.formula} />
          <InfoRow label="Khối lượng mol" value={molarMass > 0 ? `${molarMass.toFixed(2)} g/mol` : "Chưa xác định"} />
          <InfoRow label="Tổng số nguyên tử" value={atomCount > 0 ? String(atomCount) : "Chưa xác định"} last />
        </InfoCard>

        <InfoCard title="Thành phần nguyên tử">
          {composition.length > 0 ? (
            <div className="space-y-2.5">
              {composition.map(({ element, count }) => (
                <div key={element} className="flex items-center justify-between text-[13px]">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="size-3.5 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: ELEMENT_META[element]?.color }} />
                    <span className="truncate">{ELEMENT_META[element]?.label ?? element}</span>
                  </span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          ) : <p className="text-[12px] text-[#817970]">Chưa có dữ liệu thành phần.</p>}
        </InfoCard>

        <InfoCard title="Liên kết trong mô hình">
          {bondOrders.length > 0 ? (
            <div className="space-y-2.5">
              {bondOrders.map((order) => <BondLegend key={order} order={order} />)}
            </div>
          ) : <p className="text-[12px] leading-5 text-[#817970]">Mô hình hiện tại không có dữ liệu liên kết giữa các nguyên tử nặng.</p>}
        </InfoCard>

        <InfoCard title="Mô tả khoa học" className="md:col-span-2 xl:col-span-1">
          <p className="text-[13px] leading-[1.65] text-[#544e48]">{getScientificDescription(molecule, generatedByAi)}</p>
        </InfoCard>
      </aside>
    </div>
  );
}

function InfoCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`mb-2 rounded-[13px] bg-white p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.055)] ${className}`}>
      <h3 className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#766f67]">{title}</h3>
      {children}
    </section>
  );
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <dl className={last ? "" : "mb-3 border-b border-[#eee9e3] pb-3"}>
      <dt className="text-[10px] uppercase tracking-[0.08em] text-[#8b847c]">{label}</dt>
      <dd className="mt-1 text-[14px] font-semibold text-[#292622]">{value}</dd>
    </dl>
  );
}

function BondLegend({ order }: { order: 1 | 2 | 3 }) {
  const labels = { 1: "Liên kết đơn", 2: "Liên kết đôi", 3: "Liên kết ba" } as const;
  return (
    <div className="flex items-center gap-3 text-[13px] text-[#544e48]">
      <span className="flex w-7 flex-col gap-[2px]">
        {Array.from({ length: order }, (_, index) => <span key={index} className="h-px bg-[#1f1f1f]" />)}
      </span>
      {labels[order]}
    </div>
  );
}
