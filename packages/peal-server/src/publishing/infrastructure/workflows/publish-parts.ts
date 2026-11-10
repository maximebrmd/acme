import { DateTime, Duration, Effect, Match, Schema } from "effect";
import { ClusterSchema } from "effect/cluster";
import { Activity, DurableClock, Workflow } from "effect/workflow";

import {
  claimPartsRun,
  recordPartRun,
} from "#publishing/application/part-publication.ts";
import {
  publishAttemptRun,
  recordTargetRun,
} from "#publishing/application/post-publication.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import type { PostTargetId } from "#publishing/domain/post-target-id.ts";
import {
  PartRecordSchema,
  PartsClaimSchema,
  TargetOutcomeSchema,
} from "#publishing/domain/publication-claims.ts";
import type {
  PartsClaim,
  TargetOutcome,
} from "#publishing/domain/publication-claims.ts";
import { PublicationDecisionSchema } from "#publishing/domain/publication-policy.ts";
import type { TargetSettlement } from "#publishing/domain/target-settlement.ts";

import { retryingDatabase } from "./activity-retry.ts";

/**
 * Publishes one post on one channel, for one round, part by part: claims
 * the target with the parts left to send, then for each, in order, waits
 * as long as the part asks, makes attempts until one settles it, and
 * records it on the target once it is live. The first part that does not
 * go live ends the round: nothing is sent after a part that failed, whose
 * outcome is unknown, or once the post was cancelled. It then records how
 * the target ended.
 *
 * It replaces PublishTargetV1 for every job started since posts have parts;
 * a post of one part goes through it too, as a single part.
 *
 * Persisted contract (see `./publish-post.ts`): the tag, the payload, the
 * idempotency key, the activity names `claim-target`,
 * `publish/<part>/<n>`, `record-part/<part>` and `record-outcome`, the
 * clock names `delay/<part>` and `retry/<part>/<n>`, and every result
 * schema.
 */
export const PublishTargetV2 = Workflow.make("PublishTargetV2", {
  idempotencyKey: ({ round, targetId }) => `${targetId}:${round}`,
  payload: {
    // Absent from payloads written before it existed, which decode as 1.
    codeVersion: Schema.Int.pipe(Schema.withDecodingDefault(Effect.succeed(1))),
    round: Schema.Int,
    targetId: PostTargetIdSchema,
  },
  success: TargetOutcomeSchema,
});

type Claimed = Extract<PartsClaim, { readonly _tag: "claimed" }>;

interface Sending {
  readonly claim: Claimed;
  readonly round: number;
  readonly targetId: PostTargetId;
}

// One attempt at one part: its own activity, so a replay reads its decision
// back instead of calling the platform again.
const attemptAt = (
  { claim, round, targetId }: Sending,
  part: number,
  dueAt: DateTime.Utc,
  attempt: number
) =>
  Activity.make({
    execute: Effect.gen(function* publishAttempt() {
      // The same for every run of this attempt at this part of this job.
      const idempotencyKey = yield* Activity.idempotencyKey(
        `publish/${part}/${attempt}`
      );

      return yield* publishAttemptRun({
        attempt,
        channelId: claim.channelId,
        idempotencyKey,
        part,
        postId: claim.postId,
        round,
        scheduledAt: dueAt,
        targetId,
      }).pipe(retryingDatabase);
    }),
    name: `publish/${part}/${attempt}`,
    success: PublicationDecisionSchema,
  });

// Attempts the part, sleeping and trying again for as long as the policy
// says to retry: how the part ended.
const settlePart = Effect.fn("PublishTargetV2.settlePart")(function* settlePart(
  sending: Sending,
  part: number,
  dueAt: DateTime.Utc
) {
  let attempt = 1;
  let decision = yield* attemptAt(sending, part, dueAt, attempt);

  while (decision._tag === "retry") {
    yield* DurableClock.sleep({
      duration: decision.delay,
      inMemoryThreshold: Duration.zero,
      name: `retry/${part}/${attempt}`,
    });

    attempt += 1;
    decision = yield* attemptAt(sending, part, dueAt, attempt);
  }

  return decision.settlement;
});

// Sends the parts in order, and stops at the first that did not go live.
// The settlement is the last part's: published when every part is live.
const sendParts = Effect.fn("PublishTargetV2.sendParts")(function* sendParts(
  sending: Sending
) {
  const { claim, round, targetId } = sending;

  // When the part being sent was due: the round's start for the first, and
  // for the others the moment the part before went live, plus their wait.
  let dueAt = claim.scheduledAt;
  let last: TargetSettlement | undefined;

  for (const { delay, index } of claim.parts) {
    if (Duration.isGreaterThan(delay, Duration.zero)) {
      yield* DurableClock.sleep({
        duration: delay,
        inMemoryThreshold: Duration.zero,
        name: `delay/${index}`,
      });

      dueAt = DateTime.addDuration(dueAt, delay);
    }

    const settlement = yield* settlePart(sending, index, dueAt);

    last = settlement;

    if (settlement._tag !== "published") {
      return settlement;
    }

    const record = yield* Activity.make({
      execute: recordPartRun(targetId, round, index, settlement).pipe(
        retryingDatabase
      ),
      name: `record-part/${index}`,
      success: PartRecordSchema,
    }).annotate(ClusterSchema.WithTransaction, true);

    // Sent again in a later round meanwhile, or gone: that round's job, or
    // nobody, sends the rest.
    if (record._tag === "superseded") {
      return settlement;
    }

    dueAt = record.at;
  }

  // A target is claimed while a part is left to send: none is a bug.
  return last ?? (yield* Effect.die(`Target ${targetId} has no part to send`));
});

export const PublishTargetV2Live = PublishTargetV2.toLayer(
  Effect.fn("PublishTargetV2")(function* publishTarget({ round, targetId }) {
    const claim = yield* Activity.make({
      execute: claimPartsRun(targetId, round).pipe(retryingDatabase),
      name: "claim-target",
      success: PartsClaimSchema,
    }).annotate(ClusterSchema.WithTransaction, true);

    return yield* Match.valueTags(claim, {
      cancelled: () => Effect.succeed<TargetOutcome>("cancelled"),
      // Sends, then records how it ended.
      claimed: (claimed) =>
        sendParts({ claim: claimed, round, targetId }).pipe(
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
