import {
  Context,
  DateTime,
  Effect,
  Layer,
  Metric,
  Option,
  Schema,
} from "effect";

import type { CommentRuleEnded } from "#engagement/domain/comment-rule-ended.ts";
import { CommentRuleIdSchema } from "#engagement/domain/comment-rule-id.ts";
import type { CommentRuleId } from "#engagement/domain/comment-rule-id.ts";
import {
  changeCommentRule,
  commentRuleSupport,
  endCommentRule,
  isMatch,
  keywordsOf,
  maxCommentRulesPerWorkspace,
  maxKeywordLength,
  maxKeywords,
  maxChannelRepliesPerDay,
  maxRuleRepliesPerDay,
  claimLifetime,
  startCommentRule,
} from "#engagement/domain/comment-rule.ts";
import type {
  CommentRule,
  CommentRuleChange,
  CommentRuleOrigin,
  CommentRuleScope,
  CommentRuleStatus,
} from "#engagement/domain/comment-rule.ts";
import { abilitiesOf } from "#engagement/domain/engagement-abilities.ts";
import { maxReplyLength } from "#engagement/domain/reply-text.ts";
import { CurrentInboxPlatforms } from "#shared/application/current-inbox-platforms.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { Ids, newId } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { can } from "#shared/domain/access.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";
import { storableText } from "#shared/domain/platform-text.ts";
import type { Platform } from "#shared/domain/platform.ts";

import { CommentRuleNotFound } from "./comment-rule-not-found.ts";
import { CommentRuleNotPossible } from "./comment-rule-not-possible.ts";
import { EngagementReplies } from "./engagement-replies.ts";
import { CommentRuleStore } from "./ports/comment-rule-store.ts";
import type { MatchOutcome, RuleMatch } from "./ports/comment-rule-store.ts";
import { EngagementChannels } from "./ports/engagement-channels.ts";
import type { EngagedChannel } from "./ports/engagement-channels.ts";
import { FollowedPosts } from "./ports/followed-posts.ts";
import { ReplyLimits } from "./ports/reply-limits.ts";
import { RuleStarters } from "./ports/rule-starters.ts";
import { TooManyCommentRules } from "./too-many-comment-rules.ts";

/** Comments rules looked at, by what came of them. */
export const commentRulesRun = Metric.counter("peal.engagement.comment_rules", {
  description: "Comments that keyword rules looked at, by what came of them",
  incremental: true,
});

/** How many comments a rule looks at a run. */
export const candidatesPerRun = 50;

/** How many of what a rule looked at its view shows, newest first. */
export const matchesShown = 20;

// How many active rules a run reads at once.
const rulePage = 100;

/**
 * Whether a channel can carry a rule's reply: `available`, the platform's
 * rules (`noApi`, `notAllowed`), the inbox off there on this server
 * (`unsupported`), a permission the channel must be connected again for
 * (`reconnect`), or a reply longer than the platform takes
 * (`textTooLong`).
 */
export const CommentRuleAbilitySchema = Schema.Literals([
  "available",
  "noApi",
  "notAllowed",
  "unsupported",
  "reconnect",
  "textTooLong",
]);

export type CommentRuleAbility = typeof CommentRuleAbilitySchema.Type;

/** What a channel can carry of a rule. */
export interface ChannelCommentRule {
  readonly channelId: ChannelId;
  readonly platform: Platform;
  readonly reply: CommentRuleAbility;
}

/** A rule, with what its channels carry and what it did. */
export interface ListedCommentRule {
  readonly channels: readonly ChannelCommentRule[];
  readonly matches: readonly RuleMatch[];
  readonly rule: CommentRule;
}

/** What starts a rule. */
export interface StartCommentRuleRequest {
  readonly keywords: readonly string[];
  readonly reply: string;
  readonly scope: CommentRuleScope;
}

/** What a member changes of a rule: each left out stays as it is. */
export interface ChangeCommentRuleRequest {
  readonly keywords?: readonly string[];
  readonly paused?: boolean;
  readonly reply?: string;
}

/** A page of the workspace's rules. */
export interface ListCommentRuleRequest {
  readonly after: Option.Option<CommentRuleId>;
  readonly limit: number;
  readonly status: Option.Option<CommentRuleStatus["_tag"]>;
}

/** What a run of the rules did. */
export interface CommentRulesRun {
  readonly looked: number;
  readonly replied: number;
  readonly ended: number;
}

