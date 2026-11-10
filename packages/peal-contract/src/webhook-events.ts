import { Schema } from "effect";

import { PlatformSchema } from "./platform.ts";
import { FailureReasonSchema, UnconfirmedReasonSchema } from "./posts.ts";

// What Peal sends to webhook endpoints. The server's events
// (src/webhooks/domain/webhook-event.ts) are the source; a test keeps the
// two equal. Public contract: an event type, or a field of one, is added,
// never renamed or removed.

/** The events an endpoint can subscribe to. */
export const SubscribableWebhookEventTypeSchema = Schema.Literals([
  "post.scheduled",
  "post.unscheduled",
  "post.published",
  "post.failed",
  "post.unconfirmed",
  "post.cancelled",
  "channel.connected",
  "channel.disconnected",
  "channel.reconnect_needed",
  "media.ready",
  "media.failed",
]).annotate({
  description: "An event a webhook endpoint can subscribe to.",
  identifier: "SubscribableWebhookEventType",
});

export type SubscribableWebhookEventType =
  typeof SubscribableWebhookEventTypeSchema.Type;

/**
 * Every event Peal sends: those endpoints subscribe to, and `webhook.test`,
 * sent to one endpoint when a member asks, whatever it subscribes to.
 */
export const WebhookEventTypeSchema = Schema.Literals([
  ...SubscribableWebhookEventTypeSchema.literals,
  "webhook.test",
]).annotate({
  description: "An event Peal sends to webhook endpoints.",
  identifier: "WebhookEventType",
});

export type WebhookEventType = typeof WebhookEventTypeSchema.Type;

/** The version of every event's `data` so far. */
export const webhookEventVersion = 1;

/**
 * A post on one of its channels. `platform` is null once the channel was
 * disconnected.
 */
export const WebhookTargetSchema = Schema.Struct({
  channelId: Schema.String,
  platform: Schema.NullOr(PlatformSchema),
  targetId: Schema.String,
}).annotate({ identifier: "WebhookTarget" });

export type WebhookTarget = typeof WebhookTargetSchema.Type;

/** Why a file is not ready: it was refused, or could not be probed. */
export const MediaFailureReasonSchema = Schema.Literals([
  // The stored file is not the size, or the type, the upload declared.
  "sizeMismatch",
  "typeMismatch",
  // The probe could not read it, took too long, was served more bytes than
  // Peal stores, or could not run.
  "unreadable",
  "timedOut",
  "tooLarge",
  "toolFailed",
  // This server has no probe for the file's kind.
  "unavailable",
]).annotate({ identifier: "MediaFailureReason" });

export type MediaFailureReason = typeof MediaFailureReasonSchema.Type;

const workspace = { workspaceId: Schema.String };

const post = { ...workspace, postId: Schema.String };

// One post on one channel, in the round it was sent: 1, and one more for
// each repost.
const postOnChannel = {
  ...post,
  ...WebhookTargetSchema.fields,
  round: Schema.Int,
};

const channel = {
  ...workspace,
  channelId: Schema.String,
  platform: PlatformSchema,
};

const media = { ...workspace, mediaId: Schema.String };

// What every payload holds beside its type and data: the event's id (also
// the `webhook-id` header, the same on every delivery of the event), when
// it happened, and the version of its data.
const envelope = {
  id: Schema.String,
  timestamp: Schema.DateTimeUtc,
  version: Schema.Literal(webhookEventVersion),
};

/**
 * The body of a webhook request: `type` names what happened, and tells what
 * `data` holds. Ids, states, codes, instants and permalinks, never what a
 * post says or shows: read it through the API.
 */
export const WebhookPayloadSchema = Schema.Union([
  // A post was scheduled, or moved to another time: it goes out at
  // `scheduledAt`, chosen in `timeZone`, on `targets`.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({
      ...post,
      scheduledAt: Schema.DateTimeUtc,
      targets: Schema.Array(WebhookTargetSchema),
      timeZone: Schema.String,
    }),
    type: Schema.Literal("post.scheduled"),
  }),
  // A scheduled post was taken back to draft.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct(post),
    type: Schema.Literal("post.unscheduled"),
  }),
  // The post went live on the channel. `permalink` is its address on the
  // platform, when the platform gave one, or the member who confirmed it.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({
      ...postOnChannel,
      permalink: Schema.NullOr(Schema.String),
      publishedAt: Schema.DateTimeUtc,
    }),
    type: Schema.Literal("post.published"),
  }),
  // The post did not go out on the channel.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({
      ...postOnChannel,
      failedAt: Schema.DateTimeUtc,
      reason: FailureReasonSchema,
    }),
    type: Schema.Literal("post.failed"),
  }),
  // Whether the post went live on the channel is not known: someone checks
  // the platform, then confirms or reposts it.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({
      ...postOnChannel,
      attemptedAt: Schema.DateTimeUtc,
      reason: UnconfirmedReasonSchema,
    }),
    type: Schema.Literal("post.unconfirmed"),
  }),
  // The post was cancelled: `targets` are the channels it will not go out
  // on.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({
      ...post,
      cancelledAt: Schema.DateTimeUtc,
      targets: Schema.Array(WebhookTargetSchema),
    }),
    type: Schema.Literal("post.cancelled"),
  }),
  // An account was connected, or, `reconnected`, a channel the workspace
  // had was authorized again.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({ ...channel, reconnected: Schema.Boolean }),
    type: Schema.Literal("channel.connected"),
  }),
  Schema.Struct({
    ...envelope,
    data: Schema.Struct(channel),
    type: Schema.Literal("channel.disconnected"),
  }),
  // The channel's authorization stopped working: nothing is posted there
  // until someone reconnects it.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct(channel),
    type: Schema.Literal("channel.reconnect_needed"),
  }),
  // The file was probed, and can go in posts.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({ ...media, contentType: Schema.String }),
    type: Schema.Literal("media.ready"),
  }),
  // The file was refused, or could not be probed.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({ ...media, reason: MediaFailureReasonSchema }),
    type: Schema.Literal("media.failed"),
  }),
  // A member asked for a test event on the endpoint.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({ ...workspace, endpointId: Schema.String }),
    type: Schema.Literal("webhook.test"),
  }),
]).annotate({ identifier: "WebhookPayload" });

export type WebhookPayload = typeof WebhookPayloadSchema.Type;
