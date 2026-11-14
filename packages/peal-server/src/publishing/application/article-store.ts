import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { ArticleId } from "#publishing/domain/article-id.ts";
import type { Article } from "#publishing/domain/article.ts";
import type { ArticleStateName } from "#publishing/domain/invalid-article-transition.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId, UserId, WorkspaceId } from "#shared/domain/ids.ts";

/** Which of a workspace's articles to list, and which page of them. */
export interface ArticlePageRequest {
  /** The last article of the page before, if this is not the first. */
  readonly before: Option.Option<ArticleId>;
  readonly limit: number;
  readonly status: Option.Option<ArticleStateName>;
  readonly workspaceId: WorkspaceId;
}

/** A page of articles, newest first. */
export interface ArticlePage {
  readonly items: readonly Article[];
  /** Where the next page starts, if there is one. */
  readonly next: Option.Option<ArticleId>;
}

/**
 * The articles of every workspace. Reads that name a workspace only find
 * its own; `get` and `lock` are for the jobs, which act on articles by id.
 */
export class ArticleStore extends Context.Service<
  ArticleStore,
  {
    readonly insert: (article: Article) => Effect.Effect<void, DatabaseError>;
    /** Saves a changed article: whether it was still there. */
    readonly update: (
      article: Article
    ) => Effect.Effect<boolean, DatabaseError>;
    readonly ofWorkspace: (
      workspaceId: WorkspaceId,
      articleId: ArticleId
    ) => Effect.Effect<Option.Option<Article>, DatabaseError>;
    readonly get: (
      articleId: ArticleId
    ) => Effect.Effect<Option.Option<Article>, DatabaseError>;
    /**
     * The article, held until the transaction around this ends, so a job
     * and a member never change it at once.
     */
    readonly lock: (
      articleId: ArticleId
    ) => Effect.Effect<Option.Option<Article>, DatabaseError>;
    /** Deletes it with its journal: whether it was there. */
    readonly remove: (
      workspaceId: WorkspaceId,
      articleId: ArticleId
    ) => Effect.Effect<boolean, DatabaseError>;
    readonly page: (
      request: ArticlePageRequest
    ) => Effect.Effect<ArticlePage, DatabaseError>;
    /**
     * The workspace's articles, held until the transaction around this
     * ends: for its erasure.
     */
    readonly lockWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly Article[], DatabaseError>;
    /** Deletes every article of the workspace, and their journals. */
    readonly removeWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /** Forgets the member as the author of the articles they wrote. */
    readonly forgetAuthor: (
      userId: UserId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Which of the site's post ids articles of the channel are recorded
     * to have made: a search on the site never adopts another's.
     */
    readonly recordedOn: (
      channelId: ChannelId,
      platformPostIds: readonly string[]
    ) => Effect.Effect<ReadonlySet<string>, DatabaseError>;
  }
>()("peal-server/publishing/application/ArticleStore") {}