type Refused = DatabaseError | MissingPermission;

type ChangeBeingMade = {
  -readonly [K in keyof CommentRuleChange]: CommentRuleChange[K];
};

// What a member's request changes, its keywords and reply cleaned.
const changeOf = (
  request: ChangeCommentRuleRequest,
  keywords: readonly string[] | undefined,
  reply: string | undefined
): CommentRuleChange => {
  const change: ChangeBeingMade = {};

  if (keywords !== undefined) {
    change.keywords = keywords;
  }

  if (reply !== undefined) {
    change.reply = reply;
  }

  if (request.paused !== undefined) {
    change.paused = request.paused;
  }

  return change;
};

// How an actor reached Peal, as a rule keeps it.
const originOf = (actor: Actor): CommentRuleOrigin => {
  const { subject } = actor;

  if (subject._tag === "apiKey") {
    return { _tag: "apiKey", apiKeyId: subject.apiKeyId };
  }

  return subject.clientId === undefined
    ? { _tag: "web" }
    : { _tag: "application", clientId: subject.clientId };
};

// Staff acting as a member never start what acts later as the member.
const mayStart = (actor: Actor) =>
  actor.subject._tag === "user" && Option.isSome(actor.subject.impersonatedBy)
    ? Effect.fail(new MissingPermission({ permission: "engagement:reply" }))
    : Effect.fromResult(authorize(actor, "engagement:reply"));

const cleanReply = (reply: string) =>
  storableText(reply, maxReplyLength).trim();

// What a reader counts as characters.
const graphemes = new Intl.Segmenter("und", { granularity: "grapheme" });

const characters = (text: string) => [...graphemes.segment(text)].length;

// The keywords as a rule keeps them, or none when they are not right.
const cleanKeywords = (given: readonly string[]) => {
  const kept = keywordsOf(given.map((keyword) => storableText(keyword, 200)));

  return kept.length === 0 ||
    kept.length > maxKeywords ||
    kept.some((keyword) => characters(keyword) > maxKeywordLength)
    ? Option.none()
    : Option.some(kept);
};

// How a reply's refusal is kept: put off for a later run (none), or
// its tag.
const refusalOf = (tag: string): Option.Option<MatchOutcome> =>
  tag === "AllowanceReached"
    ? Option.none()
    : Option.some({ _tag: "refused", code: tag });

/**
 * Rules that answer comments by themselves (`#engagement/domain/
 * comment-rule.ts`), as members keep them, and the run that answers.
 *
 * Reading needs engagement:read; starting, changing and stopping one
 * needs engagement:reply, never staff acting as a member. A rule answers
 * through `EngagementReplies.reply`, as its starter is now, so the
 * inbox's journal, its once-a-comment rule and its outbound messages
 * apply, under a key of the rule and the comment, so a run cut short and
 * run again answers once. The approval policy does not apply, as it does
 * not to a member's reply. A rule is refused where no channel it answers
 * on can carry its reply (`CommentRuleNotPossible`, each channel with its
 * reason): Bluesky, X, LinkedIn and YouTube refuse it by their rules.
 */
export class CommentRules extends Context.Service<
  CommentRules,
  {
    readonly list: (
      actor: Actor,
      request: ListCommentRuleRequest
    ) => Effect.Effect<readonly ListedCommentRule[], Refused>;
    readonly get: (
      actor: Actor,
      ruleId: CommentRuleId
    ) => Effect.Effect<ListedCommentRule, Refused | CommentRuleNotFound>;
    readonly start: (
      actor: Actor,
      request: StartCommentRuleRequest
    ) => Effect.Effect<
      ListedCommentRule,
      Refused | CommentRuleNotPossible | TooManyCommentRules
    >;
    readonly change: (
      actor: Actor,
      ruleId: CommentRuleId,
      request: ChangeCommentRuleRequest
    ) => Effect.Effect<
      ListedCommentRule,
      Refused | CommentRuleEnded | CommentRuleNotFound | CommentRuleNotPossible
    >;
    readonly stop: (
      actor: Actor,
      ruleId: CommentRuleId
    ) => Effect.Effect<void, Refused | CommentRuleNotFound>;
    /** The cron's run: answers the comments the active rules match. */
    readonly runDue: Effect.Effect<CommentRulesRun, DatabaseError>;
  }
