import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "src")
    }
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    // Integration tests share one Postgres database; run files serially to keep
    // state deterministic and avoid cross-test interference.
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000
  }
});
