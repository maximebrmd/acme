import { asc, eq } from "drizzle-orm";
import { DateTime, Effect, Layer, Match, Option, Schema } from "effect";

import { NoticeRecords } from "#notifications/application/notice-records.ts";
import { NoticeEventSchema } from "#notifications/domain/notice-event.ts";
import type { NoticeEvent } from "#notifications/domain/notice-event.ts";
import { defaultPreferences } from "#notifications/domain/notification-preferences.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type {
  NoticeEventRecord,
  NoticeRecord,
} from "#shared/application/personal-data.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { notificationPreferences, notices } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const decodeEvent = Schema.decodeUnknownEffect(
  Schema.toCodecJson(NoticeEventSchema)
);

// An event as the notices API lists it: absent values as null.
const plainEvent = (event: NoticeEvent): NoticeEventRecord =>
  Match.valueTags(event, {
    AdBoostChanged: ({
      boostId,
      budget,
      budgetDigits,
      change,
      endsAt,
      postId,
      reason,
    }): NoticeEventRecord => ({
      _tag: "AdBoostChanged",
      boostId,
      budget,
      budgetDigits,
      change,
      endsAt,
      postId,
      reason: Option.getOrNull(reason),
    }),
    AdConnectionReconnectRequired: ({ network }): NoticeEventRecord => ({
      _tag: "AdConnectionReconnectRequired",
      network,
    }),
    ChannelReconnectRequired: ({ channel }): NoticeEventRecord => ({
      _tag: "ChannelReconnectRequired",
      channel,
    }),
    ChannelReconnectSoon: ({ channel, expiresAt }): NoticeEventRecord => ({
      _tag: "ChannelReconnectSoon",
      channel,
      expiresAt,
    }),
    CommentsReceived: ({ count, postId, threadId }): NoticeEventRecord => ({
      _tag: "CommentsReceived",
      count,
      postId,
      threadId,
    }),
    FeedStopped: ({ feedId, reason }): NoticeEventRecord => ({
      _tag: "FeedStopped",
      feedId,
      reason,
    }),
    PostApprovalRequested: ({ postId, scheduledAt }): NoticeEventRecord => ({
      _tag: "PostApprovalRequested",
      postId,
      scheduledAt,
    }),
    PostApproved: ({ by, late, postId }): NoticeEventRecord => ({
      _tag: "PostApproved",
      by,
      late,
      postId,
    }),
    PostChangesRequested: ({ by, postId }): NoticeEventRecord => ({
      _tag: "PostChangesRequested",
      by,
      postId,
    }),
    PostCommented: ({ by, postId }): NoticeEventRecord => ({
      _tag: "PostCommented",
      by,
      postId,
    }),
    PostFailed: ({ channel, postId, reason }): NoticeEventRecord => ({
      _tag: "PostFailed",
      channel: Option.getOrNull(channel),
      postId,
      reason,
    }),
    PostPublished: ({ channel, permalink, postId }): NoticeEventRecord => ({
      _tag: "PostPublished",
      channel: Option.getOrNull(channel),
      permalink: Option.getOrNull(permalink),
      postId,
    }),
    PostUnconfirmed: ({ channel, postId }): NoticeEventRecord => ({
      _tag: "PostUnconfirmed",
      channel: Option.getOrNull(channel),
      postId,
    }),
    RecyclingEnded: ({ reason, ruleId, sourcePostId }): NoticeEventRecord => ({
      _tag: "RecyclingEnded",
      reason,
      ruleId,
      sourcePostId,
    }),
    SubscriptionCancelled: ({ endsAt, plan }): NoticeEventRecord => ({
      _tag: "SubscriptionCancelled",
      endsAt,
      plan,
    }),
    SubscriptionRenewing: ({ plan, price, renewsAt }): NoticeEventRecord => ({
      _tag: "SubscriptionRenewing",
      plan,
      price,
      renewsAt,
    }),
    SubscriptionStarted: ({
      interval,
      plan,
      price,
      startedAt,
      trialEnd,
    }): NoticeEventRecord => ({
      _tag: "SubscriptionStarted",
      interval,
      plan,
      price,
      startedAt,
      trialEnd: Option.getOrNull(trialEnd),
    }),
    SubscriptionWithdrawn: ({
      plan,
      refunded,
      withdrawnAt,
    }): NoticeEventRecord => ({
      _tag: "SubscriptionWithdrawn",
      plan,
      refunded,
      withdrawnAt,
    }),
    PaymentMethodNeeded: ({
      accounts,
      allowed,
      graceUntil,
    }): NoticeEventRecord => ({
      _tag: "PaymentMethodNeeded",
      accounts,
      allowed,
      graceUntil,
    }),
    PlansRetiring: ({ endsAt, plan }): NoticeEventRecord => ({
      _tag: "PlansRetiring",
      endsAt,
      plan,
    }),
    AllowanceReached: ({ allowed, meter, resetsAt }): NoticeEventRecord => ({
      _tag: "AllowanceReached",
      allowed,
      meter,
      resetsAt,
    }),
    XSpendCeiling: ({ ceiling, percent, resetsAt }): NoticeEventRecord => ({
      _tag: "XSpendCeiling",
      ceiling,
      percent,
      resetsAt,
    }),
    TrialEnding: ({ endsAt, over, plan }): NoticeEventRecord => ({
      _tag: "TrialEnding",
      endsAt,
      over,
      plan,
    }),
    WebhookDeliveriesFailing: ({ endpointId, host }): NoticeEventRecord => ({
      _tag: "WebhookDeliveriesFailing",
      endpointId,
      host,
    }),
    WebhookEndpointDisabled: ({
      endpointId,
      host,
      reason,
    }): NoticeEventRecord => ({
      _tag: "WebhookEndpointDisabled",
      endpointId,
      host,
      reason,
    }),
  });

