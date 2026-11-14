import { Context, Effect, Layer } from "effect";

import type { FollowUpId } from "#publishing/domain/follow-up-id.ts";

/**
 * Starts the durable job that carries out a follow-up. Inside a
 * TransactionRunner transaction the start commits, or rolls back, with
 * the follow-up's state, and the job runs after the commit.
 */
export class FollowUpJobs extends Context.Service<
  FollowUpJobs,
  {
    readonly start: (followUpId: FollowUpId) => Effect.Effect<void>;
    /**
     * Stops the follow-up's job for good: in a transaction, with what
     * hands it over, so the job cannot wake after. A job that has ended
     * is left as it is.
     */
    readonly cancel: (followUpId: FollowUpId) => Effect.Effect<void>;
  }
>()("peal-server/publishing/application/FollowUpJobs") {
  /** For tests that send nothing: no job starts. */
  static readonly none = Layer.succeed(
    FollowUpJobs,
    FollowUpJobs.of({ cancel: () => Effect.void, start: () => Effect.void })
  );
}
