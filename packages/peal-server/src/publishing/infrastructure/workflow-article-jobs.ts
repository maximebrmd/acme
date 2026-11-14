import { DateTime, Effect, Layer } from "effect";
import { WorkflowEngine } from "effect/workflow";

import { ArticleJobs } from "#publishing/application/article-jobs.ts";

import { PublishArticleV1 } from "./workflows/publish-article.ts";

const anyInstant = DateTime.makeUnsafe(0);

/**
 * Starts and stops PublishArticleV1 executions. A start is a persisted
 * message: inside a TransactionRunner transaction it commits, or rolls
 * back, with the article, and the execution only runs after the commit.
 */
export const WorkflowArticleJobs = Layer.effect(
  ArticleJobs,
  Effect.gen(function* WorkflowArticleJobs() {
    const engine = yield* WorkflowEngine.WorkflowEngine;

    const withEngine = Effect.provideService(
      WorkflowEngine.WorkflowEngine,
      engine
    );

    return ArticleJobs.of({
      start: (job, at) =>
        PublishArticleV1.execute({ ...job, at }, { discard: true }).pipe(
          withEngine,
          Effect.asVoid
        ),
      stop: (job) =>
        Effect.gen(function* stop() {
          // The execution's key leaves the instant out: any names it.
          yield* PublishArticleV1.interrupt(
            yield* PublishArticleV1.executionId({ ...job, at: anyInstant })
          );
        }).pipe(withEngine),
    });
  })
);
