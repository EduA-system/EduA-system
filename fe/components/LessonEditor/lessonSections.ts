"use client";

import type { Editor } from "@tiptap/react";

export type EditableLessonSection = {
  id: string;
  heading: string;
  level: 2 | 3;
  from: number;
  to: number;
  text: string;
};

type HeadingBlock = {
  heading: string;
  level: 2 | 3;
  from: number;
  to: number;
};

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
      to,
      text: editor.state.doc.textBetween(current.from, to, "\n", "\n").trim(),
    });
  }

  return sections;
}

export function replaceSectionRange(editor: Editor, from: number, to: number, html: string) {
  if (editor.isDestroyed) return false;
  if (from < 0 || to > editor.state.doc.content.size || from >= to) return false;
  return editor
    .chain()
    .insertContentAt({ from, to }, html, { parseOptions: { preserveWhitespace: false } })
    .run();
}
