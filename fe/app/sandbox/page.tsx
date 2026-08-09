/**
 * /sandbox — thư viện thí nghiệm chạy bằng MÃ NGUỒN THẬT của app.
 *
 * Bố cục theo /mo-phong-vat-ly (lưới thẻ, ảnh thu nhỏ, lọc theo lĩnh vực),
 * nhưng mỗi thí nghiệm có URL riêng `/sandbox/<id>` thay vì đổi state tại chỗ
 * — nhờ vậy chia sẻ được link tới đúng một thí nghiệm.
 *
 * Đây là Server Component: nó chỉ đọc METADATA của preset (vài KB mỗi file).
 * Việc gom cây phụ thuộc hàng trăm KB để dành cho trang chi tiết.
 */

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Thumb } from "@/components/simulations/shared/simulation-thumb";
import {
  listExperiments,
  loadUnsupportedPresets,
} from "@/lib/sandbox/react-experiments";

export default function SandboxLibraryPage() {
  const experiments = listExperiments();
  const unsupported = loadUnsupportedPresets();

  // Nhóm theo lĩnh vực, giữ thứ tự xuất hiện để không phải chép cứng danh sách
  // DOMAINS — thư mục preset là nguồn duy nhất.
  const byDomain = new Map<string, typeof experiments>();
  for (const e of experiments) {
    const list = byDomain.get(e.domain) ?? [];
    list.push(e);
    byDomain.set(e.domain, list);
  }

  return (
    <main className="flex h-screen w-full overflow-hidden bg-white">
      <Sidebar activeHref="/sandbox" />

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-[#e8e2d9] bg-white px-8 py-5">
          <Link
            href="/mo-phong-vat-ly"
            className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6b6b6b] transition-colors duration-150 ease-out hover:text-[#171717]"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            Mô phỏng
          </Link>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="font-libertine text-2xl font-bold text-[#171717]">
                Sandbox
              </h1>
              <p className="mt-1 text-sm text-[#6b6b6b]">
                {experiments.length} thí nghiệm • chạy mã nguồn thật trong
                components/simulations, bundle ngay trong trình duyệt
              </p>
            </div>
            {unsupported.length > 0 && (
              <span
                title={unsupported
                  .map((u) => `${u.title} (${u.kind})`)
                  .join("\n")}
                className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-700"
              >
                {unsupported.length} preset chưa hỗ trợ
              </span>
            )}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-8">
          {[...byDomain.entries()].map(([domain, list]) => (
            <div key={domain} className="mb-9 last:mb-0">
              <h2 className="mb-4 flex items-center gap-2 text-[13px] font-semibold tracking-wide text-[#8a8178] uppercase">
                {domain}
                <span className="rounded-full bg-[#f5f1ec] px-2 py-0.5 text-[11px] font-medium normal-case text-[#6b6b6b]">
                  {list.length}
                </span>
              </h2>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {list.map((sim) => (
                  <Link
                    key={sim.id}
                    href={`/sandbox/${sim.id}`}
                    className="group overflow-hidden rounded-[16px] border border-[#e8e2d9] bg-white text-left shadow-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-[#d97757] hover:shadow-md"
                  >
                    <div className="aspect-[5/3] w-full overflow-hidden bg-[#0f172a] p-2.5">
                      <div className="relative h-full w-full overflow-hidden rounded-[10px]">
                        {/* Ảnh thu nhỏ dùng chung với /mo-phong-vat-ly. Phải
                            truyền `presetId` chứ không phải tên file: 13 preset
                            có hai giá trị này khác nhau (vd `brownian.ts` khai
                            `brownian-pollen`), và Thumb khoá theo preset.id. */}
                        <Thumb id={sim.presetId} />
                      </div>
                    </div>
                    <div className="space-y-1.5 p-5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {sim.grade !== null && (
                          <span className="rounded-full bg-[#fff4ef] px-2 py-0.5 text-[11px] font-medium text-[#c96545]">
                            Lớp {sim.grade}
                          </span>
                        )}
                        <span
                          title={
                            sim.mode === "self-contained"
                              ? "Component tự dựng toàn bộ giao diện"
                              : "Chạy qua renderer theo kind"
                          }
                          className="rounded-full bg-[#f5f1ec] px-2 py-0.5 text-[11px] font-medium text-[#6b6b6b]"
                        >
                          {sim.kind}
                        </span>
                      </div>
                      <h3 className="text-[15px] font-semibold text-[#171717] group-hover:text-[#c96545]">
                        {sim.title}
                      </h3>
                      {sim.desc && (
                        <p className="line-clamp-2 text-[12px] leading-relaxed text-[#6b6b6b]">
                          {sim.desc}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
