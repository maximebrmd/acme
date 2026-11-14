import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

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

/** A call that never wrote how it ended. */
export interface UnfinishedCall {
  readonly idempotencyKey: string;
  /** When the post's call left, if it did: it may be on the site. */
  readonly committedAt: Option.Option<DateTime.Utc>;
}

/** A file as the site keeps it: its id there, and its address. */
export interface SiteFile {
  readonly id: number;
  readonly sourceUrl: string;
  /** The site dropped it as the featured image, even sent again. */
  readonly featuredRefused?: boolean;
}

/** What the journal knew of a call when it was about to be made. */
export type ArticleCallStart =
  // No run made it yet: make it.
  | { readonly _tag: "started" }
  // A run began it and stopped before the call that makes the post: it
  // never reached the site, and is made again.
  | {
      readonly _tag: "prepared";
      /** The key the row was written under, which its marks name. */
      readonly idempotencyKey: string;
      readonly startedAt: DateTime.Utc;
    }
  // A run made the call that makes the post, and never wrote how it
  // ended: it may have gone out, from `committedAt` on.
  | {
      readonly _tag: "inFlight";
      readonly committedAt: DateTime.Utc;
      readonly idempotencyKey: string;
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
     * The calls of the round's earlier attempts that never wrote how they
     * ended, oldest first: one an attempt left when it gave its turn
     * back, or a run that stopped.
     */
    readonly unfinishedBefore: (call: {
      readonly articleId: ArticleId;
      readonly attempt: number;
      readonly round: number;
    }) => Effect.Effect<readonly UnfinishedCall[], DatabaseError>;
    /**
     * When the latest call of an earlier round that may have reached the
     * site, and was never found there, left: what "Send again" looks for
     * before it sends.
     */
    readonly toCheckBefore: (call: {
      readonly articleId: ArticleId;
      readonly round: number;
    }) => Effect.Effect<Option.Option<DateTime.Utc>, DatabaseError>;
    /** Forgets a call that never reached the site. */
    readonly drop: (
      idempotencyKey: string
    ) => Effect.Effect<void, DatabaseError>;
    /** What the journal holds of the call, without writing it down. */
    readonly found: (call: {
      readonly articleId: ArticleId;
      readonly attempt: number;
      readonly round: number;
    }) => Effect.Effect<Option.Option<ArticleCallStart>, DatabaseError>;
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
    /**
     * Forgets a file the article sent its site, which the site no longer
     * has: it is sent again.
     */
    readonly forgetFile: (
      articleId: ArticleId,
      mediaId: MediaAssetId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Records that the site drops the file as the featured image, even
     * sent again: it is not offered as one any more.
     */
    readonly featuredRefused: (
      articleId: ArticleId,
      mediaId: MediaAssetId
    ) => Effect.Effect<void, DatabaseError>;
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
