"use client";

import { useMemo, useState } from "react";
import { findMolecules, MOLECULE_CATALOG } from "./catalog";
import { MoleculeViewer } from "./MoleculeViewer";
import type { Molecule, RenderMode } from "./types";

export function MoleculeExplorer() {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<"all" | "alkane" | "alkene" | "alkyne">("all");
  const [molecule, setMolecule] = useState<Molecule>(MOLECULE_CATALOG[1]);
  const [mode, setMode] = useState<RenderMode>("ball-and-stick");
  const [rotating, setRotating] = useState(true);
  const [aiInput, setAiInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const choices = useMemo(() => findMolecules(query, family), [query, family]);
  async function buildWithAi() {
    if (!aiInput.trim()) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/molecules/build", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: aiInput }) });
      const raw = await response.text();
      let body: (Molecule & { message?: string }) | null = null;
      try { body = JSON.parse(raw) as Molecule & { message?: string }; } catch { /* handled below */ }
      if (!response.ok) throw new Error(body?.message ?? `Máy chủ không thể tạo cấu trúc (HTTP ${response.status}).`);
      if (!body?.name || !Array.isArray(body.atoms) || !Array.isArray(body.bonds)) throw new Error("Máy chủ trả về cấu trúc không hợp lệ.");
      setMolecule({ ...body, formula: "AI tạo" });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tạo cấu trúc."); } finally { setLoading(false); }
  }
  return <main className="min-h-full bg-slate-50 p-5 text-slate-900"><div className="mx-auto max-w-7xl"><header className="mb-5"><h1 className="text-2xl font-bold">Cấu tạo chất</h1><p className="mt-1 text-sm text-slate-600">Khám phá mô hình phân tử 3D và tạo cấu trúc bằng AI.</p></header><div className="grid gap-5 lg:grid-cols-[320px_1fr]"><aside className="rounded-2xl border bg-white p-4 shadow-sm"><label className="text-sm font-semibold">Danh mục phân tử</label><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm etan, C2H6..." className="mt-3 w-full rounded-lg border px-3 py-2 text-sm" /><div className="mt-3 flex flex-wrap gap-1">{(["all", "alkane", "alkene", "alkyne"] as const).map((item) => <button key={item} onClick={() => setFamily(item)} className={`rounded-full px-2 py-1 text-xs ${family === item ? "bg-indigo-600 text-white" : "bg-slate-100"}`}>{item === "all" ? "Tất cả" : item === "alkane" ? "Alkane" : item === "alkene" ? "Alkene" : "Alkyne"}</button>)}</div><div className="mt-3 max-h-72 space-y-1 overflow-y-auto">{choices.map((item) => <button key={item.name} onClick={() => setMolecule(item)} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${molecule.name === item.name ? "bg-indigo-50 text-indigo-800" : "hover:bg-slate-50"}`}><span>{item.name}</span><span className="float-right text-slate-500">{item.formula}</span></button>)}{choices.length === 0 && <p className="p-3 text-sm text-slate-500">Không tìm thấy phân tử.</p>}</div></aside><section className="rounded-2xl border bg-white p-4 shadow-sm"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">{molecule.name}</h2><p className="text-sm text-slate-500">{molecule.formula}</p></div><div className="flex gap-2"><button onClick={() => setMode("ball-and-stick")} className={`rounded-lg px-3 py-2 text-xs ${mode === "ball-and-stick" ? "bg-slate-800 text-white" : "bg-slate-100"}`}>Ball-and-stick</button><button onClick={() => setMode("space-filling")} className={`rounded-lg px-3 py-2 text-xs ${mode === "space-filling" ? "bg-slate-800 text-white" : "bg-slate-100"}`}>Space-filling</button><button onClick={() => setRotating(!rotating)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs">{rotating ? "Dừng xoay" : "Tự xoay"}</button></div></div><MoleculeViewer molecule={molecule} mode={mode} rotating={rotating} /><p className="mt-2 text-xs text-slate-500">Kéo để xoay, cuộn để zoom, chuột phải để pan.</p><div className="mt-5 border-t pt-4"><label className="text-sm font-semibold">Tạo cấu trúc bằng AI</label><div className="mt-2 flex gap-2"><input value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void buildWithAi(); }} placeholder="Ví dụ: etanol hoặc C2H5OH" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" /><button disabled={loading} onClick={() => void buildWithAi()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{loading ? "Đang tạo..." : "Tạo"}</button></div>{error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}</div></section></div></div></main>;
}
