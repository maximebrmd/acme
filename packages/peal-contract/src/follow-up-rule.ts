import { Schema } from "effect";

import { PlatformSchema } from "./platform.ts";
import { PostOriginSchema } from "./posts.ts";

// The limits below are the server's (src/publishing/domain/follow-up-*.ts
// and src/publishing/application/follow-up-rules.ts): a test keeps them
// equal.

/** The most rules a workspace keeps active or paused. */
export const maxFollowUpRulesPerWorkspace = 100;

/** The fewest likes a rule waits for. */
export const minLikesThreshold = 1;

/** The most likes a rule waits for. */
export const maxLikesThreshold = 1_000_000;

/** How many days after a post went live on a channel a rule acts on it. */
export const followUpWindowDays = 7;

/** The most follow-ups a channel carries out a UTC day, every rule together. */
export const maxFollowUpsPerChannelDay = 10;

/** The longest comment a rule keeps, whatever the platform. */
export const maxFollowUpCommentLength = 10_000;

/** How many of a rule's follow-ups its view shows, newest first. */
export const followUpsShown = 20;

/** How many rules a page holds, unless `limit` says otherwise. */
export const defaultFollowUpPageSize = 50;

/** The most rules a page holds. */
export const maxFollowUpPageSize = 100;

/** What a follow-up does: a comment under the post, or a repost of it. */
export const FollowUpKindSchema = Schema.Literals([
  "comment",
  "repost",
]).annotate({ identifier: "FollowUpKind" });

export type FollowUpKind = typeof FollowUpKindSchema.Type;

/** Where a rule is. */
export const FollowUpRuleStatusSchema = Schema.Literals([
  "active",
  "paused",
  "ended",
]).annotate({ identifier: "FollowUpRuleStatus" });

export type FollowUpRuleStatus = typeof FollowUpRuleStatusSchema.Type;

/**
 * Why a rule ended: a member stopped it (`stopped`), every follow-up it
 * armed on its post ended (`completed`), whoever started it can no
 * longer publish (`starterGone`), or its channel was disconnected
 * (`channelGone`).
 */
export const FollowUpEndReasonSchema = Schema.Literals([
  "stopped",
  "completed",
  "starterGone",
  "channelGone",
]).annotate({ identifier: "FollowUpEndReason" });

export type FollowUpEndReason = typeof FollowUpEndReasonSchema.Type;

/**
 * Whether what the rule sends was approved: `notNeeded` when whoever
 * wrote it publishes without an approval, `pending` until a member who
 * approves posts approves it, `approved` once one did.
 */
export const FollowUpApprovalStateSchema = Schema.Literals([
  "notNeeded",
  "pending",
  "approved",
]).annotate({ identifier: "FollowUpApprovalState" });

export type FollowUpApprovalState = typeof FollowUpApprovalStateSchema.Type;

/**
 * A kind of follow-up on a channel: `available`, `notAsked` by the rule,
 * or why not: the platform has no way (`noApi`), waits on its review of
 * Peal (`review`), Peal has not built it (`notBuilt`), the platform's
 * rules forbid an app to do it by itself (`notAllowed`), the operator
 * turned it off (`turnedOff`), the channel must be connected again for
 * its permission (`reconnect`), Peal counts no likes there
 * (`notCounted`), or the comment is longer than the platform takes
 * (`textTooLong`).
 */
export const FollowUpAbilitySchema = Schema.Literals([
  "available",
  "notAsked",
  "noApi",
  "review",
  "notBuilt",
  "notAllowed",
  "turnedOff",
  "reconnect",
  "notCounted",
  "textTooLong",
]).annotate({ identifier: "FollowUpAbility" });

export type FollowUpAbility = typeof FollowUpAbilitySchema.Type;

/** What a channel can carry of a rule, kind by kind. */
export const ChannelFollowUpsSchema = Schema.Struct({
  channelId: Schema.String,
  comment: FollowUpAbilitySchema,
  platform: PlatformSchema,
  repost: FollowUpAbilitySchema,
}).annotate({ identifier: "ChannelFollowUps" });

export type ChannelFollowUps = typeof ChannelFollowUpsSchema.Type;

/** Why a rule was refused, as FollowUpNotPossible says. */
export const FollowUpRefusalSchema = Schema.Literals([
  "noAction",
  "emptyComment",
  "postCancelled",
  "noChannel",
  "alreadyFollowedUp",
  "windowPassed",
  "channels",
]).annotate({ identifier: "FollowUpRefusal" });

export type FollowUpRefusal = typeof FollowUpRefusalSchema.Type;

/**
 * Where a follow-up is: `armed` (waiting for the threshold until
 * `until`), `sending`, `sent`, `failed`, `unconfirmed` (it may be live:
 * check the platform, Peal never sends it again), `expired` (its window
 * passed) or `cancelled` (given up).
 */
export const FollowUpStatusSchema = Schema.Literals([
  "armed",
  "sending",
  "sent",
  "failed",
  "unconfirmed",
  "expired",
  "cancelled",
]).annotate({ identifier: "FollowUpStatus" });

export type FollowUpStatus = typeof FollowUpStatusSchema.Type;

