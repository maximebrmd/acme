import { Layer } from "effect";

import { RequestLimiter } from "#activity/application/request-limiter.ts";
import { DrizzleRequestCounts } from "#activity/infrastructure/drizzle-request-counts.ts";
import {
  RequestPolicyLive,
  SubjectDigestLive,
} from "#activity/infrastructure/request-policy.ts";

/**
 * What callers do through the API, as the server counts it: how many
 * requests each key and each application sends (RequestLimiter, with its
 * policy from the settings). Needs the database (Drizzle).
 */
export const ActivityLive = RequestLimiter.layer.pipe(
  Layer.provideMerge(RequestPolicyLive),
  Layer.provide(Layer.mergeAll(DrizzleRequestCounts, SubjectDigestLive))
);

/** The hourly purge of past request counts. Needs ActivityLive. */
export { RequestCountsCron as ActivityCronsLive } from "#activity/infrastructure/crons.ts";
