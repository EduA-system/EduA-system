import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Test cho kernel vật lý thuần TS (không DOM/React/Konva) → environment node.
// Alias "@" khớp tsconfig paths để import kiểu @/components/... resolve được.
export default defineConfig({
  resolve: { alias: { "@": resolve(__dirname, ".") } },
  test: {
    environment: "node",
    include: [
      "components/simulations/**/*.test.ts",
      "components/slide-editor/lib/**/*.test.ts",
      "lib/slide-create/**/*.test.ts",
      "lib/api/**/*.test.ts",
      "lib/slide-deck-library.test.ts",
      "lib/slide-html-export.test.ts",
      "lib/slide-layout/**/*.test.ts",
    ],
  },
});
