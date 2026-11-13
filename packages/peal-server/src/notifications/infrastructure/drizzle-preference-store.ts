import { inArray } from "drizzle-orm";
import { DateTime, Effect, Layer } from "effect";

import { PreferenceStore } from "#notifications/application/preference-store.ts";
import {
  changePreferences,
  defaultPreferences,
  NotificationPreferences,
} from "#notifications/domain/notification-preferences.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";
import type { UserId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { notificationPreferences } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

type Row = typeof notificationPreferences.$inferSelect;

const preferencesOf = (row: Row) =>
  new NotificationPreferences({
    email: {
      channelReconnect: row.emailChannelReconnect,
      comments: row.emailComments,
      feedStopped: row.emailFeedStopped,
      postFailed: row.emailPostFailed,
      postPublished: row.emailPostPublished,
      postReview: row.emailPostReview,
      postUnconfirmed: row.emailPostUnconfirmed,
      recyclingEnded: row.emailRecyclingEnded,
      webhookFailing: row.emailWebhookFailing,
      weeklyDigest: row.emailWeeklyDigest,
    },
    everyPost: row.everyPost,
  });

/** Preferences in the notifications schema, one row per user who chose. */
export const DrizzlePreferenceStore = Layer.effect(
  PreferenceStore,
  Effect.gen(function* DrizzlePreferenceStore() {
    const db = yield* Drizzle;

    return PreferenceStore.of({
      change: Effect.fn("PreferenceStore.change")(
        function* change(userId, requested, at) {
          const updatedAt = DateTime.toDateUtc(at);
          const first = changePreferences(defaultPreferences, requested);
          const email = requested.email ?? {};

          // Only the columns asked for change, in one statement, so changes
          // made at once never undo each other.
          const set: Partial<typeof notificationPreferences.$inferInsert> = {
            updatedAt,
          };

          if (email.channelReconnect !== undefined) {
            set.emailChannelReconnect = email.channelReconnect;
          }

          if (email.comments !== undefined) {
            set.emailComments = email.comments;
          }

          if (email.postFailed !== undefined) {
            set.emailPostFailed = email.postFailed;
          }

          if (email.postPublished !== undefined) {
            set.emailPostPublished = email.postPublished;
          }

          if (email.postReview !== undefined) {
            set.emailPostReview = email.postReview;
          }

          if (email.postUnconfirmed !== undefined) {
            set.emailPostUnconfirmed = email.postUnconfirmed;
          }

          if (email.feedStopped !== undefined) {
            set.emailFeedStopped = email.feedStopped;
          }

          if (email.recyclingEnded !== undefined) {
            set.emailRecyclingEnded = email.recyclingEnded;
          }

          if (email.webhookFailing !== undefined) {
            set.emailWebhookFailing = email.webhookFailing;
          }

          if (email.weeklyDigest !== undefined) {
            set.emailWeeklyDigest = email.weeklyDigest;
          }

          if (requested.everyPost !== undefined) {
            set.everyPost = requested.everyPost;
          }

          const [row] = yield* db
            .insert(notificationPreferences)
            .values({
              emailChannelReconnect: first.email.channelReconnect,
              emailComments: first.email.comments,
              emailFeedStopped: first.email.feedStopped,
              emailPostFailed: first.email.postFailed,
              emailPostPublished: first.email.postPublished,
              emailPostReview: first.email.postReview,
              emailPostUnconfirmed: first.email.postUnconfirmed,
              emailRecyclingEnded: first.email.recyclingEnded,
              emailWebhookFailing: first.email.webhookFailing,
              emailWeeklyDigest: first.email.weeklyDigest,
              everyPost: first.everyPost,
              updatedAt,
              userId,
            })
            .onConflictDoUpdate({
              set,
              target: notificationPreferences.userId,
            })
            .returning()
            .pipe(Effect.mapError(failed));

          return row === undefined
            ? yield* Effect.die("An upsert returned no row")
            : preferencesOf(row);
        }
      ),
      forUsers: Effect.fn("PreferenceStore.forUsers")(
        function* forUsers(userIds) {
          if (userIds.length === 0) {
            return new Map<UserId, NotificationPreferences>();
          }

          const rows = yield* db
            .select()
            .from(notificationPreferences)
            .where(inArray(notificationPreferences.userId, [...userIds]))
            .pipe(Effect.mapError(failed));

          return new Map(
            rows.map((row) => [
              UserIdSchema.make(row.userId),
              preferencesOf(row),
            ])
          );
        }
      ),
    });
  })
);
