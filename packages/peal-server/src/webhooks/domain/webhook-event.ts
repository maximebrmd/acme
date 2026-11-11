import { Match, Schema } from "effect";

import type { ChannelId } from "#shared/domain/ids.ts";
import {
  ChannelIdSchema,
  MediaAssetIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
  Uuid7Schema,
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

/**
 * Who decided on a post's approval, by kind only: a member, someone without
 * an account who came through a review link, or an application. Never a
 * name.
 */
export const ReviewPartySchema = Schema.Literals([
  "member",
  "visitor",
  "application",
]);

export type ReviewParty = typeof ReviewPartySchema.Type;

const workspace = { workspaceId: WorkspaceIdSchema };

const post = { ...workspace, postId: PostIdSchema };

// One post on one channel, in the round it was sent: 1, and one more for
// each repost.
// `parts` says how many parts the post has there and how many are live;
// events stored before posts had parts have none.
const postOnChannel = {
  ...post,
  ...EventTargetSchema.fields,
  parts: Schema.optionalKey(
    Schema.Struct({ count: Schema.Int, live: Schema.Int })
  ),
  round: Schema.Int,
};

const channel = {
  ...workspace,
  channelId: ChannelIdSchema,
  platform: PlatformSchema,
};

const media = { ...workspace, mediaId: MediaAssetIdSchema };

// A comment under a post that went live on a channel, by ids: never what
// it says, nor who wrote it, which the receiver reads through the API.
const comment = {
  ...post,
  channelId: ChannelIdSchema,
  commentId: Uuid7Schema,
  threadId: Uuid7Schema,
};

/**
 * Something that happened in a workspace, as its webhook endpoints hear
 * it: `type` names it, and tells what `data` holds.
 */
// What every boost event tells: the boost, the post it promotes, the ad
// account that pays, its budget and what it commits, in the account's
// minor units, its end, where it stands, and why when it failed.
const boost = {
  ...post,
  adAccountId: Schema.NonEmptyString,
  boostId: Schema.NonEmptyString,
  budget: Schema.Struct({
    amount: Schema.Int,
    kind: Schema.Literals(["total", "daily"]),
  }),
  committed: Schema.Int,
  currency: Schema.NonEmptyString,
  endsAt: Schema.DateTimeUtc,
  reason: Schema.NullOr(Schema.NonEmptyString),
  state: Schema.NonEmptyString,
};

const boostEvent = <Type extends string>(type: Type) =>
  Schema.Struct({ data: Schema.Struct(boost), type: Schema.Literal(type) });

const boostEvents = [
  boostEvent("boost.started"),
  boostEvent("boost.paused"),
  boostEvent("boost.resumed"),
  boostEvent("boost.stopped"),
  boostEvent("boost.ended"),
  boostEvent("boost.failed"),
  boostEvent("boost.unconfirmed"),
  boostEvent("boost.budget_reached"),
] as const;

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
  // A scheduled post, or one that waited for an approval, was taken back
  // to draft: it goes out nowhere until it is scheduled again.
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
  // Someone asked for the post to go out at `scheduledAt`, in a workspace
  // that asks for approvals: it waits, and no `post.scheduled` is sent
  // until it is approved.
  Schema.Struct({
    data: Schema.Struct({ ...post, scheduledAt: Schema.DateTimeUtc }),
    type: Schema.Literal("post.approval_requested"),
  }),
  // The post was approved, by a member, a visitor of a review link or an
  // application. `late` when its time had passed: it is a draft again, and
  // no `post.scheduled` follows.
  Schema.Struct({
    data: Schema.Struct({
      ...post,
      by: ReviewPartySchema,
      late: Schema.Boolean,
    }),
    type: Schema.Literal("post.approved"),
  }),
  // Changes were asked for: the post is a draft again. What was asked is
  // a comment, read through the API.
  Schema.Struct({
    data: Schema.Struct({ ...post, by: ReviewPartySchema }),
    type: Schema.Literal("post.changes_requested"),
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
  // Peal read a comment for the first time under a post that went live.
  Schema.Struct({
    data: Schema.Struct({ ...comment, receivedAt: Schema.DateTimeUtc }),
    type: Schema.Literal("comment.received"),
  }),
  // A reply to the comment went out from Peal, as the channel's account.
  Schema.Struct({
    data: Schema.Struct({
      ...comment,
      // Its address on the platform, when the platform gave one.
      permalink: Schema.NullOr(Schema.String),
      repliedAt: Schema.DateTimeUtc,
      replyId: Uuid7Schema,
    }),
    type: Schema.Literal("comment.replied"),
  }),
  // A boost of a published post changed: ids, amounts in the ad account's
  // minor units, and where it stands. Never who it is shown to. The
  // `webhook.test` event stays last, as the contract lists it.
  ...boostEvents,
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

/**
 * The types of events about a whole post whose data names none of its
 * channels: whoever tells one gives the post's channels beside it, for
 * the endpoints that listen to some channels only.
 */
export const postWideEventTypes = [
  "post.unscheduled",
  "post.approval_requested",
  "post.approved",
  "post.changes_requested",
] as const;

export type PostWideEventType = (typeof postWideEventTypes)[number];

/**
 * Which channels an event concerns, as the endpoints that listen to some
 * channels read it:
 *
 * - `none`: no channel (a file, a boost, a test), so every such endpoint
 *   hears it;
 * - `named`: those its data names, its channel's or its post's targets';
 * - `ofPost`: a whole post's, which its data does not name
 *   (`postWideEventTypes`): those its teller gives.
 *
 * Every type says which: a new one does not compile until it does.
 */
export type EventChannels =
  | { readonly _tag: "none" }
  | { readonly _tag: "named"; readonly channelIds: readonly ChannelId[] }
  | { readonly _tag: "ofPost" };

const none: EventChannels = { _tag: "none" };

const ofPost: EventChannels = { _tag: "ofPost" };

const named = (channelIds: readonly ChannelId[]): EventChannels => ({
  _tag: "named",
  channelIds,
});

const ofTargets = ({
  data,
}: {
  readonly data: { readonly targets: readonly EventTarget[] };
}) => named(data.targets.map(({ channelId }) => channelId));

const ofChannel = ({
  data,
}: {
  readonly data: { readonly channelId: ChannelId };
}) => named([data.channelId]);

const noChannel = () => none;

export const channelsOf: (event: WebhookEvent) => EventChannels =
  Match.type<WebhookEvent>().pipe(
    Match.discriminatorsExhaustive("type")({
      "boost.budget_reached": noChannel,
      "boost.ended": noChannel,
      "boost.failed": noChannel,
      "boost.paused": noChannel,
      "boost.resumed": noChannel,
      "boost.started": noChannel,
      "boost.stopped": noChannel,
      "boost.unconfirmed": noChannel,
      "channel.connected": ofChannel,
      "channel.disconnected": ofChannel,
      "channel.reconnect_needed": ofChannel,
      "comment.received": ofChannel,
      "comment.replied": ofChannel,
      "media.failed": noChannel,
      "media.ready": noChannel,
      "post.approval_requested": () => ofPost,
      "post.approved": () => ofPost,
      "post.cancelled": ofTargets,
      "post.changes_requested": () => ofPost,
      "post.failed": ofChannel,
      "post.published": ofChannel,
      "post.scheduled": ofTargets,
      "post.unconfirmed": ofChannel,
      "post.unscheduled": () => ofPost,
      "webhook.test": noChannel,
    })
  );
