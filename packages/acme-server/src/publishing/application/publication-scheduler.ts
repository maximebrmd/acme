import { Context, Schema } from "effect";
import type { DateTime, Effect } from "effect";

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

/**
 * Starts and stops the durable jobs that publish posts. Starting the same
 * revision twice returns the same job, so a retried request starts one.
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
     * Stops a sleeping job. A job that already woke runs on, and finds the
     * post changed: stopping it only frees it sooner.
     */
    readonly cancel: (executionId: ExecutionId) => Effect.Effect<void>;
  }
>()("acme-server/publishing/application/PublicationScheduler") {}
