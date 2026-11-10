import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Allowance } from "#shared/domain/allowance.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * How many channels a workspace may connect: its plan's allowance, from the
 * billing context, or no limit on a server that does not bill; and the
 * workspaces whose channels count against that allowance with its own.
 */
export class ChannelAllowance extends Context.Service<
  ChannelAllowance,
  {
    readonly channels: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Allowance, DatabaseError>;
    /**
     * The other workspaces that share the workspace's plan, whose channels
     * count with its own: a partner's home workspace and the workspaces
     * the partner owns hold their channels against one allowance. None for
     * any other workspace. In a transaction, the workspaces that share a
     * plan stay held until it ends, so two of them adding a channel at
     * once never pass the limit together.
     */
    readonly sharedWith: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly WorkspaceId[], DatabaseError>;
  }
>()("peal-server/channels/application/ChannelAllowance") {}