>()("peal-server/engagement/application/CommentRules") {
  static readonly layer = Layer.effect(
    CommentRules,
    Effect.gen(function* CommentRulesLive() {
      const store = yield* CommentRuleStore;
      const channels = yield* EngagementChannels;
      const posts = yield* FollowedPosts;
      const limits = yield* ReplyLimits;
      const starters = yield* RuleStarters;
      const replies = yield* EngagementReplies;
      const inbox = yield* CurrentInboxPlatforms;
      const ids = yield* Ids;
      const { transaction } = yield* TransactionRunner;

      // What a channel can carry of a rule's reply, now.
      const abilityOn = Effect.fn("CommentRules.abilityOn")(function* abilityOn(
        channelId: ChannelId,
        reply: string
      ) {
        const channel = yield* channels.describe(channelId).pipe(
          Effect.map(Option.some),
          Effect.catchTag("ChannelUnreadable", () =>
            Effect.succeed(Option.none<EngagedChannel>())
          )
        );

        if (Option.isNone(channel)) {
          return Option.none<ChannelCommentRule>();
        }

        const { connection, platform, scopes } = channel.value;
        const support = commentRuleSupport[platform];

        const able = (reason: CommentRuleAbility): ChannelCommentRule => ({
          channelId,
          platform,
          reply: reason,
        });

        if (support !== "available") {
          return Option.some(able(support));
        }

        const standing = abilitiesOf(platform, scopes, inbox, connection).reply;

        if (standing !== "available") {
          return Option.some(
            able(standing === "reconnect" ? "reconnect" : "unsupported")
          );
        }

        const overflow = yield* limits.overflow(platform, reply);

        return Option.some(
          able(Option.isSome(overflow) ? "textTooLong" : "available")
        );
      });

      const channelsOf = Effect.fn("CommentRules.channelsOf")(
        function* channelsOf(rule: CommentRule) {
          let named: readonly ChannelId[] = [];

          if (rule.scope._tag === "post") {
            // Where it went out, as the inbox follows it, and where it is
            // for, so a rule is taken on a post not out yet.
            const [followed, meant] = yield* Effect.all([
              store.channelsOfPost(rule.workspaceId, rule.scope.postId),
              posts.channelsOf(rule.workspaceId, rule.scope.postId),
            ]);

            named = [...new Set([...followed, ...meant])].toSorted();
          } else if (
            yield* channels.belongs(rule.scope.channelId, rule.workspaceId)
          ) {
            named = [rule.scope.channelId];
          }

          const found = yield* Effect.forEach((channelId: ChannelId) =>
            abilityOn(channelId, rule.reply)
          )(named);

          return found.flatMap((one) => Option.toArray(one));
        }
      );

      const listed = Effect.fn("CommentRules.listed")(function* listed(
        rule: CommentRule
      ) {
        const shown: ListedCommentRule = {
          channels: yield* channelsOf(rule),
          matches: yield* store.matchesOf(rule.id, matchesShown),
          rule,
        };

        return shown;
      });

      const possible = Effect.fn("CommentRules.possible")(function* possible(
        rule: CommentRule
      ) {
        const carried = yield* channelsOf(rule);

        if (carried.length === 0) {
          return yield* new CommentRuleNotPossible({
            channels: [],
            reason: "noChannel",
          });
        }

        if (
          !carried.some(({ reply }) => reply === "available") ||
          carried.some(({ reply }) => reply === "textTooLong")
        ) {
          return yield* new CommentRuleNotPossible({
            channels: carried,
            reason: "channels",
          });
        }

        return carried;
      });

      const found = Effect.fn("CommentRules.found")(function* found(
        actor: Actor,
        ruleId: CommentRuleId,
        lock: boolean
      ) {
        const rule = lock
          ? yield* store.lock(actor.workspaceId, ruleId)
          : yield* store.rule(actor.workspaceId, ruleId);

        if (Option.isNone(rule)) {
          return yield* new CommentRuleNotFound({ ruleId });
        }

        return rule.value;
      });

      const list = Effect.fn("CommentRules.list")(function* list(
        actor: Actor,
        request: ListCommentRuleRequest
      ) {
        yield* Effect.fromResult(authorize(actor, "engagement:read"));

        const rules = yield* store.list(actor.workspaceId, request);

        return yield* Effect.forEach((rule: CommentRule) => listed(rule))(
          rules
        );
      });

      const get = Effect.fn("CommentRules.get")(function* get(
        actor: Actor,
        ruleId: CommentRuleId
      ) {
        yield* Effect.fromResult(authorize(actor, "engagement:read"));

        return yield* listed(yield* found(actor, ruleId, false));
      });

      const start = Effect.fn("CommentRules.start")(function* start(
        actor: Actor,
        request: StartCommentRuleRequest
      ) {
        yield* mayStart(actor);

        const keywords = cleanKeywords(request.keywords);
        const reply = cleanReply(request.reply);

        if (Option.isNone(keywords)) {
          return yield* new CommentRuleNotPossible({
            channels: [],
            reason: "keywords",
          });
        }

        if (reply.length === 0) {
          return yield* new CommentRuleNotPossible({
            channels: [],
            reason: "emptyReply",
          });
        }

        const id = yield* newId(CommentRuleIdSchema).pipe(
          Effect.provideService(Ids, ids)
        );

        const rule = startCommentRule(
          {
            id,
            keywords: keywords.value,
            reply,
            scope: request.scope,
            startedBy:
              actor.subject._tag === "user"
                ? Option.some(actor.subject.userId)
                : Option.none(),
            startedVia: originOf(actor),
            workspaceId: actor.workspaceId,
          },
          yield* DateTime.now
        );

        yield* possible(rule);

        yield* transaction(
          Effect.gen(function* save() {
            yield* store.claim(actor.workspaceId);

            if (
              (yield* store.countOpen(actor.workspaceId)) >=
              maxCommentRulesPerWorkspace
            ) {
              return yield* new TooManyCommentRules({
                allowed: maxCommentRulesPerWorkspace,
              });
            }

            return yield* store.insert(rule);
          })
        );

        return yield* listed(rule);
      });

      const change = Effect.fn("CommentRules.change")(function* change(
        actor: Actor,
        ruleId: CommentRuleId,
        request: ChangeCommentRuleRequest
      ) {
        yield* mayStart(actor);

        const keywords =
          request.keywords === undefined
            ? Option.some(undefined)
            : cleanKeywords(request.keywords);

        if (Option.isNone(keywords)) {
          return yield* new CommentRuleNotPossible({
            channels: [],
            reason: "keywords",
          });
        }

        const reply =
          request.reply === undefined ? undefined : cleanReply(request.reply);

        if (reply?.length === 0) {
          return yield* new CommentRuleNotPossible({
            channels: [],
            reason: "emptyReply",
          });
        }

        const now = yield* DateTime.now;

        const next = yield* transaction(
          Effect.gen(function* save() {
            const rule = yield* found(actor, ruleId, true);

            const changed = yield* Effect.fromResult(
              changeCommentRule(
                rule,
                changeOf(request, keywords.value, reply),
                now
              )
            );

            if (reply !== undefined) {
              yield* possible(changed);
            }

            yield* store.update(changed);

            return changed;
          })
        );

        return yield* listed(next);
      });

      const stop = Effect.fn("CommentRules.stop")(function* stop(
        actor: Actor,
        ruleId: CommentRuleId
      ) {
        yield* mayStart(actor);

        const now = yield* DateTime.now;

        yield* transaction(
          Effect.gen(function* save() {
            const rule = yield* found(actor, ruleId, true);

            return yield* store.update(endCommentRule(rule, "stopped", now));
          })
        );
      });

      // One rule's run: the comments it has not looked at, oldest first.
      const runRule = Effect.fn("CommentRules.runRule")(function* runRule(
        rule: CommentRule
      ) {
        const now = yield* DateTime.now;
        const tally = { ended: 0, looked: 0, replied: 0 };
        const starter = yield* starters.of(rule);

        if (starter._tag === "lockedOut") {
          return tally;
        }

        if (
          starter._tag === "gone" ||
          !can(starter.actor, "engagement:reply")
        ) {
          yield* store.update(endCommentRule(rule, "starterGone", now));
          tally.ended += 1;

          return tally;
        }

        const dayStart = DateTime.startOf(now, "day");

        if (
          (yield* store.repliedSince(rule.id, dayStart)) >= maxRuleRepliesPerDay
        ) {
          return tally;
        }

        // Only the channels that can carry the reply now, by their
        // platform's rules too: a post's rule never answers on Bluesky,
        // X, LinkedIn or YouTube, whatever the inbox may do there.
        const carried = (yield* channelsOf(rule)).flatMap(
          ({ channelId, reply }) => (reply === "available" ? [channelId] : [])
        );

        const claimedBefore = DateTime.subtractDuration(now, claimLifetime);

        const candidates = yield* store.candidates(
          rule,
          carried,
          claimedBefore,
          candidatesPerRun
        );

        // A comment to answer is claimed under the rule's and the
        // channel's day, counted with the replies on their way, in one
        // transaction: overlapping runs take turns and pass no cap.
        const claimToAnswer = Effect.fn("CommentRules.claimToAnswer")(
          function* claimToAnswer(candidate: (typeof candidates)[number]) {
            yield* store.claimReplyDay(rule.id, candidate.channelId);

            if (
              (yield* store.repliedSince(rule.id, dayStart)) >=
              maxRuleRepliesPerDay
            ) {
              return "ruleFull" as const;
            }

            if (
              (yield* store.repliedOnChannelSince(
                candidate.channelId,
                dayStart
              )) >= maxChannelRepliesPerDay
            ) {
              return "channelFull" as const;
            }

            return (yield* store.claimMatch(
              rule.id,
              candidate.commentId,
              now,
              claimedBefore
            ))
              ? ("claimed" as const)
              : ("taken" as const);
          }
        );

        for (const candidate of candidates) {
          if (!isMatch(rule, candidate.text)) {
            if (
              yield* store.claimMatch(
                rule.id,
                candidate.commentId,
                now,
                claimedBefore
              )
            ) {
              tally.looked += 1;
              yield* store.settleMatch(rule.id, candidate.commentId, {
                _tag: "noMatch",
              });
            }

            continue;
          }

          const claimed = yield* transaction(claimToAnswer(candidate));

          if (claimed === "ruleFull") {
            break;
          }

          if (claimed !== "claimed") {
            continue;
          }

          tally.looked += 1;

          if (
            Option.isSome(candidate.authorPlatformId) &&
            (yield* store.answeredAuthor(
              rule.id,
              candidate.authorPlatformId.value,
              candidate.commentId
            ))
          ) {
            yield* store.settleMatch(rule.id, candidate.commentId, {
              _tag: "samePerson",
            });
            continue;
          }

          const answered = yield* replies
            .reply(
              starter.actor,
              candidate.commentId,
              rule.reply,
              Option.some(`comment-rule:${rule.id}:${candidate.commentId}`)
            )
            .pipe(
              Effect.map((reply): Option.Option<MatchOutcome> =>
                Option.some({ _tag: "replied", replyId: reply.id })
              ),
              Effect.catch((error) =>
                error._tag === "DatabaseError"
                  ? Effect.fail(error)
                  : Effect.succeed(refusalOf(error._tag))
              )
            );

          if (Option.isNone(answered)) {
            // The billing account has no room for a message now: later.
            yield* store.releaseMatch(rule.id, candidate.commentId);
            break;
          }

          yield* store.settleMatch(
            rule.id,
            candidate.commentId,
            answered.value
          );

          if (answered.value._tag === "replied") {
            tally.replied += 1;
          }
        }

        return tally;
      });

      const runDue = Effect.gen(function* runDue() {
        const tally = { ended: 0, looked: 0, replied: 0 };
        let after = Option.none<CommentRuleId>();

        for (;;) {
          const page = yield* store.active(after, rulePage);

          for (const rule of page) {
            // One rule the database fails on waits for the next run; the
            // others go on.
            const done = yield* runRule(rule).pipe(
              Effect.catchTag("DatabaseError", (failure) =>
                Effect.logWarning("A comment rule's run failed", failure).pipe(
                  Effect.annotateLogs({ ruleId: rule.id }),
                  Effect.as({ ended: 0, looked: 0, replied: 0 })
                )
              )
            );

            tally.ended += done.ended;
            tally.looked += done.looked;
            tally.replied += done.replied;
          }

          if (page.length < rulePage) {
            break;
          }

          after = Option.fromUndefinedOr(page.at(-1)?.id);
        }

        yield* Metric.update(
          Metric.withAttributes(commentRulesRun, { outcome: "replied" }),
          tally.replied
        );
        yield* Metric.update(
          Metric.withAttributes(commentRulesRun, { outcome: "looked" }),
          tally.looked
        );

        const run: CommentRulesRun = tally;

        return run;
      }).pipe(Effect.withSpan("CommentRules.runDue"));

      return CommentRules.of({ change, get, list, runDue, start, stop });
    })
  );
}
