import { Context, Effect, Layer } from "effect";

import type { Channel } from "#channels/domain/channel.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

/** What is told of a channel that is gone: enough to name it. */
export type DisconnectedChannel = Pick<
  Channel,
  "id" | "platform" | "workspaceId"
>;

/**
 * Hears that a workspace's channel was connected or disconnected, for
 * whoever follows the workspace from outside (its webhook endpoints). The
 * use cases call it in the transaction that saves or deletes the channel,
 * so what it records commits with the change or not at all. A channel that
 * needs reconnecting is told to ChannelNotices. A platform's data deletion
 * request (DataDeletions) disconnects channels too, and tells it the same
 * way.
 */
export class ChannelEvents extends Context.Service<
  ChannelEvents,
  {
    /**
     * An account was connected, or, `reconnected`, a channel the workspace
     * had was authorized again.
     */
    readonly connected: (
      channel: Channel,
      reconnected: boolean
    ) => Effect.Effect<void, DatabaseError>;
    readonly disconnected: (
      channel: DisconnectedChannel
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/channels/application/ChannelEvents") {
  /** Nobody follows: for tests that need none. */
  static readonly none = Layer.succeed(
    ChannelEvents,
    ChannelEvents.of({
      connected: () => Effect.void,
      disconnected: () => Effect.void,
    })
  );
}
