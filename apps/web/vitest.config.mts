import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve the "@/*" alias from tsconfig.json, as Next.js does.
  resolve: {
    tsconfigPaths: true,
  },
});
