import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { AllowanceReason } from "#shared/domain/allowance-reached.ts";
import type { Allowance } from "#shared/domain/allowance.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { Meter } from "#shared/domain/meter.ts";
import type { Platform } from "#shared/domain/platform.ts";

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
    /**
     * The same, for each of these workspaces at once, without holding
     * anything: for reports of how workspaces stand, never to count and
     * then add. One that shares its plan with none is left out.
     */
    /**
     * Tells billing a channel was just added: `pooled`, the accounts the
     * workspace's pool holds now, is read only where billing counts them
     * (a server that bills), inside the transaction that added it, under
     * the pool's hold.
     */
    readonly counted: (
      workspaceId: WorkspaceId,
      pooled: Effect.Effect<number, DatabaseError>
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Why the workspace's billing account cannot pay for a platform whose
     * calls are passed through at the platform's rates (X): the meter and
     * its refusal; none for any other platform, for an account that pays
     * per account, or on a server that does not bill. Connecting such an
     * account is refused.
     */
    readonly passedThrough: (
      workspaceId: WorkspaceId,
      platform: Platform
    ) => Effect.Effect<
      Option.Option<{
        readonly meter: Meter;
        readonly reason: AllowanceReason;
      }>,
      DatabaseError
    >;
    readonly sharingIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<
      ReadonlyMap<WorkspaceId, readonly WorkspaceId[]>,
      DatabaseError
    >;
  }
>()("peal-server/channels/application/ChannelAllowance") {}
