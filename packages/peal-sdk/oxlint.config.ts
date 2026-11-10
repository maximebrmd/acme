import { defineConfig } from "oxlint";

import root from "../../oxlint.config.ts";

// Oxlint lints each file with its nearest config alone, so this extends the
// root config and repeats the properties that extends doesn't carry over.
// Its ignore patterns are read from this folder: each language's folder is
// Fern's, and only scripts/ is ours.
export default defineConfig({
  env: root.env ?? {},
  extends: [root],
  ignorePatterns: [
    ...(root.ignorePatterns ?? []),
    "openapi.json",
    "released/**",
    "node/**",
    "python/**",
    "go/**",
    "ruby/**",
    "java/**",
    "php/**",
    "dotnet/**",
    "rust/**",
  ],
});
