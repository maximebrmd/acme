import { Context, Schema } from "effect";
import type { DateTime, Effect } from "effect";

import type { PostTargetId } from "#publishing/domain/post-target-id.ts";
import type { PostId } from "#shared/domain/ids.ts";

/** The durable job that publishes one revision of a post. */
export const ExecutionIdSchema = Schema.NonEmptyString.pipe(
  Schema.brand("ExecutionId")
);

export type ExecutionId = typeof ExecutionIdSchema.Type;

export interface ScheduledPublication {
  readonly postId: PostId;
  readonly revision: number;
  readonly scheduledAt: DateTime.Utc;
}

/** A target sent again, in a new round. */
export interface RepostedTarget {
  readonly round: number;
  readonly targetId: PostTargetId;
}

/**
 * Starts and stops the durable jobs that publish posts. Starting the same
 * revision, or the same round of a target, twice returns the same job, so a
 * retried request starts one.
 */
export class PublicationScheduler extends Context.Service<
  PublicationScheduler,
  {
    /**
     * Starts the job that sleeps until `scheduledAt` and publishes the
     * post, if it still has `revision` then. Inside a transaction, the job
     * starts only once it commits.
     */
    readonly schedule: (
      publication: ScheduledPublication
    ) => Effect.Effect<ExecutionId>;
    /**
     * Starts the job that sends one round of a target at once, if the
     * target is still pending in that round then. Inside a transaction, the
     * job starts only once it commits.
     */
    readonly repost: (target: RepostedTarget) => Effect.Effect<void>;
    /**
     * Stops a sleeping job. A job that already woke runs on, and finds the
     * post changed: stopping it only frees it sooner.
     */
    readonly cancel: (executionId: ExecutionId) => Effect.Effect<void>;
  }
>()("peal-server/publishing/application/PublicationScheduler") {}
