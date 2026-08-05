"use client";

import type { Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";

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
};

type HeadingBlock = {
  heading: string;
  level: 2 | 3;
  from: number;
  to: number;
};

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

    sections.push({
      id: `sec-${sections.length + 1}`,
      heading: current.heading,
      level: current.level,
      from: current.from,
      bodyFrom: current.to,
      to,
      text: editor.state.doc.textBetween(current.from, to, "\n", sectionLeafText).trim(),
      bodyText: editor.state.doc.textBetween(current.to, to, "\n", sectionLeafText).trim(),
    });
  }

  return sections;
}
