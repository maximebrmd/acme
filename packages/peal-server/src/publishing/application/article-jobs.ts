import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { ArticleId } from "#publishing/domain/article-id.ts";

/** The job that sends one revision of an article, in one round. */
export interface ArticleJob {
  readonly articleId: ArticleId;
  readonly revision: number;
  readonly round: number;
}

/**
 * Starts and stops the jobs that send articles. A start inside a
 * TransactionRunner transaction commits, or rolls back, with the article.
 */
export class ArticleJobs extends Context.Service<
  ArticleJobs,
  {
    /** Sends the article at `at`, unless superseded by then. */
    readonly start: (job: ArticleJob, at: DateTime.Utc) => Effect.Effect<void>;
    readonly stop: (job: ArticleJob) => Effect.Effect<void>;
  }
>()("peal-server/publishing/application/ArticleJobs") {}
