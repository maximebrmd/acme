import { and, asc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";

import { PublishedTargets } from "#publishing/application/published-targets.ts";
import type {
  PublishedCursor,
  PublishedTarget,
} from "#publishing/application/published-targets.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { posts, postTargets } from "./schema.ts";

// A published target's row, as the domain would have written it.
const PublishedRowSchema = Schema.Struct({
  authorId: Schema.OptionFromNullOr(UserIdSchema),
  channelId: ChannelIdSchema,
  permalink: Schema.OptionFromNullOr(Schema.String),
  platformPostId: PlatformPostIdSchema,
  postId: PostIdSchema,
  publishedAt: Schema.DateTimeUtcFromDate,
  targetId: PostTargetIdSchema,
  workspaceId: WorkspaceIdSchema,
});

const decodeRows = Schema.decodeUnknownEffect(Schema.Array(PublishedRowSchema));

const failed = (cause: unknown) => new DatabaseError({ cause });

/** The published targets in the publishing schema, through Drizzle. */
export const DrizzlePublishedTargets = Layer.effect(
  PublishedTargets,
  Effect.gen(function* DrizzlePublishedTargets() {
    const db = yield* Drizzle;

    const from = Effect.fn("PublishedTargets.from")(function* from(
      cursor: PublishedCursor,
      limit: number
    ) {
      const since = DateTime.toDateUtc(cursor.publishedAt);

      const rows = yield* db
        .select({
          authorId: posts.authorId,
          channelId: postTargets.channelId,
          permalink: postTargets.permalink,
          platformPostId: postTargets.platformPostId,
          postId: postTargets.postId,
          publishedAt: postTargets.finishedAt,
          targetId: postTargets.id,
          workspaceId: posts.workspaceId,
        })
        .from(postTargets)
        .innerJoin(posts, eq(posts.id, postTargets.postId))
        .where(
          and(
            eq(postTargets.status, "published"),
            isNotNull(postTargets.platformPostId),
            // After a target: compared as a row, which the index's order
            // starts from, where an OR of the two columns scans it all.
            Option.match(cursor.targetId, {
              onNone: () => gte(postTargets.finishedAt, since),
              onSome: (targetId) =>
                sql`(${postTargets.finishedAt}, ${postTargets.id}) > (${since.toISOString()}::timestamptz, ${targetId}::uuid)`,
            })
          )
        )
        .orderBy(asc(postTargets.finishedAt), asc(postTargets.id))
        .limit(limit)
        .pipe(Effect.mapError(failed));

      const published: readonly PublishedTarget[] = yield* decodeRows(
        rows
      ).pipe(Effect.orDie);

      return published;
    });

    return PublishedTargets.of({ from });
  })
);
