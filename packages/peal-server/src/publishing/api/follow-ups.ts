import { Effect, Option, Schema } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import {
  Api,
  CurrentMember,
  FollowUpNotPossible,
  FollowUpRuleEnded,
  FollowUpRuleNotFound,
  FollowUpRuleTaken,
  PostNotFound,
  TooManyFollowUpRules,
  defaultFollowUpPageSize,
} from "peal-contract";

import type { FollowUpNotPossible as NotPossible } from "#publishing/application/follow-up-not-possible.ts";
import type {
  ChangeFollowUpRequest,
  ListedFollowUpRule,
} from "#publishing/application/follow-up-rules.ts";
import { FollowUpRules } from "#publishing/application/follow-up-rules.ts";
import { FollowUpRuleIdSchema } from "#publishing/domain/follow-up-rule-id.ts";
import type { FollowUpScope } from "#publishing/domain/follow-up-rule.ts";
import { actorOf } from "#shared/api/actor.ts";
import { forbidden } from "#shared/api/forbidden.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";

import { followUpRuleView } from "./follow-up-view.ts";
import { postIdFrom, postIdOption } from "./post-input.ts";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

const decodeRuleId = Schema.decodeUnknownOption(FollowUpRuleIdSchema);

const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);

const notFound = () => Effect.fail(new FollowUpRuleNotFound());

const ruleIdFrom = (raw: string) =>
  Option.match(decodeRuleId(raw), {
    onNone: notFound,
    onSome: Effect.succeed,
  });

const answered = Effect.map((listed: ListedFollowUpRule) =>
  followUpRuleView(listed)
);

const notPossible = ({ channels, reason }: NotPossible) =>
  Effect.fail(
    new FollowUpNotPossible({
      channels: channels.map(({ channelId, comment, platform, repost }) => ({
        channelId,
        comment,
        platform,
        repost,
      })),
      reason,
    })
  );

const ended = ({ reason }: { readonly reason: FollowUpRuleEnded["reason"] }) =>
  Effect.fail(new FollowUpRuleEnded({ reason }));

// What a request starts a rule on: a post or a channel, exactly one. A
// channel id that names no channel is a channel the workspace does not
// have: the rule is refused as acting on none.
const scopeOf = (payload: {
  readonly channelId?: string;
  readonly postId?: string;
}) =>
  Effect.gen(function* readingScope() {
    if ((payload.postId === undefined) === (payload.channelId === undefined)) {
      return yield* new HttpApiError.BadRequest();
    }

    if (payload.postId !== undefined) {
      const scope: FollowUpScope = {
        _tag: "post",
        postId: yield* postIdFrom(payload.postId),
      };

      return scope;
    }

    const channelId = decodeChannelId(payload.channelId);

    if (Option.isNone(channelId)) {
      return yield* new FollowUpNotPossible({
        channels: [],
        reason: "noChannel",
      });
    }

    const scope: FollowUpScope = {
      _tag: "channel",
      channelId: channelId.value,
    };

    return scope;
  });

export const FollowUpsHandlers = HttpApiBuilder.group(
  Api,
  "followUps",
  Effect.fn(function* followUpsHandlers(handlers) {
    const rules = yield* FollowUpRules;

    return handlers.handleAll({
      approve: ({ params }) =>
        Effect.gen(function* approve() {
          const actor = actorOf(yield* CurrentMember);
          const ruleId = yield* ruleIdFrom(params.ruleId);

          return yield* rules.approve(actor, ruleId).pipe(
            answered,
            Effect.catchTags({
              DatabaseError: Effect.die,
              FollowUpRuleEnded: ended,
              FollowUpRuleNotFound: notFound,
              MissingPermission: forbidden,
            })
          );
        }),
      create: ({ payload }) =>
        Effect.gen(function* create() {
          const actor = actorOf(yield* CurrentMember);
          const scope = yield* scopeOf(payload);

          return yield* rules
            .start(actor, {
              comment: Option.fromUndefinedOr(payload.comment),
              likes: payload.likes,
              repost: payload.repost ?? false,
              scope,
            })
            .pipe(
              answered,
              Effect.catchTags({
                DatabaseError: Effect.die,
                FollowUpNotPossible: notPossible,
                FollowUpRuleTaken: ({ ruleId }) =>
                  Effect.fail(new FollowUpRuleTaken({ ruleId })),
                MissingPermission: forbidden,
                PostNotFound: () => Effect.fail(new PostNotFound()),
                TooManyFollowUpRules: ({ allowed }) =>
                  Effect.fail(new TooManyFollowUpRules({ allowed })),
              })
            );
        }),
      delete: ({ params }) =>
        Effect.gen(function* stop() {
          const actor = actorOf(yield* CurrentMember);
          const ruleId = yield* ruleIdFrom(params.ruleId);

          yield* rules.stop(actor, ruleId).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              FollowUpRuleNotFound: notFound,
              MissingPermission: forbidden,
            })
          );
        }),
      get: ({ params }) =>
        Effect.gen(function* get() {
          const actor = actorOf(yield* CurrentMember);
          const ruleId = yield* ruleIdFrom(params.ruleId);

          return yield* rules.get(actor, ruleId).pipe(
            answered,
            Effect.catchTags({
              DatabaseError: Effect.die,
              FollowUpRuleNotFound: notFound,
              MissingPermission: forbidden,
            })
          );
        }),
      list: ({ query }) =>
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

          // A post id that names no post has no rules.
          const postId =
            query.postId === undefined
              ? Option.none()
              : Option.some(postIdOption(query.postId));

          if (Option.exists(postId, Option.isNone)) {
            return { items: [], nextCursor: null };
          }

          const limit = query.limit ?? defaultFollowUpPageSize;

          // One more than the page, to tell whether another follows.
          const found = yield* rules
            .list(actor, {
              after,
              limit: limit + 1,
              postId: Option.flatten(postId),
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
            items: page.map(followUpRuleView),
            nextCursor:
              found.length > limit ? (page.at(-1)?.rule.id ?? null) : null,
          };
        }),
      update: ({ params, payload }) =>
        Effect.gen(function* update() {
          const actor = actorOf(yield* CurrentMember);
          const ruleId = yield* ruleIdFrom(params.ruleId);

          const change: Mutable<ChangeFollowUpRequest> = {};

          if (payload.comment !== undefined) {
            change.comment = Option.fromNullOr(payload.comment);
          }

          if (payload.likes !== undefined) {
            change.likes = payload.likes;
          }

          if (payload.paused !== undefined) {
            change.paused = payload.paused;
          }

          if (payload.repost !== undefined) {
            change.repost = payload.repost;
          }

          return yield* rules.change(actor, ruleId, change).pipe(
            answered,
            Effect.catchTags({
              DatabaseError: Effect.die,
              FollowUpNotPossible: notPossible,
              FollowUpRuleEnded: ended,
              FollowUpRuleNotFound: notFound,
              MissingPermission: forbidden,
            })
          );
        }),
    });
  })
);
