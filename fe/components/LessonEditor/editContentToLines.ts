"use client";

import type {
  ActivityEditData,
  EditLessonSectionEdit,
  MaterialsEditData,
  SubActivityEditData,
  TextEditData,
} from "@/services/lessonPlanService";
import { CELL_LINEBREAK, DATA_DELIM, HEADER_DELIM, TABLE_BREAK_LINE, escapeDelim } from "./tableText";

/** Tiêu đề 2 cột đúng của bảng tiểu hoạt động HĐ2 — khớp `SUB_ACTIVITY_HEADERS` ở
 * `lessonSections.ts` (không export dùng chung vì chỉ 2 nơi cần, tránh vòng import ngược). */
const SUB_ACTIVITY_HEADERS = ["Hoạt động của GV và HS", "Sản phẩm dự kiến"];

/** Một dòng bảng `‖ a ‖ b ‖` (delim = HEADER_DELIM) hoặc `| a | b |` (delim = DATA_DELIM),
 * escape ký tự phân cách thật trong nội dung ô — khớp quy ước `tableText.ts`. */
function buildRow(delim: string, cells: string[]): string {
  const escaped = cells.map((cell) => escapeDelim(cell, delim));
  return `${delim} ${escaped.join(` ${delim} `)} ${delim}`;
}

/**
 * Chuẩn hoá `string[]` AI trả về thành các dòng THẬT SỰ tách rời — KHÔNG tin tưởng mảng đã
 * "sạch sẵn" theo đúng 1-phần-tử-1-dòng như prompt yêu cầu. Đã gặp lỗi thật: dù prompt nói rõ
 * "mỗi phần tử mảng là một dòng", model đôi khi vẫn nhét một `\n` THẬT nằm lẫn TRONG một phần
 * tử (vd gộp câu dẫn + công thức khối thành 1 chuỗi có xuống dòng, theo thói quen viết văn bản
 * thường) — phá vỡ bất biến "một hàng bảng = đúng một dòng vật lý" của `isTableRowLine`, khiến
 * cả hàng rơi về hiển thị text thô thay vì bảng thật. Tách lại `\n` trong TỪNG phần tử ở đây,
 * ngay cửa vào duy nhất đọc field mảng, để không phải vá rải rác nhiều nơi.
 */
