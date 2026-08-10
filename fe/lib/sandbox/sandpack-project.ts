/**
 * Khung dự án Sandpack dùng chung.
 *
 * Hai nơi nạp mã mô phỏng vào Sandpack — bàn chạy thử `/sandbox` và element
 * sandbox trong slide — phải dựng cùng một dự án, nếu không thí nghiệm sẽ chạy
 * khác nhau ở hai chỗ. Gom hằng số về đây để chúng không trôi khỏi nhau.
 *
 * Thuần dữ liệu, không import React: dùng được ở cả server lẫn client.
 */

/** Khớp phiên bản với fe/package.json để hành vi trong sandbox không lệch app. */
export const SANDPACK_DEPENDENCIES = {
  konva: "^10.3.0",
  tweakpane: "^4.0.5",
  "lucide-react": "^1.23.0",
};

/**
 * Bỏ StrictMode của template: app thật không dùng, và StrictMode gọi effect
 * hai lần nên renderer Konva (imperative) sẽ dựng stage hai lần.
 */
export const SANDPACK_INDEX_TSX = `import { createRoot } from "react-dom/client";
import "./tailwind.css";
import "./styles.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(<App />);
`;

/**
 * Khung HTML của dự án Sandpack. Ghi đè bản của template chỉ để đổi ngôn ngữ
 * và tiêu đề — Tailwind KHÔNG nạp qua CDN ở đây, xem lib/sandbox/app-css.ts.
 */
export const SANDPACK_INDEX_HTML = `<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Thí nghiệm</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

/** Reset tối thiểu; mọi utility đến từ CSS Tailwind của app (xem app-css.ts). */
export const SANDPACK_STYLES_CSS = `* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
`;

/**
 * Ghép file mã nguồn của thí nghiệm với khung dự án.
 * Các file khung để `hidden` — người dùng chỉ nên thấy mã của thí nghiệm.
 */
export function buildSandpackFiles(
  experimentFiles: Record<string, string>,
  tailwindCss: string | null,
): Record<string, { code: string; hidden?: boolean }> {
  return {
    ...Object.fromEntries(
      Object.entries(experimentFiles).map(([path, code]) => [path, { code }]),
    ),
    "/index.tsx": { code: SANDPACK_INDEX_TSX, hidden: true },
    "/styles.css": { code: SANDPACK_STYLES_CSS, hidden: true },
    "/public/index.html": { code: SANDPACK_INDEX_HTML, hidden: true },
    // Tailwind của app. Nếu chưa tìm được file CSS đã build thì để rỗng —
    // thí nghiệm vẫn chạy, chỉ mất bố cục.
    "/tailwind.css": { code: tailwindCss ?? "", hidden: true },
  };
}
