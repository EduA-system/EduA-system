"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  slideRoleLabel,
  validateContentPlan,
  type ContentBlock,
  type ContentRelationship,
  type SlideItem,
  type SlideType,
} from "@/lib/api/slides";

const inputClass = "w-full rounded-lg border border-[rgba(26,26,46,0.12)] px-3 py-2 text-sm text-[#1a1a2e] outline-none focus:border-[#8200db]";
const slideTypes: SlideType[] = ["intro", "section", "concept", "text-image", "experiment", "comparison", "table", "process", "formula", "exercise", "quiz", "summary"];
const blockKinds: ContentBlock["kind"][] = ["text", "visual", "comparison", "table", "sequence", "formula", "quiz"];

function ids(prefix: string, labels: string[]) {
  return labels.map((label, index) => ({ id: `${prefix}-${index + 1}`, label: label.trim() })).filter((item) => item.label);
}

function makeBlock(kind: ContentBlock["kind"], id = `block-${Date.now()}`): ContentBlock {
  const base = { id, priority: "primary" as const, required: true };
  switch (kind) {
    case "text": return { ...base, kind, role: "body", semanticType: "explanation", text: "" };
    case "visual": return { ...base, kind, role: "visual", semanticType: "image", description: "", requirement: "required" };
    case "comparison": return { ...base, kind, role: "body", semanticType: "comparison", items: ids(`${id}-item`, ["A", "B"]), criteria: ids(`${id}-criterion`, ["Tiêu chí"]), values: [["", ""]], preferredPresentation: "auto" };
    case "table": return { ...base, kind, role: "body", semanticType: "data-table", columns: ids(`${id}-column`, ["Cột 1", "Cột 2"]), rows: [{ id: `${id}-row-1`, cells: ["", ""] }] };
    case "sequence": return { ...base, kind, role: "body", semanticType: "process", steps: [{ id: `${id}-step-1`, text: "" }] };
    case "formula": return { ...base, kind, role: "formula", semanticType: "formula", expression: "" };
    case "quiz": return { ...base, kind, role: "body", semanticType: "quiz", question: "", choices: [] };
  }
}

function replaceBlock(slide: SlideItem, index: number, block: ContentBlock): SlideItem {
  const blocks = [...slide.contentPlan.blocks];
  blocks[index] = block;
  return { ...slide, contentPlan: { ...slide.contentPlan, blocks } };
}

