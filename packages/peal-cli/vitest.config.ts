import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // Files share each worker's modules, so a file does not import the
    // workspace again: no test keeps state in a module, which shuffled runs
    // (`--sequence.shuffle`) check.
    isolate: false,
  },
});
