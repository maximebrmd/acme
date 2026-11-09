import { defineConfig } from "oxlint";
import vitest from "ultracite/oxlint/vitest";

import root from "../../oxlint.config.ts";

// The CLI is a client: it reaches the server over HTTP, through the client
// derived from acme-contract, the same way a self-hoster's scripts would.
const noServer = {
  group: ["acme-server", "acme-server/**"],
  message:
    "The CLI never imports acme-server. Call the API through AcmeApi, the client derived from acme-contract.",
};

// Only the entry point picks the runtime, so commands also run under the
// tests' runtime and against an in-memory server.
const noRuntime = {
  group: ["@effect/platform-bun", "@effect/platform-bun/**"],
  message:
    "Only src/main.ts imports @effect/platform-bun. Take services from the Effect context instead.",
};

// Oxlint lints each file with its nearest config alone, so this extends the
// root config and repeats the properties that extends doesn't carry over.
export default defineConfig({
  env: root.env ?? {},
  extends: [root, vitest],
  ignorePatterns: root.ignorePatterns ?? [],
  overrides: [
    {
      // Folders import each other through `#…` (package.json "imports").
      files: ["src/**", "test/**"],
      rules: {
        "import/no-relative-parent-imports": "error",
        "no-restricted-imports": ["error", { patterns: [noServer, noRuntime] }],
      },
    },
    {
      files: ["src/main.ts"],
      rules: {
        "no-restricted-imports": ["error", { patterns: [noServer] }],
      },
    },
  ],
});
