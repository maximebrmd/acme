import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { ConnectChoice } from "#channels/domain/connect-choice.ts";
import type { Platform } from "#channels/domain/platform.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import type { EncryptedToken } from "./token-cipher.ts";

/** A choice as stored, with its accounts and their tokens encrypted. */
export interface StoredChoice {
  readonly accounts: EncryptedToken;
  readonly choice: ConnectChoice;
}

/**
 * Accounts offered to a member after a sign-in that reached several, until
 * the member chooses or the choice expires, whichever comes first.
 */
export class ConnectChoices extends Context.Service<
  ConnectChoices,
  {
    readonly save: (
      choice: ConnectChoice,
      accounts: EncryptedToken
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Removes and returns the choice `selection` names, if it was offered
     * for the platform in the workspace to `startedBy`; anyone else's stays.
     * Taking it removes it, so a member chooses once.
     */
    readonly take: (
      selection: string,
      owner: {
        readonly platform: Platform;
        readonly startedBy: string;
        readonly workspaceId: WorkspaceId;
      }
    ) => Effect.Effect<Option.Option<StoredChoice>, DatabaseError>;
    /** Removes the choices expired by `now`, and says how many. */
    readonly purgeExpired: (
      now: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
  }
>()("acme-server/channels/application/ConnectChoices") {}