function BlockFields({ block, onChange }: { block: ContentBlock; onChange: (block: ContentBlock) => void }) {
  if (block.kind === "text") return <textarea className={inputClass} rows={4} value={block.text} onChange={(event) => onChange({ ...block, text: event.target.value })} placeholder="Nội dung hiển thị" />;
  if (block.kind === "visual") return <div className="grid gap-2">
    <textarea className={inputClass} rows={3} value={block.description} onChange={(event) => onChange({ ...block, description: event.target.value })} placeholder="Mô tả ảnh, biểu đồ hoặc thiết bị" />
    <div className="grid grid-cols-2 gap-2">
      <select className={inputClass} value={block.requirement} onChange={(event) => onChange({ ...block, requirement: event.target.value as "required" | "optional" })}><option value="required">Bắt buộc</option><option value="optional">Tùy chọn</option></select>
      <select className={inputClass} value={block.preferredAspectRatio ?? ""} onChange={(event) => onChange({ ...block, preferredAspectRatio: (event.target.value || undefined) as "landscape" | "portrait" | "square" | undefined })}><option value="">Tự chọn tỷ lệ</option><option value="landscape">Ngang</option><option value="portrait">Dọc</option><option value="square">Vuông</option></select>
    </div>
  </div>;
  if (block.kind === "comparison") return <div className="grid gap-2">
    <input className={inputClass} value={block.items.map((item) => item.label).join(", ")} onChange={(event) => {
      const items = ids(`${block.id}-item`, event.target.value.split(","));
      onChange({ ...block, items, values: block.criteria.map((_, row) => Array.from({ length: items.length }, (__, column) => block.values[row]?.[column] ?? "")) });
    }} placeholder="Đối tượng, cách nhau bằng dấu phẩy" />
    <textarea className={inputClass} rows={2} value={block.criteria.map((item) => item.label).join("\n")} onChange={(event) => {
      const criteria = ids(`${block.id}-criterion`, event.target.value.split("\n"));
      onChange({ ...block, criteria, values: criteria.map((_, row) => block.values[row] ?? Array(block.items.length).fill("")) });
    }} placeholder="Mỗi dòng một tiêu chí" />
    {block.criteria.map((criterion, row) => <input key={criterion.id} className={inputClass} value={(block.values[row] ?? []).join(" | ")} onChange={(event) => {
      const values = block.values.map((item) => [...item]);
      values[row] = event.target.value.split("|").map((value) => value.trim()).slice(0, block.items.length);
      while (values[row].length < block.items.length) values[row].push("");
      onChange({ ...block, values });
    }} placeholder={`${criterion.label}: mỗi ô cách nhau bằng |`} />)}
    <select className={inputClass} value={block.preferredPresentation} onChange={(event) => onChange({ ...block, preferredPresentation: event.target.value as "auto" | "table" | "panels" })}><option value="auto">Tự chọn bảng/panel</option><option value="table">Ưu tiên bảng</option><option value="panels">Ưu tiên panel</option></select>
  </div>;
  if (block.kind === "table") return <div className="grid gap-2">
    <input className={inputClass} value={block.columns.map((column) => column.label).join(", ")} onChange={(event) => {
      const columns = ids(`${block.id}-column`, event.target.value.split(","));
      onChange({ ...block, columns, rows: block.rows.map((row) => ({ ...row, cells: Array.from({ length: columns.length }, (_, index) => row.cells[index] ?? "") })) });
    }} placeholder="Tên cột, cách nhau bằng dấu phẩy" />
    {block.rows.map((row, index) => <div key={row.id} className="flex gap-2"><input className={inputClass} value={row.cells.join(" | ")} onChange={(event) => {
      const rows = [...block.rows];
      const cells = event.target.value.split("|").map((value) => value.trim()).slice(0, block.columns.length);
      while (cells.length < block.columns.length) cells.push("");
      rows[index] = { ...row, cells }; onChange({ ...block, rows });
    }} placeholder="Các ô cách nhau bằng |" /><button type="button" onClick={() => onChange({ ...block, rows: block.rows.filter((_, rowIndex) => rowIndex !== index) })}>×</button></div>)}
    <button type="button" className="text-left text-xs text-[#8200db]" onClick={() => onChange({ ...block, rows: [...block.rows, { id: `${block.id}-row-${Date.now()}`, cells: Array(block.columns.length).fill("") }] })}>+ Thêm hàng</button>
  </div>;
  if (block.kind === "sequence") return <div className="grid gap-2">{block.steps.map((step, index) => <div key={step.id} className="flex gap-2"><input className={`${inputClass} w-28`} value={step.label ?? ""} onChange={(event) => { const steps = [...block.steps]; steps[index] = { ...step, label: event.target.value }; onChange({ ...block, steps }); }} placeholder={`Bước ${index + 1}`} /><input className={inputClass} value={step.text} onChange={(event) => { const steps = [...block.steps]; steps[index] = { ...step, text: event.target.value }; onChange({ ...block, steps }); }} placeholder="Nội dung bước" /><button type="button" onClick={() => onChange({ ...block, steps: block.steps.filter((_, stepIndex) => stepIndex !== index) })}>×</button></div>)}<button type="button" className="text-left text-xs text-[#8200db]" onClick={() => onChange({ ...block, steps: [...block.steps, { id: `${block.id}-step-${Date.now()}`, text: "" }] })}>+ Thêm bước</button></div>;
  if (block.kind === "formula") return <div className="grid gap-2"><input className={inputClass} value={block.expression} onChange={(event) => onChange({ ...block, expression: event.target.value })} placeholder="Biểu thức / LaTeX" /><textarea className={inputClass} rows={2} value={block.explanation ?? ""} onChange={(event) => onChange({ ...block, explanation: event.target.value || undefined })} placeholder="Giải thích" /></div>;
  return <div className="grid gap-2"><textarea className={inputClass} rows={2} value={block.question} onChange={(event) => onChange({ ...block, question: event.target.value })} placeholder="Câu hỏi" /><textarea className={inputClass} rows={3} value={block.choices?.join("\n") ?? ""} onChange={(event) => onChange({ ...block, choices: event.target.value.split("\n").map((value) => value.trim()).filter(Boolean) })} placeholder="Mỗi dòng một lựa chọn" /><input className={inputClass} value={block.answer ?? ""} onChange={(event) => onChange({ ...block, answer: event.target.value || undefined })} placeholder="Đáp án" /><textarea className={inputClass} rows={2} value={block.explanation ?? ""} onChange={(event) => onChange({ ...block, explanation: event.target.value || undefined })} placeholder="Giải thích" /></div>;
}

