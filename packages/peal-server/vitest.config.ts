import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // Files share each worker's modules, so a file does not import the
    // server again (four times faster): no test keeps state in a module,
    // which runs in a shuffled file order (`--sequence.shuffle.files`) check.
    isolate: false,
    // Integration tests wait for emails to reach Mailpit.
    testTimeout: 90_000,
  },
});
