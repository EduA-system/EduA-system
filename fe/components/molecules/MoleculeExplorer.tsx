"use client";

// Trang "Cấu tạo chất" — mô hình phân tử 3D cho ankan / anken / ankin.
// Hai nguồn phân tử: (1) danh mục có sẵn (deterministic), (2) nhập tên/công thức
// rồi AI sinh bảng liên kết → engine dựng 3D (giai đoạn 2).

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { buildMolecule, buildFromGraph, molecularFormula } from "@/components/molecules/builder";
import { MoleculeViewer, type ViewMode } from "@/components/molecules/MoleculeViewer";
import {
  MOLECULE_CATALOG,
  SERIES_LABELS,
  SERIES_ORDER,
  searchCatalog,
  specById,
  specsBySeries,
} from "@/components/molecules/catalog";
import { elementNameVi, elementStyle } from "@/components/molecules/constants";
import { buildMoleculeFromAi } from "@/lib/api/molecules";
import { useAuth } from "@/lib/auth/AuthContext";
import { createLibraryContent, getLibraryContent } from "@/lib/library";
import type { MoleculeGraph, Series } from "@/components/molecules/types";

type LogStatus = "pending" | "done" | "error";
interface LogEntry {
  label: string;
  status: LogStatus;
  detail?: string;
  ms?: number;
}

