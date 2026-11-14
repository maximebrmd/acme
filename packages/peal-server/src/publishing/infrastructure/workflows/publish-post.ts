import { Effect, Match, Schema } from "effect";
import { ClusterSchema } from "effect/cluster";
import { Activity, Workflow } from "effect/workflow";

import {
  claimPostRun,
  completePostRun,
} from "#publishing/application/post-publication.ts";
import { PostOutcomeSchema } from "#publishing/domain/post-status.ts";
import {
  PostClaimSchema,
  PostRunOutcomeSchema,
} from "#publishing/domain/publication-claims.ts";
import type { PostRunOutcome } from "#publishing/domain/publication-claims.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";

import { retryingDatabase } from "./activity-retry.ts";
import { PublishTargetV2 } from "./publish-parts.ts";
import { PublishTargetV1 } from "./publish-target.ts";
import { sleepUntil } from "./sleep-until.ts";

// Persisted contract. Executions sleep for as long as posts wait, often weeks,
// and replay from their stored history with the code deployed when they wake.
// Freeze, for every released version: the workflow tags; the payload schemas
// (a payload that no longer decodes ends its execution); the idempotency keys;
// the activity names and their result schemas; the clock names. Add payload
// fields with a decoding default, and union members, but never rename or
// remove one. Branch on `codeVersion` to change the steps of executions
// started later; for anything else, add PublishPostV2 beside this one and
// remove V1 once no execution of it is left (test/publishing/infrastructure
// holds the fixtures that check this).

/** Every workflow tag released, which the server must keep registering. */
export const persistedWorkflowTags = [
  "PublishPostV1",
  "PublishTargetV1",
  "PublishTargetV2",
  "ChangeLivePostV1",
  "PublishArticleV1",
];

/**
 * The version of the steps a post's job runs, which `codeVersion` carries:
 * 1 ran one PublishTargetV1 per channel; 2 runs one PublishTargetV2, which
 * sends a post part by part. Jobs are started with the latest.
 */
export const postJobVersion = 2;

/**
 * Publishes one revision of a post: sleeps until its time, claims it, then
 * runs one target job per channel (PublishTargetV2; PublishTargetV1 for an
 * execution started with `codeVersion` 1, whose history may already hold
 * its children) and finishes the post with what they add up to. It stays
 * small, as executions wait in it for weeks.
 */
export const PublishPostV1 = Workflow.make("PublishPostV1", {
  idempotencyKey: ({ postId, revision }) => `${postId}:${revision}`,
  payload: {
    // Absent from payloads written before it existed, which decode as 1.
    codeVersion: Schema.Int.pipe(Schema.withDecodingDefault(Effect.succeed(1))),
    postId: PostIdSchema,
    revision: Schema.Int,
    scheduledAt: Schema.DateTimeUtc,
  },
  success: PostRunOutcomeSchema,
});

export const PublishPostV1Live = PublishPostV1.toLayer(
  Effect.fn("PublishPostV1")(function* publishPost({
    codeVersion,
    postId,
    revision,
    scheduledAt,
  }) {
    yield* sleepUntil("publish-at", scheduledAt);

    // Compares the revision and checks lateness in one transaction, recorded
    // once: replays read the claim back instead of reading the post again.
    const claim = yield* Activity.make({
      execute: claimPostRun(postId, revision).pipe(retryingDatabase),
      name: "claim-post",
      success: PostClaimSchema,
    }).annotate(ClusterSchema.WithTransaction, true);

    return yield* Match.valueTags(claim, {
      cancelled: () => Effect.succeed<PostRunOutcome>("cancelled"),
      // Every child settles its target before the post finishes. Which
      // child is the execution's own choice, made when it was started: a
      // replay must start the children its history already holds.
      claimed: ({ targets }) =>
        Effect.forEach(
          targets,
          ({ round, targetId }) =>
            codeVersion >= postJobVersion
              ? PublishTargetV2.execute({ codeVersion: 1, round, targetId })
              : PublishTargetV1.execute({ codeVersion: 1, round, targetId }),
          { concurrency: "unbounded", discard: true }
        ).pipe(
          Effect.andThen(
            Activity.make({
              execute: completePostRun(postId).pipe(retryingDatabase),
              name: "complete-post",
              success: PostOutcomeSchema,
            }).annotate(ClusterSchema.WithTransaction, true)
          )
        ),
      // Its targets were marked missed and the post failed.
      missed: () => Effect.succeed<PostRunOutcome>("failed"),
      superseded: () => Effect.succeed<PostRunOutcome>("superseded"),
    });
  })
);
