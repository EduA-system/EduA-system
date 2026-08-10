import type { ExperimentSummary } from "@/lib/sandbox/react-experiments";

/**
 * Client cho `/api/sandbox-experiment` — nguồn mã nguồn thí nghiệm vật lý của
 * element sandbox trong slide.
 *
 * Gọi same-origin (không qua `BACKEND_HTTP_URL`): đây là route handler của
 * chính Next, không phải endpoint Spring — nó đọc `components/simulations/`
 * từ đĩa bằng `node:fs`, thứ mà client không làm được.
 */

/** Dự án Sandpack của một thí nghiệm: metadata + toàn bộ file mã nguồn. */
export type SandboxExperiment = ExperimentSummary & {
  files: Record<string, string>;
  focusPath: string;
  fileCount: number;
  /** CSS Tailwind app đã biên dịch; null nếu chưa tìm thấy (xem lib/sandbox/app-css.ts). */
  tailwindCss: string | null;
};

// Cache theo id: một deck có thể dùng cùng thí nghiệm ở nhiều slide, và mỗi
// lượt tải là hàng chục file. Giữ cả Promise đang bay để hai element kích hoạt
// cùng lúc không bắn hai request.
const experimentCache = new Map<string, Promise<SandboxExperiment>>();
let catalogueCache: Promise<ExperimentSummary[]> | null = null;

/** Danh mục thí nghiệm (metadata, KHÔNG kèm mã nguồn) để dựng bộ chọn. */
export function listSandboxExperiments(): Promise<ExperimentSummary[]> {
  catalogueCache ??= (async () => {
    const res = await fetch("/api/sandbox-experiment", { cache: "no-store" });
    if (!res.ok) throw new Error("Không tải được danh sách thí nghiệm vật lý.");
    const data = (await res.json()) as { experiments: ExperimentSummary[] };
    return data.experiments;
  })().catch((error: unknown) => {
    // Đừng ghim lỗi vĩnh viễn — lần mở panel sau phải thử lại được.
    catalogueCache = null;
    throw error;
  });
  return catalogueCache;
}

/** Một thí nghiệm kèm toàn bộ file để nạp vào Sandpack. */
export function loadSandboxExperiment(id: string): Promise<SandboxExperiment> {
  const cached = experimentCache.get(id);
  if (cached) return cached;

  const pending = (async () => {
    const res = await fetch(`/api/sandbox-experiment?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Không tải được thí nghiệm "${id}".`);
    return (await res.json()) as SandboxExperiment;
  })().catch((error: unknown) => {
    experimentCache.delete(id);
    throw error;
  });

  experimentCache.set(id, pending);
  return pending;
}
