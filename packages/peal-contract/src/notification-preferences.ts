import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";

/**
 * Which notices the user also receives by email, and whether they hear about
 * every post of their workspaces. Every notice they receive reaches the app;
 * `email` says which kinds are emailed too.
 */
export const NotificationPreferencesSchema = Schema.Struct({
  email: Schema.Struct({
    // A channel to reconnect, now or soon.
    channelReconnect: Schema.Boolean,
    // New comments under the posts that went live.
    comments: Schema.Boolean,
    postFailed: Schema.Boolean,
    postPublished: Schema.Boolean,
    // Comments on posts, and approvals asked for and decided.
    postReview: Schema.Boolean,
    postUnconfirmed: Schema.Boolean,
    // Deliveries to a webhook endpoint that fail for good, for those who
    // manage webhooks: once a day per endpoint.
    webhookFailing: Schema.Boolean,
  }),
  // How every post went, where the user may schedule posts, rather than
  // only the posts they wrote.
  everyPost: Schema.Boolean,
}).annotate({ identifier: "NotificationPreferences" });

export type NotificationPreferences = typeof NotificationPreferencesSchema.Type;

/** The preferences to change; those left out stay as they are. */
export const NotificationPreferencesChangeSchema = Schema.Struct({
  email: Schema.optionalKey(
    Schema.Struct({
      channelReconnect: Schema.optionalKey(Schema.Boolean),
      comments: Schema.optionalKey(Schema.Boolean),
      postFailed: Schema.optionalKey(Schema.Boolean),
      postPublished: Schema.optionalKey(Schema.Boolean),
      postReview: Schema.optionalKey(Schema.Boolean),
      postUnconfirmed: Schema.optionalKey(Schema.Boolean),
      webhookFailing: Schema.optionalKey(Schema.Boolean),
    })
  ),
  everyPost: Schema.optionalKey(Schema.Boolean),
}).annotate({ identifier: "NotificationPreferencesChange" });

export type NotificationPreferencesChange =
  typeof NotificationPreferencesChangeSchema.Type;

/** The signed-in user's notification preferences. */
export class NotificationPreferencesApi extends HttpApiGroup.make(
  "notificationPreferences"
)
  .add(
    HttpApiEndpoint.get("get", "/", {
      error: [Forbidden],
      success: NotificationPreferencesSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Answers with which notices the user receives by email, and whether they hear about every post. Until they change it: failed and unconfirmed posts, and channels to reconnect, but not published posts, are emailed; and they hear only about the posts they wrote.",
        summary: "Get notification preferences",
      })
    ),
    HttpApiEndpoint.patch("update", "/", {
      error: [Forbidden],
      payload: NotificationPreferencesChangeSchema,
      success: NotificationPreferencesSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Changes the preferences given, keeps the others, and answers with them all. Staff impersonating the user may not change them.",
        summary: "Change notification preferences",
      })
    )
  )
  .middleware(Authentication)
  .prefix("/api/me/notification-preferences") {}
