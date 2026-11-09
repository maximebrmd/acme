import { asc, eq, sql } from "drizzle-orm";
import { DateTime, Effect, Layer, Schema } from "effect";

import { MeteredPostLedger } from "#billing/application/ports/metered-post-ledger.ts";
import type { MeteredPostCount } from "#billing/domain/metered-posts.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { PlatformSchema } from "#shared/domain/platform.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { meteredPosts } from "./schema.ts";

type Row = typeof meteredPosts.$inferSelect;

const failed = (cause: unknown) => new DatabaseError({ cause });

// A platform the domain does not know fails loudly instead of being trusted.
const decodePlatform = Schema.decodeUnknownEffect(PlatformSchema);

const toCount = (row: Row) =>
  decodePlatform(row.platform).pipe(
    Effect.orDie,
    Effect.map((platform): MeteredPostCount => ({
      month: DateTime.fromDateUnsafe(row.month),
      platform,
      posts: row.posts,
      postsWithLinks: row.postsWithLinks,
    }))
  );

/**
 * The metered posts' counts in the billing schema. Adding one is a single
 * statement, an insert that adds to the month's row, so posts settled at
 * the same time are all counted.
 */
export const DrizzleMeteredPostLedgerLive = Layer.effect(
  MeteredPostLedger,
  Effect.gen(function* DrizzleMeteredPostLedgerLive() {
    const db = yield* Drizzle;

    return MeteredPostLedger.of({
      add: ({ month, platform, withLink, workspaceId }) =>
        db
          .insert(meteredPosts)
          .values({
            month: DateTime.toDateUtc(month),
            platform,
            posts: 1,
            postsWithLinks: withLink ? 1 : 0,
            workspaceId,
          })
          .onConflictDoUpdate({
            set: {
              posts: sql`${meteredPosts.posts} + 1`,
              postsWithLinks: sql`${meteredPosts.postsWithLinks} + excluded.posts_with_links`,
            },
            target: [
              meteredPosts.workspaceId,
              meteredPosts.platform,
              meteredPosts.month,
            ],
          })
          .pipe(
            Effect.mapError(failed),
            Effect.asVoid,
            Effect.withSpan("MeteredPostLedger.add")
          ),
      eraseWorkspace: (workspaceId) =>
        db
          .delete(meteredPosts)
          .where(eq(meteredPosts.workspaceId, workspaceId))
          .pipe(
            Effect.mapError(failed),
            Effect.asVoid,
            Effect.withSpan("MeteredPostLedger.eraseWorkspace")
          ),
      ofWorkspace: (workspaceId) =>
        db
          .select()
          .from(meteredPosts)
          .where(eq(meteredPosts.workspaceId, workspaceId))
          .orderBy(asc(meteredPosts.month), asc(meteredPosts.platform))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(Effect.forEach(toCount)),
            Effect.withSpan("MeteredPostLedger.ofWorkspace")
          ),
    });
  })
);
