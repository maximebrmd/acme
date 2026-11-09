import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Locale } from "#shared/domain/locale.ts";
import type { MembershipStanding } from "#workspace/domain/account-closure.ts";

/** A workspace, as its settings and exports name it. */
export interface WorkspaceSummary {
  readonly createdAt: DateTime.Utc;
  readonly id: WorkspaceId;
  readonly name: string;
  readonly slug: string;
}

/** An invitation to a workspace, sent by or to the user. */
export interface InvitationRecord {
  readonly createdAt: DateTime.Utc;
  readonly email: string;
  readonly expiresAt: DateTime.Utc;
  readonly role: string | null;
  readonly status: string;
  readonly workspaceId: string;
  readonly workspaceName: string;
}

/**
 * What the sign-in service keeps about a user: their profile, how they sign
 * in, their sessions, memberships and invitations. Never a secret: no
 * password hash, nor any token.
 */
export interface AccountRecords {
  readonly invitationsReceived: readonly InvitationRecord[];
  readonly invitationsSent: readonly InvitationRecord[];
  readonly memberships: readonly {
    readonly joinedAt: DateTime.Utc;
    readonly role: string;
    readonly workspaceId: string;
    readonly workspaceName: string;
  }[];
  readonly sessions: readonly {
    readonly createdAt: DateTime.Utc;
    readonly expiresAt: DateTime.Utc;
    readonly ipAddress: string | null;
    readonly updatedAt: DateTime.Utc;
    readonly userAgent: string | null;
  }[];
  readonly signInMethods: readonly {
    readonly createdAt: DateTime.Utc;
    readonly provider: string;
    readonly updatedAt: DateTime.Utc;
  }[];
  readonly user: {
    readonly createdAt: DateTime.Utc;
    readonly email: string;
    readonly emailVerified: boolean;
    readonly id: UserId;
    readonly image: string | null;
    readonly locale: Locale;
    readonly name: string;
    readonly updatedAt: DateTime.Utc;
  };
}

/**
 * Accounts and workspaces as wholes, in the sign-in service's tables: what
 * exporting an account reads, and what deleting a workspace or an account
 * removes. Deletions run in the caller's transaction, so they commit with
 * the other contexts' erasures, or not at all.
 */
export class AccountStore extends Context.Service<
  AccountStore,
  {
    readonly records: (
      userId: UserId
    ) => Effect.Effect<Option.Option<AccountRecords>, DatabaseError>;
    /** Each workspace the user belongs to, with its members' roles. */
    readonly standings: (
      userId: UserId
    ) => Effect.Effect<readonly MembershipStanding[], DatabaseError>;
    readonly workspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<WorkspaceSummary>, DatabaseError>;
    /**
     * Deletes the workspace with its members and invitations, its API keys,
     * which stop working, and the OAuth grants bound to it.
     */
    readonly deleteWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Deletes the user with their sessions, sign-in methods, memberships,
     * the invitations they sent or that await their address, and what they
     * let OAuth clients do.
     */
    readonly deleteUser: (userId: UserId) => Effect.Effect<void, DatabaseError>;
  }
>()("acme-server/workspace/application/AccountStore") {}