function LogIcon({ status }: { status: LogStatus }) {
  if (status === "pending")
    return (
      <svg className="h-3.5 w-3.5 animate-spin text-violet-500" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
        <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  if (status === "error")
    return (
      <svg className="h-3.5 w-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
      </svg>
    );
  return (
    <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function MoleculeExplorer() {
  const { authFetch, user } = useAuth();
  const searchParams = useSearchParams();
  const [series, setSeries] = useState<Series>("alkane");
  const [specId, setSpecId] = useState<string>("alkane-1"); // mặc định: metan
  const [mode, setMode] = useState<ViewMode>("ball-stick");
  const [paused, setPaused] = useState(false);

  // Nguồn AI (giai đoạn 2). Khi có aiGraph thì ưu tiên hiển thị nó.
  const [aiInput, setAiInput] = useState("");
  const [aiGraph, setAiGraph] = useState<MoleculeGraph | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLog, setAiLog] = useState<LogEntry[]>([]);

  const [search, setSearch] = useState("");
  const [libraryMessage, setLibraryMessage] = useState("");

  useEffect(() => {
    const libraryId = searchParams.get("libraryId");
    if (!libraryId) return;

    void getLibraryContent(authFetch, libraryId)
      .then((item) => {
        const payload = item.payload as {
          specId?: string;
          aiGraph?: MoleculeGraph | null;
          mode?: ViewMode;
          paused?: boolean;
        };
        if (payload.specId && specById(payload.specId)) setSpecId(payload.specId);
        if (payload.aiGraph) setAiGraph(payload.aiGraph);
        if (payload.mode) setMode(payload.mode);
        if (typeof payload.paused === "boolean") setPaused(payload.paused);
        setLibraryMessage(`Đã mở “${item.title}” từ thư viện.`);
      })
      .catch((error: unknown) => {
        setLibraryMessage(error instanceof Error ? error.message : "Không thể mở mô phỏng từ thư viện.");
      });
  }, [authFetch, searchParams]);

  const spec = useMemo(() => specById(specId) ?? MOLECULE_CATALOG[0], [specId]);
  const molecule = useMemo(
    () => (aiGraph ? buildFromGraph(aiGraph) : buildMolecule(spec)),
    [aiGraph, spec],
  );

  // Có tìm kiếm → lọc toàn danh mục (bỏ dấu); không → theo dãy đang chọn.
  const searching = search.trim().length > 0;
  const list = useMemo(
    () => (searching ? searchCatalog(search) : specsBySeries(series)),
    [searching, search, series],
  );

  // Nguyên tố & bậc liên kết thực sự có trong phân tử → chú giải động.
  const presentElements = useMemo(() => {
    const seen = new Set<string>();
    for (const a of molecule.atoms) seen.add(a.element);
    return [...seen].sort((a, b) => {
      const rank = (e: string) => (e === "C" ? 0 : e === "H" ? 1 : 2);
      return rank(a) - rank(b) || a.localeCompare(b);
    });
  }, [molecule]);
  const presentOrders = useMemo(() => {
    const s = new Set<number>();
    for (const b of molecule.bonds) s.add(b.order);
    return s;
  }, [molecule]);

  const handleSeries = (s: Series) => {
    setSeries(s);
    setSearch("");
    const first = specsBySeries(s)[0];
    if (first) setSpecId(first.id);
    setAiGraph(null); // quay lại danh mục
    setAiLog([]);
  };

  const handleSelectSpec = (id: string) => {
    setSpecId(id);
    const picked = specById(id);
    if (picked) setSeries(picked.series); // đồng bộ tab dãy khi chọn từ kết quả tìm
    setAiGraph(null);
    setAiLog([]);
  };

  const handleGenerate = async () => {
    const input = aiInput.trim();
    if (!input || aiLoading) return;
    setAiLoading(true);
    setAiError(null);

    const t0 = performance.now();
    const log: LogEntry[] = [
      { label: `Phân tích yêu cầu: “${input}”`, status: "done" },
      { label: "Gọi AI sinh bảng liên kết…", status: "pending" },
    ];
    setAiLog([...log]);
    const elapsed = () => Math.round(performance.now() - t0);
    const markLast = (status: LogStatus, detail?: string) => {
      log[log.length - 1] = { ...log[log.length - 1], status, detail, ms: elapsed() };
      setAiLog([...log]);
    };
    const addStep = (e: LogEntry) => {
      log.push({ ...e, ms: elapsed() });
      setAiLog([...log]);
    };

    try {
      const graph = await buildMoleculeFromAi(input);
      markLast("done");

      const mol = buildFromGraph(graph);
      const heavy = graph.atoms.length;
      const hAdded = mol.atoms.length - heavy;
      const rings = graph.bonds.length - heavy + 1; // giả định phân tử liên thông

      addStep({
        label: `Nhận cấu trúc: ${graph.name}`,
        status: "done",
        detail: `${heavy} nguyên tử nặng · ${graph.bonds.length} liên kết`,
      });
      addStep({ label: "Kiểm tra hợp lệ", status: "done", detail: rings >= 1 ? `có ${rings} vòng` : "mạch hở" });
      addStep({ label: "Thêm H theo hoá trị", status: "done", detail: `+${hAdded} nguyên tử H` });
      addStep({ label: "Dựng toạ độ 3D (engine)", status: "done" });
      addStep({ label: `Hoàn tất: ${molecularFormula(mol)}`, status: "done", detail: `${mol.atoms.length} nguyên tử` });

      setAiGraph(graph);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Không tạo được phân tử.";
      markLast("error", msg);
      setAiError(msg);
      setAiGraph(null);
    } finally {
      setAiLoading(false);
    }
  };

  // Thông tin hiển thị ở panel phải tuỳ nguồn
  const displayName = aiGraph ? aiGraph.name : spec.nameVi;
  const displayFormula = aiGraph ? molecularFormula(molecule) : spec.formula;

  const handleSave = async () => {
    try {
      await createLibraryContent(authFetch, {
        type: "SIMULATION",
        title: displayName,
        subject: user?.subject as "MATH" | "CHEMISTRY" | "PHYSICS" | undefined,
        payload: { specId: spec.id, aiGraph, mode, paused },
      });
      setLibraryMessage("Đã lưu mô hình vào Thư viện của tôi.");
    } catch (error) {
      setLibraryMessage(error instanceof Error ? error.message : "Không thể lưu mô hình vào thư viện.");
    }
  };

  const atomCounts = presentElements.map((element) => ({ element, count: molecule.atoms.filter((atom) => atom.element === element).length }));
  const masses: Record<string, number> = { H: 1.008, C: 12.011, N: 14.007, O: 15.999, F: 18.998, P: 30.974, S: 32.06, Cl: 35.45, Br: 79.904, I: 126.904 };
  const molarMass = molecule.atoms.reduce((sum, atom) => sum + (masses[atom.element] ?? 0), 0);
  const bondDescription = presentOrders.has(3)
    ? "liên kết ba với vùng liên kết thẳng đặc trưng"
    : presentOrders.has(2)
      ? "liên kết đôi tạo vùng cấu trúc gần phẳng"
      : "các liên kết đơn cho phép khung nguyên tử linh hoạt hơn";
  const description = aiGraph
    ? `${displayName} có công thức ${displayFormula}, gồm ${molecule.atoms.length} nguyên tử trong mô hình. Cấu trúc được AI đề xuất, sau đó kiểm tra hóa trị, tự bổ sung hydro và dựng tọa độ 3D theo trạng thái lai hóa lý tưởng. Mô hình giúp quan sát trực quan ${bondDescription}.`
    : `${displayName} (${displayFormula}) thuộc dãy ${SERIES_LABELS[spec.series].toLowerCase()}. Phân tử có ${molecule.atoms.length} nguyên tử trong mô hình và ${bondDescription}. Cách biểu diễn này làm rõ hình học không gian, thành phần nguyên tử và sự khác biệt giữa các bậc liên kết; các góc liên kết được dựng theo mô hình lai hóa lý tưởng để phục vụ học tập.`;
  const referenceKey = displayName.toLocaleLowerCase("vi");
  const realWorldReferences = referenceKey.includes("metan")
    ? ["Khí thiên nhiên", "Nhiên liệu"]
    : referenceKey.includes("etan")
      ? ["Khí thiên nhiên", "Sản xuất etilen"]
      : referenceKey.includes("propan")
        ? ["Khí LPG", "Bếp gas"]
        : referenceKey.includes("butan")
          ? ["Bật lửa", "Gas du lịch"]
          : referenceKey.includes("etilen") || referenceKey.includes("eten")
            ? ["Làm chín quả", "Sản xuất nhựa"]
            : referenceKey.includes("axetilen") || referenceKey.includes("etin")
              ? ["Hàn kim loại", "Cắt kim loại"]
              : spec.series === "alkene"
                ? ["Sản xuất polymer", "Hóa chất hữu cơ"]
                : spec.series === "alkyne"
                  ? ["Tổng hợp hữu cơ", "Hóa chất"]
                  : ["Nhiên liệu", "Công nghiệp hóa dầu"];

  return (
    <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden bg-[#f5f1ec] font-sans text-[#1e1e1e] md:grid-cols-[228px_minmax(0,1fr)] xl:grid-cols-[228px_minmax(0,1fr)_264px]">
      <aside className="hidden min-h-0 flex-col border-r border-[#e7e1da] py-5 md:flex">
        <h1 className="px-[18px] pb-5 font-libertine text-[32px] font-normal leading-[0.9] tracking-[-0.02em]">Cấu tạo chất</h1>
        <div className="px-3.5 pb-4">
          <label className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#e58461]">Tạo bằng AI</label>
          <input value={aiInput} onChange={(event) => setAiInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void handleGenerate(); }} placeholder="Tên hoặc công thức (vd: etanol)" className="mt-2 h-10 w-full rounded-[14px] border border-[#e7e1da] bg-white px-[13px] text-[13px] outline-none shadow-sm placeholder:text-[#1e1e1e]/45 focus:border-[#e58461]" />
          <button type="button" onClick={() => void handleGenerate()} disabled={aiLoading || !aiInput.trim()} className="mt-2 h-10 w-full rounded-[14px] bg-[#e58461] text-[13px] font-semibold text-white shadow-sm disabled:bg-[#f0ece5] disabled:text-[#bbb]">{aiLoading ? "Đang tạo…" : "✦  Tạo phân tử"}</button>
          {aiError ? <p className="mt-2 text-[11px] text-red-600">{aiError}</p> : null}
        </div>
        <div className="px-3.5 pb-3.5">
          <label className="flex h-10 items-center gap-2 rounded-[14px] border border-[#e7e1da] bg-white px-[13px] shadow-sm">
            <span className="text-[#999]">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm kiếm..." className="min-w-0 flex-1 bg-transparent text-[13px] outline-none" />
            {searching ? <button type="button" onClick={() => setSearch("")}>×</button> : null}
          </label>
        </div>
        {!searching ? <div className="mx-2 mb-3.5 flex gap-1.5 rounded-[14px] px-1.5 pb-2 pt-1.5 shadow-[0_8px_14px_-12px_rgba(30,30,30,0.55)]">{SERIES_ORDER.map((item) => <button key={item} type="button" onClick={() => handleSeries(item)} className={`rounded-full border px-[11px] py-1.5 text-xs font-medium ${series === item && !aiGraph ? "border-[#1e1e1e] bg-[#1e1e1e] text-white" : "border-[#e7e1da] text-[#6b6b6b]"}`}>{SERIES_LABELS[item]}</button>)}</div> : null}
        <ul className="min-h-0 flex-1 overflow-y-auto px-2">
          {searching ? <li className="px-3 pb-1 text-[10px] uppercase text-[#999]">{list.length} kết quả</li> : null}
          {list.map((item) => {
            const active = item.id === specId && !aiGraph;
            return <li key={item.id} className="py-px"><button type="button" onClick={() => handleSelectSpec(item.id)} className={`flex w-full items-center justify-between gap-2 rounded-xl border-l-[3px] px-[13px] py-2 text-left ${active ? "border-[#e58461] bg-white shadow-sm" : "border-transparent hover:bg-white/70"}`}><span className="truncate text-[13px] font-medium">{item.nameVi}</span><span className="shrink-0 text-[11px] text-[#6b6b6b]">{item.formula}</span></button></li>;
          })}
        </ul>
        {aiLog.length ? <div className="mx-3.5 max-h-28 overflow-auto rounded-xl bg-white p-2 text-[10px]">{aiLog.map((entry, index) => <div key={index} className="flex gap-1 py-0.5"><LogIcon status={entry.status} />{entry.label}</div>)}</div> : null}
      </aside>

      <main className="relative min-h-0 min-w-0 p-4 md:p-6">
        <section className="relative h-full min-h-[480px] overflow-hidden rounded-[22px] bg-white shadow-[0_2px_24px_rgba(0,0,0,0.07),0_1px_4px_rgba(0,0,0,0.04)]">
          <div className="absolute left-5 top-4 z-10 flex items-baseline gap-2"><h2 className="text-[22px] font-bold">{displayName}</h2><span className="text-[15px] text-[#6b6b6b]">{displayFormula}</span></div>
          <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-white p-1.5 shadow-lg">
            <div className="flex rounded-[10px] bg-[#f5f1ec] p-[3px]">
              <button type="button" onClick={() => setMode("ball-stick")} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${mode === "ball-stick" ? "bg-[#1e1e1e] text-white" : "text-[#6b6b6b]"}`}>Ball &amp; Stick</button>
              <button type="button" onClick={() => setMode("space-filling")} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${mode === "space-filling" ? "bg-[#1e1e1e] text-white" : "text-[#6b6b6b]"}`}>Space Fill</button>
            </div>
            <button type="button" onClick={() => setPaused((value) => !value)} className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#e7e1da] px-3 py-1.5 text-xs">{paused ? <><span aria-hidden>▶</span>Xoay</> : <><span className="size-2.5 rounded-[2px] bg-[#1e1e1e]" aria-hidden />Dừng</>}</button>
            <button type="button" onClick={() => void handleSave()} className="rounded-[10px] bg-[#e58461] px-3.5 py-1.5 text-xs font-semibold text-white">▣ Lưu vào thư viện</button>
          </div>
          <MoleculeViewer molecule={molecule} mode={mode} paused={paused} />
          {libraryMessage ? <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-white px-4 py-2 text-xs text-[#9c563b] shadow-md">{libraryMessage}</div> : null}
        </section>
      </main>

      <aside className="hidden min-h-0 overflow-y-auto px-4 py-5 xl:block">
        <InfoCard><InfoRow label="Công thức phân tử" value={displayFormula} />{!aiGraph ? <InfoRow label="Công thức cấu tạo" value={spec.condensed} /> : null}<InfoRow label="Khối lượng mol" value={molarMass.toFixed(2) + " g/mol"} /><InfoRow label="Số nguyên tử" value={String(molecule.atoms.length)} last /></InfoCard>
        <InfoCard>{<><h3 className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[#6b6b6b]">Thành phần nguyên tử</h3><div className="mt-3 space-y-2">{atomCounts.map(({ element, count }) => <div key={element} className="flex justify-between text-[13px]"><span className="flex items-center gap-2"><i className="size-3 rounded-md border border-black/10" style={{ background: elementStyle(element).color }} />{elementNameVi(element)}</span><b>{count}</b></div>)}</div></>}</InfoCard>
        <InfoCard><h3 className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[#6b6b6b]">Loại liên kết</h3><div className="mt-3 space-y-2 text-[13px]">{presentOrders.has(1) ? <BondLegend lines={1} label="Liên kết đơn" /> : null}{presentOrders.has(2) ? <BondLegend lines={2} label="Liên kết đôi" /> : null}{presentOrders.has(3) ? <BondLegend lines={3} label="Liên kết ba" /> : null}</div></InfoCard>
        <InfoCard><h3 className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[#6b6b6b]">Mô tả khoa học</h3><p className="mt-2.5 text-[13px] leading-[1.65]">{description}</p></InfoCard>
        <section className="rounded-[14px] bg-white p-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="flex flex-nowrap gap-1.5 overflow-hidden">
            {realWorldReferences.map((reference) => (
              <span key={reference} className="min-w-0 flex-1 truncate rounded-lg border border-[#f0c5b5] bg-[#fff7f3] px-2 py-1.5 text-center text-[10px] font-medium text-[#a85437]">
                {reference}
              </span>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

function InfoCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`mb-2 rounded-[20px] bg-white p-[18px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] ${className}`}>{children}</section>;
}
function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return <div className={last ? "" : "mb-3 border-b border-[#f5f1ec] pb-3"}><dt className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[#6b6b6b]">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>;
}
function BondLegend({ lines, label }: { lines: number; label: string }) {
  return <div className="flex items-center gap-3"><span className="flex w-7 flex-col gap-[2px]">{Array.from({ length: lines }, (_, index) => <span key={index} className="h-px bg-[#1e1e1e]" />)}</span>{label}</div>;
}
