import { Duration, Effect, Match, Schema } from "effect";
import { ClusterSchema } from "effect/cluster";
import { Activity, DurableClock, Workflow } from "effect/workflow";

import {
  claimTargetRun,
  publishAttemptRun,
  recordTargetRun,
} from "#publishing/application/post-publication.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import type { PostTargetId } from "#publishing/domain/post-target-id.ts";
import {
  TargetClaimSchema,
  TargetOutcomeSchema,
} from "#publishing/domain/publication-claims.ts";
import type {
  TargetClaim,
  TargetOutcome,
} from "#publishing/domain/publication-claims.ts";
import { PublicationDecisionSchema } from "#publishing/domain/publication-policy.ts";

import { retryingDatabase } from "./activity-retry.ts";

/**
 * Publishes one post on one channel, for one round: claims the target, makes
 * attempts until one settles it, and records how it ended.
 *
 * Persisted contract (see `./publish-post.ts`): the tag, the payload, the
 * idempotency key, the activity names `claim-target`, `publish/<n>` and
 * `record-outcome`, the clock names `retry/<n>`, and every result schema.
 */
export const PublishTargetV1 = Workflow.make("PublishTargetV1", {
  idempotencyKey: ({ round, targetId }) => `${targetId}:${round}`,
  payload: {
    // Absent from payloads written before it existed, which decode as 1.
    codeVersion: Schema.Int.pipe(Schema.withDecodingDefault(Effect.succeed(1))),
    round: Schema.Int,
    targetId: PostTargetIdSchema,
  },
  success: TargetOutcomeSchema,
});

type Claimed = Extract<TargetClaim, { readonly _tag: "claimed" }>;

// Attempt `attempt`, then sleep and attempt again for as long as the policy
// says to retry. Each attempt is its own activity, so a replay reads its
// decision back instead of calling the platform again.
const attemptFrom = (
  targetId: PostTargetId,
  round: number,
  claim: Claimed,
  attempt: number
) =>
  Activity.make({
    execute: Effect.gen(function* publishAttempt() {
      // The same for every run of this attempt of this job.
      const idempotencyKey = yield* Activity.idempotencyKey(
        `publish/${attempt}`
      );

      return yield* publishAttemptRun({
        attempt,
        channelId: claim.channelId,
        idempotencyKey,
        postId: claim.postId,
        round,
        scheduledAt: claim.scheduledAt,
        targetId,
      }).pipe(retryingDatabase);
    }),
    name: `publish/${attempt}`,
    success: PublicationDecisionSchema,
  });

const settle = Effect.fn("PublishTargetV1.settle")(function* settle(
  targetId: PostTargetId,
  round: number,
  claim: Claimed
) {
  let attempt = 1;
  let decision = yield* attemptFrom(targetId, round, claim, attempt);

  while (decision._tag === "retry") {
    yield* DurableClock.sleep({
      duration: decision.delay,
      inMemoryThreshold: Duration.zero,
      name: `retry/${attempt}`,
    });

    attempt += 1;
    decision = yield* attemptFrom(targetId, round, claim, attempt);
  }

  return decision.settlement;
});

export const PublishTargetV1Live = PublishTargetV1.toLayer(
  Effect.fn("PublishTargetV1")(function* publishTarget({ round, targetId }) {
    const claim = yield* Activity.make({
      execute: claimTargetRun(targetId, round).pipe(retryingDatabase),
      name: "claim-target",
      success: TargetClaimSchema,
    }).annotate(ClusterSchema.WithTransaction, true);

    return yield* Match.valueTags(claim, {
      cancelled: () => Effect.succeed<TargetOutcome>("cancelled"),
      // Sends, then records how it ended.
      claimed: (claimed) =>
        settle(targetId, round, claimed).pipe(
          Effect.flatMap((settlement) =>
            Activity.make({
              execute: recordTargetRun(targetId, round, settlement).pipe(
                retryingDatabase
              ),
              name: "record-outcome",
              success: TargetOutcomeSchema,
            }).annotate(ClusterSchema.WithTransaction, true)
          )
        ),
      settled: ({ outcome }) => Effect.succeed(outcome),
      superseded: () => Effect.succeed<TargetOutcome>("superseded"),
    });
  })
);
