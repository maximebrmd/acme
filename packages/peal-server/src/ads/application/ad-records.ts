import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { AdsRecord } from "#shared/application/personal-data.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

import type { BoostsRunning } from "./boosts-running.ts";

/**
 * What ads keep of a workspace or a user, for the workspace context when
 * their data is exported or erased. Erasing runs in the caller's
 * transaction, if any.
 */
export class AdRecords extends Context.Service<
  AdRecords,
  {
    /**
     * Refuses while a boost of the workspace runs, may run or is being
     * made: erasing would leave it spending at its network with nobody to
     * stop it from Peal.
     */
    readonly ensureErasable: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, BoostsRunning | DatabaseError>;
    /** The workspace's ad accounts, sign-ins, boosts and audit trail. */
    readonly exportWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<AdsRecord, DatabaseError>;
    /**
     * Deletes the workspace's sign-ins with their encrypted tokens, its ad
     * accounts, what was read of them, its boosts, their journal and its
     * audit trail. What runs at the network is left as it is.
     */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Clears a closed account's id from what stays with the workspaces it
     * shared: the sign-ins it made, the accounts it connected, the
     * spending it allowed, the boosts it asked for and the audit trail's
     * lines; and drops its sign-ins in progress.
     */
    readonly forgetUser: (userId: UserId) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/ads/application/AdRecords") {}
