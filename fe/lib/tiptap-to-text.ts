export type TiptapNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
};

/** Converts the saved TipTap document into stable, readable source material for AI. */
export function tiptapToStructuredText(document: unknown): string {
  if (!isNode(document)) throw new Error("Giáo án đã lưu không có tài liệu TipTap hợp lệ.");
  const text = render(document, 0).replace(/\n{3,}/g, "\n\n").trim();
  if (!text) throw new Error("Giáo án đã lưu chưa có nội dung để tạo slide.");
  return text;
}

export function getTiptapDocument(payload: unknown): TiptapNode {
  if (!payload || typeof payload !== "object") throw new Error("Định dạng giáo án đã lưu không hợp lệ.");
  const record = payload as { format?: unknown; document?: unknown };
  if (record.format !== "tiptap-json" || !isNode(record.document)) {
    throw new Error("Giáo án này không dùng định dạng TipTap được hỗ trợ.");
  }
  return record.document;
}

function isNode(value: unknown): value is TiptapNode {
  return !!value && typeof value === "object" && typeof (value as TiptapNode).type === "string";
}

function children(node: TiptapNode, level: number) {
  return (node.content ?? []).map((child) => render(child, level)).join("");
}

function render(node: TiptapNode, level: number): string {
  const body = children(node, level);
  switch (node.type) {
    case "doc": return body;
    case "text": return node.text ?? "";
    case "hardBreak": return "\n";
    case "heading": return `${"#".repeat(Number(node.attrs?.level) || 1)} ${body.trim()}\n\n`;
    case "paragraph": return `${body.trim()}\n\n`;
    case "bulletList": return (node.content ?? []).map((item) => renderListItem(item, level, "- ")).join("") + "\n";
    case "orderedList": return (node.content ?? []).map((item, index) => renderListItem(item, level, `${index + 1}. `)).join("") + "\n";
    case "listItem": return renderListItem(node, level, "- ");
    case "blockquote": return body.split("\n").filter(Boolean).map((line) => `> ${line}`).join("\n") + "\n\n";
    case "table": return (node.content ?? []).map((row) => render(row, level)).join("") + "\n";
    case "tableRow": return `| ${(node.content ?? []).map((cell) => render(cell, level).replace(/\n+/g, " ").trim()).join(" | ")} |\n`;
    case "tableHeader":
    case "tableCell": return body;
    case "mathInline":
    case "mathDisplay": return ` ${String(node.attrs?.latex ?? node.attrs?.value ?? body).trim()} `;
    case "codeBlock": return `\n\`\`\`\n${body.trim()}\n\`\`\`\n\n`;
    default: return body;
  }
}

function renderListItem(node: TiptapNode, level: number, marker: string): string {
  const nested = (node.content ?? []).filter((child) => child.type === "bulletList" || child.type === "orderedList");
  const inline = (node.content ?? []).filter((child) => child.type !== "bulletList" && child.type !== "orderedList")
    .map((child) => render(child, level + 1).trim()).filter(Boolean).join(" ");
  return `${"  ".repeat(level)}${marker}${inline}\n${nested.map((child) => render(child, level + 1)).join("")}`;
}
