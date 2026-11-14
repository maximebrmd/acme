import { Effect, Option, Schema } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import {
  Api,
  CommentRuleEnded,
  CommentRuleNotFound,
  CommentRuleNotPossible,
  CurrentMember,
  TooManyCommentRules,
} from "peal-contract";

import type { CommentRuleNotPossible as NotPossible } from "#engagement/application/comment-rule-not-possible.ts";
import { CommentRules } from "#engagement/application/comment-rules.ts";
import type {
  ChangeCommentRuleRequest,
  ListedCommentRule,
} from "#engagement/application/comment-rules.ts";
import { CommentRuleIdSchema } from "#engagement/domain/comment-rule-id.ts";
import type { CommentRuleScope } from "#engagement/domain/comment-rule.ts";
import { actorOf } from "#shared/api/actor.ts";
import { forbidden } from "#shared/api/forbidden.ts";
import { ChannelIdSchema, PostIdSchema } from "#shared/domain/ids.ts";

import { commentRuleView } from "./comment-rule-view.ts";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

const decodeRuleId = Schema.decodeUnknownOption(CommentRuleIdSchema);
const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);
const decodePostId = Schema.decodeUnknownOption(PostIdSchema);

const notFound = () => Effect.fail(new CommentRuleNotFound());

const ruleIdFrom = (raw: string) =>
  Option.match(decodeRuleId(raw), {
    onNone: notFound,
    onSome: Effect.succeed,
  });

const answered = Effect.map((listed: ListedCommentRule) =>
  commentRuleView(listed)
);

const notPossible = ({ channels, reason }: NotPossible) =>
  Effect.fail(
    new CommentRuleNotPossible({
      channels: channels.map(({ channelId, platform, reply }) => ({
        channelId,
        platform,
        reply,
      })),
      reason,
    })
  );

const noChannel = () =>
  Effect.fail(
    new CommentRuleNotPossible({ channels: [], reason: "noChannel" })
  );

// What a request answers on: a post or a channel, exactly one. An id that
// is not even an id names nothing of the inbox.
const scopeOf = (payload: {
  readonly channelId?: string;
  readonly postId?: string;
}) =>
  Effect.gen(function* readingScope() {
    if ((payload.postId === undefined) === (payload.channelId === undefined)) {
      return yield* new HttpApiError.BadRequest();
    }

    if (payload.postId !== undefined) {
      const postId = decodePostId(payload.postId);

      if (Option.isNone(postId)) {
        return yield* noChannel();
      }

      const scope: CommentRuleScope = { _tag: "post", postId: postId.value };

      return scope;
    }

    const channelId = decodeChannelId(payload.channelId);

    if (Option.isNone(channelId)) {
      return yield* noChannel();
    }

    const scope: CommentRuleScope = {
      _tag: "channel",
      channelId: channelId.value,
    };

    return scope;
  });

// A failure of the server's own (the database, a bug) is a defect: 500.
export const InboxRulesHandlers = HttpApiBuilder.group(
  Api,
  "inboxRules",
  Effect.fn(function* inboxRulesHandlers(handlers) {
    const rules = yield* CommentRules;

    return handlers.handleAll({
      createCommentRule: ({ payload }) =>
        Effect.gen(function* create() {
          const actor = actorOf(yield* CurrentMember);
          const scope = yield* scopeOf(payload);

          return yield* rules
            .start(actor, {
              keywords: payload.keywords,
              reply: payload.reply,
              scope,
            })
            .pipe(
              answered,
              Effect.catchTags({
                CommentRuleNotPossible: notPossible,
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
                TooManyCommentRules: ({ allowed }) =>
                  Effect.fail(new TooManyCommentRules({ allowed })),
              })
            );
        }),
      deleteCommentRule: ({ params }) =>
        Effect.gen(function* stop() {
          const actor = actorOf(yield* CurrentMember);
          const ruleId = yield* ruleIdFrom(params.ruleId);

          yield* rules.stop(actor, ruleId).pipe(
            Effect.catchTags({
              CommentRuleNotFound: notFound,
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );
        }),
      getCommentRule: ({ params }) =>
        Effect.gen(function* get() {
          const actor = actorOf(yield* CurrentMember);
          const ruleId = yield* ruleIdFrom(params.ruleId);

          return yield* rules.get(actor, ruleId).pipe(
            answered,
            Effect.catchTags({
              CommentRuleNotFound: notFound,
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );
        }),
      listCommentRules: ({ query }) =>
        Effect.gen(function* list() {
          const actor = actorOf(yield* CurrentMember);

          const after =
            query.cursor === undefined
              ? Option.none()
              : Option.some(
                  yield* Option.match(decodeRuleId(query.cursor), {
                    onNone: () => Effect.fail(new HttpApiError.BadRequest()),
                    onSome: Effect.succeed,
                  })
                );

          const limit = query.limit ?? 50;

          const found = yield* rules
            .list(actor, {
              after,
              limit: limit + 1,
              status: Option.fromUndefinedOr(query.status),
            })
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
              })
            );

          const page = found.slice(0, limit);

          return {
            items: page.map(commentRuleView),
            nextCursor:
              found.length > limit ? (page.at(-1)?.rule.id ?? null) : null,
          };
        }),
      updateCommentRule: ({ params, payload }) =>
        Effect.gen(function* update() {
          const actor = actorOf(yield* CurrentMember);
          const ruleId = yield* ruleIdFrom(params.ruleId);
          const change: Mutable<ChangeCommentRuleRequest> = {};

          if (payload.keywords !== undefined) {
            change.keywords = payload.keywords;
          }

          if (payload.paused !== undefined) {
            change.paused = payload.paused;
          }

          if (payload.reply !== undefined) {
            change.reply = payload.reply;
          }

          return yield* rules.change(actor, ruleId, change).pipe(
            answered,
            Effect.catchTags({
              CommentRuleEnded: ({ reason }) =>
                Effect.fail(new CommentRuleEnded({ reason })),
              CommentRuleNotFound: notFound,
              CommentRuleNotPossible: notPossible,
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );
        }),
    });
  })
);
