/**
 * URL backend dùng cho các client gọi thẳng BE, không qua rewrite Next.js
 * `/api/*` (`fe/next.config.ts`): slide generation/design (`lib/api/slides.ts`,
 * `lib/api/slide-design.ts`, `lib/api/molecule-build.ts`) và WebSocket STOMP
 * streaming (`lib/ws/*.ts`).
 *
 * Ưu tiên override qua `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL`. Nếu
 * không set, tự chọn theo môi trường build:
 * - `next dev` (NODE_ENV=development) → BE local `localhost:8080`.
 * - `next build && next start` (Coolify deploy chạy production) → BE đã deploy.
 */
const DEPLOYED_BACKEND_HTTP_URL = "https://q0k0k4c0ss00cc4004k4okss.103.72.56.152.sslip.io";
const DEPLOYED_BACKEND_WS_URL = "wss://q0k0k4c0ss00cc4004k4okss.103.72.56.152.sslip.io";

const isProd = process.env.NODE_ENV === "production";

export const BACKEND_HTTP_URL =
  process.env.NEXT_PUBLIC_API_URL ?? (isProd ? DEPLOYED_BACKEND_HTTP_URL : "http://localhost:8080");

export const BACKEND_WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? (isProd ? DEPLOYED_BACKEND_WS_URL : "ws://localhost:8080");
