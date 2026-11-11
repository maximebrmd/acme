import { and, asc, eq, isNull } from "drizzle-orm";
import { DateTime, Effect, Layer } from "effect";
import { SqlClient } from "effect/sql";

import { EngagementRecords } from "#engagement/application/engagement-records.ts";
import type { CollectionEnd } from "#engagement/domain/thread.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type { SentReplyRecord } from "#shared/application/personal-data.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { shareFollowingLock } from "./following-lock.ts";
import { erasedWorkspaces, replies, threads } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

// The end of a thread whose post Peal deleted from its platform.
const removed: CollectionEnd = "removed";

/**
 * EngagementRecords on the engagement schema. Deleting a thread deletes
 * its comments and replies, which reference it with ON DELETE CASCADE. An
 * erased workspace is recorded first, under the following lock, so posts
 * of it a collection run listed before are never followed after.
 */
export const DrizzleEngagementRecords = Layer.effect(
  EngagementRecords,
  Effect.gen(function* DrizzleEngagementRecords() {
    const db = yield* Drizzle;
    const sql = yield* SqlClient.SqlClient;

    const exportUser = Effect.fn("EngagementRecords.exportUser")(
      function* exportUser(userId: string) {
        const rows = yield* db
          .select({
            channelId: replies.channelId,
            createdAt: replies.createdAt,
            id: replies.id,
            permalink: replies.permalink,
            postId: threads.postId,
            status: replies.status,
            text: replies.text,
            workspaceId: replies.workspaceId,
          })
          .from(replies)
          .innerJoin(threads, eq(threads.id, replies.threadId))
          .where(eq(replies.authorId, userId))
          .orderBy(asc(replies.id))
          .pipe(Effect.mapError(failed));

        return rows.map((row): SentReplyRecord => ({
          ...row,
          createdAt: DateTime.fromDateUnsafe(row.createdAt),
        }));
      }
    );

    const eraseWorkspace = Effect.fn("EngagementRecords.eraseWorkspace")(
      function* eraseWorkspace(workspaceId: string) {
        const now = yield* DateTime.now;

        // In the caller's transaction, whose end releases the lock.
        yield* sql
          .withTransaction(
            Effect.gen(function* erasing() {
              yield* shareFollowingLock(sql);

              yield* db
                .insert(erasedWorkspaces)
                .values({ erasedAt: DateTime.toDateUtc(now), workspaceId })
                .onConflictDoNothing();

              yield* db
                .delete(threads)
                .where(eq(threads.workspaceId, workspaceId));
            })
          )
          .pipe(Effect.mapError(failed));
      }
    );

    const forgetUser = Effect.fn("EngagementRecords.forgetUser")(
      function* forgetUser(userId: string) {
        yield* db
          .update(replies)
          .set({ authorId: null })
          .where(eq(replies.authorId, userId))
          .pipe(Effect.mapError(failed));

        yield* db
          .update(threads)
          .set({ authorId: null })
          .where(eq(threads.authorId, userId))
          .pipe(Effect.mapError(failed));
      }
    );

    const postRemoved = (targetId: string, at: DateTime.Utc) =>
      db
        .update(threads)
        .set({
          endReason: removed,
          endedAt: DateTime.toDateUtc(at),
          nextCollectionAt: null,
        })
        .where(and(eq(threads.targetId, targetId), isNull(threads.endedAt)))
        .pipe(Effect.asVoid, Effect.mapError(failed));

    return EngagementRecords.of({
      eraseWorkspace,
      exportUser,
      forgetUser,
      postRemoved,
    });
  })
);
