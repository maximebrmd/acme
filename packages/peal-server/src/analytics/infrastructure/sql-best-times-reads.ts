import { DateTime, Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { BestTimesReads } from "#analytics/application/best-times-reads.ts";
import { DatabaseError } from "#shared/application/database-error.ts";

const decodePosts = Schema.decodeUnknownEffect(
  Schema.Array(
    Schema.Struct({
      likes: Schema.Int,
      publishedAt: Schema.DateTimeUtcFromDate,
      quotes: Schema.OptionFromNullOr(Schema.Int),
      replies: Schema.Int,
      reposts: Schema.Int,
    })
  )
);

/**
 * A channel's posts and their latest counts, in Postgres, on the index of
 * a workspace's posts by when they went live
 * (`tracked_posts_workspace_published`).
 */
export const SqlBestTimesReads = Layer.effect(
  BestTimesReads,
  Effect.gen(function* SqlBestTimesReads() {
    const client = yield* SqlClient.SqlClient;

    return BestTimesReads.of({
      channelPosts: (workspaceId, channelId, start, end) =>
        client`
          SELECT published_at AS "publishedAt", likes, reposts, replies, quotes
          FROM analytics.tracked_posts
          WHERE workspace_id = ${workspaceId}
            AND channel_id = ${channelId}
            AND published_at >= ${DateTime.toDateUtc(start)}
            AND published_at < ${DateTime.toDateUtc(end)}
            AND likes IS NOT NULL
            AND end_reason IS DISTINCT FROM 'unsupported'
            AND end_reason IS DISTINCT FROM 'removed'
          ORDER BY published_at
        `.pipe(
          Effect.mapError((cause) => new DatabaseError({ cause })),
          Effect.flatMap((rows) => decodePosts(rows).pipe(Effect.orDie)),
          Effect.withSpan("BestTimesReads.channelPosts")
        ),
    });
  })
);
