import { DateTime, Effect, Option, Schedule, Schema } from "effect";

import type { ArticleId } from "#publishing/domain/article-id.ts";
import { claimed, settled } from "#publishing/domain/article.ts";
import { ownRefusalCodes } from "#publishing/domain/own-refusals.ts";
import { decide } from "#publishing/domain/publication-policy.ts";
import type {
  AttemptOutcome,
  PublicationDecision,
} from "#publishing/domain/publication-policy.ts";
import type { TargetSettlement } from "#publishing/domain/target-settlement.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";

import { ArticleEvents } from "./article-events.ts";
import type { ArticleJob } from "./article-jobs.ts";
import { ArticleJournal } from "./article-journal.ts";
import { ArticleSendTurns } from "./article-send-turns.ts";
import { ArticleStore } from "./article-store.ts";
import { SitePublisher } from "./site-publisher.ts";
import type { SitePublishRequest } from "./site-publisher.ts";
import { withinPlan } from "./within-plan.ts";

// The steps of the job that sends an article (`PublishArticleV1`): claim
// it, make attempts until one settles it, record how it ended. Their
// results are stored in the job's history: persisted contract.

/** What the job found when it came to send the article. */
export const ArticleClaimSchema = Schema.Literals([
  // It is the job's to send: attempts follow.
  "claimed",
  // Too late to send, as after the server was down: failed as missed.
  "missed",
  // Rescheduled, sent again in a later round, sent already, or gone.
  "superseded",
]);

export type ArticleClaim = typeof ArticleClaimSchema.Type;

/** How the job ended. */
export const ArticleOutcomeSchema = Schema.Literals([
  "published",
  "failed",
  "unconfirmed",
  "superseded",
]);

export type ArticleOutcome = typeof ArticleOutcomeSchema.Type;

// A write under the article's row lock: it cannot miss.
const written = <E, R>(update: Effect.Effect<boolean, E, R>) =>
  update.pipe(
    Effect.flatMap((saved) =>
      saved ? Effect.void : Effect.die("An article changed under its row lock")
    )
  );

/** Takes the article to send it, in a transaction, or says why not. */
export const claimArticleRun = Effect.fn("Articles.claimRun")(
  function* claimArticleRun(job: ArticleJob, dueAt: DateTime.Utc) {
    const store = yield* ArticleStore;
    const events = yield* ArticleEvents;
    const { transaction } = yield* TransactionRunner;

    return yield* transaction(
      Effect.gen(function* claimInTransaction() {
        const locked = yield* store.lock(job.articleId);

        if (Option.isNone(locked)) {
          const gone: ArticleClaim = "superseded";

          return gone;
        }

        const claim = claimed(locked.value, job, dueAt, yield* DateTime.now);

        if (claim._tag === "superseded") {
          return claim._tag;
        }

        yield* written(store.update(claim.article, locked.value));

        if (claim._tag === "missed") {
          yield* events.failed(claim.article);
        }

        return claim._tag;
      })
    );
  }
);

// How the call ended lives only in memory until the journal has it: that
// one write is retried on its own while the database refuses it.
const outcomeWriteRetry = Schedule.min([
  Schedule.exponential("200 millis", 2),
  Schedule.spaced("1 minute"),
]);

// The adapter failed during the call, after the request may have left.
const adapterFailed: AttemptOutcome = {
  _tag: "unconfirmed",
  reason: "adapterFailure",
};

// The workspace holds more channels or members than its plan allows.
const planRefusal: AttemptOutcome = new BadRequest({
  code: ownRefusalCodes.planLimit,
});

/** One attempt at sending the article in its round. */
export interface ArticleAttempt {
  readonly articleId: ArticleId;
  readonly attempt: number;
  /** When Peal was due to send it, from which its deadlines count. */
  readonly dueAt: DateTime.Utc;
  readonly idempotencyKey: string;
  readonly round: number;
}

/**
 * Makes one attempt and decides what follows. The journal's row is
 * written, and committed, before the site is called: a run that finds it
 * begun and not ended asks the publisher to resume it, which looks for
 * the post on the site and never makes it again; a row that ended answers
 * what it recorded, so a run after a crash decides as the first did.
 */
