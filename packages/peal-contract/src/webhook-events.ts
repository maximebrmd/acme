import { Schema } from "effect";

import { PlatformSchema } from "./platform.ts";
import {
  FailureReasonSchema,
  PostOutcomeSchema,
  UnconfirmedReasonSchema,
} from "./posts.ts";

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
  "post.finished",
  "post.unpublished",
  "post.unpublish_failed",
  "post.edited",
  "post.edit_failed",
  "post.approval_requested",
  "post.approved",
  "post.changes_requested",
  "channel.connected",
  "channel.disconnected",
  "channel.reconnect_needed",
  "channel.disabled",
  "channel.enabled",
  "channel.expiring",
  "media.ready",
  "media.failed",
  "comment.received",
  "comment.replied",
  "review.received",
  "review.replied",
  "boost.started",
  "boost.paused",
  "boost.resumed",
  "boost.stopped",
  "boost.ended",
  "boost.failed",
  "boost.unconfirmed",
  "boost.budget_reached",
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
  // A PDF document of more pages than any platform shows.
  "tooManyPages",
  // This server has no probe for the file's kind.
  "unavailable",
]).annotate({ identifier: "MediaFailureReason" });

export type MediaFailureReason = typeof MediaFailureReasonSchema.Type;

/**
 * Who decided on a post's approval, by kind only: a member, someone without
 * an account who came through a review link, or an application.
 */
export const WebhookReviewPartySchema = Schema.Literals([
  "member",
  "visitor",
  "application",
]).annotate({ identifier: "WebhookReviewParty" });

export type WebhookReviewParty = typeof WebhookReviewPartySchema.Type;

const workspace = { workspaceId: Schema.String };

const post = { ...workspace, postId: Schema.String };

// One post on one channel, in the round it was sent: 1, and one more for
// each repost.
// `parts` says how many parts the post has on the channel (1 for a post
// alone) and how many of them are live, as a post of several parts stops
// at the first that fails or has no confirmed outcome; left out of events
// from before posts had parts.
const postOnChannel = {
  ...post,
  ...WebhookTargetSchema.fields,
  parts: Schema.optionalKey(
    Schema.Struct({ count: Schema.Int, live: Schema.Int }).annotate({
      identifier: "WebhookTargetParts",
    })
  ),
  round: Schema.Int,
};

const channel = {
  ...workspace,
  channelId: Schema.String,
  platform: PlatformSchema,
};

const media = { ...workspace, mediaId: Schema.String };

/** Where a post ended on one channel, once it has its result there. */
export const WebhookSettledTargetStatusSchema = Schema.Literals([
  "published",
  "failed",
  "unconfirmed",
  "cancelled",
]).annotate({ identifier: "WebhookSettledTargetStatus" });

export type WebhookSettledTargetStatus =
  typeof WebhookSettledTargetStatusSchema.Type;

/**
 * A post's result on one of its channels: `permalink` its address there
 * when it went live and the platform gave one, `failureReason` why it did
 * not when it failed.
 */
export const WebhookFinishedTargetSchema = Schema.Struct({
  ...WebhookTargetSchema.fields,
  failureReason: Schema.NullOr(FailureReasonSchema),
  permalink: Schema.NullOr(Schema.String),
  status: WebhookSettledTargetStatusSchema,
}).annotate({ identifier: "WebhookFinishedTarget" });

export type WebhookFinishedTarget = typeof WebhookFinishedTargetSchema.Type;

// A comment under a post that went live on a channel, by ids.
const comment = {
  ...post,
  channelId: Schema.String,
  commentId: Schema.String,
  threadId: Schema.String,
};

// A review of a location a channel posts as, by ids: never what it says,
// nor who wrote it, which the receiver reads through the API.
const review = {
  ...workspace,
  channelId: Schema.String,
  reviewId: Schema.String,
  threadId: Schema.String,
};

// What every payload holds beside its type and data: the event's id (also
// the `webhook-id` header, the same on every delivery of the event), when
// it happened, the version of its data, and, for an event of a workspace a
// partner owns, the partner's own id for that workspace as it was then:
// null when the partner gave none, and for any other workspace. `sample`
// is true on a made-up event a member sent to try the endpoint with its
// type, whose ids name nothing: never act on one.
const envelope = {
  id: Schema.String,
  sample: Schema.optionalKey(Schema.Literal(true)),
  timestamp: Schema.DateTimeUtc,
  version: Schema.Literal(webhookEventVersion),
  workspaceExternalId: Schema.NullOr(Schema.String),
};

// What every boost event tells: the boost, the post it promotes, the ad
// account that pays, its budget and what it commits against the monthly
// ceiling, in the account's minor units, its end, where it stands
// (`state`, a boost state) and why when it failed (`reason`, a boost
// failure reason). Never who it is shown to: read the boost for that.
const boost = {
  ...post,
  adAccountId: Schema.String,
  boostId: Schema.String,
  budget: Schema.Struct({
    amount: Schema.Int,
    kind: Schema.Literals(["total", "daily"]),
  }),
  committed: Schema.Int,
  currency: Schema.String,
  endsAt: Schema.DateTimeUtc,
  reason: Schema.NullOr(Schema.String),
  state: Schema.String,
};

const boostPayload = <Type extends string>(type: Type) =>
  Schema.Struct({
    ...envelope,
    data: Schema.Struct(boost),
    type: Schema.Literal(type),
  });

