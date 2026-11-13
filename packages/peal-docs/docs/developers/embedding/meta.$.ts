import { defineMeta } from "blume";

// Embedding Peal in your own product. The order holds in both languages;
// fr/developers/embedding/meta.ts gives the French label.
export const shared = {
  icon: "users",
  pages: ["index", "operate"],
  title: "Embedding",
} as const;

export default defineMeta(shared);
