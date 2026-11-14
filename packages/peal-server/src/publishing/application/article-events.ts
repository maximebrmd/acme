import { Context, Effect, Layer } from "effect";

import type { Article } from "#publishing/domain/article.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

/**
 * Hears how an article ended on its site, in the transaction that settles
 * it, for the workspace's webhook endpoints.
 */
export class ArticleEvents extends Context.Service<
  ArticleEvents,
  {
    readonly published: (
      article: Article
    ) => Effect.Effect<void, DatabaseError>;
    readonly failed: (article: Article) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/publishing/application/ArticleEvents") {
  /** Tells nobody: for tests that follow no article. */
  static readonly none = Layer.succeed(
    ArticleEvents,
    ArticleEvents.of({
      failed: () => Effect.void,
      published: () => Effect.void,
    })
  );
}
