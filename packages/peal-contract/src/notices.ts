import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  OpenApi,
} from "effect/http-api";

import { Authentication } from "./authentication.ts";
import {
  BillingIntervalSchema,
  MoneySchema,
  PaidPlanSchema,
} from "./billing-plans.ts";
import { ExcessSchema } from "./billing.ts";
import { Forbidden } from "./forbidden.ts";
import { PlatformSchema } from "./platform.ts";
import { FailureReasonSchema } from "./posts.ts";
import { MeterSchema } from "./rate-card.ts";

/**
 * Why Peal turned a webhook endpoint off: every attempt failed for days
 * (`failing`), or the receiver answered 410 Gone (`gone`).
 */
export const WebhookTurnOffReasonSchema = Schema.Literals([
  "failing",
  "gone",
]).annotate({ identifier: "WebhookTurnOffReason" });

export type WebhookTurnOffReason = typeof WebhookTurnOffReasonSchema.Type;

/** The account a notice is about, as it was when the notice was made. */
export const NoticeChannelSchema = Schema.Struct({
  handle: Schema.String,
  platform: PlatformSchema,
}).annotate({ identifier: "NoticeChannel" });

export type NoticeChannel = typeof NoticeChannelSchema.Type;

/**
 * Who did something in a post's review: a `member`, a `visitor` who came
 * through a review link, or an `application` with an API key.
 */
export const ReviewPartySchema = Schema.Literals([
  "member",
  "visitor",
  "application",
]).annotate({ identifier: "ReviewParty" });

export type ReviewParty = typeof ReviewPartySchema.Type;

/** Why a recycling rule ended, as its notice tells it. */
export const RecyclingNoticeReasonSchema = Schema.Literals([
  "sourceGone",
  "starterGone",
  "noChannels",
  "contentRejected",
  "planLimit",
  "queueGone",
  "queueFull",
  "sourceWithdrawn",
]).annotate({ identifier: "RecyclingNoticeReason" });

export type RecyclingNoticeReason = typeof RecyclingNoticeReasonSchema.Type;

/**
 * Why a feed stopped making posts: it could not be read for seven days
 * (`unreachable`), its address gave something that is not a feed all
 * that time (`notAFeed`), its site said it is gone (`gone`), whoever
 * added it can no longer make posts (`starterGone`), or its queue was
 * deleted (`queueGone`).
 */
export const FeedStopReasonSchema = Schema.Literals([
  "unreachable",
  "notAFeed",
  "gone",
  "starterGone",
  "queueGone",
]).annotate({ identifier: "FeedStopReason" });

export type FeedStopReason = typeof FeedStopReasonSchema.Type;

/**
 * What happened, as data: clients write it in the reader's language. A post's
 * channel is null when it was disconnected before the notice was made.
 */
