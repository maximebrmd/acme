import { Context, DateTime, Duration, Effect, Layer } from "effect";

import type { Channel } from "#channels/domain/channel.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { ChannelRepository } from "./channel-repository.ts";

/**
 * How long before a token that cannot be renewed runs out the staff
 * console lists its channel among those to reconnect.
 */
export const reconnectLookahead = Duration.days(7);

/**
 * The channels as the staff console reads them, without their tokens: a
 * workspace's, and those to reconnect across every workspace. It checks no
 * permission: only the staff context calls it, for staff.
 */
export class ChannelOversight extends Context.Service<
  ChannelOversight,
  {
    readonly ofWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly Channel[], DatabaseError>;
    /**
     * Channels marked to reconnect, then those whose token runs out within
     * `reconnectLookahead`, the first `limit`.
     */
    readonly failing: (
      limit: number
    ) => Effect.Effect<readonly Channel[], DatabaseError>;
  }
>()("acme-server/channels/application/ChannelOversight") {
  static readonly layer = Layer.effect(
    ChannelOversight,
    Effect.gen(function* ChannelOversightLive() {
      const channels = yield* ChannelRepository;

      const failing = Effect.fn("ChannelOversight.failing")(function* failing(
        limit: number
      ) {
        const now = yield* DateTime.now;

        const found = yield* channels.needingReconnect({
          leadTime: reconnectLookahead,
          limit,
          now,
        });

        // Marked ones first, as staff act on them before the others.
        return found.toSorted(
          (left, right) =>
            Number(right.status._tag === "refreshNeeded") -
            Number(left.status._tag === "refreshNeeded")
        );
      });

      return ChannelOversight.of({
        failing,
        ofWorkspace: (workspaceId) => channels.list(workspaceId),
      });
    })
  );
}
