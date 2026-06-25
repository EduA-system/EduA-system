"use client";

import { useMemo, useRef } from "react";
import { lessonPlan5512Mock } from "@/data/lessonPlan5512Mock";
import type { Activity5512, LessonPlan5512 } from "@/data/lessonPlan5512Mock";

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
function lessonPlan5512ToHtml(plan: LessonPlan5512) {
  const { metadata, objectives, equipmentAndMaterials, activities } = plan;

  const meta = `${escapeHtml(metadata.subject)} · ${escapeHtml(metadata.grade)} · ${escapeHtml(metadata.duration)}`;

  const worksheetsHtml = equipmentAndMaterials.worksheets
    .map(
      (worksheet) =>
        `<p><b>${escapeHtml(worksheet.name)}:</b> ${escapeHtml(worksheet.content)}</p>`,
    )
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
      ${bulletList(equipmentAndMaterials.equipment)}
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
}

export function LessonEditor({ margins }: LessonEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const initialHtml = useMemo(() => lessonPlan5512ToHtml(lessonPlan5512Mock), []);

  const handleInput = () => {
    // Keep the handler for future autosave hooks without making typing controlled.
  };

  return (
    <div className="pb-10">
      <div className="mx-auto w-full max-w-[816px]">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          className="lesson-document-editor min-h-[calc(100vh-188px)] bg-white py-14 text-[#2b2926] shadow-[0_1px_2px_rgba(43,41,38,0.06),0_4px_14px_rgba(43,41,38,0.05)] outline-none"
          style={{
            paddingLeft: margins.left,
            paddingRight: margins.right,
          }}
          dangerouslySetInnerHTML={{ __html: initialHtml }}
          onInput={handleInput}
        />
      </div>
    </div>
  );
}