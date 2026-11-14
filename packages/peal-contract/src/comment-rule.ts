import { Schema } from "effect";

import { PlatformSchema } from "./platform.ts";

// The limits below are the server's (src/engagement/domain/comment-rule.ts
// and src/engagement/domain/reply-text.ts): a test keeps them equal.

/** The most comment rules a workspace keeps active or paused. */
export const maxCommentRulesPerWorkspace = 100;

/** The most keywords a rule listens for. */
export const maxKeywords = 10;

/** The longest keyword, in characters. */
export const maxKeywordLength = 60;

/** The most replies a rule sends a UTC day. */
export const maxRuleRepliesPerDay = 25;

/** How many of what a rule looked at its view shows, newest first. */
export const commentRuleMatchesShown = 20;

/** Where a comment rule is. */
export const CommentRuleStatusSchema = Schema.Literals([
  "active",
  "paused",
  "ended",
]).annotate({ identifier: "CommentRuleStatus" });

export type CommentRuleStatus = typeof CommentRuleStatusSchema.Type;

/**
 * Why a comment rule ended: a member stopped it (`stopped`), or whoever
 * started it can no longer answer comments (`starterGone`).
 */
export const CommentRuleEndReasonSchema = Schema.Literals([
  "stopped",
  "starterGone",
]).annotate({ identifier: "CommentRuleEndReason" });

/**
 * Whether a channel can carry a rule's reply: `available`; the platform
 * has no comments Peal reads (`noApi`) or its rules forbid an app to
 * answer by itself (`notAllowed`: Bluesky, X, LinkedIn, YouTube); this
 * server does not read the platform's comments (`unsupported`); the
 * channel must be connected again (`reconnect`); the reply is longer than
 * the platform takes (`textTooLong`).
 */
export const CommentRuleAbilitySchema = Schema.Literals([
  "available",
  "noApi",
  "notAllowed",
  "unsupported",
  "reconnect",
  "textTooLong",
]).annotate({ identifier: "CommentRuleAbility" });

export type CommentRuleAbility = typeof CommentRuleAbilitySchema.Type;

/** What a channel can carry of a rule. */
export const ChannelCommentRuleSchema = Schema.Struct({
  channelId: Schema.String,
  platform: PlatformSchema,
  reply: CommentRuleAbilitySchema,
}).annotate({ identifier: "ChannelCommentRule" });

/**
 * What came of a comment a rule matched: `claimed` while its reply is
 * made, `replied` (`replyId`, as the inbox shows it), `samePerson` (the
 * rule answered its author already), `refused` (the inbox's refusal, as
 * `code`).
 */
export const CommentRuleOutcomeSchema = Schema.Literals([
  "claimed",
  "replied",
  "samePerson",
  "refused",
]).annotate({ identifier: "CommentRuleOutcome" });

/** A comment a rule matched, and what came of it. */
export const CommentRuleMatchSchema = Schema.Struct({
  code: Schema.NullOr(Schema.String),
  commentId: Schema.String,
  lookedAt: Schema.DateTimeUtc,
  outcome: CommentRuleOutcomeSchema,
  replyId: Schema.NullOr(Schema.String),
}).annotate({ identifier: "CommentRuleMatch" });

/** A rule that answers comments holding a keyword. */
export const CommentRuleSchema = Schema.Struct({
  // The channel whose posts' comments it answers; null for a post's rule.
  channelId: Schema.NullOr(Schema.String),
  // What each channel it answers on can carry.
  channels: Schema.Array(ChannelCommentRuleSchema),
  createdAt: Schema.DateTimeUtc,
  endedReason: Schema.NullOr(CommentRuleEndReasonSchema),
  id: Schema.String,
  // As the rule matches them: lower case, without accents.
  keywords: Schema.Array(Schema.String),
  // The comments it matched, newest first, with what came of each.
  matches: Schema.Array(CommentRuleMatchSchema),
  // The post whose comments it answers; null for a channel's rule.
  postId: Schema.NullOr(Schema.String),
  reply: Schema.String,
  // The member who started it; null for a key, or once they left Peal.
  startedBy: Schema.NullOr(Schema.String),
  status: CommentRuleStatusSchema,
}).annotate({ identifier: "CommentRule" });

export type CommentRule = typeof CommentRuleSchema.Type;

export const CommentRulePageSchema = Schema.Struct({
  items: Schema.Array(CommentRuleSchema),
  nextCursor: Schema.NullOr(Schema.String),
}).annotate({ identifier: "CommentRulePage" });

export type CommentRulePage = typeof CommentRulePageSchema.Type;

const nul = String.fromCodePoint(0);

const ReplySchema = Schema.String.check(
  Schema.isMaxLength(5000),
  Schema.makeFilter((text: string) => !text.includes(nul), {
    expected: "text without NUL characters",
  })
);

const KeywordsSchema = Schema.Array(
  Schema.String.check(Schema.isMaxLength(maxKeywordLength * 2))
).check(Schema.isMaxLength(maxKeywords * 2));

/** What starts a rule: on a post (`postId`) or a channel (`channelId`), one of them. */
export const NewCommentRuleSchema = Schema.Struct({
  channelId: Schema.optionalKey(Schema.String),
  keywords: KeywordsSchema,
  postId: Schema.optionalKey(Schema.String),
  reply: ReplySchema,
}).annotate({ identifier: "NewCommentRule" });

export type NewCommentRule = typeof NewCommentRuleSchema.Type;

/** What changes of a rule: each left out stays as it is. */
export const CommentRuleChangeSchema = Schema.Struct({
  keywords: Schema.optionalKey(KeywordsSchema),
  paused: Schema.optionalKey(Schema.Boolean),
  reply: Schema.optionalKey(ReplySchema),
}).annotate({ identifier: "CommentRuleChange" });

export type CommentRuleChange = typeof CommentRuleChangeSchema.Type;

/** Why a comment rule was refused. */
export const CommentRuleRefusalSchema = Schema.Literals([
  "keywords",
  "emptyReply",
  "noChannel",
  "channels",
]).annotate({ identifier: "CommentRuleRefusal" });

export type CommentRuleRefusal = typeof CommentRuleRefusalSchema.Type;
