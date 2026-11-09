import { defineConfig } from "oxlint";

import root from "../../oxlint.config.ts";

// Oxlint lints each file with its nearest config alone, so this extends the
// root config and repeats the properties that extends doesn't carry over.
// Ultracite's Playwright preset is left out: its one override reaches only
// *.test and *.spec files, and the e2e runner's tests are *.e2e.ts.
export default defineConfig({
  env: root.env ?? {},
  extends: [root],
  ignorePatterns: root.ignorePatterns ?? [],
});
