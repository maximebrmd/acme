import { Effect, Match, Option, Schema } from "effect";

import type { Permission } from "#shared/domain/access.ts";
import { Uuid7Schema, PostIdSchema } from "#shared/domain/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { MeterSchema } from "#shared/domain/meter.ts";
import { PaidPlanSchema } from "#shared/domain/plan.ts";
import { PlatformSchema } from "#shared/domain/platform.ts";

/** The account a notice is about, as it was when the notice was made. */
export const NoticeChannelSchema = Schema.Struct({
  // The name people mention the account by, such as "@peal_example".
  handle: Schema.NonEmptyString,
  platform: PlatformSchema,
});

export type NoticeChannel = typeof NoticeChannelSchema.Type;

/** An amount of money, in the currency's smallest unit (cents). */
export const NoticeMoneySchema = Schema.Struct({
  amount: Schema.Int,
  currency: Schema.NonEmptyString,
});

export type NoticeMoney = typeof NoticeMoneySchema.Type;

/**
 * A workspace holds `used` of something a plan allows `allowed` of:
 * channels, members, or bytes of media stored.
 */
export const NoticeExcessSchema = Schema.Struct({
  allowed: Schema.Int,
  limit: Schema.Literals(["channels", "members", "mediaStorage"]),
  used: Schema.Int,
});

export type NoticeExcess = typeof NoticeExcessSchema.Type;

/**
 * Per-account pricing's rates, as billing states them in a confirmation:
 * the accounts free, then each band's monthly price per account, in
 * `currency`'s cents, excluding tax.
 */
export const NoticeRatesSchema = Schema.Struct({
  bands: Schema.Array(
    Schema.Struct({ monthly: Schema.Int, upTo: Schema.NullOr(Schema.Int) })
  ),
  currency: Schema.NonEmptyString,
  freeAccounts: Schema.Int,
});

export type NoticeRates = typeof NoticeRatesSchema.Type;

/** Why a post did not go out on a channel, as publishing records it. */
export const PostFailureReasonSchema = Schema.Literals([
  "contentRejected",
  "channelDisconnected",
  "channelDisabled",
  "mediaRemoved",
  "mediaRejected",
  "missed",
  "notPublished",
  "rateLimited",
  "tokenExpired",
  "unavailable",
  "appNotAudited",
  "quotaExceeded",
  "appBillingLimit",
  "planLimit",
  "partsNotSent",
  "repliesNotAllowed",
  "paymentMethodRequired",
  "xCeilingReached",
]);

export type PostFailureReason = typeof PostFailureReasonSchema.Type;

/**
 * Why a recycling rule ended without a member stopping it or it making
 * all it was asked for, as publishing records it: what members are told.
 */
export const RecyclingEndReasonSchema = Schema.Literals([
  "sourceGone",
  "starterGone",
  "noChannels",
  "contentRejected",
  "planLimit",
  "queueGone",
  "queueFull",
  "sourceWithdrawn",
]);

export type RecyclingEndReason = typeof RecyclingEndReasonSchema.Type;

/**
 * Why a feed stopped, as publishing records it: what members are told.
 */
export const FeedStopReasonSchema = Schema.Literals([
  "unreachable",
  "notAFeed",
  "gone",
  "starterGone",
  "queueGone",
]);

export type FeedStopReason = typeof FeedStopReasonSchema.Type;

// A post's channel is none when it was disconnected before the notice was
// made: the notice still says what happened to the post.
const postOn = {
  channel: Schema.Option(NoticeChannelSchema),
  postId: PostIdSchema,
};

/**
 * Who did something in a post's review: a member, a visitor who came
 * through a review link, or an application with an API key. Never their
 * name: the post's page shows it to those who may read the post.
 */
export const ReviewPartySchema = Schema.Literals([
  "member",
  "visitor",
  "application",
]);

export type ReviewParty = typeof ReviewPartySchema.Type;

