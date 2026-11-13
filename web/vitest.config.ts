import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["app/lib/**", "app/components/**"],
      exclude: ["app/lib/illustrations.ts"],
      reporter: ["text-summary", "text", "json-summary"],
      thresholds: { statements: 55, branches: 70, functions: 40, lines: 55 },   // fail the build if coverage drops
    },
  },
});
