import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // Integration tests wait for emails to reach Mailpit.
    testTimeout: 90_000,
  },
});
