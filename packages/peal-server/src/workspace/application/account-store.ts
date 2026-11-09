import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { IdentificationRecord } from "#shared/application/personal-data.ts";
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
    /**
     * Each workspace the user belongs to, with its members' roles. In a
     * transaction, those workspaces stay locked until it ends: nobody joins
     * them, and no other account's closure reads them, meanwhile.
     */
    readonly standings: (
      userId: UserId
    ) => Effect.Effect<readonly MembershipStanding[], DatabaseError>;
    /**
     * The workspace, if it exists. In a transaction, it stays locked until
     * it ends, as `standings` locks it.
     */
    readonly workspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<WorkspaceSummary>, DatabaseError>;
    /**
     * Deletes the workspace with its members and invitations, its API keys,
     * which stop working, the OAuth grants bound to it, and the sign-in
     * service's copy of its subscriptions.
     */
    readonly deleteWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Who holds the account and how they sign in, as the law has Peal keep
     * it once the account closes: its name, address and creation, each
     * sign-in method's account id (never its password), and the Stripe
     * customers of the account and of `workspaceIds`, the workspaces its
     * closure deletes. Read before deleting them.
     */
    readonly identification: (
      userId: UserId,
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<Option.Option<IdentificationRecord>, DatabaseError>;
    /**
     * Deletes the user with their sessions, those they opened as staff to
     * act as someone else included, sign-in methods, memberships, the
     * invitations they sent or that await their address, and what they let
     * OAuth clients do.
     */
    readonly deleteUser: (userId: UserId) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/workspace/application/AccountStore") {}
