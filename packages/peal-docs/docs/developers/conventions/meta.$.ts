import { defineMeta } from "blume";

// What every endpoint has in common. The order holds in both languages;
// fr/developers/conventions/meta.ts gives the French label.
export const shared = {
  icon: "book-open",
  pages: [
    "index",
    "errors",
    "ids",
    "paging",
    "idempotency",
    "rate-limits",
    "versioning",
    "discovery",
  ],
  title: "API conventions",
} as const;

export default defineMeta(shared);
