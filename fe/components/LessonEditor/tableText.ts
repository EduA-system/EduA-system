"use client";

import type { Node as PMNode } from "@tiptap/pm/model";

/**
 * Ký tự mở/đóng dòng tiêu đề bảng — khác `|` (dòng dữ liệu) để MỖI DÒNG tự mô tả được vai
 * trò của nó (tiêu đề hay dữ liệu) mà không cần biết vị trí của nó trong bảng gốc. Cần thiết
 * vì `diffLines` (sectionDiff.ts) có thể cắt một bảng thành nhiều chunk độc lập — nếu suy
 * vai trò dòng theo "dòng đầu tiên = tiêu đề" thì một chunk chỉ chứa dòng dữ liệu bị cắt rời
 * sẽ nhận nhầm dòng đầu của NÓ làm tiêu đề.
 */
export const HEADER_DELIM = "‖";
export const DATA_DELIM = "|";

/** Nối nhiều đoạn văn TRONG CÙNG một ô (vd 4 bước tổ chức của bảng tiểu hoạt động) mà vẫn
 * giữ cả hàng trên một dòng vật lý — bắt buộc để `diffLines` coi cả hàng là một đơn vị
 * thêm/bớt/giữ nguyên duy nhất. */
export const CELL_LINEBREAK = "<br>";

/** Ranh giới giữa hai bảng liên tiếp không có văn bản xen giữa (vd bảng thiết bị rồi tới
 * nhiều phiếu học tập) — không có dòng này thì không có cách nào biết bảng nào kết thúc ở
 * đâu khi giải mã ngược. */
export const TABLE_BREAK_LINE = "---";

export type TableRowState = "added" | "removed" | "unchanged";
export type TableDiffLine = { line: string; state: TableRowState };

function isHeaderLine(line: string): boolean {
  return line.length > 1 && line.startsWith(HEADER_DELIM) && line.endsWith(HEADER_DELIM);
}

function isDataLine(line: string): boolean {
  return line.length > 1 && line.startsWith(DATA_DELIM) && line.endsWith(DATA_DELIM);
}

/** Một dòng thuộc về khối bảng (tiêu đề hoặc dữ liệu) theo quy ước trên. */
export function isTableRowLine(line: string): boolean {
  return isHeaderLine(line) || isDataLine(line);
}

/** Escape ký tự phân cách (`‖`/`|`) THẬT trong nội dung ô — dùng khi TỰ build dòng bảng từ dữ
 * liệu có cấu trúc (vd `editContentToLines.ts` build dòng từ JSON AI trả về), không chỉ khi
 * mã hoá node `table` có sẵn. */
export function escapeDelim(value: string, delim: string) {
  return value.split(delim).join(`\\${delim}`);
}

/** Tách `‖ a ‖ b ‖` hoặc `| a | b |` thành mảng ô, bỏ qua ký tự phân cách đã escape (`\‖`/`\|`). */
function splitRow(line: string, delim: string): string[] {
  const inner = line.slice(1, -1);
  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === "\\" && inner[i + 1] === delim) {
      current += delim;
      i++;
      continue;
    }
    if (ch === delim) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Mã hoá node `table` (ProseMirror) thành các dòng `‖ ... ‖` (tiêu đề) / `| ... |` (dữ
 * liệu) — khớp tinh thần quy ước bảng dạng markdown đã có ở `fe/lib/tiptap-to-text.ts`,
 * nhưng thêm phân biệt tiêu đề/dữ liệu và token xuống dòng trong ô để round-trip được.
 * `leafText` dùng để giữ công thức toán trong ô (truyền `sectionLeafText` từ lessonSections.ts).
 */
export function tableNodeToPipeText(table: PMNode, leafText: (node: PMNode) => string): string[] {
  const lines: string[] = [];
  table.forEach((row) => {
    const isHeaderRow = row.childCount > 0 && row.firstChild?.type.name === "tableHeader";
    const delim = isHeaderRow ? HEADER_DELIM : DATA_DELIM;
    const cells: string[] = [];
    row.forEach((cell) => {
      const text = cell.textBetween(0, cell.content.size, CELL_LINEBREAK, leafText).trim();
      cells.push(escapeDelim(text, delim));
    });
    lines.push(`${delim} ${cells.join(` ${delim} `)} ${delim}`);
  });
  return lines;
}

