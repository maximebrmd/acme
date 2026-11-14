import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { ChannelPlatform } from "#shared/domain/platform.ts";

/** A platform account, by its platform and its own id there. */
export interface PlatformAccount {
  readonly accountId: string;
  readonly platform: ChannelPlatform;
}

/** A platform account connected in several workspaces, and which. */
export interface PlatformAccountHeld extends PlatformAccount {
  readonly workspaceIds: readonly WorkspaceId[];
}

/**
 * What billing reads of the channels that billing accounts hold, from
 * the channels context: counts and ids only.
 */
export class AccountChannels extends Context.Service<
  AccountChannels,
  {
    /** The channels each of these workspaces connected itself. */
    readonly ownIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, number>, DatabaseError>;
    /**
     * The platform accounts connected in several workspaces, after
     * `after` by platform then id, `limit` at most.
     */
    readonly sharedPage: (
      after: Option.Option<PlatformAccount>,
      limit: number
    ) => Effect.Effect<readonly PlatformAccountHeld[], DatabaseError>;
  }
>()("peal-server/billing/application/AccountChannels") {}
