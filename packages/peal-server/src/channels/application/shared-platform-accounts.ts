import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { ChannelPlatform } from "#shared/domain/platform.ts";

/** A platform account, by its platform and its own id there. */
export interface PlatformAccountKey {
  readonly accountId: string;
  readonly platform: ChannelPlatform;
}

/** A platform account connected in several workspaces, and which. */
export interface SharedPlatformAccount extends PlatformAccountKey {
  readonly workspaceIds: readonly WorkspaceId[];
}

/**
 * The platform accounts connected in more than one workspace, as channels
 * keep them, for staff looking for free tiers multiplied: ids only, never a
 * token, a handle or a name. No permission check: the staff context
 * checked its own.
 */
export class SharedPlatformAccounts extends Context.Service<
  SharedPlatformAccounts,
  {
    /**
     * Those after `after`, by platform then account id, `limit` at most,
     * each with the workspaces that hold it.
     */
    readonly page: (
      after: Option.Option<PlatformAccountKey>,
      limit: number
    ) => Effect.Effect<readonly SharedPlatformAccount[], DatabaseError>;
  }
>()("peal-server/channels/application/SharedPlatformAccounts") {}
