import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, Uuid7, WorkspaceId } from "#shared/domain/ids.ts";

/** A workspace in a partner's pool, and the partner's home workspace. */
export interface PartnerPool {
  readonly home: WorkspaceId;
  readonly partnerId: Uuid7;
}

/** A workspace, with when it was made. */
export interface Made {
  readonly createdAt: DateTime.Utc;
  readonly workspaceId: WorkspaceId;
}

/**
 * What decides who pays for a workspace, from the workspace context: the
 * partner whose pool it is in, and its owners, the oldest first. Reads
 * only: the account itself is billing's.
 */
export class AccountPayers extends Context.Service<
  AccountPayers,
  {
    /** The partner whose home it is, or that owns it, if any. */
    readonly partnerOf: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<PartnerPool>, DatabaseError>;
    /**
     * The other workspaces of the partner pool the workspace is in, as the
     * workspace context holds it now, holding nothing; none outside one.
     */
    readonly partnerPoolOf: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<readonly WorkspaceId[]>, DatabaseError>;
    /** The partner pool of each of these workspaces in one; others left out. */
    readonly partnersIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, PartnerPool>, DatabaseError>;
    /** The owners of each of these workspaces, the oldest first. */
    readonly ownersIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<
      ReadonlyMap<WorkspaceId, readonly UserId[]>,
      DatabaseError
    >;
    /** The address the person signs in with, while their account is there. */
    readonly emailOf: (
      userId: UserId
    ) => Effect.Effect<Option.Option<string>, DatabaseError>;
    /** The workspace's owners, the oldest first. */
    readonly ownersOf: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly UserId[], DatabaseError>;
    /** The workspaces whose oldest owner is the user, the oldest made first. */
    readonly firstOwnedBy: (
      userId: UserId
    ) => Effect.Effect<readonly Made[], DatabaseError>;
    /** When each of these workspaces was made, the oldest first. */
    readonly madeIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<readonly Made[], DatabaseError>;
    /** The names of those of these workspaces the user is a member of. */
    readonly namesShownTo: (
      userId: UserId,
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, string>, DatabaseError>;
  }
>()("peal-server/billing/application/AccountPayers") {}
