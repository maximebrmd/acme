import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { ChannelSetId } from "#publishing/domain/channel-set-id.ts";
import type { FeedId } from "#publishing/domain/feed-id.ts";
import type {
  FeedItemOutcome,
  FeedItemReason,
  FeedPictureSkip,
} from "#publishing/domain/feed-item-outcome.ts";
import type { Feed } from "#publishing/domain/feed.ts";
import type { ItemDigest } from "#publishing/domain/item-digest.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { PostId, WorkspaceId } from "#shared/domain/ids.ts";

/** Where a page of due feeds starts: after this feed, in their order. */
export interface DueFeedPosition {
  readonly id: FeedId;
  readonly nextCheckAt: DateTime.Utc;
}

/** What became of an item, as a feed keeps it: never its text. */
export interface FeedItemRecord {
  readonly digest: ItemDigest;
  readonly itemAt: Option.Option<DateTime.Utc>;
  readonly outcome: FeedItemOutcome;
  /** Why its picture was not attached, when one was asked for. */
  readonly pictureSkipped: Option.Option<FeedPictureSkip>;
  readonly postId: Option.Option<PostId>;
  readonly reason: Option.Option<FeedItemReason>;
  readonly seenAt: DateTime.Utc;
}

/** A workspace's feeds and what they read, as they are kept. */
export class FeedStore extends Context.Service<
  FeedStore,
  {
    /**
     * Holds back, until the transaction it runs in ends, any other
     * transaction that claims the workspace's feeds: counting them, then
     * adding one, takes turns.
     */
    readonly claim: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    readonly count: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<number, DatabaseError>;
    readonly insert: (feed: Feed) => Effect.Effect<void, DatabaseError>;
    /** Writes everything of a feed but what started it. */
    readonly update: (feed: Feed) => Effect.Effect<void, DatabaseError>;
    readonly byId: (
      workspaceId: WorkspaceId,
      feedId: FeedId
    ) => Effect.Effect<Option.Option<Feed>, DatabaseError>;
    /** The feed, its row locked until the transaction ends. */
    readonly lock: (
      workspaceId: WorkspaceId,
      feedId: FeedId
    ) => Effect.Effect<Option.Option<Feed>, DatabaseError>;
    /**
     * The feed, its row locked until the transaction ends, or none when
     * another transaction holds it (`FOR UPDATE SKIP LOCKED`).
     */
    readonly lockUnlessHeld: (
      feedId: FeedId
    ) => Effect.Effect<Option.Option<Feed>, DatabaseError>;
    /** Deletes the feed and its items; says whether it was there. */
    readonly remove: (
      workspaceId: WorkspaceId,
      feedId: FeedId
    ) => Effect.Effect<boolean, DatabaseError>;
    /** A page of the workspace's feeds, oldest first, after a feed. */
    readonly list: (
      workspaceId: WorkspaceId,
      after: Option.Option<FeedId>,
      limit: number
    ) => Effect.Effect<readonly Feed[], DatabaseError>;
    /**
     * Active feeds of every workspace due by `now`, by when they are due
     * then id, after `after`: `limit` at most.
     */
    readonly due: (
      now: DateTime.Utc,
      after: Option.Option<DueFeedPosition>,
      limit: number
    ) => Effect.Effect<readonly Feed[], DatabaseError>;
    /** How many active feeds were due before `before`. */
    readonly overdue: (
      before: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
    /** Stops naming a channel set deleted: no feed goes on naming it. */
    readonly forgetChannelSet: (
      workspaceId: WorkspaceId,
      setId: ChannelSetId
    ) => Effect.Effect<void, DatabaseError>;
    /** Which of these digests the feed has kept. */
    readonly seen: (
      feedId: FeedId,
      digests: readonly ItemDigest[]
    ) => Effect.Effect<ReadonlySet<ItemDigest>, DatabaseError>;
    /** How many items the feed made a post of since `since`. */
    readonly madeSince: (
      feedId: FeedId,
      since: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
    /**
     * Keeps items the feed had not kept; those it had stay as they were.
     * Answers the digests it kept now.
     */
    readonly record: (
      feedId: FeedId,
      items: readonly FeedItemRecord[]
    ) => Effect.Effect<ReadonlySet<ItemDigest>, DatabaseError>;
    /** Writes what became of an item the feed kept. */
    readonly settle: (
      feedId: FeedId,
      digest: ItemDigest,
      outcome: FeedItemOutcome,
      reason: Option.Option<FeedItemReason>,
      postId: Option.Option<PostId>
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Marks the digests a read listed as listed at `at`: retention keeps
     * every item the latest read listed.
     */
    readonly listed: (
      feedId: FeedId,
      digests: readonly ItemDigest[],
      at: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Keeps each feed's `kept` items a read listed last, and every one its
     * latest read listed; deletes the rest and says how many.
     */
    readonly prune: (kept: number) => Effect.Effect<number, DatabaseError>;
    /** Writes why an item's picture was not attached to its post. */
    readonly skipPicture: (
      feedId: FeedId,
      digest: ItemDigest,
      reason: FeedPictureSkip
    ) => Effect.Effect<void, DatabaseError>;
    /** The feed's items still `claimed`: their post's send not settled. */
    readonly claimed: (
      feedId: FeedId
    ) => Effect.Effect<readonly FeedItemRecord[], DatabaseError>;
    /** The feed's newest items, newest first. */
    readonly items: (
      feedId: FeedId,
      limit: number
    ) => Effect.Effect<readonly FeedItemRecord[], DatabaseError>;
  }
>()("peal-server/publishing/application/FeedStore") {}
