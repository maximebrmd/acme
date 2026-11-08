import { defineConfig } from "oxlint";

import root from "../../oxlint.config.ts";

// Oxlint lints each file with its nearest config alone, so this extends the
// root config and repeats the properties that extends doesn't carry over.
export default defineConfig({
  env: root.env ?? {},
  extends: [root],
  ignorePatterns: root.ignorePatterns ?? [],
  overrides: [
    {
      // The contract is shared by the server and every client, so it carries
      // schemas and endpoint definitions only.
      files: ["src/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["*", "!effect", "!effect/http-api", "!./**"],
                message:
                  "The contract imports Effect's core and effect/http-api only.",
              },
            ],
          },
        ],
      },
    },
  ],
});
