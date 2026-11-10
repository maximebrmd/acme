import { Context } from "effect";
import type { Effect } from "effect";

import type { ReductionRefused } from "#billing/domain/reduction-refused.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

/** What keeping only some members did. */
export interface MembersKept {
  /** The members removed. */
  readonly removed: number;
  /** The pending invitations revoked. */
  readonly revoked: number;
}

/**
 * What a workspace over its plan holds, and letting go of it, through the
 * contexts that hold each thing and as the member who chose: channels are
 * disconnected by the channels context, with the platforms' revocations,
 * and members removed by the workspace context, under its own rules.
 */
export class WorkspaceHoldings extends Context.Service<
  WorkspaceHoldings,
  {
    /** The ids of the channels connected to the actor's workspace. */
    readonly channels: (
      actor: Actor
    ) => Effect.Effect<readonly string[], DatabaseError | MissingPermission>;
    /** Disconnects a channel of the workspace; one already gone is left. */
    readonly disconnect: (
      actor: Actor,
      channelId: string
    ) => Effect.Effect<void, DatabaseError | MissingPermission>;
    /**
     * Whether the actor is a member of the workspace now, read again: a
     * request let in as a member may find another member's choice removed
     * them since.
     */
    readonly present: (actor: Actor) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Removes every member but those kept, and revokes the pending
     * invitations, or refuses the whole choice.
     */
    readonly keepMembers: (
      actor: Actor,
      kept: readonly string[]
    ) => Effect.Effect<
      MembersKept,
      DatabaseError | MissingPermission | ReductionRefused
    >;
  }
>()("peal-server/billing/application/WorkspaceHoldings") {}
