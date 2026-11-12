import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.{ts,tsx}"],
    // next-intl's proxy imports `next/server` without the extension Node's
    // ESM resolution needs: Vite resolves it when it bundles next-intl.
    server: { deps: { inline: ["next-intl"] } },
  },
});
