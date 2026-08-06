"use client";

import type { Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { TABLE_BREAK_LINE, tableHeaderCells, tableNodeToPipeText } from "./tableText";

/** Cấu trúc mà mục đang chứa — quyết định AI cần biết quy tắc cấu trúc 5512 nào khi viết lại
 * mục đó (xem LessonPlanEditPromptBuilder ở backend). "activity" = Hoạt động cấp 1 (HĐ1/3/4,
 * cấu trúc a/b/c/d, không bảng) — khác "subActivity" (tiểu hoạt động của HĐ2, có bảng 2 cột). */
export type SectionKind = "text" | "materials" | "subActivity" | "activity";

export type EditableLessonSection = {
  id: string;
  heading: string;
  level: 2 | 3;
  from: number;
  /** Vị trí ngay sau node heading — nơi phần thân mục bắt đầu. */
  bodyFrom: number;
  to: number;
  text: string;
  /** Nội dung thân mục (không gồm dòng tiêu đề) — dùng làm gốc so sánh diff. */
  bodyText: string;
  kind: SectionKind;
};

type HeadingBlock = {
  heading: string;
  level: 2 | 3;
  from: number;
  to: number;
};

/** Tiêu đề 2 cột đúng của bảng tiểu hoạt động HĐ2 (xem `subActivityTableHtml` trong
 * LessonEditor.tsx) — dùng để phân biệt với bảng thiết bị/phiếu học tập. */
const SUB_ACTIVITY_HEADERS = ["Hoạt động của GV và HS", "Sản phẩm dự kiến"];

/** Khớp tiêu đề Hoạt động cấp 1 do luồng sinh gốc đặt tên (vd "Hoạt động 3: Luyện tập (15
 * phút)") — xem `LessonPlan5512PromptBuilder`/`activityHtml`/`pendingActivityFallbackNodes`.
 * Chỉ HĐ1/3/4 rơi vào đây: HĐ2 luôn bị `hasChildHeading` loại khỏi danh sách section khi có
 * tiểu hoạt động (trường hợp hiếm HĐ2 không có tiểu hoạt động thì vẫn khớp — chấp nhận được,
 * vẫn tốt hơn xử lý như "text" thuần). */
const ACTIVITY_HEADING_PATTERN = /^Hoạt động\s+\d+\b/;

export function isTopLevelActivityHeading(heading: string): boolean {
  return ACTIVITY_HEADING_PATTERN.test(heading.trim());
}

/**
 * `textBetween` bỏ qua node atom (công thức toán) trừ khi có `leafText` — không truyền
 * callback thì LaTeX bị mất trắng cả khi gửi cho AI lẫn khi build diff. Tái tạo lại cú
 * pháp mà `aiSectionTextToHtml` hiểu được để round-trip đúng.
 */
function sectionLeafText(node: PMNode) {
  const latex = typeof node.attrs.latex === "string" ? node.attrs.latex : "";
  if (node.type.name === "inlineMath") return `$${latex}$`;
  if (node.type.name === "blockMath") return `\\[${latex}\\]`;
  return "";
}

/** Các node con TRỰC TIẾP của `doc` trong khoảng [from, to) — các khối top-level của một
 * mục (đoạn văn, danh sách, công thức khối, bảng...). */
function collectTopLevelNodes(doc: PMNode, from: number, to: number): PMNode[] {
  const nodes: PMNode[] = [];
  doc.forEach((node, offset) => {
    if (offset >= from && offset < to) nodes.push(node);
  });
  return nodes;
}

function detectTableKind(pipeLines: string[]): SectionKind {
  const headers = tableHeaderCells(pipeLines);
  const isSubActivity =
    headers !== null &&
    headers.length === SUB_ACTIVITY_HEADERS.length &&
    headers.every((header, i) => header === SUB_ACTIVITY_HEADERS[i]);
  return isSubActivity ? "subActivity" : "materials";
}

/**
 * Chuyển thân một mục thành text phẳng dùng cho AI + diff. Bảng (`table`) được mã hoá theo
 * quy ước `tableText.ts` (mỗi hàng một dòng) thay vì bị `textBetween` làm phẳng mất cấu
 * trúc hàng/cột — `textBetween` không có hành vi leaf/separator cho
 * `table`/`tableRow`/`tableCell` nên trước đây bảng biến mất hoàn toàn khỏi text trích ra.
 * Các node top-level khác giữ nguyên hành vi cũ (kể cả công thức khối, vốn là node atom
 * nên phải lấy qua `sectionLeafText` trực tiếp, không qua `textBetween` của chính nó).
 */
function sectionBodyText(doc: PMNode, from: number, to: number): { text: string; kind: SectionKind } {
  const blocks = collectTopLevelNodes(doc, from, to);
  const parts: string[] = [];
  let kind: SectionKind = "text";
  let previousWasTable = false;

  for (const node of blocks) {
    if (node.type.name === "table") {
      if (previousWasTable) parts.push(TABLE_BREAK_LINE);
      const tableLines = tableNodeToPipeText(node, sectionLeafText);
      parts.push(...tableLines);
      if (kind === "text") kind = detectTableKind(tableLines);
      previousWasTable = true;
      continue;
    }
    const text = node.isLeaf
      ? sectionLeafText(node)
      : node.textBetween(0, node.content.size, "\n", sectionLeafText).trim();
    if (text) parts.push(text);
    previousWasTable = false;
  }

  return { text: parts.join("\n"), kind };
}

export function extractEditableSections(editor: Editor | null): EditableLessonSection[] {
  if (!editor || editor.isDestroyed) return [];

  const headings: HeadingBlock[] = [];
  editor.state.doc.forEach((node, offset) => {
    if (node.type.name !== "heading") return;
    const level = Number(node.attrs.level);
    if (level !== 2 && level !== 3) return;
    const heading = node.textContent.trim();
    if (!heading) return;
    headings.push({
      heading,
      level,
      from: offset,
      to: offset + node.nodeSize,
    });
  });

  const sections: EditableLessonSection[] = [];
  for (let i = 0; i < headings.length; i++) {
    const current = headings[i];
    let to = editor.state.doc.content.size;
    for (let j = i + 1; j < headings.length; j++) {
      if (headings[j].level <= current.level) {
        to = headings[j].from;
        break;
      }
    }

    const hasChildHeading = current.level === 2
      && headings.slice(i + 1).some((heading) => heading.from < to && heading.level === 3);
    if (hasChildHeading) continue;

    const body = sectionBodyText(editor.state.doc, current.to, to);
    const kind: SectionKind = isTopLevelActivityHeading(current.heading) ? "activity" : body.kind;

    sections.push({
      id: `sec-${sections.length + 1}`,
      heading: current.heading,
      level: current.level,
      from: current.from,
      bodyFrom: current.to,
      to,
      text: [current.heading, body.text].filter(Boolean).join("\n"),
      bodyText: body.text,
      kind,
    });
  }

  return sections;
}
