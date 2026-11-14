import type { DateTime, Option } from "effect";
import { Result, Schema } from "effect";

import {
  ChannelIdSchema,
  PostIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";

import { CommentRuleEndReasonSchema } from "./comment-rule-end-reason.ts";
import type { CommentRuleEndReason } from "./comment-rule-end-reason.ts";
import { CommentRuleEnded } from "./comment-rule-ended.ts";
import { CommentRuleIdSchema } from "./comment-rule-id.ts";
import type { CommentRuleId } from "./comment-rule-id.ts";

// The limits below are the owner's to change: each is written once here,
// and the contract's copy is kept equal by a test.

/** The most comment rules a workspace keeps active or paused. */
export const maxCommentRulesPerWorkspace = 100;

/** The most keywords a rule listens for. */
export const maxKeywords = 10;

/** The longest keyword, in characters. */
export const maxKeywordLength = 60;

/** The most replies a rule sends a UTC day, whatever its comments. */
export const maxRuleRepliesPerDay = 25;

/**
 * What a rule answers on: the comments under one post, or under every
 * post of one channel.
 */
export const CommentRuleScopeSchema = Schema.Union([
  Schema.TaggedStruct("post", { postId: PostIdSchema }),
  Schema.TaggedStruct("channel", { channelId: ChannelIdSchema }),
]);

export type CommentRuleScope = typeof CommentRuleScopeSchema.Type;

/**
 * How whoever started a rule reached Peal: in the web app, with an API key
 * (`apiKeyId`), or through an OAuth client (`clientId`). Stored as JSON:
 * add a member, never rename or remove one.
 */
export const CommentRuleOriginSchema = Schema.Union([
  Schema.TaggedStruct("web", {}),
  Schema.TaggedStruct("apiKey", { apiKeyId: Schema.NonEmptyString }),
  Schema.TaggedStruct("application", { clientId: Schema.NonEmptyString }),
]);

export type CommentRuleOrigin = typeof CommentRuleOriginSchema.Type;

export const CommentRuleStatusSchema = Schema.Union([
  Schema.TaggedStruct("active", {}),
  Schema.TaggedStruct("paused", { pausedAt: Schema.DateTimeUtc }),
  Schema.TaggedStruct("ended", {
    endedAt: Schema.DateTimeUtc,
    reason: CommentRuleEndReasonSchema,
  }),
]);

export type CommentRuleStatus = typeof CommentRuleStatusSchema.Type;

/**
 * A rule that answers comments by itself: a comment received after it
 * started, under a post it answers on, that holds one of its `keywords` as
 * a word, gets `reply` in public, as the channel's account, through the
 * inbox's own replies (their journal, their meter, one reply a comment),
 * once, and one person once a rule; `maxRuleRepliesPerDay` a UTC day.
 */
export class CommentRule extends Schema.Class<CommentRule>(
  "peal-server/engagement/domain/CommentRule"
)({
  createdAt: Schema.DateTimeUtc,
  id: CommentRuleIdSchema,
  keywords: Schema.Array(Schema.String),
  reply: Schema.String,
  scope: CommentRuleScopeSchema,
  startedBy: Schema.Option(UserIdSchema),
  startedVia: CommentRuleOriginSchema,
  status: CommentRuleStatusSchema,
  workspaceId: WorkspaceIdSchema,
}) {}

type RuleFields = ConstructorParameters<typeof CommentRule>[0];

const changed = (rule: CommentRule, fields: Partial<RuleFields>): CommentRule =>
  new CommentRule({
    createdAt: rule.createdAt,
    id: rule.id,
    keywords: rule.keywords,
    reply: rule.reply,
    scope: rule.scope,
    startedBy: rule.startedBy,
    startedVia: rule.startedVia,
    status: rule.status,
    workspaceId: rule.workspaceId,
    ...fields,
  });

// A text as keywords are matched in it: compatibility forms folded,
// accents dropped, lower case.
const folded = (text: string): string =>
  text
    .normalize("NFKD")
    .replaceAll(/\p{Mn}/gu, "")
    .toLocaleLowerCase("und");

const wordCharacter = /[\p{L}\p{N}_]/u;

/**
 * The keywords as a rule keeps them: folded, trimmed, inner spaces made
 * one, empty and repeated ones left out, in the order given.
 */
export const keywordsOf = (given: readonly string[]): readonly string[] => [
  ...new Set(
    given.flatMap((keyword) => {
      const kept = folded(keyword).trim().replaceAll(/\s+/gu, " ");

      return kept.length > 0 ? [kept] : [];
    })
  ),
];

// Whether `keyword` stands in `text` as a word, or words: not inside a
// longer one.
const holds = (text: string, keyword: string): boolean => {
  let from = text.indexOf(keyword);

  while (from !== -1) {
    const before = text.charAt(from - 1);
    const after = text.charAt(from + keyword.length);

    if (
      (from === 0 || !wordCharacter.test(before)) &&
      (after === "" || !wordCharacter.test(after))
    ) {
      return true;
    }

    from = text.indexOf(keyword, from + 1);
  }

  return false;
};

/** Whether a comment's text holds one of the rule's keywords as a word. */
export const isMatch = (rule: CommentRule, text: string): boolean => {
  const read = folded(text);

  return rule.keywords.some((keyword) => holds(read, keyword));
};

/** What starts a rule. */
export interface NewCommentRule {
  readonly id: CommentRuleId;
  readonly keywords: readonly string[];
  readonly reply: string;
  readonly scope: CommentRuleScope;
  readonly startedBy: Option.Option<UserId>;
  readonly startedVia: CommentRuleOrigin;
  readonly workspaceId: WorkspaceId;
}

export const startCommentRule = (
  request: NewCommentRule,
  now: DateTime.Utc
): CommentRule =>
  new CommentRule({
    ...request,
    createdAt: now,
    status: { _tag: "active" },
  });

/** What a member changes of a rule: each left out stays as it is. */
export interface CommentRuleChange {
  readonly keywords?: readonly string[];
  readonly paused?: boolean;
  readonly reply?: string;
}

export const changeCommentRule = (
  rule: CommentRule,
  change: CommentRuleChange,
  now: DateTime.Utc
): Result.Result<CommentRule, CommentRuleEnded> => {
  if (rule.status._tag === "ended") {
    return Result.fail(new CommentRuleEnded({ reason: rule.status.reason }));
  }

  let status: CommentRuleStatus = rule.status;

  if (change.paused === true && rule.status._tag !== "paused") {
    status = { _tag: "paused", pausedAt: now };
  } else if (change.paused === false) {
    status = { _tag: "active" };
  }

  return Result.succeed(
    changed(rule, {
      keywords: change.keywords ?? rule.keywords,
      reply: change.reply ?? rule.reply,
      status,
    })
  );
};

/** The rule ended at `now`; an ended one stays as it ended. */
export const endCommentRule = (
  rule: CommentRule,
  reason: CommentRuleEndReason,
  now: DateTime.Utc
): CommentRule =>
  rule.status._tag === "ended"
    ? rule
    : changed(rule, { status: { _tag: "ended", endedAt: now, reason } });

/**
 * Whether a platform's rules let an app answer comments by itself, read
 * from each platform's own pages (2026-11-14): Mastodon documents nothing
 * against it (servers' own rules may: the docs say so); Meta asks for the
 * account's consent before acting for it and forbids spam, which a rule a
 * member sets on their own posts, bounded a day and once a person, keeps.
 * Bluesky's bot guidance asks bots to "only interact … if the user has
 * tagged the bot account"; X blocks programmatic replies on self-serve
 * access unless the author summoned the account, and its rules ask for a
 * person's consent before an automated reply; LinkedIn's User Agreement
 * forbids bots that "comment on … posts"; YouTube's developer policies
 * forbid automating comments "without the user's prior specific and
 * express consent" to each. Those are `notAllowed`; the other platforms
 * have no comments Peal reads.
 */
export const commentRuleSupport = {
  bluesky: "notAllowed",
  facebook: "available",
  googleBusiness: "noApi",
  instagram: "available",
  linkedin: "notAllowed",
  mastodon: "available",
  pinterest: "noApi",
  threads: "noApi",
  tiktok: "noApi",
  x: "notAllowed",
  youtube: "notAllowed",
} as const satisfies {
  readonly [P in Platform]: "available" | "noApi" | "notAllowed";
};
