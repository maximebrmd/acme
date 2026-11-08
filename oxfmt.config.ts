import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

// Generated files and the reference clones in .local stay as their tools wrote them.
export const generated = ["packages/acme-contract/openapi.json", ".local/**"];

export default defineConfig({
  ...ultracite,
  ignorePatterns: [...(ultracite.ignorePatterns ?? []), ...generated],
  overrides: [
    {
      // Compose, Ansible and Nx files keep a wider layout.
      files: ["**/*.{yml,yaml,json}"],
      options: { printWidth: 100 },
    },
  ],
  // Keep prose wrapped as written rather than joining each paragraph into one line.
  proseWrap: "preserve",
});
