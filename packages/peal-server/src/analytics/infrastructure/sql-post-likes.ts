import { Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { PostLikes } from "#analytics/application/post-likes.ts";
import { DatabaseError } from "#shared/application/database-error.ts";

const decodeRows = Schema.decodeUnknownEffect(
  Schema.Array(Schema.Struct({ likes: Schema.Int, targetId: Schema.String }))
);

/**
 * The latest likes of tracked posts, in Postgres, by their key: posts that
 * were read (`last_collected_at`) and not removed from their platform.
 */
export const SqlPostLikes = Layer.effect(
  PostLikes,
  Effect.gen(function* SqlPostLikes() {
    const client = yield* SqlClient.SqlClient;

    return PostLikes.of({
      of: (targetIds) =>
        targetIds.length === 0
          ? Effect.succeed(new Map())
          : client`
              SELECT target_id AS "targetId", likes
              FROM analytics.tracked_posts
              WHERE target_id = ANY(string_to_array(${targetIds.join(",")}, ',')::uuid[])
                AND likes IS NOT NULL
                AND last_collected_at IS NOT NULL
                AND end_reason IS DISTINCT FROM 'removed'
            `.pipe(
              Effect.flatMap(decodeRows),
              Effect.map(
                (rows) =>
                  new Map(rows.map(({ likes, targetId }) => [targetId, likes]))
              ),
              Effect.mapError((cause) => new DatabaseError({ cause }))
            ),
    });
  })
);
