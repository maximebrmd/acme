import { Cron, Duration, Effect, Layer } from "effect";
import { ClusterCron } from "effect/cluster";

import { CollectComments } from "#engagement/application/collect-comments.ts";
import { PurgeEngagement } from "#engagement/application/purge-engagement.ts";
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

/** The comments collection and the retention. */
export const EngagementCronsLive = Layer.mergeAll(
  CollectCommentsCron,
  EngagementRetentionCron
);
