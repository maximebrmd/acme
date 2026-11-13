import { defineMeta } from "blume";

// A group of the Guides tab, labelled as the app's navigation. The order holds in both languages;
// fr/guides/posts/meta.ts gives the French label.
export const shared = {
  directory: "none",
  display: "flat",
  pages: [
    "index",
    "schedule",
    "queues",
    "drafts",
    "published",
    "assistant",
    "organise",
    "review",
  ],
  title: "Posts",
} as const;

export default defineMeta(shared);
