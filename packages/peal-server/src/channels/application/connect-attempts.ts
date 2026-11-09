import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { ConnectAttempt } from "#channels/domain/connect-attempt.ts";
import type { Platform } from "#channels/domain/platform.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import type { EncryptedToken } from "./token-cipher.ts";

/** An attempt as stored, with its secret still encrypted. */
export interface StoredAttempt {
  readonly attempt: ConnectAttempt;
  readonly secret: EncryptedToken;
}

/**
 * Sign-ins in progress, between the start of a connection and its callback.
 * Each is kept until its callback or its expiry, whichever comes first.
 */
export class ConnectAttempts extends Context.Service<
  ConnectAttempts,
  {
    readonly save: (
      attempt: ConnectAttempt,
      secret: EncryptedToken
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Removes and returns the attempt `state` names, if it was started for
     * the platform in the workspace by `startedBy`; an attempt of anyone
     * else, or for another platform, stays where it is. Taking it removes it,
     * so a callback completes it once.
     */
    readonly take: (
      state: string,
      owner: {
        readonly platform: Platform;
        readonly startedBy: string;
        readonly workspaceId: WorkspaceId;
      }
    ) => Effect.Effect<Option.Option<StoredAttempt>, DatabaseError>;
    /** Removes the attempts expired by `now`, and says how many. */
    readonly purgeExpired: (
      now: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
  }
>()("acme-server/channels/application/ConnectAttempts") {}