/** NoticeRecords on the notifications schema. */
export const DrizzleNoticeRecords = Layer.effect(
  NoticeRecords,
  Effect.gen(function* DrizzleNoticeRecords() {
    const db = yield* Drizzle;

    const exportUser = Effect.fn("NoticeRecords.exportUser")(
      function* exportUser(userId: string) {
        const rows = yield* db
          .select()
          .from(notices)
          .where(eq(notices.userId, userId))
          .orderBy(asc(notices.id))
          .pipe(Effect.mapError(failed));

        const records = yield* Effect.all(
          rows.map((row) =>
            decodeEvent(row.event).pipe(
              Effect.orDie,
              Effect.map((event): NoticeRecord => ({
                createdAt: DateTime.fromDateUnsafe(row.createdAt),
                event: plainEvent(event),
                id: row.id,
                readAt:
                  row.readAt === null
                    ? null
                    : DateTime.fromDateUnsafe(row.readAt),
                workspaceId: row.workspaceId,
              }))
            )
          )
        );

        const [chosen] = yield* db
          .select()
          .from(notificationPreferences)
          .where(eq(notificationPreferences.userId, userId))
          .pipe(Effect.mapError(failed));

        const preferences =
          chosen === undefined
            ? {
                email: defaultPreferences.email,
                everyPost: defaultPreferences.everyPost,
                lastWeeklyDigest: null,
              }
            : {
                email: {
                  channelReconnect: chosen.emailChannelReconnect,
                  comments: chosen.emailComments,
                  feedStopped: chosen.emailFeedStopped,
                  postFailed: chosen.emailPostFailed,
                  postPublished: chosen.emailPostPublished,
                  postReview: chosen.emailPostReview,
                  postUnconfirmed: chosen.emailPostUnconfirmed,
                  recyclingEnded: chosen.emailRecyclingEnded,
                  webhookFailing: chosen.emailWebhookFailing,
                  weeklyDigest: chosen.emailWeeklyDigest,
                },
                everyPost: chosen.everyPost,
                lastWeeklyDigest: chosen.weeklyDigestWeek,
              };

        return { notices: records, preferences };
      }
    );

    const eraseUser = Effect.fn("NoticeRecords.eraseUser")(function* eraseUser(
      userId: string
    ) {
      yield* db
        .delete(notices)
        .where(eq(notices.userId, userId))
        .pipe(Effect.mapError(failed));

      yield* db
        .delete(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .pipe(Effect.mapError(failed));
    });

    const eraseWorkspace = Effect.fn("NoticeRecords.eraseWorkspace")(
      function* eraseWorkspace(workspaceId: string) {
        yield* db
          .delete(notices)
          .where(eq(notices.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed));
      }
    );

    return NoticeRecords.of({ eraseUser, eraseWorkspace, exportUser });
  })
);