/** What a rule armed on one published channel of a post, and what became of it. */
export const FollowUpSchema = Schema.Struct({
  // When it was armed: when its post went live, or its rule started.
  armedAt: Schema.DateTimeUtc,
  channelId: Schema.String,
  id: Schema.String,
  kind: FollowUpKindSchema,
  // The likes analytics counted when its threshold was reached; null
  // before.
  likes: Schema.NullOr(Schema.Int),
  // Its public address, once sent, when the platform gives one.
  permalink: Schema.NullOr(Schema.String),
  // The platform's id of the comment or the repost, once sent.
  platformPostId: Schema.NullOr(Schema.String),
  postId: Schema.String,
  // Why it failed (the platform's or Peal's code), was not confirmed,
  // expired or was cancelled; null otherwise.
  reason: Schema.NullOr(Schema.String),
  // When it went out; null unless sent.
  sentAt: Schema.NullOr(Schema.DateTimeUtc),
  status: FollowUpStatusSchema,
  targetId: Schema.String,
  // When its threshold was reached; null before.
  triggeredAt: Schema.NullOr(Schema.DateTimeUtc),
  // Until when it waits for its threshold; null unless armed.
  until: Schema.NullOr(Schema.DateTimeUtc),
}).annotate({ identifier: "FollowUp" });

export type FollowUp = typeof FollowUpSchema.Type;

/** A rule that follows posts up once they have enough likes. */
export const FollowUpRuleSchema = Schema.Struct({
  approval: FollowUpApprovalStateSchema,
  // When and by whom it was approved; null unless approved, and who once
  // their account closed.
  approvedAt: Schema.NullOr(Schema.DateTimeUtc),
  approvedBy: Schema.NullOr(Schema.String),
  // What each channel it acts on can carry, kind by kind: those of its
  // post, or its channel.
  channels: Schema.Array(ChannelFollowUpsSchema),
  // The channel whose posts it acts on; null for a post's rule.
  channelId: Schema.NullOr(Schema.String),
  // The comment it publishes under the post; null for none.
  comment: Schema.NullOr(Schema.String),
  createdAt: Schema.DateTimeUtc,
  // Why it ended; null unless it did.
  endedReason: Schema.NullOr(FollowUpEndReasonSchema),
  // What it armed, newest first: its latest ones.
  followUps: Schema.Array(FollowUpSchema),
  id: Schema.String,
  // The likes it waits for.
  likes: Schema.Int,
  // The post it acts on; null for a channel's rule.
  postId: Schema.NullOr(Schema.String),
  repost: Schema.Boolean,
  // The member who started it; null for a key, or once they left Peal.
  startedBy: Schema.NullOr(Schema.String),
  startedVia: PostOriginSchema,
  status: FollowUpRuleStatusSchema,
}).annotate({ identifier: "FollowUpRule" });

export type FollowUpRule = typeof FollowUpRuleSchema.Type;

/** A page of rules, oldest first. */
export const FollowUpRulePageSchema = Schema.Struct({
  items: Schema.Array(FollowUpRuleSchema),
  // Pass it as `cursor` for the next page; null on the last one.
  nextCursor: Schema.NullOr(Schema.String),
}).annotate({ identifier: "FollowUpRulePage" });

export type FollowUpRulePage = typeof FollowUpRulePageSchema.Type;

const LikesSchema = Schema.Int.check(
  Schema.isBetween({ maximum: maxLikesThreshold, minimum: minLikesThreshold })
);

const nul = String.fromCodePoint(0);

const CommentSchema = Schema.String.check(
  Schema.isMaxLength(maxFollowUpCommentLength),
  Schema.makeFilter((text: string) => !text.includes(nul), {
    expected: "text without NUL characters",
  })
);

/** What starts a rule: on a post (`postId`) or a channel (`channelId`), one of them. */
export const NewFollowUpRuleSchema = Schema.Struct({
  // The channel whose posts, published from now on, it acts on.
  channelId: Schema.optionalKey(Schema.String),
  // The comment it publishes under the post, as the account's own reply.
  comment: Schema.optionalKey(CommentSchema),
  likes: LikesSchema,
  // The post it acts on, on each of its channels that can carry it.
  postId: Schema.optionalKey(Schema.String),
  // Whether it reposts the post. False unless given.
  repost: Schema.optionalKey(Schema.Boolean),
}).annotate({ identifier: "NewFollowUpRule" });

export type NewFollowUpRule = typeof NewFollowUpRuleSchema.Type;

/** What changes of a rule: each left out stays as it is. */
export const FollowUpRuleChangeSchema = Schema.Struct({
  // A comment, or null for none.
  comment: Schema.optionalKey(Schema.NullOr(CommentSchema)),
  likes: Schema.optionalKey(LikesSchema),
  // True pauses it; false sets a paused rule going again.
  paused: Schema.optionalKey(Schema.Boolean),
  repost: Schema.optionalKey(Schema.Boolean),
}).annotate({ identifier: "FollowUpRuleChange" });

export type FollowUpRuleChange = typeof FollowUpRuleChangeSchema.Type;
