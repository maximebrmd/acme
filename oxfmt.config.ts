import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

// Generated files and the reference clones in .local stay as their tools wrote
// them. drizzle-kit reads back the snapshots it writes next to each migration.
// Each SDK's folder is Fern's (packages/peal-sdk/scripts is ours).
export const generated = [
  "packages/peal-contract/openapi.json",
  "packages/peal-sdk/openapi.json",
  "packages/peal-sdk/node/**",
  "packages/peal-sdk/python/**",
  "packages/peal-sdk/go/**",
  "packages/peal-sdk/ruby/**",
  "packages/peal-sdk/java/**",
  "packages/peal-sdk/php/**",
  "packages/peal-sdk/dotnet/**",
  "packages/peal-sdk/rust/**",
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
