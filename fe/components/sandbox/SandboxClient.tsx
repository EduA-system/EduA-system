"use client";

/**
 * Ranh giới client cho /sandbox.
 *
 * Cần lớp bọc riêng này vì `dynamic(..., { ssr: false })` CHỈ dùng được bên
 * trong Client Component (xem next/dist/docs/01-app/02-guides/lazy-loading.md).
 * Trang `/sandbox` là Server Component để đọc file mô phỏng từ đĩa, nên nó
 * không tự gọi `dynamic` được.
 *
 * Sandpack đụng tới window/iframe ngay khi mount → phải tắt prerender.
 */

import dynamic from "next/dynamic";
import type { WorkbenchExperiment } from "./SandboxWorkbench";

const SandboxWorkbench = dynamic(
  () => import("./SandboxWorkbench").then((m) => m.SandboxWorkbench),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center text-[13px] text-[#6b6b6b]">
        Đang tải trình chạy thử…
      </div>
    ),
  },
);

export function SandboxClient({
  experiments,
  unsupported,
}: {
  experiments: WorkbenchExperiment[];
  unsupported: { id: string; title: string; kind: string }[];
}) {
  return (
    <SandboxWorkbench experiments={experiments} unsupported={unsupported} />
  );
}