export const NoticeEventSchema = Schema.Union([
  // The post went live on the channel.
  Schema.TaggedStruct("PostPublished", {
    channel: Schema.NullOr(NoticeChannelSchema),
    // Its address on the platform, when the platform gave one.
    permalink: Schema.NullOr(Schema.String),
    postId: Schema.String,
  }),
  // The post did not go out on the channel, for `reason`. With `notSent`,
  // the post itself is live there and only what followed did not go out:
  // its first comment, or the parts after its first in a thread.
  Schema.TaggedStruct("PostFailed", {
    channel: Schema.NullOr(NoticeChannelSchema),
    notSent: Schema.optionalKey(
      Schema.Literals(["firstComment", "laterParts"]).annotate({
        identifier: "PostPartsNotSent",
      })
    ),
    postId: Schema.String,
    reason: FailureReasonSchema,
  }),
  // Whether the post went live is not known: check the platform before
  // reposting it.
  Schema.TaggedStruct("PostUnconfirmed", {
    channel: Schema.NullOr(NoticeChannelSchema),
    postId: Schema.String,
  }),
  // Someone asked for the post to go out at `scheduledAt`: it waits for an
  // approval.
  Schema.TaggedStruct("PostApprovalRequested", {
    postId: Schema.String,
    scheduledAt: Schema.DateTimeUtc,
  }),
  // The post was approved: it is scheduled, or, when `late` (approved after
  // its time), back to draft for a new time.
  Schema.TaggedStruct("PostApproved", {
    by: ReviewPartySchema,
    late: Schema.Boolean,
    postId: Schema.String,
  }),
  // Changes were asked for: the post is back to draft, with a comment.
  Schema.TaggedStruct("PostChangesRequested", {
    by: ReviewPartySchema,
    postId: Schema.String,
  }),
  // Someone commented on the post.
  Schema.TaggedStruct("PostCommented", {
    by: ReviewPartySchema,
    postId: Schema.String,
  }),
  // People commented on the post where it went live: `count` comments read
  // for the first time, in the thread `threadId`. Never who wrote, nor what.
  Schema.TaggedStruct("CommentsReceived", {
    count: Schema.Int,
    postId: Schema.String,
    threadId: Schema.String,
  }),
  // The channel's authorization stopped working: reconnect it to post again.
  Schema.TaggedStruct("ChannelReconnectRequired", {
    channel: NoticeChannelSchema,
  }),
  // The channel's authorization cannot be renewed and ends at `expiresAt`.
  Schema.TaggedStruct("ChannelReconnectSoon", {
    channel: NoticeChannelSchema,
    expiresAt: Schema.DateTimeUtc,
  }),
  // A subscription started at `startedAt`, paid each `interval` at `price`,
  // what Stripe charged, VAT included; or in its trial until `trialEnd`
  // (null for a paid one), `price` then the plan's, excluding VAT.
  Schema.TaggedStruct("SubscriptionStarted", {
    interval: BillingIntervalSchema,
    plan: PaidPlanSchema,
    price: MoneySchema,
    startedAt: Schema.DateTimeUtc,
    trialEnd: Schema.NullOr(Schema.DateTimeUtc),
  }),
  // The workspace's trial ends at `endsAt`: it then moves to the free plan
  // unless someone orders a plan. `over` lists what it held beyond the
  // free plan when it was told (empty when nothing): from that day it
  // schedules and publishes nothing until it is back within the plan.
  Schema.TaggedStruct("TrialEnding", {
    endsAt: Schema.DateTimeUtc,
    over: Schema.Array(ExcessSchema),
    plan: PaidPlanSchema,
  }),
  // The workspace, on the free tier, holds `accounts` connected accounts,
  // more than the `allowed` it includes, as when billing was turned on
  // after they were connected: until `graceUntil` it still schedules and
  // publishes; after, nothing is published until a payment method is added
  // on the billing page or `allowed` accounts are kept.
  Schema.TaggedStruct("PaymentMethodNeeded", {
    accounts: Schema.Int,
    allowed: Schema.Int,
    graceUntil: Schema.DateTimeUtc,
  }),
  // Plans priced by tiers of channels are retired: the workspace's legacy
  // `plan` ends at `endsAt`, 30 days at least after this notice, and is
  // not renewed. Before then it may move to per-account pricing on the
  // billing page, which ends the plan at once and refunds its unused time;
  // otherwise it is on the free tier from that day.
  Schema.TaggedStruct("PlansRetiring", {
    endsAt: Schema.DateTimeUtc,
    plan: PaidPlanSchema,
  }),
  // The billing account, without a payment method, used the `allowed`
  // units of `meter` its month includes: what it meters (sending inbox
  // messages, managed ads) pauses until `resetsAt`, the first of next
  // month UTC, unless a payment method is added on the billing page.
  // Reading and publishing go on.
  Schema.TaggedStruct("AllowanceReached", {
    allowed: Schema.Int,
    meter: MeterSchema,
    resetsAt: Schema.DateTimeUtc,
  }),
  // A yearly plan renews at `renewsAt`, for `price`, what Stripe will
  // charge, VAT included, unless it is cancelled before.
  Schema.TaggedStruct("SubscriptionRenewing", {
    plan: PaidPlanSchema,
    price: MoneySchema,
    renewsAt: Schema.DateTimeUtc,
  }),
  // The subscription was cancelled: it ends at `endsAt`, and nothing more
  // is charged.
  Schema.TaggedStruct("SubscriptionCancelled", {
    endsAt: Schema.DateTimeUtc,
    plan: PaidPlanSchema,
  }),
  // A consumer withdrew from the contract at `withdrawnAt`: it ended then,
  // and `refunded` is paid back.
  Schema.TaggedStruct("SubscriptionWithdrawn", {
    plan: PaidPlanSchema,
    refunded: MoneySchema,
    withdrawnAt: Schema.DateTimeUtc,
  }),
  // Peal turned a webhook endpoint off: nothing is sent to it until
  // someone turns it back on. `host` is where its deliveries went.
  Schema.TaggedStruct("WebhookEndpointDisabled", {
    endpointId: Schema.String,
    host: Schema.String,
    reason: WebhookTurnOffReasonSchema,
  }),
  // A delivery to a webhook endpoint that is still on failed for good, its
  // attempts used up: send it again from the delivery log once the
  // receiver works. Told once a day per endpoint.
  Schema.TaggedStruct("WebhookDeliveriesFailing", {
    endpointId: Schema.String,
    host: Schema.String,
  }),
  // What happened to a boost: it started, ended, failed (`reason`, one of
  // the boost failure reasons), used its whole budget, or Peal could not
  // learn whether it runs (`unconfirmed`: it may be spending). `budget` is
  // in the ad account's minor units, `budgetDigits` decimal digits below
  // the currency's unit.
  Schema.TaggedStruct("AdBoostChanged", {
    boostId: Schema.String,
    budget: MoneySchema,
    budgetDigits: Schema.Literals([0, 2]),
    change: Schema.Literals([
      "started",
      "ended",
      "failed",
      "budgetReached",
      "unconfirmed",
    ]),
    endsAt: Schema.DateTimeUtc,
    postId: Schema.String,
    reason: Schema.NullOr(Schema.String),
  }),
  // An ad network refused the sign-in that connects ad accounts: nothing
  // is read of them until its person signs in again.
  Schema.TaggedStruct("AdConnectionReconnectRequired", {
    network: Schema.String,
  }),
  // A recycling rule stopped repeating its source post (`sourcePostId`)
  // for `reason`: the source is gone (`sourceGone`), whoever started it
  // can no longer schedule (`starterGone`), none of its channels is left
  // (`noChannels`), the platforms refuse what it would say
  // (`contentRejected`), the month has no room in the plan (`planLimit`),
  // its queue was deleted (`queueGone`) or has no free slot (`queueFull`),
  // or the source was cancelled or taken back to draft (`sourceWithdrawn`).
  Schema.TaggedStruct("RecyclingEnded", {
    reason: RecyclingNoticeReasonSchema,
    ruleId: Schema.String,
    sourcePostId: Schema.String,
  }),
  // A feed stopped making posts (`feedId`) for `reason`.
  Schema.TaggedStruct("FeedStopped", {
    feedId: Schema.String,
    reason: FeedStopReasonSchema,
  }),
]).annotate({ identifier: "NoticeEvent" });

