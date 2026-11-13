import { defineMeta } from "blume";

// The events, one page per family. The order holds in both languages;
// fr/developers/webhooks/events/meta.ts gives the French label.
export const shared = {
  icon: "zap",
  pages: ["index", "posts", "channels", "media-comments", "boosts"],
  title: "Events",
} as const;

export default defineMeta(shared);
