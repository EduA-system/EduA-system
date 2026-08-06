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

/** Nối nhiều đoạn (mỗi đoạn có thể tự nhiều dòng) thành nội dung MỘT ô bảng — mỗi dòng con
 * cách nhau bằng `<br>`, khớp quy ước `tableNodeToPipeText` dùng khi mã hoá ngược từ TipTap. */
function joinCellLines(...parts: (string | null | undefined)[]): string {
  const lines = parts
    .flatMap((part) => (part ?? "").split("\n"))
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.join(CELL_LINEBREAK);
}

/** Nhãn đậm + nội dung — khớp `labeledField` (LessonEditor.tsx): giá trị 1 dòng thì nhãn và
 * nội dung chung 1 dòng text; nhiều dòng thì nhãn đứng riêng, mỗi dòng sau tách dòng riêng. */
function labeledLines(label: string, value: string | null | undefined): string[] {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return [];
  const lines = trimmed.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) return [`**${label}** ${lines[0] ?? ""}`];
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
 * NGAY TRONG một ô (khớp `organizationStepsHtml`/`tableNodeToPipeText`). */
function organizationCellText(organization: SubActivityEditData["organization"]): string {
  const steps: [string, string | null | undefined][] = [
    ["Giao nhiệm vụ học tập:", organization?.transfer],
    ["Thực hiện nhiệm vụ:", organization?.perform],
    ["Báo cáo, thảo luận:", organization?.report],
    ["Kết luận, nhận định:", organization?.conclude],
  ];
  const parts = steps
    .filter(([, value]) => value && value.trim())
    .map(([label, value]) => `**${label}** ${(value ?? "").trim()}`);
  return joinCellLines(...parts);
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
