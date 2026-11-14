import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { ArticleId } from "#publishing/domain/article-id.ts";
import type { Article } from "#publishing/domain/article.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import type { PublishResult } from "#shared/domain/publish-result.ts";

/** Send this article to its site. */
export interface SitePublishRequest {
  readonly articleId: ArticleId;
  /** The same for every run of one attempt, different for each attempt. */
  readonly idempotencyKey: string;
  /** When the attempt's call started, as the journal recorded it. */
  readonly startedAt: DateTime.Utc;
  /**
   * Records that the call that makes the post leaves now, and when: the
   * adapter runs it just before that call, and looks for a post changed
   * since then when its answer is lost. A run that stopped before it is
   * made again.
   */
  readonly committing: Effect.Effect<DateTime.Utc, DatabaseError>;
}

/**
 * Sends articles to the websites their channels are on. As
 * `PlatformPublisher` does for posts, an adapter answers what it knows:
 * published, refused (nothing is on the site), or unconfirmed when the
 * post may have been made without an answer; it never sends again a call
 * that may have reached the site.
 */
export class SitePublisher extends Context.Service<
  SitePublisher,
  {
    readonly publish: (
      request: SitePublishRequest
    ) => Effect.Effect<PublishResult, PublishFailure>;
    /**
     * An earlier run of the attempt began the call and stopped before it
     * recorded how it ended: the site is searched for the post, which is
     * never made again; one Peal cannot find is unconfirmed.
     */
    readonly resume: (
      request: SitePublishRequest
    ) => Effect.Effect<PublishResult, PublishFailure>;
    /**
     * Looks for the post a call made from `startedAt` on, never making
     * one: it, none found, or the search failing.
     */
    readonly find: (
      request: SitePublishRequest
    ) => Effect.Effect<Option.Option<PublishResult>, PublishFailure>;
    /** Moves the article's post to the site's trash. */
    readonly remove: (
      article: Article,
      platformPostId: string
    ) => Effect.Effect<void, PublishFailure>;
    /** Sends the article's content again over its post on the site. */
    readonly update: (
      article: Article,
      platformPostId: string
    ) => Effect.Effect<void, PublishFailure>;
  }
>()("peal-server/publishing/application/SitePublisher") {}
