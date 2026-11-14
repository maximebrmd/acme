import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { ArticleId } from "#publishing/domain/article-id.ts";
import type {
  AttemptOutcome,
  EarlierRefusals,
} from "#publishing/domain/publication-policy.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { MediaAssetId } from "#shared/domain/ids.ts";

/** One attempt at sending an article, in one round. */
export interface ArticleCall {
  readonly articleId: ArticleId;
  readonly attempt: number;
  readonly idempotencyKey: string;
  readonly round: number;
  readonly startedAt: DateTime.Utc;
}

/** A file as the site keeps it: its id there, and its address. */
export interface SiteFile {
  readonly id: number;
  readonly sourceUrl: string;
}

/** What the journal knew of a call when it was about to be made. */
export type ArticleCallStart =
  // No run made it yet: make it.
  | { readonly _tag: "started" }
  // A run began it and stopped before the call that makes the post: it
  // never reached the site, and is made again.
  | { readonly _tag: "prepared"; readonly startedAt: DateTime.Utc }
  // A run made the call that makes the post, and never wrote how it
  // ended: it may have gone out, from `committedAt` on.
  | {
      readonly _tag: "inFlight";
      readonly committedAt: DateTime.Utc;
      readonly startedAt: DateTime.Utc;
    }
  // A run made it and wrote how it ended.
  | {
      readonly _tag: "completed";
      readonly finishedAt: DateTime.Utc;
      readonly outcome: AttemptOutcome;
      readonly startedAt: DateTime.Utc;
    };

/**
 * The record of every call that sends an article to its site. A run
 * writes the call down, and commits, before sending anything; a run that
 * finds it begun and not ended does not send it blindly again.
 */
export class ArticleJournal extends Context.Service<
  ArticleJournal,
  {
    readonly begin: (
      call: ArticleCall
    ) => Effect.Effect<ArticleCallStart, DatabaseError>;
    /**
     * The call that makes the post is about to leave: from now on, a run
     * that finds the call unfinished looks for the post rather than make
     * it again.
     */
    readonly committing: (
      idempotencyKey: string,
      at: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
    /** The files the article sent its site already, by the library's id. */
    readonly filesSent: (
      articleId: ArticleId
    ) => Effect.Effect<ReadonlyMap<MediaAssetId, SiteFile>, DatabaseError>;
    /** Records a file the site took for the article. */
    readonly fileSent: (
      articleId: ArticleId,
      mediaId: MediaAssetId,
      file: SiteFile
    ) => Effect.Effect<void, DatabaseError>;
    readonly finish: (
      idempotencyKey: string,
      outcome: AttemptOutcome,
      finishedAt: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
    /** How the round's attempts before this one were refused. */
    readonly earlierRefusals: (call: {
      readonly articleId: ArticleId;
      readonly attempt: number;
      readonly round: number;
    }) => Effect.Effect<EarlierRefusals, DatabaseError>;
    /** Whether a call to the site is in flight for one of the articles. */
    readonly inFlight: (
      articleIds: readonly ArticleId[]
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/publishing/application/ArticleJournal") {}
