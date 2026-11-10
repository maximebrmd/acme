import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  ChannelId,
  PostId,
  PostTargetId,
  WorkspaceId,
} from "#shared/domain/ids.ts";

/**
 * A post the workspace published on a channel, as far as ads need it: the
 * platform's id of the post, and the account that published it.
 */
export interface PublishedOn {
  /** The channel's account at its platform: a Page, an Instagram account. */
  readonly accountId: string;
  readonly channelId: ChannelId;
  /** The way in the channel came through, on platforms with several. */
  readonly connection: Option.Option<string>;
  readonly permalink: Option.Option<string>;
  readonly platform: string;
  readonly platformPostId: string;
  readonly postId: PostId;
  readonly publishedAt: DateTime.Utc;
  readonly targetId: PostTargetId;
}

/**
 * The workspace's published posts, as publishing and the channels context
 * know them: what a boost promotes, and what an ad made elsewhere is
 * matched with.
 */
export class PromotablePosts extends Context.Service<
  PromotablePosts,
  {
    /** Where a post of the workspace went live, oldest first. */
    readonly ofPost: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<readonly PublishedOn[], DatabaseError>;
    /**
     * The workspace's published posts the platforms know under these ids,
     * by that id.
     */
    readonly matching: (
      workspaceId: WorkspaceId,
      platformPostIds: readonly string[]
    ) => Effect.Effect<
      ReadonlyMap<
        string,
        { readonly postId: PostId; readonly targetId: PostTargetId }
      >,
      DatabaseError
    >;
  }
>()("peal-server/ads/application/PromotablePosts") {}
