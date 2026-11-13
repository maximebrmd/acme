import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

/** A workspace, with when it was made. */
export interface MadeWorkspace {
  readonly createdAt: DateTime.Utc;
  readonly workspaceId: WorkspaceId;
}

/**
 * Who owns workspaces, oldest owner first (by when they joined, then by
 * id), and when each workspace was made: what billing decides a
 * workspace's payer from. Reads only, and no permission check.
 */
export class WorkspaceOwners extends Context.Service<
  WorkspaceOwners,
  {
    /** The workspace's owners, the oldest first; none once it is gone. */
    readonly ownersOf: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly UserId[], DatabaseError>;
    /**
     * The owners of each of these workspaces, the oldest first, in one
     * read; one without an owner is left out.
     */
    readonly ownersIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<
      ReadonlyMap<WorkspaceId, readonly UserId[]>,
      DatabaseError
    >;
    /** The address the user signs in with, while the account is there. */
    readonly emailOf: (
      userId: UserId
    ) => Effect.Effect<Option.Option<string>, DatabaseError>;
    /**
     * The oldest owner of each of these workspaces, in one read; one
     * without an owner is left out.
     */
    readonly oldestIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, UserId>, DatabaseError>;
    /**
     * The workspaces whose oldest owner is the user, the oldest made
     * first (then by id).
     */
    readonly firstOwnedBy: (
      userId: UserId
    ) => Effect.Effect<readonly MadeWorkspace[], DatabaseError>;
    /**
     * When each of these workspaces was made, the oldest first (then by
     * id); one that is gone is left out.
     */
    readonly madeIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<readonly MadeWorkspace[], DatabaseError>;
    /**
     * The names of those of these workspaces the user is a member of; the
     * others are left out.
     */
    readonly namesShownTo: (
      userId: UserId,
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, string>, DatabaseError>;
  }
>()("peal-server/workspace/application/WorkspaceOwners") {}
