import { defineMeta } from "blume";

// A group of the Guides tab, labelled as the app's navigation. The order holds in both languages;
// fr/guides/workspace/meta.ts gives the French label.
export const shared = {
  directory: "none",
  display: "flat",
  pages: ["index", "account", "notifications", "billing"],
  title: "Settings",
} as const;

export default defineMeta(shared);
