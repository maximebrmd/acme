import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { TrackedPost } from "#analytics/domain/tracked-post.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId, PostTargetId } from "#shared/domain/ids.ts";

/** The post followed that went live last, and when. */
export interface LatestPublication {
  readonly publishedAt: DateTime.Utc;
  readonly targetId: PostTargetId;
}

/** A channel with posts due, and since when its first one is. */
export interface DueChannel {
  readonly channelId: ChannelId;
  readonly dueSince: DateTime.Utc;
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
     * Starts following these posts; one already followed stays as it is,
     * and one of a workspace erased since it was listed is passed over.
     * Answers how many were new.
     */
    readonly track: (
      posts: readonly TrackedPost[]
    ) => Effect.Effect<number, DatabaseError>;
    /**
     * `limit` of the channels with posts due to be read by `at`, the one
     * whose post has been due longest first, after `after`: a run takes
     * them a page at a time, each channel once, so the channels that waited
     * longest are read first, and a run cut short leaves the others, which
     * come first at the next.
     */
    readonly dueChannels: (
      at: DateTime.Utc,
      limit: number,
      after: Option.Option<DueChannel>
    ) => Effect.Effect<readonly DueChannel[], DatabaseError>;
    /**
     * The posts of these channels due to be read by `at`, each channel's
     * in the order they came due, `perChannel` at most.
     */
    readonly dueOn: (
      at: DateTime.Utc,
      channelIds: readonly ChannelId[],
      perChannel: number
    ) => Effect.Effect<readonly TrackedPost[], DatabaseError>;
    /** How many posts are due to be read by `at`. */
    readonly countDue: (
      at: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
    /**
     * Saves the posts with the counts just read, each kept as a snapshot,
     * in one transaction and one statement per table, however many.
     */
    readonly saveReadings: (
      posts: readonly TrackedPost[]
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Saves when the posts are read next, or that they are not any more,
     * in one statement.
     */
    readonly saveSchedules: (
      posts: readonly TrackedPost[]
    ) => Effect.Effect<void, DatabaseError>;
    /** `saveReadings` for one post. */
    readonly saveReading: (
      post: TrackedPost
    ) => Effect.Effect<void, DatabaseError>;
    /** `saveSchedules` for one post. */
    readonly saveSchedule: (
      post: TrackedPost
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/analytics/application/TrackedPosts") {}
