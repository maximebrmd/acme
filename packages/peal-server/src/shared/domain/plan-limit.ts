import { Schema } from "effect";

/**
 * What a plan limits, in each workspace: the channels connected, the
 * members, the posts scheduled to go out in a calendar month (UTC), the
 * writing assistant's requests in a day (UTC), and the bytes of media
 * stored, uploads in progress included.
 */
export const PlanLimitSchema = Schema.Literals([
  "channels",
  "members",
  "scheduledPosts",
  "assistantRequests",
  "mediaStorage",
]);

export type PlanLimit = typeof PlanLimitSchema.Type;
