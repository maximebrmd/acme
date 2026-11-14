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
    // A rule that acts by itself (a follow-up rule, a comment rule) that
    // ended without a member stopping it, and follow-ups that did not go
    // out.
    automations: Schema.Boolean,
    // A channel to reconnect, now or soon.
    channelReconnect: Schema.Boolean,
    // New comments under the posts that went live.
    comments: Schema.Boolean,
    // A feed that stopped making posts.
    feedStopped: Schema.Boolean,
    postFailed: Schema.Boolean,
    postPublished: Schema.Boolean,
    // Comments on posts, and approvals asked for and decided.
    postReview: Schema.Boolean,
    postUnconfirmed: Schema.Boolean,
    // A recycling rule that stopped repeating a post.
    recyclingEnded: Schema.Boolean,
    // Deliveries to a webhook endpoint that fail for good, for those who
    // manage webhooks: once a day per endpoint.
    webhookFailing: Schema.Boolean,
    // Each Monday, an email of the last week's posts and the next week's,
    // in each workspace whose posts the user may read: counts and the
    // start of each post's text, written in UTC. Off until turned on.
    weeklyDigest: Schema.Boolean,
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
      automations: Schema.optionalKey(Schema.Boolean),
      channelReconnect: Schema.optionalKey(Schema.Boolean),
      comments: Schema.optionalKey(Schema.Boolean),
      feedStopped: Schema.optionalKey(Schema.Boolean),
      postFailed: Schema.optionalKey(Schema.Boolean),
      postPublished: Schema.optionalKey(Schema.Boolean),
      postReview: Schema.optionalKey(Schema.Boolean),
      postUnconfirmed: Schema.optionalKey(Schema.Boolean),
      recyclingEnded: Schema.optionalKey(Schema.Boolean),
      webhookFailing: Schema.optionalKey(Schema.Boolean),
      weeklyDigest: Schema.optionalKey(Schema.Boolean),
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
          "Answers with which notices the user receives by email, and whether they hear about every post. Until they change it: failed and unconfirmed posts, channels to reconnect, posts to review, recycling rules that ended, rules acting by themselves that ended or whose follow-ups did not go out, and webhook deliveries failing, but not published posts nor comments, are emailed, and no weekly digest; and they hear only about the posts they wrote.",
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