/**
 * Something that happened in a workspace, which its members hear about. A
 * notice keeps it as data, never as sentences: each reader gets it in their
 * language, in the app and by email, when it reaches them.
 *
 * Notices are stored with it, so members and fields may be added but never
 * renamed or removed.
 */
export const NoticeEventSchema = Schema.Union([
  // The post went live on the channel.
  Schema.TaggedStruct("PostPublished", {
    ...postOn,
    permalink: Schema.Option(Schema.String),
  }),
  // The post did not go out on the channel.
  Schema.TaggedStruct("PostFailed", {
    ...postOn,
    reason: PostFailureReasonSchema,
  }),
  // Whether the post went live is not known: the reader checks the platform
  // before reposting it.
  Schema.TaggedStruct("PostUnconfirmed", postOn),
  // Someone asked for the post to go out at `scheduledAt`, and it waits for
  // an approval.
  Schema.TaggedStruct("PostApprovalRequested", {
    postId: PostIdSchema,
    scheduledAt: Schema.DateTimeUtc,
  }),
  // The post was approved: it is scheduled, or, approved after its time
  // (`late`), back to draft for a new one.
  Schema.TaggedStruct("PostApproved", {
    by: ReviewPartySchema,
    late: Schema.Boolean,
    postId: PostIdSchema,
  }),
  // Changes were asked for: the post is back to draft, with a comment.
  Schema.TaggedStruct("PostChangesRequested", {
    by: ReviewPartySchema,
    postId: PostIdSchema,
  }),
  // Someone commented on the post.
  Schema.TaggedStruct("PostCommented", {
    by: ReviewPartySchema,
    postId: PostIdSchema,
  }),
  // People commented on the post where it went live: `count` comments
  // read for the first time, under the thread engagement keeps. A count
  // and ids: never who wrote, nor what.
  Schema.TaggedStruct("CommentsReceived", {
    count: Schema.Int,
    postId: PostIdSchema,
    threadId: Uuid7Schema,
  }),
  // The channel's authorization stopped working: nothing is posted until it
  // is reconnected.
  Schema.TaggedStruct("ChannelReconnectRequired", {
    channel: NoticeChannelSchema,
  }),
  // The channel's authorization cannot be renewed and ends at `expiresAt`.
  Schema.TaggedStruct("ChannelReconnectSoon", {
    channel: NoticeChannelSchema,
    expiresAt: Schema.DateTimeUtc,
  }),
  // A subscription started at `startedAt`, paid each `interval` at `price`,
  // VAT included, or in its trial until `trialEnd` (`price` then the
  // plan's, excluding VAT).
  Schema.TaggedStruct("SubscriptionStarted", {
    interval: Schema.Literals(["month", "year"]),
    plan: PaidPlanSchema,
    price: NoticeMoneySchema,
    // Per-account pricing's rates, with `price` 0: it charges nothing at
    // the start. Older notices lack them.
    rates: Schema.optionalKey(NoticeRatesSchema),
    // The contract's number, since contracts have one.
    reference: Schema.optionalKey(Schema.String),
    startedAt: Schema.DateTimeUtc,
    trialEnd: Schema.Option(Schema.DateTimeUtc),
  }),
  // The workspace's trial ends at `endsAt`; it then moves to the free plan
  // unless someone orders a plan. `over` is what it held beyond the free
  // plan when it was told; notices stored before it list nothing.
  Schema.TaggedStruct("TrialEnding", {
    endsAt: Schema.DateTimeUtc,
    over: Schema.Array(NoticeExcessSchema).pipe(
      Schema.withDecodingDefault(Effect.succeed([]))
    ),
    plan: PaidPlanSchema,
  }),
  // The workspace, on the free tier, holds `accounts` connected accounts,
  // more than the `allowed` it includes: until `graceUntil` it still
  // schedules and publishes, then nothing until a payment method is added
  // or `allowed` accounts are kept.
  Schema.TaggedStruct("PaymentMethodNeeded", {
    accounts: Schema.Int,
    allowed: Schema.Int,
    graceUntil: Schema.DateTimeUtc,
  }),
  // The billing account, without a payment method, used the `allowed`
  // units of `meter` its month includes: the meter pauses until
  // `resetsAt`, the first of next month, unless a payment method is added.
  Schema.TaggedStruct("AllowanceReached", {
    allowed: Schema.Int,
    meter: MeterSchema,
    resetsAt: Schema.DateTimeUtc,
  }),
  // The billing account spent `percent` (80, then 100) of its monthly
  // ceiling for X, `ceiling` US dollar cents, at X's rates: at 100, X's
  // posts and reads stop until `resetsAt`, the first of next month,
  // unless the ceiling is raised.
  Schema.TaggedStruct("XSpendCeiling", {
    ceiling: Schema.Int,
    percent: Schema.Int,
    resetsAt: Schema.DateTimeUtc,
  }),
  // A yearly plan renews at `renewsAt`, for `price`, VAT included.
  Schema.TaggedStruct("SubscriptionRenewing", {
    plan: PaidPlanSchema,
    price: NoticeMoneySchema,
    // The contract's number, since contracts have one.
    reference: Schema.optionalKey(Schema.String),
    renewsAt: Schema.DateTimeUtc,
  }),
  // The subscription was cancelled, and ends at `endsAt`.
  Schema.TaggedStruct("SubscriptionCancelled", {
    endsAt: Schema.DateTimeUtc,
    plan: PaidPlanSchema,
  }),
  // A consumer withdrew from the contract at `withdrawnAt`, which ended it
  // then; `refunded` goes back to them.
  Schema.TaggedStruct("SubscriptionWithdrawn", {
    plan: PaidPlanSchema,
    refunded: NoticeMoneySchema,
    withdrawnAt: Schema.DateTimeUtc,
  }),
  // Peal turned a webhook endpoint off, after days of failed deliveries
  // (`failing`) or because its receiver answered 410 Gone (`gone`): nothing
  // is sent to it until someone turns it back on. Named by its id and the
  // host its deliveries went to, never its whole address, whose path may
  // hold a secret.
  Schema.TaggedStruct("WebhookEndpointDisabled", {
    endpointId: Schema.NonEmptyString,
    host: Schema.NonEmptyString,
    reason: Schema.Literals(["failing", "gone"]),
  }),
  // A delivery to a webhook endpoint that is still on failed for good, its
  // attempts used up: the system behind it missed an event. Told once a
  // day per endpoint, named as `WebhookEndpointDisabled` names it.
  Schema.TaggedStruct("WebhookDeliveriesFailing", {
    endpointId: Schema.NonEmptyString,
    host: Schema.NonEmptyString,
  }),
  // A recycling rule stopped making occurrences of its source post, for
  // `reason`: those who expected it to go on hear it once each time it
  // ends.
  Schema.TaggedStruct("RecyclingEnded", {
    reason: RecyclingEndReasonSchema,
    ruleId: Uuid7Schema,
    sourcePostId: PostIdSchema,
  }),
  // A feed stopped making posts, and why: those who expected it to go on
  // hear it once each time it stops. Its id only: what a feed says is
  // other people's text, which no notice holds.
  Schema.TaggedStruct("FeedStopped", {
    feedId: Uuid7Schema,
    reason: FeedStopReasonSchema,
  }),
  // An ad network refused a member's sign-in: the ad accounts it connects
  // are no longer read until they sign in again.
  Schema.TaggedStruct("AdConnectionReconnectRequired", {
    network: Schema.NonEmptyString,
  }),
  // What happened to a boost: it started, ended, failed (`reason`, as the
  // ads context names it), used its whole budget, or Peal could not learn
  // whether it runs. Ids and amounts only: never who it is shown to.
  Schema.TaggedStruct("AdBoostChanged", {
    boostId: Schema.NonEmptyString,
    // In the ad account's minor units, `budgetDigits` decimal digits
    // below the currency's unit: 2 for most, 0 where there is none.
    budget: NoticeMoneySchema,
    budgetDigits: Schema.Literals([0, 2]),
    change: Schema.Literals([
      "started",
      "ended",
      "failed",
      "budgetReached",
      "unconfirmed",
    ]),
    endsAt: Schema.DateTimeUtc,
    postId: PostIdSchema,
    reason: Schema.Option(Schema.NonEmptyString),
  }),
]);

