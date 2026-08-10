/**
 * Cấp mã nguồn thí nghiệm vật lý cho element sandbox trong slide.
 *
 * PHẢI là path TĨNH, không được là `app/api/sandbox/[id]/route.ts`:
 * `next.config.ts` rewrite `/api/:path*` sang backend Spring, và theo thứ tự
 * định tuyến của Next (non-dynamic pages → afterFiles rewrites → dynamic
 * routes) thì một route động dưới `/api/` sẽ bị proxy đi trước khi được xét.
 * Ba route handler cục bộ đang có đều là path tĩnh vì lý do này.
 *
 * Không cần đăng nhập: chỉ trả mã nguồn đã nằm trong repo, giống lý do
 * `/sandbox` để `requireAuth: false` (xem lib/auth/permissions.ts).
 */

import { getExperiment, listExperiments } from "@/lib/sandbox/react-experiments";
import { loadAppTailwindCss } from "@/lib/sandbox/app-css";

// Đọc CSS đã build lúc CHẠY, không phải lúc prerender: khi `next build` dựng
// sẵn route này thì file CSS chưa phát sinh xong (xem app-css.ts).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");

  // Không có `id` → danh mục để dựng bộ chọn trong editor. Chỉ metadata, không
  // kèm mã nguồn: gom cây phụ thuộc cho cả 60 thí nghiệm là hàng trăm KB.
  if (!id) return Response.json({ experiments: listExperiments() });

  const experiment = getExperiment(id);
  if (!experiment) {
    return Response.json({ message: `Không tìm thấy thí nghiệm "${id}".` }, { status: 404 });
  }

  return Response.json({ ...experiment, tailwindCss: loadAppTailwindCss() });
}
