import { Layer } from "effect";

import { ActivityLog } from "#activity/application/activity-log.ts";
import { ActivityRecords } from "#activity/application/activity-records.ts";
import { RequestLimiter } from "#activity/application/request-limiter.ts";
import {
  ActivityRetentionCron,
  RequestCountsCron,
} from "#activity/infrastructure/crons.ts";
import { DrizzleActivityEvents } from "#activity/infrastructure/drizzle-activity-events.ts";
import { DrizzleRequestCounts } from "#activity/infrastructure/drizzle-request-counts.ts";
import { NamedApplications } from "#activity/infrastructure/named-applications.ts";
import {
  RequestPolicyLive,
  SubjectDigestLive,
} from "#activity/infrastructure/request-policy.ts";

// How many requests each key and each application sends, with its policy
// from the settings.
const RequestLimitsLive = RequestLimiter.layer.pipe(
  Layer.provideMerge(RequestPolicyLive),
  Layer.provide(Layer.mergeAll(DrizzleRequestCounts, SubjectDigestLive))
);

// Each workspace's log of who changed what (ActivityLog), and what it
// keeps about workspaces and users (ActivityRecords).
const ActivityLogLive = Layer.mergeAll(
  ActivityLog.layer,
  ActivityRecords.layer
).pipe(Layer.provide(Layer.mergeAll(DrizzleActivityEvents, NamedApplications)));

/**
 * What callers do through the API, as the server keeps it: how many
 * requests each key and each application sends (RequestLimiter, with its
 * policy from the settings), and each workspace's activity log
 * (ActivityLog, ActivityRecords). Needs the database (Drizzle), Ids and
 * the workspace context's CredentialNames, which names the keys and the
 * applications in the log.
 */
export const ActivityLive = Layer.mergeAll(RequestLimitsLive, ActivityLogLive);

/** The activity log's endpoint. Needs ActivityLive. */
export { ActivityHandlers as ActivityApiLive } from "#activity/api/activity.ts";

/**
 * The hourly purge of past request counts, and the activity logs' daily
 * retention. Needs ActivityLive.
 */
export const ActivityCronsLive = Layer.mergeAll(
  RequestCountsCron,
  ActivityRetentionCron
);
