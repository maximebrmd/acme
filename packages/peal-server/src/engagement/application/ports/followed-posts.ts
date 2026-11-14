import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { FollowedPost } from "#engagement/domain/thread.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  ChannelId,
  PostId,
  PostTargetId,
  WorkspaceId,
} from "#shared/domain/ids.ts";

/**
 * Where a listing of published posts starts: at `publishedAt`, or for
 * those published at that very instant, after `targetId` when given.
 */
export interface FollowCursor {
  readonly publishedAt: DateTime.Utc;
  readonly targetId: Option.Option<PostTargetId>;
}

/**
 * The posts that went live on their channels, from publishing, in the
 * order they did: those a platform gave an id for, under which comments
 * can be read. Posts made outside Peal will join them through this port.
 */
export class FollowedPosts extends Context.Service<
  FollowedPosts,
  {
    /**
     * The channels a post of the workspace is for, before it is out as
     * after: what a rule on the post may act on. None for another
     * workspace's.
     */
    readonly channelsOf: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<readonly ChannelId[], DatabaseError>;
    readonly from: (
      cursor: FollowCursor,
      limit: number
    ) => Effect.Effect<readonly FollowedPost[], DatabaseError>;
  }
>()("peal-server/engagement/application/FollowedPosts") {}
