import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId } from "#shared/domain/ids.ts";

/** An OAuth client the user let act for them, and what it may do. */
export interface ConnectedAppRecord {
  readonly authorizedAt: DateTime.Utc;
  readonly clientId: string;
  readonly lastUsedAt: DateTime.Utc | null;
  readonly name: string | null;
  readonly scopes: readonly string[];
  readonly uri: string | null;
  readonly workspaces: readonly {
    readonly id: string;
    readonly name: string | null;
  }[];
}

/**
 * The OAuth clients acting for users: those a user agreed to, and those
 * still holding one of their refresh tokens, as the command line does.
 */
export class ConnectedAppStore extends Context.Service<
  ConnectedAppStore,
  {
    /** The user's connected clients, most recently authorized first. */
    readonly list: (
      userId: UserId,
      now: DateTime.Utc
    ) => Effect.Effect<readonly ConnectedAppRecord[], DatabaseError>;
    /**
     * Withdraws the user's consents to the client and deletes the tokens it
     * holds for them. Whether there was any.
     */
    readonly revoke: (
      userId: UserId,
      clientId: string,
      now: DateTime.Utc
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/workspace/application/ConnectedAppStore") {}
