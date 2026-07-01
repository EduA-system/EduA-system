"use client";

import { EditorContent, type Editor } from "@tiptap/react";
import type {
  Activity5512,
  EquipmentTable,
  LessonPlan5512,
  Worksheet,
} from "@/data/lessonPlan5512Mock";

function escapeHtml(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mathAttribute(value: string) {
  return escapeHtml(value.trim());
}

function inlineRichText(value: string) {
  return escapeHtml(value).replace(
    /\\\((.+?)\\\)|(?<!\$)\$([^$\n]+?)\$(?!\$)/g,
    (_match, parenLatex: string | undefined, dollarLatex: string | undefined) => {
      const latex = parenLatex ?? dollarLatex ?? "";
      return `<span data-type="inline-math" data-latex="${mathAttribute(latex)}"></span>`;
    },
  );
}

function blockMathHtml(latex: string) {
  return `<div data-type="block-math" data-latex="${mathAttribute(latex)}"></div>`;
}

function isMultipleChoiceOption(line: string) {
  return /^[A-Da-d][.)]\s+/.test(line);
}

function isAnswerKeyLine(line: string) {
  return /^\d+[.)]\s*[A-Da-d]\.?$/.test(line);
}

function answerKeyHtml(lines: string[]) {
  const answers = lines.map((line) => inlineRichText(line.replace(/\.$/, ""))).join("");
  return `<p class="mc-answer-row">${answers}</p>`;
}

function richParagraph(line: string) {
  const blockMath = line.match(/^\\\[(.+)\\\]$/);
  if (blockMath) return blockMathHtml(blockMath[1]);
  const dollarBlockMath = line.match(/^\$\$(.+)\$\$$/);
  if (dollarBlockMath) return blockMathHtml(dollarBlockMath[1]);
  const className = isMultipleChoiceOption(line) ? ' class="mc-option"' : "";
  return `<p${className}>${inlineRichText(line)}</p>`;
}

/** <ul> từ danh sách chuỗi; rỗng → chuỗi rỗng. */
function bulletList(items: string[] | null | undefined) {
  if (!items) return "";
  if (items.length === 0) return "";
  return `<ul>${items.map((item) => `<li>${inlineRichText(item)}</li>`).join("")}</ul>`;
}

/** Tách chuỗi nhiều dòng thành các <p>; rỗng → một <p> trống để ô bảng không sập. */
function paragraphs(text: string) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return "<p></p>";
  const html: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (isAnswerKeyLine(lines[i])) {
      const answers: string[] = [];
      while (i < lines.length && isAnswerKeyLine(lines[i])) {
        answers.push(lines[i]);
        i++;
      }
      html.push(answerKeyHtml(answers));
      i--;
      continue;
    }
    html.push(richParagraph(lines[i]));
  }
  return html.join("");
}

/**
 * Ô có nhãn đậm (vd "b) Nội dung:"). Nếu value nhiều dòng (\n) — như danh sách câu hỏi,
 * phương án A/B/C/D — thì tách MỖI dòng thành một <p> để giữ format, tránh dồn thành một
 * đoạn dài. Value một dòng thì giữ nhãn + nội dung trên cùng dòng.
 */
function labeledField(label: string, value: string | null | undefined) {
  if (!value || !value.trim()) return "";
  const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) {
    return `<p><b>${label}</b> ${inlineRichText(lines[0] ?? "")}</p>`;
  }
  return `<p><b>${label}</b></p>${lines.map((line) => richParagraph(line)).join("")}`;
}

/**
 * Mục II — bảng thiết bị 2 cột (tiêu đề cột do AI đặt). Defensive: chấp nhận cả dạng
 * cũ `string[]` (dữ liệu sessionStorage cũ) và bỏ qua nếu không có dòng nào.
 */