/** Cell text của dòng tiêu đề đầu tiên tìm thấy trong `lines`, hoặc `null` nếu không có
 * dòng tiêu đề (bảng phiếu học tập 1 cột không có tiêu đề). Dùng để phân biệt bảng tiểu
 * hoạt động (2 cột "Hoạt động của GV và HS" / "Sản phẩm dự kiến") với bảng thiết bị. */
export function tableHeaderCells(lines: string[]): string[] | null {
  const headerLine = lines.map((line) => line.trim()).find(isHeaderLine);
  return headerLine ? splitRow(headerLine, HEADER_DELIM) : null;
}

function renderRow(line: string, renderCell: (text: string) => string, state?: TableRowState): string {
  const header = isHeaderLine(line);
  const delim = header ? HEADER_DELIM : DATA_DELIM;
  const cells = splitRow(line, delim);
  const tag = header ? "th" : "td";
  const cellsHtml = cells
    .map((cell) => `<${tag}>${renderCell(cell.replaceAll(CELL_LINEBREAK, "\n"))}</${tag}>`)
    .join("");
  const attrs = !header && state && state !== "unchanged" ? ` data-diff-state="${state}"` : "";
  return `<tr${attrs}>${cellsHtml}</tr>`;
}

function buildTablesHtml(
  entries: Array<{ line: string; state?: TableRowState }>,
  renderCell: (text: string) => string,
): string {
  const tables: string[] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length > 0) tables.push(`<table><tbody>${current.join("")}</tbody></table>`);
    current = [];
  };
  for (const { line, state } of entries) {
    if (line === TABLE_BREAK_LINE) {
      flush();
      continue;
    }
    if (!isTableRowLine(line)) continue;
    current.push(renderRow(line, renderCell, state));
  }
  flush();
  return tables.join("");
}

/**
 * Giải mã các dòng bảng (không kèm trạng thái diff) thành HTML — khớp đúng cấu trúc mà
 * `equipmentTableHtml`/`worksheetBoxHtml`/`subActivityTableHtml` (LessonEditor.tsx) sinh
 * ra: không `<thead>`/`<colgroup>`, dòng tiêu đề là `<tr><th>` nằm trong `<tbody>`, nội
 * dung ô luôn qua `renderCell` (truyền `paragraphs`/`aiSectionTextToHtml` từ LessonEditor.tsx
 * để giữ đậm/bullet/công thức trong ô). `TABLE_BREAK_LINE` tách nhiều bảng liên tiếp thành
 * các `<table>` riêng thay vì gộp làm một.
 */
export function pipeTextToTableHtml(lines: string[], renderCell: (text: string) => string): string {
  return buildTablesHtml(
    lines.map((line) => ({ line })),
    renderCell,
  );
}

/**
 * Như `pipeTextToTableHtml`, nhưng mỗi dòng mang theo trạng thái diff của CHUNK đã sinh ra
 * nó — gộp nhiều chunk liên tiếp thuộc cùng một khối bảng vào lại thành `<table>` duy nhất,
 * mỗi hàng dữ liệu tự quyết định `data-diff-state` theo state của chunk gốc, dòng tiêu đề
 * không bao giờ bị đánh dấu diff (cột không đổi giữa các lượt sửa). Xem
 * `sectionDiff.ts#buildSectionDiffHtml` — lý do KHÔNG thể build từng chunk độc lập rồi ghép
 * HTML lại như các block thường (`<p>`/`<li>`) là vì việc đó làm mất ngữ cảnh dòng nào là
 * tiêu đề và tách một bảng thành nhiều `<table>` rời rạc.
 */
export function buildTableDiffHtml(entries: TableDiffLine[], renderCell: (text: string) => string): string {
  return buildTablesHtml(entries, renderCell);
}
