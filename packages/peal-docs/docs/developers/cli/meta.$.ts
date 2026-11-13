import { defineMeta } from "blume";

// The peal command line. The order holds in both languages;
// fr/developers/cli/meta.ts gives the French label.
export const shared = {
  icon: "terminal",
  pages: ["index", "posts", "workspace"],
  title: "Command line",
} as const;

export default defineMeta(shared);
