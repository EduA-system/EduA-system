import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Lấy CSS Tailwind mà CHÍNH app đã biên dịch, để nạp vào dự án Sandpack.
 *
 * Vì sao cần: dự án Sandpack là create-react-app, không có bước build
 * Tailwind. Thiếu nó thì `h-full` vô nghĩa → useContainerSize đọc
 * clientHeight = 0 → renderer không dựng stage, và bố cục của 23 thí nghiệm
 * tự dựng giao diện vỡ hết.
 *
 * Vì sao không dùng Tailwind Play CDN: nó là v3 (app dùng v4), cần Internet,
 * và trình chặn quảng cáo có thể cắt mất — đã thấy `cloudflareinsights` bị
 * ERR_BLOCKED_BY_CLIENT trên chính máy dev.
 *
 * Vì sao đọc từ `.next`: mã mô phỏng vốn là một phần của app, nên Tailwind đã
 * sinh sẵn đúng những class chúng dùng — kể cả giá trị tuỳ ý như
 * `bg-[#0f172a]`. Không phải bảo trì danh sách class nào cả.
 */

/** Thư mục chứa CSS đã build, cho cả `next dev` lẫn `next build`. */
const CSS_DIRS = [
  ".next/static/chunks",
  ".next/static/css",
  ".next/dev/static/chunks",
];

/**
 * Dấu hiệu nhận biết file CSS chứa utility của Tailwind. Chọn class mà mã mô
 * phỏng thật sự dùng, để không vớ phải bundle CSS của thư viện khác.
 */
const MARKERS = [".h-full", ".pointer-events-none"];

let cache: string | null | undefined;

export function loadAppTailwindCss(): string | null {
  if (cache !== undefined) return cache;

  const root = process.cwd();
  let best: { css: string; size: number } | null = null;

  for (const dir of CSS_DIRS) {
    const full = resolve(root, dir);
    if (!existsSync(full)) continue;

    for (const name of readdirSync(full)) {
      if (!name.endsWith(".css")) continue;
      const file = join(full, name);
      let size: number;
      try {
        size = statSync(file).size;
      } catch {
        continue;
      }
      // Bundle Tailwind của app luôn trên trăm KB; bỏ qua file nhỏ lẻ.
      if (size < 50_000) continue;

      const css = readFileSync(file, "utf8");
      if (!MARKERS.every((marker) => css.includes(marker))) continue;
      // Nhiều chunk cùng chứa Tailwind; lấy cái đầy đủ nhất.
      if (!best || size > best.size) best = { css, size };
    }
  }

  cache = best?.css ?? null;
  return cache;
}
