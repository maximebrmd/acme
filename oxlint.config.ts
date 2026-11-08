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
  rules: {
    // Oxlint reports any call to a function named `…Error`, so it flags the
    // `Schema.TaggedError<Self>()(…)` factory that every error is declared
    // with. unicorn/new-for-builtins still requires `new Error()`.
    "unicorn/throw-new-error": "off",
  },
});
