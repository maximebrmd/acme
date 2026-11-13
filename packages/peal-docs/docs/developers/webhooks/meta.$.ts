import { defineMeta } from "blume";

// Webhooks: endpoints, deliveries and their events. The order holds in both languages;
// fr/developers/webhooks/meta.ts gives the French label.
export const shared = {
  icon: "webhook",
  pages: ["index", "requests", "events", "delivery"],
  title: "Webhooks",
} as const;

export default defineMeta(shared);
