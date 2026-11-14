import { Cron, Duration, Effect, Layer, Metric } from "effect";
import { ClusterCron } from "effect/cluster";

import { CollectComments } from "#engagement/application/collect-comments.ts";
import { CollectMessages } from "#engagement/application/collect-messages.ts";
import { CollectReviews } from "#engagement/application/collect-reviews.ts";
import { PurgeEngagement } from "#engagement/application/purge-engagement.ts";
import {
  messagesRetentionFailures,
  PurgeMessages,
} from "#engagement/application/purge-messages.ts";
import {
  PurgeReviews,
  reviewsRetentionFailures,
} from "#engagement/application/purge-reviews.ts";
import { SendReply } from "#engagement/application/send-reply.ts";

/**
 * Every ten minutes, at minutes 2, 12, 22…: follows the posts that went
 * live since the last run and reads the comments of the threads due,
 * through each channel's gate. A run stops reading 8 minutes after its
 * scheduled time, before the next one, and says what it left; one more
 * than 8 minutes late is skipped: the next one reads what it would have.
 *
 * The minute is one no other cron starts on: two after the token sweep
 * (every ten minutes from 0), five before the collections of post counts
 * (minute 7) and of accounts (minute 37), which read through the same
 * gates, and off every daily retention. `test/app/cron-schedules.test.ts`
 * holds every cron to that.
 */
const CollectCommentsCron = ClusterCron.make({
  cron: Cron.parseUnsafe("2-59/10 * * * *", "UTC"),
  execute: Effect.gen(function* collectComments() {
    const at = yield* ClusterCron.CurrentScheduledTime;

    // A reply no job settled within the hour is handed to a person.
    const stranded = yield* SendReply.use((sending) => sending.settleStranded);

    if (stranded > 0) {
      yield* Effect.logWarning(
        "Replies were still on their way an hour after they were written: their job gave up or was lost. They wait to be checked, and are never sent again"
      ).pipe(Effect.annotateLogs({ replies: stranded }));
    }

    const report = yield* CollectComments.use((collect) => collect.run(at));

    if (Object.values(report).some((count) => count > 0)) {
      yield* Effect.logInfo("Collected comments", report);
    }
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.logWarning("The comments collection failed", cause)
    )
  ),
  name: "engagement.collect-comments",
  skipIfOlderThan: Duration.minutes(8),
});

/**
 * Every day at 04:41 UTC: ends the retention of threads, with their
 * comments and replies. A failed run is logged and the next day's catches
 * up.
 */
const EngagementRetentionCron = ClusterCron.make({
  cron: Cron.parseUnsafe("41 4 * * *", "UTC"),
  execute: PurgeEngagement.use((purging) => purging.purge).pipe(
    Effect.tap((threads) =>
      Effect.logInfo("Purged expired comment threads").pipe(
        Effect.annotateLogs({ threads })
      )
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Purging expired comment threads failed", cause)
    )
  ),
  name: "engagement.retention",
  skipIfOlderThan: Duration.hours(12),
});

/**
 * Every hour at minute 51: forgets the comments of threads whose platform
 * bounds how long a comment is kept without being read again, and that no
 * read reached in time (`PurgeEngagement.forgetExpired`). Hourly, so a
 * comment outlives its bound by an hour at most, which the bounds leave
 * room for (29 days of YouTube's 30). A failed run is logged and the next
 * hour's catches up.
 */
const EngagementRefreshBoundCron = ClusterCron.make({
  cron: Cron.parseUnsafe("51 * * * *", "UTC"),
  execute: PurgeEngagement.use((purging) => purging.forgetExpired).pipe(
    Effect.tap((threads) =>
      threads > 0
        ? Effect.logInfo(
            "Forgot the comments of threads not read again within their platform's bound"
          ).pipe(Effect.annotateLogs({ threads }))
        : Effect.void
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning(
        "Forgetting the comments past their platform's bound failed",
        cause
      )
    )
  ),
  name: "engagement.refresh-bound",
  skipIfOlderThan: Duration.minutes(50),
});

/**
 * Every hour at minute 27: reads the reviews of the locations due, where
 * the inbox reads Google Business Profile (`PEAL_INBOX_PLATFORMS`), after
 * handing the replies no job settled to the next read. Off, it does
 * nothing. A run starts no read 40 minutes after its time; one more than
 * 40 minutes late is skipped. The minute is one no other cron starts on
 * (`test/app/cron-schedules.test.ts`).
 */
