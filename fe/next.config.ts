import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// next.config.ts lives in `fe/`, so its directory IS the frontend root.
// Pinning turbopack.root stops Next.js from guessing the monorepo root
// (the parent `package-lock.json`), which caused the `next/font/local`
// virtual module to be treated as a CSS Module and rejected by Lightning CSS
// ("Selector * is not pure").
const feRoot = join(dirname(fileURLToPath(import.meta.url)));

// Backend base URL. Proxied so the browser calls same-origin `/api/*` and we
// avoid CORS in dev/prod. Override with BACKEND_URL when BE is not on :8080.
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  output: "standalone",
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
