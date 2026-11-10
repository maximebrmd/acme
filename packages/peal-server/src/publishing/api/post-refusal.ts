import { Array as Arr, Effect, Match, Option, Schema } from "effect";
import {
  DuplicatePost,
  errorCodeOf,
  IdempotencyKeyReused,
  PostContentInvalid,
  PostNotFound,
  PostRefusalSchema,
  ScheduleInPast,
  UnknownChannels,
  UnknownMedia,
  UnknownTags,
} from "peal-contract";
import type { CurrentMember, PostRefusal } from "peal-contract";

import type { SendRefusal } from "#publishing/application/post-batches.ts";
import type { PostCheck } from "#publishing/application/post-checks.ts";
import { refused } from "#shared/api/forbidden.ts";
import type { LimitRefusal } from "#shared/api/limit-reached.ts";
import { RequestId } from "#shared/api/request-id.ts";

// One post of several is answered what `send` would have answered for it
// alone, as data: the same errors, with the same fields.

const DeclaredSchema = Schema.Struct({
  description: Schema.String,
  identifier: Schema.String,
});

const decodeDeclared = Schema.decodeUnknownOption(DeclaredSchema);

// What each refusal means, in the words the contract describes it with: a
// refusal that has none of its own is told these, as an error is.
const words = new Map(
  PostRefusalSchema.members.flatMap((member) =>
    Option.match(decodeDeclared(member.ast.annotations), {
      onNone: () => [],
      onSome: ({ description, identifier }) => [
        [identifier, description] as const,
      ],
    })
  )
);

const encodeRefusal = Schema.encodeEffect(PostRefusalSchema);

const decodeRefusal = Schema.decodeUnknownEffect(PostRefusalSchema);

/**
 * A refusal answered as data, inside an answer that is not an error, in
 * the envelope every error of the API comes in: its `code`, words for a
 * person (its own, or the contract's) and the request's id. The server
 * fills these on an error it answers; nothing does for one inside a 200.
 */
export const inEnvelope = (refusal: PostRefusal): Effect.Effect<PostRefusal> =>
  Effect.gen(function* filled() {
    const requestId = yield* Effect.serviceOption(RequestId);
    const own = yield* encodeRefusal(refusal);

    const told = {
      ...own,
      code: errorCodeOf(refusal._tag),
      message:
        own.message === undefined || own.message === ""
          ? (words.get(refusal._tag) ?? "The post was refused.")
          : own.message,
    };

    return yield* decodeRefusal(
      Option.match(requestId, {
        onNone: () => told,
        onSome: (id) => ({ ...told, requestId: id }),
      })
    );
  }).pipe(Effect.orDie);

/** A post of several, its refusal in the envelope if it was refused. */
export const toldRefusal = <
  A extends { readonly _tag: string } | { readonly refusal: PostRefusal },
>(
  result: A
): Effect.Effect<A> =>
  "refusal" in result
    ? inEnvelope(result.refusal).pipe(
        Effect.map((refusal) => ({ ...result, refusal }))
      )
    : Effect.succeed(result);

/** Why sending a post failed, as the contract tells it. */
export const refusalOf =
  (limitReached: LimitRefusal) =>
  (failure: SendRefusal): Effect.Effect<PostRefusal, never, CurrentMember> =>
    Match.valueTags(failure, {
      DuplicateContent: ({ duplicates }) =>
        Effect.succeed<PostRefusal>(
          new DuplicatePost({
            duplicates: duplicates.map(({ channelId, postId }) => ({
              channelId,
              postId,
            })),
          })
        ),
      IdempotencyKeyReused: () =>
        Effect.succeed<PostRefusal>(new IdempotencyKeyReused()),
      MissingPermission: ({ permission }) =>
        Effect.succeed<PostRefusal>(refused("missingPermission", permission)),
      PlanLimitReached: (reached) =>
        limitReached(reached).pipe(
          Effect.flip,
          Effect.map((refusal): PostRefusal => refusal)
        ),
      PostContentRejected: ({ violations }) =>
        Effect.succeed<PostRefusal>(new PostContentInvalid({ violations })),
      PostNotFound: () => Effect.succeed<PostRefusal>(new PostNotFound()),
      ScheduleInPast: () => Effect.succeed<PostRefusal>(new ScheduleInPast()),
      UnknownChannels: ({ channelIds }) =>
        Effect.succeed<PostRefusal>(new UnknownChannels({ channelIds })),
      UnknownMedia: ({ mediaIds }) =>
        Effect.succeed<PostRefusal>(new UnknownMedia({ mediaIds })),
      UnknownTags: ({ tagIds }) =>
        Effect.succeed<PostRefusal>(new UnknownTags({ tagIds })),
    });

/**
 * What sending the post a check looked at would be refused with, if
 * anything: the first of what `send` checks in turn, with everything of
 * that kind.
 */
export const refusalOfCheck =
  (limitReached: LimitRefusal) =>
  (
    check: PostCheck
  ): Effect.Effect<Option.Option<PostRefusal>, never, CurrentMember> => {
    const violations = [
      ...check.violations,
      ...check.channels.flatMap((channel) => channel.violations),
    ];

    if (Arr.isReadonlyArrayNonEmpty(check.unknownChannels)) {
      return Effect.succeed(
        Option.some(new UnknownChannels({ channelIds: check.unknownChannels }))
      );
    }

    if (Arr.isReadonlyArrayNonEmpty(check.unknownMedia)) {
      return Effect.succeed(
        Option.some(new UnknownMedia({ mediaIds: check.unknownMedia }))
      );
    }

    if (Arr.isReadonlyArrayNonEmpty(violations)) {
      return Effect.succeed(
        Option.some(new PostContentInvalid({ violations }))
      );
    }

    if (Option.contains(check.schedule, "inPast")) {
      return Effect.succeed(Option.some(new ScheduleInPast()));
    }

    if (Option.isSome(check.planLimit)) {
      return limitReached(check.planLimit.value).pipe(
        Effect.flip,
        Effect.map((refusal): Option.Option<PostRefusal> =>
          Option.some(refusal)
        )
      );
    }

    return Effect.succeed(
      Arr.isReadonlyArrayNonEmpty(check.duplicates)
        ? Option.some(
            new DuplicatePost({
              duplicates: check.duplicates.map(({ channelId, postId }) => ({
                channelId,
                postId,
              })),
            })
          )
        : Option.none()
    );
  };
