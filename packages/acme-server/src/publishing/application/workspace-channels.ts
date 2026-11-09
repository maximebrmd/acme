import { Context } from "effect";
import type { Effect } from "effect";

import type { ChannelOnPlatform } from "#publishing/domain/content-rules.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

/**
 * The channels a post may go to: those connected to the actor's workspace,
 * as the channels context lists them for the actor.
 */
export class WorkspaceChannels extends Context.Service<
  WorkspaceChannels,
  {
    /**
     * The channels of the actor's workspace among `channelIds`, with their
     * platforms. An id that names none of them is left out.
     */
    readonly lookUp: (
      actor: Actor,
      channelIds: readonly ChannelId[]
    ) => Effect.Effect<
      readonly ChannelOnPlatform[],
      DatabaseError | MissingPermission
    >;
  }
>()("acme-server/publishing/application/WorkspaceChannels") {}
