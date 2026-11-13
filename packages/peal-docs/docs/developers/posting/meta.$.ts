import { defineMeta } from "blume";

// Posting through the API. The order holds in both languages;
// fr/developers/posting/meta.ts gives the French label.
export const shared = {
  icon: "square-pen",
  pages: ["index", "bulk", "list", "queues", "published"],
  title: "Posting",
} as const;

export default defineMeta(shared);