function equipmentTableHtml(equipment: EquipmentTable | string[] | undefined) {
  if (Array.isArray(equipment)) {
    return bulletList(equipment);
  }
  const rows = equipment?.rows?.filter((row) => row.some((cell) => cell?.trim())) ?? [];
  if (rows.length === 0) return "";

  const columns = equipment?.columns ?? [];
  const colCount = Math.max(columns.length, ...rows.map((row) => row.length), 1);
  const head = columns.length
    ? `<tr>${Array.from({ length: colCount })
        .map((_, i) => `<th>${escapeHtml(columns[i] ?? "")}</th>`)
        .join("")}</tr>`
    : "";
  const body = rows
    .map(
      (row) =>
        `<tr>${Array.from({ length: colCount })
          .map((_, i) => `<td>${paragraphs(row[i] ?? "")}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  return `<table><tbody>${head}${body}</tbody></table>`;
}

/** Mỗi phiếu học tập đóng khung trong một bảng 1 ô (giống mẫu Bai-19). */
function worksheetBoxHtml(worksheet: Worksheet) {
  return `<table><tbody><tr><td><p><b>${escapeHtml(worksheet.name)}</b></p>${paragraphs(worksheet.content)}</td></tr></tbody></table>`;
}

/**
 * Mục d) Tổ chức thực hiện cho hoạt động cấp 1 (HĐ1/3/4) — văn ngắn `organizationText`
 * (đúng bài mẫu Bai-19). Fallback 4 bước `organization` cho dữ liệu cũ. Ở bước DÀN Ý
 * (khung) cả hai còn null/trống → ẩn cả block để call sau (hoặc giáo viên) điền.
 */
function organizationHtml(activity: Activity5512) {
  if (activity.organizationText?.trim()) {
    return `<p><b>d) Tổ chức thực hiện:</b></p>${paragraphs(activity.organizationText)}`;
  }
  const org = activity.organization;
  if (!org) return "";
  const { transfer, perform, report, conclude } = org;
  if (![transfer, perform, report, conclude].some((step) => step && step.trim())) return "";
  return `
    <p><b>d) Tổ chức thực hiện:</b></p>
    <ul>
      <li><b>Giao nhiệm vụ học tập:</b> ${escapeHtml(transfer)}</li>
      <li><b>Thực hiện nhiệm vụ:</b> ${escapeHtml(perform)}</li>
      <li><b>Báo cáo, thảo luận:</b> ${escapeHtml(report)}</li>
      <li><b>Kết luận, nhận định:</b> ${escapeHtml(conclude)}</li>
    </ul>
  `;
}

/**
 * Mục d) Tổ chức thực hiện rút thành các đoạn (4 bước) để đặt vào ô "Hoạt động của GV
 * và HS" của bảng tiểu hoạt động. Bước nào trống thì bỏ qua.
 */
function organizationStepsHtml(org: Activity5512["organization"]) {
  if (!org) return "";
  const steps: [string, string | null | undefined][] = [
    ["Giao nhiệm vụ học tập:", org.transfer],
    ["Thực hiện nhiệm vụ:", org.perform],
    ["Báo cáo, thảo luận:", org.report],
    ["Kết luận, nhận định:", org.conclude],
  ];
  return steps
    .filter(([, value]) => value && value.trim())
    .map(([label, value]) => `<p><b>${label}</b> ${inlineRichText(value ?? "")}</p>`)
    .join("");
}

/**
 * Tiểu hoạt động của HĐ2: tiêu đề + Mục tiêu/Nội dung là đoạn văn ĐỨNG TRƯỚC bảng, rồi
 * bảng 2 cột chuẩn KNTT (mẫu Bai-19):
 *   [ "Hoạt động của GV và HS"      | "Sản phẩm dự kiến" ]
 *   [ d) Tổ chức thực hiện (4 bước) | c) Sản phẩm        ]
 * Bảng giữ đúng cấu trúc bảng mục II (KHÔNG colspan) để `insertContentAt` lúc fill
 * streaming không nuốt bảng. Ô trống dùng `<p></p>` để bảng không sập khi đang ở dàn ý.
 */
function subActivityTableHtml(sub: Activity5512) {
  const title = `<p class="activity-sub-title"><b>${escapeHtml(sub.name)}</b>${sub.duration ? ` (${escapeHtml(sub.duration)})` : ""}</p>`;
  const intro =
    labeledField("Mục tiêu:", sub.objective) + labeledField("Nội dung:", sub.content);

  const left = organizationStepsHtml(sub.organization) || "<p></p>";
  const right = sub.product?.trim() ? paragraphs(sub.product) : "<p></p>";
  const table = `<table><tbody><tr><th>Hoạt động của GV và HS</th><th>Sản phẩm dự kiến</th></tr><tr><td>${left}</td><td>${right}</td></tr></tbody></table>`;

  return `${title}${intro}${table}`;
}

/**
 * Một hoạt động Phần III. Tiểu hoạt động (nhánh `isSub`, chỉ có ở HĐ2) đóng thành bảng
 * 2 cột; hoạt động cấp 1 (HĐ1/3/4) giữ đoạn văn a/b/c/d. Khi có tiểu HĐ, kết thúc bằng
 * một `<p></p>` để bảng cuối không bị `insertContentAt` cắt mất (open-end) và để con trỏ
 * đặt được dưới bảng.
 */
export function activityHtml(activity: Activity5512, isSub = false): string {
  if (isSub) return subActivityTableHtml(activity);

  const heading = `<h3>${escapeHtml(activity.name)}${activity.duration ? ` (${escapeHtml(activity.duration)})` : ""}</h3>`;

  const subActivities = activity.subActivities ?? [];
  const subs = subActivities.map((sub) => activityHtml(sub, true)).join("");
  const trailing = subActivities.length > 0 ? "<p></p>" : "";

  return `
    ${heading}
    ${labeledField("a) Mục tiêu:", activity.objective)}
    ${labeledField("b) Nội dung:", activity.content)}
    ${labeledField("c) Sản phẩm:", activity.product)}
    ${organizationHtml(activity)}
    ${subs}
    ${trailing}
  `;
}

/**
 * Block "⏳ Đang soạn…" cho một hoạt động Phần III chưa về (luồng streaming). Khớp node
 * `pendingActivity` (atom, khoá) ở {@link ./pendingActivityNode}; fill xong sẽ bị thay.
 */
export function pendingActivityHtml(activity: Activity5512) {
  return (
    `<div data-pending-activity data-order="${activity.order}"` +
    ` data-name="${escapeHtml(activity.name)}"` +
    ` data-duration="${escapeHtml(activity.duration ?? "")}"></div>`
  );
}

/**
 * Sinh khung Kế hoạch bài dạy 5512 (Phụ lục IV, kiểu KNTT) thành HTML.
 *
 * @param opts.pendingOrders tập `order` các hoạt động Phần III đang chờ soạn (streaming) —
 *   các hoạt động này render dưới dạng block "đang soạn" thay vì nội dung.
 */
export function lessonPlan5512ToHtml(
  plan: LessonPlan5512,
  opts?: { pendingOrders?: Set<number> },
) {
  const { metadata, objectives, equipmentAndMaterials, activities } = plan;
  const pending = opts?.pendingOrders;

  const title = plan.title?.startsWith("TÊN BÀI DẠY:")
    ? plan.title
    : `TÊN BÀI DẠY: ${plan.title}`;
  const meta = `${escapeHtml(metadata?.subject)} · ${escapeHtml(metadata?.grade)} · ${escapeHtml(metadata?.duration)}`;

  const worksheetsHtml = (equipmentAndMaterials?.worksheets ?? [])
    .map((worksheet) => worksheetBoxHtml(worksheet))
    .join("");

  const activitiesHtml = (activities ?? [])
    .map((activity) =>
      pending?.has(activity.order) ? pendingActivityHtml(activity) : activityHtml(activity),
    )
    .join("");

  return `
    <h1>${escapeHtml(title)}</h1>
    <p class="document-meta">${meta}</p>

    <section>
      <h2>I. MỤC TIÊU</h2>
      <p><b>1. Kiến thức</b></p>
      ${bulletList(objectives.knowledge)}
      <p><b>2. Năng lực</b></p>
      <p><b>2.1. Năng lực chung</b></p>
      ${bulletList(objectives.competencies.general)}
      <p><b>2.2. Năng lực đặc thù môn học</b></p>
      ${bulletList(objectives.competencies.specific)}
      <p><b>3. Phẩm chất</b></p>
      ${bulletList(objectives.qualities)}
    </section>

    <section>
      <h2>II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU</h2>
      ${equipmentTableHtml(equipmentAndMaterials?.equipment)}
      ${worksheetsHtml}
    </section>

    <section>
      <h2>III. TIẾN TRÌNH DẠY HỌC</h2>
      ${activitiesHtml}
    </section>
  `;
}

interface LessonEditorProps {
  margins: { left: number; right: number };
  editor: Editor | null;
}

export function LessonEditor({ margins, editor }: LessonEditorProps) {
  // Nội dung được đổ/fill vào editor bởi hook streaming `useLessonPlanStream`
  // (gắn ở LessonEditDashboard). Component này chỉ render khung editor.
  return (
    <div className="pb-10">
      <div className="mx-auto w-full max-w-[816px]">
        <div
          className="bg-white py-14 shadow-[0_1px_2px_rgba(43,41,38,0.06),0_4px_14px_rgba(43,41,38,0.05)]"
          style={{
            paddingLeft: margins.left,
            paddingRight: margins.right,
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
