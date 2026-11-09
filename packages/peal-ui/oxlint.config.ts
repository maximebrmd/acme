import { defineConfig } from "oxlint";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";

import root from "../../oxlint.config.ts";

// Oxlint lints each file with its nearest config alone, so this extends the
// root config and repeats the properties that extends doesn't carry over.
export default defineConfig({
  env: root.env ?? {},
  extends: [root, react, shadcn],
  ignorePatterns: root.ignorePatterns ?? [],
  jsPlugins: shadcn.jsPlugins ?? [],
  overrides: [
    {
      // The shadcn preset frees `components/ui/**`; here the components sit
      // in src/components. They own their appearance, so they may restyle
      // each other and use structural arbitrary values.
      files: ["src/components/**"],
      rules: {
        "shadcn/no-arbitrary-values": "off",
        "shadcn/no-restyle": "off",
        "shadcn/require-static-classes": "off",
      },
    },
  ],
});
