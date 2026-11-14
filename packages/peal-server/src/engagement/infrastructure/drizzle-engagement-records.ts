import { and, asc, eq, isNull } from "drizzle-orm";
import { DateTime, Effect, Layer } from "effect";
import { SqlClient } from "effect/sql";

import { EngagementRecords } from "#engagement/application/engagement-records.ts";
import type { CollectionEnd } from "#engagement/domain/thread.ts";
import { boundsKeeping } from "#engagement/infrastructure/platforms/refresh-bounds.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type {
  SentReplyRecord,
  SentReviewReplyRecord,
} from "#shared/application/personal-data.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { shareFollowingLock } from "./following-lock.ts";
import {
  commentRules,
  erasedWorkspaces,
  replies,
  reviewReplies,
  reviewThreads,
  threads,
} from "./schema.ts";

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

    const exportUserReviewReplies = Effect.fn(
      "EngagementRecords.exportUserReviewReplies"
    )(function* exportUserReviewReplies(userId: string) {
      const rows = yield* db
        .select({
          channelId: reviewReplies.channelId,
          createdAt: reviewReplies.createdAt,
          id: reviewReplies.id,
          reviewId: reviewReplies.reviewId,
          status: reviewReplies.status,
          text: reviewReplies.text,
          workspaceId: reviewReplies.workspaceId,
        })
        .from(reviewReplies)
        .where(eq(reviewReplies.authorId, userId))
        .orderBy(asc(reviewReplies.id))
        .pipe(Effect.mapError(failed));

      return rows.map((row): SentReviewReplyRecord => ({
        ...row,
        createdAt: DateTime.fromDateUnsafe(row.createdAt),
      }));
    });

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

              // The comment rules, with what they matched.
              yield* db
                .delete(commentRules)
                .where(eq(commentRules.workspaceId, workspaceId));

              yield* db
                .delete(threads)
                .where(eq(threads.workspaceId, workspaceId));

              yield* db
                .delete(reviewThreads)
                .where(eq(reviewThreads.workspaceId, workspaceId));
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

        yield* db
          .update(reviewReplies)
          .set({ authorId: null })
          .where(eq(reviewReplies.authorId, userId))
          .pipe(Effect.mapError(failed));

        // Nor that they started a comment rule: its next run ends it, as
        // its starter is gone.
        yield* db
          .update(commentRules)
          .set({ startedBy: null })
          .where(eq(commentRules.startedBy, userId))
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

    // On a platform that bounds keeping, every thread of the channel, read
    // or not, is taken first, as every writer of a thread's comments
    // takes it, and ends; its comments then keep their ids
    // and nothing their authors wrote or are, as `expireComment` leaves
    // them, and its counts follow.
    const channelGone = Effect.fn("EngagementRecords.channelGone")(
      function* channelGone(
        channelId: string,
        platform: Platform,
        at: DateTime.Utc
      ) {
        // A location's reviews go at once, with their replies.
        if (platform === "googleBusiness") {
          yield* db
            .delete(reviewThreads)
            .where(eq(reviewThreads.channelId, channelId))
            .pipe(Effect.mapError(failed));
        }

        if (!boundsKeeping(platform)) {
          return;
        }

        const instant = DateTime.formatIso(at);

        yield* sql
          .withTransaction(
            Effect.gen(function* forgetting() {
              const held = yield* sql<{ readonly id: string }>`
                SELECT id FROM engagement.threads
                WHERE channel_id = ${channelId}::uuid
                ORDER BY id
                FOR UPDATE
              `;

              if (held.length === 0) {
                return;
              }

              const ids = held.map(({ id }) => id).join(",");

              yield* sql`
                UPDATE engagement.comments
                SET text = '',
                    author_platform_id = NULL,
                    author_handle = NULL,
                    author_display_name = NULL,
                    permalink = NULL,
                    liked = false,
                    state = 'deleted',
                    expired_at = ${instant}::timestamptz
                WHERE thread_id = ANY(string_to_array(${ids}, ',')::uuid[])
                  AND state <> 'deleted'
              `;

              yield* sql`
                UPDATE engagement.threads
                SET comment_count = 0,
                    unanswered_count = 0,
                    last_comment_at = NULL,
                    refresh_by = NULL,
                    -- Ended at once: a read on its way when the channel
                    -- left finds it ended under its lock, and keeps
                    -- nothing (CollectComments' record).
                    next_collection_at = NULL,
                    ended_at = COALESCE(ended_at, ${instant}::timestamptz),
                    end_reason = COALESCE(end_reason, 'disconnected')
                WHERE id = ANY(string_to_array(${ids}, ',')::uuid[])
              `;
            })
          )
          .pipe(Effect.mapError(failed));
      }
    );

    return EngagementRecords.of({
      channelGone,
      eraseWorkspace,
      exportUser,
      exportUserReviewReplies,
      forgetUser,
      postRemoved,
    });
  })
);
