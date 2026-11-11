import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  ChannelId,
  PostId,
  PostTargetId,
  UserId,
  WorkspaceId,
} from "#shared/domain/ids.ts";
import type { PlatformPostId } from "#shared/domain/publish-result.ts";

/**
 * A post that went live on a channel, with the id the platform gave it: a
 * post of several parts once all of them are live, as its first part.
 */
export interface PublishedTarget {
  /** The member who wrote the post; none for an API key's. */
  readonly authorId: Option.Option<UserId>;
  readonly channelId: ChannelId;
  readonly permalink: Option.Option<string>;
  readonly platformPostId: PlatformPostId;
  readonly postId: PostId;
  /**
   * When Peal knew it live, which the listing is ordered by: when it went
   * out, or, for a post whose last part a member confirmed by hand, when
   * they did.
   */
  readonly publishedAt: DateTime.Utc;
  readonly targetId: PostTargetId;
  readonly workspaceId: WorkspaceId;
}

/**
 * Where a listing of published targets starts: at `publishedAt`, or for
 * the targets published at that very instant, after `targetId` when given.
 */
export interface PublishedCursor {
  readonly publishedAt: DateTime.Utc;
  readonly targetId: Option.Option<PostTargetId>;
}

/**
 * The posts that went live, in the order they did (when, then target id),
 * for the contexts that follow them: analytics and the inbox. A target a
 * member confirmed by hand has no platform post id unless it is a post of
 * several parts whose first went out before: without one nothing can read
 * it back, and it is not listed. A target some of whose parts are live and
 * that failed, was cancelled or waits to be checked is not published: it
 * is listed once a repost, or a member, completes it. A target Peal
 * deleted from its platform (`removedAt`) is no longer listed: nothing is
 * there to read, promote or answer.
 */
export class PublishedTargets extends Context.Service<
  PublishedTargets,
  {
    /** At most `limit` targets published from `cursor` on. */
    readonly from: (
      cursor: PublishedCursor,
      limit: number
    ) => Effect.Effect<readonly PublishedTarget[], DatabaseError>;
    /** The channels a post of the workspace went live on, oldest first. */
    readonly ofPost: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<readonly PublishedTarget[], DatabaseError>;
    /**
     * The workspace's published targets the platforms know under these
     * ids, for the contexts that are handed a platform's id of a post and
     * ask whether it is one Peal published (an ad that promotes it).
     */
    readonly byPlatformPostIds: (
      workspaceId: WorkspaceId,
      platformPostIds: readonly string[]
    ) => Effect.Effect<readonly PublishedTarget[], DatabaseError>;
  }
>()("peal-server/publishing/application/PublishedTargets") {}