export type NoticeEvent = typeof NoticeEventSchema.Type;

/** The kinds of notice a reader chooses to receive by email or not. */
export type EmailKind =
  | "channelReconnect"
  | "comments"
  | "postFailed"
  | "postPublished"
  | "postReview"
  | "postUnconfirmed"
  | "feedStopped"
  | "recyclingEnded"
  | "webhookFailing";

/**
 * Which email preference covers the event: none for billing's reminders and
 * confirmations, always emailed, as consumer law asks them on a durable
 * medium, and none for a webhook endpoint turned off, as the systems that
 * listened on it hear nothing more until someone acts; deliveries failing
 * on an endpoint still on have one of their own.
 */
export const emailKindOf = (event: NoticeEvent): Option.Option<EmailKind> =>
  Match.valueTags(event, {
    // Money: always emailed, as an owner answers for what is spent.
    AdBoostChanged: () => Option.none<EmailKind>(),
    AdConnectionReconnectRequired: () => Option.none<EmailKind>(),
    ChannelReconnectRequired: () => Option.some<EmailKind>("channelReconnect"),
    ChannelReconnectSoon: () => Option.some<EmailKind>("channelReconnect"),
    CommentsReceived: () => Option.some<EmailKind>("comments"),
    FeedStopped: () => Option.some<EmailKind>("feedStopped"),
    PostApprovalRequested: () => Option.some<EmailKind>("postReview"),
    PostApproved: () => Option.some<EmailKind>("postReview"),
    PostChangesRequested: () => Option.some<EmailKind>("postReview"),
    PostCommented: () => Option.some<EmailKind>("postReview"),
    PostFailed: () => Option.some<EmailKind>("postFailed"),
    PostPublished: () => Option.some<EmailKind>("postPublished"),
    PostUnconfirmed: () => Option.some<EmailKind>("postUnconfirmed"),
    RecyclingEnded: () => Option.some<EmailKind>("recyclingEnded"),
    SubscriptionCancelled: () => Option.none<EmailKind>(),
    SubscriptionRenewing: () => Option.none<EmailKind>(),
    SubscriptionStarted: () => Option.none<EmailKind>(),
    SubscriptionWithdrawn: () => Option.none<EmailKind>(),
    PaymentMethodNeeded: () => Option.none<EmailKind>(),
    AllowanceReached: () => Option.none<EmailKind>(),
    XSpendCeiling: () => Option.none<EmailKind>(),
    TrialEnding: () => Option.none<EmailKind>(),
    WebhookDeliveriesFailing: () => Option.some<EmailKind>("webhookFailing"),
    WebhookEndpointDisabled: () => Option.none<EmailKind>(),
  });

