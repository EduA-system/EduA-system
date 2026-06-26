"use client";

import { useEffect } from "react";
import { EditorContent, type Editor } from "@tiptap/react";
import { lessonPlan5512Mock } from "@/data/lessonPlan5512Mock";
import type {
  Activity5512,
  EquipmentTable,
  LessonPlan5512,
  Worksheet,
} from "@/data/lessonPlan5512Mock";
import { readGeneratedLessonPlan } from "@/services/lessonPlanService";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** <ul> từ danh sách chuỗi; rỗng → chuỗi rỗng. */
function bulletList(items: string[]) {
  if (items.length === 0) return "";
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

/** Tách chuỗi nhiều dòng thành các <p>; rỗng → một <p> trống để ô bảng không sập. */
function paragraphs(text: string) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return "<p></p>";
  return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
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

/** Mục d) Tổ chức thực hiện — 4 bước chuẩn. */
function organizationHtml(activity: Activity5512) {
  const { transfer, perform, report, conclude } = activity.organization;
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

/** Một hoạt động/tiểu hoạt động với 4 ô a/b/c/d, đệ quy cho subActivities. */
function activityHtml(activity: Activity5512, isSub = false): string {
  const heading = isSub
    ? `<p class="activity-sub-title"><b>${escapeHtml(activity.name)}</b>${activity.duration ? ` (${escapeHtml(activity.duration)})` : ""}</p>`
    : `<h3>${escapeHtml(activity.name)}${activity.duration ? ` (${escapeHtml(activity.duration)})` : ""}</h3>`;

  const subs = activity.subActivities.map((sub) => activityHtml(sub, true)).join("");

  return `
    ${heading}
    <p><b>a) Mục tiêu:</b> ${escapeHtml(activity.objective)}</p>
    <p><b>b) Nội dung:</b> ${escapeHtml(activity.content)}</p>
    <p><b>c) Sản phẩm:</b> ${escapeHtml(activity.product)}</p>
    ${organizationHtml(activity)}
    ${subs}
  `;
}

/** Sinh khung Kế hoạch bài dạy 5512 (Phụ lục IV, kiểu KNTT) thành HTML. */
export function lessonPlan5512ToHtml(plan: LessonPlan5512) {
  const { metadata, objectives, equipmentAndMaterials, activities } = plan;

  const meta = `${escapeHtml(metadata.subject)} · ${escapeHtml(metadata.grade)} · ${escapeHtml(metadata.duration)}`;

  const worksheetsHtml = equipmentAndMaterials.worksheets
    .map((worksheet) => worksheetBoxHtml(worksheet))
    .join("");

  const activitiesHtml = activities.map((activity) => activityHtml(activity)).join("");

  return `
    <h1>${escapeHtml(plan.title)}</h1>
    <p class="document-meta">${meta}</p>

    <section>
      <h2>I. MỤC TIÊU</h2>
      <p><b>1. Về kiến thức</b></p>
      ${bulletList(objectives.knowledge)}
      <p><b>2. Về năng lực</b></p>
      <p><b>2.1. Năng lực chung</b></p>
      ${bulletList(objectives.competencies.general)}
      <p><b>2.2. Năng lực đặc thù môn học</b></p>
      ${bulletList(objectives.competencies.specific)}
      <p><b>3. Về phẩm chất</b></p>
      ${bulletList(objectives.qualities)}
    </section>

    <section>
      <h2>II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU</h2>
      ${equipmentTableHtml(equipmentAndMaterials.equipment)}
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
  // Sau khi sinh ở /lesson-create, BE trả phần I (objectives) và phần II
  // (equipmentAndMaterials) qua sessionStorage. Ghép lên khung 5512 (mock) — các
  // mục còn lại (metadata, III. Tiến trình dạy học) giữ placeholder để GV điền
  // sau — rồi đổ vào editor. Không có giáo án sinh thì giữ nguyên khung mặc định.
  useEffect(() => {
    if (!editor) return;
    const generated = readGeneratedLessonPlan();
    if (!generated) return;

    const merged: LessonPlan5512 = {
      ...lessonPlan5512Mock,
      title: generated.title ?? lessonPlan5512Mock.title,
      objectives: generated.objectives ?? lessonPlan5512Mock.objectives,
      equipmentAndMaterials:
        generated.equipmentAndMaterials ?? lessonPlan5512Mock.equipmentAndMaterials,
    };
    editor.commands.setContent(lessonPlan5512ToHtml(merged));
  }, [editor]);

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