function RelationshipEditor({ slide, onChange }: { slide: SlideItem; onChange: (slide: SlideItem) => void }) {
  const blocks = slide.contentPlan.blocks;
  const relationships = slide.contentPlan.relationships;
  const setRelationships = (next: ContentRelationship[]) => onChange({ ...slide, contentPlan: { ...slide.contentPlan, relationships: next } });
  const field = (relationship: ContentRelationship, key: string) => (relationship as unknown as Record<string, string>)[key] ?? "";
  const keys = (type: ContentRelationship["type"]) => type === "illustrates" ? ["visualBlockId", "targetBlockId"] : type === "supports" ? ["supportingBlockId", "targetBlockId"] : ["beforeBlockId", "afterBlockId"];
  return <section className="grid gap-2"><div className="text-xs font-semibold text-[#5c5b6e]">Quan hệ block</div>{relationships.map((relationship, index) => <div key={`${relationship.type}-${index}`} className="grid grid-cols-[120px_1fr_1fr_auto] gap-2">
    <select className={inputClass} value={relationship.type} onChange={(event) => { const type = event.target.value as ContentRelationship["type"]; const [a, b] = blocks.map((block) => block.id); const next = [...relationships]; next[index] = type === "illustrates" ? { type, visualBlockId: a ?? "", targetBlockId: b ?? a ?? "" } : type === "supports" ? { type, supportingBlockId: a ?? "", targetBlockId: b ?? a ?? "" } : { type, beforeBlockId: a ?? "", afterBlockId: b ?? a ?? "" }; setRelationships(next); }}><option value="illustrates">minh họa</option><option value="supports">hỗ trợ</option><option value="follows">theo sau</option></select>
    {keys(relationship.type).map((key) => <select key={key} className={inputClass} value={field(relationship, key)} onChange={(event) => { const next = [...relationships]; next[index] = { ...relationship, [key]: event.target.value } as ContentRelationship; setRelationships(next); }}>{blocks.map((block) => <option key={block.id} value={block.id}>{block.id}</option>)}</select>)}
    <button type="button" onClick={() => setRelationships(relationships.filter((_, item) => item !== index))}>×</button>
  </div>)}<button type="button" className="text-left text-xs text-[#8200db]" onClick={() => { const [a, b] = blocks.map((block) => block.id); setRelationships([...relationships, { type: "supports", supportingBlockId: a ?? "", targetBlockId: b ?? a ?? "" }]); }}>+ Thêm quan hệ</button></section>;
}

