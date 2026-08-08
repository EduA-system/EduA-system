/**
 * /sandbox — chạy thử mô phỏng vật lý bằng CHÍNH mã nguồn của app.
 *
 * Đây là Server Component: nó đọc `components/simulations/**` từ đĩa lúc
 * build, gom bao đóng phụ thuộc của từng preset rồi truyền xuống client để
 * nạp vào Sandpack. Không chép code, không có bản sao nào để trôi — sửa
 * `components/simulations/` là trang này đổi theo ngay.
 *
 * Khác với /mo-phong-vat-ly (thư viện đã kiểm duyệt, gắn với backend và
 * phiên đăng nhập), trang này chạy hoàn toàn phía client và mở tự do.
 */

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { SandboxClient } from "@/components/sandbox/SandboxClient";
import {
  loadReactExperiments,
  loadUnsupportedPresets,
} from "@/lib/sandbox/react-experiments";

export default function SandboxPage() {
  const experiments = loadReactExperiments();
  const unsupported = loadUnsupportedPresets();

  return (
    <main className="flex h-screen w-full overflow-hidden bg-white">
      <Sidebar activeHref="/sandbox" />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e8e2d9] bg-white px-4">
          <Link
            href="/mo-phong-vat-ly"
            className="flex items-center gap-1.5 text-[13px] font-medium text-[#6b6b6b] transition-colors duration-150 ease-out hover:text-[#171717]"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            Mô phỏng
          </Link>
          <span className="text-[#d8d1c9]">/</span>
          <span className="text-[14px] font-semibold text-[#171717]">
            Sandbox
          </span>
          <span className="ml-2 hidden text-[12px] text-[#8a8178] lg:inline">
            Chạy mã nguồn thật trong components/simulations — {experiments.length} thí nghiệm
          </span>
          {/* Sandpack bundle bằng hạ tầng từ xa của CodeSandbox. */}
          <span
            title="Sandpack dùng bundler từ xa của CodeSandbox — cần kết nối Internet"
            className="ml-auto flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-medium text-amber-700"
          >
            <span className="size-1.5 rounded-full bg-current" />
            Cần Internet
          </span>
        </div>

        <SandboxClient experiments={experiments} unsupported={unsupported} />
      </div>
    </main>
  );
}
