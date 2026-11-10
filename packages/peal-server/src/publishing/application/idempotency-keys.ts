import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { PostId, WorkspaceId } from "#shared/domain/ids.ts";

/**
 * A request that names itself, so that sending it again makes nothing new:
 * the key its client chose, and the request as it was sent, in a form that
 * is the same every time the same request comes.
 */
export interface KeyedRequest {
  readonly fingerprint: string;
  readonly key: string;
}

/** What a key was used for: the post, and whether by this very request. */
export interface KeyUse {
  readonly postId: PostId;
  readonly sameRequest: boolean;
}

/**
 * The idempotency keys of requests that made posts, by workspace. Only a
 * digest of each key and of its request is kept, never the key, which its
 * client chose, nor what the request said.
 */
export class IdempotencyKeys extends Context.Service<
  IdempotencyKeys,
  {
    /** What the workspace's key was used for after `since`, if it was. */
    readonly find: (
      workspaceId: WorkspaceId,
      request: KeyedRequest,
      since: DateTime.Utc
    ) => Effect.Effect<Option.Option<KeyUse>, DatabaseError>;
    /**
     * Keeps the key for the post, in the caller's transaction, unless it
     * was used after `since`: it then answers that use, and keeps nothing.
     * A claim of the same key in a transaction still open is waited for,
     * so of two requests sent together one claims and the other finds it.
     */
    readonly claim: (
      workspaceId: WorkspaceId,
      request: KeyedRequest,
      use: { readonly at: DateTime.Utc; readonly postId: PostId },
      since: DateTime.Utc
    ) => Effect.Effect<Option.Option<KeyUse>, DatabaseError>;
    /** Deletes the keys used at `before` or earlier, and says how many. */
    readonly purge: (
      before: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/publishing/application/IdempotencyKeys") {}
