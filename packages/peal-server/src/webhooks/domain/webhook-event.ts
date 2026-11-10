import { Schema } from "effect";

import {
  ChannelIdSchema,
  MediaAssetIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { PlatformSchema } from "#shared/domain/platform.ts";

import { WebhookEndpointIdSchema } from "./webhook-endpoint-id.ts";

// What receivers get is public contract, stored with each event until it is
// delivered: add an event type, or a field to one, never rename or remove
// either. Events carry ids, states, codes, instants and permalinks, never
// what a post says or shows: the receiver reads that through the API, with
// credentials of its own.

/**
 * A post on one of its channels. The platform is null once the channel was
 * disconnected, as nothing then says which it was.
 */
export const EventTargetSchema = Schema.Struct({
  channelId: ChannelIdSchema,
  platform: Schema.NullOr(PlatformSchema),
  targetId: PostTargetIdSchema,
});

export type EventTarget = typeof EventTargetSchema.Type;

const workspace = { workspaceId: WorkspaceIdSchema };

const post = { ...workspace, postId: PostIdSchema };

// One post on one channel, in the round it was sent: 1, and one more for
// each repost.
const postOnChannel = {
  ...post,
  ...EventTargetSchema.fields,
  round: Schema.Int,
};

const channel = {
  ...workspace,
  channelId: ChannelIdSchema,
  platform: PlatformSchema,
};

const media = { ...workspace, mediaId: MediaAssetIdSchema };

/**
 * Something that happened in a workspace, as its webhook endpoints hear
 * it: `type` names it, and tells what `data` holds.
 */
export const WebhookEventSchema = Schema.Union([
  // A post was scheduled, or moved to another time: it goes out at
  // `scheduledAt`, chosen in `timeZone`, on `targets`.
  Schema.Struct({
    data: Schema.Struct({
      ...post,
      scheduledAt: Schema.DateTimeUtc,
      targets: Schema.Array(EventTargetSchema),
      timeZone: Schema.String,
    }),
    type: Schema.Literal("post.scheduled"),
  }),
  // A scheduled post was taken back to draft: it goes out nowhere until it
  // is scheduled again.
  Schema.Struct({
    data: Schema.Struct(post),
    type: Schema.Literal("post.unscheduled"),
  }),
  // The post went live on the channel.
  Schema.Struct({
    data: Schema.Struct({
      ...postOnChannel,
      // Its address on the platform, when the platform gave one, or the
      // member who confirmed it.
      permalink: Schema.NullOr(Schema.String),
      publishedAt: Schema.DateTimeUtc,
    }),
    type: Schema.Literal("post.published"),
  }),
  // The post did not go out on the channel: `reason` is the failure
  // reason the API gives for the target.
  Schema.Struct({
    data: Schema.Struct({
      ...postOnChannel,
      failedAt: Schema.DateTimeUtc,
      reason: Schema.NonEmptyString,
    }),
    type: Schema.Literal("post.failed"),
  }),
  // Whether the post went live on the channel is not known: someone checks
  // the platform, then confirms or reposts it.
  Schema.Struct({
    data: Schema.Struct({
      ...postOnChannel,
      attemptedAt: Schema.DateTimeUtc,
      reason: Schema.NonEmptyString,
    }),
    type: Schema.Literal("post.unconfirmed"),
  }),
  // The post was cancelled: `targets` are the channels it will not go out
  // on. Those it had already reached keep their own events.
  Schema.Struct({
    data: Schema.Struct({
      ...post,
      cancelledAt: Schema.DateTimeUtc,
      targets: Schema.Array(EventTargetSchema),
    }),
    type: Schema.Literal("post.cancelled"),
  }),
  // An account was connected to the workspace, or, `reconnected`, a
  // channel it had was authorized again.
  Schema.Struct({
    data: Schema.Struct({ ...channel, reconnected: Schema.Boolean }),
    type: Schema.Literal("channel.connected"),
  }),
  Schema.Struct({
    data: Schema.Struct(channel),
    type: Schema.Literal("channel.disconnected"),
  }),
  // The channel's authorization stopped working: nothing is posted there
  // until someone reconnects it.
  Schema.Struct({
    data: Schema.Struct(channel),
    type: Schema.Literal("channel.reconnect_needed"),
  }),
  // The file was probed, and can go in posts.
  Schema.Struct({
    data: Schema.Struct({ ...media, contentType: Schema.NonEmptyString }),
    type: Schema.Literal("media.ready"),
  }),
  // The file was refused, or could not be probed: `reason` says why.
  Schema.Struct({
    data: Schema.Struct({ ...media, reason: Schema.NonEmptyString }),
    type: Schema.Literal("media.failed"),
  }),
  // A member asked for a test event on the endpoint.
  Schema.Struct({
    data: Schema.Struct({ ...workspace, endpointId: WebhookEndpointIdSchema }),
    type: Schema.Literal("webhook.test"),
  }),
]);

export type WebhookEvent = typeof WebhookEventSchema.Type;

/**
 * The version of every event's `data` so far. Fields are added without
 * changing it; a change receivers could not read would come as a new
 * version, sent beside this one.
 */
export const eventVersion = 1;
