import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.{ts,tsx}"],
    // Files share each worker's modules, so a file does not import the
    // workspace again: no test keeps state in a module, which shuffled runs
    // (`--sequence.shuffle`) check.
    isolate: false,
    // next-intl's proxy imports `next/server` without the extension Node's
    // ESM resolution needs: Vite resolves it when it bundles next-intl.
    server: { deps: { inline: ["next-intl"] } },
  },
});
