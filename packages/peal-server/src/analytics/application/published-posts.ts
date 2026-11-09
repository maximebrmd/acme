import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { Publication } from "#analytics/domain/tracked-post.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { PostTargetId } from "#shared/domain/ids.ts";

/**
 * Where a listing of publications starts: at `publishedAt`, or for those
 * published at that very instant, after `targetId` when given.
 */
export interface PublicationCursor {
  readonly publishedAt: DateTime.Utc;
  readonly targetId: Option.Option<PostTargetId>;
}

/**
 * The posts that went live on their channels, from publishing, in the
 * order they did: those a platform gave an id for, which can be read back.
 */
export class PublishedPosts extends Context.Service<
  PublishedPosts,
  {
    readonly from: (
      cursor: PublicationCursor,
      limit: number
    ) => Effect.Effect<readonly Publication[], DatabaseError>;
  }
>()("acme-server/analytics/application/PublishedPosts") {}
