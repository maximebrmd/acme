import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

// Generated files and the reference clones in .local stay as their tools wrote
// them. drizzle-kit reads back the snapshots it writes next to each migration.
export const generated = [
  "packages/peal-contract/openapi.json",
  "packages/peal-server/drizzle/**",
  "packages/peal-server/src/*/infrastructure/*.generated.ts",
  ".local/**",
];

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