export const articleAttemptRun = Effect.fn("Articles.attemptRun")(
  function* articleAttemptRun(attempt: ArticleAttempt) {
    const journal = yield* ArticleJournal;
    const publisher = yield* SitePublisher;
    const store = yield* ArticleStore;
    const turns = yield* ArticleSendTurns;

    const article = yield* store.get(attempt.articleId);

    // Deleted while the job waited: nothing is sent.
    if (Option.isNone(article)) {
      const gone: PublicationDecision = {
        _tag: "settle",
        settlement: { _tag: "cancelled" },
      };

      return gone;
    }

    const now = yield* DateTime.now;

    // A workspace over its plan sends nothing, as its posts do not.
    const overPlan = yield* withinPlan(article.value.workspaceId).pipe(
      Effect.as(false),
      Effect.catchTag("PlanLimitReached", () => Effect.succeed(true))
    );

    if (overPlan) {
      return decide(planRefusal, {
        earlier: { rateLimited: 0, unavailable: 0 },
        sinceScheduled: DateTime.distance(attempt.dueAt, now),
        startedAt: now,
      });
    }

    const start = yield* journal.begin({
      articleId: attempt.articleId,
      attempt: attempt.attempt,
      idempotencyKey: attempt.idempotencyKey,
      round: attempt.round,
      startedAt: now,
    });

    // A run that stopped before the call that makes the post makes the
    // attempt again, from now: nothing of it reached the site.
    const startedAt =
      start._tag === "started" || start._tag === "prepared"
        ? now
        : start.startedAt;

    const request: SitePublishRequest = {
      articleId: attempt.articleId,
      committing: DateTime.now.pipe(
        Effect.tap((at) => journal.committing(attempt.idempotencyKey, at))
      ),
      idempotencyKey: attempt.idempotencyKey,
      startedAt: start._tag === "inFlight" ? start.committedAt : startedAt,
    };

    // The call, and the journal's record of how it ended, in the
    // channel's turn: no other attempt looks for its post on the site
    // before this one recorded it.
    const { finishedAt, outcome } =
      start._tag === "completed"
        ? start
        : yield* turns.inTurn(
            article.value.channelId,
            (start._tag === "inFlight"
              ? publisher.resume(request)
              : publisher.publish(request)
            ).pipe(
              Effect.catch((error) => Effect.succeed(error)),
              Effect.catchDefect(() => Effect.succeed(adapterFailed)),
              Effect.flatMap((ended: AttemptOutcome) =>
                DateTime.now.pipe(
                  Effect.tap((at) =>
                    journal
                      .finish(attempt.idempotencyKey, ended, at)
                      .pipe(Effect.retry(outcomeWriteRetry))
                  ),
                  Effect.map((at) => ({ finishedAt: at, outcome: ended }))
                )
              )
            )
          );

    const earlier = yield* journal.earlierRefusals(attempt);

    const decision: PublicationDecision = decide(outcome, {
      earlier,
      sinceScheduled: DateTime.distance(attempt.dueAt, finishedAt),
      startedAt,
    });

    return decision;
  }
);

/** Records how the article ended, in a transaction, and tells of it. */
export const settleArticleRun = Effect.fn("Articles.settleRun")(
  function* settleArticleRun(job: ArticleJob, settlement: TargetSettlement) {
    const store = yield* ArticleStore;
    const events = yield* ArticleEvents;
    const { transaction } = yield* TransactionRunner;

    return yield* transaction(
      Effect.gen(function* settleInTransaction() {
        const locked = yield* store.lock(job.articleId);
        const superseded: ArticleOutcome = "superseded";

        if (Option.isNone(locked)) {
          return superseded;
        }

        const article = locked.value;

        if (
          article.state._tag !== "publishing" ||
          article.revision !== job.revision ||
          article.round !== job.round
        ) {
          return superseded;
        }

        const next = settled(article, settlement, yield* DateTime.now);

        yield* written(store.update(next, article));

        const { state } = next;

        if (state._tag === "published") {
          yield* events.published(next);

          return "published" satisfies ArticleOutcome;
        }

        if (state._tag === "failed") {
          yield* events.failed(next);

          return "failed" satisfies ArticleOutcome;
        }

        return state._tag === "unconfirmed"
          ? ("unconfirmed" satisfies ArticleOutcome)
          : superseded;
      })
    );
  }
);
