import { Schema } from "effect";

/**
 * What a plan limits, in each workspace: the channels connected, the
 * members, the posts scheduled to go out in a calendar month (UTC), and the
 * writing assistant's requests in a day (UTC).
 */
export const PlanLimitSchema = Schema.Literals([
  "channels",
  "members",
  "scheduledPosts",
  "assistantRequests",
]);

export type PlanLimit = typeof PlanLimitSchema.Type;
