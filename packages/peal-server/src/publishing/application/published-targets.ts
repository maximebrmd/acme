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

/** A post that went live on a channel, with the id the platform gave it. */
export interface PublishedTarget {
  /** The member who wrote the post; none for an API key's. */
  readonly authorId: Option.Option<UserId>;
  readonly channelId: ChannelId;
  readonly permalink: Option.Option<string>;
  readonly platformPostId: PlatformPostId;
  readonly postId: PostId;
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
 * for the contexts that follow them, such as analytics. A target the member
 * confirmed by hand has no platform post id, so nothing can read it back:
 * it is not listed.
 */
export class PublishedTargets extends Context.Service<
  PublishedTargets,
  {
    /** At most `limit` targets published from `cursor` on. */
    readonly from: (
      cursor: PublishedCursor,
      limit: number
    ) => Effect.Effect<readonly PublishedTarget[], DatabaseError>;
  }
>()("peal-server/publishing/application/PublishedTargets") {}