/**
 * Who may act on the event: those who may schedule posts can repost one, or
 * confirm whether it went out, and follow what its review brings; those who
 * may answer comments can answer the ones a post received; those who
 * may approve posts can decide on one that waits; those who may connect
 * channels can reconnect one; those who manage billing can order, cancel or
 * withdraw; those who manage webhooks can turn an endpoint back on. Who
 * hears about it follows from it (`recipientsOf`).
 */
export const audienceOf = (event: NoticeEvent): Permission =>
  Match.valueTags(event, {
    // What a boost spends answers to the owners, who allowed it.
    AdBoostChanged: (): Permission => "ads:authorize",
    AdConnectionReconnectRequired: (): Permission => "ads:manage",
    ChannelReconnectRequired: (): Permission => "channel:connect",
    ChannelReconnectSoon: (): Permission => "channel:connect",
    CommentsReceived: (): Permission => "engagement:reply",
    FeedStopped: (): Permission => "post:schedule",
    PostApprovalRequested: (): Permission => "post:approve",
    PostApproved: (): Permission => "post:schedule",
    PostChangesRequested: (): Permission => "post:schedule",
    PostCommented: (): Permission => "post:schedule",
    PostFailed: (): Permission => "post:schedule",
    PostPublished: (): Permission => "post:schedule",
    PostUnconfirmed: (): Permission => "post:schedule",
    RecyclingEnded: (): Permission => "post:schedule",
    SubscriptionCancelled: (): Permission => "billing:manage",
    SubscriptionRenewing: (): Permission => "billing:manage",
    SubscriptionStarted: (): Permission => "billing:manage",
    SubscriptionWithdrawn: (): Permission => "billing:manage",
    PaymentMethodNeeded: (): Permission => "billing:manage",
    AllowanceReached: (): Permission => "billing:manage",
    XSpendCeiling: (): Permission => "billing:manage",
    TrialEnding: (): Permission => "billing:manage",
    WebhookDeliveriesFailing: (): Permission => "webhook:manage",
    WebhookEndpointDisabled: (): Permission => "webhook:manage",
  });

