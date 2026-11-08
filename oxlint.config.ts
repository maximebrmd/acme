import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";

import { generated } from "./oxfmt.config.ts";

export default defineConfig({
  env: core.env ?? {},
  extends: [core, antiSlop],
  ignorePatterns: [...(core.ignorePatterns ?? []), ...generated],
  // Rules that read types, through tsgolint: floating promises, unsafe `any` and the like.
  options: { typeAware: true },
});
