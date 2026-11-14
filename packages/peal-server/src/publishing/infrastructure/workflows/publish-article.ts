import { Duration, Effect, Schema } from "effect";
import type { DateTime } from "effect";
import { ClusterSchema } from "effect/cluster";
import { Activity, DurableClock, Workflow } from "effect/workflow";

import type { ArticleJob } from "#publishing/application/article-jobs.ts";
import {
  ArticleClaimSchema,
  ArticleOutcomeSchema,
  articleAttemptRun,
  claimArticleRun,
  settleArticleRun,
} from "#publishing/application/article-publication.ts";
import { ArticleIdSchema } from "#publishing/domain/article-id.ts";
import { PublicationDecisionSchema } from "#publishing/domain/publication-policy.ts";

import { retryingDatabase } from "./activity-retry.ts";
import { sleepUntil } from "./sleep-until.ts";

/**
 * Sends one revision of an article to its site, in one round: sleeps
 * until Peal is due to send it, claims it, makes attempts until one
 * settles it (the posts' policy: `decide`), then records how it ended.
 * The payload holds ids and the instant only: nothing an article says is
 * ever in its history.
 *
 * Persisted contract from its first release (see `./publish-post.ts`):
 * the tag, the payload, the idempotency key, the activity names `claim`,
 * `send/<n>` and `settle`, the clock names `send-at` and `retry/<n>`,
 * and every result schema.
 */
export const PublishArticleV1 = Workflow.make("PublishArticleV1", {
  idempotencyKey: ({ articleId, revision, round }) =>
    `${articleId}:${revision}:${round}`,
  payload: {
    articleId: ArticleIdSchema,
    at: Schema.DateTimeUtc,
    revision: Schema.Int,
    round: Schema.Int,
  },
  success: ArticleOutcomeSchema,
});

const attemptAt = (job: ArticleJob, dueAt: DateTime.Utc, attempt: number) =>
  Activity.make({
    execute: Effect.gen(function* sendAttempt() {
      // The same for every run of this attempt of this job.
      const idempotencyKey = yield* Activity.idempotencyKey(`send/${attempt}`);

      return yield* articleAttemptRun({
        articleId: job.articleId,
        attempt,
        dueAt,
        idempotencyKey,
        round: job.round,
      }).pipe(retryingDatabase);
    }),
    name: `send/${attempt}`,
    success: PublicationDecisionSchema,
  });

export const PublishArticleV1Live = PublishArticleV1.toLayer(
  Effect.fn("PublishArticleV1")(function* publishArticle({
    articleId,
    at,
    revision,
    round,
  }) {
    const job: ArticleJob = { articleId, revision, round };

    yield* sleepUntil("send-at", at);

    const claim = yield* Activity.make({
      execute: claimArticleRun(job, at).pipe(retryingDatabase),
      name: "claim",
      success: ArticleClaimSchema,
    }).annotate(ClusterSchema.WithTransaction, true);

    if (claim !== "claimed") {
      return claim === "missed" ? "failed" : "superseded";
    }

    let attempt = 1;
    let decision = yield* attemptAt(job, at, attempt);

    while (decision._tag === "retry") {
      yield* DurableClock.sleep({
        duration: decision.delay,
        inMemoryThreshold: Duration.zero,
        name: `retry/${attempt}`,
      });

      attempt += 1;
      decision = yield* attemptAt(job, at, attempt);
    }

    const { settlement } = decision;

    return yield* Activity.make({
      execute: settleArticleRun(job, settlement).pipe(retryingDatabase),
      name: "settle",
      success: ArticleOutcomeSchema,
    }).annotate(ClusterSchema.WithTransaction, true);
  })
);