export function SlideDetailModal({ slide, onChange, onClose }: { slide: SlideItem; onChange: (slide: SlideItem) => void; onClose: () => void }) {
  const dragged = useRef<number | null>(null);
  const errors = validateContentPlan(slide.contentPlan);
  useEffect(() => { const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose(); document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey); }, [onClose]);
  if (typeof document === "undefined") return null;
  const setBlocks = (blocks: ContentBlock[]) => onChange({ ...slide, contentPlan: { ...slide.contentPlan, blocks } });
  return createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8" onClick={onClose}><div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
    <header className="flex items-center justify-between border-b px-5 py-4"><div><span className="rounded bg-[#faf5ff] px-2 py-1 text-xs text-[#8200db]">{slideRoleLabel(slide)}</span><span className="ml-2 text-sm font-semibold">Nội dung có cấu trúc</span></div><button type="button" onClick={onClose}>✕</button></header>
    <div className="grid gap-4 overflow-y-auto px-5 py-4">
      <label className="grid gap-1 text-xs">Tiêu đề slide<input className={inputClass} value={slide.title} onChange={(event) => onChange({ ...slide, title: event.target.value })} /></label>
      <div className="grid grid-cols-3 gap-3"><label className="grid gap-1 text-xs">Loại slide<select className={inputClass} value={slide.contentPlan.slideType} onChange={(event) => onChange({ ...slide, contentPlan: { ...slide.contentPlan, slideType: event.target.value as SlideType } })}>{slideTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label className="grid gap-1 text-xs">Header<select className={inputClass} value={slide.contentPlan.headerMode} onChange={(event) => onChange({ ...slide, contentPlan: { ...slide.contentPlan, headerMode: event.target.value as "fixed" | "hidden" } })}><option value="fixed">Cố định</option><option value="hidden">Ẩn</option></select></label><label className="grid gap-1 text-xs">Vai trò<input className={inputClass} value={slide.pedagogicalRole} onChange={(event) => onChange({ ...slide, pedagogicalRole: event.target.value })} /></label></div>
      <section className="grid gap-3"><div className="text-xs font-semibold text-[#5c5b6e]">Blocks</div>{slide.contentPlan.blocks.map((block, index) => <article key={block.id} draggable onDragStart={() => { dragged.current = index; }} onDragOver={(event) => event.preventDefault()} onDrop={() => { const from = dragged.current; if (from == null || from === index) return; const next = [...slide.contentPlan.blocks]; const [moved] = next.splice(from, 1); next.splice(index, 0, moved); setBlocks(next); dragged.current = null; }} className="grid gap-3 rounded-xl border bg-[#fcfbf8] p-3">
        <div className="grid grid-cols-[auto_130px_1fr_130px_auto_auto] items-center gap-2"><span className="cursor-grab text-[#aaa]">⋮⋮</span><select className={inputClass} value={block.kind} onChange={(event) => onChange(replaceBlock(slide, index, makeBlock(event.target.value as ContentBlock["kind"], block.id)))}>{blockKinds.map((kind) => <option key={kind}>{kind}</option>)}</select><input className={inputClass} value={block.semanticType} onChange={(event) => onChange(replaceBlock(slide, index, { ...block, semanticType: event.target.value } as ContentBlock))} placeholder="semantic type" /><select className={inputClass} value={block.priority} onChange={(event) => onChange(replaceBlock(slide, index, { ...block, priority: event.target.value as ContentBlock["priority"] }))}><option value="primary">Chính</option><option value="secondary">Phụ</option><option value="supporting">Hỗ trợ</option></select><label className="flex gap-1 text-xs"><input type="checkbox" checked={block.required} onChange={(event) => onChange(replaceBlock(slide, index, { ...block, required: event.target.checked }))} />Bắt buộc</label><button type="button" onClick={() => setBlocks(slide.contentPlan.blocks.filter((_, item) => item !== index))}>×</button></div>
        <BlockFields block={block} onChange={(next) => onChange(replaceBlock(slide, index, next))} />
      </article>)}<button type="button" className="text-left text-sm text-[#8200db]" onClick={() => setBlocks([...slide.contentPlan.blocks, makeBlock("text")])}>+ Thêm block</button></section>
      <RelationshipEditor slide={slide} onChange={onChange} />
      {errors.length ? <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{errors.map((error) => <div key={error}>• {error}</div>)}</div> : null}
    </div>
    <footer className="border-t px-5 py-3 text-right"><button type="button" onClick={onClose} className="rounded-xl bg-[#1c1b2e] px-5 py-2 text-sm text-white">Xong</button></footer>
  </div></div>, document.body);
}
