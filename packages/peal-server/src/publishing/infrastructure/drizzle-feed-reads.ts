import { lt, sql } from "drizzle-orm";
import { DateTime, Duration, Effect, Layer } from "effect";

import { FeedReads } from "#publishing/application/feed-reads.ts";
import type { FeedReadAllowance } from "#publishing/application/feed-reads.ts";
import { feedReadsPerHour } from "#publishing/domain/feed.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { feedReads } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

/**
 * FeedReads counted in Postgres, by workspace, in fixed windows of an
 * hour on the hour (UTC). One statement inserts the hour's row, or adds
 * to it only while it stays within `feedReadsPerHour`, so reads from
 * every server take turns on the row.
 */
export const DrizzleFeedReads = Layer.effect(
  FeedReads,
  Effect.gen(function* DrizzleFeedReads() {
    const db = yield* Drizzle;

    const take = Effect.fn("FeedReads.take")(function* take(
      workspaceId: WorkspaceId
    ) {
      const now = yield* DateTime.now;
      const windowStart = DateTime.startOf(now, "hour");

      const rows = yield* db
        .insert(feedReads)
        .values({
          reads: 1,
          windowStart: DateTime.toDateUtc(windowStart),
          workspaceId,
        })
        .onConflictDoUpdate({
          set: { reads: sql`${feedReads.reads} + 1` },
          setWhere: sql`${feedReads.reads} + 1 <= ${feedReadsPerHour}`,
          target: [feedReads.workspaceId, feedReads.windowStart],
        })
        .returning({ reads: feedReads.reads })
        .pipe(Effect.mapError(failed));

      const allowance: FeedReadAllowance =
        rows.length > 0
          ? { _tag: "taken" }
          : {
              _tag: "refused",
              retryAfter: DateTime.distance(
                now,
                DateTime.addDuration(windowStart, Duration.hours(1))
              ),
            };

      return allowance;
    });

    return FeedReads.of({
      purge: Effect.fn("FeedReads.purge")(function* purge(before) {
        const deleted = yield* db
          .delete(feedReads)
          .where(lt(feedReads.windowStart, DateTime.toDateUtc(before)))
          .returning({ workspaceId: feedReads.workspaceId })
          .pipe(Effect.mapError(failed));

        return deleted.length;
      }),
      take,
    });
  })
);
