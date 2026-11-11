import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";

/** A resumable upload of one publishing call, as its runs journal it. */
export interface UploadSession {
  readonly byteSize: number;
  /**
   * Whether a run began sending the part that holds the last byte: from
   * then on the platform may have made the video, even when the session no
   * longer answers.
   */
  readonly finalPartSent: boolean;
  /**
   * Whether a run set the video's thumbnail (YouTube's thumbnails.set),
   * which a resumed run then does not set, nor pay for, again.
   */
  readonly thumbnailSet: boolean;
  /** Where the bytes go, until the platform made the video. */
  readonly sessionUrl: Option.Option<string>;
  /** The video the upload made, once a run learned of it. */
  readonly videoId: Option.Option<string>;
}

/**
 * The resumable uploads of publishing calls, by the call's idempotency
 * key: a run saves the session the platform opened, and commits it, before
 * it sends any byte, so a run that finds the call in flight resumes it
 * rather than uploading again. They go with the journal's call.
 */
export class UploadSessions extends Context.Service<
  UploadSessions,
  {
    readonly find: (
      idempotencyKey: string
    ) => Effect.Effect<Option.Option<UploadSession>, DatabaseError>;
    /**
     * Saves the session a platform opened for the call, replacing one that
     * expired before its last part was sent.
     */
    readonly open: (
      idempotencyKey: string,
      session: {
        readonly byteSize: number;
        readonly openedAt: DateTime.Utc;
        readonly sessionUrl: string;
      }
    ) => Effect.Effect<void, DatabaseError>;
    /** Records that the part holding the last byte is about to leave. */
    readonly finalPartSent: (
      idempotencyKey: string
    ) => Effect.Effect<void, DatabaseError>;
    /** Records that the video's thumbnail is set. */
    readonly thumbnailSet: (
      idempotencyKey: string
    ) => Effect.Effect<void, DatabaseError>;
    /** Records the video the upload made, and forgets where bytes went. */
    readonly made: (
      idempotencyKey: string,
      videoId: string
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/publishing/application/UploadSessions") {}
