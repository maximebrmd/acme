import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { Platform } from "#channels/domain/platform.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";

/** A connected channel, by what places it: ids and its platform. */
export interface ListedChannel {
  readonly channelId: ChannelId;
  readonly platform: Platform;
  readonly workspaceId: WorkspaceId;
}

/**
 * Every connected channel of every workspace, in the order of their ids, a
 * page at a time, for the contexts that follow channels as a whole, such
 * as analytics: ids and platforms, never a token, a handle or a name. It
 * checks no permission: jobs call it, never a request.
 */
export class ChannelDirectory extends Context.Service<
  ChannelDirectory,
  {
    /** At most `limit` channels after `after`, or from the first. */
    readonly after: (
      after: Option.Option<ChannelId>,
      limit: number
    ) => Effect.Effect<readonly ListedChannel[], DatabaseError>;
  }
>()("peal-server/channels/application/ChannelDirectory") {}
