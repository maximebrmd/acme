import { DateTime, Effect, Layer, Ref } from "effect";

import { FollowUpCounts } from "#publishing/application/follow-up-counts.ts";
import { FollowUpNotices } from "#publishing/application/follow-up-notices.ts";
import { FollowUpPublisher } from "#publishing/application/follow-up-publisher.ts";
import type { FollowUpRequest } from "#publishing/application/follow-up-publisher.ts";
import { notSentReasonsOf } from "#publishing/domain/follow-up.ts";
import type { FollowUpNotSentReason } from "#publishing/domain/follow-up.ts";
import type { PostTargetId } from "#publishing/domain/post-target-id.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import type { PublishResult } from "#shared/domain/publish-result.ts";

// The likes analytics counted, as a test sets them, and the follow-ups a
// gate carried out, as a fake platform answers them. The state is the
// module's: tests that use it run one at a time, and reset it first.

const likes = Ref.makeUnsafe<ReadonlyMap<PostTargetId, number>>(new Map());

const calls = Ref.makeUnsafe<readonly FollowUpRequest[]>([]);

type Answer = (
  request: FollowUpRequest
) => Effect.Effect<PublishResult, PublishFailure>;

const published: Answer = (request) =>
  Effect.succeed({
    _tag: "published",
    platformPostId: PlatformPostIdSchema.make(
      `follow-up-${request.followUpId}`
    ),
  });

const answer = Ref.makeUnsafe<Answer>(published);

/** What members would be told of a rule, as the notices would key it. */
export type ToldFollowUp =
  | {
      readonly _tag: "notSent";
      readonly count: number;
      readonly key: string;
      readonly reasons: readonly FollowUpNotSentReason[];
      readonly ruleId: string;
    }
  | {
      readonly _tag: "stopped";
      readonly key: string;
      readonly reason: string;
      readonly ruleId: string;
    };

const told = Ref.makeUnsafe<readonly ToldFollowUp[]>([]);

/** No target has likes, no follow-up was carried out, each is published. */
export const resetFollowUps = Effect.all([
  Ref.set(likes, new Map()),
  Ref.set(calls, []),
  Ref.set(answer, published),
  Ref.set(told, []),
]);

/** What members were told of follow-up rules so far, in order. */
export const toldFollowUps = Ref.get(told);

/** The target has `count` likes, as analytics last counted them. */
export const likesOf = (targetId: PostTargetId, count: number) =>
  Ref.update(likes, (counted) => new Map([...counted, [targetId, count]]));

/** How the platform answers each follow-up from now on. */
export const followUpsAnswer = (next: Answer) => Ref.set(answer, next);

/** The follow-ups carried out so far, in order. */
export const followUpCalls = Ref.get(calls);

/** Likes as the test sets them. */
export const FakeFollowUpCounts = Layer.succeed(
  FollowUpCounts,
  FollowUpCounts.of({
    likesOf: (targetIds) =>
      Ref.get(likes).pipe(
        Effect.map(
          (counted) =>
            new Map(
              targetIds.flatMap((id): [PostTargetId, number][] => {
                const count = counted.get(id);

                return count === undefined ? [] : [[id, count]];
              })
            )
        )
      ),
  })
);

/** A gate's side that records each call and answers as the test says. */
export const FakeFollowUpPublisher = Layer.succeed(
  FollowUpPublisher,
  FollowUpPublisher.of({
    resume: (request) =>
      Ref.update(calls, (made) => [...made, request]).pipe(
        Effect.andThen(Ref.get(answer)),
        Effect.flatMap((respond) => respond(request))
      ),
    send: (request) =>
      Ref.update(calls, (made) => [...made, request]).pipe(
        Effect.andThen(Ref.get(answer)),
        Effect.flatMap((respond) => respond(request))
      ),
  })
);

/** Records what `NotifiedFollowUpNotices` would tell, keyed as it keys it. */
export const FakeFollowUpNotices = Layer.succeed(
  FollowUpNotices,
  FollowUpNotices.of({
    notSent: (rule, followUps, now) =>
      Ref.update(told, (so): readonly ToldFollowUp[] => [
        ...so,
        {
          _tag: "notSent",
          count: followUps.length,
          key: `follow-ups-not-sent:${rule.id}:${DateTime.formatIso(now).slice(0, 10)}`,
          reasons: notSentReasonsOf(followUps),
          ruleId: rule.id,
        },
      ]),
    stopped: (rule, reason) =>
      Ref.update(told, (so): readonly ToldFollowUp[] => [
        ...so,
        {
          _tag: "stopped",
          key: `follow-up-rule:${rule.id}:stopped`,
          reason,
          ruleId: rule.id,
        },
      ]),
  })
);