const CollectReviewsCron = ClusterCron.make({
  cron: Cron.parseUnsafe("27 * * * *", "UTC"),
  execute: Effect.gen(function* collectReviews() {
    const at = yield* ClusterCron.CurrentScheduledTime;
    const report = yield* CollectReviews.use((collect) => collect.run(at));

    if (Object.values(report).some((count) => count > 0)) {
      yield* Effect.logInfo("Collected reviews", report);
    }
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.logWarning("The reviews collection failed", cause)
    )
  ),
  name: "engagement.collect-reviews",
  skipIfOlderThan: Duration.minutes(40),
});

/**
 * Every hour at minute 47: deletes the reviews last changed 29 days ago,
 * and the threads no read reached in that time, as Google's policies let
 * what its API gives be stored 30 days (`PurgeReviews`). A failed run is
 * logged and the next hour's catches up.
 */
const ReviewsRetentionCron = ClusterCron.make({
  cron: Cron.parseUnsafe("47 * * * *", "UTC"),
  execute: PurgeReviews.use((purging) => purging.purge).pipe(
    Effect.tap((purged) =>
      purged.reviews > 0 || purged.threads > 0
        ? Effect.logInfo("Forgot reviews past their time").pipe(
            Effect.annotateLogs({
              reviews: purged.reviews,
              threads: purged.threads,
            })
          )
        : Effect.void
    ),
    Effect.catchCause((cause) =>
      Metric.update(reviewsRetentionFailures, 1).pipe(
        Effect.andThen(
          Effect.logWarning("Forgetting reviews past their time failed", cause)
        )
      )
    )
  ),
  name: "engagement.reviews-retention",
  skipIfOlderThan: Duration.minutes(50),
});

/**
 * At minutes 1 and 21 of every hour: hands to a person the direct
 * messages no job settled, follows the channels connected since, and
 * reads the conversations of the channels due, where the operator turned
 * a platform's messages on (`PEAL_INBOX_MESSAGES`). Off, it does nothing.
 * A run starts no read 8 minutes after its time; one more than 8 minutes
 * late is skipped. They are minutes no other cron starts on
 * (`test/app/cron-schedules.test.ts`, which leaves few): a channel whose
 * messages are read every run waits 40 minutes at most, from :21 to :01.
 */
const CollectMessagesCron = ClusterCron.make({
  cron: Cron.parseUnsafe("1,21 * * * *", "UTC"),
  execute: Effect.gen(function* collectMessages() {
    const at = yield* ClusterCron.CurrentScheduledTime;
    const report = yield* CollectMessages.use((collect) => collect.run(at));

    if (report.stranded > 0) {
      yield* Effect.logWarning(
        "Direct messages were still on their way an hour after they were written: their job gave up or was lost. They wait to be checked, and are never sent again"
      ).pipe(Effect.annotateLogs({ messages: report.stranded }));
    }

    if (Object.values(report).some((count) => count > 0)) {
      yield* Effect.logInfo("Collected direct messages", report);
    }
  }).pipe(
    // Logged without the cause, which may quote what people wrote.
    Effect.catchCause(() =>
      Effect.logWarning("The direct messages collection failed")
    )
  ),
  name: "engagement.collect-messages",
  skipIfOlderThan: Duration.minutes(8),
});

/**
 * Every hour at minute 57: deletes the conversations whose last message
 * was sent 30 days ago, with what they hold (`PurgeMessages`). A failed
 * run is counted (`peal.engagement.messages.retention_failures`, alert
 * `peal-messages-retention-failing`) and the next hour's catches up.
 */
const MessagesRetentionCron = ClusterCron.make({
  cron: Cron.parseUnsafe("57 * * * *", "UTC"),
  execute: PurgeMessages.use((purging) => purging.purge).pipe(
    Effect.tap((conversations) =>
      conversations > 0
        ? Effect.logInfo("Deleted conversations past their time").pipe(
            Effect.annotateLogs({ conversations })
          )
        : Effect.void
    ),
    Effect.catchCause(() =>
      Metric.update(messagesRetentionFailures, 1).pipe(
        Effect.andThen(
          Effect.logWarning("Deleting conversations past their time failed")
        )
      )
    )
  ),
  name: "engagement.messages-retention",
  skipIfOlderThan: Duration.minutes(50),
});

/**
 * The comments collection, the refresh bound and the retention; the
 * reviews' collection and retention; the direct messages' collection and
 * retention.
 */
export const EngagementCronsLive = Layer.mergeAll(
  CollectCommentsCron,
  EngagementRefreshBoundCron,
  EngagementRetentionCron,
  CollectReviewsCron,
  ReviewsRetentionCron,
  CollectMessagesCron,
  MessagesRetentionCron
);
