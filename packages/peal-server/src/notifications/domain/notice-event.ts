import { Match, Option, Schema } from "effect";

import type { Permission } from "#shared/domain/access.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
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
]);

export type PostFailureReason = typeof PostFailureReasonSchema.Type;

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
    startedAt: Schema.DateTimeUtc,
    trialEnd: Schema.Option(Schema.DateTimeUtc),
  }),
  // The workspace's trial ends at `endsAt`; it then moves to the free plan
  // unless someone orders a plan.
  Schema.TaggedStruct("TrialEnding", {
    endsAt: Schema.DateTimeUtc,
    plan: PaidPlanSchema,
  }),
  // A yearly plan renews at `renewsAt`, for `price`, VAT included.
  Schema.TaggedStruct("SubscriptionRenewing", {
    plan: PaidPlanSchema,
    price: NoticeMoneySchema,
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
]);

export type NoticeEvent = typeof NoticeEventSchema.Type;

/** The kinds of notice a reader chooses to receive by email or not. */
export type EmailKind =
  | "channelReconnect"
  | "postFailed"
  | "postPublished"
  | "postReview"
  | "postUnconfirmed";

/**
 * Which email preference covers the event: none for billing's reminders and
 * confirmations, always emailed, as consumer law asks them on a durable
 * medium.
 */
export const emailKindOf = (event: NoticeEvent): Option.Option<EmailKind> =>
  Match.valueTags(event, {
    ChannelReconnectRequired: () => Option.some<EmailKind>("channelReconnect"),
    ChannelReconnectSoon: () => Option.some<EmailKind>("channelReconnect"),
    PostApprovalRequested: () => Option.some<EmailKind>("postReview"),
    PostApproved: () => Option.some<EmailKind>("postReview"),
    PostChangesRequested: () => Option.some<EmailKind>("postReview"),
    PostCommented: () => Option.some<EmailKind>("postReview"),
    PostFailed: () => Option.some<EmailKind>("postFailed"),
    PostPublished: () => Option.some<EmailKind>("postPublished"),
    PostUnconfirmed: () => Option.some<EmailKind>("postUnconfirmed"),
    SubscriptionCancelled: () => Option.none<EmailKind>(),
    SubscriptionRenewing: () => Option.none<EmailKind>(),
    SubscriptionStarted: () => Option.none<EmailKind>(),
    SubscriptionWithdrawn: () => Option.none<EmailKind>(),
    TrialEnding: () => Option.none<EmailKind>(),
  });

/**
 * Who may act on the event: those who may schedule posts can repost one, or
 * confirm whether it went out, and follow what its review brings; those who
 * may approve posts can decide on one that waits; those who may connect
 * channels can reconnect one; those who manage billing can order, cancel or
 * withdraw. Who hears
 * about it follows from it (`recipientsOf`).
 */
export const audienceOf = (event: NoticeEvent): Permission =>
  Match.valueTags(event, {
    ChannelReconnectRequired: (): Permission => "channel:connect",
    ChannelReconnectSoon: (): Permission => "channel:connect",
    PostApprovalRequested: (): Permission => "post:approve",
    PostApproved: (): Permission => "post:schedule",
    PostChangesRequested: (): Permission => "post:schedule",
    PostCommented: (): Permission => "post:schedule",
    PostFailed: (): Permission => "post:schedule",
    PostPublished: (): Permission => "post:schedule",
    PostUnconfirmed: (): Permission => "post:schedule",
    SubscriptionCancelled: (): Permission => "billing:manage",
    SubscriptionRenewing: (): Permission => "billing:manage",
    SubscriptionStarted: (): Permission => "billing:manage",
    SubscriptionWithdrawn: (): Permission => "billing:manage",
    TrialEnding: (): Permission => "billing:manage",
  });

/** Whether the event is about a post rather than a channel or billing. */
export const isAboutPost = (event: NoticeEvent): boolean =>
  Match.valueTags(event, {
    ChannelReconnectRequired: () => false,
    ChannelReconnectSoon: () => false,
    PostApprovalRequested: () => true,
    PostApproved: () => true,
    PostChangesRequested: () => true,
    PostCommented: () => true,
    PostFailed: () => true,
    PostPublished: () => true,
    PostUnconfirmed: () => true,
    SubscriptionCancelled: () => false,
    SubscriptionRenewing: () => false,
    SubscriptionStarted: () => false,
    SubscriptionWithdrawn: () => false,
    TrialEnding: () => false,
  });

/**
 * What a reader must still be allowed when the notice's email goes out: to
 * read posts, for a post's notice, which went to its author whatever their
 * role; to act on the channel, for a channel's; to manage billing, for
 * billing's.
 */
export const readerPermissionOf = (event: NoticeEvent): Permission =>
  isAboutPost(event) ? "post:read" : audienceOf(event);

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
    ChannelReconnectRequired: () => `/app/${workspaceId}/channels`,
    ChannelReconnectSoon: () => `/app/${workspaceId}/channels`,
    PostApprovalRequested: ({ postId }) =>
      `/app/${workspaceId}/posts/${postId}`,
    PostApproved: ({ postId }) => `/app/${workspaceId}/posts/${postId}`,
    PostChangesRequested: ({ postId }) => `/app/${workspaceId}/posts/${postId}`,
    PostCommented: ({ postId }) => `/app/${workspaceId}/posts/${postId}`,
    PostFailed: ({ postId }) => `/app/${workspaceId}/posts/${postId}`,
    PostPublished: ({ postId }) => `/app/${workspaceId}/posts/${postId}`,
    PostUnconfirmed: ({ postId }) => `/app/${workspaceId}/posts/${postId}`,
    SubscriptionCancelled: () => `/app/${workspaceId}/billing`,
    SubscriptionRenewing: () => `/app/${workspaceId}/billing`,
    SubscriptionStarted: () => `/app/${workspaceId}/billing`,
    SubscriptionWithdrawn: () => `/app/${workspaceId}/billing`,
    TrialEnding: () => `/app/${workspaceId}/billing`,
  });
