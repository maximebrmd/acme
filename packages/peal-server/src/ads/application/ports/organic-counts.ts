import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { ChannelId, PostId, PostTargetId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

/**
 * What people did with a post on one channel without any ad, as analytics
 * last read it: none before the first read, or where the platform's counts
 * are not read. Impressions are none where the platform tells none, which
 * is not zero.
 */
export interface OrganicOnChannel {
  readonly channelId: ChannelId;
  readonly counts: Option.Option<{
    readonly impressions: Option.Option<number>;
    readonly likes: number;
    readonly readAt: DateTime.Utc;
    readonly replies: number;
    readonly reposts: number;
  }>;
  readonly targetId: PostTargetId;
}

/**
 * A post's organic counts, as the analytics context keeps them, for the
 * actor who may read analytics.
 */
export class OrganicCounts extends Context.Service<
  OrganicCounts,
  {
    readonly ofPost: (
      actor: Actor,
      postId: PostId
    ) => Effect.Effect<
      readonly OrganicOnChannel[],
      DatabaseError | MissingPermission
    >;
  }
>()("peal-server/ads/application/OrganicCounts") {}
