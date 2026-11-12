import { Effect, Option, Schema } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import {
  Api,
  CurrentMember,
  PostNotFound,
  PostNotRecyclable,
  QueueNotFound,
  RecyclingEndsTooSoon,
  RecyclingRuleEnded,
  RecyclingRuleNotFound,
  RecyclingVariantsInvalid,
  TooManyRecyclingRules,
  defaultRecyclingPageSize,
} from "peal-contract";
import type { RecyclingVariant as VariantInput } from "peal-contract";

import { Recycling } from "#publishing/application/recycling.ts";
import type {
  ChangeRequest,
  ListedRule,
} from "#publishing/application/recycling.ts";
import { RecyclingRuleIdSchema } from "#publishing/domain/recycling-rule-id.ts";
import { RecyclingVariantsSchema } from "#publishing/domain/recycling-rule.ts";
import { actorOf } from "#shared/api/actor.ts";
import { forbidden } from "#shared/api/forbidden.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

import { postIdFrom, queueIdOf } from "./post-input.ts";
import { ruleView } from "./recycling-view.ts";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

const decodeRuleId = Schema.decodeUnknownOption(RecyclingRuleIdSchema);

const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);

// The contract checked every variant's text and overrides already.
const decodeVariants = Schema.decodeUnknownEffect(RecyclingVariantsSchema);

const notFound = () => Effect.fail(new RecyclingRuleNotFound());

const ruleIdFrom = (raw: string) =>
  Option.match(decodeRuleId(raw), {
    onNone: notFound,
    onSome: Effect.succeed,
  });

// A day as the contract writes it, which it checked is one.
const dateOf = (day: string): LocalDate => {
  const [year = 0, month = 0, dayOfMonth = 0] = day.split("-").map(Number);

  return { day: dayOfMonth, month, year };
};

// The variants a request gives, its texts by channel on channels that are
// not even channel ids left out, as they name none the post goes to.
const variantsFrom = (variants: readonly VariantInput[]) =>
  decodeVariants(
    variants.map(({ overrides = [], text }) => ({
      overrides: overrides.filter(({ channelId }) =>
        Option.isSome(decodeChannelId(channelId))
      ),
      text,
    }))
  ).pipe(Effect.orDie);

const optionalVariants = (variants: readonly VariantInput[] | undefined) =>
  variants === undefined
    ? Effect.succeed(Option.none())
    : variantsFrom(variants).pipe(Effect.map(Option.some));

const answered = Effect.map((listed: ListedRule) => ruleView(listed));

const endsTooSoon = ({ firstDueAt }: RecyclingEndsTooSoon) =>
  Effect.fail(new RecyclingEndsTooSoon({ firstDueAt }));

const variantsInvalid = ({
  variants,
}: {
  readonly variants: RecyclingVariantsInvalid["variants"];
}) => Effect.fail(new RecyclingVariantsInvalid({ variants }));

const ended = ({ reason }: { readonly reason: string }) =>
  Effect.fail(new RecyclingRuleEnded({ reason }));

export const RecyclingHandlers = HttpApiBuilder.group(
  Api,
  "recycling",
  Effect.fn(function* recyclingHandlers(handlers) {
    const recycling = yield* Recycling;

    return handlers.handleAll({
      create: ({ payload }) =>
        Effect.gen(function* create() {
          const actor = actorOf(yield* CurrentMember);
          const postId = yield* postIdFrom(payload.postId);
          const queueId = yield* queueIdOf(payload.queueId);

          return yield* recycling
            .start(actor, {
              count: Option.fromUndefinedOr(payload.count),
              interval: payload.every,
              postId,
              queueId,
              until: Option.fromUndefinedOr(payload.until).pipe(
                Option.map(dateOf)
              ),
              variants: yield* variantsFrom(payload.variants ?? []),
            })
            .pipe(
              answered,
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
                PostNotFound: () => Effect.fail(new PostNotFound()),
                PostNotRecyclable: ({ reason }) =>
                  Effect.fail(
                    new PostNotRecyclable({ postId: payload.postId, reason })
                  ),
                QueueNotFound: () => Effect.fail(new QueueNotFound()),
                RecyclingEndsTooSoon: endsTooSoon,
                RecyclingVariantsRejected: variantsInvalid,
                TooManyRecyclingRules: ({ allowed }) =>
                  Effect.fail(new TooManyRecyclingRules({ allowed })),
              })
            );
        }),
      delete: ({ params }) =>
        Effect.gen(function* stop() {
          const actor = actorOf(yield* CurrentMember);
          const ruleId = yield* ruleIdFrom(params.ruleId);

          yield* recycling.stop(actor, ruleId).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              RecyclingRuleNotFound: notFound,
            })
          );
        }),
      get: ({ params }) =>
        Effect.gen(function* get() {
          const actor = actorOf(yield* CurrentMember);
          const ruleId = yield* ruleIdFrom(params.ruleId);

          return yield* recycling.get(actor, ruleId).pipe(
            answered,
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              RecyclingRuleNotFound: notFound,
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

          const limit = query.limit ?? defaultRecyclingPageSize;

          // One more than the page, to tell whether another follows.
          const rules = yield* recycling
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

          const page = rules.slice(0, limit);

          return {
            items: page.map(ruleView),
            nextCursor:
              rules.length > limit ? (page.at(-1)?.rule.id ?? null) : null,
          };
        }),
      resume: ({ params, payload }) =>
        Effect.gen(function* resume() {
          const actor = actorOf(yield* CurrentMember);
          const ruleId = yield* ruleIdFrom(params.ruleId);
          const variants = yield* optionalVariants(payload.variants);

          return yield* recycling.resume(actor, ruleId, variants).pipe(
            answered,
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              PostNotFound: () => Effect.fail(new PostNotFound()),
              RecyclingEndsTooSoon: endsTooSoon,
              RecyclingRuleEnded: ended,
              RecyclingRuleNotFound: notFound,
              RecyclingVariantsRejected: variantsInvalid,
            })
          );
        }),
      update: ({ params, payload }) =>
        Effect.gen(function* update() {
          const actor = actorOf(yield* CurrentMember);
          const ruleId = yield* ruleIdFrom(params.ruleId);
          const variants = yield* optionalVariants(payload.variants);

          const change: Mutable<ChangeRequest> = {};

          if (payload.count !== undefined) {
            change.count = Option.fromNullOr(payload.count);
          }

          if (payload.paused !== undefined) {
            change.paused = payload.paused;
          }

          if (payload.until !== undefined) {
            change.until = Option.fromNullOr(payload.until).pipe(
              Option.map(dateOf)
            );
          }

          if (Option.isSome(variants)) {
            change.variants = variants.value;
          }

          return yield* recycling.change(actor, ruleId, change).pipe(
            answered,
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              PostNotFound: () => Effect.fail(new PostNotFound()),
              RecyclingEndsTooSoon: endsTooSoon,
              RecyclingRuleEnded: ended,
              RecyclingRuleNotFound: notFound,
              RecyclingVariantsRejected: variantsInvalid,
            })
          );
        }),
    });
  })
);
