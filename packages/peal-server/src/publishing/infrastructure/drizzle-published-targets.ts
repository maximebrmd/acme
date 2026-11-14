import {
  and,
  asc,
  eq,
  gte,
  inArray,
  isNotNull,
  notInArray,
  isNull,
  sql,
} from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";

import { PublishedTargets } from "#publishing/application/published-targets.ts";
import type {
  PublishedCursor,
  PublishedTarget,
} from "#publishing/application/published-targets.ts";
import { PostFormatSchema } from "#publishing/domain/post-format.ts";
import type { PostFormat } from "#publishing/domain/post-format.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { posts, postTargets } from "./schema.ts";

// A published target's row, as the domain would have written it.
const PublishedRowSchema = Schema.Struct({
  authorId: Schema.OptionFromNullOr(UserIdSchema),
  channelId: ChannelIdSchema,
  // The name its options give, `feed` for a feed post (`formatColumn`).
  format: Schema.String,
  permalink: Schema.OptionFromNullOr(Schema.String),
  platformPostId: PlatformPostIdSchema,
  postId: PostIdSchema,
  publishedAt: Schema.DateTimeUtcFromDate,
  targetId: PostTargetIdSchema,
  workspaceId: WorkspaceIdSchema,
});

const decodeRows = Schema.decodeUnknownEffect(Schema.Array(PublishedRowSchema));

const isFormat = Schema.is(PostFormatSchema);

// Rows as targets: a format that is no post format (`feed`) is none.
const publishedOf = (
  rows: readonly (typeof PublishedRowSchema.Type)[]
): readonly PublishedTarget[] =>
  rows.map((row) => ({
    ...row,
    format: Option.some(row.format).pipe(Option.filter(isFormat)),
  }));

// The format the target's options name; a feed post's when they name none.
const formatColumn = sql<string>`coalesce(${postTargets.options}->>'format', 'feed')`;

const failed = (cause: unknown) => new DatabaseError({ cause });

// The first part's id and address: a published target's own, or, for a
// target of first comments whose comment did not go out, its first live
// part's (`live_parts`, whose options are encoded as tagged values).
const platformPostIdColumn = sql<
  string | null
>`coalesce(${postTargets.platformPostId}, ${postTargets.liveParts}->0->'platformPostId'->>'value')`;

const permalinkColumn = sql<
  string | null
>`coalesce(${postTargets.permalink}, ${postTargets.liveParts}->0->'permalink'->>'value')`;

// Listed: published, or a target of first comments whose post is live,
// whatever became of its comment.
const listed = sql`(${postTargets.status} = 'published' OR (${postTargets.firstComment} AND jsonb_array_length(${postTargets.liveParts}) > 0))`;

const columns = {
  authorId: posts.authorId,
  channelId: postTargets.channelId,
  format: formatColumn,
  permalink: permalinkColumn,
  platformPostId: platformPostIdColumn,
  postId: postTargets.postId,
  publishedAt: postTargets.listedAt,
  targetId: postTargets.id,
  workspaceId: posts.workspaceId,
};

/** The published targets in the publishing schema, through Drizzle. */
export const DrizzlePublishedTargets = Layer.effect(
  PublishedTargets,
  Effect.gen(function* DrizzlePublishedTargets() {
    const db = yield* Drizzle;

    const from = Effect.fn("PublishedTargets.from")(function* from(
      cursor: PublishedCursor,
      limit: number,
      without: readonly PostFormat[] = []
    ) {
      const since = DateTime.toDateUtc(cursor.publishedAt);

      const rows = yield* db
        .select(columns)
        .from(postTargets)
        .innerJoin(posts, eq(posts.id, postTargets.postId))
        .where(
          and(
            listed,
            isNotNull(platformPostIdColumn),
            isNotNull(postTargets.listedAt),
            isNull(postTargets.removedAt),
            without.length === 0
              ? undefined
              : notInArray(formatColumn, [...without]),
            // After a target: compared as a row, which the index's order
            // starts from, where an OR of the two columns scans it all.
            Option.match(cursor.targetId, {
              onNone: () => gte(postTargets.listedAt, since),
              onSome: (targetId) =>
                sql`(${postTargets.listedAt}, ${postTargets.id}) > (${since.toISOString()}::timestamptz, ${targetId}::uuid)`,
            })
          )
        )
        .orderBy(asc(postTargets.listedAt), asc(postTargets.id))
        .limit(limit)
        .pipe(Effect.mapError(failed));

      return publishedOf(yield* decodeRows(rows).pipe(Effect.orDie));
    });

    // The published targets of one workspace that `where` keeps.
    const within = Effect.fn("PublishedTargets.within")(function* within(
      workspaceId: WorkspaceId,
      where: SQL | undefined
    ) {
      const rows = yield* db
        .select(columns)
        .from(postTargets)
        .innerJoin(posts, eq(posts.id, postTargets.postId))
        .where(
          and(
            eq(posts.workspaceId, workspaceId),
            listed,
            isNotNull(platformPostIdColumn),
            isNotNull(postTargets.listedAt),
            isNull(postTargets.removedAt),
            where
          )
        )
        .orderBy(asc(postTargets.listedAt), asc(postTargets.id))
        .pipe(Effect.mapError(failed));

      return publishedOf(yield* decodeRows(rows).pipe(Effect.orDie));
    });

    return PublishedTargets.of({
      byPlatformPostIds: (workspaceId, platformPostIds) =>
        platformPostIds.length === 0
          ? Effect.succeed([])
          : within(
              workspaceId,
              inArray(platformPostIdColumn, [...platformPostIds])
            ),
      channelsOf: (workspaceId, postId) =>
        db
          .selectDistinct({ channelId: postTargets.channelId })
          .from(postTargets)
          .innerJoin(posts, eq(posts.id, postTargets.postId))
          .where(
            and(
              eq(posts.workspaceId, workspaceId),
              eq(postTargets.postId, postId),
              isNull(postTargets.removedAt)
            )
          )
          .orderBy(asc(postTargets.channelId))
          .pipe(
            Effect.map((rows) =>
              rows.map(({ channelId }) => ChannelIdSchema.make(channelId))
            ),
            Effect.mapError(failed)
          ),
      from,
      ofPost: (workspaceId, postId) =>
        within(workspaceId, eq(postTargets.postId, postId)),
    });
  })
);
