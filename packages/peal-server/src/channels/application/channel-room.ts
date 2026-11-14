import { Effect, Option } from "effect";

import type { Channel } from "#channels/domain/channel.ts";
import { roomForOneMore } from "#shared/domain/allowance.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import type { ChannelAllowance } from "./channel-allowance.ts";
import type { ChannelCredentials } from "./channel-credentials.ts";
import type { ChannelRepository } from "./channel-repository.ts";

/**
 * How a channel is added to a workspace, whichever way it connects (a
 * platform's sign-in, a website's password): with room in its plan, and
 * counted for billing, in the workspace's additions' turn.
 */
export const channelRoomOf = (
  channels: ChannelRepository["Service"],
  allowance: ChannelAllowance["Service"]
) => {
  // The channels the workspaces sharing the workspace's plan hold, which
  // count against its allowance with its own: a partner's workspaces hold
  // theirs together. Read inside `addingTo`, the workspaces stay held
  // until the channel is added.
  const heldElsewhere = Effect.fn("ChannelRoom.heldElsewhere")(
    function* heldElsewhere(workspaceId: WorkspaceId) {
      const shared = yield* allowance.sharedWith(workspaceId);

      if (shared.length === 0) {
        return 0;
      }

      const held = yield* channels.countIn(shared);

      return [...held.values()].reduce((sum, count) => sum + count, 0);
    }
  );

  // The channels the workspace's pool holds: its own and those that count
  // with them.
  const pooledCount = Effect.fn("ChannelRoom.pooledCount")(
    function* pooledCount(workspaceId: WorkspaceId) {
      const own = yield* channels.countIn([workspaceId]);

      return (own.get(workspaceId) ?? 0) + (yield* heldElsewhere(workspaceId));
    }
  );

  // Room for one more channel in the workspace's plan.
  const roomForChannel = Effect.fn("ChannelRoom.roomForChannel")(
    function* roomForChannel(workspaceId: WorkspaceId) {
      const allowed = yield* allowance.channels(workspaceId);

      if (Option.isNone(allowed)) {
        return;
      }

      const connected = yield* channels.list(workspaceId);
      const elsewhere = yield* heldElsewhere(workspaceId);

      yield* Effect.fromResult(
        roomForOneMore("channels", allowed, connected.length + elsewhere)
      );
    }
  );

  /**
   * Adds the channel in turn with the workspace's other additions, so two
   * at once never pass the plan's limit together; then counts it for
   * billing, still under the pool's hold, and tells `told` in the same
   * transaction.
   */
  const insertCounted = <E>(
    channel: Channel,
    credentials: ChannelCredentials,
    told: Effect.Effect<void, E>
  ) =>
    channels.addingTo(
      channel.workspaceId,
      roomForChannel(channel.workspaceId).pipe(
        Effect.andThen(channels.insert(channel, credentials)),
        Effect.andThen(
          allowance.counted(
            channel.workspaceId,
            pooledCount(channel.workspaceId)
          )
        ),
        Effect.andThen(told)
      )
    );

  return { heldElsewhere, insertCounted, pooledCount, roomForChannel };
};
