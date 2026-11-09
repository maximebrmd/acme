import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { TrackedPost } from "#analytics/domain/tracked-post.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { PostTargetId } from "#shared/domain/ids.ts";

/** The post followed that went live last, and when. */
export interface LatestPublication {
  readonly publishedAt: DateTime.Utc;
  readonly targetId: PostTargetId;
}

/**
 * The posts analytics follows, and the counts read on each. A post's
 * readings are kept with the time they were read: its snapshots.
 */
export class TrackedPosts extends Context.Service<
  TrackedPosts,
  {
    /**
     * The post followed that went live last, by `before`: one that went
     * live later can only come from a clock that ran ahead.
     */
    readonly latestPublication: (
      before: DateTime.Utc
    ) => Effect.Effect<Option.Option<LatestPublication>, DatabaseError>;
    /**
     * Starts following these posts; one already followed stays as it is.
     * Answers how many were new.
     */
    readonly track: (
      posts: readonly TrackedPost[]
    ) => Effect.Effect<number, DatabaseError>;
    /** The posts due to be read by `at`, the longest due first. */
    readonly due: (
      at: DateTime.Utc,
      limit: number
    ) => Effect.Effect<readonly TrackedPost[], DatabaseError>;
    /** Saves the post with the counts just read, kept as a snapshot. */
    readonly saveReading: (
      post: TrackedPost
    ) => Effect.Effect<void, DatabaseError>;
    /** Saves when the post is read next, or that it is not any more. */
    readonly saveSchedule: (
      post: TrackedPost
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("acme-server/analytics/application/TrackedPosts") {}
