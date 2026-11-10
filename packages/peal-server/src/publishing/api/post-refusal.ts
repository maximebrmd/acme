import { Array as Arr, Effect, Match, Option } from "effect";
import {
  DuplicatePost,
  Forbidden,
  IdempotencyKeyReused,
  PostContentInvalid,
  PostNotFound,
  ScheduleInPast,
  UnknownChannels,
  UnknownMedia,
} from "peal-contract";
import type { CurrentMember, PostRefusal } from "peal-contract";

import type { SendRefusal } from "#publishing/application/post-batches.ts";
import type { PostCheck } from "#publishing/application/post-checks.ts";
import type { LimitRefusal } from "#shared/api/limit-reached.ts";

// One post of several is answered what `send` would have answered for it
// alone, as data: the same errors, with the same fields.

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
      MissingPermission: () => Effect.succeed<PostRefusal>(new Forbidden()),
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
