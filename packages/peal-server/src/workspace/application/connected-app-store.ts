import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

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

/** What a client's live grants for a user give it in one workspace. */
export interface ClientGrant {
  /** Whether a grant names the workspace, as an MCP client's does. */
  readonly bound: boolean;
  readonly scopes: readonly string[];
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
     * What the client may do now for the user in the workspace: the scopes
     * of the user's consents and live tokens for it that are bound to the
     * workspace or to none (as the command line's are), and whether one is
     * bound to it. None when nothing of the client's lets it in there.
     */
    readonly grantIn: (
      userId: UserId,
      clientId: string,
      workspaceId: WorkspaceId,
      now: DateTime.Utc
    ) => Effect.Effect<Option.Option<ClientGrant>, DatabaseError>;
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
