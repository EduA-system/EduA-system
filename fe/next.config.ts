import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// next.config.ts lives in `fe/`, so its directory IS the frontend root.
// Pinning turbopack.root stops Next.js from guessing the monorepo root
// (the parent `package-lock.json`), which caused the `next/font/local`
// virtual module to be treated as a CSS Module and rejected by Lightning CSS
// ("Selector * is not pure").
const feRoot = join(dirname(fileURLToPath(import.meta.url)));

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: feRoot,
  },
};

export default nextConfig;
