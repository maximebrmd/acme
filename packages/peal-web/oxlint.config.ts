import { defineConfig } from "oxlint";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";
import vitest from "ultracite/oxlint/vitest";

import root from "../../oxlint.config.ts";

// Oxlint lints each file with its nearest config alone, so this extends the
// root config and repeats the properties that extends doesn't carry over.
export default defineConfig({
  env: root.env ?? {},
  extends: [root, react, next, shadcn, vitest],
  ignorePatterns: root.ignorePatterns ?? [],
  jsPlugins: shadcn.jsPlugins ?? [],
  // Screens use acme-ui's components and theme: the shadcn rules check class
  // names against them. Oxlint does not merge settings from extended configs.
  settings: {
    shadcn: { themeImports: ["^acme-ui/"], ui: "acme-ui/components" },
  },
});
