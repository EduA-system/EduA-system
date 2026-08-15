"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { getMoleculeAiBuildDiagnostics, logMoleculeAiBuildResponse } from "@/lib/api/molecule-ai-debug";
import { createLibraryContent, getLibraryContent } from "@/lib/library";
import { getClassResourceLibraryContent } from "@/lib/classroom";
import { findMolecules, MOLECULE_CATALOG } from "./catalog";
import type { Molecule, RenderMode } from "./types";

const MoleculeViewer = dynamic(
  () => import("./MoleculeViewer").then((m) => m.MoleculeViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-xs text-white/70">
        Đang tải mô phỏng...
      </div>
    ),
  }
);

export function MoleculeExplorer() {
  const { authFetch, user } = useAuth();
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId");
  const resourceId = searchParams.get("resourceId");
  const readOnlyClassResource = Boolean(classId && resourceId);
  const libraryId = searchParams.get("libraryId");
  const readOnlySavedMolecule = Boolean(libraryId || readOnlyClassResource);
  const savedMoleculeKey = libraryId ?? (readOnlyClassResource ? `${classId}:${resourceId}` : null);
  const backHref = libraryId
    ? "/library"
    : readOnlyClassResource
      ? `${user?.role === "STUDENT" ? "/detail-resource" : "/class-detail/resources"}?${new URLSearchParams(user?.role === "STUDENT" ? { classId: classId!, resourceId: resourceId! } : { classId: classId! }).toString()}`
      : null;
  const backLabel = libraryId ? "Quay lại thư viện" : "Quay lại lớp học";
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<"all" | "alkane" | "alkene" | "alkyne">("all");
  const [molecule, setMolecule] = useState<Molecule>(MOLECULE_CATALOG[1]);
  const [mode, setMode] = useState<RenderMode>("ball-and-stick");
  const [rotating, setRotating] = useState(true);
  const [aiInput, setAiInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadedSavedMoleculeKey, setLoadedSavedMoleculeKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedFingerprint, setSavedFingerprint] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const choices = useMemo(() => findMolecules(query, family), [query, family]);
  const fingerprint = JSON.stringify({ molecule, mode, rotating });
  const saved = Boolean(libraryId) || savedFingerprint === fingerprint;
  const loadingSavedMolecule = Boolean(savedMoleculeKey && loadedSavedMoleculeKey !== savedMoleculeKey);

  useEffect(() => {
    const id = libraryId;
    if (!id && !readOnlyClassResource) return;
    let cancelled = false;
    void (readOnlyClassResource ? getClassResourceLibraryContent(authFetch, classId!, resourceId!) : getLibraryContent(authFetch, id!)).then((item) => {
      if (cancelled) return;
      const payload = item.payload as { molecule?: Molecule; mode?: RenderMode; rotating?: boolean };
      if (payload?.molecule) setMolecule(payload.molecule);
      if (payload?.mode) setMode(payload.mode);
      if (typeof payload?.rotating === "boolean") setRotating(payload.rotating);
    }).catch((error: unknown) => {
      if (!cancelled) setMessage(error instanceof Error ? error.message : "Không thể mở mô phỏng.");
    }).finally(() => {
      if (!cancelled) setLoadedSavedMoleculeKey(savedMoleculeKey);
    });
    return () => { cancelled = true; };
  }, [authFetch, classId, libraryId, readOnlyClassResource, resourceId, savedMoleculeKey]);

  async function save() {
    if (readOnlySavedMolecule || saving || saved) return;
    setSaving(true);
    setMessage("");
    try {
      await createLibraryContent(authFetch, {
        type: "SIMULATION",
        title: molecule.name,
        subject: "CHEMISTRY",
        payload: { source: "molecule-explorer", molecule, mode, rotating },
      });
      setSavedFingerprint(fingerprint);
      setMessage("Đã lưu mô phỏng vào thư viện.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu mô phỏng.");
    } finally {
      setSaving(false);
    }
  }
  async function buildWithAi() {
    if (readOnlySavedMolecule) return;
    if (!aiInput.trim()) return;
    setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/molecules/build", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: aiInput }) });
      const body = await response.json() as Molecule & { message?: string };
      const aiResult = {
        input: aiInput,
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        body,
      };
      logMoleculeAiBuildResponse(aiResult);
      const diagnostics = getMoleculeAiBuildDiagnostics(aiResult);
      if (!diagnostics.success) throw new Error(diagnostics.userMessage);
      setMolecule({ ...body, formula: "AI tạo" });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể tạo cấu trúc."); } finally { setLoading(false); }
  }
  return <main className="min-h-full bg-slate-50 p-5 text-slate-900"><div className={`mx-auto ${readOnlySavedMolecule ? "max-w-5xl" : "max-w-7xl"}`}>
    {backHref && <Link href={backHref} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-indigo-700"><ArrowLeft className="size-4" /> {backLabel}</Link>}
    {!readOnlySavedMolecule && <header className="mb-5"><h1 className="text-2xl font-bold">Cấu tạo chất</h1><p className="mt-1 text-sm text-slate-600">Khám phá mô hình phân tử 3D và tạo cấu trúc bằng AI.</p></header>}
    <div className={`grid gap-5 ${readOnlySavedMolecule ? "" : "lg:grid-cols-[320px_1fr]"}`}>
      {!readOnlySavedMolecule && <aside className="rounded-2xl border bg-white p-4 shadow-sm"><label className="text-sm font-semibold">Danh mục phân tử</label><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm etan, C2H6..." className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"/><div className="mt-3 flex flex-wrap gap-1">{(["all", "alkane", "alkene", "alkyne"] as const).map(item => <button key={item} onClick={() => setFamily(item)} className={`rounded-full px-2 py-1 text-xs ${family === item ? "bg-indigo-600 text-white" : "bg-slate-100"}`}>{item === "all" ? "Tất cả" : item}</button>)}</div><div className="mt-3 max-h-72 space-y-1 overflow-y-auto">{choices.map(item => <button key={item.name} onClick={() => setMolecule(item)} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${molecule.name === item.name ? "bg-indigo-50 text-indigo-800" : "hover:bg-slate-50"}`}><span>{item.name}</span><span className="float-right text-slate-500">{item.formula}</span></button>)}</div></aside>}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        {loadingSavedMolecule ? <div className="flex h-[560px] items-center justify-center text-sm text-slate-500">Đang mở mô phỏng...</div> : <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">{molecule.name}</h2><p className="text-sm text-slate-500">{molecule.formula}</p></div><div className="flex gap-2"><button onClick={() => setMode("ball-and-stick")} className="rounded-lg bg-slate-100 px-3 py-2 text-xs">Ball-and-stick</button><button onClick={() => setMode("space-filling")} className="rounded-lg bg-slate-100 px-3 py-2 text-xs">Space-filling</button><button onClick={() => setRotating(!rotating)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs">{rotating ? "Dừng xoay" : "Tự xoay"}</button>{!readOnlySavedMolecule && <button disabled={saving || saved} onClick={() => void save()} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs text-white disabled:cursor-not-allowed disabled:bg-emerald-600">{saving ? "Đang lưu..." : saved ? "Đã lưu vào thư viện" : "Lưu vào thư viện"}</button>}</div></div><div className="h-[560px] w-full"><MoleculeViewer molecule={molecule} mode={mode} rotating={rotating}/></div><p className="mt-2 text-xs text-slate-500">Kéo để xoay, cuộn để zoom, chuột phải để pan.</p>{!readOnlySavedMolecule && <div className="mt-5 border-t pt-4"><label className="text-sm font-semibold">Tạo cấu trúc bằng AI</label><div className="mt-2 flex gap-2"><input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void buildWithAi(); }} placeholder="Ví dụ: etanol hoặc C2H5OH" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"/><button disabled={loading} onClick={() => void buildWithAi()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">{loading ? "Đang tạo..." : "Tạo"}</button></div></div>}{message && <p className="mt-2 text-sm text-indigo-700">{message}</p>}
        </>}
      </section>
    </div>
  </div></main>;
}
