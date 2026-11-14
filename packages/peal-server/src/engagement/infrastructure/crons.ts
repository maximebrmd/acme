import { Cron, Duration, Effect, Layer, Metric } from "effect";
import { ClusterCron } from "effect/cluster";

import { CollectComments } from "#engagement/application/collect-comments.ts";
import { CollectReviews } from "#engagement/application/collect-reviews.ts";
import { CommentRules } from "#engagement/application/comment-rules.ts";
import { PurgeEngagement } from "#engagement/application/purge-engagement.ts";
import {
  PurgeReviews,
  reviewsRetentionFailures,
} from "#engagement/application/purge-reviews.ts";
import { SendReply } from "#engagement/application/send-reply.ts";

/**
 * Every ten minutes, at minutes 2, 12, 22…: follows the posts that went
 * live since the last run and reads the comments of the threads due,
 * through each channel's gate, then runs the keyword rules over what came
 * in (`CommentRules.runDue`). A run stops reading 8 minutes after its
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

    // The keyword rules answer what came in: each reply through the
    // inbox's own journal and job, never a call of the run's.
    const answered = yield* CommentRules.use((rules) => rules.runDue);

    if (answered.looked > 0 || answered.ended > 0) {
      yield* Effect.logInfo("Ran the comment rules", answered);
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
 * The comments collection, the refresh bound and the retention; the
 * reviews' collection and retention.
 */
export const EngagementCronsLive = Layer.mergeAll(
  CollectCommentsCron,
  EngagementRefreshBoundCron,
  EngagementRetentionCron,
  CollectReviewsCron,
  ReviewsRetentionCron
);
