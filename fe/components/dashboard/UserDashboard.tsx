"use client";

import { useRouter } from "next/navigation";
import { suggestions } from "./data";
import { DashboardIcon } from "../ui/DashboardIcon";
import { Pill, SelectPill } from "../ui/Pill";
import { Sidebar } from "../layout/Sidebar";

export function UserDashboard() {
  const router = useRouter();

  return (
    <main className="h-screen w-full overflow-hidden bg-[#f5f1ec] text-[#171717]">
      <div className="flex h-full w-full">
        <Sidebar />
        <section className="relative min-w-0 flex-1 overflow-y-auto bg-[#f5f1ec] px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          <div className="mx-auto w-full max-w-[980px]">
            <div>
              <div className="inline-flex h-[26px] items-center gap-1.5 rounded-full border border-[#eadfd7] bg-[#fff7f1] px-3 text-[11px] font-medium text-[#d97757]">
                <DashboardIcon name="aiBadge" />
                Soạn giáo án bằng AI
              </div>
              <h1 className="font-libertine mt-4 text-[48px] font-normal leading-none text-[#1f1f1f] sm:text-[64px]">
                Tạo giáo án
              </h1>
              <p className="mt-4 max-w-[440px] text-[13px] leading-[23px] text-[#6b6b6b]">
                Chuyển đổi nội dung chương trình học thành giáo án có cấu trúc với hỗ trợ của AI.
              </p>
            </div>

            <div className="mt-10">
              <p className="text-[12px] font-semibold text-[#6b6b6b]">Gợi ý phổ biến</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <Pill key={suggestion}>{suggestion}</Pill>
                ))}
              </div>
            </div>

            <div className="mt-9 rounded-[14px] border border-[#d8d1c9] bg-white px-7 py-[22px]">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b6b6b]">
                <DashboardIcon name="formTitle" />
                Chọn nội dung giảng dạy
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <SelectPill>Môn học</SelectPill>
                <span className="text-[#d8d1c9]">›</span>
                <SelectPill>Lớp</SelectPill>
                <span className="text-[#d8d1c9]">›</span>
                <SelectPill>Chương học</SelectPill>
                <span className="text-[#d8d1c9]">›</span>
                <SelectPill>Bài học</SelectPill>
              </div>
              <div className="my-6 h-px bg-[#d8d1c9]" />
              <label className="text-[12px] font-medium text-[#6b6b6b]">Tài liệu tham khảo</label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <div className="flex h-[39px] flex-1 items-center rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-[15px] text-[13px] text-[#6b6b6b]">
                  Không sử dụng tài liệu tham khảo
                </div>
                <button className="flex h-[38px] items-center justify-center gap-2 rounded-lg border border-[#d8d1c9] bg-white px-[15px] text-[12px] font-medium text-[#171717]">
                  <DashboardIcon name="upload" />
                  Tải lên tài liệu
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-[17px] text-[#6b6b6b]">
                Hỗ trợ PDF, DOCX, PPTX - giáo án mẫu, bài giảng, tài liệu tham khảo
              </p>
            </div>

            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => router.push("/lesson-edit")}
                className="flex h-[46px] w-[168px] items-center justify-center gap-2 rounded-[12px] bg-[#e8724a] text-[13px] font-medium text-white shadow-[0_4px_8px_rgba(232,114,74,0.28)] transition hover:bg-[#d96a42]"
              >
                <DashboardIcon name="generate" />
                Tạo giáo án
              </button>
              <span className="text-center text-[12px] text-[#6b6b6b]">
                Chọn đủ môn học, lớp, chương và bài để tiếp tục
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
