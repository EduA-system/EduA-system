/**
 * /sandbox/<id> — chạy một thí nghiệm bằng mã nguồn thật của app.
 *
 * URL riêng cho từng thí nghiệm nên chia sẻ link được, và bấm Back của trình
 * duyệt quay về đúng thư viện thay vì thoát trang.
 *
 * Server Component: đọc mã nguồn mô phỏng từ đĩa rồi truyền xuống client để
 * nạp vào Sandpack (xem lib/sandbox/collect-files.ts).
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { SandboxClient } from "@/components/sandbox/SandboxClient";
import { getExperiment } from "@/lib/sandbox/react-experiments";
import { loadAppTailwindCss } from "@/lib/sandbox/app-css";

// Đọc CSS đã build của app lúc CHẠY, không phải lúc prerender: khi `next build`
// dựng sẵn trang này thì file CSS chưa được phát sinh xong (xem app-css.ts).
export const dynamic = "force-dynamic";

export default async function SandboxExperimentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const experiment = getExperiment(id);
  if (!experiment) notFound();

  const tailwindCss = loadAppTailwindCss();

  return (
    <main className="flex h-screen w-full overflow-hidden bg-white">
      <Sidebar activeHref="/sandbox" />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e8e2d9] bg-white px-4">
          <Link
            href="/sandbox"
            className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-[#6b6b6b] transition-colors duration-150 ease-out hover:text-[#171717]"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            Sandbox
          </Link>
          <span className="text-[#d8d1c9]">/</span>
          <span className="truncate text-[14px] font-semibold text-[#171717]">
            {experiment.title}
          </span>
          <span className="hidden shrink-0 text-[12px] text-[#8a8178] lg:inline">
            {experiment.domain}
            {experiment.grade !== null ? ` · Lớp ${experiment.grade}` : ""}
          </span>
        </div>

        <SandboxClient experiment={experiment} tailwindCss={tailwindCss} />
      </div>
    </main>
  );
}