/** Whether the event is about a post rather than a channel or billing. */
export const isAboutPost = (event: NoticeEvent): boolean =>
  Match.valueTags(event, {
    AdBoostChanged: () => false,
    AdConnectionReconnectRequired: () => false,
    ChannelReconnectRequired: () => false,
    ChannelReconnectSoon: () => false,
    CommentsReceived: () => true,
    FeedStopped: () => true,
    PostApprovalRequested: () => true,
    PostApproved: () => true,
    PostChangesRequested: () => true,
    PostCommented: () => true,
    PostFailed: () => true,
    PostPublished: () => true,
    PostUnconfirmed: () => true,
    RecyclingEnded: () => true,
    SubscriptionCancelled: () => false,
    SubscriptionRenewing: () => false,
    SubscriptionStarted: () => false,
    SubscriptionWithdrawn: () => false,
    PaymentMethodNeeded: () => false,
    AllowanceReached: () => false,
    XSpendCeiling: () => false,
    TrialEnding: () => false,
    WebhookDeliveriesFailing: () => false,
    WebhookEndpointDisabled: () => false,
  });

/**
 * What a reader must still be allowed when the notice's email goes out: to
 * read posts, for a post's notice, which went to its author whatever their
 * role; to act on the channel, for a channel's; to manage billing, for
 * billing's; to manage webhooks, for an endpoint's.
 */
export const readerPermissionOf = (event: NoticeEvent): Permission => {
  // Comments are read with a permission of their own.
  if (event._tag === "CommentsReceived") {
    return "engagement:read";
  }

  return isAboutPost(event) ? "post:read" : audienceOf(event);
};

/** A member who could hear about an event. */
export interface Candidate {
  /** Whether they chose to hear about every post, not only their own. */
  readonly followsEveryPost: boolean;
  /** Whether their role allows what the event asks (`audienceOf`). */
  readonly mayAct: boolean;
  readonly userId: UserId;
}

/** Who else hears about an event, and who does not. */
export interface Hearing {
  /**
   * The member who did what the event tells, when a member did: they need
   * no telling.
   */
  readonly except?: UserId | undefined;
  /**
   * Members who follow the post besides its author, whatever their role:
   * whoever asked for its approval, or wrote in its review.
   */
  readonly followers?: readonly UserId[] | undefined;
}

