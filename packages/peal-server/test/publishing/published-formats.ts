import { DateTime, Effect } from "effect";
import { SqlClient } from "effect/sql";

import { newId } from "#shared/application/ids.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
} from "#shared/domain/ids.ts";
import type { PostId, PostTargetId, WorkspaceId } from "#shared/domain/ids.ts";
import { freshWorkspace } from "#test/channels/support.ts";

// Published targets of each post format, written in Postgres as publishing
// writes them, for the contexts that read what publishing lists: three
// stories, then a feed post, then a reel, a minute apart from `day` at
// 10:00. Each context's suite takes a day no other suite uses.

/** What `publishedFormats` wrote. */
export interface PublishedFormats {
  readonly feed: PostTargetId;
  readonly platformPostIds: {
    readonly feed: string;
    readonly reel: string;
    readonly stories: readonly string[];
  };
  readonly postId: PostId;
  readonly reel: PostTargetId;
  readonly since: DateTime.Utc;
  readonly stories: readonly PostTargetId[];
  readonly workspaceId: WorkspaceId;
}

export const publishedFormats = Effect.fn("test.publishedFormats")(
  function* publishedFormats(day: string, idPrefix: string) {
    const sql = yield* SqlClient.SqlClient;
    const workspaceId = yield* freshWorkspace;
    const postId = yield* newId(PostIdSchema);

    yield* sql`INSERT INTO publishing.posts (id, workspace_id, status, text) VALUES (${postId}, ${workspaceId}, 'finished', 'A synthetic post')`;

    const rows = [
      ...[0, 1, 2].map((index) => ({
        options: '{"format":"story","platform":"instagram"}',
        platformPostId: `${idPrefix}${index}`,
      })),
      {
        options: '{"format":"feed","platform":"instagram"}',
        platformPostId: `${idPrefix}7`,
      },
      {
        options: '{"format":"reel","platform":"facebook"}',
        platformPostId: `${idPrefix}8`,
      },
    ];

    const ids: PostTargetId[] = [];

    for (const [index, row] of rows.entries()) {
      const targetId = yield* newId(PostTargetIdSchema);
      const channelId = yield* newId(ChannelIdSchema);

      const at = DateTime.makeUnsafe(
        `${day}T10:0${String(index)}:00.000Z`
      ).pipe(DateTime.toDateUtc);

      yield* sql`INSERT INTO publishing.post_targets (id, post_id, channel_id, status, finished_at, listed_at, platform_post_id, options) VALUES (${targetId}, ${postId}, ${channelId}, 'published', ${at}, ${at}, ${row.platformPostId}, ${row.options}::jsonb)`;

      ids.push(targetId);
    }

    const [first, second, third, feed, reel] = ids;

    if (
      first === undefined ||
      second === undefined ||
      third === undefined ||
      feed === undefined ||
      reel === undefined
    ) {
      return yield* Effect.die("The targets were not written");
    }

    const written: PublishedFormats = {
      feed,
      platformPostIds: {
        feed: `${idPrefix}7`,
        reel: `${idPrefix}8`,
        stories: [0, 1, 2].map((index) => `${idPrefix}${index}`),
      },
      postId,
      reel,
      since: DateTime.makeUnsafe(`${day}T00:00:00.000Z`),
      stories: [first, second, third],
      workspaceId,
    };

    return written;
  }
);

/** Deletes what `publishedFormats` wrote. */
export const deletePublished = (postId: PostId) =>
  SqlClient.SqlClient.use(
    (sql) => sql`DELETE FROM publishing.posts WHERE id = ${postId}`
  ).pipe(Effect.orDie);
