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
    include: ["src/**/*.test.ts", "workers/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // Scope the gate to the pure logic that unit tests own. Integration-only
      // modules (subscription, entitlement, mailer, routes) are covered by the
      // integration suite and would otherwise skew this unit-coverage number.
      include: [
        "src/lib/health-metrics.ts",
        "src/lib/answer-validation.ts",
        "src/lib/scoring.ts",
        "workers/assessment/handler.ts"
      ],
      exclude: ["**/*.test.ts"],
      thresholds: {
        statements: 80,
        branches: 55,
        functions: 70,
        lines: 80
      }
    }
  }
});
