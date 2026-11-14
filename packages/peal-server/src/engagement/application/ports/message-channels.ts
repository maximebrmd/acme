import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";

/** A connected channel, with its platform. */
export interface ConnectedChannel {
  readonly channelId: ChannelId;
  readonly platform: Platform;
  readonly workspaceId: WorkspaceId;
}

/**
 * Every connected channel, from the channels context, in the order of
 * their ids, a page at a time: the collection keeps those whose messages
 * the server reads.
 */
export class MessageChannels extends Context.Service<
  MessageChannels,
  {
    /**
     * The channels among at most `limit` after `after`, or from the first,
     * and the last channel the page reached, to start the next from; none
     * once every channel was reached.
     */
    readonly after: (
      after: Option.Option<ChannelId>,
      limit: number
    ) => Effect.Effect<
      {
        readonly channels: readonly ConnectedChannel[];
        readonly reached: Option.Option<ChannelId>;
      },
      DatabaseError
    >;
  }
>()("peal-server/engagement/application/MessageChannels") {}
