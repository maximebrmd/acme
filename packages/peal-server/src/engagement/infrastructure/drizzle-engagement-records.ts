import { and, asc, eq, inArray, isNull, ne } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { DateTime, Effect, Layer } from "effect";
import { SqlClient } from "effect/sql";

import { EngagementRecords } from "#engagement/application/engagement-records.ts";
import type { CommentRuleEndReason } from "#engagement/domain/comment-rule-end-reason.ts";
import type { CollectionEnd } from "#engagement/domain/thread.ts";
import { boundsKeeping } from "#engagement/infrastructure/platforms/refresh-bounds.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { MeteredUsage } from "#shared/application/metered-usage.ts";
import type {
  CommentRuleRecord,
  SentMessageRecord,
  SentReplyRecord,
  SentReviewReplyRecord,
} from "#shared/application/personal-data.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { shareFollowingLock } from "./following-lock.ts";
import {
  commentRuleMatches,
  commentRules,
  conversations,
  erasedWorkspaces,
  messageApplications,
  messageBoxes,
  messageChannels,
  outgoingMessages,
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
    const meters = yield* MeteredUsage;

    // The messages sent from Peal that never set out (on their way, no
    // call begun), locked until the caller's transaction ends, so a job
    // that would begin one waits and then finds it gone.
    const unsentWhere = (where: SQL | undefined) =>
      db
        .select({
          createdAt: outgoingMessages.createdAt,
          workspaceId: outgoingMessages.workspaceId,
        })
        .from(outgoingMessages)
        .where(
          and(
            where,
            eq(outgoingMessages.status, "sending"),
            isNull(outgoingMessages.attemptedAt)
          )
        )
        .for("update");

    // Their outbound messages, given back once their rows went: what
    // never set out is not billed.
    const giveBackUnsent = (
      unsent: readonly {
        readonly createdAt: Date;
        readonly workspaceId: string;
      }[]
    ) =>
      Effect.forEach(
        unsent,
        (message) =>
          meters.giveBack({
            at: DateTime.fromDateUnsafe(message.createdAt),
            meter: "outboundMessages",
            units: 1,
            workspaceId: WorkspaceIdSchema.make(message.workspaceId),
          }),
        { discard: true }
      );

    const exportCommentRules = Effect.fn(
      "EngagementRecords.exportCommentRules"
    )(function* exportCommentRules(workspaceId: string) {
      const rules = yield* db
        .select()
        .from(commentRules)
        .where(eq(commentRules.workspaceId, workspaceId))
        .orderBy(asc(commentRules.id))
        .pipe(Effect.mapError(failed));

      const matches =
        rules.length === 0
          ? []
          : yield* db
              .select()
              .from(commentRuleMatches)
              .where(
                inArray(
                  commentRuleMatches.ruleId,
                  rules.map(({ id }) => id)
                )
              )
              .orderBy(
                asc(commentRuleMatches.lookedAt),
                asc(commentRuleMatches.commentId)
              )
              .pipe(Effect.mapError(failed));

      return rules.map((rule): CommentRuleRecord => ({
        answersFrom: DateTime.fromDateUnsafe(rule.answersFrom),
        channelId: rule.channelId,
        createdAt: DateTime.fromDateUnsafe(rule.createdAt),
        endedReason: rule.endedReason,
        id: rule.id,
        keywords: rule.keywords,
        matches: matches
          .filter(({ ruleId }) => ruleId === rule.id)
          .map((match) => ({
            code: match.code,
            commentId: match.commentId,
            lookedAt: DateTime.fromDateUnsafe(match.lookedAt),
            outcome: match.outcome,
            replyId: match.replyId,
          })),
        postId: rule.postId,
        reply: rule.reply,
        scope: rule.scope,
        status: rule.status,
        statusAt:
          rule.statusAt === null
            ? null
            : DateTime.fromDateUnsafe(rule.statusAt),
      }));
    });

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

    const exportUserMessages = Effect.fn(
      "EngagementRecords.exportUserMessages"
    )(function* exportUserMessages(userId: string) {
      const rows = yield* db
        .select({
          channelId: outgoingMessages.channelId,
          conversationId: outgoingMessages.conversationId,
          createdAt: outgoingMessages.createdAt,
          id: outgoingMessages.id,
          status: outgoingMessages.status,
          text: outgoingMessages.text,
          workspaceId: outgoingMessages.workspaceId,
        })
        .from(outgoingMessages)
        .where(eq(outgoingMessages.authorId, userId))
        .orderBy(asc(outgoingMessages.id))
        .pipe(Effect.mapError(failed));

      return rows.map((row): SentMessageRecord => ({
        ...row,
        createdAt: DateTime.fromDateUnsafe(row.createdAt),
      }));
    });

    const eraseWorkspace = Effect.fn("EngagementRecords.eraseWorkspace")(
      function* eraseWorkspace(workspaceId: string) {
        const now = yield* DateTime.now;

        // In the caller's transaction, whose end releases the lock.
        const unsent = yield* sql
          .withTransaction(
            Effect.gen(function* erasing() {
              yield* shareFollowingLock(sql);

              const found = yield* unsentWhere(
                eq(outgoingMessages.workspaceId, workspaceId)
              );

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

              yield* db
                .delete(messageChannels)
                .where(eq(messageChannels.workspaceId, workspaceId));

              yield* db
                .delete(messageApplications)
                .where(eq(messageApplications.workspaceId, workspaceId));

              yield* db
                .delete(messageBoxes)
                .where(eq(messageBoxes.workspaceId, workspaceId));

              yield* db
                .delete(conversations)
                .where(eq(conversations.workspaceId, workspaceId));

              return found;
            })
          )
          .pipe(Effect.mapError(failed));

        // Before billing forgets the workspace, later in the erasure.
        yield* giveBackUnsent(unsent);
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

        yield* db
          .update(outgoingMessages)
          .set({ authorId: null })
          .where(eq(outgoingMessages.authorId, userId))
          .pipe(Effect.mapError(failed));

        yield* db
          .update(messageChannels)
          .set({ enabledBy: null })
          .where(eq(messageChannels.enabledBy, userId))
          .pipe(Effect.mapError(failed));

        yield* db
          .update(messageApplications)
          .set({ grantedBy: null })
          .where(eq(messageApplications.grantedBy, userId))
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
        // A channel's conversations go at once, whatever its platform,
        // with their messages and those sent from Peal: correspondence is
        // kept for the channel's workspace only while it holds the
        // channel.
        const unsent = yield* sql
          .withTransaction(
            Effect.gen(function* deleting() {
              const found = yield* unsentWhere(
                eq(outgoingMessages.channelId, channelId)
              );

              yield* db
                .delete(messageChannels)
                .where(eq(messageChannels.channelId, channelId));

              yield* db
                .delete(messageBoxes)
                .where(eq(messageBoxes.channelId, channelId));

              yield* db
                .delete(conversations)
                .where(eq(conversations.channelId, channelId));

              return found;
            })
          )
          .pipe(Effect.mapError(failed));

        yield* giveBackUnsent(unsent);

        // The rules that answer the channel's comments end with it: they
        // would hold one of the workspace's rules and answer nothing.
        yield* db
          .update(commentRules)
          .set({
            endedReason: "channelGone" satisfies CommentRuleEndReason,
            status: "ended",
            statusAt: DateTime.toDateUtc(at),
          })
          .where(
            and(
              eq(commentRules.channelId, channelId),
              ne(commentRules.status, "ended")
            )
          )
          .pipe(Effect.mapError(failed));

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
      exportCommentRules,
      exportUser,
      exportUserMessages,
      exportUserReviewReplies,
      forgetUser,
      postRemoved,
    });
  })
);
