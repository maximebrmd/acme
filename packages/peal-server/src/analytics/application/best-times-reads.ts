import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";

/** A post of a channel with its latest counts, as best times weigh it. */
export interface CountedPost {
  readonly likes: number;
  readonly publishedAt: DateTime.Utc;
  readonly quotes: Option.Option<number>;
  readonly replies: number;
  readonly reposts: number;
}

/** What best times read: a channel's posts and their latest counts. */
export class BestTimesReads extends Context.Service<
  BestTimesReads,
  {
    /**
     * The channel's posts published from `start` to `end`, excluded, that
     * were read at least once: none Peal deleted from the platform, nor
     * one on a platform it reads no counts on.
     */
    readonly channelPosts: (
      workspaceId: WorkspaceId,
      channelId: ChannelId,
      start: DateTime.Utc,
      end: DateTime.Utc
    ) => Effect.Effect<readonly CountedPost[], DatabaseError>;
  }
>()("peal-server/analytics/application/BestTimesReads") {}