function normalizeLines(values: string[] | null | undefined): string[] {
  return (values ?? [])
    .flatMap((v) => (v ?? "").split("\n"))
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Nối nhiều đoạn thành nội dung MỘT ô bảng — mỗi dòng con cách nhau bằng `<br>`, khớp quy ước
 * `tableNodeToPipeText` dùng khi mã hoá ngược từ TipTap. Nhận cả `string[]` (field kind
 * subActivity/activity, chuẩn hoá qua `normalizeLines`) lẫn `string` đơn (field kind materials —
 * vẫn giữ nguyên dạng chuỗi domain `Materials`). */
function joinCellLines(...parts: (string[] | string | null | undefined)[]): string {
  const lines = parts.flatMap((part) => normalizeLines(Array.isArray(part) ? part : [part ?? ""]));
  return lines.join(CELL_LINEBREAK);
}

/** Nhãn đậm + nội dung — khớp `labeledField` (LessonEditor.tsx): 1 dòng thì nhãn và nội dung
 * chung 1 dòng text; nhiều dòng thì nhãn đứng riêng, mỗi dòng sau tách dòng riêng. */
function labeledLines(label: string, values: string[] | null | undefined): string[] {
  const lines = normalizeLines(values);
  if (lines.length === 0) return [];
  if (lines.length === 1) return [`**${label}** ${lines[0]}`];
  return [`**${label}**`, ...lines];
}

function textEditToLines(data: TextEditData): string {
  return (data.lines ?? []).map((line) => line ?? "").join("\n");
}

function activityEditToLines(data: ActivityEditData): string {
  return [
    ...labeledLines("a) Mục tiêu:", data.objective),
    ...labeledLines("b) Nội dung:", data.content),
    ...labeledLines("c) Sản phẩm:", data.product),
    ...labeledLines("d) Tổ chức thực hiện:", data.organizationText),
  ].join("\n");
}

/** Nội dung ô "Hoạt động của GV và HS" — 4 bước, bước nào rỗng thì bỏ qua, nối bằng `<br>`
 * NGAY TRONG một ô (khớp `organizationStepsHtml`/`tableNodeToPipeText`). Mỗi bước là mảng câu —
 * nối các câu của CÙNG một bước bằng khoảng trắng (vẫn một ý/nhãn duy nhất), khác với việc nối
 * NHIỀU BƯỚC KHÁC NHAU bằng `<br>` (làm ở `joinCellLines` bên dưới). */
function organizationCellText(organization: SubActivityEditData["organization"]): string {
  const steps: [string, string[] | null | undefined][] = [
    ["Giao nhiệm vụ học tập:", organization?.transfer],
    ["Thực hiện nhiệm vụ:", organization?.perform],
    ["Báo cáo, thảo luận:", organization?.report],
    ["Kết luận, nhận định:", organization?.conclude],
  ];
  const parts = steps
    .map(([label, values]) => [label, normalizeLines(values)] as const)
    .filter(([, lines]) => lines.length > 0)
    .map(([label, lines]) => `**${label}** ${lines.join(" ")}`);
  return joinCellLines(parts);
}

function subActivityEditToLines(data: SubActivityEditData): string {
  const parts: string[] = [
    ...labeledLines("Mục tiêu:", data.objective),
    ...labeledLines("Nội dung:", data.content),
  ];
  parts.push(buildRow(HEADER_DELIM, SUB_ACTIVITY_HEADERS));
  parts.push(buildRow(DATA_DELIM, [organizationCellText(data.organization), joinCellLines(data.product)]));
  return parts.join("\n");
}

function materialsEditToLines(data: MaterialsEditData): string {
  const parts: string[] = [];

  const equipment = data.equipment;
  const rows = (equipment?.rows ?? []).filter((row) => row.some((cell) => cell?.trim()));
  if (rows.length > 0) {
    parts.push(buildRow(HEADER_DELIM, equipment.columns ?? []));
    for (const row of rows) parts.push(buildRow(DATA_DELIM, row.map((cell) => joinCellLines(cell))));
  }

  const worksheets = (data.worksheets ?? []).filter((ws) => ws.name?.trim() || ws.content?.trim());
  for (const worksheet of worksheets) {
    if (parts.length > 0) parts.push(TABLE_BREAK_LINE);
    parts.push(buildRow(DATA_DELIM, [joinCellLines(`**${(worksheet.name ?? "").trim()}**`, worksheet.content)]));
  }

  return parts.join("\n");
}

/**
 * "Làm đẹp" JSON có cấu trúc AI trả về (`EditLessonSectionEdit.data`) thành text theo ĐÚNG
 * convention dòng/bảng mà `extractEditableSections`/`sectionBodyText` đã dùng để trích nội
 * dung CŨ — để tái dùng nguyên vẹn pipeline diff hiện có (`diffSectionLines` →
 * `buildSectionDiffHtml` → `insertSectionDiff`, xem `AssistantPanel.tsx`) mà không cần đổi gì
 * ở tầng diff/hiển thị. AI không còn tự tay viết ra chuỗi có `‖`/`|`/`<br>` — JSON field nào
 * ra chữ đó, việc ghép thành text theo quy ước là code TẤT ĐỊNH ở đây, không phải AI.
 */
export function editDataToBodyText(edit: EditLessonSectionEdit): string {
  switch (edit.kind) {
    case "text":
      return textEditToLines(edit.data);
    case "activity":
      return activityEditToLines(edit.data);
    case "subActivity":
      return subActivityEditToLines(edit.data);
    case "materials":
      return materialsEditToLines(edit.data);
    default: {
      const exhaustiveCheck: never = edit;
      throw new Error(`Kind không hỗ trợ: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}
