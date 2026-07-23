import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Match the app's `@/*` path alias so tests can import like the source does.
  resolve: { alias: [{ find: /^@\//, replacement: `${root}/` }] },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
