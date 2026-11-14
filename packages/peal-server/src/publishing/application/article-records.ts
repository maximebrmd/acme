import { Context, Effect, Layer, Option, Schema } from "effect";

import { ArticleBodySchema } from "#publishing/domain/article-body.ts";
import { ArticleStateSchema } from "#publishing/domain/article.ts";
import type { Article } from "#publishing/domain/article.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ArticleRecord } from "#shared/application/personal-data.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

import { ArticleJobs } from "./article-jobs.ts";
import { ArticleJournal } from "./article-journal.ts";
import { ArticleStore } from "./article-store.ts";
import { PostsPublishing } from "./posts-publishing.ts";

const encodeBody = Schema.encodeSync(Schema.toCodecJson(ArticleBodySchema));

const encodeState = Schema.encodeSync(Schema.toCodecJson(ArticleStateSchema));

const recordOf = (article: Article): ArticleRecord => ({
  body: encodeBody(article.content.body),
  categories: article.content.categories,
  channelId: article.channelId,
  coverMediaId: Option.getOrNull(article.content.coverMediaId),
  createdAt: article.createdAt,
  excerpt: Option.getOrNull(article.content.excerpt),
  id: article.id,
  siteStatus: article.content.siteStatus,
  state: encodeState(article.state),
  tags: article.content.tags,
  title: article.content.title,
  updatedAt: article.updatedAt,
});

/**
 * A workspace's articles for the workspace context, when its data is
 * exported or erased, and a member's when they leave. Erasing stops the
 * jobs of the articles that wait, in the transaction that deletes them,
 * and is refused while a call to a site is in flight for one of them
 * (PostsPublishing, as for posts).
 */
export class ArticleRecords extends Context.Service<
  ArticleRecords,
  {
    readonly exportWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly ArticleRecord[], DatabaseError>;
    readonly ensureErasable: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError | PostsPublishing>;
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError | PostsPublishing>;
    /** The articles stay with their workspaces, without an author. */
    readonly forgetAuthor: (
      userId: UserId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/publishing/application/ArticleRecords") {
  static readonly layer = Layer.effect(
    ArticleRecords,
    Effect.gen(function* ArticleRecordsLive() {
      const store = yield* ArticleStore;
      const journal = yield* ArticleJournal;
      const jobs = yield* ArticleJobs;
      const { transaction } = yield* TransactionRunner;

      // The workspace's articles, under their locks, unless one is being
      // sent: a job that woke claims its article before this reads it, or
      // finds it gone after.
      const held = Effect.fn("ArticleRecords.held")(function* held(
        workspaceId: WorkspaceId
      ) {
        const all = yield* store.lockWorkspace(workspaceId);

        if (yield* journal.inFlight(all.map(({ id }) => id))) {
          return yield* new PostsPublishing({ workspaceId });
        }

        return all;
      });

      return ArticleRecords.of({
        ensureErasable: (workspaceId) =>
          transaction(held(workspaceId).pipe(Effect.asVoid)),
        eraseWorkspace: (workspaceId) =>
          transaction(
            Effect.gen(function* erasing() {
              for (const article of yield* held(workspaceId)) {
                if (article.state._tag === "scheduled") {
                  yield* jobs.stop({
                    articleId: article.id,
                    revision: article.revision,
                    round: article.round,
                  });
                }
              }

              yield* store.removeWorkspace(workspaceId);
            })
          ),
        exportWorkspace: (workspaceId) =>
          Effect.gen(function* exporting() {
            const records: ArticleRecord[] = [];
            let before = Option.none<Article["id"]>();

            for (;;) {
              const page = yield* store.page({
                before,
                limit: 100,
                status: Option.none(),
                workspaceId,
              });

              records.push(...page.items.map(recordOf));

              if (Option.isNone(page.next)) {
                return records;
              }

              before = page.next;
            }
          }),
        forgetAuthor: (userId) => store.forgetAuthor(userId),
      });
    })
  );
}
