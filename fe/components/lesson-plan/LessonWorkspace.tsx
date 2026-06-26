import Link from "next/link";
import { homework, kpis, materials, methods, objectives, timeline } from "../dashboard/data";
import { DashboardIcon } from "../ui/DashboardIcon";
import { WorkspaceSection } from "../ui/WorkspaceSection";

export function LessonWorkspace() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pt-2">
        <span className="size-1.5 rounded-full bg-[#e8724a]" />
        <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6b6b6b]">
          Giáo án đã được tạo
        </span>
        <span className="h-px flex-1 bg-[#d8d1c9]" />
        <span className="rounded-full border border-[#d8d1c9] bg-white px-3 py-1 text-[10px] text-[#6b6b6b]">
          Generated
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(([value, label]) => (
          <div key={label} className="rounded-[12px] border border-[#d8d1c9] bg-white px-5 py-4">
            <div className={`text-[26px] font-semibold leading-none ${value === "45" ? "text-[#e8724a]" : "text-[#171717]"}`}>
              {value}
            </div>
            <div className="mt-2 text-[12px] text-[#6b6b6b]">{label}</div>
          </div>
        ))}
      </div>

      <WorkspaceSection title="Mục tiêu bài học" icon="sectionObjectives">
        <ul className="space-y-2.5 text-[13px] leading-[21px] text-[#171717]">
          {objectives.map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full border border-[#e8724a]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </WorkspaceSection>

      <WorkspaceSection title="Phương pháp giảng dạy" icon="sectionMethods">
        <div className="grid gap-x-12 gap-y-3 text-[13px] text-[#171717] sm:grid-cols-2">
          {methods.map((item) => (
            <div key={item} className="flex gap-3">
              <span className="mt-2 size-1 rounded-full bg-[#e8724a]" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection title="Học liệu" icon="sectionMaterials">
        <ul className="space-y-2.5 text-[13px] leading-[21px] text-[#171717]">
          {materials.map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-2 size-1 rounded-full bg-[#e8724a]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </WorkspaceSection>

      <WorkspaceSection title="Tiến trình bài học" icon="sectionTimeline">
        <div className="space-y-0">
          {timeline.map((item, index) => (
            <div key={item.title} className="grid grid-cols-[16px_1fr] gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-[13px] size-2.5 rounded-full border-2 border-[#e8724a] bg-white" />
                {index < timeline.length - 1 ? <span className="mt-1 h-[54px] w-px bg-[#d8d1c9]" /> : null}
              </div>
              <div className="mb-2 rounded-[12px] border border-[#d8d1c9] bg-white px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold text-[#171717]">{item.title}</span>
                  <span className="rounded-full bg-[#f5f1ec] px-2.5 py-1 text-[11px] text-[#6b6b6b]">{item.time}</span>
                  <span className="rounded-full bg-[#f5f1ec] px-2.5 py-1 text-[11px] text-[#6b6b6b]">{item.type}</span>
                </div>
                <p className="mt-1 text-[13px] leading-[20px] text-[#6b6b6b]">{item.description}</p>
              </div>
            </div>
          ))}
          <div className="ml-[29px] flex items-center gap-2 text-[12px] text-[#6b6b6b]">
            <DashboardIcon name="sectionTimeline" />
            Tổng thời lượng: 45 phút
          </div>
        </div>
      </WorkspaceSection>

      <WorkspaceSection title="Củng cố" icon="sectionConsolidate">
        <p className="text-[13px] leading-[23px] text-[#6b6b6b]">
          Giáo viên yêu cầu học sinh tóm tắt nội dung bài học bằng sơ đồ tư duy hoặc 3 câu.
          Nhấn mạnh mối liên hệ giữa dao động điều hòa và các hiện tượng vật lý thực tiễn.
        </p>
        <div className="mt-3 rounded-[10px] border border-[#e8724a] border-l-[3px] bg-[#faf7f4] px-4 py-3 text-[13px] leading-[21px] text-[#6b6b6b]">
          Gợi ý: Hỏi học sinh &quot;Dao động điều hòa khác dao động thường ở điểm gì?&quot; để kiểm tra mức độ hiểu bài.
        </div>
      </WorkspaceSection>

      <WorkspaceSection title="Bài tập về nhà" icon="sectionHomework">
        <ol className="space-y-2.5 text-[13px] leading-[21px] text-[#171717]">
          {homework.map((item, index) => (
            <li key={item} className="flex gap-2.5">
              <span className="font-bold text-[#e8724a]">{index + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </WorkspaceSection>

      <div className="flex justify-center gap-2.5 pt-2">
        <button className="flex h-[42px] items-center gap-2 rounded-[12px] border border-[#d8d1c9] bg-white px-5 text-[13px] font-medium text-[#171717]">
          <DashboardIcon name="save" />
          Lưu giáo án
        </button>
        <Link
          href="/slide-create"
          className="flex h-[42px] items-center gap-2 rounded-[12px] bg-[#e8724a] px-5 text-[13px] font-medium text-white shadow-[0_4px_8px_rgba(232,114,74,0.28)]"
        >
          <DashboardIcon name="createSlide" />
          Tạo slide
        </Link>
      </div>
    </div>
  );
}