export type NoticeEvent = typeof NoticeEventSchema.Type;

/** Something that happened in one of the user's workspaces. */
export const NoticeSchema = Schema.Struct({
  createdAt: Schema.DateTimeUtc,
  event: NoticeEventSchema,
  id: Schema.String,
  // When the user marked it read; null while it is unread.
  readAt: Schema.NullOr(Schema.DateTimeUtc),
  workspaceId: Schema.String,
}).annotate({ identifier: "Notice" });

export type Notice = typeof NoticeSchema.Type;

export const NoticePageSchema = Schema.Struct({
  items: Schema.Array(NoticeSchema),
  // Pass it as `cursor` for the next page; null on the last one.
  nextCursor: Schema.NullOr(Schema.String),
}).annotate({ identifier: "NoticePage" });

export type NoticePage = typeof NoticePageSchema.Type;

export const UnreadNoticesSchema = Schema.Struct({
  unread: Schema.Int,
}).annotate({ identifier: "UnreadNotices" });

export type UnreadNotices = typeof UnreadNoticesSchema.Type;

/** How many notices a page holds, unless `limit` says otherwise. */
export const defaultNoticePageSize = 20;

/** The most notices a page holds, and a request may mark read at once. */
export const maxNoticePageSize = 100;

export const MarkNoticesReadSchema = Schema.Struct({
  ids: Schema.Array(Schema.String).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(maxNoticePageSize)
  ),
}).annotate({ identifier: "MarkNoticesRead" });

export type MarkNoticesRead = typeof MarkNoticesReadSchema.Type;

/**
 * The signed-in user's notices, across their workspaces. API keys belong to
 * a workspace, not a user, and get 403, as do OAuth clients bound to one
 * workspace. Staff impersonating the user may read them, not mark them read.
 */
export class NoticesApi extends HttpApiGroup.make("notices")
  .add(
    HttpApiEndpoint.get("list", "/", {
      error: [Forbidden, HttpApiError.BadRequest],
      query: {
        cursor: Schema.optionalKey(Schema.String),
        limit: Schema.optionalKey(
          Schema.Int.check(
            Schema.isBetween({ maximum: maxNoticePageSize, minimum: 1 })
          )
        ),
      },
      success: NoticePageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Lists the user's notices, newest first, ${defaultNoticePageSize} a page unless \`limit\` (at most ${maxNoticePageSize}) says otherwise. Pass the page's \`nextCursor\` as \`cursor\` for the next one. Each notice is data, for the client to write in the reader's language.`,
        summary: "List notices",
      })
    ),
    HttpApiEndpoint.get("unread", "/unread", {
      error: [Forbidden],
      success: UnreadNoticesSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: "Counts the user's unread notices.",
        summary: "Count unread notices",
      })
    ),
    HttpApiEndpoint.post("markRead", "/read", {
      error: [Forbidden],
      payload: MarkNoticesReadSchema,
      success: UnreadNoticesSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Marks up to ${maxNoticePageSize} of the user's notices read, and answers with how many stay unread. Ids that name none of the user's notices, and notices already read, are left as they are.`,
        summary: "Mark notices read",
      })
    ),
    HttpApiEndpoint.post("markAllRead", "/read-all", {
      error: [Forbidden],
      success: UnreadNoticesSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: "Marks every notice of the user read.",
        summary: "Mark all notices read",
      })
    )
  )
  .middleware(Authentication)
  .prefix("/api/me/notices") {}