const boostPayloads = [
  boostPayload("boost.started"),
  boostPayload("boost.paused"),
  boostPayload("boost.resumed"),
  boostPayload("boost.stopped"),
  boostPayload("boost.ended"),
  boostPayload("boost.failed"),
  boostPayload("boost.unconfirmed"),
  boostPayload("boost.budget_reached"),
] as const;

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
  // A scheduled post, or one that waited for an approval, was taken back
  // to draft.
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
  // on. A channel taken off a post that still goes out on its others is
  // told alone, the post staying scheduled there.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({
      ...post,
      cancelledAt: Schema.DateTimeUtc,
      // What was cancelled: `post`, the post (on these channels: those it
      // had not reached), or `target`, one channel taken off a post that
      // still goes out on its others. Absent on an event made before it
      // was told, which is about the post.
      scope: Schema.optionalKey(Schema.Literals(["post", "target"])),
      targets: Schema.Array(WebhookTargetSchema),
    }),
    type: Schema.Literal("post.cancelled"),
  }),
  // Every channel of the post has its result, in its latest `round` (1,
  // and one more for each repost): `outcome` is what they add up to. Told
  // again when a repost ends, and when a member's confirmation changes the
  // outcome.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({
      ...post,
      finishedAt: Schema.DateTimeUtc,
      outcome: PostOutcomeSchema,
      round: Schema.Int,
      targets: Schema.Array(WebhookFinishedTargetSchema),
    }),
    type: Schema.Literal("post.finished"),
  }),
  // Peal deleted the post from the channel's platform, every part of it,
  // at a member's request: it stays `published` in Peal, with the
  // target's `removedAt`. `alreadyGone` when the platform had it no
  // longer, deleted there before.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({
      ...post,
      ...WebhookTargetSchema.fields,
      alreadyGone: Schema.Boolean,
      removedAt: Schema.DateTimeUtc,
    }),
    type: Schema.Literal("post.unpublished"),
  }),
  // Peal could not delete the post from the channel's platform: `code`
  // says why (as the change's `code`); the post may still be there, and a
  // member may ask again.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({
      ...post,
      ...WebhookTargetSchema.fields,
      code: Schema.String,
      failedAt: Schema.DateTimeUtc,
    }),
    type: Schema.Literal("post.unpublish_failed"),
  }),
  // Peal replaced the text of the post's part at `part` (from 0) on the
  // channel's platform, at a member's request: that part's text on the
  // channel is the new one in Peal too, and the target has its
  // `editedAt`. The text itself is never sent: read the post.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({
      ...post,
      ...WebhookTargetSchema.fields,
      editedAt: Schema.DateTimeUtc,
      part: Schema.Int,
    }),
    type: Schema.Literal("post.edited"),
  }),
  // Peal could not edit the post's part on the channel's platform: `code`
  // says why (as the change's `code`, `postGone` when the platform no
  // longer has it); Peal's text is unchanged, and the post most likely
  // says what it said before (after `unavailable` or `rateLimited`, an
  // answer may have been lost, and the platform may show the new text);
  // a member may ask again.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({
      ...post,
      ...WebhookTargetSchema.fields,
      code: Schema.String,
      failedAt: Schema.DateTimeUtc,
      part: Schema.Int,
    }),
    type: Schema.Literal("post.edit_failed"),
  }),
  // Someone asked for the post to go out at `scheduledAt`, in a workspace
  // that asks for approvals: it waits, and no `post.scheduled` is sent
  // until it is approved.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({ ...post, scheduledAt: Schema.DateTimeUtc }),
    type: Schema.Literal("post.approval_requested"),
  }),
  // The post was approved. `late` when its time had passed: it is a draft
  // again, and no `post.scheduled` follows.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({
      ...post,
      by: WebhookReviewPartySchema,
      late: Schema.Boolean,
    }),
    type: Schema.Literal("post.approved"),
  }),
  // Changes were asked for: the post is a draft again. What was asked is
  // a comment, read through the API.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({ ...post, by: WebhookReviewPartySchema }),
    type: Schema.Literal("post.changes_requested"),
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
  // A member turned the channel off: nothing is posted there until it is
  // turned back on.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct(channel),
    type: Schema.Literal("channel.disabled"),
  }),
  // A member turned the channel back on.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct(channel),
    type: Schema.Literal("channel.enabled"),
  }),
  // The channel's authorization cannot be renewed and ends at `expiresAt`:
  // reconnect it before then, or nothing is posted there after. Told once
  // per expiry.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({ ...channel, expiresAt: Schema.DateTimeUtc }),
    type: Schema.Literal("channel.expiring"),
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
  // Peal read a comment for the first time under a post that went live.
  // Ids only: what it says and who wrote it are read through the API.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({ ...comment, receivedAt: Schema.String }),
    type: Schema.Literal("comment.received"),
  }),
  // A reply to the comment went out from Peal, as the channel's account.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({
      ...comment,
      permalink: Schema.NullOr(Schema.String),
      repliedAt: Schema.String,
      replyId: Schema.String,
    }),
    type: Schema.Literal("comment.replied"),
  }),
  // Peal read a review of a location for the first time. Ids only: its
  // stars, what it says and who wrote it are read through the API.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({ ...review, receivedAt: Schema.String }),
    type: Schema.Literal("review.received"),
  }),
  // A reply to the review went out from Peal, as the location.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({
      ...review,
      repliedAt: Schema.String,
      replyId: Schema.String,
    }),
    type: Schema.Literal("review.replied"),
  }),
  // A boost of a published post changed: it started, was paused, resumed
  // or stopped by a member, ended, failed, could not be confirmed, or
  // used its whole budget.
  ...boostPayloads,
  // A member asked for a test event on the endpoint.
  Schema.Struct({
    ...envelope,
    data: Schema.Struct({ ...workspace, endpointId: Schema.String }),
    type: Schema.Literal("webhook.test"),
  }),
]).annotate({ identifier: "WebhookPayload" });

export type WebhookPayload = typeof WebhookPayloadSchema.Type;
