import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { BACKEND_HTTP_URL } from "./lib/backend-url";

// next.config.ts lives in `fe/`, so its directory IS the frontend root.
// Pinning turbopack.root stops Next.js from guessing the monorepo root
// (the parent `package-lock.json`), which caused the `next/font/local`
// virtual module to be treated as a CSS Module and rejected by Lightning CSS
// ("Selector * is not pure").
const feRoot = join(dirname(fileURLToPath(import.meta.url)));

// Backend base URL. Proxied so the browser calls same-origin `/api/*` and we
// avoid CORS in dev/prod. Override with BACKEND_URL, else auto-detected by
// `lib/backend-url.ts` (localhost in dev, deployed BE in production builds).
const backendUrl = process.env.BACKEND_URL ?? BACKEND_HTTP_URL;

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["172.22.64.1"],
  turbopack: {
    root: feRoot,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