/**
 * Who hears about the event, among the workspace's members:
 *
 * - about a channel: every member who may act on it (`audienceOf`);
 * - about an approval asked for: every member who may give it, and those
 *   who follow the post;
 * - about a post with an author: its author, whatever their role, those
 *   who follow it (`Hearing.followers`), and the members who may schedule
 *   posts and chose to hear about every post;
 * - about a post without one, made with an API key, or whose author is no
 *   longer among the members: every member who may schedule posts, as
 *   nobody else would hear.
 *
 * Whoever did it (`Hearing.except`) is never told.
 */
export const recipientsOf = (
  event: NoticeEvent,
  author: Option.Option<UserId>,
  members: readonly Candidate[],
  { except, followers = [] }: Hearing = {}
): readonly UserId[] => {
  // An author who left the workspace hears nothing more of it; their post
  // is then told as one without an author.
  const present = author.pipe(
    Option.filter((userId) =>
      members.some((member) => member.userId === userId)
    )
  );

  const follows = (member: Candidate) =>
    followers.includes(member.userId) ||
    Option.contains(present, member.userId);

  const hears = (member: Candidate): boolean => {
    if (member.userId === except) {
      return false;
    }

    if (!isAboutPost(event)) {
      return member.mayAct;
    }

    // Everyone who may approve is asked to.
    if (event._tag === "PostApprovalRequested") {
      return member.mayAct || follows(member);
    }

    if (Option.isNone(present) && followers.length === 0) {
      return member.mayAct;
    }

    return follows(member) || (member.mayAct && member.followsEveryPost);
  };

  return members.flatMap((member) => (hears(member) ? [member.userId] : []));
};

/** The web app's page for the event, where the reader acts on it. */
export const pageOf = (event: NoticeEvent, workspaceId: WorkspaceId): string =>
  Match.valueTags(event, {
    AdBoostChanged: ({ postId }) => `/app/${workspaceId}/posts/${postId}`,
    AdConnectionReconnectRequired: () => `/app/${workspaceId}/ads`,
    ChannelReconnectRequired: () => `/app/${workspaceId}/channels`,
    ChannelReconnectSoon: () => `/app/${workspaceId}/channels`,
    CommentsReceived: ({ threadId }) => `/app/${workspaceId}/inbox/${threadId}`,
    FeedStopped: ({ feedId }) =>
      `/app/${workspaceId}/settings/feeds?feed=${feedId}`,
    PostApprovalRequested: ({ postId }) =>
      `/app/${workspaceId}/posts/${postId}`,
    PostApproved: ({ postId }) => `/app/${workspaceId}/posts/${postId}`,
    PostChangesRequested: ({ postId }) => `/app/${workspaceId}/posts/${postId}`,
    PostCommented: ({ postId }) => `/app/${workspaceId}/posts/${postId}`,
    PostFailed: ({ postId }) => `/app/${workspaceId}/posts/${postId}`,
    PostPublished: ({ postId }) => `/app/${workspaceId}/posts/${postId}`,
    PostUnconfirmed: ({ postId }) => `/app/${workspaceId}/posts/${postId}`,
    RecyclingEnded: ({ ruleId }) =>
      `/app/${workspaceId}/settings/recycling?rule=${ruleId}`,
    SubscriptionCancelled: () => `/app/${workspaceId}/billing`,
    SubscriptionRenewing: () => `/app/${workspaceId}/billing`,
    SubscriptionStarted: () => `/app/${workspaceId}/billing`,
    SubscriptionWithdrawn: () => `/app/${workspaceId}/billing`,
    PaymentMethodNeeded: () => `/app/${workspaceId}/billing`,
    AllowanceReached: () => `/app/${workspaceId}/billing`,
    XSpendCeiling: () => `/app/${workspaceId}/billing`,
    TrialEnding: () => `/app/${workspaceId}/billing`,
    WebhookDeliveriesFailing: () => `/app/${workspaceId}/settings/webhooks`,
    WebhookEndpointDisabled: () => `/app/${workspaceId}/settings/webhooks`,
  });
